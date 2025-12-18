import logger from '../../config/logger.js';
import shopeeService from '../shopee/shopeeService.js';
import Coupon from '../../models/Coupon.js';
import categoryDetector from '../categoryDetector.js';
import AppSettings from '../../models/AppSettings.js';

class ShopeeSync {
  /**
   * Buscar produtos da Shopee usando API GraphQL de Afiliados
   * Retorna ofertas com links de afiliado já gerados
   */
  async fetchShopeeProducts(keywords, limit = 50) {
    try {
      // Garantir que keywords seja um array
      let keywordsArray = [];
      if (Array.isArray(keywords)) {
        keywordsArray = keywords;
      } else if (typeof keywords === 'string') {
        keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      } else if (keywords) {
        keywordsArray = [String(keywords)];
      }

      // Verificar se Shopee está configurado
      const config = await AppSettings.getShopeeConfig();
      if (!config.partnerId || !config.partnerKey) {
        logger.warn('⚠️ Shopee não configurado - AppID e Secret necessários');
        return [];
      }

      logger.info(`🔍 Buscando ofertas Shopee para: ${keywordsArray.length > 0 ? keywordsArray.join(', ') : 'todas as ofertas'}`);

      const allProducts = [];
      const processedOfferIds = new Set(); // Para evitar duplicatas

      // 1. Buscar ofertas gerais da Shopee (shopeeOfferV2)
      // Sem keyword para pegar todas as ofertas disponíveis
      try {
        logger.info(`📦 Buscando ofertas gerais da Shopee...`);
        const offers = await shopeeService.getShopeeOffers({
          keyword: null, // Sem keyword para pegar todas as ofertas
          sortType: 2, // Maior comissão (melhores ofertas)
          page: 1,
          limit: limit
        });

        if (offers.nodes && offers.nodes.length > 0) {
          logger.info(`   ✅ ${offers.nodes.length} ofertas encontradas na Shopee`);

          for (const offer of offers.nodes) {
            try {
              // Criar ID único para evitar duplicatas
              const offerId = `${offer.offerType}-${offer.collectionId || offer.categoryId || 'unknown'}`;
              
              if (processedOfferIds.has(offerId)) {
                continue; // Já processado
              }
              processedOfferIds.add(offerId);

              // Converter oferta em formato de produto
              // A API retorna offerLink que já é um link de afiliado com tracking
              const affiliateLink = offer.offerLink || offer.originalLink;
              
              logger.debug(`   📦 Oferta: ${offer.offerName}`);
              logger.debug(`   🔗 Link de afiliado: ${affiliateLink?.substring(0, 60)}...`);
              logger.debug(`   💰 Comissão: ${(parseFloat(offer.commissionRate || 0) * 100).toFixed(2)}%`);

              const product = {
                id: offerId,
                title: offer.offerName,
                permalink: offer.originalLink || affiliateLink, // Link original sem tracking
                thumbnail: offer.imageUrl || '',
                price: 0, // API de afiliados não retorna preço diretamente
                original_price: null,
                available_quantity: 0,
                shop_id: null,
                category_id: null, // Será detectado automaticamente pelo categoryDetector
                shopee_category_id: offer.categoryId || null, // ID numérico da Shopee (para referência)
                collection_id: offer.collectionId || null,
                offer_type: offer.offerType, // 1: Collection, 2: Category
                commission_rate: parseFloat(offer.commissionRate || 0),
                period_start: offer.periodStartTime ? new Date(offer.periodStartTime * 1000) : null,
                period_end: offer.periodEndTime ? new Date(offer.periodEndTime * 1000) : null,
                affiliate_link: affiliateLink // Link de afiliado com tracking
              };

              allProducts.push(product);
            } catch (error) {
              logger.warn(`   ⚠️ Erro ao processar oferta ${offer.offerName}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Erro ao buscar ofertas Shopee: ${error.message}`);
      }

      // 2. Se houver keywords, buscar ofertas específicas por palavra-chave
      if (keywordsArray.length > 0) {
        for (const keyword of keywordsArray.slice(0, 3)) { // Limitar a 3 keywords para não exceder limite
          try {
            logger.info(`   🔍 Buscando ofertas para: ${keyword}`);
            const keywordOffers = await shopeeService.getShopeeOffers({
              keyword: keyword,
              sortType: 2, // Maior comissão
              page: 1,
              limit: Math.floor(limit / keywordsArray.length) // Dividir limite entre keywords
            });

            if (keywordOffers.nodes && keywordOffers.nodes.length > 0) {
              for (const offer of keywordOffers.nodes) {
                const offerId = `${offer.offerType}-${offer.collectionId || offer.categoryId || 'unknown'}`;
                
                if (!processedOfferIds.has(offerId)) {
                  processedOfferIds.add(offerId);

                  const affiliateLink = offer.offerLink || offer.originalLink;
                  
                  const product = {
                    id: offerId,
                    title: offer.offerName,
                    permalink: offer.originalLink || affiliateLink,
                    thumbnail: offer.imageUrl || '',
                    price: 0,
                    original_price: null,
                    available_quantity: 0,
                    shop_id: null,
                    category_id: null, // Será detectado automaticamente pelo categoryDetector
                    shopee_category_id: offer.categoryId || null, // ID numérico da Shopee (para referência)
                    collection_id: offer.collectionId || null,
                    offer_type: offer.offerType,
                    commission_rate: parseFloat(offer.commissionRate || 0),
                    period_start: offer.periodStartTime ? new Date(offer.periodStartTime * 1000) : null,
                    period_end: offer.periodEndTime ? new Date(offer.periodEndTime * 1000) : null,
                    affiliate_link: affiliateLink // Link de afiliado com tracking
                  };

                  allProducts.push(product);
                }
              }
            }

            // Aguardar entre requisições para não exceder rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            logger.warn(`   ⚠️ Erro ao buscar ofertas para "${keyword}": ${error.message}`);
          }
        }
      }

      logger.info(`✅ Total de ${allProducts.length} ofertas Shopee processadas`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro ao buscar produtos na Shopee: ${error.message}`);
      return [];
    }
  }

  /**
   * Filtrar ofertas que são válidas para promoções
   * Nota: A API de afiliados não retorna preços, então filtramos por comissão e validade
   */
  filterShopeePromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      // Verificar se a oferta ainda está válida
      const now = new Date();
      const isExpired = product.period_end && new Date(product.period_end) < now;
      const isNotStarted = product.period_start && new Date(product.period_start) > now;

      if (isExpired || isNotStarted) {
        continue; // Oferta não está ativa
      }

      // Verificar se tem comissão mínima (indica oferta interessante)
      const commissionRate = product.commission_rate || 0;
      if (commissionRate < 0.01) { // Menos de 1% de comissão
        continue; // Comissão muito baixa
      }

      // Melhorar URL da imagem
      let imageUrl = product.thumbnail;
      if (imageUrl && imageUrl.includes('-tn.')) {
        // Converter thumbnail pequeno para tamanho maior
        imageUrl = imageUrl.replace('-tn.', '-o.');
      }

      // Como não temos preço, vamos usar a comissão como indicador de qualidade
      // Ofertas com maior comissão geralmente são melhores
      const qualityScore = commissionRate * 100; // Converter para percentual

      promotions.push({
        external_id: `shopee-${product.id}`,
        name: product.title,
        image_url: imageUrl || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
        platform: 'shopee',
        current_price: product.price || 0,
        old_price: product.original_price || null,
        discount_percentage: minDiscountPercentage, // Usar mínimo configurado já que não temos preço real
        affiliate_link: product.affiliate_link, // Link já é de afiliado
        stock_available: true, // Assumir disponível
        category_id: null, // Será detectado automaticamente em saveShopeeToDatabase
        // Campos extras para referência (não salvos no banco)
        commission_rate: commissionRate,
        offer_type: product.offer_type,
        collection_id: product.collection_id,
        period_start: product.period_start,
        period_end: product.period_end,
        quality_score: qualityScore, // Score baseado em comissão
        raw_data: product
      });
    }

    logger.info(`🎯 ${promotions.length} ofertas válidas encontradas na Shopee (comissão ≥ 1%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado da Shopee usando API GraphQL
   */
  async generateShopeeAffiliateLink(productUrl) {
    try {
      // Verificar se Shopee está configurado
      const config = await AppSettings.getShopeeConfig();
      if (!config.partnerId || !config.partnerKey) {
        logger.warn('⚠️ Shopee não configurado - retornando link original');
        return productUrl;
      }

      // Se a URL já é um link curto da Shopee (s.shopee.com.br), retornar como está
      if (productUrl && productUrl.includes('s.shopee.com.br')) {
        logger.debug(`✅ Link já é de afiliado (curto): ${productUrl.substring(0, 50)}...`);
        return productUrl;
      }

      // Se a URL já tem tracking (offerLink), retornar como está
      if (productUrl && (productUrl.includes('affiliate_id') || productUrl.includes('utm_source'))) {
        logger.debug(`✅ Link já tem tracking: ${productUrl.substring(0, 50)}...`);
        return productUrl;
      }

      // Gerar link curto com rastreamento usando API GraphQL
      try {
        // Não passar subIds para evitar erro "invalid sub id"
        const shortLink = await shopeeService.generateShortLink(productUrl, []);
        
        if (shortLink && shortLink !== productUrl) {
          logger.info(`✅ Link de afiliado Shopee gerado via API: ${shortLink.substring(0, 50)}...`);
          return shortLink;
        }
      } catch (apiError) {
        logger.warn(`⚠️ Erro ao gerar link via API, tentando método alternativo: ${apiError.message}`);
      }

      // Fallback: Adicionar affiliate_id manualmente se for URL da Shopee
      try {
        if (productUrl && productUrl.includes('shopee.com.br')) {
          const url = new URL(productUrl);
          url.searchParams.set('affiliate_id', config.partnerId);
          const affiliateUrl = url.toString();
          logger.info(`✅ Link de afiliado gerado (método alternativo): ${affiliateUrl.substring(0, 50)}...`);
          return affiliateUrl;
        }
      } catch (e) {
        logger.warn(`⚠️ Erro ao adicionar affiliate_id: ${e.message}`);
      }

      // Se tudo falhar, retornar URL original
      return productUrl;
    } catch (error) {
      logger.warn(`⚠️ Erro ao gerar link de afiliado Shopee: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Salvar produto no banco de dados com link de afiliado
   */
  async saveShopeeToDatabase(product, Product) {
    try {
      // Verificar se já existe pelo external_id
      const existing = await Product.findByExternalId(product.external_id);

      if (existing) {
        // Se o preço mudou, atualizar
        if (existing.current_price !== product.current_price) {
          await Product.updatePrice(existing.id, product.current_price);
          logger.info(`🔄 Produto atualizado (Preço): ${product.name}`);
          return { product: existing, isNew: true };
        }

        // Atualizar link de afiliado se mudou
        if (product.affiliate_link && existing.affiliate_link !== product.affiliate_link) {
          await Product.update(existing.id, { affiliate_link: product.affiliate_link });
          logger.info(`🔄 Link de afiliado atualizado: ${product.name}`);
        }

        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Verificar se a imagem é válida
      if (!product.image_url || 
          product.image_url.includes('data:image') || 
          product.image_url.includes('placeholder') ||
          !product.image_url.startsWith('http')) {
        logger.warn(`⚠️ Produto ${product.name} sem imagem válida`);
        product.image_url = product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem';
      }

      // Detectar categoria automaticamente se não tiver
      if (!product.category_id) {
        try {
          const detectedCategory = await categoryDetector.detectCategory(product.name);
          if (detectedCategory) {
            product.category_id = detectedCategory.id;
            logger.info(`📂 Categoria detectada: ${detectedCategory.name} para ${product.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao detectar categoria: ${error.message}`);
        }
      }

      // Garantir que o link de afiliado está gerado
      // Se não tiver, gerar agora
      if (!product.affiliate_link || product.affiliate_link === product.permalink) {
        logger.info(`🔗 Gerando link de afiliado para: ${product.name}`);
        const originalLink = product.affiliate_link || product.permalink || '';
        product.affiliate_link = await this.generateShopeeAffiliateLink(originalLink);
        
        if (product.affiliate_link && product.affiliate_link !== originalLink) {
          logger.info(`   ✅ Link de afiliado gerado: ${product.affiliate_link.substring(0, 60)}...`);
        } else {
          logger.warn(`   ⚠️ Link de afiliado não foi gerado, usando link original`);
        }
      } else {
        logger.info(`   ✅ Link de afiliado já existe: ${product.affiliate_link.substring(0, 60)}...`);
      }

      // Preparar dados para salvar no banco
      // Apenas campos que existem na tabela products
      const productData = {
        name: product.name,
        image_url: product.image_url,
        platform: product.platform || 'shopee',
        current_price: product.current_price || 0,
        old_price: product.old_price || null,
        discount_percentage: product.discount_percentage || 0,
        category_id: product.category_id || null, // UUID ou null (já detectado)
        coupon_id: product.coupon_id || null,
        affiliate_link: product.affiliate_link,
        external_id: product.external_id,
        stock_available: product.stock_available !== undefined ? product.stock_available : true
      };
      
      // Remover campos null que não devem ser salvos
      if (!productData.category_id) delete productData.category_id;
      if (!productData.coupon_id) delete productData.coupon_id;
      if (!productData.old_price) delete productData.old_price;

      // Criar novo produto
      const newProduct = await Product.create(productData);
      
      // Adicionar dados extras da Shopee ao objeto retornado (não salvos no banco)
      // Esses dados serão usados no template
      if (product.platform === 'shopee') {
        newProduct.commission_rate = product.commission_rate || null;
        newProduct.offer_type = product.offer_type || null;
        newProduct.period_end = product.period_end || null;
        newProduct.period_start = product.period_start || null;
        newProduct.collection_id = product.collection_id || null;
      }
      
      logger.info(`✅ Novo produto salvo com link de afiliado: ${product.name}`);
      logger.info(`   Link: ${newProduct.affiliate_link?.substring(0, 60)}...`);

      return { product: newProduct, isNew: true };
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      throw error;
    }
  }
}

export default new ShopeeSync();

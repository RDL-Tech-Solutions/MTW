import logger from '../../config/logger.js';
import shopeeService from '../shopee/shopeeService.js';
import Coupon from '../../models/Coupon.js';
import Product from '../../models/Product.js';
import categoryDetector from '../categoryDetector.js';
import AppSettings from '../../models/AppSettings.js';
import SyncConfig from '../../models/SyncConfig.js';

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

      logger.info(`🔍 Buscando produtos Shopee usando productOfferV2: ${keywordsArray.length > 0 ? keywordsArray.join(', ') : 'produtos top performing'}`);

      const allProducts = [];
      const processedOfferIds = new Set(); // Para evitar duplicatas

      // 1. Buscar produtos usando productOfferV2 (TOP_PERFORMING)
      // Esta query retorna produtos individuais com preços, avaliações, vendas, etc.
      try {
        logger.info(`📦 Buscando produtos da Shopee (productOfferV2 - TOP_PERFORMING)...`);
        const productOffers = await shopeeService.getProductOffers({
          listType: 2, // TOP_PERFORMING = 2
          sortType: 2, // ITEM_SOLD_DESC = 2 (mais vendidos)
          page: 1,
          limit: limit
        });

        if (productOffers.nodes && productOffers.nodes.length > 0) {
          logger.info(`   ✅ ${productOffers.nodes.length} produtos encontrados na Shopee`);

          for (const productOffer of productOffers.nodes) {
            try {
              // Usar itemId como identificador único
              const offerId = `product-${productOffer.itemId}`;

              if (processedOfferIds.has(offerId)) {
                continue; // Já processado
              }
              processedOfferIds.add(offerId);

              // Usar offerLink (link de afiliado) ou productLink (link original)
              const affiliateLink = productOffer.offerLink || productOffer.productLink;
              const originalLink = productOffer.productLink || productOffer.offerLink;

              // Calcular preço médio se tiver priceMax e priceMin
              let price = 0;
              if (productOffer.priceMin && productOffer.priceMax) {
                price = (parseFloat(productOffer.priceMin) + parseFloat(productOffer.priceMax)) / 2;
              } else if (productOffer.priceMin) {
                price = parseFloat(productOffer.priceMin);
              } else if (productOffer.priceMax) {
                price = parseFloat(productOffer.priceMax);
              }

              logger.debug(`   📦 Produto: ${productOffer.productName}`);
              logger.debug(`   🔗 Link de afiliado: ${affiliateLink?.substring(0, 60)}...`);
              logger.debug(`   💰 Preço: R$ ${price.toFixed(2)}`);
              logger.debug(`   ⭐ Avaliação: ${productOffer.ratingStar || 'N/A'}`);
              logger.debug(`   💵 Comissão: ${(parseFloat(productOffer.commissionRate || 0) * 100).toFixed(2)}%`);

              const product = {
                id: offerId,
                title: productOffer.productName,
                permalink: originalLink,
                thumbnail: productOffer.imageUrl || '',
                price: price,
                original_price: productOffer.priceMax ? parseFloat(productOffer.priceMax) : null,
                available_quantity: 0,
                shop_id: productOffer.shopId ? String(productOffer.shopId) : null,
                category_id: null, // Será detectado automaticamente pelo categoryDetector
                shopee_category_id: productOffer.productCatIds && productOffer.productCatIds.length > 0
                  ? productOffer.productCatIds[0]
                  : null, // ID da categoria nível 1
                shopee_category_ids: productOffer.productCatIds || [], // Todos os níveis de categoria
                shop_name: productOffer.shopName || null,
                shop_type: productOffer.shopType || null,
                item_id: productOffer.itemId ? String(productOffer.itemId) : null,
                commission_rate: parseFloat(productOffer.commissionRate || 0),
                seller_commission_rate: productOffer.sellerCommissionRate ? parseFloat(productOffer.sellerCommissionRate) : null,
                shopee_commission_rate: productOffer.shopeeCommissionRate ? parseFloat(productOffer.shopeeCommissionRate) : null,
                commission_amount: productOffer.commission ? parseFloat(productOffer.commission) : null,
                sales_count: productOffer.sales || 0,
                rating_star: productOffer.ratingStar ? parseFloat(productOffer.ratingStar) : null,
                discount_percentage: productOffer.priceDiscountRate || 0,
                period_start: productOffer.periodStartTime ? new Date(productOffer.periodStartTime * 1000) : null,
                period_end: productOffer.periodEndTime ? new Date(productOffer.periodEndTime * 1000) : null,
                affiliate_link: affiliateLink // Link de afiliado com tracking
              };

              allProducts.push(product);
            } catch (error) {
              logger.warn(`   ⚠️ Erro ao processar produto ${productOffer.productName}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Erro ao buscar produtos Shopee: ${error.message}`);
      }

      // 2. Se houver keywords, buscar mais produtos usando productOfferV2
      // Nota: productOfferV2 não suporta keyword diretamente, mas podemos buscar mais páginas
      // ou usar diferentes listTypes para obter mais variedade
      if (keywordsArray.length > 0) {
        try {
          logger.info(`   🔍 Buscando mais produtos da Shopee (productOfferV2 - página 2)...`);
          const additionalProducts = await shopeeService.getProductOffers({
            listType: 2, // TOP_PERFORMING = 2
            sortType: 2, // ITEM_SOLD_DESC = 2
            page: 2, // Segunda página para mais produtos
            limit: Math.floor(limit / 2)
          });

          if (additionalProducts.nodes && additionalProducts.nodes.length > 0) {
            logger.info(`   ✅ ${additionalProducts.nodes.length} produtos adicionais encontrados`);

            for (const productOffer of additionalProducts.nodes) {
              try {
                const offerId = `product-${productOffer.itemId}`;

                if (!processedOfferIds.has(offerId)) {
                  processedOfferIds.add(offerId);

                  const affiliateLink = productOffer.offerLink || productOffer.productLink;
                  const originalLink = productOffer.productLink || productOffer.offerLink;

                  let price = 0;
                  if (productOffer.priceMin && productOffer.priceMax) {
                    price = (parseFloat(productOffer.priceMin) + parseFloat(productOffer.priceMax)) / 2;
                  } else if (productOffer.priceMin) {
                    price = parseFloat(productOffer.priceMin);
                  } else if (productOffer.priceMax) {
                    price = parseFloat(productOffer.priceMax);
                  }

                  const product = {
                    id: offerId,
                    title: productOffer.productName,
                    permalink: originalLink,
                    thumbnail: productOffer.imageUrl || '',
                    price: price,
                    original_price: productOffer.priceMax ? parseFloat(productOffer.priceMax) : null,
                    available_quantity: 0,
                    shop_id: productOffer.shopId ? String(productOffer.shopId) : null,
                    category_id: null,
                    shopee_category_id: productOffer.productCatIds && productOffer.productCatIds.length > 0
                      ? productOffer.productCatIds[0]
                      : null,
                    shopee_category_ids: productOffer.productCatIds || [],
                    shop_name: productOffer.shopName || null,
                    shop_type: productOffer.shopType || null,
                    item_id: productOffer.itemId ? String(productOffer.itemId) : null,
                    commission_rate: parseFloat(productOffer.commissionRate || 0),
                    seller_commission_rate: productOffer.sellerCommissionRate ? parseFloat(productOffer.sellerCommissionRate) : null,
                    shopee_commission_rate: productOffer.shopeeCommissionRate ? parseFloat(productOffer.shopeeCommissionRate) : null,
                    commission_amount: productOffer.commission ? parseFloat(productOffer.commission) : null,
                    sales_count: productOffer.sales || 0,
                    rating_star: productOffer.ratingStar ? parseFloat(productOffer.ratingStar) : null,
                    discount_percentage: productOffer.priceDiscountRate || 0,
                    period_start: productOffer.periodStartTime ? new Date(productOffer.periodStartTime * 1000) : null,
                    period_end: productOffer.periodEndTime ? new Date(productOffer.periodEndTime * 1000) : null,
                    affiliate_link: affiliateLink
                  };

                  allProducts.push(product);
                }
              } catch (error) {
                logger.warn(`   ⚠️ Erro ao processar produto: ${error.message}`);
              }
            }
          }

          // Aguardar entre requisições para não exceder rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao buscar produtos adicionais: ${error.message}`);
        }
      }

      logger.info(`✅ Total de ${allProducts.length} produtos Shopee processados`);
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
          const detectedCategory = await categoryDetector.detectWithAI(product.name);
          if (detectedCategory) {
            product.category_id = detectedCategory.id;
            logger.info(`📂 Categoria detectada: ${detectedCategory.name} para ${product.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao detectar categoria: ${error.message}`);
        }
      }

      // Preservar link original antes de gerar link de afiliado
      const originalLink = product.permalink || product.link || product.affiliate_link || '';

      // Garantir que o link de afiliado está gerado
      // Se não tiver, gerar agora
      if (!product.affiliate_link || product.affiliate_link === product.permalink) {
        logger.info(`🔗 Gerando link de afiliado para: ${product.name}`);
        product.affiliate_link = await this.generateShopeeAffiliateLink(originalLink);

        if (product.affiliate_link && product.affiliate_link !== originalLink) {
          logger.info(`   ✅ Link de afiliado gerado: ${product.affiliate_link.substring(0, 60)}...`);
        } else {
          logger.warn(`   ⚠️ Link de afiliado não foi gerado, usando link original`);
          product.affiliate_link = originalLink;
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
        stock_available: product.stock_available !== undefined ? product.stock_available : true,
        status: 'pending',
        original_link: originalLink
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

  /**
   * Executar ciclo completo de sincronização (Sync Interface)
   */
  async sync() {
    try {
      logger.info('🔄 Iniciando Sync Automático: Shopee');
      const config = await SyncConfig.get();

      let keywords = [];
      if (config.keywords) {
        keywords = config.keywords.split(',').map(k => k.trim()).filter(k => k);
      }

      if (keywords.length === 0) keywords = ['garrafa termica', 'fone bluetooth', 'relogio inteligente', 'acessorios celular'];

      // Buscar
      const allProducts = await this.fetchShopeeProducts(keywords, 50);

      // Filtrar
      const promotions = await this.filterShopeePromotions(allProducts, config.min_discount_percentage);

      let newCount = 0;
      const SchedulerService = (await import('./schedulerService.js')).default;

      for (const promo of promotions) {
        try {
          // Salvar (passando Model Product conforme assinatura)
          const { product, isNew } = await this.saveShopeeToDatabase(promo, Product);

          if (isNew) {
            newCount++;
            if (config.shopee_auto_publish) {
              await SchedulerService.scheduleProduct(product);
              // Marcar como 'approved' para aparecer no app
              try { await Product.update(product.id, { status: 'approved' }); } catch (e) { }
            }
          }
        } catch (err) { }
      }

      logger.info(`✅ Sync Shopee Finalizado: ${newCount} novos.`);
      return { success: true, newProducts: newCount };
    } catch (error) {
      logger.error(`❌ Erro Sync Shopee: ${error.message}`);
      throw error;
    }
  }
}

export default new ShopeeSync();

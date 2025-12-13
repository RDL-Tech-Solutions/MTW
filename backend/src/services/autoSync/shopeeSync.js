import axios from 'axios';
import logger from '../../config/logger.js';
import shopeeService from '../shopee/shopeeService.js';
import Coupon from '../../models/Coupon.js';

class ShopeeSync {
  /**
   * Buscar produtos da Shopee baseado em palavras-chave
   * Usa a API oficial da Shopee Affiliate
   */
  async fetchShopeeProducts(keywords, limit = 50) {
    try {
      // Verificar se Shopee está configurado
      if (!process.env.SHOPEE_PARTNER_ID || !process.env.SHOPEE_PARTNER_KEY) {
        logger.warn('⚠️ Shopee não configurado - SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY necessários');
        return [];
      }

      logger.info(`🔍 Buscando produtos Shopee para: ${keywords.join(', ')}`);

      const allProducts = [];

      // Buscar produtos por categoria ou ofertas gerais
      // Nota: A API Shopee pode ter limitações de busca por palavra-chave
      // Vamos buscar ofertas em destaque e filtrar depois
      try {
        const offers = await shopeeService.getOffers(null, limit);
        
        if (offers && offers.item_list && offers.item_list.length > 0) {
          logger.info(`   ✅ ${offers.item_list.length} produtos encontrados na Shopee`);
          
          // Buscar detalhes de cada produto
          for (const item of offers.item_list.slice(0, limit)) {
            try {
              const details = await shopeeService.getProductDetails(item.item_id);
              
              if (details && details.item) {
                const product = {
                  id: details.item.item_id?.toString(),
                  title: details.item.name,
                  permalink: details.item.url || `https://shopee.com.br/-i.${details.item.shop_id}.${details.item.item_id}`,
                  thumbnail: details.item.images?.[0] || details.item.image || '',
                  price: details.item.price / 100000, // Shopee usa preços multiplicados por 100000
                  original_price: details.item.price_before_discount ? details.item.price_before_discount / 100000 : null,
                  available_quantity: details.item.stock || 0,
                  shop_id: details.item.shop_id,
                  category_id: details.item.category_id
                };
                
                allProducts.push(product);
              }
            } catch (error) {
              logger.warn(`   ⚠️ Erro ao buscar detalhes do produto ${item.item_id}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Erro ao buscar ofertas Shopee: ${error.message}`);
        // Não lançar erro, apenas retornar array vazio para não quebrar o fluxo
      }

      logger.info(`✅ Total de ${allProducts.length} produtos Shopee processados`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro ao buscar produtos na Shopee: ${error.message}`);
      return [];
    }
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  filterShopeePromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      // Verificar se tem preço original e desconto
      const currentPrice = product.price;
      const originalPrice = product.original_price;

      // Se não tiver preço original, não é promoção
      if (!originalPrice || originalPrice <= currentPrice) {
        continue; // Não é uma promoção real
      }

      // Calcular desconto
      const discount = ((originalPrice - currentPrice) / originalPrice) * 100;

      if (discount >= minDiscountPercentage) {
        // Melhorar URL da imagem
        let imageUrl = product.thumbnail;
        if (imageUrl && imageUrl.includes('-tn.')) {
          // Converter thumbnail pequeno para tamanho maior
          imageUrl = imageUrl.replace('-tn.', '-o.');
        }

        promotions.push({
          external_id: `shopee-${product.id}`,
          name: product.title,
          image_url: imageUrl || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
          platform: 'shopee',
          current_price: currentPrice,
          old_price: originalPrice,
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink,
          stock_available: (product.available_quantity || 0) > 0,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas na Shopee (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado da Shopee
   */
  async generateShopeeAffiliateLink(productUrl) {
    try {
      // Verificar se Shopee está configurado
      if (!process.env.SHOPEE_PARTNER_ID || !process.env.SHOPEE_PARTNER_KEY) {
        logger.warn('⚠️ Shopee não configurado - retornando link original');
        return productUrl;
      }

      // Usar o shopeeService para gerar link de afiliado
      const affiliateLink = await shopeeService.createAffiliateLink(productUrl);
      
      if (affiliateLink && affiliateLink !== productUrl) {
        logger.info(`✅ Link de afiliado Shopee gerado`);
        return affiliateLink;
      }

      // Se não conseguir gerar via API, adicionar partner_id manualmente
      const partnerId = process.env.SHOPEE_PARTNER_ID;
      try {
        const url = new URL(productUrl);
        url.searchParams.set('affiliate_id', partnerId);
        return url.toString();
      } catch (e) {
        // Se não for URL válida, retornar original
        return productUrl;
      }
    } catch (error) {
      logger.warn(`⚠️ Erro ao gerar link de afiliado Shopee: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Salvar produto no banco de dados
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
          return { product: existing, isNew: true }; // Considerar como "novo" evento para logs
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
        // Usar placeholder se não tiver imagem
        product.image_url = product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem';
      }

      // Gerar link de afiliado (async)
      product.affiliate_link = await this.generateShopeeAffiliateLink(product.affiliate_link);

      // Criar novo produto
      const newProduct = await Product.create(product);
      logger.info(`✅ Novo produto salvo: ${product.name}`);

      return { product: newProduct, isNew: true };
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      throw error;
    }
  }
}

export default new ShopeeSync();

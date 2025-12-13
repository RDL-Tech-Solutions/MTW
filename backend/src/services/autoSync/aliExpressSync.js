import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';
import Coupon from '../../models/Coupon.js';

class AliExpressSync {
  constructor() {
    this.baseUrl = 'https://api-sg.aliexpress.com/rest';
  }

  /**
   * Verificar se AliExpress está configurado
   */
  async isConfigured() {
    const settings = await CouponSettings.get();
    return !!(settings.aliexpress_app_key && settings.aliexpress_app_secret);
  }

  /**
   * Gerar assinatura para API AliExpress
   */
  generateSignature(params, appSecret) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');

    return crypto
      .createHmac('sha256', appSecret)
      .update(sortedParams)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Fazer requisição para API AliExpress
   */
  async makeRequest(method, params = {}) {
    try {
      const settings = await CouponSettings.get();

      if (!settings.aliexpress_app_key || !settings.aliexpress_app_secret) {
        throw new Error('AliExpress não configurado');
      }

      const timestamp = Date.now();
      const requestParams = {
        app_key: settings.aliexpress_app_key,
        method,
        timestamp,
        sign_method: 'sha256',
        format: 'json',
        v: '2.0',
        ...params
      };

      // Gerar assinatura
      const sign = this.generateSignature(requestParams, settings.aliexpress_app_secret);
      requestParams.sign = sign;

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 30000
      });

      if (response.data.error_response) {
        throw new Error(response.data.error_response.msg || 'Erro na API AliExpress');
      }

      return response.data;
    } catch (error) {
      logger.error(`Erro na requisição AliExpress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar produtos do AliExpress baseado em palavras-chave
   */
  async fetchAliExpressProducts(keywords, limit = 50) {
    try {
      if (!(await this.isConfigured())) {
        logger.warn('⚠️ AliExpress não configurado - ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET necessários');
        return [];
      }

      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      for (const term of searchTerms) {
        logger.info(`🔍 Buscando no AliExpress: "${term}"`);

        try {
          // Buscar produtos com desconto
          const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', {
            keywords: term,
            page_size: Math.min(limit, 50),
            page_no: 1,
            sort: 'SALE_PRICE_ASC',
            ship_to_country: 'BR',
            target_currency: 'BRL',
            target_language: 'PT'
          });

          if (response && response.aliexpress_affiliate_hotproduct_query_response && 
              response.aliexpress_affiliate_hotproduct_query_response.resp_result &&
              response.aliexpress_affiliate_hotproduct_query_response.resp_result.result &&
              response.aliexpress_affiliate_hotproduct_query_response.resp_result.result.products) {
            
            const products = response.aliexpress_affiliate_hotproduct_query_response.resp_result.result.products;
            logger.info(`   ✅ ${products.length} produtos encontrados no AliExpress`);

            for (const item of products) {
              try {
                const product = this.parseAliExpressItem(item);
                if (product) {
                  allProducts.push(product);
                }
              } catch (error) {
                logger.warn(`   ⚠️ Erro ao processar item: ${error.message}`);
              }
            }
          }
        } catch (error) {
          logger.error(`   ❌ Erro ao buscar "${term}": ${error.message}`);
        }
      }

      logger.info(`✅ Total de ${allProducts.length} produtos AliExpress processados`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro ao buscar produtos no AliExpress: ${error.message}`);
      return [];
    }
  }

  /**
   * Parsear item do AliExpress para formato padrão
   */
  parseAliExpressItem(item) {
    try {
      const productId = item.product_id?.toString();
      const title = item.product_title || 'Produto AliExpress';
      
      // Preços - AliExpress retorna em centavos
      const salePrice = parseFloat(item.sale_price || item.app_sale_price || 0) / 100;
      const originalPrice = parseFloat(item.original_price || item.app_original_price || 0) / 100;
      
      // Imagem
      const imageUrl = item.product_main_image_url || item.product_small_image_url || '';

      // Link
      const productUrl = item.product_detail_url || `https://pt.aliexpress.com/item/${productId}.html`;

      // Verificar se tem desconto
      const hasDiscount = originalPrice > salePrice && originalPrice > 0;

      return {
        id: productId,
        title,
        permalink: productUrl,
        thumbnail: imageUrl,
        price: salePrice,
        original_price: hasDiscount ? originalPrice : null,
        currency: 'BRL',
        available_quantity: item.stock ? 1 : 0,
        product_id: productId,
        raw_data: item
      };
    } catch (error) {
      logger.error(`Erro ao parsear item AliExpress: ${error.message}`);
      return null;
    }
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  filterAliExpressPromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      const currentPrice = product.price;
      const originalPrice = product.original_price;

      // Se não tiver preço original, não é promoção
      if (!originalPrice || originalPrice <= currentPrice) {
        continue;
      }

      // Calcular desconto
      const discount = ((originalPrice - currentPrice) / originalPrice) * 100;

      if (discount >= minDiscountPercentage) {
        // Melhorar URL da imagem
        let imageUrl = product.thumbnail;
        if (!imageUrl || imageUrl.includes('placeholder') || !imageUrl.startsWith('http')) {
          imageUrl = 'https://via.placeholder.com/300x300?text=Sem+Imagem';
        }

        promotions.push({
          external_id: `aliexpress-${product.id}`,
          name: product.title,
          image_url: imageUrl,
          platform: 'aliexpress',
          current_price: currentPrice,
          old_price: originalPrice,
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink,
          stock_available: (product.available_quantity || 0) > 0,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas no AliExpress (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado do AliExpress
   */
  async generateAliExpressAffiliateLink(productUrl) {
    try {
      const settings = await CouponSettings.get();
      const trackingId = settings.aliexpress_tracking_id;

      if (!trackingId) {
        logger.warn('⚠️ AliExpress Tracking ID não configurado - retornando link original');
        return productUrl;
      }

      // Adicionar parâmetros de afiliado
      try {
        const url = new URL(productUrl);
        url.searchParams.set('aff_trace_key', trackingId);
        url.searchParams.set('terminal_id', 'MTWPromo');
        return url.toString();
      } catch (e) {
        // Se não for URL válida, construir
        const productId = productUrl.match(/\/(\d+)\.html/)?.[1] || productUrl;
        return `https://pt.aliexpress.com/item/${productId}.html?aff_trace_key=${trackingId}&terminal_id=MTWPromo`;
      }
    } catch (error) {
      logger.warn(`⚠️ Erro ao gerar link de afiliado AliExpress: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveAliExpressToDatabase(product, Product) {
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

      // Gerar link de afiliado (async)
      product.affiliate_link = await this.generateAliExpressAffiliateLink(product.affiliate_link);

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

export default new AliExpressSync();


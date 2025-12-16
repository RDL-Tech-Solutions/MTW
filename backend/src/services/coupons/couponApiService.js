import axios from 'axios';
import logger from '../../config/logger.js';
import meliCouponCapture from './meliCouponCapture.js';
import shopeeCouponCapture from './shopeeCouponCapture.js';
import amazonCouponCapture from './amazonCouponCapture.js';
import aliExpressCouponCapture from './aliExpressCouponCapture.js';
import AppSettings from '../../models/AppSettings.js';

class CouponApiService {
  /**
   * Buscar informações do cupom via API da plataforma
   * @param {string} code - Código do cupom
   * @param {string} platform - Plataforma (mercadolivre, shopee, amazon, aliexpress)
   * @returns {Object|null} - Dados do cupom ou null se não encontrado
   */
  async getCouponFromPlatform(code, platform) {
    try {
      switch (platform.toLowerCase()) {
        case 'mercadolivre':
          return await this.getMeliCoupon(code);
        case 'shopee':
          return await this.getShopeeCoupon(code);
        case 'amazon':
          return await this.getAmazonCoupon(code);
        case 'aliexpress':
          return await this.getAliExpressCoupon(code);
        default:
          logger.debug(`Plataforma ${platform} não suporta busca de cupom via API`);
          return null;
      }
    } catch (error) {
      // Não logar 404 como erro - é esperado quando cupom não existe
      if (error.response?.status !== 404) {
        logger.debug(`Erro ao buscar cupom ${code} da plataforma ${platform}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Buscar cupom do Mercado Livre via API
   */
  async getMeliCoupon(code) {
    try {
      // Tentar buscar via API de cupons do Mercado Livre
      const verifyResult = await meliCouponCapture.verifyCoupon(code);
      
      if (verifyResult.valid && verifyResult.data) {
        const data = verifyResult.data;
        
        // Converter dados da API para formato do sistema
        return {
          code: code.toUpperCase(),
          platform: 'mercadolivre',
          discount_type: data.discount_type || 'percentage',
          discount_value: parseFloat(data.discount_value || data.discount || 0),
          min_purchase: parseFloat(data.minimum_amount || data.min_purchase || 0),
          max_discount_value: parseFloat(data.max_discount || data.max_discount_value || null),
          valid_from: data.start_date ? new Date(data.start_date).toISOString() : new Date().toISOString(),
          valid_until: data.end_date ? new Date(data.end_date).toISOString() : null,
          max_uses: data.max_uses || data.usage_limit || null,
          current_uses: data.current_uses || data.used_count || 0,
          is_general: !data.item_ids || data.item_ids.length === 0,
          applicable_products: data.item_ids || [],
          title: data.name || data.title || '',
          description: data.description || data.terms || '',
          restrictions: data.restrictions || data.terms_and_conditions || '',
          affiliate_link: data.affiliate_link || '',
          source_url: data.url || '',
          campaign_id: data.campaign_id || data.id || null,
          campaign_name: data.campaign_name || data.name || ''
        };
      }

      // Se não encontrou via API de cupons, tentar buscar como produto (código MELI-XXXX)
      if (code.startsWith('MELI-')) {
        const productId = code.replace('MELI-', '');
        try {
          // MELI_API_URL é uma constante, não está no AppSettings
          const baseUrl = process.env.MELI_API_URL || 'https://api.mercadolibre.com';
          
          const response = await axios.get(`${baseUrl}/items/${productId}`, {
            timeout: 10000
          });

          if (response.data) {
            const product = response.data;
            const hasDiscount = product.original_price && product.price < product.original_price;
            
            if (hasDiscount) {
              const discountValue = product.original_price - product.price;
              const discountPercentage = ((discountValue / product.original_price) * 100).toFixed(2);

              return {
                code: code.toUpperCase(),
                platform: 'mercadolivre',
                discount_type: 'fixed',
                discount_value: parseFloat(discountValue.toFixed(2)),
                min_purchase: 0,
                valid_from: new Date().toISOString(),
                valid_until: null, // Precisa ser definido manualmente
                is_general: true,
                applicable_products: [],
                title: product.title || '',
                description: `${discountPercentage}% OFF - ${product.title}`,
                affiliate_link: product.permalink || '',
                source_url: product.permalink || '',
                campaign_id: product.id,
                campaign_name: product.title
              };
            }
          }
        } catch (productError) {
          // 404 é esperado quando produto não existe
          if (productError.response?.status !== 404) {
            logger.debug(`Produto MELI-${productId} não encontrado`);
          }
        }
      }

      // Cupom não encontrado - retornar null silenciosamente
      return null;
    } catch (error) {
      // Não logar 404 como erro - é esperado quando cupom não existe
      if (error.response?.status !== 404) {
        logger.debug(`Erro ao buscar cupom MELI ${code}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Buscar cupom da Shopee via API
   */
  async getShopeeCoupon(code) {
    try {
      const verifyResult = await shopeeCouponCapture.verifyCoupon(code);
      
      if (verifyResult && verifyResult.valid && verifyResult.data) {
        const data = verifyResult.data;
        
        return {
          code: code.toUpperCase(),
          platform: 'shopee',
          discount_type: data.discount_type || 'percentage',
          discount_value: parseFloat(data.discount_value || data.discount || 0),
          min_purchase: parseFloat(data.min_purchase || data.minimum_amount || 0),
          max_discount_value: parseFloat(data.max_discount || data.max_discount_value || null),
          valid_from: data.start_date ? new Date(data.start_date).toISOString() : new Date().toISOString(),
          valid_until: data.end_date ? new Date(data.end_date).toISOString() : null,
          max_uses: data.max_uses || data.usage_limit || null,
          current_uses: data.current_uses || 0,
          is_general: !data.applicable_products || data.applicable_products.length === 0,
          applicable_products: data.applicable_products || [],
          title: data.name || data.title || '',
          description: data.description || '',
          restrictions: data.restrictions || '',
          affiliate_link: data.affiliate_link || '',
          source_url: data.url || ''
        };
      }

      return null;
    } catch (error) {
      logger.error(`Erro ao buscar cupom Shopee ${code}: ${error.message}`);
      return null;
    }
  }

  /**
   * Buscar cupom da Amazon via API
   */
  async getAmazonCoupon(code) {
    try {
      const verifyResult = await amazonCouponCapture.verifyCoupon(code);
      
      if (verifyResult && verifyResult.valid && verifyResult.data) {
        const data = verifyResult.data;
        
        return {
          code: code.toUpperCase(),
          platform: 'amazon',
          discount_type: data.discount_type || 'percentage',
          discount_value: parseFloat(data.discount_value || data.discount || 0),
          min_purchase: parseFloat(data.min_purchase || 0),
          max_discount_value: parseFloat(data.max_discount || null),
          valid_from: data.start_date ? new Date(data.start_date).toISOString() : new Date().toISOString(),
          valid_until: data.end_date ? new Date(data.end_date).toISOString() : null,
          max_uses: data.max_uses || null,
          current_uses: data.current_uses || 0,
          is_general: true,
          applicable_products: [],
          title: data.name || data.title || '',
          description: data.description || '',
          restrictions: data.restrictions || '',
          affiliate_link: data.affiliate_link || '',
          source_url: data.url || ''
        };
      }

      return null;
    } catch (error) {
      logger.error(`Erro ao buscar cupom Amazon ${code}: ${error.message}`);
      return null;
    }
  }

  /**
   * Buscar cupom do AliExpress via API
   */
  async getAliExpressCoupon(code) {
    try {
      const verifyResult = await aliExpressCouponCapture.verifyCoupon(code);
      
      if (verifyResult && verifyResult.valid && verifyResult.data) {
        const data = verifyResult.data;
        
        return {
          code: code.toUpperCase(),
          platform: 'aliexpress',
          discount_type: data.discount_type || 'percentage',
          discount_value: parseFloat(data.discount_value || data.discount || 0),
          min_purchase: parseFloat(data.min_purchase || 0),
          max_discount_value: parseFloat(data.max_discount || null),
          valid_from: data.start_date ? new Date(data.start_date).toISOString() : new Date().toISOString(),
          valid_until: data.end_date ? new Date(data.end_date).toISOString() : null,
          max_uses: data.max_uses || null,
          current_uses: data.current_uses || 0,
          is_general: true,
          applicable_products: [],
          title: data.name || data.title || '',
          description: data.description || '',
          restrictions: data.restrictions || '',
          affiliate_link: data.affiliate_link || '',
          source_url: data.url || ''
        };
      }

      return null;
    } catch (error) {
      logger.error(`Erro ao buscar cupom AliExpress ${code}: ${error.message}`);
      return null;
    }
  }
}

export default new CouponApiService();


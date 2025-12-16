import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';
import AppSettings from '../../models/AppSettings.js';

class ShopeeCouponCapture {
  constructor() {
    this.baseUrl = 'https://partner.shopeemobile.com/api/v2';
  }

  /**
   * Gerar assinatura para API Shopee
   */
  async generateSignature(partnerId, path, timestamp, accessToken, shopId) {
    // Obter partner key do banco primeiro, depois .env como fallback
    let partnerKey = '';
    try {
      const config = await AppSettings.getShopeeConfig();
      partnerKey = config.partnerKey || '';
    } catch (error) {
      logger.warn(`⚠️ Erro ao buscar partner key do banco: ${error.message}`);
      partnerKey = process.env.SHOPEE_PARTNER_KEY || '';
    }
    
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    
    return crypto
      .createHmac('sha256', partnerKey)
      .update(baseString)
      .digest('hex');
  }

  /**
   * Fazer requisição para API Shopee
   */
  async makeRequest(endpoint, params = {}) {
    try {
      // Buscar configurações do AppSettings primeiro
      let partnerId, partnerKey;
      try {
        const config = await AppSettings.getShopeeConfig();
        partnerId = config.partnerId;
        partnerKey = config.partnerKey;
      } catch (error) {
        logger.warn(`⚠️ Erro ao buscar configurações Shopee do banco: ${error.message}`);
        // Fallback para CouponSettings (legado) ou .env
        try {
          const settings = await CouponSettings.get();
          partnerId = settings.shopee_partner_id || process.env.SHOPEE_PARTNER_ID;
          partnerKey = settings.shopee_partner_key || process.env.SHOPEE_PARTNER_KEY;
        } catch (e) {
          partnerId = process.env.SHOPEE_PARTNER_ID;
          partnerKey = process.env.SHOPEE_PARTNER_KEY;
        }
      }
      
      if (!partnerId || !partnerKey) {
        throw new Error('Shopee não está configurado corretamente - Partner ID e Partner Key necessários');
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const path = endpoint;
      
      // Gerar assinatura
      const sign = await this.generateSignature(partnerId, path, timestamp, '', 0);

      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        params: {
          partner_id: partnerId,
          timestamp,
          sign,
          ...params
        },
        timeout: 30000
      };

      const response = await axios.get(url, config);
      
      if (response.data.error) {
        throw new Error(response.data.message || 'Erro na API Shopee');
      }

      return response.data;
    } catch (error) {
      logger.error(`Erro na requisição Shopee: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capturar cupons de deals/promoções
   */
  async captureCoupons() {
    try {
      logger.info('🛍️ Iniciando captura de cupons Shopee...');

      const coupons = [];

      // 1. Buscar deals ativos
      const deals = await this.fetchDeals();
      
      // 2. Processar cada deal
      for (const deal of deals) {
        try {
          const coupon = await this.processDeal(deal);
          if (coupon) {
            coupons.push(coupon);
          }
        } catch (error) {
          logger.error(`Erro ao processar deal ${deal.deal_id}: ${error.message}`);
        }
      }

      logger.info(`✅ Shopee: ${coupons.length} cupons capturados`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro na captura Shopee: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar deals ativos
   */
  async fetchDeals() {
    try {
      // Nota: Este endpoint pode variar dependendo da região
      // Você pode precisar ajustar de acordo com a API Shopee Affiliate disponível
      const response = await this.makeRequest('/deal/get', {
        status: 'ongoing',
        page_size: 50
      });

      return response.data?.deals || [];
    } catch (error) {
      logger.error(`Erro ao buscar deals Shopee: ${error.message}`);
      return [];
    }
  }

  /**
   * Processar deal e extrair informações do cupom
   */
  async processDeal(deal) {
    try {
      // Extrair informações do deal
      const coupon = {
        platform: 'shopee',
        code: deal.voucher_code || deal.deal_id,
        title: deal.deal_title || 'Cupom Shopee',
        description: deal.deal_description || '',
        discount_type: deal.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: parseFloat(deal.discount_value || 0),
        min_purchase: parseFloat(deal.min_spend || 0),
        valid_from: new Date(deal.start_time * 1000).toISOString(),
        valid_until: new Date(deal.end_time * 1000).toISOString(),
        campaign_id: deal.deal_id?.toString(),
        campaign_name: deal.campaign_name || deal.deal_title,
        affiliate_link: await this.generateAffiliateLink(deal),
        source_url: deal.deal_url || '',
        auto_captured: true,
        is_general: true,
        verification_status: 'active'
      };

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar deal: ${error.message}`);
      return null;
    }
  }

  /**
   * Gerar link de afiliado Shopee
   */
  async generateAffiliateLink(deal) {
    try {
      // Buscar partner ID do AppSettings primeiro
      let partnerId;
      try {
        const config = await AppSettings.getShopeeConfig();
        partnerId = config.partnerId;
      } catch (error) {
        logger.warn(`⚠️ Erro ao buscar partner ID do banco: ${error.message}`);
        // Fallback para CouponSettings (legado) ou .env
        try {
          const settings = await CouponSettings.get();
          partnerId = settings.shopee_partner_id || process.env.SHOPEE_PARTNER_ID;
        } catch (e) {
          partnerId = process.env.SHOPEE_PARTNER_ID;
        }
      }
      
      if (!partnerId) {
        logger.warn('⚠️ Partner ID não encontrado, usando link original');
        return deal.deal_url || '';
      }

      // Usar o link do deal ou criar um link de afiliado
      if (deal.deal_url) {
        // Adicionar parâmetro de afiliado ao link
        const url = new URL(deal.deal_url);
        url.searchParams.append('affiliate_id', partnerId);
        return url.toString();
      }

      // Construir link manualmente se não houver deal_url
      return `https://shopee.com.br/deal/${deal.deal_id}?affiliate_id=${partnerId}`;
    } catch (error) {
      logger.error(`Erro ao gerar link de afiliado: ${error.message}`);
      return '';
    }
  }

  /**
   * Verificar validade de um cupom
   */
  async verifyCoupon(couponCode) {
    try {
      // Implementar verificação se a API Shopee disponibilizar
      // Por enquanto, retornar true
      return {
        valid: true,
        message: 'Cupom válido'
      };
    } catch (error) {
      logger.error(`Erro ao verificar cupom: ${error.message}`);
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * Buscar promoções de categoria
   */
  async fetchCategoryPromotions(categoryId = null) {
    try {
      const params = {
        status: 'ongoing',
        page_size: 50
      };

      if (categoryId) {
        params.category_id = categoryId;
      }

      const response = await this.makeRequest('/product/get_category', params);
      return response.data?.promotions || [];
    } catch (error) {
      logger.error(`Erro ao buscar promoções de categoria: ${error.message}`);
      return [];
    }
  }
}

export default new ShopeeCouponCapture();

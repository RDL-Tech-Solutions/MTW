import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';

class AliExpressCouponCapture {
  constructor() {
    this.baseUrl = 'https://api-sg.aliexpress.com/rest';
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
   * Capturar cupons AliExpress
   */
  async captureCoupons() {
    try {
      logger.info('🛍️ Iniciando captura de cupons AliExpress...');

      const settings = await CouponSettings.get();

      if (!settings.aliexpress_enabled) {
        logger.info('⏸️ AliExpress desabilitado nas configurações');
        return [];
      }

      if (!settings.aliexpress_app_key || !settings.aliexpress_app_secret) {
        logger.warn('⚠️ Credenciais AliExpress não configuradas');
        return [];
      }

      const coupons = [];

      // 1. Buscar cupons de afiliado
      const affiliateCoupons = await this.fetchAffiliateCoupons();
      
      // 2. Buscar super deals
      const superDeals = await this.fetchSuperDeals();

      // 3. Processar cupons
      for (const coupon of [...affiliateCoupons, ...superDeals]) {
        try {
          const processedCoupon = await this.processCoupon(coupon);
          if (processedCoupon) {
            coupons.push(processedCoupon);
          }
        } catch (error) {
          logger.error(`Erro ao processar cupom AliExpress: ${error.message}`);
        }
      }

      logger.info(`✅ AliExpress: ${coupons.length} cupons capturados`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro na captura AliExpress: ${error.message}`);
      return [];
    }
  }

  /**
   * Fazer requisição para API AliExpress
   */
  async makeRequest(method, params = {}) {
    try {
      const settings = await CouponSettings.get();

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

      return response.data;
    } catch (error) {
      logger.error(`Erro na requisição AliExpress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar cupons de afiliado
   */
  async fetchAffiliateCoupons() {
    try {
      logger.info('🔍 Buscando cupons de afiliado AliExpress...');

      const response = await this.makeRequest('aliexpress.affiliate.promotionlinks.get', {
        page_size: 50,
        page_no: 1,
        promotion_type: 'COUPON'
      });

      return response.resp_result?.result?.promotions || [];

    } catch (error) {
      logger.error(`Erro ao buscar cupons de afiliado: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar super deals
   */
  async fetchSuperDeals() {
    try {
      logger.info('💰 Buscando super deals AliExpress...');

      const response = await this.makeRequest('aliexpress.affiliate.hotproduct.query', {
        page_size: 50,
        page_no: 1,
        sort: 'SALE_PRICE_ASC',
        ship_to_country: 'BR'
      });

      return response.resp_result?.result?.products || [];

    } catch (error) {
      logger.error(`Erro ao buscar super deals: ${error.message}`);
      return [];
    }
  }

  /**
   * Processar cupom
   */
  async processCoupon(item) {
    try {
      const settings = await CouponSettings.get();

      const coupon = {
        platform: 'aliexpress',
        code: item.coupon_code || item.promo_code || `ALI-${item.product_id}`,
        title: item.product_title || item.promotion_name || 'Promoção AliExpress',
        description: item.product_detail_url || '',
        discount_type: item.discount_type === 'AMOUNT' ? 'fixed' : 'percentage',
        discount_value: parseFloat(item.coupon_amount || item.discount || 0),
        min_purchase: parseFloat(item.coupon_min_amount || 0),
        valid_from: new Date().toISOString(),
        valid_until: item.coupon_end_time 
          ? new Date(item.coupon_end_time).toISOString()
          : this.getDefaultExpirationDate(),
        campaign_id: item.product_id?.toString() || item.promotion_id?.toString(),
        campaign_name: item.promotion_name || 'AliExpress Deal',
        affiliate_link: this.generateAffiliateLink(
          item.promotion_link || item.product_detail_url,
          settings.aliexpress_tracking_id
        ),
        source_url: item.product_detail_url || item.promotion_link || '',
        auto_captured: true,
        is_general: false,
        applicable_products: item.product_id ? [item.product_id.toString()] : [],
        verification_status: 'active'
      };

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar cupom AliExpress: ${error.message}`);
      return null;
    }
  }

  /**
   * Gerar link de afiliado AliExpress
   */
  generateAffiliateLink(originalUrl, trackingId) {
    try {
      if (!originalUrl || !trackingId) return originalUrl;

      const url = new URL(originalUrl);
      url.searchParams.set('aff_trace_key', trackingId);
      url.searchParams.set('terminal_id', 'MTWPromo');
      
      return url.toString();
    } catch (error) {
      logger.error(`Erro ao gerar link de afiliado AliExpress: ${error.message}`);
      return originalUrl;
    }
  }

  /**
   * Obter data de expiração padrão (30 dias)
   */
  getDefaultExpirationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  }

  /**
   * Verificar validade de cupom
   */
  async verifyCoupon(couponCode) {
    try {
      return {
        valid: true,
        message: 'Verificação não disponível para AliExpress'
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }
}

export default new AliExpressCouponCapture();

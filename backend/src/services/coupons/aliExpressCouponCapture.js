import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import AppSettings from '../../models/AppSettings.js';
import CouponSettings from '../../models/CouponSettings.js';

class AliExpressCouponCapture {
  constructor() {
    // baseUrl será obtido de AppSettings.getAliExpressConfig()
    this.defaultBaseUrl = 'https://api-sg.aliexpress.com/rest';
  }

  /**
   * Gerar assinatura para API AliExpress
   * Conforme documentação: https://openservice.aliexpress.com/doc/doc.htm
   * 
   * Algoritmo:
   * 1. Ordenar todos os parâmetros (exceto 'sign') por nome em ordem ASCII
   * 2. Concatenar: key1value1key2value2...
   * 3. Prepend o método da API à string concatenada
   * 4. Gerar HMAC-SHA256 com app_secret
   * 5. Converter para hexadecimal maiúsculo
   */
  generateSignature(method, params, appSecret) {
    // Remover 'sign' se existir
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;
    
    // Ordenar parâmetros por nome em ordem ASCII
    const sortedKeys = Object.keys(paramsWithoutSign).sort();
    
    // Concatenar: key1value1key2value2...
    const concatenatedParams = sortedKeys
      .map(key => `${key}${paramsWithoutSign[key]}`)
      .join('');
    
    // Prepend o método da API conforme documentação
    const stringToSign = `${method}${concatenatedParams}`;
    
    // Gerar HMAC-SHA256
    return crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Capturar cupons AliExpress
   */
  async captureCoupons() {
    try {
      logger.info('🛍️ Iniciando captura de cupons AliExpress...');

      const couponSettings = await CouponSettings.get();
      const apiConfig = await AppSettings.getAliExpressConfig();

      if (!couponSettings.aliexpress_enabled) {
        logger.info('⏸️ AliExpress desabilitado nas configurações');
        return [];
      }

      if (!apiConfig.appKey || !apiConfig.appSecret) {
        logger.warn('⚠️ Credenciais AliExpress não configuradas - configure em /settings');
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
      const config = await AppSettings.getAliExpressConfig();

      if (!config.appKey || !config.appSecret) {
        throw new Error('AliExpress não configurado - configure App Key e App Secret em /settings');
      }

      // Timestamp no formato requerido pela API AliExpress: milissegundos desde epoch
      const timestamp = Date.now();
      
      const requestParams = {
        app_key: config.appKey,
        method,
        timestamp,
        sign_method: 'sha256',
        format: 'json',
        v: '2.0',
        ...params
      };

      // Gerar assinatura (passar o método como primeiro parâmetro)
      const sign = this.generateSignature(method, requestParams, config.appSecret);
      requestParams.sign = sign;

      const baseUrl = config.apiUrl || this.defaultBaseUrl;
      const response = await axios.get(baseUrl, {
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
      const config = await AppSettings.getAliExpressConfig();

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
          config.trackingId
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

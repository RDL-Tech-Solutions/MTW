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
      logger.info(`   📦 ${deals.length} deals encontrados`);
      
      // 2. Buscar vouchers/cupons diretos
      const vouchers = await this.fetchVouchers();
      logger.info(`   🎟️ ${vouchers.length} vouchers encontrados`);

      // 3. Buscar produtos em promoção (que podem ter cupons)
      const promotionProducts = await this.fetchPromotionProducts();
      logger.info(`   🔥 ${promotionProducts.length} produtos em promoção encontrados`);

      // 4. Processar deals
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

      // 5. Processar vouchers
      for (const voucher of vouchers) {
        try {
          const coupon = await this.processVoucher(voucher);
          if (coupon) {
            coupons.push(coupon);
          }
        } catch (error) {
          logger.error(`Erro ao processar voucher ${voucher.voucher_id}: ${error.message}`);
        }
      }

      // 6. Processar produtos em promoção (extrair cupons se houver)
      for (const product of promotionProducts.slice(0, 20)) { // Limitar a 20 para não sobrecarregar
        try {
          const productCoupons = await this.extractCouponsFromProduct(product);
          if (productCoupons && productCoupons.length > 0) {
            coupons.push(...productCoupons);
          }
        } catch (error) {
          logger.error(`Erro ao processar produto ${product.item_id}: ${error.message}`);
        }
      }

      logger.info(`✅ Shopee: ${coupons.length} cupons capturados no total`);
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
      // Usar shopeeService para buscar deals
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      const deals = await shopeeService.getDeals(50, 0);
      return deals || [];
    } catch (error) {
      logger.error(`Erro ao buscar deals Shopee: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar vouchers/cupons diretos
   */
  async fetchVouchers() {
    try {
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      const vouchers = await shopeeService.getVouchers(50, 0);
      return vouchers || [];
    } catch (error) {
      logger.error(`Erro ao buscar vouchers Shopee: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar produtos em promoção
   */
  async fetchPromotionProducts() {
    try {
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      const products = await shopeeService.getPromotionProducts(50);
      return products || [];
    } catch (error) {
      logger.error(`Erro ao buscar produtos em promoção: ${error.message}`);
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
   * Processar voucher e extrair informações do cupom
   */
  async processVoucher(voucher) {
    try {
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      
      // Buscar detalhes completos do voucher
      const voucherDetails = await shopeeService.getVoucherDetails(voucher.voucher_id || voucher.id);
      const voucherData = voucherDetails || voucher;

      const coupon = {
        platform: 'shopee',
        code: voucherData.voucher_code || voucherData.code || voucherData.voucher_id?.toString(),
        title: voucherData.voucher_name || voucherData.name || 'Cupom Shopee',
        description: voucherData.description || voucherData.voucher_description || '',
        discount_type: voucherData.discount_type === 'percentage' || voucherData.discount_percent ? 'percentage' : 'fixed',
        discount_value: voucherData.discount_percent || voucherData.discount_amount || voucherData.discount_value || 0,
        min_purchase: parseFloat(voucherData.min_spend || voucherData.min_purchase || 0),
        max_discount: parseFloat(voucherData.max_discount || voucherData.discount_cap || 0),
        valid_from: voucherData.start_time ? new Date(voucherData.start_time * 1000).toISOString() : new Date().toISOString(),
        valid_until: voucherData.end_time ? new Date(voucherData.end_time * 1000).toISOString() : null,
        usage_limit: voucherData.usage_limit || voucherData.quantity || null,
        campaign_id: voucherData.campaign_id?.toString(),
        campaign_name: voucherData.campaign_name || voucherData.voucher_name,
        affiliate_link: await this.generateAffiliateLink({ deal_url: voucherData.url || '' }),
        source_url: voucherData.url || '',
        auto_captured: true,
        is_general: true,
        verification_status: 'active'
      };

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar voucher: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrair cupons de um produto em promoção
   */
  async extractCouponsFromProduct(product) {
    try {
      const coupons = [];

      // Se o produto tem voucher associado
      if (product.voucher_info && product.voucher_info.voucher_code) {
        const coupon = {
          platform: 'shopee',
          code: product.voucher_info.voucher_code,
          title: `Cupom ${product.name?.substring(0, 30)}`,
          description: `Cupom para ${product.name}`,
          discount_type: product.voucher_info.discount_type || 'percentage',
          discount_value: product.voucher_info.discount_value || 0,
          min_purchase: parseFloat(product.voucher_info.min_spend || 0),
          valid_from: product.voucher_info.start_time ? new Date(product.voucher_info.start_time * 1000).toISOString() : new Date().toISOString(),
          valid_until: product.voucher_info.end_time ? new Date(product.voucher_info.end_time * 1000).toISOString() : null,
          affiliate_link: await this.generateAffiliateLink({ deal_url: product.url || '' }),
          source_url: product.url || '',
          auto_captured: true,
          is_general: false,
          verification_status: 'active'
        };
        coupons.push(coupon);
      }

      return coupons;
    } catch (error) {
      logger.error(`Erro ao extrair cupons do produto: ${error.message}`);
      return [];
    }
  }

  /**
   * Verificar validade de um cupom
   */
  async verifyCoupon(couponCode) {
    try {
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      const result = await shopeeService.verifyVoucher(couponCode);
      
      return {
        valid: result.valid,
        message: result.message,
        discount: result.discount,
        min_purchase: result.min_purchase
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
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      const products = await shopeeService.getProductsByCategory(categoryId, 50, 0);
      
      // Filtrar apenas produtos com desconto
      const promotions = products.filter(p => 
        p.price_before_discount && 
        p.price_before_discount > p.price
      );

      return promotions;
    } catch (error) {
      logger.error(`Erro ao buscar promoções de categoria: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar cupons por categoria
   */
  async captureCouponsByCategory(categoryId) {
    try {
      logger.info(`🛍️ Buscando cupons Shopee da categoria ${categoryId}...`);

      const coupons = [];
      
      // 1. Buscar produtos da categoria
      const products = await this.fetchCategoryPromotions(categoryId);
      
      // 2. Extrair cupons dos produtos
      for (const product of products) {
        try {
          const productCoupons = await this.extractCouponsFromProduct(product);
          if (productCoupons && productCoupons.length > 0) {
            coupons.push(...productCoupons);
          }
        } catch (error) {
          logger.error(`Erro ao processar produto ${product.item_id}: ${error.message}`);
        }
      }

      logger.info(`✅ Categoria ${categoryId}: ${coupons.length} cupons encontrados`);
      return coupons;
    } catch (error) {
      logger.error(`❌ Erro ao buscar cupons por categoria: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar cupons por palavra-chave
   */
  async captureCouponsByKeyword(keyword) {
    try {
      logger.info(`🛍️ Buscando cupons Shopee para: ${keyword}...`);

      const coupons = [];
      const shopeeService = (await import('../shopee/shopeeService.js')).default;
      
      // 1. Buscar produtos por palavra-chave
      const products = await shopeeService.searchProducts(keyword, 50, 0);
      
      // 2. Filtrar produtos com desconto
      const discountedProducts = products.filter(p => 
        p.price_before_discount && 
        p.price_before_discount > p.price
      );

      // 3. Extrair cupons
      for (const product of discountedProducts) {
        try {
          const productCoupons = await this.extractCouponsFromProduct(product);
          if (productCoupons && productCoupons.length > 0) {
            coupons.push(...productCoupons);
          }
        } catch (error) {
          logger.error(`Erro ao processar produto ${product.item_id}: ${error.message}`);
        }
      }

      logger.info(`✅ Palavra-chave "${keyword}": ${coupons.length} cupons encontrados`);
      return coupons;
    } catch (error) {
      logger.error(`❌ Erro ao buscar cupons por palavra-chave: ${error.message}`);
      return [];
    }
  }
}

export default new ShopeeCouponCapture();

import axios from 'axios';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';
import meliSync from '../autoSync/meliSync.js';
import CouponValidator from '../../utils/couponValidator.js';

class MeliCouponCapture {
  constructor() {
    this.baseUrl = process.env.MELI_API_URL || 'https://api.mercadolibre.com';
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.affiliateCode = process.env.MELI_AFFILIATE_CODE || '';
  }

  /**
   * Fazer requisição para API Mercado Livre
   */
  async makeRequest(endpoint, params = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        params,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: 30000
      };

      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      // Não logar 404 como erro - é esperado quando recurso não existe
      if (error.response?.status === 404) {
        throw error; // Re-lançar para ser tratado pelo chamador
      }
      
      if (error.response?.status === 401) {
        logger.error('❌ Token do Mercado Livre expirado ou inválido');
      } else if (error.response?.status !== 404) {
        // Só logar erros que não são 404
        logger.error(`Erro na requisição MELI ${endpoint}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Capturar cupons do Mercado Livre
   */
  async captureCoupons() {
    try {
      logger.info('🛒 Iniciando captura de cupons Mercado Livre...');

      const settings = await CouponSettings.get();
      const coupons = [];

      // 1. Capturar deals
      if (settings.meli_capture_deals) {
        const dealCoupons = await this.captureDeals();
        coupons.push(...dealCoupons);
      }

      // 2. Capturar campanhas promocionais
      if (settings.meli_capture_campaigns) {
        const campaignCoupons = await this.captureCampaigns();
        coupons.push(...campaignCoupons);
      }

      // 3. Capturar promoções de sellers
      const sellerPromotions = await this.captureSellerPromotions();
      coupons.push(...sellerPromotions);

      // 4. (NOVO) Capturar via Scraping de Busca (usando meliSync melhorado)
      // Isso garante que peguemos cupons que aparecem apenas nas listings de produtos
      // e que a API oficial não retorna por falta de permissão ou escopo.
      try {
        const scrapedCoupons = await this.scrapeCouponsFromSearch();
        coupons.push(...scrapedCoupons);
      } catch (scrapeError) {
        logger.error(`Erro no scraping de cupons ML: ${scrapeError.message}`);
      }

      logger.info(`✅ Mercado Livre: ${coupons.length} cupons capturados`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro na captura MELI: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capturar deals ativos
   */
  async captureDeals() {
    try {
      logger.info('📦 Buscando deals do Mercado Livre...');

      const deals = await this.makeRequest('/deals/MLB');
      const coupons = [];

      for (const deal of deals.results || []) {
        try {
          const coupon = await this.processDeal(deal);
          if (coupon) {
            coupons.push(coupon);
          }
        } catch (error) {
          logger.error(`Erro ao processar deal ${deal.id}: ${error.message}`);
        }
      }

      logger.info(`📦 ${coupons.length} cupons de deals capturados`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar deals: ${error.message}`);
      return [];
    }
  }

  /**
   * Capturar campanhas promocionais
   */
  async captureCampaigns() {
    try {
      logger.info('🎯 Buscando campanhas promocionais...');

      const campaigns = await this.makeRequest('/campaigns');
      const coupons = [];

      for (const campaign of campaigns.results || []) {
        try {
          const coupon = await this.processCampaign(campaign);
          if (coupon) {
            coupons.push(coupon);
          }
        } catch (error) {
          logger.error(`Erro ao processar campanha ${campaign.id}: ${error.message}`);
        }
      }

      logger.info(`🎯 ${coupons.length} cupons de campanhas capturados`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar campanhas: ${error.message}`);
      return [];
    }
  }

  /**
   * Capturar promoções de sellers
   */
  async captureSellerPromotions() {
    try {
      logger.info('🏪 Buscando promoções de sellers...');

      const promotions = await this.makeRequest('/promotions/MLB');
      const coupons = [];

      for (const promo of promotions.results || []) {
        try {
          if (promo.type === 'coupon' && promo.status === 'active') {
            const coupon = await this.processPromotion(promo);
            if (coupon) {
              coupons.push(coupon);
            }
          }
        } catch (error) {
          logger.error(`Erro ao processar promoção ${promo.id}: ${error.message}`);
        }
      }

      logger.info(`🏪 ${coupons.length} cupons de sellers capturados`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar promoções de sellers: ${error.message}`);
      return [];
    }
  }

  /**
   * Processar deal
   */
  async processDeal(deal) {
    try {
      const coupon = {
        platform: 'mercadolivre',
        code: deal.coupon_code || `DEAL-${deal.id}`,
        title: deal.name || 'Deal Mercado Livre',
        description: deal.description || '',
        discount_type: deal.discount_type || 'percentage',
        discount_value: parseFloat(deal.discount_value || 0),
        min_purchase: parseFloat(deal.minimum_amount || 0),
        valid_from: new Date(deal.start_date).toISOString(),
        valid_until: new Date(deal.end_date).toISOString(),
        campaign_id: deal.id?.toString(),
        campaign_name: deal.name,
        affiliate_link: this.generateAffiliateLink(deal.permalink),
        source_url: deal.permalink || '',
        auto_captured: true,
        is_general: !deal.item_ids || deal.item_ids.length === 0,
        applicable_products: deal.item_ids || [],
        verification_status: 'active'
      };

      // Validar cupom antes de retornar
      const validation = CouponValidator.validateCoupon(coupon);
      if (!validation.valid) {
        logger.warn(`⚠️ Deal rejeitado: ${coupon.code} - ${validation.reason}`);
        return null;
      }

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar deal: ${error.message}`);
      return null;
    }
  }

  /**
   * Processar campanha
   */
  async processCampaign(campaign) {
    try {
      // Determinar se campanha é geral ou para produtos/categorias específicas
      const isGeneral = !campaign.item_ids || campaign.item_ids.length === 0;
      
      const coupon = {
        platform: 'mercadolivre',
        code: campaign.coupon_code || `CAMP-${campaign.id}`,
        title: campaign.name || 'Campanha Mercado Livre',
        description: campaign.description || '',
        discount_type: campaign.discount_type || 'percentage',
        discount_value: parseFloat(campaign.discount_amount || 0),
        min_purchase: parseFloat(campaign.minimum_purchase_amount || 0),
        valid_from: new Date(campaign.start_date).toISOString(),
        valid_until: new Date(campaign.end_date).toISOString(),
        campaign_id: campaign.id?.toString(),
        campaign_name: campaign.name,
        terms_and_conditions: campaign.terms_and_conditions || '',
        affiliate_link: this.generateAffiliateLink(campaign.landing_url),
        source_url: campaign.landing_url || '',
        auto_captured: true,
        is_general: isGeneral,
        applicable_products: campaign.item_ids || [],
        verification_status: 'active'
      };

      // Validar cupom antes de retornar
      const validation = CouponValidator.validateCoupon(coupon);
      if (!validation.valid) {
        logger.warn(`⚠️ Campanha rejeitada: ${coupon.code} - ${validation.reason}`);
        return null;
      }

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar campanha: ${error.message}`);
      return null;
    }
  }

  /**
   * Processar promoção
   */
  async processPromotion(promo) {
    try {
      const coupon = {
        platform: 'mercadolivre',
        code: promo.code || `PROMO-${promo.id}`,
        title: promo.name || 'Promoção Mercado Livre',
        description: promo.description || '',
        discount_type: promo.discount_type || 'percentage',
        discount_value: parseFloat(promo.value || 0),
        min_purchase: parseFloat(promo.min_amount || 0),
        valid_from: new Date(promo.date_from).toISOString(),
        valid_until: new Date(promo.date_to).toISOString(),
        campaign_id: promo.id?.toString(),
        campaign_name: promo.name,
        affiliate_link: promo.url ? this.generateAffiliateLink(promo.url) : '',
        source_url: promo.url || '',
        auto_captured: true,
        is_general: true,
        max_uses: promo.max_uses || null,
        verification_status: 'active'
      };

      // Validar cupom antes de retornar
      const validation = CouponValidator.validateCoupon(coupon);
      if (!validation.valid) {
        logger.warn(`⚠️ Promoção rejeitada: ${coupon.code} - ${validation.reason}`);
        return null;
      }

      return coupon;
    } catch (error) {
      logger.error(`Erro ao processar promoção: ${error.message}`);
      return null;
    }
  }

  /**
   * Gerar link de afiliado Mercado Livre
   */
  generateAffiliateLink(originalUrl) {
    try {
      if (!originalUrl) return '';

      // Formato: https://mercadolivre.com/jm/mlb?&meuid=SEU_CODIGO&redirect=URL_DO_PRODUTO
      const encodedUrl = encodeURIComponent(originalUrl);

      if (this.affiliateCode) {
        return `https://mercadolivre.com/jm/mlb?&meuid=${this.affiliateCode}&redirect=${encodedUrl}`;
      }

      // Se não tiver código de afiliado, retornar URL original
      return originalUrl;
    } catch (error) {
      logger.error(`Erro ao gerar link de afiliado: ${error.message}`);
      return originalUrl;
    }
  }

  /**
   * Verificar validade de um cupom
   */
  async verifyCoupon(couponCode) {
    try {
      // Buscar informações do cupom
      const response = await this.makeRequest(`/coupons/${couponCode}`);

      const isValid = response.status === 'active' &&
        new Date(response.end_date) > new Date();

      return {
        valid: isValid,
        message: isValid ? 'Cupom válido' : 'Cupom inválido ou expirado',
        data: response
      };
    } catch (error) {
      // 404 é esperado quando o cupom não existe na API
      if (error.response?.status === 404) {
        logger.debug(`Cupom ${couponCode} não encontrado na API do Mercado Livre (404)`);
        return {
          valid: false,
          message: 'Cupom não encontrado na API',
          data: null
        };
      }
      
      // Outros erros devem ser logados
      logger.warn(`Erro ao verificar cupom ${couponCode}: ${error.message}`);
      return {
        valid: false,
        message: error.message,
        data: null
      };
    }
  }

  /**
   * Buscar produtos com cupons ativos via Scraping (meliSync)
   */
  async scrapeCouponsFromSearch() {
    try {
      logger.info('🕷️ Iniciando scraping de cupons via busca de produtos...');

      // Palavras-chave genéricas para encontrar produtos com cupom
      const keywords = 'cupom, oferta, promoção, desconto, 10% off, 20% off';

      // Busca produtos usando a lógica robusta de scraping/API do meliSync
      const products = await meliSync.fetchMeliProducts(keywords, 30, { forceScraping: true }); // Limite de 30 por termo

      const coupons = [];
      const processedCodes = new Set();

      for (const product of products) {
        if (product.coupon) {
          // Evitar duplicatas nesta execução
          const code = product.coupon.code || `PROD-${product.id}`;
          if (processedCodes.has(code)) continue;

          // Validar código antes de processar
          const codeValidation = CouponValidator.validateCode(code);
          if (!codeValidation.valid) {
            logger.warn(`⚠️ Código de cupom inválido ignorado: ${code} - ${codeValidation.reason}`);
            continue;
          }

          processedCodes.add(code);

          // Determinar se é cupom geral ou para produtos selecionados
          // Se o cupom tem categoria específica ou "produtos selecionados" no título, é específico
          const isGeneral = !product.coupon.applicable_products || 
                           product.coupon.applicable_products.length === 0 ||
                           (product.title && !product.title.toLowerCase().includes('produtos selecionados') && 
                            !product.title.toLowerCase().includes('categoria'));

          const coupon = {
            platform: 'mercadolivre',
            code: code,
            title: product.coupon.title || `Cupom: ${product.title.substring(0, 50)}...`,
            description: product.coupon.description || `Cupom encontrado no produto ${product.title}`,
            discount_type: product.coupon.discount_type || 'fixed',
            discount_value: parseFloat(product.coupon.discount_value || 0),
            min_purchase: parseFloat(product.coupon.min_purchase || 0),
            valid_from: product.coupon.valid_from || new Date().toISOString(),
            valid_until: product.coupon.valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            affiliate_link: product.permalink,
            source_url: product.permalink,
            auto_captured: true,
            is_general: isGeneral,
            applicable_products: product.coupon.applicable_products || (isGeneral ? [] : [product.id]),
            verification_status: 'active'
          };

          // Validar cupom completo antes de adicionar
          const validation = CouponValidator.validateCoupon(coupon);
          if (validation.valid) {
            coupons.push(coupon);
          } else {
            logger.warn(`⚠️ Cupom de produto rejeitado: ${code} - ${validation.reason}`);
          }
        }
      }

      logger.info(`🕷️ Scraping encontrou ${coupons.length} cupons via produtos.`);
      return coupons;
    } catch (error) {
      logger.error(`Erro no scrapeCouponsFromSearch: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar produtos com cupons ativos
   */
  async findProductsWithCoupons(query = '', limit = 50) {
    try {
      const response = await this.makeRequest('/sites/MLB/search', {
        q: query,
        limit,
        has_promotional_price: true,
        sort: 'price_asc'
      });

      return response.results || [];
    } catch (error) {
      logger.error(`Erro ao buscando produtos com cupons: ${error.message}`);
      return [];
    }
  }
}

export default new MeliCouponCapture();

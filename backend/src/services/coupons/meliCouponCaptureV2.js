import axios from 'axios';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';

/**
 * Serviço de Captura de Cupons do Mercado Livre - V2
 * Usa endpoints públicos e estratégias alternativas
 */
class MeliCouponCaptureV2 {
  constructor() {
    this.baseUrl = process.env.MELI_API_URL || 'https://api.mercadolibre.com';
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.affiliateCode = process.env.MELI_AFFILIATE_CODE || '';
  }

  /**
   * Fazer requisição para API Mercado Livre
   */
  async makeRequest(endpoint, params = {}, needsAuth = false) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        params,
        timeout: 30000
      };

      // Adicionar autenticação apenas se necessário
      if (needsAuth && this.accessToken) {
        config.headers = {
          'Authorization': `Bearer ${this.accessToken}`
        };
      }

      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        logger.error('❌ Token do Mercado Livre expirado ou inválido');
      } else if (error.response?.status === 403) {
        logger.warn(`⚠️  Acesso negado ao endpoint ${endpoint} (403 Forbidden)`);
      } else if (error.response?.status === 404) {
        logger.warn(`⚠️  Endpoint ${endpoint} não encontrado (404)`);
      }
      throw error;
    }
  }

  /**
   * Capturar cupons do Mercado Livre usando estratégias públicas
   */
  async captureCoupons() {
    try {
      logger.info('🛒 Iniciando captura de cupons Mercado Livre (V2)...');

      const settings = await CouponSettings.get();
      const coupons = [];

      // Estratégia 1: Buscar produtos com ofertas/descontos
      const offerCoupons = await this.captureProductOffers();
      coupons.push(...offerCoupons);

      // Estratégia 2: Buscar produtos mais vendidos com desconto
      const trendingCoupons = await this.captureTrendingDeals();
      coupons.push(...trendingCoupons);

      // Estratégia 3: Buscar cupons em categorias específicas
      const categoryCoupons = await this.captureCategoryDeals();
      coupons.push(...categoryCoupons);

      logger.info(`✅ Total de ${coupons.length} cupons/ofertas capturados do Mercado Livre`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro na captura MELI: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estratégia 1: Buscar produtos com ofertas
   */
  async captureProductOffers() {
    try {
      logger.info('🔍 Buscando ofertas de produtos...');

      // Buscar produtos com desconto em várias categorias
      const searches = [
        { q: 'oferta', category: 'MLB1051' }, // Celulares
        { q: 'desconto', category: 'MLB1000' }, // Eletrônicos
        { q: 'promoção', category: 'MLB1144' }, // Informática
      ];

      const coupons = [];

      for (const search of searches) {
        try {
          // Usar endpoint público de busca (sem autenticação)
          const results = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
            params: {
              q: search.q,
              category: search.category,
              limit: 50,
              offset: 0,
              // Filtros para pegar apenas com desconto
              'shipping.free': 'yes', // Frete grátis
              condition: 'new' // Apenas novos
            },
            timeout: 30000
          });

          if (results.data?.results) {
            for (const item of results.data.results) {
              // Verificar se tem desconto
              if (item.original_price && item.price < item.original_price) {
                const discount = ((item.original_price - item.price) / item.original_price) * 100;
                
                // Apenas descontos > 10%
                if (discount >= 10) {
                  const coupon = await this.createCouponFromProduct(item, discount);
                  if (coupon) {
                    coupons.push(coupon);
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Erro ao buscar em ${search.category}: ${error.message}`);
        }

        // Delay entre buscas
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info(`🔍 ${coupons.length} ofertas encontradas via busca`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar ofertas: ${error.message}`);
      return [];
    }
  }

  /**
   * Estratégia 2: Produtos em alta (trending) com desconto
   */
  async captureTrendingDeals() {
    try {
      logger.info('🔥 Buscando produtos trending com desconto...');

      const coupons = [];

      // Buscar produtos mais vendidos em categorias populares
      const categories = ['MLB1051', 'MLB1000', 'MLB1144', 'MLB1430'];

      for (const category of categories) {
        try {
          const results = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
            params: {
              category,
              sort: 'sold_quantity_desc', // Mais vendidos
              limit: 30
            },
            timeout: 30000
          });

          if (results.data?.results) {
            for (const item of results.data.results) {
              if (item.original_price && item.price < item.original_price) {
                const discount = ((item.original_price - item.price) / item.original_price) * 100;
                
                if (discount >= 15) { // Trending: apenas descontos maiores
                  const coupon = await this.createCouponFromProduct(item, discount, 'trending');
                  if (coupon) {
                    coupons.push(coupon);
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Erro ao buscar trending em ${category}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info(`🔥 ${coupons.length} ofertas trending capturadas`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar trending: ${error.message}`);
      return [];
    }
  }

  /**
   * Estratégia 3: Ofertas em categorias específicas
   */
  async captureCategoryDeals() {
    try {
      logger.info('📂 Buscando ofertas por categoria...');

      const coupons = [];

      // Categorias com muitas ofertas
      const targetCategories = [
        { id: 'MLB5726', name: 'Telefones' },
        { id: 'MLB1384', name: 'Notebooks' },
        { id: 'MLB1367', name: 'TVs' }
      ];

      for (const cat of targetCategories) {
        try {
          const results = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
            params: {
              category: cat.id,
              'shipping.free': 'yes',
              condition: 'new',
              sort: 'price_asc', // Menores preços
              limit: 20
            },
            timeout: 30000
          });

          if (results.data?.results) {
            for (const item of results.data.results) {
              if (item.original_price && item.price < item.original_price) {
                const discount = ((item.original_price - item.price) / item.original_price) * 100;
                
                if (discount >= 10) {
                  const coupon = await this.createCouponFromProduct(item, discount, cat.name);
                  if (coupon) {
                    coupons.push(coupon);
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Erro em categoria ${cat.name}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info(`📂 ${coupons.length} ofertas de categorias capturadas`);
      return coupons;

    } catch (error) {
      logger.error(`Erro ao capturar por categoria: ${error.message}`);
      return [];
    }
  }

  /**
   * Criar cupom/oferta a partir de um produto
   */
  async createCouponFromProduct(product, discount, source = 'search') {
    try {
      // Gerar link de afiliado
      const affiliateLink = this.generateAffiliateLink(product.permalink);

      return {
        code: `MELI-${product.id}`, // Usar ID do produto como código
        title: product.title.substring(0, 500),
        description: `${discount.toFixed(0)}% OFF - ${product.title}`,
        platform: 'mercadolivre',
        discount_type: 'percentage',
        discount_value: parseFloat(discount.toFixed(2)),
        original_price: product.original_price,
        final_price: product.price,
        affiliate_link: affiliateLink,
        source_url: product.permalink,
        campaign_id: product.id,
        campaign_name: `${source} - ${product.category_id}`,
        min_purchase_amount: null,
        max_uses: product.available_quantity || null,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        terms_and_conditions: `Oferta válida enquanto houver estoque. Preço original: R$ ${product.original_price?.toFixed(2)}`,
        auto_captured: true,
        verification_status: 'active',
        category_id: product.category_id,
        thumbnail: product.thumbnail,
        seller_id: product.seller?.id,
        free_shipping: product.shipping?.free_shipping || false
      };
    } catch (error) {
      logger.error(`Erro ao criar cupom do produto ${product.id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Gerar link de afiliado do Mercado Livre
   */
  generateAffiliateLink(productUrl) {
    if (!this.affiliateCode) {
      return productUrl;
    }

    try {
      // Formato do link de afiliado ML:
      // https://mercadolivre.com/jm/mlb?&meuid=SEU_CODIGO&redirect=URL_DO_PRODUTO
      const encodedUrl = encodeURIComponent(productUrl);
      return `https://mercadolivre.com/jm/mlb?&meuid=${this.affiliateCode}&redirect=${encodedUrl}`;
    } catch (error) {
      logger.error(`Erro ao gerar link de afiliado: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Verificar validade de um cupom/oferta
   */
  async verifyCoupon(coupon) {
    try {
      // Buscar produto pelo ID extraído do código
      const productId = coupon.code.replace('MELI-', '');
      
      const product = await axios.get(`${this.baseUrl}/items/${productId}`, {
        timeout: 10000
      });

      if (product.data) {
        // Verificar se ainda tem desconto
        const hasDiscount = product.data.original_price && 
                           product.data.price < product.data.original_price;

        return {
          is_valid: hasDiscount && product.data.status === 'active',
          current_price: product.data.price,
          available_quantity: product.data.available_quantity
        };
      }

      return { is_valid: false };
    } catch (error) {
      logger.error(`Erro ao verificar cupom: ${error.message}`);
      return { is_valid: false };
    }
  }
}

export default new MeliCouponCaptureV2();

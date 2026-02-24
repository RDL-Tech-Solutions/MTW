import axios from 'axios';
import logger from '../../config/logger.js';
import CouponSettings from '../../models/CouponSettings.js';
import AppSettings from '../../models/AppSettings.js';

/**
 * Serviço de Captura de Cupons do Mercado Livre - V2
 * Usa endpoints públicos e estratégias alternativas
 */
class MeliCouponCaptureV2 {
  constructor() {
    // Inicializar com valores do .env (fallback)
    this.baseUrl = process.env.MELI_API_URL || 'https://api.mercadolibre.com';
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.affiliateCode = process.env.MELI_AFFILIATE_CODE || '';
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getMeliConfig();
      this.accessToken = config.accessToken || this.accessToken;
      this.affiliateCode = config.affiliateCode || this.affiliateCode;
      this.settingsLoaded = true;
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações do ML do banco: ${error.message}`);
    }
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
      // Garantir que as configurações foram carregadas
      if (!this.settingsLoaded) {
        await this.loadSettings();
      }

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
          // IMPORTANTE: Sempre tentar enviar token mesmo em endpoints públicos (recomendação de segurança)
          let token = this.accessToken;
          if (!token) {
            try {
              const meliAuth = (await import('../autoSync/meliAuth.js')).default;
              if (meliAuth.isConfigured()) {
                token = await meliAuth.getAccessToken();
              }
            } catch (e) {
              // Continuar sem token se não disponível
            }
          }

          const headers = {
            'Accept': 'application/json'
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Usar endpoint público de busca (com token se disponível)
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
            headers,
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
          // IMPORTANTE: Sempre tentar enviar token mesmo em endpoints públicos
          let token = this.accessToken;
          if (!token) {
            try {
              const meliAuth = (await import('../autoSync/meliAuth.js')).default;
              if (meliAuth.isConfigured()) {
                token = await meliAuth.getAccessToken();
              }
            } catch (e) {
              // Continuar sem token se não disponível
            }
          }

          const headers = {
            'Accept': 'application/json'
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const results = await axios.get(`${this.baseUrl}/sites/MLB/search`, {
            params: {
              category,
              sort: 'sold_quantity_desc', // Mais vendidos
              limit: 30
            },
            headers,
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
      const affiliateLink = await this.generateAffiliateLink(product.permalink);

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
  /**
   * Extrair ID MLB- de um link do Mercado Livre
   * Ignora links com parâmetros de rastreamento proibidos
   */
  extractMeliProductId(link) {
    if (!link || typeof link !== 'string') return null;

    // Ignorar links com parâmetros proibidos
    const forbiddenPatterns = [
      /\/jm\/mlb/i,
      /meuid=/i,
      /redirect=/i,
      /tracking_id=/i,
      /reco_/i,
      /[?&]c_id/i,
      /[?&]c_uid/i,
      /[?&]sid/i,
      /[?&]wid/i
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(link)) {
        logger.debug(`⚠️ Link ignorado por conter parâmetro proibido: ${link.substring(0, 100)}`);
        return null;
      }
    }

    // Extrair ID MLB- do link
    const idPatterns = [
      /MLB-(\d+)/i,
      /\/MLB-(\d+)/i,
      /MLB(\d{8,})/i
    ];

    for (const pattern of idPatterns) {
      const match = link.match(pattern);
      if (match) {
        const id = match[1] || match[0].replace(/MLB-?/i, '');
        if (id && id.length >= 8) {
          return `MLB-${id}`;
        }
      }
    }

    return null;
  }

  async generateAffiliateLink(productUrl) {
    // Garantir que as configurações foram carregadas
    if (!this.settingsLoaded) {
      await this.loadSettings();
    }

    try {
      if (!productUrl || typeof productUrl !== 'string') {
        return '';
      }

      // Se já for um link meli.la (novo formato de afiliado), preservá-lo diretamente
      if (productUrl.includes('meli.la')) {
        logger.debug(`✅ Link meli.la preservado: ${productUrl}`);
        return productUrl;
      }

      // Extrair ID MLB- do link
      const productId = this.extractMeliProductId(productUrl);

      if (!productId) {
        logger.warn(`⚠️ Não foi possível extrair ID MLB- do link: ${productUrl.substring(0, 100)}`);
        return '';
      }

      // Gerar link limpo no formato oficial
      // Sempre usar o formato: https://produto.mercadolivre.com.br/MLB-XXXXXXXXXX?matt_word=IDAFILIADO
      const cleanLink = `https://produto.mercadolivre.com.br/${productId}`;

      // Se tiver código de afiliado, adicionar matt_word
      if (this.affiliateCode && this.affiliateCode.trim()) {
        const affiliateLink = `${cleanLink}?matt_word=${encodeURIComponent(this.affiliateCode.trim())}`;
        logger.debug(`✅ Link de afiliado limpo gerado: ${affiliateLink}`);
        return affiliateLink;
      }

      // Sem código de afiliado, retornar link limpo sem parâmetros
      // Mas ainda no formato correto: https://produto.mercadolivre.com.br/MLB-XXXXXXXXXX
      return cleanLink;
    } catch (error) {
      logger.error(`Erro ao gerar link de afiliado: ${error.message}`);
      return '';
    }
  }

  /**
   * Verificar validade de um cupom/oferta
   */
  async verifyCoupon(coupon) {
    try {
      // Buscar produto pelo ID extraído do código
      const productId = coupon.code.replace('MELI-', '');

      // IMPORTANTE: Sempre tentar enviar token mesmo em endpoints públicos
      let token = this.accessToken;
      if (!token) {
        try {
          const meliAuth = (await import('../autoSync/meliAuth.js')).default;
          if (meliAuth.isConfigured()) {
            token = await meliAuth.getAccessToken();
          }
        } catch (e) {
          // Continuar sem token se não disponível
        }
      }

      const headers = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const product = await axios.get(`${this.baseUrl}/items/${productId}`, {
        headers,
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

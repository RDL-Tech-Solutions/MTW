import axios from 'axios';
import logger from '../../config/logger.js';
import { EXTERNAL_APIS } from '../../config/constants.js';
import AppSettings from '../../models/AppSettings.js';

class MercadoLivreService {
  constructor() {
    // Inicializar com valores do .env (fallback)
    this.clientId = process.env.MELI_CLIENT_ID;
    this.clientSecret = process.env.MELI_CLIENT_SECRET;
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.apiUrl = EXTERNAL_APIS.MERCADOLIVRE;
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getMeliConfig();
      this.clientId = config.clientId || this.clientId;
      this.clientSecret = config.clientSecret || this.clientSecret;
      this.accessToken = config.accessToken || this.accessToken;
      this.settingsLoaded = true;
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações do ML do banco: ${error.message}`);
    }
  }

  // Fazer requisição à API
  // IMPORTANTE: Access token deve ser enviado em TODAS as chamadas (públicas e privadas)
  async makeRequest(endpoint, params = {}) {
    try {
      // Garantir que as configurações foram carregadas
      if (!this.settingsLoaded) {
        await this.loadSettings();
      }

      const url = `${this.apiUrl}${endpoint}`;

      // IMPORTANTE: Sempre tentar obter token se disponível (recomendação de segurança)
      let token = this.accessToken;
      if (!token && this.clientId && this.clientSecret) {
        try {
          const meliAuth = (await import('../autoSync/meliAuth.js')).default;
          if (meliAuth.isConfigured()) {
            token = await meliAuth.getAccessToken();
          }
        } catch (e) {
          logger.debug(`⚠️ Token não disponível para ${endpoint}, continuando sem auth`);
        }
      }

      const headers = {
        'Accept': 'application/json'
      };

      // Adicionar token se disponível (recomendação: sempre enviar)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(url, {
        params,
        headers,
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Tratamento detalhado de erro 403 conforme documentação
      if (status === 403) {
        const errorCode = errorData?.code || errorData?.error;
        const errorMessage = errorData?.message || error.message;

        logger.warn(`⚠️ Erro 403 na API Mercado Livre:`);
        logger.warn(`   Endpoint: ${endpoint}`);
        logger.warn(`   Código: ${errorCode}`);
        logger.warn(`   Mensagem: ${errorMessage}`);

        // Sugestões baseadas na documentação
        if (errorCode === 'FORBIDDEN' || errorMessage?.includes('Invalid scopes')) {
          logger.warn(`   💡 Verifique se os scopes necessários estão configurados no DevCenter`);
        }
        if (errorMessage?.includes('IP')) {
          logger.warn(`   💡 Verifique se o IP está na lista permitida da aplicação`);
        }
        if (errorMessage?.includes('blocked') || errorMessage?.includes('disabled')) {
          logger.warn(`   💡 Verifique se a aplicação não está bloqueada ou desabilitada`);
        }
        if (errorMessage?.includes('user') || errorMessage?.includes('inactive')) {
          logger.warn(`   💡 Verifique se o usuário está ativo e validado`);
        }
      } else if (status === 401) {
        logger.warn(`⚠️ Token expirado/inválido (401): ${error.message}`);
      } else if (status === 404) {
        logger.warn(`⚠️ Recurso não encontrado (404): ${endpoint}`);
      } else {
        logger.error(`Erro na API Mercado Livre: ${error.message}`);
      }
      throw error;
    }
  }

  // Buscar produtos por termo
  async searchProducts(query, limit = 50) {
    try {
      const data = await this.makeRequest('/sites/MLB/search', {
        q: query,
        limit,
        sort: 'price_asc',
        official_store: 'all'
      });

      return data.results || [];
    } catch (error) {
      logger.error(`Erro ao buscar produtos ML: ${error.message}`);
      return [];
    }
  }

  // Buscar produtos com filtros avançados
  async searchProductsAdvanced(query, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sort = 'price_asc',
        minDiscount = 0,
        freeShipping = false,
        category = null
      } = options;

      const params = {
        q: query,
        limit: Math.min(limit, 50),
        offset,
        sort
      };

      // Adicionar filtros opcionais
      if (category) params.category = category;
      if (freeShipping) params.shipping_cost = 'free';
      if (minDiscount > 0) params.discount = `${minDiscount}-100`;

      const data = await this.makeRequest('/sites/MLB/search', params);
      return data.results || [];
    } catch (error) {
      logger.error(`Erro ao buscar produtos ML com filtros: ${error.message}`);
      return [];
    }
  }

  // Buscar detalhes de um produto
  async getProductDetails(itemId) {
    try {
      const data = await this.makeRequest(`/items/${itemId}`);
      return data;
    } catch (error) {
      logger.error(`Erro ao buscar produto ML: ${error.message}`);
      return null;
    }
  }

  // Buscar ofertas do dia
  async getDailyDeals(categoryId = null) {
    try {
      const endpoint = categoryId
        ? `/sites/MLB/search?category=${categoryId}&discount=5-100`
        : '/sites/MLB/search?discount=5-100';

      const data = await this.makeRequest(endpoint, {
        limit: 50,
        sort: 'price_asc'
      });

      return data.results || [];
    } catch (error) {
      logger.error(`Erro ao buscar ofertas ML: ${error.message}`);
      return [];
    }
  }

  // Gerar link de afiliado (se configurado)
  // Nota: o novo formato do programa de afiliados do ML usa links curtos meli.la/XXXXX
  // gerados pelo portal de afiliados. O formato antigo ?matt_word=CODE ainda é suportado.
  async createAffiliateLink(itemId) {
    // Obter affiliate tag do banco primeiro, depois .env como fallback
    let affiliateTag = '';
    try {
      const config = await AppSettings.getMeliConfig();
      affiliateTag = config.affiliateTag || '';
    } catch (error) {
      logger.warn(`⚠️ Erro ao buscar affiliate tag do banco: ${error.message}`);
      affiliateTag = process.env.MELI_AFFILIATE_TAG || '';
    }
    const baseUrl = `https://produto.mercadolivre.com.br/MLB-${itemId}`;

    return affiliateTag
      ? `${baseUrl}?${affiliateTag}`
      : baseUrl;
  }

  // Sincronizar produtos (para cron job)
  async syncProducts(searchTerms = ['eletrônicos', 'games', 'informática']) {
    try {
      logger.info('Iniciando sincronização Mercado Livre...');

      const allProducts = [];

      for (const term of searchTerms) {
        const results = await this.searchProducts(term, 20);

        for (const item of results) {
          // Apenas produtos com desconto
          if (item.original_price && item.price < item.original_price) {
            const product = {
              name: item.title,
              external_id: item.id,
              platform: 'mercadolivre',
              current_price: item.price,
              old_price: item.original_price,
              image_url: item.thumbnail,
              affiliate_link: await this.createAffiliateLink(item.id)
            };
            allProducts.push(product);
          }
        }
      }

      logger.info(`${allProducts.length} produtos sincronizados do Mercado Livre`);
      return allProducts;
    } catch (error) {
      logger.error(`Erro na sincronização ML: ${error.message}`);
      return [];
    }
  }

  // Buscar cupons (se disponível)
  async getCoupons() {
    try {
      // A API do ML pode não ter endpoint público de cupons
      // Implementar conforme disponibilidade
      logger.info('Buscando cupons ML...');
      return [];
    } catch (error) {
      logger.error(`Erro ao buscar cupons ML: ${error.message}`);
      return [];
    }
  }
}

export default new MercadoLivreService();

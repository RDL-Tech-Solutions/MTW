import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import { EXTERNAL_APIS } from '../../config/constants.js';
import AppSettings from '../../models/AppSettings.js';

class ShopeeService {
  constructor() {
    // Inicializar com valores do .env (fallback)
    this.partnerId = process.env.SHOPEE_PARTNER_ID;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY;
    this.apiUrl = EXTERNAL_APIS.SHOPEE;
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getShopeeConfig();
      this.partnerId = config.partnerId || this.partnerId;
      this.partnerKey = config.partnerKey || this.partnerKey;
      this.settingsLoaded = true;
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações da Shopee do banco: ${error.message}`);
    }
  }

  // Gerar assinatura para autenticação
  async generateSign(path, timestamp) {
    // Garantir que as configurações foram carregadas
    if (!this.settingsLoaded) {
      await this.loadSettings();
    }
    
    const baseString = `${this.partnerId}${path}${timestamp}`;
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }

  // Fazer requisição autenticada
  async makeRequest(endpoint, params = {}) {
    try {
      // Carregar configurações se ainda não foram carregadas
      if (!this.settingsLoaded) {
        await this.loadSettings();
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const path = `/api/v2${endpoint}`;
      const sign = await this.generateSign(path, timestamp);

      const url = `${this.apiUrl}${path}`;
      
      const response = await axios.get(url, {
        params: {
          partner_id: this.partnerId,
          timestamp,
          sign,
          ...params
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Erro na API Shopee: ${error.message}`);
      throw error;
    }
  }

  // Buscar ofertas em destaque
  async getOffers(categoryId = null, limit = 50) {
    try {
      const params = { limit };
      if (categoryId) params.category_id = categoryId;

      const data = await this.makeRequest('/product/get_item_list', params);
      return data;
    } catch (error) {
      logger.error(`Erro ao buscar ofertas Shopee: ${error.message}`);
      return null;
    }
  }

  // Buscar detalhes de um produto
  async getProductDetails(itemId) {
    try {
      const data = await this.makeRequest('/product/get_item_detail', {
        item_id_list: itemId
      });
      return data;
    } catch (error) {
      logger.error(`Erro ao buscar produto Shopee: ${error.message}`);
      return null;
    }
  }

  // Gerar link de afiliado
  async createAffiliateLink(productUrl) {
    try {
      const data = await this.makeRequest('/affiliate_link/create', {
        url: productUrl
      });
      return data?.affiliate_link || productUrl;
    } catch (error) {
      logger.error(`Erro ao criar link afiliado Shopee: ${error.message}`);
      return productUrl;
    }
  }

  // Buscar cupons disponíveis
  async getVouchers() {
    try {
      const data = await this.makeRequest('/voucher/get_voucher_list');
      return data?.voucher_list || [];
    } catch (error) {
      logger.error(`Erro ao buscar cupons Shopee: ${error.message}`);
      return [];
    }
  }

  // Sincronizar produtos (para cron job)
  async syncProducts(categoryId = null) {
    try {
      logger.info('Iniciando sincronização Shopee...');
      
      const offers = await this.getOffers(categoryId);
      if (!offers || !offers.item_list) {
        logger.warn('Nenhuma oferta encontrada na Shopee');
        return [];
      }

      const products = [];
      
      for (const item of offers.item_list) {
        const details = await this.getProductDetails(item.item_id);
        if (details && details.item) {
          const product = {
            name: details.item.name,
            external_id: details.item.item_id.toString(),
            platform: 'shopee',
            current_price: details.item.price,
            old_price: details.item.price_before_discount || null,
            image_url: details.item.images?.[0] || '',
            affiliate_link: await this.createAffiliateLink(details.item.url)
          };
          products.push(product);
        }
      }

      logger.info(`${products.length} produtos sincronizados da Shopee`);
      return products;
    } catch (error) {
      logger.error(`Erro na sincronização Shopee: ${error.message}`);
      return [];
    }
  }
}

export default new ShopeeService();

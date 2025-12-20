import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import AppSettings from '../../models/AppSettings.js';

/**
 * Shopee Affiliate API Service (GraphQL)
 * Documentação: https://www.affiliateshopee.com.br/documentacao
 * Endpoint: https://open-api.affiliate.shopee.com.br/graphql
 */
class ShopeeService {
  constructor() {
    // Inicializar com valores do .env (fallback)
    this.appId = process.env.SHOPEE_PARTNER_ID || process.env.SHOPEE_APP_ID;
    this.secret = process.env.SHOPEE_PARTNER_KEY || process.env.SHOPEE_SECRET;
    this.apiUrl = 'https://open-api.affiliate.shopee.com.br/graphql';
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   * SEMPRE prioriza o banco de dados sobre .env
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getShopeeConfig();
      
      // SEMPRE usar valores do banco se existirem, senão usar .env como fallback
      const appIdFromDb = config.partnerId; // AppID = Partner ID
      const secretFromDb = config.partnerKey; // Secret = Partner Key
      
      // Log detalhado dos valores recebidos
      logger.info(`📦 Carregando configurações Shopee Affiliate API:`);
      logger.info(`   - AppID do banco: ${appIdFromDb ? `${appIdFromDb.substring(0, 4)}... (${appIdFromDb.length} caracteres)` : 'não encontrado'}`);
      logger.info(`   - Secret do banco: ${secretFromDb ? `✅ configurado (${secretFromDb.length} caracteres)` : 'não encontrado'}`);
      logger.info(`   - AppID do .env: ${process.env.SHOPEE_PARTNER_ID ? `${process.env.SHOPEE_PARTNER_ID.substring(0, 4)}...` : 'não configurado'}`);
      
      const oldAppId = this.appId;
      const hadAppId = !!this.appId;
      const hadSecret = !!this.secret;
      
      // Priorizar banco de dados
      if (appIdFromDb) {
        this.appId = appIdFromDb;
      } else if (!this.appId) {
        this.appId = process.env.SHOPEE_PARTNER_ID || process.env.SHOPEE_APP_ID;
      }
      
      if (secretFromDb) {
        this.secret = secretFromDb;
      } else if (!this.secret) {
        this.secret = process.env.SHOPEE_PARTNER_KEY || process.env.SHOPEE_SECRET;
      }
      
      this.settingsLoaded = true;
      
      // Log detalhado sobre origem das configurações
      if (appIdFromDb) {
        if (!hadAppId || oldAppId !== this.appId) {
          logger.info(`📦 Shopee AppID carregado do BANCO DE DADOS: ${this.appId.substring(0, 4)}...`);
        }
      } else if (this.appId && !hadAppId) {
        logger.warn(`⚠️ Shopee AppID não encontrado no banco, usando .env: ${this.appId.substring(0, 4)}...`);
      }
      
      if (secretFromDb) {
        if (!hadSecret) {
          logger.info(`📦 Shopee Secret carregado do BANCO DE DADOS: ✅`);
        }
      } else if (this.secret && !hadSecret) {
        logger.warn(`⚠️ Shopee Secret não encontrado no banco, usando .env`);
      }
      
      // Log de erro se não encontrou em nenhum lugar
      if (!this.appId) {
        logger.error(`❌ Shopee AppID não configurado (nem no banco nem no .env)`);
      }
      if (!this.secret) {
        logger.error(`❌ Shopee Secret não configurado (nem no banco nem no .env)`);
      }
    } catch (error) {
      logger.error(`❌ Erro ao carregar configurações da Shopee do banco: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      // Manter valores do .env como fallback
      if (!this.appId) this.appId = process.env.SHOPEE_PARTNER_ID || process.env.SHOPEE_APP_ID;
      if (!this.secret) this.secret = process.env.SHOPEE_PARTNER_KEY || process.env.SHOPEE_SECRET;
    }
  }

  /**
   * Gerar assinatura para autenticação GraphQL
   * Formato: SHA256(AppId + Timestamp + Payload + Secret)
   */
  generateSignature(timestamp, payload) {
    // Garantir que as configurações foram carregadas
    if (!this.settingsLoaded) {
      logger.warn('⚠️ Configurações não carregadas, tentando carregar...');
      // Não usar await aqui para não bloquear
    }
    
    // Payload é o corpo da requisição em JSON (string)
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Base string: AppId + Timestamp + Payload + Secret
    const baseString = `${this.appId}${timestamp}${payloadString}${this.secret}`;
    
    logger.debug(`🔐 Gerando assinatura Shopee GraphQL:`);
    logger.debug(`   - AppID: ${this.appId ? `${this.appId.substring(0, 4)}...` : 'NÃO CONFIGURADO'}`);
    logger.debug(`   - Timestamp: ${timestamp}`);
    logger.debug(`   - Payload length: ${payloadString.length} caracteres`);
    logger.debug(`   - Base String: ${this.appId ? `${this.appId.substring(0, 4)}...${timestamp}[payload]${this.secret.substring(0, 4)}...` : 'N/A'}`);
    
    const signature = crypto
      .createHash('sha256')
      .update(baseString)
      .digest('hex');
    
    logger.debug(`   - Signature gerada: ${signature.substring(0, 16)}...`);
    
    return signature;
  }

  /**
   * Fazer requisição GraphQL autenticada
   */
  async makeGraphQLRequest(query, variables = {}, operationName = null) {
    try {
      // SEMPRE recarregar configurações do banco antes de cada requisição
      await this.loadSettings();

      // Verificar se temos AppID e Secret antes de fazer a requisição
      if (!this.appId) {
        throw new Error('Shopee AppID não configurado. Verifique as configurações no banco de dados (app_settings.shopee_partner_id).');
      }
      if (!this.secret) {
        throw new Error('Shopee Secret não configurado. Verifique as configurações no banco de dados (app_settings.shopee_partner_key).');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      
      // Construir payload GraphQL
      const payload = {
        query,
        ...(variables && Object.keys(variables).length > 0 && { variables }),
        ...(operationName && { operationName })
      };
      
      const payloadString = JSON.stringify(payload);
      
      // Log detalhado do payload antes de enviar
      logger.debug(`📤 Payload GraphQL completo:`);
      logger.debug(`   Query: ${query.substring(0, 200)}...`);
      logger.debug(`   Variables: ${JSON.stringify(variables, null, 2)}`);
      logger.debug(`   Payload string: ${payloadString.substring(0, 500)}...`);
      
      // Gerar assinatura
      const signature = this.generateSignature(timestamp, payloadString);
      
      // Construir header de autorização
      // Formato: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}
      const authorization = `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`;
      
      logger.info(`🔗 Fazendo requisição GraphQL Shopee:`);
      logger.info(`   - Endpoint: ${this.apiUrl}`);
      logger.info(`   - Operation: ${operationName || 'query'}`);
      logger.info(`   - AppID: ${this.appId.substring(0, 4)}...`);
      
      const response = await axios.post(
        this.apiUrl,
        payload,
        {
          headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json'
          },
          timeout: 30000,
          validateStatus: (status) => status < 500 // Não lançar erro para 4xx, apenas logar
        }
      );

      // Log da resposta para debug
      if (response.status !== 200) {
        logger.warn(`⚠️ API Shopee retornou status ${response.status}`);
        if (response.data) {
          logger.warn(`   Resposta: ${JSON.stringify(response.data).substring(0, 300)}`);
        }
      }

      // Verificar erros GraphQL
      if (response.data && response.data.errors) {
        const errors = response.data.errors;
        logger.error(`❌ Erros GraphQL:`);
        errors.forEach((error, index) => {
          logger.error(`   Erro ${index + 1}: ${error.message || 'Erro desconhecido'}`);
          if (error.extensions) {
            logger.error(`   Código: ${error.extensions.code || 'N/A'}`);
            if (error.extensions.message) {
              logger.error(`   Detalhes: ${error.extensions.message}`);
            }
          }
        });
        
        // Verificar se é erro de autenticação
        const authError = errors.find(e => 
          e.extensions?.code === 10020 || 
          e.message?.toLowerCase().includes('signature') ||
          e.message?.toLowerCase().includes('authentication')
        );
        
        if (authError) {
          throw new Error(`Erro de autenticação: ${authError.message || 'Assinatura inválida'}`);
        }
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data || {};
        
        logger.error(`❌ Erro na API Shopee GraphQL (${status}): ${error.response.statusText}`);
        logger.error(`   Resposta: ${JSON.stringify(data).substring(0, 500)}`);
        
        // Tratamento específico para erros de autenticação
        if (status === 401 || status === 403) {
          logger.error(`❌ CRÍTICO: Erro de autenticação!`);
          logger.error(`   AppID usado: ${this.appId ? `${this.appId.substring(0, 4)}...` : 'N/A'}`);
          logger.error(`   Verifique se o AppID e Secret estão corretos no banco de dados`);
          logger.error(`   Verifique se o AppID está ativado na plataforma Shopee`);
        }
      } else {
        logger.error(`❌ Erro na API Shopee GraphQL: ${error.message}`);
      }
      throw error;
    }
  }

  // ============================================
  // QUERIES - OFERTAS E PRODUTOS
  // ============================================

  /**
   * Buscar ofertas da Shopee (shopeeOfferV2)
   * Query principal para listar ofertas disponíveis (coleções/categorias)
   * Documentação: https://affiliate.shopee.com.br/open_api/document?type=overview
   * 
   * sortType:
   * - LATEST_DESC = 1 (Sort offers by latest update time)
   * - HIGHEST_COMMISSION_DESC = 2 (Sort offers by commission rate from high to low)
   */
  async getShopeeOffers(options = {}) {
    const {
      keyword = null,
      sortType = 1, // LATEST_DESC = 1, HIGHEST_COMMISSION_DESC = 2
      page = 1,
      limit = 50
    } = options;

    const query = `
      query ShopeeOfferV2($keyword: String, $sortType: Int!, $page: Int!, $limit: Int!) {
        shopeeOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) {
          nodes {
            commissionRate
            imageUrl
            offerLink
            originalLink
            offerName
            offerType
            categoryId
            collectionId
            periodStartTime
            periodEndTime
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }
    `;
    
    logger.debug(`📝 Query shopeeOfferV2: keyword="${keyword}", sortType=${sortType}, page=${page}, limit=${limit}`);

    try {
      // Construir variáveis - sortType, page e limit são obrigatórios
      const variables = {
        sortType: sortType !== null && sortType !== undefined ? sortType : 1,
        page: page !== null && page !== undefined ? page : 1,
        limit: limit !== null && limit !== undefined ? limit : 50
      };
      
      // keyword é opcional
      if (keyword !== null && keyword !== undefined && keyword.trim()) {
        variables.keyword = keyword.trim();
      }
      
      logger.debug(`📝 Variáveis enviadas para shopeeOfferV2: ${JSON.stringify(variables, null, 2)}`);
      
      const response = await this.makeGraphQLRequest(query, variables, 'ShopeeOfferV2');

      if (response.errors) {
        logger.error(`Erro ao buscar ofertas Shopee: ${response.errors[0].message}`);
        return { nodes: [], pageInfo: null };
      }

      return response.data?.shopeeOfferV2 || { nodes: [], pageInfo: null };
    } catch (error) {
      logger.error(`Erro ao buscar ofertas Shopee: ${error.message}`);
      return { nodes: [], pageInfo: null };
    }
  }

  /**
   * Buscar ofertas de lojas (shopOfferV2)
   * Documentação: https://affiliate.shopee.com.br/open_api/document?type=overview
   * 
   * sortType:
   * - SHOP_LIST_SORT_TYPE_LATEST_DESC = 1 (Sort by last update time)
   * - SHOP_LIST_SORT_TYPE_HIGHEST_COMMISSION_DESC = 2 (Sort by commission rate from high to low)
   * - SHOP_LIST_SORT_TYPE_POPULAR_SHOP_DESC = 3 (Sort by Popular shop from high to low)
   */
  async getShopOffers(options = {}) {
    const {
      shopId = null,
      keyword = null,
      shopType = null, // [Int] - OFFICIAL_SHOP = 1, PREFERRED_SHOP = 2, PREFERRED_PLUS_SHOP = 4
      isKeySeller = null, // Bool
      sortType = 1, // SHOP_LIST_SORT_TYPE_LATEST_DESC = 1
      sellerCommCoveRatio = null, // String - e.g. "0.123"
      page = 1,
      limit = 50
    } = options;

    const query = `
      query ShopOfferV2(
        $shopId: Int64,
        $keyword: String,
        $shopType: [Int!],
        $isKeySeller: Boolean,
        $sortType: Int!,
        $sellerCommCoveRatio: String,
        $page: Int!,
        $limit: Int!
      ) {
        shopOfferV2(
          shopId: $shopId
          keyword: $keyword
          shopType: $shopType
          isKeySeller: $isKeySeller
          sortType: $sortType
          sellerCommCoveRatio: $sellerCommCoveRatio
          page: $page
          limit: $limit
        ) {
          nodes {
            commissionRate
            imageUrl
            offerLink
            originalLink
            shopId
            shopName
            ratingStar
            shopType
            remainingBudget
            periodStartTime
            periodEndTime
            sellerCommCoveRatio
            bannerInfo {
              count
              banners {
                fileName
                imageUrl
                imageSize
                imageWidth
                imageHeight
              }
            }
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }
    `;

    try {
      // Construir variáveis apenas com valores não-nulos
      const variables = {
        sortType: sortType !== null && sortType !== undefined ? sortType : 1,
        page: page !== null && page !== undefined ? page : 1,
        limit: limit !== null && limit !== undefined ? limit : 50
      };
      
      if (shopId !== null && shopId !== undefined) variables.shopId = shopId;
      if (keyword !== null && keyword !== undefined && keyword.trim()) variables.keyword = keyword.trim();
      if (shopType !== null && shopType !== undefined) variables.shopType = Array.isArray(shopType) ? shopType : [shopType];
      if (isKeySeller !== null && isKeySeller !== undefined) variables.isKeySeller = isKeySeller;
      if (sellerCommCoveRatio !== null && sellerCommCoveRatio !== undefined && sellerCommCoveRatio.trim()) {
        variables.sellerCommCoveRatio = sellerCommCoveRatio.trim();
      }
      
      logger.debug(`📝 Variáveis enviadas para shopOfferV2: ${JSON.stringify(variables, null, 2)}`);
      
      const response = await this.makeGraphQLRequest(query, variables, 'ShopOfferV2');

      if (response.errors) {
        logger.error(`Erro ao buscar ofertas de lojas: ${response.errors[0].message}`);
        return { nodes: [], pageInfo: null };
      }

      return response.data?.shopOfferV2 || { nodes: [], pageInfo: null };
    } catch (error) {
      logger.error(`Erro ao buscar ofertas de lojas: ${error.message}`);
      return { nodes: [], pageInfo: null };
    }
  }

  /**
   * Buscar ofertas de produtos (productOfferV2)
   * Query: productOfferV2
   * Documentação: https://affiliate.shopee.com.br/open_api/document?type=overview
   */
  async getProductOffers(options = {}) {
    const {
      shopId = null,
      itemId = null,
      productCatId = null,
      listType = null,
      matchId = null,
      keyword = null,
      sortType = 2, // ITEM_SOLD_DESC = 2 (padrão: mais vendidos)
      page = 1,
      limit = 50,
      isAMSOffer = null,
      isKeySeller = null
    } = options;

    const query = `
      query ProductOfferV2(
        $shopId: Int64,
        $itemId: Int64,
        $productCatId: Int,
        $listType: Int,
        $matchId: Int64,
        $keyword: String,
        $sortType: Int!,
        $page: Int!,
        $limit: Int!,
        $isAMSOffer: Boolean,
        $isKeySeller: Boolean
      ) {
        productOfferV2(
          shopId: $shopId
          itemId: $itemId
          productCatId: $productCatId
          listType: $listType
          matchId: $matchId
          keyword: $keyword
          sortType: $sortType
          page: $page
          limit: $limit
          isAMSOffer: $isAMSOffer
          isKeySeller: $isKeySeller
        ) {
          nodes {
            itemId
            commissionRate
            sellerCommissionRate
            shopeeCommissionRate
            commission
            priceMax
            priceMin
            sales
            productCatIds
            ratingStar
            priceDiscountRate
            imageUrl
            productName
            shopId
            shopName
            shopType
            productLink
            offerLink
            periodStartTime
            periodEndTime
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }
    `;

    try {
      // Construir variáveis apenas com valores não-nulos
      // IMPORTANTE: listType e matchId só podem ser usados juntos, não com outros parâmetros
      // Conforme documentação: "listType can only be used as a query parameter with matchId, 
      // can not be used as a query parameter with the rest of the input"
      const variables = {};
      
      // Se listType está definido, só pode usar com matchId
      if (listType !== null && listType !== undefined) {
        variables.listType = listType;
        if (matchId !== null && matchId !== undefined) {
          variables.matchId = matchId;
        }
        // Não enviar outros parâmetros quando usar listType
      } else {
        // Caso contrário, pode usar os outros parâmetros
        if (shopId !== null && shopId !== undefined) variables.shopId = shopId;
        if (itemId !== null && itemId !== undefined) variables.itemId = itemId;
        if (productCatId !== null && productCatId !== undefined) variables.productCatId = productCatId;
        if (keyword !== null && keyword !== undefined && keyword.trim()) variables.keyword = keyword.trim();
      }
      
      // sortType, page e limit são sempre enviados
      variables.sortType = sortType !== null && sortType !== undefined ? sortType : 2;
      variables.page = page !== null && page !== undefined ? page : 1;
      variables.limit = limit !== null && limit !== undefined ? limit : 50;
      
      // isAMSOffer e isKeySeller podem ser usados com qualquer combinação
      if (isAMSOffer !== null && isAMSOffer !== undefined) variables.isAMSOffer = isAMSOffer;
      if (isKeySeller !== null && isKeySeller !== undefined) variables.isKeySeller = isKeySeller;
      
      logger.debug(`📝 Variáveis enviadas para productOfferV2: ${JSON.stringify(variables, null, 2)}`);

      const response = await this.makeGraphQLRequest(query, variables, 'ProductOfferV2');

      if (response.errors) {
        logger.error(`Erro ao buscar ofertas de produtos: ${response.errors[0].message}`);
        if (response.errors[0].extensions) {
          logger.error(`   Código: ${response.errors[0].extensions.code || 'N/A'}`);
        }
        return { nodes: [], pageInfo: null };
      }

      return response.data?.productOfferV2 || { nodes: [], pageInfo: null };
    } catch (error) {
      logger.error(`Erro ao buscar ofertas de produtos: ${error.message}`);
      return { nodes: [], pageInfo: null };
    }
  }

  // ============================================
  // MUTATIONS - LINKS E AÇÕES
  // ============================================

  /**
   * Gerar link curto com rastreamento (generateShortLink)
   */
  async generateShortLink(originUrl, subIds = []) {
    const mutation = `
      mutation GenerateShortLink($input: ShortLinkInput!) {
        generateShortLink(input: $input) {
          shortLink
        }
      }
    `;

    try {
      // Filtrar subIds válidos (não vazios, sem espaços, máximo 5)
      const validSubIds = subIds
        .filter(id => id && typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
        .slice(0, 5);

      const response = await this.makeGraphQLRequest(mutation, {
        input: {
          originUrl,
          ...(validSubIds.length > 0 && { subIds: validSubIds })
        }
      }, 'GenerateShortLink');

      if (response.errors) {
        logger.error(`Erro ao gerar link curto: ${response.errors[0].message}`);
        return originUrl; // Retornar URL original em caso de erro
      }

      return response.data?.generateShortLink?.shortLink || originUrl;
    } catch (error) {
      logger.error(`Erro ao gerar link curto: ${error.message}`);
      return originUrl;
    }
  }

  // ============================================
  // QUERIES - RELATÓRIOS
  // ============================================

  /**
   * Buscar relatório de conversão (conversionReport)
   */
  async getConversionReport(options = {}) {
    const {
      startTime = null,
      endTime = null,
      shopId = null,
      orderStatus = null,
      buyerType = null,
      page = 1,
      limit = 50
    } = options;

    const query = `
      query ConversionReport($startTime: Int, $endTime: Int, $shopId: Int64, $orderStatus: Int, $buyerType: Int, $page: Int, $limit: Int) {
        conversionReport(startTime: $startTime, endTime: $endTime, shopId: $shopId, orderStatus: $orderStatus, buyerType: $buyerType, page: $page, limit: $limit) {
          nodes {
            clickTime
            orderTime
            orderId
            shopId
            productId
            productName
            orderStatus
            buyerType
            commission
            estimatedCommission
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    try {
      const response = await this.makeGraphQLRequest(query, {
        startTime,
        endTime,
        shopId,
        orderStatus,
        buyerType,
        page,
        limit
      }, 'ConversionReport');

      if (response.errors) {
        logger.error(`Erro ao buscar relatório de conversão: ${response.errors[0].message}`);
        return { nodes: [], pageInfo: null };
      }

      return response.data?.conversionReport || { nodes: [], pageInfo: null };
    } catch (error) {
      logger.error(`Erro ao buscar relatório de conversão: ${error.message}`);
      return { nodes: [], pageInfo: null };
    }
  }

  /**
   * Buscar relatório validado (validatedReport)
   */
  async getValidatedReport(options = {}) {
    const {
      startTime = null,
      endTime = null,
      scrollId = null
    } = options;

    const query = `
      query ValidatedReport($startTime: Int, $endTime: Int, $scrollId: String) {
        validatedReport(startTime: $startTime, endTime: $endTime, scrollId: $scrollId) {
          nodes {
            orderId
            shopId
            productId
            productName
            orderTime
            validatedTime
            commission
            finalCommission
            status
          }
          scrollId
          hasMore
        }
      }
    `;

    try {
      const response = await this.makeGraphQLRequest(query, {
        startTime,
        endTime,
        scrollId
      }, 'ValidatedReport');

      if (response.errors) {
        logger.error(`Erro ao buscar relatório validado: ${response.errors[0].message}`);
        return { nodes: [], scrollId: null, hasMore: false };
      }

      return response.data?.validatedReport || { nodes: [], scrollId: null, hasMore: false };
    } catch (error) {
      logger.error(`Erro ao buscar relatório validado: ${error.message}`);
      return { nodes: [], scrollId: null, hasMore: false };
    }
  }

  // ============================================
  // MÉTODOS COMPATIBILIDADE (para código existente)
  // ============================================

  /**
   * Buscar ofertas (compatibilidade com código antigo)
   */
  async getOffers(categoryId = null, limit = 50) {
    try {
      const offers = await this.getShopeeOffers({
        keyword: null,
        sortType: 1,
        page: 1,
        limit
      });

      // Converter formato GraphQL para formato antigo esperado
      return {
        item_list: offers.nodes.map(node => ({
          item_id: node.productId || 0,
          name: node.offerName,
          url: node.offerLink || node.originalLink,
          image: node.imageUrl,
          price: 0, // Não disponível diretamente
          commission_rate: parseFloat(node.commissionRate || 0)
        }))
      };
    } catch (error) {
      logger.error(`Erro ao buscar ofertas: ${error.message}`);
      return { item_list: [] };
    }
  }

  /**
   * Buscar produtos por palavra-chave (compatibilidade)
   */
  async searchProducts(keyword, limit = 50, offset = 0) {
    try {
      const page = Math.floor(offset / limit) + 1;
      const offers = await this.getProductOffers({
        keyword,
        page,
        limit
      });

      return offers.nodes.map((node, index) => ({
        item_id: node.productId || index, // productId pode não existir
        name: node.productName || node.offerName || '',
        url: node.offerLink || node.originalLink || '',
        image: node.imageUrl || '',
        price: node.price || 0,
        original_price: node.originalPrice || null,
        discount: node.discount || 0,
        commission_rate: parseFloat(node.commissionRate || 0)
      }));
    } catch (error) {
      logger.error(`Erro ao buscar produtos: ${error.message}`);
      return [];
    }
  }

  /**
   * Gerar link de afiliado (compatibilidade)
   */
  async createAffiliateLink(productUrl) {
    try {
      return await this.generateShortLink(productUrl);
    } catch (error) {
      logger.error(`Erro ao criar link afiliado: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Buscar produtos em promoção (compatibilidade)
   */
  async getPromotionProducts(limit = 50) {
    try {
      const offers = await this.getShopeeOffers({
        sortType: 2, // Maior comissão
        limit
      });

      return offers.nodes.map(node => ({
        item_id: node.productId || 0,
        name: node.offerName,
        url: node.offerLink || node.originalLink,
        image: node.imageUrl,
        commission_rate: parseFloat(node.commissionRate || 0)
      }));
    } catch (error) {
      logger.error(`Erro ao buscar produtos em promoção: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar produtos mais vendidos (compatibilidade)
   */
  async getTopProducts(categoryId = null, limit = 50) {
    try {
      const offers = await this.getProductOffers({
        categoryId,
        sortType: 2, // Maior comissão pode indicar mais vendidos
        limit
      });

      return offers.nodes.map(node => ({
        item_id: node.productId || 0,
        name: node.offerName,
        url: node.offerLink || node.originalLink,
        image: node.imageUrl,
        commission_rate: parseFloat(node.commissionRate || 0)
      }));
    } catch (error) {
      logger.error(`Erro ao buscar produtos mais vendidos: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar detalhes de produto usando productOfferV2
   * Usa itemId e shopId (quando disponível) para buscar o produto específico
   */
  async getProductDetails(itemId, shopId = null) {
    try {
      // Converter itemId para Int64 (número)
      const itemIdNum = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
      
      if (!itemIdNum || isNaN(itemIdNum)) {
        logger.error(`❌ itemId inválido: ${itemId}`);
        return null;
      }

      // Converter shopId se fornecido
      const shopIdNum = shopId ? (typeof shopId === 'string' ? parseInt(shopId, 10) : shopId) : null;

      logger.info(`🔍 Buscando detalhes do produto Shopee itemId: ${itemIdNum}${shopIdNum ? `, shopId: ${shopIdNum}` : ''}`);

      // Tentar primeiro com shopId + itemId (mais preciso)
      let offers = null;
      if (shopIdNum && !isNaN(shopIdNum)) {
        try {
          logger.debug(`   Tentando buscar com shopId + itemId...`);
          offers = await this.getProductOffers({
            shopId: shopIdNum,
            itemId: itemIdNum,
            sortType: 2,
            page: 1,
            limit: 1
          });
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao buscar com shopId + itemId: ${error.message}`);
        }
      }

      // Se não encontrou ou não tinha shopId, tentar apenas com itemId
      if (!offers || !offers.nodes || offers.nodes.length === 0) {
        try {
          logger.debug(`   Tentando buscar apenas com itemId...`);
          offers = await this.getProductOffers({
            itemId: itemIdNum,
            sortType: 2,
            page: 1,
            limit: 1
          });
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao buscar apenas com itemId: ${error.message}`);
        }
      }

      // Se ainda não encontrou, pode ser que o produto não tenha oferta ativa
      // Tentar buscar em TOP_PERFORMING e filtrar por itemId
      if (!offers || !offers.nodes || offers.nodes.length === 0) {
        try {
          logger.debug(`   Tentando buscar em TOP_PERFORMING e filtrar...`);
          const topOffers = await this.getProductOffers({
            listType: 2, // TOP_PERFORMING
            sortType: 2,
            page: 1,
            limit: 50 // Buscar mais para aumentar chance de encontrar
          });
          
          // Filtrar pelo itemId
          if (topOffers.nodes && topOffers.nodes.length > 0) {
            const found = topOffers.nodes.find(node => 
              node.itemId && (String(node.itemId) === String(itemIdNum))
            );
            if (found) {
              offers = { nodes: [found], pageInfo: topOffers.pageInfo };
              logger.info(`   ✅ Produto encontrado em TOP_PERFORMING`);
            }
          }
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao buscar em TOP_PERFORMING: ${error.message}`);
        }
      }

      if (offers && offers.nodes && offers.nodes.length > 0) {
        const node = offers.nodes[0];
        
        // Calcular preço médio se tiver priceMin e priceMax
        let price = 0;
        if (node.priceMin && node.priceMax) {
          price = (parseFloat(node.priceMin) + parseFloat(node.priceMax)) / 2;
        } else if (node.priceMin) {
          price = parseFloat(node.priceMin);
        } else if (node.priceMax) {
          price = parseFloat(node.priceMax);
        }

        // Calcular preço original (usar priceMax como referência)
        const priceBeforeDiscount = node.priceMax ? parseFloat(node.priceMax) : null;

        logger.info(`✅ Produto encontrado: ${node.productName?.substring(0, 50)}`);
        logger.info(`   Preço: R$ ${price.toFixed(2)}`);
        logger.info(`   Preço Original: ${priceBeforeDiscount ? `R$ ${priceBeforeDiscount.toFixed(2)}` : 'N/A'}`);

        return {
          item: {
            item_id: node.itemId ? String(node.itemId) : String(itemIdNum),
            name: node.productName || '',
            description: '', // productOfferV2 não retorna descrição
            url: node.productLink || node.offerLink || '',
            images: node.imageUrl ? [node.imageUrl] : [],
            // Preços em centavos de milhão (multiplicar por 100000 para compatibilidade)
            price: price * 100000,
            price_before_discount: priceBeforeDiscount ? priceBeforeDiscount * 100000 : null,
            commission_rate: parseFloat(node.commissionRate || 0),
            seller_commission_rate: node.sellerCommissionRate ? parseFloat(node.sellerCommissionRate) : null,
            shopee_commission_rate: node.shopeeCommissionRate ? parseFloat(node.shopeeCommissionRate) : null,
            commission: node.commission ? parseFloat(node.commission) : null,
            shop_id: node.shopId ? String(node.shopId) : null,
            shop_name: node.shopName || null,
            sales: node.sales || 0,
            rating_star: node.ratingStar ? parseFloat(node.ratingStar) : null,
            discount_percentage: node.priceDiscountRate || 0,
            // Campos adicionais do productOfferV2
            priceMin: node.priceMin ? parseFloat(node.priceMin) : null,
            priceMax: node.priceMax ? parseFloat(node.priceMax) : null,
            productCatIds: node.productCatIds || [],
            periodStartTime: node.periodStartTime || null,
            periodEndTime: node.periodEndTime || null
          }
        };
      }

      logger.warn(`⚠️ Produto não encontrado na API de afiliados: itemId ${itemIdNum}`);
      logger.warn(`   Isso pode acontecer se:`);
      logger.warn(`   - O produto não tem oferta ativa na API de afiliados`);
      logger.warn(`   - O produto não está disponível para afiliados`);
      logger.warn(`   - O itemId ou shopId estão incorretos`);
      return null;
    } catch (error) {
      logger.error(`❌ Erro ao buscar detalhes do produto: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return null;
    }
  }

  /**
   * Buscar vouchers/cupons (compatibilidade)
   * Nota: A API de afiliados não tem endpoint direto para vouchers
   */
  async getVouchers(limit = 50, offset = 0) {
    logger.warn('⚠️ API de afiliados não suporta busca direta de vouchers');
    return [];
  }
}

export default new ShopeeService();

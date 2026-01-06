import supabase from '../config/database.js';
import logger from '../config/logger.js';
import { supabaseWithRetry } from '../utils/supabaseRetry.js';

class AppSettings {
  /**
   * Obter configurações (sempre retorna o registro único)
   */
  static async get() {
    try {
      // Primeiro, tentar buscar com select('*') - funciona se todas as colunas existirem
      // Usar retry automático para lidar com erros 502 do Cloudflare
      let result = await supabaseWithRetry(
        async () => {
          return await supabase
            .from('app_settings')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .limit(1)
            .maybeSingle();
        },
        { maxRetries: 3, initialDelay: 1000 }
      );

      let { data, error } = result;

      // Se não encontrar dados (data é null) e não houver erro, forçar criação
      if (!data && !error) {
        return await this.create();
      }

      // Se der erro de coluna não encontrada, tentar buscar sem as novas colunas
      if (error && error.code === '42703') {
        logger.warn('⚠️ Colunas de template_mode não existem ainda. Buscando sem essas colunas...');
        logger.warn(`   Erro: ${error.message}`);

        // Buscar todas as colunas exceto template_mode
        // Usar uma query mais específica que não inclua as novas colunas
        // Usar retry automático
        const basicResult = await supabaseWithRetry(
          async () => {
            return await supabase
              .from('app_settings')
              .select(`
                id,
                amazon_marketplace,
                backend_url,
                aliexpress_api_url,
                aliexpress_app_key,
                aliexpress_app_secret,
                aliexpress_tracking_id,
                aliexpress_product_origin,
                telegram_collector_rate_limit_delay,
                telegram_collector_max_retries,
                telegram_collector_reconnect_delay,
                meli_client_id,
                meli_client_secret,
                meli_access_token,
                meli_refresh_token,
                meli_redirect_uri,
                meli_affiliate_code,
                meli_affiliate_tag,
                shopee_partner_id,
                shopee_partner_key,
                amazon_access_key,
                amazon_secret_key,
                amazon_partner_tag,
                expo_access_token,
                backend_api_key,
                openrouter_api_key,
                openrouter_model,
                openrouter_enabled,
                created_at,
                updated_at
              `)
              .eq('id', '00000000-0000-0000-0000-000000000001')
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 3, initialDelay: 1000 }
        );

        const { data: basicData, error: basicError } = basicResult;

        if (basicError) {
          if (basicError.code === 'PGRST116') {
            return await this.create();
          }
          throw basicError;
        }

        if (basicData) {
          // Adicionar valores padrão para template_mode
          data = {
            ...basicData,
            template_mode_promotion: 'custom',
            template_mode_promotion_coupon: 'custom',
            template_mode_coupon: 'custom',
            template_mode_expired_coupon: 'custom'
          };
          logger.info('✅ Retornando configurações com valores padrão para template_mode');
        }
      } else if (error) {
        // Se não existir, criar com valores padrão
        if (error.code === 'PGRST116') {
          return await this.create();
        }
        throw error;
      }

      // Garantir que campos de template_mode existam (com valores padrão se não existirem)
      if (!data.template_mode_promotion) {
        data.template_mode_promotion = 'custom';
      }
      if (!data.template_mode_promotion_coupon) {
        data.template_mode_promotion_coupon = 'custom';
      }
      if (!data.template_mode_coupon) {
        data.template_mode_coupon = 'custom';
      }
      if (!data.template_mode_expired_coupon) {
        data.template_mode_expired_coupon = 'custom';
      }

      return data;
    } catch (error) {
      logger.error(`❌ Erro ao buscar app_settings: ${error.message}`);
      logger.error(`   Código: ${error.code}`);
      logger.error(`   Detalhes: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  /**
   * Criar configuração padrão
   */
  static async create() {
    try {
      // Tentar inserir com todas as colunas (incluindo template_mode se existirem)
      const insertData = {
        id: '00000000-0000-0000-0000-000000000001',
        amazon_marketplace: 'www.amazon.com.br',
        backend_url: 'http://localhost:3000',
        aliexpress_api_url: 'https://api-sg.aliexpress.com/rest',
        telegram_collector_rate_limit_delay: 1.0,
        telegram_collector_max_retries: 3,
        telegram_collector_reconnect_delay: 30
      };

      // Tentar adicionar template_mode se as colunas existirem (não vai dar erro se não existirem)
      try {
        const { data: testData } = await supabase
          .from('app_settings')
          .select('template_mode_promotion')
          .limit(0);

        // Se não deu erro, as colunas existem
        insertData.template_mode_promotion = 'custom';
        insertData.template_mode_promotion_coupon = 'custom';
        insertData.template_mode_coupon = 'custom';
        insertData.template_mode_expired_coupon = 'custom';
      } catch (e) {
        // Colunas não existem, não incluir
        logger.debug('Colunas template_mode não existem, criando sem elas');
      }

      const { data, error } = await supabase
        .from('app_settings')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Garantir valores padrão mesmo após criação
      if (!data.template_mode_promotion) data.template_mode_promotion = 'custom';
      if (!data.template_mode_promotion_coupon) data.template_mode_promotion_coupon = 'custom';
      if (!data.template_mode_coupon) data.template_mode_coupon = 'custom';
      if (!data.template_mode_expired_coupon) data.template_mode_expired_coupon = 'custom';

      return data;
    } catch (error) {
      logger.error(`Erro ao criar app_settings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualizar configurações
   */
  static async update(updates) {
    // Não permitir atualizar o ID
    const { id, ...safeUpdates } = updates;

    // Remover campos undefined (mas manter null se explicitamente enviado)
    const cleanUpdates = {};
    for (const [key, value] of Object.entries(safeUpdates)) {
      if (value !== undefined) {
        // Para campos de template_mode, garantir que seja um dos valores válidos
        if (key.startsWith('template_mode_')) {
          const validModes = ['default', 'custom', 'ai_advanced'];
          if (validModes.includes(value)) {
            cleanUpdates[key] = value;
            logger.info(`✅ Salvando template_mode: ${key} = ${value}`);
          } else {
            logger.warn(`⚠️ Valor inválido para ${key}: "${value}", ignorando...`);
          }
        } else if (value === '' && (key.includes('_token') || key.includes('_secret') || key.includes('_key'))) {
          // Manter string vazia para campos de secrets/tokens (não converter para null)
          cleanUpdates[key] = value;
        } else {
          cleanUpdates[key] = value;
        }
      }
    }

    logger.debug(`📝 Atualizando app_settings com: ${Object.keys(cleanUpdates).join(', ')}`);

    const { data, error } = await supabase
      .from('app_settings')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) {
      logger.error(`❌ Erro ao atualizar app_settings: ${error.message}`);
      throw error;
    }

    // Garantir que campos de template_mode existam após atualização
    if (!data.template_mode_promotion) data.template_mode_promotion = 'custom';
    if (!data.template_mode_promotion_coupon) data.template_mode_promotion_coupon = 'custom';
    if (!data.template_mode_coupon) data.template_mode_coupon = 'custom';
    if (!data.template_mode_expired_coupon) data.template_mode_expired_coupon = 'custom';

    logger.info(`✅ app_settings atualizado com sucesso`);
    return data;
  }

  /**
   * Obter configuração específica com fallback para .env
   */
  static async getSetting(key, defaultValue = null) {
    const settings = await this.get();
    return settings[key] || process.env[key.toUpperCase()] || defaultValue;
  }

  /**
   * Obter configurações do Mercado Livre
   */
  static async getMeliConfig() {
    const settings = await this.get();
    return {
      clientId: settings.meli_client_id || process.env.MELI_CLIENT_ID || process.env.MELI_APP_ID,
      clientSecret: settings.meli_client_secret || process.env.MELI_CLIENT_SECRET || process.env.MELI_SECRET_KEY,
      accessToken: settings.meli_access_token || process.env.MELI_ACCESS_TOKEN,
      refreshToken: settings.meli_refresh_token || process.env.MELI_REFRESH_TOKEN,
      redirectUri: settings.meli_redirect_uri || process.env.MELI_REDIRECT_URI,
      affiliateCode: settings.meli_affiliate_code || process.env.MELI_AFFILIATE_CODE,
      affiliateTag: settings.meli_affiliate_tag || process.env.MELI_AFFILIATE_TAG
    };
  }

  /**
   * Obter configurações da Shopee
   */
  static async getShopeeConfig() {
    const settings = await this.get();
    return {
      partnerId: settings.shopee_partner_id || process.env.SHOPEE_PARTNER_ID,
      partnerKey: settings.shopee_partner_key || process.env.SHOPEE_PARTNER_KEY
    };
  }

  /**
   * Obter configurações da Amazon
   */
  static async getAmazonConfig() {
    const settings = await this.get();
    return {
      accessKey: settings.amazon_access_key || process.env.AMAZON_ACCESS_KEY,
      secretKey: settings.amazon_secret_key || process.env.AMAZON_SECRET_KEY,
      partnerTag: settings.amazon_partner_tag || process.env.AMAZON_PARTNER_TAG,
      marketplace: settings.amazon_marketplace || process.env.AMAZON_MARKETPLACE || 'www.amazon.com.br'
    };
  }

  /**
   * Obter configurações do Expo
   */
  static async getExpoConfig() {
    const settings = await this.get();
    return {
      accessToken: settings.expo_access_token || process.env.EXPO_ACCESS_TOKEN
    };
  }

  /**
   * Atualizar token do Mercado Livre (usado pelo meliAuth)
   */
  static async updateMeliToken(accessToken, refreshToken = null) {
    const updates = {
      meli_access_token: accessToken
    };
    if (refreshToken) {
      updates.meli_refresh_token = refreshToken;
    }
    return await this.update(updates);
  }

  /**
   * Obter configurações do OpenRouter
   */
  static async getOpenRouterConfig() {
    const settings = await this.get();
    return {
      apiKey: settings.openrouter_api_key || process.env.OPENROUTER_API_KEY,
      model: settings.openrouter_model || process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct',
      enabled: settings.openrouter_enabled !== undefined
        ? settings.openrouter_enabled
        : (process.env.OPENROUTER_ENABLED === 'true' || false)
    };
  }

  /**
   * Obter configurações de IA
   */
  static async getAIConfig() {
    const settings = await this.get();
    return {
      auto_publish_confidence_threshold: settings.ai_auto_publish_confidence_threshold || 0.90,
      enable_auto_publish: settings.ai_enable_auto_publish !== false, // Default true
      enable_product_editing: settings.ai_enable_product_editing !== false, // Default true
      enable_duplicate_detection: settings.ai_enable_duplicate_detection !== false, // Default true
      enable_quality_scoring: settings.ai_enable_quality_scoring !== false // Default true
    };
  }

  /**
   * Obter configurações do AliExpress
   */
  static async getAliExpressConfig() {
    const settings = await this.get();
    return {
      apiUrl: settings.aliexpress_api_url || process.env.ALIEXPRESS_API_URL || 'https://api-sg.aliexpress.com/rest',
      appKey: settings.aliexpress_app_key || process.env.ALIEXPRESS_APP_KEY,
      appSecret: settings.aliexpress_app_secret || process.env.ALIEXPRESS_APP_SECRET,
      trackingId: settings.aliexpress_tracking_id || process.env.ALIEXPRESS_TRACKING_ID,
      productOrigin: settings.aliexpress_product_origin || 'both' // brazil, international, both
    };
  }
}

export default AppSettings;


import supabase from '../config/database.js';

class AppSettings {
  /**
   * Obter configurações (sempre retorna o registro único)
   */
  static async get() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      // Se não existir, criar com valores padrão
      if (error.code === 'PGRST116') {
        return await this.create();
      }
      throw error;
    }

    return data;
  }

  /**
   * Criar configuração padrão
   */
  static async create() {
    const { data, error } = await supabase
      .from('app_settings')
      .insert([{
        id: '00000000-0000-0000-0000-000000000001',
        amazon_marketplace: 'www.amazon.com.br',
        backend_url: 'http://localhost:3000',
        aliexpress_api_url: 'https://api-sg.aliexpress.com/rest',
        telegram_collector_rate_limit_delay: 1.0,
        telegram_collector_max_retries: 3,
        telegram_collector_reconnect_delay: 30
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
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
        // Converter strings vazias para null para campos opcionais
        if (value === '' && (key.includes('_token') || key.includes('_secret') || key.includes('_key'))) {
          // Manter string vazia para campos de secrets/tokens (não converter para null)
          cleanUpdates[key] = value;
        } else {
          cleanUpdates[key] = value;
        }
      }
    }

    const { data, error } = await supabase
      .from('app_settings')
      .update({
        ...cleanUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;
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
}

export default AppSettings;


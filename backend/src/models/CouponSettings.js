import supabase from '../config/database.js';

class CouponSettings {
  /**
   * Obter configurações (sempre retorna o registro único)
   */
  static async get() {
    const { data, error } = await supabase
      .from('coupon_settings')
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
      .from('coupon_settings')
      .insert([{
        id: '00000000-0000-0000-0000-000000000001',
        auto_capture_enabled: true,
        capture_interval_minutes: 10,
        shopee_enabled: true,
        meli_enabled: true,
        meli_capture_deals: true,
        meli_capture_campaigns: true,
        amazon_enabled: false,
        aliexpress_enabled: false,
        gatry_enabled: true,
        notify_bots_on_new_coupon: true,
        notify_bots_on_expiration: true
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
    const { data, error } = await supabase
      .from('coupon_settings')
      .update(updates)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Ativar/Desativar captura automática
   */
  static async toggleAutoCapture(enabled) {
    return await this.update({ auto_capture_enabled: enabled });
  }

  /**
   * Atualizar intervalo de captura
   */
  static async updateInterval(minutes) {
    if (minutes < 1) minutes = 1;
    if (minutes > 1440) minutes = 1440; // Max 24 horas
    
    return await this.update({ capture_interval_minutes: minutes });
  }

  /**
   * Atualizar credenciais Shopee
   */
  static async updateShopeeCredentials(partnerId, partnerKey, enabled = true) {
    return await this.update({
      shopee_partner_id: partnerId,
      shopee_partner_key: partnerKey,
      shopee_enabled: enabled
    });
  }

  /**
   * Atualizar configurações Mercado Livre
   */
  static async updateMeliSettings(settings) {
    const updates = {};
    if (settings.enabled !== undefined) updates.meli_enabled = settings.enabled;
    if (settings.capture_deals !== undefined) updates.meli_capture_deals = settings.capture_deals;
    if (settings.capture_campaigns !== undefined) updates.meli_capture_campaigns = settings.capture_campaigns;
    
    return await this.update(updates);
  }

  /**
   * Atualizar credenciais Amazon
   */
  static async updateAmazonCredentials(partnerTag, accessKey, secretKey, enabled = true) {
    return await this.update({
      amazon_partner_tag: partnerTag,
      amazon_access_key: accessKey,
      amazon_secret_key: secretKey,
      amazon_enabled: enabled
    });
  }

  /**
   * Atualizar credenciais AliExpress
   */
  static async updateAliExpressCredentials(appKey, appSecret, trackingId, enabled = true) {
    return await this.update({
      aliexpress_app_key: appKey,
      aliexpress_app_secret: appSecret,
      aliexpress_tracking_id: trackingId,
      aliexpress_enabled: enabled
    });
  }

  /**
   * Atualizar configurações de notificação
   */
  static async updateNotificationSettings(settings) {
    const updates = {};
    if (settings.notify_on_new !== undefined) {
      updates.notify_bots_on_new_coupon = settings.notify_on_new;
    }
    if (settings.notify_on_expiration !== undefined) {
      updates.notify_bots_on_expiration = settings.notify_on_expiration;
    }
    
    return await this.update(updates);
  }

  /**
   * Obter plataformas ativas
   */
  static async getActivePlatforms() {
    const settings = await this.get();
    
    const platforms = [];
    if (settings.shopee_enabled) platforms.push('shopee');
    if (settings.meli_enabled) platforms.push('mercadolivre');
    if (settings.amazon_enabled) platforms.push('amazon');
    if (settings.aliexpress_enabled) platforms.push('aliexpress');
    if (settings.gatry_enabled) platforms.push('gatry');
    
    return platforms;
  }

  /**
   * Verificar se uma plataforma está ativa
   */
  static async isPlatformEnabled(platform) {
    const settings = await this.get();
    
    switch (platform) {
      case 'shopee':
        return settings.shopee_enabled;
      case 'mercadolivre':
        return settings.meli_enabled;
      case 'amazon':
        return settings.amazon_enabled;
      case 'aliexpress':
        return settings.aliexpress_enabled;
      case 'gatry':
        return settings.gatry_enabled;
      default:
        return false;
    }
  }
}

export default CouponSettings;

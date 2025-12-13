import supabase from '../config/database.js';
import logger from '../config/logger.js';

class BotConfig {
  /**
   * Buscar configuração atual dos bots
   */
  static async get() {
    try {
      const { data, error } = await supabase
        .from('bot_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe, retorna valores padrão
      if (!data) {
        return this.getDefaults();
      }

      return data;
    } catch (error) {
      logger.error(`Erro ao buscar configuração de bots: ${error.message}`);
      return this.getDefaults();
    }
  }

  /**
   * Valores padrão das configurações
   */
  static getDefaults() {
    return {
      // Telegram
      telegram_enabled: false,
      telegram_bot_token: '',
      telegram_bot_username: '',
      telegram_parse_mode: 'Markdown',
      telegram_disable_preview: false,
      
      // WhatsApp
      whatsapp_enabled: false,
      whatsapp_api_url: '',
      whatsapp_api_token: '',
      whatsapp_phone_number_id: '',
      whatsapp_business_account_id: '',
      
      // Notificações
      notify_new_products: true,
      notify_new_coupons: true,
      notify_expired_coupons: false,
      notify_price_drops: true,
      min_discount_to_notify: 20,
      
      // Mensagens personalizadas
      message_template_product: '🔥 *Nova Promoção!*\n\n🛍 *{name}*\n\n{old_price}💰 *R$ {price}* {discount}\n\n🏪 Loja: {platform}\n\n[🔗 Ver Oferta]({link})',
      message_template_coupon: '🎟 *Novo Cupom!*\n\n🏪 Loja: {platform}\n💬 Código: `{code}`\n💰 Desconto: {discount}\n⏳ Válido até: {expires}',
      
      // Rate limiting
      rate_limit_per_minute: 20,
      delay_between_messages: 500,
      
      created_at: null,
      updated_at: null
    };
  }

  /**
   * Salvar/atualizar configuração
   */
  static async upsert(configData) {
    try {
      // Verificar se já existe
      const existing = await this.get();
      
      const dataToSave = {
        ...configData,
        updated_at: new Date().toISOString()
      };

      if (existing && existing.id) {
        // Atualizar
        const { data, error } = await supabase
          .from('bot_config')
          .update(dataToSave)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        
        logger.info('✅ Configuração de bots atualizada');
        return data;
      } else {
        // Criar
        dataToSave.created_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('bot_config')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        
        logger.info('✅ Configuração de bots criada');
        return data;
      }
    } catch (error) {
      logger.error(`Erro ao salvar configuração de bots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualizar campo específico
   */
  static async updateField(field, value) {
    try {
      const config = await this.get();
      
      if (!config.id) {
        // Criar configuração com o campo
        return await this.upsert({ [field]: value });
      }

      const { data, error } = await supabase
        .from('bot_config')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Erro ao atualizar campo ${field}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar se Telegram está configurado
   */
  static async isTelegramConfigured() {
    const config = await this.get();
    return config.telegram_enabled && !!config.telegram_bot_token;
  }

  /**
   * Verificar se WhatsApp está configurado
   */
  static async isWhatsAppConfigured() {
    const config = await this.get();
    return config.whatsapp_enabled && 
           !!config.whatsapp_api_url && 
           !!config.whatsapp_api_token;
  }

  /**
   * Buscar token do Telegram (para uso interno)
   */
  static async getTelegramToken() {
    const config = await this.get();
    return config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  }

  /**
   * Buscar configurações do WhatsApp (para uso interno)
   */
  static async getWhatsAppConfig() {
    const config = await this.get();
    return {
      apiUrl: config.whatsapp_api_url || process.env.WHATSAPP_API_URL,
      apiToken: config.whatsapp_api_token || process.env.WHATSAPP_API_TOKEN,
      phoneNumberId: config.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID
    };
  }
}

export default BotConfig;


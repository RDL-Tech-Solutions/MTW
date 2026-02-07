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
      telegram_parse_mode: 'HTML',
      telegram_disable_preview: false,

      // WhatsApp Web (Pessoal)
      whatsapp_web_enabled: false,
      whatsapp_web_pairing_number: '',
      whatsapp_web_admin_numbers: '', // Comma separated

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


}

export default BotConfig;

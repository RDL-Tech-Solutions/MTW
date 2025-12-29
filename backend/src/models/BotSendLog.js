/**
 * Model para logs de envio de bots (controle de duplicação)
 */
import supabase from '../config/database.js';
import logger from '../config/logger.js';

class BotSendLog {
  /**
   * Criar log de envio
   */
  static async create(logData) {
    const {
      channel_id,
      entity_type,
      entity_id
    } = logData;

    try {
      const { data, error } = await supabase
        .from('bot_send_logs')
        .insert([{
          channel_id,
          entity_type,
          entity_id
        }])
        .select()
        .single();

      if (error && error.code !== '23505') { // Ignorar erro de duplicata
        throw error;
      }

      return data;
    } catch (error) {
      logger.warn(`Erro ao criar log de envio: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar se foi enviado recentemente
   */
  static async wasSentRecently(channelId, entityType, entityId, since) {
    try {
      const entityTypeMapped = entityType === 'promotion_new' ? 'product' : 'coupon';

      const { data, error } = await supabase
        .from('bot_send_logs')
        .select('id')
        .eq('channel_id', channelId)
        .eq('entity_type', entityTypeMapped)
        .eq('entity_id', entityId)
        .gte('sent_at', since.toISOString())
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (error) {
      logger.warn(`Erro ao verificar envio recente: ${error.message}`);
      return false;
    }
  }

  /**
   * Limpar logs antigos
   */
  static async cleanup(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { error } = await supabase
        .from('bot_send_logs')
        .delete()
        .lt('sent_at', since.toISOString());

      if (error) throw error;
      logger.info(`✅ Logs de envio antigos limpos (mais de ${days} dias)`);
    } catch (error) {
      logger.error(`Erro ao limpar logs: ${error.message}`);
    }
  }
}

export default BotSendLog;





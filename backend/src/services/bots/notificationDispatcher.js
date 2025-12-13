import BotChannel from '../../models/BotChannel.js';
import NotificationLog from '../../models/NotificationLog.js';
import whatsappService from './whatsappService.js';
import telegramService from './telegramService.js';
import logger from '../../config/logger.js';

class NotificationDispatcher {
  /**
   * Enviar notificação para todos os canais ativos
   * @param {string} eventType - Tipo do evento (promotion_new, coupon_new, coupon_expired)
   * @param {Object} data - Dados do evento
   * @returns {Promise<Object>}
   */
  async dispatch(eventType, data) {
    try {
      logger.info(`📤 Disparando notificação: ${eventType}`);

      // Buscar todos os canais ativos
      const channels = await BotChannel.findActive();

      if (!channels || channels.length === 0) {
        logger.warn('⚠️ Nenhum canal de bot ativo encontrado');
        return { success: false, message: 'Nenhum canal ativo' };
      }

      const results = {
        total: channels.length,
        sent: 0,
        failed: 0,
        details: []
      };

      // Enviar para cada canal
      for (const channel of channels) {
        try {
          const result = await this.sendToChannel(channel, eventType, data);
          
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
          }
          
          results.details.push(result);
        } catch (error) {
          logger.error(`❌ Erro ao enviar para canal ${channel.id}: ${error.message}`);
          results.failed++;
          results.details.push({
            channelId: channel.id,
            platform: channel.platform,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`✅ Notificação enviada: ${results.sent} sucesso, ${results.failed} falhas`);
      return results;
    } catch (error) {
      logger.error(`❌ Erro no dispatcher: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar notificação para um canal específico
   * @param {Object} channel - Canal de bot
   * @param {string} eventType - Tipo do evento
   * @param {Object} data - Dados do evento
   * @returns {Promise<Object>}
   */
  async sendToChannel(channel, eventType, data) {
    const logData = {
      event_type: eventType,
      platform: channel.platform,
      channel_id: channel.id,
      payload: data,
      status: 'pending'
    };

    // Criar log inicial
    const log = await NotificationLog.create(logData);

    try {
      // Formatar mensagem baseado no tipo de evento
      const message = this.formatMessage(channel.platform, eventType, data);

      // Enviar mensagem
      let result;
      if (channel.platform === 'whatsapp') {
        result = await whatsappService.sendMessage(channel.identifier, message);
      } else if (channel.platform === 'telegram') {
        result = await telegramService.sendMessage(channel.identifier, message);
      } else {
        throw new Error(`Plataforma não suportada: ${channel.platform}`);
      }

      // Atualizar log como enviado apenas se foi criado com sucesso
      if (log && log.id) {
        try {
          await NotificationLog.markAsSent(log.id);
        } catch (logError) {
          logger.warn(`Erro ao marcar log como enviado: ${logError.message}`);
        }
      }

      return {
        channelId: channel.id,
        platform: channel.platform,
        success: true,
        logId: log?.id || null,
        result
      };
    } catch (error) {
      // Atualizar log como falho apenas se foi criado com sucesso
      if (log && log.id) {
        try {
          await NotificationLog.markAsFailed(log.id, error.message);
        } catch (logError) {
          logger.error(`Erro ao atualizar log: ${logError.message}`);
        }
      }

      return {
        channelId: channel.id,
        platform: channel.platform,
        success: false,
        logId: log?.id || null,
        error: error.message
      };
    }
  }

  /**
   * Formatar mensagem baseado na plataforma e tipo de evento
   * @param {string} platform - Plataforma (whatsapp ou telegram)
   * @param {string} eventType - Tipo do evento
   * @param {Object} data - Dados do evento
   * @returns {string}
   */
  formatMessage(platform, eventType, data) {
    const service = platform === 'whatsapp' ? whatsappService : telegramService;

    switch (eventType) {
      case 'promotion_new':
        return service.formatPromotionMessage(data);
      
      case 'coupon_new':
        return service.formatCouponMessage(data);
      
      case 'coupon_expired':
        return service.formatExpiredCouponMessage(data);
      
      default:
        throw new Error(`Tipo de evento não suportado: ${eventType}`);
    }
  }

  /**
   * Enviar notificação de nova promoção
   * @param {Object} promotion - Dados da promoção
   * @returns {Promise<Object>}
   */
  async notifyNewPromotion(promotion) {
    return await this.dispatch('promotion_new', promotion);
  }

  /**
   * Enviar notificação de novo cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>}
   */
  async notifyNewCoupon(coupon) {
    return await this.dispatch('coupon_new', coupon);
  }

  /**
   * Enviar notificação de cupom expirado
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>}
   */
  async notifyCouponExpired(coupon) {
    return await this.dispatch('coupon_expired', coupon);
  }

  /**
   * Enviar mensagem para todos os canais Telegram ativos
   * @param {string} message - Mensagem formatada
   * @param {string|Object} eventTypeOrData - Tipo do evento ou dados do evento
   * @returns {Promise<Object>}
   */
  async sendToTelegram(message, eventTypeOrData) {
    try {
      logger.info('📤 Enviando mensagem para canais Telegram');

      // Buscar canais Telegram ativos
      const allChannels = await BotChannel.findActive();
      logger.info(`📋 Total de canais ativos encontrados: ${allChannels?.length || 0}`);
      
      const telegramChannels = allChannels?.filter(ch => ch.platform === 'telegram') || [];
      logger.info(`📋 Canais Telegram encontrados: ${telegramChannels.length}`);

      if (!telegramChannels || telegramChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal Telegram ativo encontrado');
        return { success: false, message: 'Nenhum canal Telegram ativo', total: 0, sent: 0, failed: 0, details: [] };
      }

      const results = {
        total: telegramChannels.length,
        sent: 0,
        failed: 0,
        details: []
      };

      // Determinar eventType
      const eventType = typeof eventTypeOrData === 'string' ? eventTypeOrData : 'custom_message';

      // Enviar para cada canal Telegram
      for (const channel of telegramChannels) {
        let log = null;
        try {
          const logData = {
            event_type: eventType,
            platform: 'telegram',
            channel_id: channel.id,
            payload: typeof eventTypeOrData === 'object' ? eventTypeOrData : { message },
            status: 'pending'
          };

          log = await NotificationLog.create(logData);

          const result = await telegramService.sendMessage(channel.identifier, message);
          
          // Atualizar log apenas se foi criado com sucesso
          if (log && log.id) {
            try {
              await NotificationLog.markAsSent(log.id);
            } catch (logError) {
              logger.warn(`Erro ao marcar log como enviado: ${logError.message}`);
            }
          }

          results.sent++;
          results.details.push({
            channelId: channel.id,
            platform: 'telegram',
            success: true,
            logId: log?.id || null,
            result
          });

          logger.info(`✅ Mensagem enviada para Telegram canal ${channel.id} (chat: ${channel.identifier})`);
        } catch (error) {
          // Capturar detalhes do erro
          const errorDetails = {
            message: error.message,
            chatId: channel.identifier,
            channelId: channel.id
          };

          // Adicionar detalhes da API do Telegram se disponível
          if (error.response) {
            errorDetails.status = error.response.status;
            errorDetails.apiError = error.response.data?.description || error.response.data?.error_code || 'Unknown error';
            errorDetails.apiResponse = error.response.data;
          }

          // Atualizar log como falho se foi criado com sucesso
          if (log && log.id) {
            try {
              await NotificationLog.markAsFailed(log.id, JSON.stringify(errorDetails));
            } catch (logError) {
              logger.error(`Erro ao atualizar log: ${logError.message}`);
            }
          }

          logger.error(`❌ Erro ao enviar para Telegram canal ${channel.id} (chat: ${channel.identifier}): ${JSON.stringify(errorDetails, null, 2)}`);
          results.failed++;
          results.details.push({
            channelId: channel.id,
            platform: 'telegram',
            success: false,
            error: errorDetails.apiError || error.message,
            details: errorDetails
          });
        }
      }

      logger.info(`✅ Telegram: ${results.sent} sucesso, ${results.failed} falhas`);
      
      // Retornar com success baseado em se pelo menos uma mensagem foi enviada
      return {
        ...results,
        success: results.sent > 0
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar para Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensagem para todos os canais WhatsApp ativos
   * @param {string} message - Mensagem formatada
   * @param {string|Object} eventTypeOrData - Tipo do evento ou dados do evento
   * @returns {Promise<Object>}
   */
  async sendToWhatsApp(message, eventTypeOrData) {
    try {
      logger.info('📤 Enviando mensagem para canais WhatsApp');

      // Buscar canais WhatsApp ativos
      const allChannels = await BotChannel.findActive();
      logger.info(`📋 Total de canais ativos encontrados: ${allChannels?.length || 0}`);
      
      const whatsappChannels = allChannels?.filter(ch => ch.platform === 'whatsapp') || [];
      logger.info(`📋 Canais WhatsApp encontrados: ${whatsappChannels.length}`);

      if (!whatsappChannels || whatsappChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal WhatsApp ativo encontrado');
        return { success: false, message: 'Nenhum canal WhatsApp ativo', total: 0, sent: 0, failed: 0, details: [] };
      }

      const results = {
        total: whatsappChannels.length,
        sent: 0,
        failed: 0,
        details: []
      };

      // Determinar eventType
      const eventType = typeof eventTypeOrData === 'string' ? eventTypeOrData : 'custom_message';

      // Enviar para cada canal WhatsApp
      for (const channel of whatsappChannels) {
        let log = null;
        try {
          const logData = {
            event_type: eventType,
            platform: 'whatsapp',
            channel_id: channel.id,
            payload: typeof eventTypeOrData === 'object' ? eventTypeOrData : { message },
            status: 'pending'
          };

          log = await NotificationLog.create(logData);

          const result = await whatsappService.sendMessage(channel.identifier, message);
          
          // Atualizar log apenas se foi criado com sucesso
          if (log && log.id) {
            try {
              await NotificationLog.markAsSent(log.id);
            } catch (logError) {
              logger.warn(`Erro ao marcar log como enviado: ${logError.message}`);
            }
          }

          results.sent++;
          results.details.push({
            channelId: channel.id,
            platform: 'whatsapp',
            success: true,
            logId: log?.id || null,
            result
          });

          logger.info(`✅ Mensagem enviada para WhatsApp canal ${channel.id} (grupo: ${channel.identifier})`);
        } catch (error) {
          // Capturar detalhes do erro
          const errorDetails = {
            message: error.message,
            groupId: channel.identifier,
            channelId: channel.id
          };

          // Adicionar detalhes da API do WhatsApp se disponível
          if (error.response) {
            errorDetails.status = error.response.status;
            errorDetails.apiError = error.response.data?.error?.message || error.response.data?.error || 'Unknown error';
            errorDetails.apiResponse = error.response.data;
          }

          // Atualizar log como falho se foi criado com sucesso
          if (log && log.id) {
            try {
              await NotificationLog.markAsFailed(log.id, JSON.stringify(errorDetails));
            } catch (logError) {
              logger.error(`Erro ao atualizar log: ${logError.message}`);
            }
          }

          logger.error(`❌ Erro ao enviar para WhatsApp canal ${channel.id} (grupo: ${channel.identifier}): ${JSON.stringify(errorDetails, null, 2)}`);
          results.failed++;
          results.details.push({
            channelId: channel.id,
            platform: 'whatsapp',
            success: false,
            error: errorDetails.apiError || error.message,
            details: errorDetails
          });
        }
      }

      logger.info(`✅ WhatsApp: ${results.sent} sucesso, ${results.failed} falhas`);
      
      // Retornar com success baseado em se pelo menos uma mensagem foi enviada
      return {
        ...results,
        success: results.sent > 0
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar para WhatsApp: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensagem de teste para todos os canais ativos
   * @returns {Promise<Object>}
   */
  async sendTestToAllChannels() {
    try {
      const channels = await BotChannel.findActive();

      if (!channels || channels.length === 0) {
        return { success: false, message: 'Nenhum canal ativo encontrado' };
      }

      const results = [];

      for (const channel of channels) {
        try {
          let result;
          if (channel.platform === 'whatsapp') {
            result = await whatsappService.sendTestMessage(channel.identifier);
          } else if (channel.platform === 'telegram') {
            result = await telegramService.sendTestMessage(channel.identifier);
          }

          results.push({
            channelId: channel.id,
            platform: channel.platform,
            name: channel.name,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            channelId: channel.id,
            platform: channel.platform,
            name: channel.name,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        total: channels.length,
        results
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagens de teste: ${error.message}`);
      throw error;
    }
  }
}

export default new NotificationDispatcher();

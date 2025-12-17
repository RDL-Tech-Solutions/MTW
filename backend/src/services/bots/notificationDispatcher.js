import BotChannel from '../../models/BotChannel.js';
import NotificationLog from '../../models/NotificationLog.js';
import whatsappService from './whatsappService.js';
import telegramService from './telegramService.js';
import templateRenderer from './templateRenderer.js';
import logger from '../../config/logger.js';

class NotificationDispatcher {
  /**
   * Obter parse_mode do Telegram da configuração
   * @returns {Promise<string>}
   */
  async getTelegramParseMode() {
    try {
      const BotConfig = (await import('../../models/BotConfig.js')).default;
      const botConfig = await BotConfig.get();
      const configuredMode = botConfig.telegram_parse_mode || 'HTML';
      
      // HTML é mais confiável e suporta tudo (negrito, riscado, itálico, etc)
      // Se estiver configurado como Markdown/MarkdownV2, usar HTML
      if (configuredMode === 'Markdown' || configuredMode === 'MarkdownV2') {
        logger.info('📝 Usando HTML parse_mode para melhor compatibilidade');
        return 'HTML';
      }
      
      return configuredMode;
    } catch (error) {
      logger.warn(`Erro ao buscar parse_mode, usando HTML: ${error.message}`);
      return 'HTML';
    }
  }

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
      const message = await this.formatMessage(channel.platform, eventType, data);

      // Enviar mensagem
      let result;
      if (channel.platform === 'whatsapp') {
        // Converter formatação para WhatsApp
        const convertedMessage = templateRenderer.convertBoldFormatting(message, 'whatsapp');
        result = await whatsappService.sendMessage(channel.identifier, convertedMessage);
      } else if (channel.platform === 'telegram') {
          const parseMode = await this.getTelegramParseMode();
          
          // Converter formatação baseado no parse_mode do Telegram
          const convertedMessage = templateRenderer.convertBoldFormatting(message, 'telegram', parseMode);
        result = await telegramService.sendMessage(channel.identifier, convertedMessage, {
          parse_mode: parseMode
        });
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
  async formatMessage(platform, eventType, data) {
    try {
      // Usar templateRenderer para buscar templates ativos do painel admin
      let templateType;
      let variables;

      switch (eventType) {
        case 'promotion_new':
          templateType = 'new_promotion';
          // Preparar variáveis para template de promoção
          variables = await templateRenderer.preparePromotionVariables(data);
          break;
        
        case 'coupon_new':
          templateType = 'new_coupon';
          // Preparar variáveis para template de cupom
          variables = templateRenderer.prepareCouponVariables(data);
          break;
        
        case 'coupon_expired':
          templateType = 'expired_coupon';
          // Preparar variáveis para template de cupom expirado
          variables = templateRenderer.prepareExpiredCouponVariables(data);
          break;
        
        default:
          throw new Error(`Tipo de evento não suportado: ${eventType}`);
      }

      // Renderizar template usando templates ativos do painel admin
      const message = await templateRenderer.render(templateType, platform, variables);
      
      return message;
    } catch (error) {
      logger.error(`Erro ao formatar mensagem com template: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      
      // Fallback para métodos antigos se template falhar
      logger.warn(`⚠️ Usando formatação de fallback para ${eventType}`);
      const service = platform === 'whatsapp' ? whatsappService : telegramService;

      switch (eventType) {
        case 'promotion_new':
          return await service.formatPromotionMessage(data);
        
        case 'coupon_new':
          return service.formatCouponMessage(data);
        
        case 'coupon_expired':
          return service.formatExpiredCouponMessage(data);
        
        default:
          throw new Error(`Tipo de evento não suportado: ${eventType}`);
      }
    }
  }

  /**
   * Enviar notificação de nova promoção
   * @param {Object} promotion - Dados da promoção
   * @returns {Promise<Object>}
   */
  async notifyNewPromotion(promotion) {
    // Usar publishService para enviar com imagem e suporte a cupom vinculado
    try {
      const publishService = (await import('../autoSync/publishService.js')).default;
      const result = await publishService.publishAll(promotion);
      return {
        success: result.success,
        results: result.results
      };
    } catch (error) {
      logger.error(`Erro ao notificar nova promoção via publishService: ${error.message}`);
      // Fallback para método antigo
      return await this.dispatch('promotion_new', promotion);
    }
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
   * Enviar mensagem com imagem para Telegram
   */
  async sendToTelegramWithImage(message, imagePath, eventType = 'general') {
    try {
      logger.info(`📤 [NotificationDispatcher] Enviando imagem para Telegram`);
      logger.info(`   imagePath: ${imagePath}`);
      logger.info(`   message length: ${message?.length || 0}`);
      logger.info(`   eventType: ${eventType}`);
      
      const channels = await BotChannel.findActive('telegram');
      
      if (!channels || channels.length === 0) {
        logger.warn('⚠️ Nenhum canal Telegram ativo encontrado');
        return { success: false, sent: 0, total: 0 };
      }

      logger.info(`   Canais encontrados: ${channels.length}`);

      let sent = 0;
      const results = [];

      for (const channel of channels) {
        try {
          logger.info(`   Enviando para canal ${channel.id} (chat: ${channel.identifier})`);
          const parseMode = await this.getTelegramParseMode();
          
          // Converter formatação antes de enviar
          const convertedMessage = templateRenderer.convertBoldFormatting(message, 'telegram', parseMode);
          
          const result = await telegramService.sendMessageWithPhoto(
            channel.identifier,
            imagePath,
            convertedMessage,
            { parse_mode: parseMode }
          );
          
          logger.info(`   Resultado do telegramService: ${JSON.stringify({ 
            success: result?.success, 
            photoMessageId: result?.photoMessageId
          })}`);

          // Criar log
          const log = await NotificationLog.create({
            event_type: eventType,
            platform: 'telegram',
            channel_id: channel.id,
            payload: { message, imagePath },
            status: 'sent'
          });

          if (log && log.id) {
            await NotificationLog.markAsSent(log.id);
          }

          sent++;
          results.push({
            channelId: channel.id,
            chatId: channel.identifier,
            success: true,
            logId: log?.id || null
          });

          logger.info(`✅ Mensagem com imagem Telegram enviada para canal ${channel.id} (chat: ${channel.identifier})`);

          // Delay entre envios
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          logger.error(`❌ Erro ao enviar para Telegram canal ${channel.id} (chat: ${channel.identifier}): ${error.message}`);
          
          // Criar log de erro
          const log = await NotificationLog.create({
            event_type: eventType,
            platform: 'telegram',
            channel_id: channel.id,
            payload: { message, imagePath, error: error.message },
            status: 'failed'
          });

          if (log && log.id) {
            await NotificationLog.markAsFailed(log.id, error.message);
          }

          results.push({
            channelId: channel.id,
            chatId: channel.identifier,
            success: false,
            error: error.message,
            logId: log?.id || null
          });
        }
      }

      return {
        success: sent > 0,
        sent,
        total: channels.length,
        results
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem com imagem para Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensagem com imagem para WhatsApp
   */
  async sendToWhatsAppWithImage(message, imagePath, eventType = 'general') {
    try {
      const channels = await BotChannel.findActive('whatsapp');
      
      if (!channels || channels.length === 0) {
        logger.debug('Nenhum canal WhatsApp ativo encontrado');
        return { success: false, sent: 0, total: 0 };
      }

      let sent = 0;
      const results = [];

      for (const channel of channels) {
        try {
          // Para WhatsApp, precisamos fazer upload da imagem primeiro ou usar URL
          // Por enquanto, vamos tentar enviar como URL se for um caminho local
          let imageUrl = imagePath;
          
          // Se for caminho local, precisaríamos fazer upload para um serviço de hospedagem
          // Por enquanto, vamos tentar enviar a mensagem sem imagem se for arquivo local
          if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
            logger.warn(`Imagem local não suportada diretamente no WhatsApp: ${imagePath}`);
            // Fallback: enviar apenas mensagem
            const result = await whatsappService.sendMessage(channel.identifier, message);
            
            const log = await NotificationLog.create({
              event_type: eventType,
              platform: 'whatsapp',
              channel_id: channel.id,
              payload: { message },
              status: 'sent'
            });

            if (log && log.id) {
              await NotificationLog.markAsSent(log.id);
            }

            sent++;
            results.push({
              channelId: channel.id,
              groupId: channel.identifier,
              success: true,
              logId: log?.id || null,
              note: 'Imagem não enviada (arquivo local)'
            });
            continue;
          }

          const result = await whatsappService.sendMessageWithImage(
            channel.identifier,
            imageUrl,
            message
          );

          // Criar log
          const log = await NotificationLog.create({
            event_type: eventType,
            platform: 'whatsapp',
            channel_id: channel.id,
            payload: { message, imageUrl },
            status: 'sent'
          });

          if (log && log.id) {
            await NotificationLog.markAsSent(log.id);
          }

          sent++;
          results.push({
            channelId: channel.id,
            groupId: channel.identifier,
            success: true,
            logId: log?.id || null
          });

          logger.info(`✅ Mensagem com imagem WhatsApp enviada para canal ${channel.id} (grupo: ${channel.identifier})`);

          // Delay entre envios
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          logger.error(`❌ Erro ao enviar para WhatsApp canal ${channel.id} (grupo: ${channel.identifier}): ${error.message}`);
          
          // Criar log de erro
          const log = await NotificationLog.create({
            event_type: eventType,
            platform: 'whatsapp',
            channel_id: channel.id,
            payload: { message, imagePath, error: error.message },
            status: 'failed'
          });

          if (log && log.id) {
            await NotificationLog.markAsFailed(log.id, error.message);
          }

          results.push({
            channelId: channel.id,
            groupId: channel.identifier,
            success: false,
            error: error.message,
            logId: log?.id || null
          });
        }
      }

      return {
        success: sent > 0,
        sent,
        total: channels.length,
        results
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem com imagem para WhatsApp: ${error.message}`);
      throw error;
    }
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

          // Converter formatação baseado no parse_mode do Telegram
          let parseMode = await this.getTelegramParseMode();
          
          // Se a mensagem contém texto riscado (~~texto~~) e parse_mode é 'Markdown' (legado),
          // usar MarkdownV2 que suporta riscado
          if (parseMode === 'Markdown' && /~~[^~]+~~/.test(message)) {
            logger.info('📝 Detectado texto riscado, usando MarkdownV2 em vez de Markdown (legado)');
            parseMode = 'MarkdownV2';
          }
          
          // Converter formatação antes de enviar
          const convertedMessage = templateRenderer.convertBoldFormatting(message, 'telegram', parseMode);
          
          const result = await telegramService.sendMessage(channel.identifier, convertedMessage, {
            parse_mode: parseMode
          });
          
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

  /**
   * Enviar mensagem customizada para todos os canais ativos
   * @param {string} message - Mensagem customizada
   * @returns {Promise<Object>}
   */
  async sendCustomMessageToAllChannels(message) {
    try {
      const channels = await BotChannel.findActive();

      if (!channels || channels.length === 0) {
        return { success: false, message: 'Nenhum canal ativo encontrado', total: 0, sent: 0, failed: 0 };
      }

      const results = {
        total: channels.length,
        sent: 0,
        failed: 0,
        details: []
      };

      for (const channel of channels) {
        try {
          let result;
          if (channel.platform === 'whatsapp') {
            // Converter formatação para WhatsApp
            const convertedMessage = templateRenderer.convertBoldFormatting(message, channel.platform);
            result = await whatsappService.sendMessage(channel.identifier, convertedMessage);
          } else if (channel.platform === 'telegram') {
            let parseMode = await this.getTelegramParseMode();
            
            // Se a mensagem contém texto riscado (~~texto~~) e parse_mode é 'Markdown' (legado),
            // usar MarkdownV2 que suporta riscado
            if (parseMode === 'Markdown' && /~~[^~]+~~/.test(message)) {
              logger.info('📝 Detectado texto riscado, usando MarkdownV2 em vez de Markdown (legado)');
              parseMode = 'MarkdownV2';
            }
            
            // Converter formatação baseado no parse_mode do Telegram
            const convertedMessage = templateRenderer.convertBoldFormatting(message, channel.platform, parseMode);
            result = await telegramService.sendMessage(channel.identifier, convertedMessage, {
              parse_mode: parseMode
            });
          } else {
            throw new Error(`Plataforma não suportada: ${channel.platform}`);
          }

          results.sent++;
          results.details.push({
            channelId: channel.id,
            platform: channel.platform,
            name: channel.name,
            success: true,
            result
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            channelId: channel.id,
            platform: channel.platform,
            name: channel.name,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem customizada: ${error.message}`);
      throw error;
    }
  }
}

export default new NotificationDispatcher();

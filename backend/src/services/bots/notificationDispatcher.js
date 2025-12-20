import BotChannel from '../../models/BotChannel.js';
import NotificationLog from '../../models/NotificationLog.js';
import BotSendLog from '../../models/BotSendLog.js';
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
   * Agora com segmentação inteligente (categoria, horários, duplicação)
   * @param {string} eventType - Tipo do evento (promotion_new, coupon_new, coupon_expired)
   * @param {Object} data - Dados do evento
   * @returns {Promise<Object>}
   */
  async dispatch(eventType, data) {
    try {
      logger.info(`📤 Disparando notificação: ${eventType}`);

      // Buscar todos os canais ativos
      const allChannels = await BotChannel.findActive();

      if (!allChannels || allChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal de bot ativo encontrado');
        return { success: false, message: 'Nenhum canal ativo' };
      }

      // Filtrar canais usando segmentação inteligente
      const channels = await this.filterChannelsBySegmentation(allChannels, eventType, data);

      if (channels.length === 0) {
        logger.info(`⏸️ Nenhum canal passou nos filtros de segmentação`);
        return { success: false, message: 'Nenhum canal passou nos filtros', filtered: allChannels.length };
      }

      logger.info(`📊 Canais filtrados: ${channels.length}/${allChannels.length} passaram na segmentação`);

      const results = {
        total: channels.length,
        sent: 0,
        failed: 0,
        filtered: allChannels.length - channels.length,
        details: []
      };

      // Enviar para cada canal filtrado
      for (const channel of channels) {
        try {
          // Verificar duplicação antes de enviar
          const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, data);
          if (isDuplicate) {
            logger.debug(`⏸️ Pulando canal ${channel.id} - oferta já enviada recentemente`);
            results.details.push({
              channelId: channel.id,
              platform: channel.platform,
              success: false,
              skipped: true,
              reason: 'Duplicado (enviado recentemente)'
            });
            continue;
          }

          const result = await this.sendToChannel(channel, eventType, data);
          
          if (result.success) {
            results.sent++;
            // Registrar envio para controle de duplicação
            await this.logSend(channel.id, eventType, data);
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

      logger.info(`✅ Notificação enviada: ${results.sent} sucesso, ${results.failed} falhas, ${results.filtered} filtrados`);
      return results;
    } catch (error) {
      logger.error(`❌ Erro no dispatcher: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filtrar canais por segmentação inteligente
   * Respeita categoria, horários, score mínimo
   */
  async filterChannelsBySegmentation(channels, eventType, data) {
    const filtered = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    for (const channel of channels) {
      // 1. Filtro de categoria (se produto)
      if (eventType === 'promotion_new' && data.category_id) {
        if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
          if (!channel.category_filter.includes(data.category_id)) {
            logger.debug(`   🚫 Canal ${channel.id} não aceita categoria ${data.category_id}`);
            continue;
          }
        }
      }

      // 2. Filtro de plataforma
      if (data.platform) {
        if (channel.platform_filter && Array.isArray(channel.platform_filter) && channel.platform_filter.length > 0) {
          if (!channel.platform_filter.includes(data.platform)) {
            logger.debug(`   🚫 Canal ${channel.id} não aceita plataforma ${data.platform}`);
            continue;
          }
        }
      }

      // 3. Filtro de horário (schedule)
      if (channel.schedule_start && channel.schedule_end) {
        const startTime = channel.schedule_start;
        const endTime = channel.schedule_end;
        
        let isWithinSchedule = false;
        if (endTime < startTime) {
          // Cruza meia-noite
          isWithinSchedule = currentTime >= startTime || currentTime <= endTime;
        } else {
          isWithinSchedule = currentTime >= startTime && currentTime <= endTime;
        }
        
        if (!isWithinSchedule) {
          logger.debug(`   🚫 Canal ${channel.id} fora do horário (${startTime}-${endTime})`);
          continue;
        }
      }

      // 4. Filtro de score mínimo (se produto)
      if (eventType === 'promotion_new' && data.offer_score !== undefined) {
        const minScore = channel.min_offer_score || 0;
        if (data.offer_score < minScore) {
          logger.debug(`   🚫 Canal ${channel.id} requer score mínimo ${minScore}, produto tem ${data.offer_score}`);
          continue;
        }
      }

      filtered.push(channel);
    }

    return filtered;
  }

  /**
   * Verificar se já foi enviado recentemente (evitar duplicação)
   */
  async checkDuplicateSend(channelId, eventType, data) {
    try {
      const entityId = data.id || data.product_id || data.coupon_id;
      if (!entityId) return false;

      const BotSendLog = (await import('../../models/BotSendLog.js')).default;
      const channel = await BotChannel.findById(channelId);
      
      if (!channel || !channel.avoid_duplicates_hours) {
        return false; // Sem controle de duplicação
      }

      const hoursAgo = channel.avoid_duplicates_hours;
      const since = new Date();
      since.setHours(since.getHours() - hoursAgo);

      const wasSent = await BotSendLog.wasSentRecently(channelId, eventType, entityId, since);
      return wasSent;

    } catch (error) {
      logger.warn(`⚠️ Erro ao verificar duplicação: ${error.message}`);
      return false; // Em caso de erro, permitir envio
    }
  }

  /**
   * Registrar envio para controle de duplicação
   */
  async logSend(channelId, eventType, data) {
    try {
      const entityId = data.id || data.product_id || data.coupon_id;
      if (!entityId) return;

      const BotSendLog = (await import('../../models/BotSendLog.js')).default;
      await BotSendLog.create({
        channel_id: channelId,
        entity_type: eventType === 'promotion_new' ? 'product' : 'coupon',
        entity_id: entityId
      });
    } catch (error) {
      logger.warn(`⚠️ Erro ao registrar envio: ${error.message}`);
      // Não falhar o envio por causa de erro no log
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
      // IMPORTANTE: A mensagem já vem formatada corretamente do templateRenderer
      // Não converter novamente para preservar o template configurado no painel admin
      let result;
      if (channel.platform === 'whatsapp') {
        // Mensagem já está formatada para WhatsApp pelo templateRenderer
        result = await whatsappService.sendMessage(channel.identifier, message);
      } else if (channel.platform === 'telegram') {
        const parseMode = await this.getTelegramParseMode();
        // Mensagem já está formatada para Telegram pelo templateRenderer
        result = await telegramService.sendMessage(channel.identifier, message, {
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
          // IMPORTANTE: Escolher template baseado se tem cupom ou não
          // Se produto tem cupom vinculado, usar template 'promotion_with_coupon'
          // Se não tem cupom, usar template 'new_promotion' (sem cupom)
          if (data.coupon_id) {
            templateType = 'promotion_with_coupon';
            logger.info(`📋 Produto tem cupom vinculado (${data.coupon_id}), usando template 'promotion_with_coupon'`);
          } else {
            templateType = 'new_promotion';
            logger.info(`📋 Produto sem cupom, usando template 'new_promotion'`);
          }
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

      // Preparar contextData para IA ADVANCED (se necessário)
      const contextData = {};
      if (eventType === 'promotion_new') {
        contextData.product = data;
      } else if (eventType === 'coupon_new' || eventType === 'coupon_expired') {
        contextData.coupon = data;
      }

      // Renderizar template usando templates ativos do painel admin ou IA ADVANCED
      const message = await templateRenderer.render(templateType, platform, variables, contextData);
      
      if (!message || message.trim().length === 0) {
        throw new Error(`Template renderizado está vazio para ${templateType} (${platform})`);
      }
      
      logger.debug(`✅ Mensagem renderizada usando template do painel admin (${message.length} chars, ${(message.match(/\n/g) || []).length} quebras de linha)`);
      return message;
    } catch (error) {
      logger.error(`❌ ERRO CRÍTICO ao formatar mensagem com template: ${error.message}`);
      logger.error(`   Tipo: ${eventType}, Plataforma: ${platform}`);
      logger.error(`   Stack: ${error.stack}`);
      
      // NÃO usar fallback - template do painel admin é obrigatório
      throw new Error(`Falha ao renderizar template do painel admin para ${eventType} (${platform}): ${error.message}. Configure um template ativo no painel admin.`);
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
  async sendToTelegramWithImage(message, imagePath, eventType = 'general', data = null) {
    try {
      logger.info(`📤 [NotificationDispatcher] Enviando imagem para Telegram`);
      logger.info(`   imagePath: ${imagePath}`);
      logger.info(`   message length: ${message?.length || 0}`);
      logger.info(`   eventType: ${eventType}`);
      
      const allChannels = await BotChannel.findActive('telegram');
      
      if (!allChannels || allChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal Telegram ativo encontrado');
        return { success: false, sent: 0, total: 0 };
      }

      // Filtrar canais usando segmentação inteligente (se data for fornecido)
      const channels = data 
        ? await this.filterChannelsBySegmentation(allChannels, eventType, { ...data, id: data.product_id || data.coupon_id || data.id })
        : allChannels;

      if (channels.length === 0) {
        logger.info(`⏸️ Nenhum canal Telegram passou nos filtros de segmentação`);
        return { success: false, sent: 0, total: 0, filtered: allChannels.length };
      }

      logger.info(`   Canais encontrados: ${channels.length}/${allChannels.length} (${allChannels.length - channels.length} filtrados)`);

      let sent = 0;
      const results = [];

      for (const channel of channels) {
        // Verificar duplicação antes de enviar
        const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, { ...data, id: data.product_id || data.coupon_id });
        if (isDuplicate) {
          logger.debug(`   ⏸️ Pulando canal ${channel.id} - oferta já enviada recentemente`);
          results.push({
            channelId: channel.id,
            chatId: channel.identifier,
            success: false,
            skipped: true,
            reason: 'Duplicado (enviado recentemente)'
          });
          continue;
        }
        try {
          logger.info(`   Enviando para canal ${channel.id} (chat: ${channel.identifier})`);
          const parseMode = await this.getTelegramParseMode();
          
          // A mensagem já vem formatada corretamente do templateRenderer
          // Não converter novamente para manter a formatação do template configurado
          // Apenas garantir que o parse_mode seja passado corretamente
          logger.debug(`📝 Usando mensagem do template (${message.length} caracteres) com parse_mode: ${parseMode}`);
          
          const result = await telegramService.sendMessageWithPhoto(
            channel.identifier,
            imagePath,
            message, // Usar mensagem original do template
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

          // Registrar envio para controle de duplicação (se data for fornecido)
          if (data) {
            await this.logSend(channel.id, eventType, { ...data, id: data.product_id || data.coupon_id || data.id });
          }

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

          // Obter parse_mode configurado
          let parseMode = await this.getTelegramParseMode();
          
          // IMPORTANTE: A mensagem já vem formatada corretamente do templateRenderer
          // Não converter novamente para preservar o template configurado no painel admin
          // Apenas garantir que o parse_mode seja passado corretamente
          logger.debug(`📝 Usando mensagem do template (${message.length} caracteres) com parse_mode: ${parseMode}`);
          
          const result = await telegramService.sendMessage(channel.identifier, message, {
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
            // Mensagem já está formatada para WhatsApp pelo templateRenderer
            result = await whatsappService.sendMessage(channel.identifier, message);
          } else if (channel.platform === 'telegram') {
            const parseMode = await this.getTelegramParseMode();
            // Mensagem já está formatada para Telegram pelo templateRenderer
            result = await telegramService.sendMessage(channel.identifier, message, {
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

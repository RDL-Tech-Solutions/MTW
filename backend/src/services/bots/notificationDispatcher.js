import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..'); // Ajustar conforme profundidade: services/bots/notificationDispatcher.js -> src/services/bots -> src/services -> src -> root (backend) 
// Caminho correto para src/assets/logos
const LOGOS_DIR = path.join(PROJECT_ROOT, 'src', 'assets', 'logos');

import BotChannel from '../../models/BotChannel.js';
import NotificationLog from '../../models/NotificationLog.js';
import BotSendLog from '../../models/BotSendLog.js';
// import whatsappService from './whatsappService.js'; // REMOVED
import whatsappWebService from '../../services/whatsappWeb/whatsappWebService.js'; // Novo serviço Web
import telegramService from './telegramService.js';
import imageConverterService from './imageConverterService.js';
import templateRenderer from './templateRenderer.js';
import logger from '../../config/logger.js';

class NotificationDispatcher {

  // Nomes de arquivos dos logos locais
  static PLATFORM_LOGOS = {
    shopee: 'shopee.png',
    mercadolivre: 'mercadolivre.png',
    amazon: 'amazon.png',
    magazineluiza: 'magazineluiza.png',
    aliexpress: 'aliexpress.png',
    kabum: 'kabum.png',
    pichau: 'pichau.png',
    terabyte: 'terabyte.png',
    general: 'general.png'
  };

  // Cache em memória para evitar race conditions de duplicação (TTL curto)
  static processingCache = new Set();

  /**
   * Obter caminho absoluto do logo da plataforma
   */
  getPlatformLogoPath(platform) {
    const filename = NotificationDispatcher.PLATFORM_LOGOS[platform] || NotificationDispatcher.PLATFORM_LOGOS.general;
    const filePath = path.join(LOGOS_DIR, filename);
    const generalPath = path.join(LOGOS_DIR, 'general.png');

    if (fs.existsSync(filePath)) {
      return filePath;
    }

    // Tentar general se específico falhar
    if (fs.existsSync(generalPath)) {
      return generalPath;
    }

    return null;
  }

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
   * @param {Object} options - Opções extras (bypassDuplicates, etc)
   * @returns {Promise<Object>}
   */
  async dispatch(eventType, data, options = {}) {
    try {
      // Garantir que data é um objeto mutável e plano (POJO)
      if (data && typeof data.toObject === 'function') {
        data = data.toObject();
      } else {
        // Clone raso para não alterar objeto original se for passado por referência
        data = { ...data };
      }

      const dispatchId = Math.random().toString(36).substring(7);
      logger.info(`📤 [${dispatchId}] Disparando notificação: ${eventType} | manual=${options.manual || false}`);

      // --- DEDUPLICAÇÃO EM MEMÓRIA ---
      const entityId = data.id || data.product_id || data.coupon_id;
      const cacheKey = `${eventType}_${entityId}`;

      // FIX: Dedup em memória deve funcionar SEMPRE, mesmo para manual,
      // para evitar cliques duplos/race conditions na mesma fração de segundo.
      if (NotificationDispatcher.processingCache.has(cacheKey)) {
        logger.warn(`✋ [${dispatchId}] Bloqueado por cache em memória (Race Condition evitada): ${cacheKey}`);
        return { success: false, message: 'Duplicidade detectada (Memória)' };
      }

      if (entityId) {
        NotificationDispatcher.processingCache.add(cacheKey);
        // Auto-limpeza após 15 segundos
        setTimeout(() => NotificationDispatcher.processingCache.delete(cacheKey), 15000);
      }
      // -------------------------------

      // INJEÇÃO DE IMAGEM PARA CUPONS (USANDO ARQUIVO LOCAL - DEFINITIVO)
      if (eventType === 'coupon_new') {
        if (!data.image_url) {
          const platform = data.platform ? data.platform.toLowerCase() : 'general';
          const logoPath = this.getPlatformLogoPath(platform);

          if (logoPath) {
            data.image_url = logoPath;
            logger.info(`🖼️ [Dispatcher] Usando LOGO PADRÃO (Local): ${path.basename(logoPath)} para ${platform}`);
          } else {
            logger.warn(`⚠️ [Dispatcher] Falha ao encontrar logo local para ${platform}`);
          }
        } else {
          logger.info(`📸 [Dispatcher] MANTENDO imagem original do cupom: ${typeof data.image_url === 'string' ? data.image_url.substring(0, 80) : 'Buffer'}`);
        }
      }

      // Buscar todos os canais ativos
      const allChannels = await BotChannel.findActive();

      if (!allChannels || allChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal de bot ativo encontrado');
        return { success: false, message: 'Nenhum canal ativo' };
      }

      // Buscar configuração global para respeitar flags master de ativação
      const BotConfig = (await import('../../models/BotConfig.js')).default;
      const botConfig = await BotConfig.get();

      // Filtrar canais de plataformas desabilitadas globalmente e por filtro de opção
      const activeChannels = allChannels.filter(channel => {
        // Platform Filter Check
        if (options.platformFilter) {
          // Se filtrar por 'whatsapp', permitir 'whatsapp' e 'whatsapp_web'
          if (options.platformFilter === 'whatsapp') {
            if (channel.platform !== 'whatsapp' && channel.platform !== 'whatsapp_web') return false;
          } else if (channel.platform !== options.platformFilter) {
            return false;
          }
        }

        if (channel.platform === 'telegram' && botConfig.telegram_enabled === false) {
          logger.debug(`   🚫 Canal Telegram ${channel.id} ignorado (Telegram desabilitado globalmente)`);
          return false;
        }
        if (channel.platform === 'whatsapp' && botConfig.whatsapp_enabled === false) {
          logger.debug(`   🚫 Canal WhatsApp ${channel.id} ignorado (WhatsApp desabilitado globalmente)`);
          return false;
        }
        if (channel.platform === 'whatsapp_web' && botConfig.whatsapp_web_enabled === false) {
          logger.debug(`   🚫 Canal WhatsApp Web ${channel.id} ignorado (WhatsApp Web desabilitado globalmente)`);
          return false;
        }
        return true;
      });

      if (activeChannels.length === 0) {
        logger.warn('⚠️ Todos os canais ativos pertencem a plataformas desabilitadas globalmente');
        return { success: false, message: 'Plataformas desabilitadas' };
      }

      // Filtrar canais usando segmentação inteligente
      console.time('🔍 Time: Filtering Channels');
      const channels = await this.filterChannelsBySegmentation(activeChannels, eventType, data);
      console.timeEnd('🔍 Time: Filtering Channels');

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

      // 1. Processar imagem UMA VEZ para todos os canais (Otimização)
      let sharedLocalImagePath = null;
      let originalImageUrl = data.image_url;

      try {
        if (eventType === 'promotion_new' || eventType === 'coupon_new') {
          const imageUrl = data.image_url;
          const isPublicUrl = imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));

          if (isPublicUrl) {
            const useWebVersionAny = channels.some(c => c.platform === 'whatsapp_web');

            if (useWebVersionAny) {
              console.time('🖼️ Time: Image Download');
              logger.info('🖼️ [Dispatcher] Baixando e convertendo imagem ANTES do loop de envio (Otimização)...');
              try {
                sharedLocalImagePath = await imageConverterService.processImageForWhatsApp(imageUrl);
              } catch (e) {
                logger.error(`❌ Erro no download da imagem: ${e.message}`);
              }
              console.timeEnd('🖼️ Time: Image Download');
            }
          }
        }
      } catch (imgError) {
        logger.error(`❌ [Dispatcher] Falha ao processar imagem otimizada: ${imgError.message}`);
        // Continua, vai tentar baixar individualmente ou falhar no envio
      }

      // 2. Loop de envio (Sequencial para evitar Race Conditions e Duplicações)
      // Revertendo paralelismo temporariamente para estabilidade
      console.time('🚀 Time: Total Dispatch Loop');

      for (const [index, channel] of channels.entries()) {
        console.time(`📦 Time: Channel ${index + 1}/${channels.length} (${channel.name})`);

        try {
          // Validar se imagem local ainda existe
          if (sharedLocalImagePath && !fs.existsSync(sharedLocalImagePath)) {
            logger.warn('⚠️ Imagem otimizada sumiu durante o loop, revertendo para URL original');
            sharedLocalImagePath = null;
          }

          // Verificar duplicação logicamente
          const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, data, options.manual);
          if (isDuplicate) {
            logger.debug(`⏸️ Pulando canal ${channel.id} - oferta já enviada recentemente`);
            results.details.push({
              channelId: channel.id,
              platform: channel.platform,
              success: false,
              skipped: true,
              reason: 'Duplicado'
            });
            console.timeEnd(`📦 Time: Channel ${index + 1}/${channels.length} (${channel.name})`);
            continue;
          }

          // Preparar dados para o canal
          let channelData = { ...data };

          // Injetar caminho local APENAS se formos usar
          if (sharedLocalImagePath) {
            if (channel.platform === 'whatsapp_web' || channel.platform === 'whatsapp') {
              channelData.image_url = sharedLocalImagePath;
              //logger.info(`📸 Usando imagem local compartilhada para ${channel.platform}`);
            }
          }

          const result = await this.sendToChannel(channel, eventType, channelData);

          if (result.success) {
            results.sent++;
            await this.logSend(channel.id, eventType, data);
          } else {
            results.failed++;
          }

          results.details.push(result);

        } catch (err) {
          logger.error(`❌ Erro canal ${channel.id}: ${err.message}`);
          results.failed++;
          results.details.push({ success: false, error: err.message, channelId: channel.id });
        }

        console.timeEnd(`📦 Time: Channel ${index + 1}/${channels.length} (${channel.name})`);
      }
      console.timeEnd('🚀 Time: Total Dispatch Loop');

      // 3. Limpeza da imagem compartilhada
      if (sharedLocalImagePath && fs.existsSync(sharedLocalImagePath)) {
        try {
          // Pequeno delay para garantir que o arquivo não está lockado
          setTimeout(() => {
            try { fs.unlinkSync(sharedLocalImagePath); } catch (e) { }
          }, 5000);
        } catch (e) {
          logger.warn(`⚠️ Erro ao limpar imagem temp: ${e.message}`);
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
   * Respeita categoria, horários, score mínimo, only_coupons
   */
  async filterChannelsBySegmentation(channels, eventType, data) {
    const filtered = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Log resumo dos dados para filtro
    logger.info(`🔍 Filtrando ${channels.length} canais para eventType: ${eventType}`);
    logger.info(`   Dados do item: category_id=${data.category_id || 'NÃO DEFINIDO'}, coupon_id=${data.coupon_id || 'N/A'}, offer_score=${data.offer_score || 'N/A'}, platform=${data.platform || 'N/A'}`);

    for (const channel of channels) {
      // 0. Filtro de content_filter (NOVO - CRÍTICO!)
      // Se o canal tem content_filter configurado, verificar se aceita o tipo de conteúdo
      if (channel.content_filter && typeof channel.content_filter === 'object') {
        const contentFilter = channel.content_filter;

        // Verificar se canal aceita produtos
        if (eventType === 'promotion_new' && contentFilter.products === false) {
          logger.debug(`   🚫 Canal ${channel.id} não aceita produtos (content_filter.products = false)`);
          continue;
        }

        // Verificar se canal aceita cupons
        if ((eventType === 'coupon_new' || eventType === 'coupon_expired') && contentFilter.coupons === false) {
          logger.debug(`   🚫 Canal ${channel.id} não aceita cupons (content_filter.coupons = false)`);
          continue;
        }
      }

      // 0.1. Filtro de only_coupons (LEGADO - manter para compatibilidade)
      // se o canal só aceita cupons, não enviar produtos
      if (channel.only_coupons === true && eventType === 'promotion_new') {
        logger.debug(`   🚫 Canal ${channel.id} só aceita cupons (only_coupons = true), ignorando produto`);
        continue;
      }

      // 0.2. Filtro de no_coupons
      // Se o canal não aceita cupons, não enviar cupons STANDALONE
      // MAS ainda permite produtos com cupons vinculados (promoção + cupom)
      if (channel.no_coupons === true) {
        // Bloquear cupons standalone (notificações apenas de cupom)
        if (eventType === 'coupon_new' || eventType === 'coupon_expired') {
          logger.debug(`   🚫 Canal ${channel.id} não aceita cupons standalone (no_coupons = true), ignorando cupom`);
          continue;
        }
      }


      // 1. Filtro de categoria (produtos E cupons)
      if (data.category_id) {
        if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
          const itemCategoryId = String(data.category_id);
          const allowedCategories = channel.category_filter.map(cat => String(cat));

          if (!allowedCategories.includes(itemCategoryId)) {
            const itemType = eventType === 'promotion_new' ? 'produto' : 'cupom';
            logger.debug(`   🚫 Canal ${channel.id} não aceita categoria ${data.category_id} para ${itemType} (aceita apenas: ${allowedCategories.join(', ')})`);
            continue;
          } else {
            const itemType = eventType === 'promotion_new' ? 'produto' : 'cupom';
            logger.debug(`   ✅ Canal ${channel.id} aceita categoria ${data.category_id} para ${itemType}`);
          }
        } else {
          logger.debug(`   ℹ️ Canal ${channel.id} não tem filtro de categoria, aceitando item com categoria ${data.category_id}`);
        }
      } else {
        if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
          const itemType = eventType === 'promotion_new' ? 'produto' : 'cupom';
          logger.info(`🚫 Canal ${channel.name} (${channel.id}) ignorado: Item (${itemType}) sem categoria definida e canal possui filtro restrito.`);
          continue;
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
          isWithinSchedule = currentTime >= startTime || currentTime <= endTime;
        } else {
          isWithinSchedule = currentTime >= startTime && currentTime <= endTime;
        }

        if (!isWithinSchedule) {
          logger.debug(`   🚫 Canal ${channel.id} fora do horário (${startTime}-${endTime})`);
          continue;
        }
      }

      // 4. Filtro de score mínimo
      if (data.offer_score !== undefined) {
        const minScore = channel.min_offer_score || 0;
        if (data.offer_score < minScore) {
          logger.debug(`   🚫 Canal ${channel.id} requer score mínimo ${minScore}, item tem ${data.offer_score}`);
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
  async checkDuplicateSend(channelId, eventType, data, bypassDuplicates = false) {
    if (bypassDuplicates) {
      logger.info(`✅ Bypass de duplicação ativo (publicação manual) - canal ${channelId}`);
      return false;
    }

    try {
      const entityId = data.id || data.product_id || data.coupon_id;
      if (!entityId) return false;

      // NOVO: Para cupons, verificar também por código
      if (eventType === 'coupon_new' && data.code) {
        const Coupon = (await import('../../models/Coupon.js')).default;
        const hasPublished = await Coupon.hasPublishedCouponWithCode(data.code, entityId);

        if (hasPublished) {
          logger.debug(`   🚫 Cupom com código ${data.code} já foi publicado anteriormente`);
          return true; // Bloquear envio
        }
      }

      // Verificação original por ID e tempo
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

      let result;

      // VERIFICAR SE TEM IMAGEM PARA ENVIAR
      // Meta API SÓ ACEITA LINKS PÚBLICOS (http/https) PARA MÉTODO DIRETO
      // Mas suportamos arquivos locais para LOGOS e fallbacks
      let imageUrl = data.image_url;

      // Normalizar URL protocol-relative (//exemplo.com -> https://exemplo.com)
      if (typeof imageUrl === 'string' && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      const isPublicUrl = imageUrl &&
        typeof imageUrl === 'string' &&
        (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));

      const isLocalFile = imageUrl &&
        typeof imageUrl === 'string' &&
        !isPublicUrl &&
        (imageUrl.includes('/') || imageUrl.includes('\\')) &&
        fs.existsSync(imageUrl);

      const hasValidImage = !!imageUrl && (isPublicUrl || isLocalFile);

      if (!hasValidImage && imageUrl) {
        logger.warn(`⚠️ [Dispatcher] Imagem ignorada por não ser uma URL pública ou arquivo local válido: ${imageUrl}`);
      } else if (hasValidImage) {
        logger.info(`🖼️ [Dispatcher] Usando imagem: ${isLocalFile ? 'Arquivo Local' : imageUrl}`);
      }

      if (channel.platform === 'whatsapp' || channel.platform === 'whatsapp_web') {
        // Enforce Web Version for ALL WhatsApp channels (Since Cloud API is removed)
        const useWebVersion = true;

        try {
          // --- VERSÃO WHATSAPP WEB ---
          if (hasValidImage) {
            let localImagePath = null;
            try {
              // Usar o mesmo conversor da Cloud API para garantir download robusto (User-Agent, headers, etc)
              if (isPublicUrl) {
                localImagePath = await imageConverterService.processImageForWhatsApp(imageUrl);
              } else {
                localImagePath = imageUrl;
              }

              result = await whatsappWebService.sendImage(channel.identifier, localImagePath, message);

            } catch (mediaError) {
              logger.error(`❌ [Dispatcher] Erro no envio de imagem WhatsApp Web: ${mediaError.message}`);
              // Fallback para texto
              result = await whatsappWebService.sendMessage(channel.identifier, message);
            } finally {
              // Limpar arquivo temporário
              if (isPublicUrl && localImagePath && fs.existsSync(localImagePath)) {
                try {
                  fs.unlinkSync(localImagePath);
                } catch (cleanupError) {
                  logger.warn(`⚠️ [Dispatcher] Falha ao remover arquivo temporário: ${cleanupError.message}`);
                }
              }
            }
          } else {
            result = await whatsappWebService.sendMessage(channel.identifier, message);
          }
        } catch (error) {
          logger.error(`❌ [Dispatcher] Erro geral WhatsApp: ${error.message}`);
          throw error;
        }
      } else if (channel.platform === 'telegram') {
        const parseMode = await this.getTelegramParseMode();
        try {
          if (hasValidImage) {
            result = await telegramService.sendPhoto(channel.identifier, imageUrl, message, {
              parse_mode: parseMode
            });
          } else {
            result = await telegramService.sendMessage(channel.identifier, message, {
              parse_mode: parseMode
            });
          }
        } catch (error) {
          logger.warn(`⚠️ [Dispatcher] Falha ao enviar imagem Telegram para ${channel.id}. Tentando fallback para TEXTO... Motivo: ${error.message}`);
          result = await telegramService.sendMessage(channel.identifier, message, {
            parse_mode: parseMode
          });
        }
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
          if (data.coupon_id) {
            templateType = 'promotion_with_coupon';
            logger.info(`📋 Produto tem cupom vinculado (${data.coupon_id}), usando template 'promotion_with_coupon'`);
          } else {
            templateType = 'new_promotion';
            logger.info(`📋 Produto sem cupom, usando template 'new_promotion'`);
          }
          variables = await templateRenderer.preparePromotionVariables(data, platform);
          break;

        case 'coupon_new':
          templateType = 'new_coupon';
          variables = templateRenderer.prepareCouponVariables(data);
          break;

        case 'coupon_expired':
          templateType = 'expired_coupon';
          variables = templateRenderer.prepareExpiredCouponVariables(data);
          break;

        default:
          throw new Error(`Tipo de evento não suportado: ${eventType}`);
      }

      const contextData = {};
      if (eventType === 'promotion_new') {
        contextData.product = data;
      } else if (eventType === 'coupon_new' || eventType === 'coupon_expired') {
        contextData.coupon = data;
      }

      const message = await templateRenderer.render(templateType, platform, variables, contextData);

      if (!message || message.trim().length === 0) {
        throw new Error(`Template renderizado está vazio para ${templateType} (${platform})`);
      }

      logger.debug(`✅ Mensagem renderizada usando template do painel admin (${message.length} chars, ${(message.match(/\n/g) || []).length} quebras de linha)`);
      return message;
    } catch (error) {
      logger.error(`❌ ERRO CRÍTICO ao formatar mensagem com template: ${error.message}`);
      throw new Error(`Falha ao renderizar template do painel admin para ${eventType} (${platform}): ${error.message}. Configure um template ativo no painel admin.`);
    }
  }

  /**
   * Enviar notificação de nova promoção
   */
  async notifyNewPromotion(promotion) {
    try {
      const publishService = (await import('../autoSync/publishService.js')).default;
      const result = await publishService.publishAll(promotion);
      return {
        success: result.success,
        results: result.results
      };
    } catch (error) {
      logger.error(`Erro ao notificar nova promoção via publishService: ${error.message}`);
      return await this.dispatch('promotion_new', promotion);
    }
  }

  async notifyNewCoupon(coupon) {
    return await this.dispatch('coupon_new', coupon);
  }

  async notifyCouponExpired(coupon) {
    return await this.dispatch('coupon_expired', coupon);
  }

  /**
   * Enviar mensagem com imagem para Telegram
   */
  async sendToTelegramWithImage(message, imagePath, eventType = 'general', data = null, options = {}) {
    try {
      // Normalizar URL protocol-relative (//exemplo.com -> https://exemplo.com)
      if (typeof imagePath === 'string' && imagePath.startsWith('//')) {
        imagePath = 'https:' + imagePath;
      }

      const isBuffer = Buffer.isBuffer(imagePath);
      logger.info(`📤 [NotificationDispatcher] Enviando imagem para Telegram`);

      // Verificar flag global
      const BotConfig = (await import('../../models/BotConfig.js')).default;
      const botConfig = await BotConfig.get();

      if (botConfig.telegram_enabled === false) {
        logger.warn('⚠️ Telegram desabilitado globalmente. Abortando envio de imagem.');
        return { success: false, reason: 'Telegram desabilitado globalmente' };
      }

      const allChannels = await BotChannel.findActive('telegram');

      if (!allChannels || allChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal Telegram ativo encontrado');
        return {
          success: false,
          sent: 0,
          total: 0,
          reason: 'Nenhum canal Telegram ativo encontrado.'
        };
      }

      const channels = data
        ? await this.filterChannelsBySegmentation(allChannels, eventType, {
          ...data,
          id: data.product_id || data.coupon_id || data.id,
          category_id: data.category_id || null
        })
        : allChannels;

      if (channels.length === 0) {
        logger.info(`⏸️ Nenhum canal Telegram passou nos filtros de segmentação`);
        return { success: false, sent: 0, total: 0, filtered: allChannels.length, reason: "Filtros de segmentação." };
      }

      let sent = 0;
      const results = [];

      for (const channel of channels) {
        logger.debug(`   🔍 Verificando duplicação para canal ${channel.id}`);
        const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, { ...data, id: data.product_id || data.coupon_id }, options.bypassDuplicates);
        if (isDuplicate) {
          results.push({ channelId: channel.id, success: false, skipped: true, reason: 'Duplicado' });
          continue;
        }
        try {
          const parseMode = await this.getTelegramParseMode();

          // Assinatura correta: sendPhoto(chatId, photo, caption, options)
          const result = await telegramService.sendPhoto(channel.identifier, imagePath, message, {
            parse_mode: parseMode
          });

          if (result && (result.messageId || result.message_id)) {
            sent++;
            await this.logSend(channel.id, eventType, data);
            results.push({ channelId: channel.id, chatId: channel.identifier, success: true, messageId: result.messageId || result.message_id });
          }
        } catch (error) {
          logger.error(`❌ Erro ao enviar imagem Telegram para canal ${channel.id}: ${error.message}`);
          results.push({ channelId: channel.id, success: false, error: error.message });
        }
      }

      return { success: sent > 0, sent, total: channels.length, results };
    } catch (error) {
      logger.error(`❌ Erro geral ao enviar imagem Telegram: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  async sendToWhatsAppWithImage(message, imageUrl, eventType = 'general', data = null, options = {}) {
    let localImagePath = null;
    try {
      // Normalizar URL protocol-relative
      if (typeof imageUrl === 'string' && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      // Definição de hasValidImage (FIX: ReferenceError)
      const isPublicUrl = imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
      const isLocalFile = imageUrl && typeof imageUrl === 'string' && !isPublicUrl && (imageUrl.includes('/') || imageUrl.includes('\\')) && fs.existsSync(imageUrl);
      const hasValidImage = !!imageUrl && (isPublicUrl || isLocalFile);

      // Buscar canais
      const whatsappChannels = await BotChannel.findActive('whatsapp');
      const whatsappWebChannels = await BotChannel.findActive('whatsapp_web');

      const allChannels = [...whatsappChannels, ...whatsappWebChannels];

      if (allChannels.length === 0) {
        logger.warn('⚠️ Nenhum canal WhatsApp ativo encontrado');
        return { success: false, reason: 'Nenhum canal WhatsApp ativo' };
      }

      const channels = data
        ? await this.filterChannelsBySegmentation(allChannels, eventType, { ...data, id: data.product_id || data.coupon_id || data.id })
        : allChannels;

      if (channels.length === 0) return { success: false, sent: 0, total: 0, reason: "Segmentação." };

      let sent = 0;
      let finalReason = null;

      // Enviar para cada canal
      for (const channel of channels) {
        try {
          const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, { ...data, id: data.product_id || data.coupon_id }, options.bypassDuplicates);
          if (isDuplicate) continue;

          if (hasValidImage) {
            await whatsappWebService.sendImage(channel.identifier, imageUrl, message);
          } else {
            await whatsappWebService.sendMessage(channel.identifier, message);
          }

          sent++;
          await this.logSend(channel.id, eventType, data);

        } catch (err) {
          logger.error(`Erro envio whats individual: ${err.message}`);
          finalReason = err.message;
        }
      }

      return { success: sent > 0, sent, total: channels.length, reason: finalReason };
    } catch (error) {
      logger.error(`❌ Erro geral sendToWhatsAppWithImage: ${error.message}`);
      return { success: false, reason: error.message };
    } finally {
      // Nada crítico para limpar se não usamos download manual neste bloco simplificado,
      // mas se usarmos, seria aqui. O Dispatcher principal já cuida da limpeza global se ele baixou.
    }
  }

  async sendToWhatsApp(message, data = {}, options = {}) {
    try {
      const BotConfig = (await import('../../models/BotConfig.js')).default;
      const botConfig = await BotConfig.get();

      const eventType = data.eventType || 'promotion_new';

      // Buscar canais de ambas as plataformas
      const whatsappChannels = botConfig.whatsapp_enabled !== false ? await BotChannel.findActive('whatsapp') : [];
      const whatsappWebChannels = botConfig.whatsapp_web_enabled !== false ? await BotChannel.findActive('whatsapp_web') : [];

      const allChannels = [...whatsappChannels, ...whatsappWebChannels];

      if (allChannels.length === 0) return { success: false, reason: 'Nenhum canal WhatsApp ativo ou habilitado' };

      const channels = await this.filterChannelsBySegmentation(allChannels, eventType, data);
      if (channels.length === 0) return { success: false, sent: 0, total: allChannels.length, reason: "Segmentação." };

      let sent = 0;
      const results = [];

      for (const channel of channels) {
        const isDuplicate = await this.checkDuplicateSend(channel.id, eventType, data, options.bypassDuplicates);
        if (isDuplicate) {
          results.push({ channelId: channel.id, success: false, skipped: true, reason: 'Duplicado' });
          continue;
        }

        try {
          // Simplificado: Sempre usa Web Service (já que Cloud API foi removida)
          const result = await whatsappWebService.sendMessage(channel.identifier, message);

          if (result && result.success) {
            sent++;
            await this.logSend(channel.id, eventType, data);

            // Registrar no log
            await NotificationLog.create({
              event_type: eventType,
              platform: 'whatsapp',
              channel_id: channel.id,
              channel_name: channel.name,
              success: true,
              message_id: result.messageId,
              payload: data
            });
          }
          results.push({ channelId: channel.id, success: !!(result && result.success) });
        } catch (error) {
          results.push({ channelId: channel.id, success: false, error: error.message });
        }
      }

      return { success: sent > 0, sent, total: channels.length, results };
    } catch (error) {
      logger.error(`❌ Erro em sendToWhatsApp: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensagem customizada para todos os canais ativos
   * @param {string} message - Mensagem a ser enviada
   */
  async sendCustomMessageToAllChannels(message) {
    logger.info(`📤 Enviando mensagem customizada para todos os canais`);

    try {
      const allChannels = await BotChannel.findActive();

      if (!allChannels || allChannels.length === 0) {
        return { success: false, message: 'Nenhum canal ativo' };
      }

      // Buscar configuração global para respeitar flags master de ativação
      const BotConfig = (await import('../../models/BotConfig.js')).default;
      const botConfig = await BotConfig.get();

      // Filtrar canais de plataformas desabilitadas globalmente
      const activeChannels = allChannels.filter(channel => {
        if (channel.platform === 'telegram' && botConfig.telegram_enabled === false) {
          return false;
        }
        if (channel.platform === 'whatsapp' && botConfig.whatsapp_enabled === false) {
          return false;
        }
        return true;
      });

      if (activeChannels.length === 0) {
        return { success: false, message: 'Plataformas desabilitadas' };
      }

      const results = {
        total: activeChannels.length,
        sent: 0,
        failed: 0,
        details: []
      };

      for (const channel of activeChannels) {
        try {
          let result;
          if (channel.platform === 'telegram') {
            const parseMode = await this.getTelegramParseMode();
            const convertedMessage = await templateRenderer.convertBoldFormatting(message, 'telegram', parseMode);

            result = await telegramService.sendMessage(channel.identifier, convertedMessage, {
              parse_mode: parseMode
            });

            if (result && (result.message_id || result.messageId)) {
              results.sent++;
              results.details.push({ channelId: channel.id, platform: channel.platform, success: true, result });
            } else {
              results.failed++;
              results.details.push({ channelId: channel.id, platform: channel.platform, success: false, error: 'Falha no envio (sem ID)' });
            }
          } else if (channel.platform === 'whatsapp') {
            const convertedMessage = await templateRenderer.convertBoldFormatting(message, 'whatsapp');
            result = await whatsappService.sendMessage(channel.identifier, convertedMessage);

            if (result && result.success) {
              results.sent++;
              results.details.push({ channelId: channel.id, platform: channel.platform, success: true, result });
            } else {
              results.failed++;
              results.details.push({ channelId: channel.id, platform: channel.platform, success: false, error: 'Falha no envio' });
            }
          }
        } catch (error) {
          logger.error(`❌ Erro ao enviar mensagem customizada para canal ${channel.id}: ${error.message}`);
          results.failed++;
          results.details.push({ channelId: channel.id, platform: channel.platform, success: false, error: error.message });
        }
      }

      logger.info(`✅ Mensagem customizada enviada: ${results.sent} sucesso, ${results.failed} falhas`);
      return results;
    } catch (error) {
      logger.error(`❌ Erro em sendCustomMessageToAllChannels: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar teste padrão para todos os canais
   */
  async sendTestToAllChannels() {
    const message = `🤖 *Teste de Bot*\n\n✅ Bot configurado e funcionando!\n⏰ ${new Date().toLocaleString('pt-BR')}`;
    return this.sendCustomMessageToAllChannels(message);
  }
}

export default new NotificationDispatcher();

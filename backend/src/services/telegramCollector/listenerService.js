/**
 * Serviço de listener Telegram usando gramjs (Node.js)
 */
import logger from '../../config/logger.js';
import TelegramCollectorConfig from '../../models/TelegramCollectorConfig.js';
import TelegramChannel from '../../models/TelegramChannel.js';
import telegramClient from './telegramClient.js';
import couponExtractor from './couponExtractor.js';
import Coupon from '../../models/Coupon.js';
import crypto from 'crypto';
import couponNotificationService from '../coupons/couponNotificationService.js';
import CouponSettings from '../../models/CouponSettings.js';
import couponAnalyzer from '../../ai/couponAnalyzer.js';

class TelegramListenerService {
  constructor() {
    this.isRunning = false;
    this.monitoredChannels = new Map();
    this.pendingChannels = []; // Canais que precisam ter username resolvido
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventCount = 0; // Contador de eventos recebidos (debug)
    this.messageCount = 0; // Contador de mensagens recebidas (debug)
    this.timeoutErrors = 0; // Contador de erros de timeout
    this.maxTimeoutErrors = 10; // Máximo de timeouts antes de verificar conexão
    this.timeoutErrorHandlerAdded = false; // Flag para evitar múltiplos handlers
    this.pollingInterval = null; // Intervalo para verificação periódica de mensagens
    this.pollingIntervalMs = 30000; // 30 segundos
  }

  /**
   * Gerar hash único para uma mensagem (anti-duplicação)
   */
  generateMessageHash(text, messageId, channel) {
    const content = `${channel}:${messageId}:${text}`;
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Verificar se cupom já existe (anti-duplicação)
   */
  async checkDuplicate(messageHash) {
    try {
      const existing = await Coupon.findByMessageHash(messageHash);
      return !!existing;
    } catch (error) {
      logger.warn(`Erro ao verificar duplicata: ${error.message}`);
      return false;
    }
  }

  /**
   * Salvar cupom no banco de dados
   */
  async saveCoupon(couponData, messageHash) {
    try {
      // Verificar duplicata
      const isDuplicate = await this.checkDuplicate(messageHash);
      if (isDuplicate) {
        logger.debug(`⚠️ Cupom duplicado ignorado: ${couponData.code}`);
        return null;
      }

      // Adicionar hash da mensagem
      couponData.message_hash = messageHash;
      
      // Marcar como capturado do Telegram
      couponData.origem = 'telegram';
      couponData.auto_captured = true;
      couponData.capture_source = 'telegram';
      
      // IMPORTANTE: Garantir que cupons capturados do Telegram NÃO fiquem pendentes de aprovação
      // para que sejam enviados imediatamente
      couponData.is_pending_approval = false;

      logger.info(`💾 Salvando cupom capturado: ${couponData.code} (${couponData.platform})`);
      logger.debug(`   Dados: ${JSON.stringify({
        code: couponData.code,
        platform: couponData.platform,
        origem: couponData.origem,
        auto_captured: couponData.auto_captured,
        is_pending_approval: couponData.is_pending_approval
      })}`);

      const coupon = await Coupon.create(couponData);
      logger.info(`✅ Cupom salvo: ${coupon.code} (${coupon.platform})`);
      logger.info(`   ID: ${coupon.id}`);
      logger.info(`   is_pending_approval: ${coupon.is_pending_approval}`);
      logger.info(`   auto_captured: ${coupon.auto_captured}`);

      // Notificar bots e app - cupons do Telegram devem ser enviados imediatamente
      if (coupon) {
        try {
          // Verificar configuração de notificação
          const settings = await CouponSettings.get();
          logger.debug(`   Configuração notify_bots_on_new_coupon: ${settings.notify_bots_on_new_coupon}`);
          
          if (settings.notify_bots_on_new_coupon) {
            if (coupon.is_pending_approval) {
              logger.warn(`⚠️ Cupom ${coupon.code} está pendente de aprovação, mas deveria ser enviado imediatamente`);
              logger.warn(`   Forçando aprovação para enviar notificação...`);
              // Aprovar o cupom automaticamente se estiver pendente
              await Coupon.approve(coupon.id);
              coupon.is_pending_approval = false;
            }
            
            logger.info(`📢 ========== INICIANDO ENVIO DE NOTIFICAÇÃO ==========`);
            logger.info(`   Cupom: ${coupon.code}`);
            logger.info(`   Plataforma: ${coupon.platform}`);
            logger.info(`   ID: ${coupon.id}`);
            logger.info(`   is_pending_approval: ${coupon.is_pending_approval}`);
            
            // Notificar via serviço de notificação de cupons (envia para bots, app e push notifications)
            const notifyResult = await couponNotificationService.notifyNewCoupon(coupon);
            
            logger.info(`✅ ========== NOTIFICAÇÃO CONCLUÍDA ==========`);
            logger.info(`   Resultado: ${JSON.stringify(notifyResult)}`);
            logger.info(`   Cupom ${coupon.code} notificado com sucesso!`);
          } else {
            logger.warn(`⏸️ ========== NOTIFICAÇÕES DESABILITADAS ==========`);
            logger.warn(`   Configuração notify_bots_on_new_coupon está DESABILITADA`);
            logger.warn(`   Ative em: /settings ou configurações de cupons`);
            logger.warn(`   Cupom ${coupon.code} foi salvo mas NÃO será enviado aos bots`);
          }
        } catch (notifyError) {
          logger.error(`❌ Erro ao notificar cupom ${coupon.code}: ${notifyError.message}`);
          logger.error(`   Stack: ${notifyError.stack}`);
          // Não falhar o salvamento por causa de erro de notificação
        }
      } else {
        logger.error(`❌ Cupom não foi retornado após criação`);
      }

      return coupon;
    } catch (error) {
      logger.error(`Erro ao salvar cupom: ${error.message}`);
      return null;
    }
  }

  /**
   * Carregar canais ativos do banco de dados
   */
  async loadChannels() {
    try {
      const channels = await TelegramChannel.findAll();
      const activeChannels = channels.filter(ch => ch.is_active);

      // Limpar apenas se não estiver resolvendo
      if (this.monitoredChannels.size === 0) {
        this.monitoredChannels.clear();
      }
      
      // Armazenar canais que precisam ser resolvidos
      this.pendingChannels = activeChannels.filter(ch => !ch.channel_id && ch.username);
      
      // Adicionar canais que já têm channel_id
      for (const channel of activeChannels) {
        if (channel.channel_id) {
          const channelId = channel.channel_id.toString();
          this.monitoredChannels.set(channelId, channel);
          logger.info(`📺 Canal já resolvido: ${channel.name || 'Sem nome'} (@${channel.username || channelId})`);
        }
      }

      logger.info(`✅ ${this.monitoredChannels.size} canais com ID carregados, ${this.pendingChannels.length} precisam ser resolvidos`);
      return activeChannels;
    } catch (error) {
      logger.error(`Erro ao carregar canais: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return [];
    }
  }

  /**
   * Resolver usernames para channel_id usando o cliente Telegram
   */
  async resolveChannelIds(client) {
    // Garantir que listener está marcado como ativo durante resolução
    telegramClient.setListenerActive(true);
    if (!this.pendingChannels || this.pendingChannels.length === 0) {
      return;
    }

    logger.info(`🔍 Resolvendo ${this.pendingChannels.length} username(s) para channel_id...`);

    for (const channel of this.pendingChannels) {
      try {
        if (!channel.username) {
          logger.warn(`⚠️ Canal sem username, ignorando: ${channel.name || channel.id}`);
          continue;
        }

        const username = channel.username.startsWith('@') 
          ? channel.username 
          : `@${channel.username}`;

        logger.info(`   🔍 Resolvendo: ${username}...`);

        // Verificar se cliente ainda está conectado antes de resolver
        let currentClient = client;
        const isConnected = currentClient && (currentClient.connected || currentClient._connected);
        
        if (!isConnected) {
          logger.warn(`   ⚠️ Cliente desconectado durante resolução, reconectando...`);
          // Garantir que listener está marcado como ativo antes de reconectar
          telegramClient.setListenerActive(true);
          await telegramClient.connect();
          currentClient = telegramClient.getClient();
          if (!currentClient) {
            logger.error(`   ❌ Não foi possível obter cliente após reconexão`);
            continue;
          }
          // Atualizar referência do client
          client = currentClient;
        }

        // Resolver username usando gramjs com timeout
        logger.debug(`   Tentando getEntity(${username})...`);
        
        const getEntityPromise = currentClient.getEntity(username);
        const entityTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao resolver username')), 15000); // Aumentado para 15s
        });
        
        const entity = await Promise.race([getEntityPromise, entityTimeout]);
        
        if (!entity) {
          logger.warn(`   ⚠️ Não foi possível resolver: ${username} (entity é null)`);
          continue;
        }
        
        logger.debug(`   ✅ Entity obtido: ${entity.constructor?.name || 'desconhecido'}`);
        logger.debug(`   Entity keys: ${Object.keys(entity).join(', ')}`);

        // Obter channel_id do entity
        let channelId = null;
        
        // Método 1: Tentar obter do ID direto
        if (entity.id !== undefined && entity.id !== null) {
          const rawId = entity.id;
          if (typeof rawId === 'bigint' || typeof rawId === 'number') {
            channelId = rawId.toString();
            logger.debug(`   Entity ID encontrado: ${channelId} (tipo: ${typeof rawId})`);
          } else {
            channelId = rawId.toString();
            logger.debug(`   Entity ID encontrado (string): ${channelId}`);
          }
        }
        
        // Método 2: Tentar obter do channelId específico
        if (!channelId && entity.channelId !== undefined && entity.channelId !== null) {
          channelId = entity.channelId.toString();
          logger.debug(`   Channel ID encontrado: ${channelId}`);
        }
        
        // Método 3: Tentar obter do accessHash e calcular ID
        if (!channelId && entity.accessHash !== undefined) {
          // Para alguns casos, podemos precisar usar o accessHash
          // Mas o ID deve estar disponível em entity.id
          logger.debug(`   AccessHash encontrado, mas ID não disponível diretamente`);
        }

        if (!channelId) {
          logger.warn(`   ⚠️ Entity não tem ID válido: ${username}`);
          logger.warn(`   Entity keys: ${Object.keys(entity).join(', ')}`);
          continue;
        }

        // Garantir que o channelId seja negativo para canais (formato do Telegram)
        // Canais públicos têm IDs negativos começando com -100
        // O formato correto é: -100 + channelId (sem o -100)
        if (!channelId.startsWith('-')) {
          // Verificar se é um canal (broadcast) ou supergrupo
          const isChannel = entity.broadcast || entity.megagroup || false;
          if (isChannel) {
            channelId = `-100${channelId}`;
            logger.debug(`   Ajustado channelId para formato de canal público: ${channelId}`);
          } else {
            // Para grupos normais, apenas adicionar o sinal negativo
            channelId = `-${channelId}`;
            logger.debug(`   Ajustado channelId para formato de grupo: ${channelId}`);
          }
        } else if (channelId.startsWith('-') && !channelId.startsWith('-100') && entity.broadcast) {
          // Se já tem sinal negativo mas não tem -100, adicionar
          channelId = `-100${channelId.substring(1)}`;
          logger.debug(`   Ajustado channelId para formato de canal público: ${channelId}`);
        }

        // Atualizar canal no banco de dados
        try {
          await TelegramChannel.update(channel.id, {
            channel_id: channelId
          });
          logger.debug(`   ✅ Canal atualizado no banco de dados`);
        } catch (updateError) {
          logger.error(`   ❌ Erro ao atualizar canal no banco: ${updateError.message}`);
          // Continuar mesmo se falhar - o canal já está no mapa de monitoramento
        }

        // Adicionar ao mapa de canais monitorados
        this.monitoredChannels.set(channelId, {
          ...channel,
          channel_id: channelId
        });

        logger.info(`   ✅ Resolvido: ${username} → ${channelId} (${channel.name || 'Sem nome'})`);

      } catch (error) {
        logger.error(`   ❌ Erro ao resolver ${channel.username}: ${error.message}`);
        // Continuar com próximo canal mesmo se este falhar
      }
    }

    logger.info(`✅ Resolução concluída. ${this.monitoredChannels.size} canais prontos para monitoramento.`);
  }

  /**
   * Verificar se está no horário de captura configurado
   */
  isWithinCaptureSchedule(channel) {
    if (!channel.capture_schedule_start || !channel.capture_schedule_end) {
      // Se não tem horário configurado, capturar 24h
      return true;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const startTime = channel.capture_schedule_start;
    const endTime = channel.capture_schedule_end;
    
    // Se o horário de fim é menor que o de início, significa que cruza a meia-noite
    if (endTime < startTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Verificar se a mensagem está dentro do período permitido (baseado no capture_mode)
   */
  isMessageWithinTimeRange(message, channel) {
    const captureMode = channel.capture_mode || 'new_only';
    
    if (captureMode === 'new_only') {
      // Para apenas novas mensagens, verificar:
      // 1. Se a mensagem é mais recente que last_message_id
      // 2. Se a mensagem foi enviada recentemente (últimas 24 horas)
      
      // Verificar last_message_id primeiro
      const lastMessageId = channel.last_message_id || 0;
      if (lastMessageId > 0) {
        const messageId = message.id ? (typeof message.id === 'bigint' ? Number(message.id) : message.id) : 0;
        if (messageId > 0 && messageId <= lastMessageId) {
          logger.debug(`   ⚠️ Mensagem ${messageId} é antiga (última processada: ${lastMessageId}), ignorando`);
          return false;
        }
      }
      
      // Verificar data da mensagem (deve ser das últimas 24 horas)
      let messageDate;
      if (message.date) {
        if (typeof message.date === 'number') {
          messageDate = message.date < 1e12 ? new Date(message.date * 1000) : new Date(message.date);
        } else if (message.date instanceof Date) {
          messageDate = message.date;
        } else {
          messageDate = new Date(message.date);
        }
      } else {
        // Se não tem data, assumir que é nova (foi recebida agora)
        return true;
      }
      
      const now = new Date();
      const diffMs = now - messageDate;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Se a mensagem tem mais de 24 horas, é antiga
      if (diffHours > 24) {
        logger.debug(`   ⚠️ Mensagem tem ${diffHours.toFixed(1)} horas, é antiga (modo: new_only), ignorando`);
        return false;
      }
      
      return true;
    }
    
    // Obter data da mensagem (pode estar em segundos Unix ou já ser Date)
    let messageDate;
    if (message.date) {
      // Se message.date é um número, pode ser timestamp Unix em segundos
      if (typeof message.date === 'number') {
        // Se for menor que 1e12, está em segundos, senão está em milissegundos
        messageDate = message.date < 1e12 ? new Date(message.date * 1000) : new Date(message.date);
      } else if (message.date instanceof Date) {
        messageDate = message.date;
      } else {
        messageDate = new Date(message.date);
      }
    } else {
      // Se não tem data, assumir que é nova
      return true;
    }
    
    const now = new Date();
    const diffMs = now - messageDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (channel.capture_mode === '1_day') {
      return diffDays <= 1;
    } else if (channel.capture_mode === '2_days') {
      return diffDays <= 2;
    }
    
    return true;
  }

  /**
   * Verificar se a plataforma do cupom corresponde ao filtro
   */
  matchesPlatformFilter(couponData, channel) {
    if (!channel.platform_filter || channel.platform_filter === 'all') {
      return true;
    }
    
    // Verificar se a plataforma do cupom corresponde ao filtro
    const couponPlatform = couponData.platform?.toLowerCase() || '';
    const filterPlatform = channel.platform_filter.toLowerCase();
    
    return couponPlatform === filterPlatform || couponPlatform.includes(filterPlatform);
  }

  /**
   * Processar mensagem recebida
   */
  async processMessage(message, channelId) {
    try {
      logger.info(`📥 Processando mensagem do canal: ${channelId}`);
      
      // Garantir que channelId seja uma string
      const channelIdStr = channelId ? channelId.toString() : null;
      if (!channelIdStr) {
        logger.warn(`⚠️ Mensagem recebida sem channelId válido`);
        return;
      }
      
      // Função auxiliar para normalizar IDs para comparação
      const normalizeIdForComparison = (id) => {
        let normalized = id.toString();
        // Remover prefixo -100 se existir
        if (normalized.startsWith('-100')) {
          normalized = normalized.substring(4);
          if (!normalized.startsWith('-')) {
            normalized = '-' + normalized;
          }
        }
        // Remover sinal negativo para comparação numérica
        return normalized.replace(/^-/, '');
      };
      
      // Buscar canal com comparação flexível de IDs
      let channel = this.monitoredChannels.get(channelIdStr);
      
      if (!channel) {
        // Tentar normalizar e buscar novamente
        const normalizedChatId = normalizeIdForComparison(channelIdStr);
        for (const [monitoredId, ch] of this.monitoredChannels.entries()) {
          const normalizedMonitoredId = normalizeIdForComparison(monitoredId.toString());
          if (
            normalizedChatId === normalizedMonitoredId ||
            channelIdStr === monitoredId.toString() ||
            channelIdStr.replace(/^-100/, '-') === monitoredId.toString().replace(/^-100/, '-')
          ) {
            channel = ch;
            logger.debug(`   ✅ Canal encontrado após normalização: ${channelIdStr} → ${monitoredId}`);
            break;
          }
        }
      }
      
      if (!channel) {
        logger.debug(`📭 Mensagem de canal não monitorado: ${channelIdStr}`);
        logger.debug(`   Canais monitorados: ${Array.from(this.monitoredChannels.keys()).join(', ')}`);
        return;
      }

      logger.info(`   Canal: ${channel.name || 'Sem nome'} (@${channel.username || channelIdStr})`);
      
      // Verificar se está no horário de captura configurado
      if (!this.isWithinCaptureSchedule(channel)) {
        logger.debug(`   ⏰ Fora do horário de captura configurado (${channel.capture_schedule_start || 'N/A'} - ${channel.capture_schedule_end || 'N/A'})`);
        return;
      }
      
      // Para modo 'new_only', verificar last_message_id ANTES de processar
      const captureMode = channel.capture_mode || 'new_only';
      if (captureMode === 'new_only') {
        const lastMessageId = channel.last_message_id || 0;
        const messageId = message.id ? (typeof message.id === 'bigint' ? Number(message.id) : message.id) : 0;
        
        if (lastMessageId > 0 && messageId > 0 && messageId <= lastMessageId) {
          logger.debug(`   ⚠️ Mensagem ${messageId} já foi processada (última: ${lastMessageId}), ignorando (modo: new_only)`);
          return;
        }
        
        // Verificar também a data da mensagem
        let messageDate;
        if (message.date) {
          if (typeof message.date === 'number') {
            messageDate = message.date < 1e12 ? new Date(message.date * 1000) : new Date(message.date);
          } else if (message.date instanceof Date) {
            messageDate = message.date;
          } else {
            messageDate = new Date(message.date);
          }
          
          const now = new Date();
          const diffMs = now - messageDate;
          const diffHours = diffMs / (1000 * 60 * 60);
          
          if (diffHours > 24) {
            logger.debug(`   ⚠️ Mensagem tem ${diffHours.toFixed(1)} horas, é antiga (modo: new_only), ignorando`);
            return;
          }
        }
      }
      
      // Verificar se a mensagem está dentro do período permitido
      if (!this.isMessageWithinTimeRange(message, channel)) {
        logger.debug(`   ⏰ Mensagem fora do período permitido (modo: ${channel.capture_mode || 'new_only'})`);
        return;
      }

      // Obter texto da mensagem de várias formas (métodos melhorados)
      let text = '';
      
      // Método 1: Tentar obter do campo message diretamente (string)
      if (message.message && typeof message.message === 'string') {
        text = message.message;
        logger.debug(`   Texto extraído do campo message (string)`);
      }
      
      // Método 2: Tentar obter do campo text
      if (!text && message.text) {
        if (typeof message.text === 'string') {
          text = message.text;
          logger.debug(`   Texto extraído do campo text (string)`);
        } else if (message.text.text) {
          text = message.text.text;
          logger.debug(`   Texto extraído do campo text.text`);
        } else if (typeof message.text === 'object' && message.text.message) {
          text = message.text.message;
          logger.debug(`   Texto extraído do campo text.message`);
        }
      }
      
      // Método 3: Tentar obter do rawText
      if (!text && message.rawText) {
        text = message.rawText;
        logger.debug(`   Texto extraído do campo rawText`);
      }
      
      // Método 4: Tentar obter de message.text (pode estar aninhado)
      if (!text && message.message && typeof message.message === 'object') {
        if (message.message.text) {
          text = typeof message.message.text === 'string' ? message.message.text : message.message.text.text;
          logger.debug(`   Texto extraído de message.message.text`);
        } else if (message.message.message) {
          text = typeof message.message.message === 'string' ? message.message.message : message.message.message.text;
          logger.debug(`   Texto extraído de message.message.message`);
        }
      }
      
      // Método 5: Tentar usar getMessageText() se disponível (método do gramjs)
      if (!text && typeof message.getMessageText === 'function') {
        try {
          text = message.getMessageText();
          if (text) {
            logger.debug(`   Texto extraído via getMessageText()`);
          }
        } catch (getTextError) {
          logger.debug(`   Erro ao usar getMessageText(): ${getTextError.message}`);
        }
      }
      
      // Método 6: Tentar extrair do campo media (mensagens com foto/vídeo podem ter caption)
      if (!text && message.media) {
        if (message.media.caption) {
          text = typeof message.media.caption === 'string' ? message.media.caption : message.media.caption.text;
          logger.debug(`   Texto extraído do caption da mídia`);
        } else if (message.media.message) {
          text = typeof message.media.message === 'string' ? message.media.message : message.media.message.text;
          logger.debug(`   Texto extraído de message.media.message`);
        }
      }

      // Método 7: Tentar extrair de entities se disponível (reconstruir texto)
      if (!text && message.entities && message.message) {
        try {
          // Tentar reconstruir texto a partir de entities
          if (typeof message.message === 'object' && message.message.text) {
            text = message.message.text;
            logger.debug(`   Texto extraído de message.message.text (com entities)`);
          }
        } catch (entityError) {
          logger.debug(`   Erro ao extrair de entities: ${entityError.message}`);
        }
      }

      // Método 8: Tentar obter do objeto message diretamente
      if (!text && message.message) {
        if (typeof message.message === 'object') {
          // Tentar várias propriedades comuns
          const possibleTextFields = ['text', 'message', 'caption', 'content'];
          for (const field of possibleTextFields) {
            if (message.message[field]) {
              const fieldValue = message.message[field];
              if (typeof fieldValue === 'string') {
                text = fieldValue;
                logger.debug(`   Texto extraído de message.message.${field}`);
                break;
              } else if (fieldValue && fieldValue.text) {
                text = fieldValue.text;
                logger.debug(`   Texto extraído de message.message.${field}.text`);
                break;
              }
            }
          }
        }
      }
      
      // Método 9: Tentar converter a mensagem para string (último recurso)
      if (!text && message.toString) {
        try {
          const msgStr = message.toString();
          if (msgStr && msgStr !== '[object Object]' && msgStr.length > 5) {
            text = msgStr;
            logger.debug(`   Texto extraído via toString(): ${text.substring(0, 100)}...`);
          }
        } catch (toStringError) {
          logger.debug(`   Erro ao converter mensagem para string: ${toStringError.message}`);
        }
      }

      logger.debug(`   Texto da mensagem: ${text ? text.substring(0, 100) + '...' : 'vazio'}`);
      
      // Log detalhado se não conseguiu extrair texto
      if (!text) {
        logger.warn(`   ⚠️ Não foi possível extrair texto da mensagem`);
        logger.warn(`   Estrutura da mensagem: ${JSON.stringify({
          hasMessage: !!message.message,
          messageType: typeof message.message,
          hasText: !!message.text,
          textType: typeof message.text,
          hasRawText: !!message.rawText,
          hasEntities: !!message.entities,
          hasMedia: !!message.media,
          messageClass: message.constructor?.name
        })}`);
      }

      if (!text || text.trim().length < 3) {
        logger.debug(`   Mensagem muito curta ou vazia (${text ? text.length : 0} caracteres), ignorando`);
        return;
      }
      
      // Limpar texto (remover espaços extras, quebras de linha desnecessárias)
      text = text.trim().replace(/\s+/g, ' ');

      // Obter ID da mensagem
      const messageId = message.id || message.messageId || Date.now();

      // Extrair informações do cupom
      logger.debug(`   Extraindo informações do cupom...`);
      logger.debug(`   Texto completo: ${text.substring(0, 200)}...`);
      
      let couponData = null;

      // TENTAR IA PRIMEIRO (se habilitada)
      const aiEnabled = await couponAnalyzer.isEnabled();
      if (aiEnabled) {
        try {
          logger.info(`   🤖 Tentando extrair cupom via IA...`);
          const aiExtraction = await couponAnalyzer.analyze(text);
          
          if (aiExtraction && aiExtraction.code) {
            logger.info(`   ✅ IA extraiu cupom: ${aiExtraction.code} - ${aiExtraction.platform}`);
            
            // Preparar dados do cupom no formato esperado
            couponData = {
              code: aiExtraction.code,
              platform: aiExtraction.platform,
              discount_type: aiExtraction.discount_type || 'percentage',
              discount_value: aiExtraction.discount_value || 10.0,
              min_purchase: aiExtraction.min_purchase || 0,
              max_discount_value: aiExtraction.max_discount_value || null,
              valid_from: aiExtraction.valid_from || new Date().toISOString(),
              valid_until: aiExtraction.valid_until,
              title: `Cupom ${aiExtraction.code} - ${aiExtraction.platform}`,
              description: text.substring(0, 500),
              source: 'telegram',
              origem: 'telegram',
              channel_origin: channel.username || channel.name,
              message_id: messageId,
              is_pending_approval: false, // IA já valida, então não precisa aprovação
              capture_source: 'telegram_ai',
              auto_captured: true
            };
          } else {
            logger.debug(`   ⚠️ IA não conseguiu extrair cupom válido, tentando método tradicional...`);
          }
        } catch (aiError) {
          logger.warn(`   ⚠️ Erro ao usar IA: ${aiError.message}. Tentando método tradicional...`);
        }
      }

      // FALLBACK: Método tradicional (Regex) se IA não funcionou ou não está habilitada
      if (!couponData) {
        logger.debug(`   🔍 Usando método tradicional de extração (Regex)...`);
        
        // Tentar extrair múltiplos cupons primeiro
        const multipleCoupons = couponExtractor.extractMultipleCoupons(
          text,
          messageId,
          channel.username || channel.name
        );

        if (multipleCoupons && multipleCoupons.length > 0) {
          logger.info(`   🎟️ ${multipleCoupons.length} cupom(ns) detectado(s) na mensagem`);
          
          // Salvar cada cupom encontrado
          for (const coupon of multipleCoupons) {
            logger.info(`   🎟️ Cupom: ${coupon.code || 'sem código'} - ${coupon.platform || 'plataforma desconhecida'}`);
            
            // Gerar hash único para cada cupom (incluindo código para diferenciar)
            const couponHash = this.generateMessageHash(
              `${text}:${coupon.code}`,
              messageId,
              channelId.toString()
            );
            
            // Salvar cupom
            await this.saveCoupon(coupon, couponHash);
          }
          return;
        }
        
        // Se não encontrou múltiplos, tentar extrair um único cupom
        couponData = couponExtractor.extractCouponInfo(
          text,
          messageId,
          channel.username || channel.name
        );

        if (!couponData) {
          logger.debug(`   Nenhum cupom detectado na mensagem`);
          logger.debug(`   Primeira verificação: tem palavras-chave? ${couponExtractor.hasCouponKeywords(text)}`);
          return;
        }
      }

      // Verificar se a plataforma do cupom corresponde ao filtro configurado
      if (!this.matchesPlatformFilter(couponData, channel)) {
        logger.debug(`   🚫 Cupom de plataforma '${couponData.platform}' não corresponde ao filtro '${channel.platform_filter}'`);
        return;
      }

      logger.info(`   🎟️ Cupom detectado: ${couponData.code || 'sem código'} - ${couponData.platform || 'plataforma desconhecida'}`);

      // Gerar hash da mensagem
      const messageHash = this.generateMessageHash(text, messageId, channelId.toString());

      // Salvar cupom
      await this.saveCoupon(couponData, messageHash);

      // Atualizar última mensagem processada
      await TelegramChannel.update(channel.id, {
        last_message_id: messageId,
        last_sync_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Erro ao processar mensagem: ${error.message}`);
    }
  }

  /**
   * Configurar handlers de eventos
   */
  async setupEventHandlers(client) {
    logger.info(`📡 Configurando handlers de eventos...`);
    
    // Se cliente não foi passado, tentar obter do telegramClient
    if (!client) {
      logger.warn(`⚠️ Cliente não foi passado, tentando obter do telegramClient...`);
      client = telegramClient.getClient();
    }
    
    // Verificar se cliente está disponível
    if (!client) {
      logger.warn(`⚠️ Cliente não disponível, tentando conectar...`);
      await telegramClient.loadConfig();
      telegramClient.createClient();
      const connected = await telegramClient.connect();
      if (!connected) {
        throw new Error('Não foi possível conectar cliente para configurar handlers');
      }
      client = telegramClient.getClient();
    }
    
    // Verificar novamente após tentativa de conexão
    if (!client) {
      throw new Error('Cliente não disponível para configurar handlers após tentativa de conexão');
    }
    
    // Verificar se cliente está conectado
    const isConnected = client.connected || client._connected;
    if (!isConnected) {
      logger.warn(`⚠️ Cliente não está marcado como conectado, tentando reconectar...`);
      await telegramClient.connect();
      // Obter cliente novamente após reconexão
      client = telegramClient.getClient();
      if (!client) {
        throw new Error('Não foi possível obter cliente após reconexão');
      }
      // Verificar novamente
      const stillNotConnected = !client.connected && !client._connected;
      if (stillNotConnected) {
        logger.warn(`⚠️ Cliente ainda não está marcado como conectado, mas continuando...`);
        // Continuar mesmo assim, pois pode ser um problema de flag interna
      }
    }
    
    logger.info(`✅ Cliente obtido e pronto para receber eventos`);
    
    // Adicionar handler global para erros não capturados do loop de atualizações
    // Isso evita que erros de TIMEOUT quebrem o listener
    // Usar uma flag para evitar múltiplos handlers
    if (!this.timeoutErrorHandlerAdded) {
      const timeoutErrorHandler = (error, promise) => {
        // Filtrar apenas erros de TIMEOUT do loop de atualizações
        if (error && error.message && error.message.includes('TIMEOUT')) {
          // Verificar se é do módulo telegram/client/updates.js
          if (error.stack && error.stack.includes('telegram/client/updates')) {
            // Incrementar contador de timeouts
            this.timeoutErrors = (this.timeoutErrors || 0) + 1;
            
            // Log apenas a cada 10 timeouts para não poluir muito os logs
            if (this.timeoutErrors % 10 === 0) {
              logger.debug(`⏰ Timeout no loop de atualizações (${this.timeoutErrors} ocorrências, não crítico): ${error.message}`);
            }
            
            // Se muitos timeouts consecutivos, pode ser problema de conexão
            if (this.timeoutErrors >= this.maxTimeoutErrors) {
              logger.warn(`⚠️ Muitos timeouts consecutivos (${this.timeoutErrors}). Verificando conexão...`);
              this.timeoutErrors = 0; // Reset contador
              // Não reconectar automaticamente - deixar o keepAlive fazer isso
            }
            // Não propagar o erro - o loop vai tentar novamente automaticamente
            // Suprimir o erro completamente para não poluir logs
            return;
          }
        }
        // Para outros erros, deixar o handler padrão tratar (não fazer nada)
        // O Node.js vai logar automaticamente
      };
      
      process.on('unhandledRejection', timeoutErrorHandler);
      this.timeoutErrorHandlerAdded = true;
      logger.info(`📡 Handler de erros de timeout configurado`);
      logger.info(`   ℹ️ Erros de TIMEOUT do loop de atualizações são normais e serão suprimidos dos logs`);
      logger.info(`   ℹ️ O sistema usa verificação periódica (30s) como backup para garantir captura`);
    }
    
    const { NewMessage } = await import('telegram/events/index.js');
    const { PeerChannel } = await import('telegram/tl/index.js');

    // Converter channel_ids para números (canais têm IDs negativos)
    const channelIds = Array.from(this.monitoredChannels.keys()).map(id => {
      // Se já é número, usar direto; se é string, converter
      const numId = typeof id === 'string' ? BigInt(id) : id;
      return numId;
    });

    logger.info(`📡 Configurando handlers para ${channelIds.length} canal(is)...`);
    logger.info(`   IDs dos canais: ${channelIds.map(id => id.toString()).join(', ')}`);

    // Handler para novas mensagens - capturar todas as mensagens primeiro para debug
    logger.info(`📡 Registrando handler de eventos...`);
    
    this.eventCount = 0;
    this.messageCount = 0;
    this.timeoutErrors = 0; // Contador de erros de timeout (inicializado no setupEventHandlers)
    this.maxTimeoutErrors = 10; // Máximo de timeouts antes de verificar conexão
    
    const handler = async (event) => {
      try {
        // Incrementar contador de eventos
        this.eventCount++;
        
        // Log mais detalhado para debug
        const eventType = event.constructor?.name || 'desconhecido';
        logger.info(`📨 EVENTO #${this.eventCount} RECEBIDO: ${eventType}`);
        
        const message = event.message;
        if (!message) {
          logger.debug('📭 Evento sem mensagem, ignorando');
          return;
        }

        // Incrementar contador de mensagens
        this.messageCount++;
        
        // Extrair ID e data da mensagem ANTES de processar (para validação de mensagens antigas)
        const messageId = message.id ? (typeof message.id === 'bigint' ? Number(message.id) : message.id) : 0;
        let messageDate = null;
        if (message.date) {
          if (typeof message.date === 'number') {
            messageDate = message.date < 1e12 ? new Date(message.date * 1000) : new Date(message.date);
          } else if (message.date instanceof Date) {
            messageDate = message.date;
          } else {
            messageDate = new Date(message.date);
          }
        }
        
        // Log detalhado da mensagem
        logger.info(`📨 MENSAGEM #${this.messageCount} recebida!`);
        logger.debug(`   Message ID: ${messageId || 'N/A'}`);
        logger.debug(`   Message Date: ${messageDate ? messageDate.toISOString() : 'N/A'}`);
        logger.debug(`   Message Type: ${message.constructor?.name || 'desconhecido'}`);

        // Obter ID do chat/canal de várias formas
        let chatId = null;
        
        // Método 1: Tentar obter do peerId (mais confiável para canais)
        if (message.peerId) {
          // Para canais públicos, o peerId pode ser um objeto Channel ou PeerChannel
          if (message.peerId.channelId !== undefined && message.peerId.channelId !== null) {
            const channelId = message.peerId.channelId;
            // Canais públicos têm IDs negativos começando com -100
            // Formato: -100 + channelId (sem o -100)
            if (typeof channelId === 'bigint' || typeof channelId === 'number') {
              // Se o ID já é negativo, usar direto; senão, converter para formato de canal
              const idStr = channelId.toString();
              if (idStr.startsWith('-')) {
                chatId = idStr;
              } else {
                // Converter para formato de canal público: -100 + ID
                chatId = `-100${idStr}`;
              }
            } else {
              chatId = channelId.toString();
            }
            logger.debug(`   Canal ID do peerId.channelId: ${chatId}`);
          } else if (message.peerId.chatId !== undefined && message.peerId.chatId !== null) {
            chatId = message.peerId.chatId.toString();
            logger.debug(`   Chat ID do peerId.chatId: ${chatId}`);
          } else if (message.peerId.userId !== undefined && message.peerId.userId !== null) {
            // Mensagem de usuário, ignorar
            logger.debug(`   Mensagem de usuário (userId: ${message.peerId.userId}), ignorando`);
            return;
          }
        }

        // Método 2: Tentar obter do chatId da mensagem diretamente
        if (!chatId && message.chatId !== undefined && message.chatId !== null) {
          const rawChatId = message.chatId;
          if (typeof rawChatId === 'bigint' || typeof rawChatId === 'number') {
            chatId = rawChatId.toString();
            // Se não começar com -, pode ser um canal que precisa do prefixo -100
            if (!chatId.startsWith('-') && Math.abs(Number(rawChatId)) > 1000000000) {
              chatId = `-100${chatId}`;
            }
          } else {
            chatId = rawChatId.toString();
          }
          logger.debug(`   Chat ID da mensagem: ${chatId}`);
        }

        // Método 3: Tentar obter do objeto chat da mensagem
        if (!chatId && message.chat) {
          if (message.chat.id !== undefined && message.chat.id !== null) {
            const rawId = message.chat.id;
            if (typeof rawId === 'bigint' || typeof rawId === 'number') {
              chatId = rawId.toString();
              // Verificar se precisa do prefixo -100 para canais
              if (!chatId.startsWith('-') && Math.abs(Number(rawId)) > 1000000000) {
                chatId = `-100${chatId}`;
              }
            } else {
              chatId = rawId.toString();
            }
            logger.debug(`   Chat ID do objeto chat: ${chatId}`);
          }
        }

        // Método 4: Tentar obter do peer usando getInputEntity
        if (!chatId && message.peerId) {
          try {
            // Tentar extrair ID diretamente do peerId
            const peerIdObj = message.peerId;
            if (peerIdObj.value !== undefined) {
              const peerValue = peerIdObj.value;
              if (peerValue && (peerValue.channelId !== undefined || peerValue.chatId !== undefined)) {
                const id = peerValue.channelId || peerValue.chatId;
                if (id) {
                  chatId = id.toString();
                  if (!chatId.startsWith('-') && Math.abs(Number(id)) > 1000000000) {
                    chatId = `-100${chatId}`;
                  }
                  logger.debug(`   Chat ID extraído do peerId.value: ${chatId}`);
                }
              }
            }
          } catch (peerError) {
            logger.debug(`   Erro ao extrair ID do peerId: ${peerError.message}`);
          }
        }

        if (!chatId) {
          logger.debug(`   ⚠️ Não foi possível obter ID do chat/canal da mensagem`);
          logger.debug(`   Estrutura da mensagem: ${JSON.stringify({
            hasPeerId: !!message.peerId,
            hasChatId: message.chatId !== undefined,
            hasChat: !!message.chat,
            peerIdType: message.peerId?.constructor?.name,
            messageType: message.constructor?.name
          })}`);
          return;
        }

        logger.debug(`   🔍 Verificando se canal ${chatId} está sendo monitorado...`);
        logger.debug(`   Canais monitorados: ${Array.from(this.monitoredChannels.keys()).join(', ')}`);

        // Normalizar chatId para comparação
        // Canais públicos têm IDs no formato -100XXXXXXXXX
        // Precisamos normalizar para comparar corretamente
        let normalizedChatId = chatId.toString();
        
        // Função auxiliar para normalizar IDs
        const normalizeId = (id) => {
          let normalized = id.toString();
          // Remover prefixo -100 se existir para comparação
          if (normalized.startsWith('-100')) {
            normalized = normalized.substring(4); // Remove -100
            if (!normalized.startsWith('-')) {
              normalized = '-' + normalized; // Adiciona - de volta
            }
          }
          // Remover sinal negativo para comparação numérica
          return normalized.replace(/^-/, '');
        };
        
        // Se o chatId não começa com -, pode ser um canal que precisa do prefixo
        if (!normalizedChatId.startsWith('-')) {
          // Se o número é grande o suficiente para ser um canal, adicionar -100
          const numId = Math.abs(Number(normalizedChatId));
          if (numId > 1000000000) {
            normalizedChatId = `-100${normalizedChatId}`;
            logger.debug(`   ChatId normalizado para formato de canal: ${normalizedChatId}`);
          } else {
            // Para grupos menores, apenas adicionar o sinal negativo
            normalizedChatId = `-${normalizedChatId}`;
          }
        } else if (normalizedChatId.startsWith('-') && !normalizedChatId.startsWith('-100')) {
          // Se já tem sinal negativo mas não tem -100, verificar se precisa adicionar
          const numId = Math.abs(Number(normalizedChatId));
          if (numId > 1000000000) {
            normalizedChatId = `-100${normalizedChatId.substring(1)}`;
            logger.debug(`   ChatId ajustado para formato de canal público: ${normalizedChatId}`);
          }
        }
        
        const normalizedForComparison = normalizeId(normalizedChatId);
        
        let foundChannel = null;
        
        // Verificar se o canal está sendo monitorado (comparação flexível)
        for (const [monitoredId, channel] of this.monitoredChannels.entries()) {
          const monitoredIdStr = monitoredId.toString();
          const monitoredNormalized = normalizeId(monitoredIdStr);
          
          // Comparar de várias formas
          if (
            normalizedChatId === monitoredIdStr ||
            normalizedForComparison === monitoredNormalized ||
            chatId === monitoredIdStr ||
            chatId === monitoredIdStr.replace(/^-100/, '-') ||
            normalizedChatId.replace(/^-100/, '-') === monitoredIdStr.replace(/^-100/, '-')
          ) {
            foundChannel = channel;
            logger.debug(`   ✅ Match encontrado: ${normalizedChatId} === ${monitoredIdStr}`);
            break;
          }
        }

        if (foundChannel) {
          logger.info(`✅ MATCH! Mensagem de canal monitorado: ${chatId}`);
          logger.info(`   Canal: ${foundChannel.name || foundChannel.username}`);
          logger.info(`   Username: @${foundChannel.username || 'N/A'}`);
          
          // IMPORTANTE: Para modo 'new_only', verificar se a mensagem é realmente nova
          // ANTES de processar. Isso evita processar mensagens antigas que podem chegar
          // via eventos do Telegram.
          const captureMode = foundChannel.capture_mode || 'new_only';
          if (captureMode === 'new_only') {
            // Verificar last_message_id
            const lastMessageId = foundChannel.last_message_id || 0;
            if (lastMessageId > 0 && messageId > 0 && messageId <= lastMessageId) {
              logger.debug(`   ⚠️ Mensagem ${messageId} já foi processada (última: ${lastMessageId}), ignorando (modo: new_only)`);
              return; // Ignorar mensagem antiga completamente
            }
            
            // Verificar data da mensagem (deve ser das últimas 24 horas)
            if (messageDate) {
              const now = new Date();
              const diffMs = now - messageDate;
              const diffHours = diffMs / (1000 * 60 * 60);
              
              if (diffHours > 24) {
                logger.debug(`   ⚠️ Mensagem tem ${diffHours.toFixed(1)} horas, é antiga (modo: new_only), ignorando`);
                return; // Ignorar mensagem antiga completamente
              }
              
              logger.debug(`   ✅ Mensagem é nova (${diffHours.toFixed(2)} horas atrás), processando...`);
            }
          }
          
          await this.processMessage(message, chatId);
        } else {
          // Log mais detalhado para debug quando não encontra o canal
          logger.debug(`   📭 Mensagem de canal não monitorado: ${chatId}`);
          logger.debug(`   ChatId normalizado: ${normalizedChatId}`);
          logger.debug(`   Canais monitorados (${this.monitoredChannels.size}):`);
          for (const [monId, monChannel] of this.monitoredChannels.entries()) {
            logger.debug(`     - ${monId} (${monChannel.name || monChannel.username})`);
          }
          
          // Tentar buscar o canal pelo username se disponível na mensagem
          if (message.chat && message.chat.username) {
            const msgUsername = message.chat.username.startsWith('@') ? message.chat.username : `@${message.chat.username}`;
            logger.debug(`   Tentando encontrar canal pelo username: ${msgUsername}`);
            
            // Verificar se algum canal monitorado tem esse username
            for (const [monId, monChannel] of this.monitoredChannels.entries()) {
              const monUsername = monChannel.username ? (monChannel.username.startsWith('@') ? monChannel.username : `@${monChannel.username}`) : null;
              if (monUsername && monUsername.toLowerCase() === msgUsername.toLowerCase()) {
                logger.info(`   ✅ Canal encontrado pelo username! ${msgUsername} → ${monId}`);
                logger.info(`   ⚠️ Possível problema: channel_id no banco (${monId}) não corresponde ao ID da mensagem (${chatId})`);
                logger.info(`   💡 Solução: Atualizar channel_id do canal ${monChannel.name} para ${chatId}`);
                
                // Tentar atualizar o channel_id no banco
                try {
                  await TelegramChannel.update(monChannel.id, { channel_id: chatId });
                  // Atualizar no mapa também
                  this.monitoredChannels.delete(monId);
                  this.monitoredChannels.set(chatId, { ...monChannel, channel_id: chatId });
                  logger.info(`   ✅ channel_id atualizado no banco de dados`);
                  
                  // Processar a mensagem agora que encontramos o canal
                  await this.processMessage(message, chatId);
                  return;
                } catch (updateError) {
                  logger.error(`   ❌ Erro ao atualizar channel_id: ${updateError.message}`);
                }
              }
            }
          }
        }
      } catch (error) {
        // Filtrar erros de TIMEOUT que são comuns e não críticos
        if (error.message && error.message.includes('TIMEOUT')) {
          logger.debug(`⏰ Timeout no processamento de mensagem (não crítico): ${error.message}`);
          // Incrementar contador mas não quebrar
          this.timeoutErrors = (this.timeoutErrors || 0) + 1;
          return; // Continuar processando outras mensagens
        }
        
        // Para outros erros, logar mas não quebrar o listener
        logger.error(`❌ Erro no handler de mensagens: ${error.message}`);
        logger.error(`   Stack: ${error.stack}`);
        // Não lançar erro - continuar processando outras mensagens
      }
    };
    
    // Registrar handler com NewMessage
    // Usar filtro vazio para capturar todas as mensagens (incluindo canais públicos)
    try {
      // IMPORTANTE: Para canais públicos, precisamos capturar TODAS as mensagens primeiro
      // porque o gramjs pode não expor corretamente os IDs dos canais no filtro
      // Vamos usar um handler geral que captura tudo e depois filtra
      
      // Handler geral - captura TODAS as mensagens
      client.addEventHandler(handler, new NewMessage({}));
      logger.info(`✅ Handler geral registrado (captura TODAS as mensagens para filtrar depois)`);
      
      // Adicionar contador de eventos recebidos para debug
      this.eventCount = 0;
      this.messageCount = 0;
      
      // Handler adicional para contar eventos (debug)
      client.addEventHandler(async (event) => {
        this.eventCount++;
        if (event.message) {
          this.messageCount++;
        }
        // Log a cada 10 eventos para não poluir muito
        if (this.eventCount % 10 === 0) {
          logger.debug(`📊 Estatísticas: ${this.eventCount} eventos recebidos, ${this.messageCount} mensagens`);
        }
      }, new NewMessage({}));
      
      // Também tentar registrar handlers específicos para cada canal
      // Isso pode ajudar em alguns casos, mas o handler geral é mais confiável
      try {
        logger.info(`📡 Tentando registrar handlers específicos para ${this.monitoredChannels.size} canal(is)...`);
        let specificHandlersCount = 0;
        
        for (const [channelIdStr, channel] of this.monitoredChannels.entries()) {
          try {
            // Tentar usar username se disponível (mais confiável que ID)
            if (channel.username) {
              const username = channel.username.startsWith('@') ? channel.username : `@${channel.username}`;
              
              // Criar filtro usando username
              const usernameFilter = new NewMessage({
                chats: [username]
              });
              
              client.addEventHandler(async (event) => {
                logger.debug(`📨 Mensagem recebida do canal específico (username): ${username}`);
                await handler(event);
              }, usernameFilter);
              
              specificHandlersCount++;
              logger.debug(`   ✅ Handler específico (username) registrado: ${username}`);
            }
            
            // Também tentar com channel_id se disponível
            if (channelIdStr) {
              try {
                const channelId = typeof channelIdStr === 'string' ? BigInt(channelIdStr) : channelIdStr;
                const channelFilter = new NewMessage({
                  chats: [channelId]
                });
                
                client.addEventHandler(async (event) => {
                  logger.debug(`📨 Mensagem recebida do canal específico (ID): ${channelIdStr}`);
                  await handler(event);
                }, channelFilter);
                
                specificHandlersCount++;
                logger.debug(`   ✅ Handler específico (ID) registrado: ${channelIdStr}`);
              } catch (idFilterError) {
                logger.debug(`   ⚠️ Não foi possível criar filtro por ID para ${channelIdStr}: ${idFilterError.message}`);
              }
            }
          } catch (channelHandlerError) {
            logger.warn(`   ⚠️ Erro ao registrar handler específico para canal ${channelIdStr}: ${channelHandlerError.message}`);
            // Continuar mesmo se falhar - o handler geral deve capturar
          }
        }
        
        logger.info(`✅ ${specificHandlersCount} handler(s) específico(s) registrado(s) (além do handler geral)`);
      } catch (specificHandlerError) {
        logger.warn(`⚠️ Erro ao registrar handlers específicos: ${specificHandlerError.message}`);
        logger.warn(`   Continuando com handler geral apenas (isso deve funcionar)`);
      }
    } catch (handlerError) {
      logger.error(`❌ Erro ao registrar handler: ${handlerError.message}`);
      throw handlerError;
    }
    
    // Verificar se o cliente está realmente conectado e pronto para receber atualizações
    const clientConnected = client && (client.connected || client._connected);
    logger.info(`📡 Status da conexão: ${clientConnected ? '✅ Conectado' : '❌ Desconectado'}`);
    
    // Verificar se o cliente tem o método de atualizações ativo
    if (client._updateLoop) {
      logger.info(`✅ Loop de atualizações ativo`);
    } else {
      logger.warn(`⚠️ Loop de atualizações não detectado - pode não receber mensagens`);
      logger.warn(`   Isso é normal se o cliente ainda não iniciou o loop`);
    }
    
    // Forçar início do loop de atualizações se necessário
    // O gramjs inicia automaticamente, mas vamos garantir
    if (client && clientConnected && !client._updateLoop) {
      logger.info(`📡 Iniciando loop de atualizações manualmente...`);
      try {
        // O gramjs inicia o loop automaticamente quando adicionamos handlers
        // Mas vamos garantir que está ativo
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s para o loop iniciar
        if (client._updateLoop) {
          logger.info(`✅ Loop de atualizações iniciado`);
        } else {
          logger.warn(`⚠️ Loop de atualizações ainda não detectado após 1s`);
        }
      } catch (loopError) {
        logger.warn(`⚠️ Erro ao verificar loop de atualizações: ${loopError.message}`);
      }
    }
    
    logger.info(`✅ Handlers configurados com sucesso`);
    logger.info(`   📡 Listener pronto para receber mensagens de ${this.monitoredChannels.size} canal(is)`);
    logger.info(`   💡 O cliente deve permanecer conectado para receber atualizações`);
  }

  /**
   * Iniciar listener
   */
  async start() {
    try {
      if (this.isRunning) {
        throw new Error('Listener já está rodando');
      }

      // Verificar configurações
      const config = await TelegramCollectorConfig.get();
      if (!config.api_id || !config.api_hash || !config.phone) {
        throw new Error('Credenciais não configuradas');
      }

      if (!config.is_authenticated) {
        throw new Error('Telegram não está autenticado. Faça a autenticação primeiro.');
      }

      logger.info('🚀 Iniciando Telegram Listener...');

      // IMPORTANTE: Marcar listener como ativo ANTES de conectar
      // Isso evita que isAuthenticated() desconecte o cliente
      telegramClient.setListenerActive(true);
      
      // Conectar cliente primeiro (precisamos estar conectados para resolver usernames)
      await telegramClient.loadConfig();
      telegramClient.createClient();
      
      logger.info(`🔌 Conectando ao Telegram para listener...`);
      const connected = await telegramClient.connect();

      if (!connected) {
        telegramClient.setListenerActive(false);
        throw new Error('Falha ao conectar ao Telegram');
      }

      let client = telegramClient.getClient();
      
      // Verificar se cliente está realmente conectado e disponível
      if (!client) {
        logger.warn(`⚠️ Cliente não foi obtido após conexão, tentando novamente...`);
        // Aguardar um pouco e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        client = telegramClient.getClient();
        if (!client) {
          telegramClient.setListenerActive(false);
          throw new Error('Não foi possível obter cliente após conexão');
        }
      }
      
      const isConnected = client.connected || client._connected;
      if (!isConnected) {
        logger.warn(`⚠️ Cliente não está marcado como conectado, mas continuando...`);
        // Tentar uma verificação adicional
        try {
          // Fazer uma chamada simples para verificar conexão
          await client.getMe();
          logger.info(`✅ Cliente respondeu ao getMe(), conexão está ativa`);
        } catch (meError) {
          logger.warn(`⚠️ Erro ao verificar conexão com getMe(): ${meError.message}`);
          // Continuar mesmo assim
        }
      } else {
        logger.info(`✅ Cliente conectado e pronto para uso`);
      }
      
      // IMPORTANTE: Não desconectar o cliente - o listener precisa manter a conexão aberta
      logger.info(`📡 Mantendo conexão aberta para receber atualizações...`);

      // Carregar canais e resolver usernames para channel_id
      await this.loadChannels();
      
      // Verificar novamente se cliente ainda está disponível antes de resolver canais
      client = telegramClient.getClient();
      if (!client) {
        telegramClient.setListenerActive(false);
        throw new Error('Cliente não disponível após carregar canais');
      }
      
      await this.resolveChannelIds(client);

      if (this.monitoredChannels.size === 0) {
        logger.warn('⚠️ Nenhum canal ativo encontrado após resolução');
        logger.warn('   Verifique se os canais estão ativos e têm username válido');
        // Não marcar como running se não há canais
        this.isRunning = false;
        throw new Error('Nenhum canal ativo encontrado. Adicione canais e certifique-se de que têm username válido.');
      }

      // IMPORTANTE: Garantir que estamos inscritos nos canais para receber mensagens
      logger.info(`📡 Garantindo inscrição nos canais...`);
      
      // Verificar novamente se cliente ainda está disponível
      client = telegramClient.getClient();
      if (!client) {
        telegramClient.setListenerActive(false);
        throw new Error('Cliente não disponível antes de garantir inscrição');
      }
      
      await this.ensureChannelSubscription(client);

      // Configurar handlers ANTES de marcar como running
      // Verificar novamente se cliente ainda está disponível
      client = telegramClient.getClient();
      if (!client) {
        logger.warn(`⚠️ Cliente não disponível antes de configurar handlers, tentando obter novamente...`);
        // Tentar reconectar
        const reconnected = await telegramClient.connect();
        if (!reconnected) {
          telegramClient.setListenerActive(false);
          throw new Error('Não foi possível reconectar cliente para configurar handlers');
        }
        // Aguardar um pouco para garantir que o cliente está pronto
        await new Promise(resolve => setTimeout(resolve, 500));
        client = telegramClient.getClient();
        if (!client) {
          telegramClient.setListenerActive(false);
          throw new Error('Cliente não disponível após reconexão para configurar handlers');
        }
        logger.info(`✅ Cliente obtido após reconexão`);
      }
      
      // Verificar se cliente está realmente conectado antes de configurar handlers
      const finalCheck = client.connected || client._connected;
      if (!finalCheck) {
        logger.warn(`⚠️ Cliente não está marcado como conectado, tentando verificar com getMe()...`);
        try {
          await client.getMe();
          logger.info(`✅ Cliente respondeu ao getMe(), prosseguindo com configuração de handlers`);
        } catch (meError) {
          logger.error(`❌ Cliente não responde ao getMe(): ${meError.message}`);
          // Tentar reconectar uma última vez
          await telegramClient.connect();
          await new Promise(resolve => setTimeout(resolve, 500));
          client = telegramClient.getClient();
          if (!client) {
            telegramClient.setListenerActive(false);
            throw new Error('Cliente não disponível após última tentativa de reconexão');
          }
        }
      }
      
      await this.setupEventHandlers(client);
      
      // IMPORTANTE: Capturar mensagens antigas de todos os canais ao iniciar
      logger.info(`📥 Capturando mensagens antigas de todos os canais...`);
      await this.fetchAllHistoricalMessages(client);

      // Verificar novamente se cliente está conectado após configurar handlers
      const postHandlerCheck = client && (client.connected || client._connected);
      if (!postHandlerCheck) {
        logger.warn(`⚠️ Cliente não está conectado após configurar handlers`);
        logger.warn(`   Tentando reconectar...`);
        await telegramClient.connect();
        // Obter cliente novamente
        const newClient = telegramClient.getClient();
        if (!newClient || (!newClient.connected && !newClient._connected)) {
          throw new Error('Não foi possível manter conexão após configurar handlers');
        }
        client = newClient;
      }

      // Chamar getMe() imediatamente após configurar handlers para garantir que a sessão está ativa
      // Isso ajuda a iniciar o loop de atualizações corretamente
      try {
        logger.info(`📡 Verificando sessão com getMe()...`);
        const me = await client.getMe();
        logger.info(`✅ Sessão verificada e ativa`);
        logger.info(`   Usuário autenticado: ${me.firstName || 'N/A'} ${me.lastName || ''} (@${me.username || 'sem username'})`);
      } catch (getMeError) {
        logger.warn(`⚠️ Erro ao verificar sessão: ${getMeError.message}`);
        logger.warn(`   Continuando mesmo assim...`);
      }

      // IMPORTANTE: Forçar início do loop de atualizações
      // O gramjs deve iniciar automaticamente, mas vamos garantir
      try {
        logger.info(`📡 Verificando se loop de atualizações está ativo...`);
        
        // Aguardar um pouco para o loop iniciar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se o cliente tem handlers registrados
        const handlersCount = client._eventBuilders?.size || 0;
        logger.info(`   Handlers registrados: ${handlersCount}`);
        
        // Verificar se o loop de atualizações está rodando
        if (client._updateLoop) {
          logger.info(`✅ Loop de atualizações detectado e ativo`);
        } else {
          logger.warn(`⚠️ Loop de atualizações não detectado`);
          logger.warn(`   Isso pode significar que não estamos recebendo atualizações`);
          logger.warn(`   O gramjs deve iniciar automaticamente, mas pode haver um problema`);
        }
      } catch (loopCheckError) {
        logger.warn(`⚠️ Erro ao verificar loop de atualizações: ${loopCheckError.message}`);
      }

      this.isRunning = true;
      this.reconnectAttempts = 0;
      
      // Listener já está marcado como ativo (foi feito antes de conectar)
      // Garantir novamente que está marcado
      telegramClient.setListenerActive(true);

      logger.info(`✅ Listener iniciado. Monitorando ${this.monitoredChannels.size} canais.`);
      logger.info(`📡 Cliente conectado: ${client && (client.connected || client._connected) ? '✅ Sim' : '❌ Não'}`);

      // Manter conexão ativa (executar em background sem await)
      this.keepAlive();

      // Iniciar verificação periódica de mensagens (a cada 30 segundos)
      this.startPeriodicPolling(client);

      // Log de confirmação
      logger.info(`🎯 Listener totalmente configurado e pronto para capturar mensagens`);
      logger.info(`   Canais monitorados: ${Array.from(this.monitoredChannels.keys()).join(', ')}`);
      logger.info(`   Verificação periódica: a cada ${this.pollingIntervalMs / 1000} segundos`);
      logger.info(`   ℹ️ Nota: Erros de TIMEOUT do loop de atualizações são normais e não afetam a captura`);
      logger.info(`   ℹ️ O sistema usa verificação periódica como backup para garantir que nenhuma mensagem seja perdida`);

      return true;
    } catch (error) {
      logger.error(`Erro ao iniciar listener: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      this.isRunning = false;
      
      // Marcar listener como inativo
      telegramClient.setListenerActive(false);
      
      // Desconectar se houver cliente
      try {
        await telegramClient.disconnect();
      } catch (disconnectError) {
        // Ignorar erros de desconexão
      }
      
      throw error;
    }
  }

  /**
   * Manter conexão ativa e reconectar se necessário
   */
  async keepAlive() {
    logger.info(`💓 Iniciando keepAlive para manter conexão ativa...`);
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    while (this.isRunning) {
      try {
        await new Promise(resolve => setTimeout(resolve, 60000)); // 60 segundos (aumentado)

        // Verificar se ainda está conectado
        try {
          const client = telegramClient.getClient();
          const isConnected = client && (client.connected || client._connected);
          
          if (!isConnected) {
            consecutiveErrors++;
            logger.warn(`⚠️ Conexão perdida (erro ${consecutiveErrors}/${maxConsecutiveErrors}). Tentando reconectar...`);
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              logger.error(`❌ Muitos erros consecutivos. Parando keepAlive para evitar loops infinitos.`);
              this.stop();
              break;
            }
            
            await this.reconnect();
          } else {
            consecutiveErrors = 0; // Reset contador se conectado
            
            // Chamar getMe() periodicamente para manter a sessão ativa
            // Isso ajuda a evitar que o loop de atualizações pare de receber mensagens
            try {
              await client.getMe();
              logger.debug(`   ✅ Sessão mantida ativa (getMe chamado)`);
            } catch (getMeError) {
              logger.warn(`   ⚠️ Erro ao chamar getMe(): ${getMeError.message}`);
              consecutiveErrors++;
            }
            
            // Reset contador de timeouts se conexão está estável
            if (this.timeoutErrors > 0) {
              this.timeoutErrors = 0;
              logger.debug(`   ✅ Conexão estável, resetando contador de timeouts`);
            }
            
            // Log adicional para debug (menos frequente)
            if (this.eventCount % 100 === 0) {
              if (client._updateLoop) {
                logger.debug(`   ✅ Loop de atualizações ativo (${this.eventCount} eventos, ${this.messageCount} mensagens)`);
              } else {
                logger.debug(`   ℹ️ Loop de atualizações não detectado (pode ser normal se não houver mensagens recentes)`);
              }
            }
          }
        } catch (clientError) {
          consecutiveErrors++;
          logger.warn(`⚠️ Erro ao verificar conexão: ${clientError.message} (erro ${consecutiveErrors}/${maxConsecutiveErrors})`);
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            logger.error(`❌ Muitos erros consecutivos. Parando keepAlive.`);
            this.stop();
            break;
          }
          
          // Aguardar mais tempo antes de tentar reconectar novamente
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
          await this.reconnect();
        }
      } catch (error) {
        consecutiveErrors++;
        logger.error(`Erro no keepAlive: ${error.message} (erro ${consecutiveErrors}/${maxConsecutiveErrors})`);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.error(`❌ Muitos erros consecutivos. Parando keepAlive.`);
          this.stop();
          break;
        }
        
        // Aguardar antes de continuar
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    logger.info(`💓 keepAlive finalizado`);
  }

  /**
   * Reconectar
   */
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Máximo de tentativas de reconexão atingido');
      this.stop();
      return;
    }

    this.reconnectAttempts++;
    logger.info(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      // Desconectar completamente antes de reconectar
      try {
        await telegramClient.disconnect();
        logger.debug(`   ✅ Cliente desconectado`);
      } catch (disconnectError) {
        logger.warn(`   ⚠️ Erro ao desconectar: ${disconnectError.message}`);
        // Continuar mesmo se falhar
      }
      
      // Aguardar mais tempo para garantir que a conexão anterior foi fechada
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
      
      // Limpar cliente antigo
      telegramClient.client = null;
      
      // Recriar cliente
      await telegramClient.loadConfig();
      telegramClient.createClient();
      
      // Conectar
      const connected = await telegramClient.connect();

      if (connected) {
        const client = telegramClient.getClient();
        
        // Verificar se cliente está realmente conectado
        if (!client || (!client.connected && !client._connected)) {
          throw new Error('Cliente não está conectado após reconexão');
        }
        
        // Reconfigurar handlers
        await this.setupEventHandlers(client);
        
        // Recarregar canais
        await this.loadChannels();
        await this.resolveChannelIds(client);
        
        this.reconnectAttempts = 0;
        logger.info('✅ Reconectado com sucesso');
      } else {
        throw new Error('Falha ao conectar após tentativa de reconexão');
      }
    } catch (error) {
      logger.error(`Erro ao reconectar: ${error.message}`);
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  /**
   * Parar listener
   */
  async stop() {
    try {
      if (!this.isRunning) {
        return;
      }

      logger.info('🛑 Parando Telegram Listener...');

      this.isRunning = false;

      // Parar verificação periódica
      this.stopPeriodicPolling();

      // Marcar que o listener não está mais ativo
      telegramClient.setListenerActive(false);

      await telegramClient.disconnect();

      logger.info('✅ Listener parado');
    } catch (error) {
      logger.error(`Erro ao parar listener: ${error.message}`);
    }
  }

  /**
   * Iniciar verificação periódica de mensagens (polling)
   * Verifica a cada 30 segundos se há novas mensagens nos canais ativos
   */
  startPeriodicPolling(client) {
    // Parar intervalo anterior se existir
    this.stopPeriodicPolling();

    logger.info(`🔄 Iniciando verificação periódica de mensagens (a cada ${this.pollingIntervalMs / 1000} segundos)...`);

    this.pollingInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.stopPeriodicPolling();
        return;
      }

      try {
        await this.checkForNewMessages(client);
      } catch (error) {
        logger.error(`Erro na verificação periódica de mensagens: ${error.message}`);
        // Não parar o intervalo por causa de um erro - continuar tentando
      }
    }, this.pollingIntervalMs);

    logger.info(`✅ Verificação periódica iniciada`);
  }

  /**
   * Parar verificação periódica de mensagens
   */
  stopPeriodicPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info(`🛑 Verificação periódica parada`);
    }
  }

  /**
   * Verificar se há novas mensagens nos canais ativos
   * Busca mensagens recentes e processa apenas as novas
   */
  async checkForNewMessages(client) {
    if (!client || (!client.connected && !client._connected)) {
      logger.debug(`⚠️ Cliente não conectado, pulando verificação periódica`);
      return;
    }

    if (this.monitoredChannels.size === 0) {
      logger.debug(`⚠️ Nenhum canal monitorado, pulando verificação periódica`);
      return;
    }

    logger.debug(`🔍 Verificando novas mensagens em ${this.monitoredChannels.size} canal(is)...`);

    let totalNewMessages = 0;

    for (const [channelIdStr, channel] of this.monitoredChannels.entries()) {
      try {
        // Verificar se está no horário de captura configurado
        if (!this.isWithinCaptureSchedule(channel)) {
          continue; // Pular se fora do horário
        }

        // Buscar apenas mensagens muito recentes (últimas 5 mensagens)
        // Isso é mais eficiente que buscar muitas mensagens
        const newMessages = await this.fetchRecentMessages(client, channelIdStr, channel, 5);
        
        if (newMessages && newMessages.length > 0) {
          totalNewMessages += newMessages.length;
          logger.debug(`   ✅ ${newMessages.length} nova(s) mensagem(ns) encontrada(s) no canal ${channel.name || channelIdStr}`);
        }
      } catch (error) {
        logger.warn(`   ⚠️ Erro ao verificar mensagens do canal ${channel.name || channelIdStr}: ${error.message}`);
        // Continuar com próximo canal mesmo se este falhar
      }
    }

    if (totalNewMessages > 0) {
      logger.info(`✅ Verificação periódica: ${totalNewMessages} nova(s) mensagem(ns) processada(s)`);
    } else {
      logger.debug(`   ℹ️ Nenhuma mensagem nova encontrada`);
    }
  }

  /**
   * Buscar mensagens recentes de um canal específico
   * Retorna apenas mensagens mais recentes que last_message_id
   */
  async fetchRecentMessages(client, channelIdStr, channel, limit = 5) {
    try {
      // Obter entidade do canal
      let entity = null;
      
      // Tentar pelo channelId diretamente
      try {
        const channelIdNum = typeof channelIdStr === 'string' ? BigInt(channelIdStr) : channelIdStr;
        entity = await client.getEntity(channelIdNum);
      } catch (idError) {
        // Tentar pelo username se disponível
        if (channel.username) {
          try {
            const username = channel.username.startsWith('@') ? channel.username : `@${channel.username}`;
            entity = await client.getEntity(username);
          } catch (usernameError) {
            logger.debug(`   ⚠️ Não foi possível obter entidade do canal ${channelIdStr}: ${usernameError.message}`);
            return [];
          }
        } else {
          logger.debug(`   ⚠️ Não foi possível obter entidade do canal ${channelIdStr}: ${idError.message}`);
          return [];
        }
      }

      if (!entity) {
        return [];
      }

      // Buscar mensagens recentes
      const messages = await client.getMessages(entity, {
        limit: limit
      });

      if (!messages || messages.length === 0) {
        return [];
      }

      // Filtrar apenas mensagens novas (mais recentes que last_message_id)
      const lastMessageId = channel.last_message_id || 0;
      const newMessages = messages.filter(msg => {
        // Verificar se a mensagem é mais recente que a última processada
        if (!msg.id) return false;
        const msgId = typeof msg.id === 'bigint' ? Number(msg.id) : msg.id;
        
        // Se não temos last_message_id, processar todas
        if (!lastMessageId) return true;
        
        // Processar apenas mensagens mais recentes
        return msgId > lastMessageId;
      });

      // Processar mensagens novas em ordem (mais antigas primeiro)
      for (const msg of newMessages.sort((a, b) => {
        const aId = typeof a.id === 'bigint' ? Number(a.id) : a.id;
        const bId = typeof b.id === 'bigint' ? Number(b.id) : b.id;
        return aId - bId;
      })) {
        try {
          // Verificar se está dentro do período permitido
          if (!this.isMessageWithinTimeRange(msg, channel)) {
            continue;
          }

          await this.processMessage(msg, channelIdStr);
        } catch (processError) {
          logger.warn(`   ⚠️ Erro ao processar mensagem recente: ${processError.message}`);
        }
      }

      return newMessages;
    } catch (error) {
      logger.error(`Erro ao buscar mensagens recentes do canal ${channelIdStr}: ${error.message}`);
      return [];
    }
  }

  /**
   * Garantir que o cliente está inscrito nos canais para receber mensagens
   * IMPORTANTE: Para receber mensagens de canais públicos, o cliente precisa estar "inscrito"
   */
  async ensureChannelSubscription(client) {
    try {
      logger.info(`📡 Verificando inscrição em ${this.monitoredChannels.size} canal(is)...`);
      
      for (const [channelIdStr, channel] of this.monitoredChannels.entries()) {
        try {
          const username = channel.username ? (channel.username.startsWith('@') ? channel.username : `@${channel.username}`) : null;
          
          if (!username) {
            logger.warn(`   ⚠️ Canal ${channelIdStr} sem username, pulando verificação de inscrição`);
            continue;
          }

          logger.debug(`   Verificando inscrição em: ${username} (${channelIdStr})`);
          
          // Tentar obter a entidade do canal
          const entity = await client.getEntity(username);
          
          if (!entity) {
            logger.warn(`   ⚠️ Não foi possível obter entidade de ${username}`);
            continue;
          }

          // Verificar se é um canal público (broadcast)
          if (entity.broadcast) {
            logger.debug(`   ✅ Canal público detectado: ${username}`);
            // Para canais públicos, não precisamos nos inscrever explicitamente
            // Mas vamos tentar obter algumas mensagens para garantir que temos acesso
            try {
              const recentMessages = await client.getMessages(entity, { limit: 1 });
              if (recentMessages && recentMessages.length > 0) {
                logger.debug(`   ✅ Acesso confirmado ao canal ${username} (última mensagem: ${recentMessages[0].id})`);
              } else {
                logger.warn(`   ⚠️ Não foi possível obter mensagens do canal ${username}`);
              }
            } catch (msgError) {
              logger.warn(`   ⚠️ Erro ao verificar acesso ao canal ${username}: ${msgError.message}`);
              // Continuar mesmo se falhar - pode ser que ainda funcione
            }
          } else {
            logger.debug(`   ℹ️ Canal não é público (pode ser grupo): ${username}`);
          }
        } catch (error) {
          logger.warn(`   ⚠️ Erro ao verificar inscrição em ${channel.username || channelIdStr}: ${error.message}`);
          // Continuar com próximo canal mesmo se este falhar
        }
      }
      
      logger.info(`✅ Verificação de inscrição concluída`);
    } catch (error) {
      logger.error(`Erro ao garantir inscrição nos canais: ${error.message}`);
      // Não lançar erro - continuar mesmo se falhar
    }
  }

  /**
   * Buscar mensagens históricas de um canal
   * Útil para capturar mensagens que foram perdidas ou para sincronização inicial
   * Respeita as configurações de capture_mode e platform_filter do canal
   */
  async fetchHistoricalMessages(channelId, limit = 100) {
    try {
      const client = telegramClient.getClient();
      if (!client || (!client.connected && !client._connected)) {
        logger.warn('⚠️ Cliente não conectado para buscar mensagens históricas');
        return [];
      }

      // Obter configurações do canal
      const channel = this.monitoredChannels.get(channelId.toString());
      if (!channel) {
        logger.warn(`⚠️ Canal ${channelId} não encontrado nos canais monitorados`);
        return [];
      }

      // Verificar se está no horário de captura
      if (!this.isWithinCaptureSchedule(channel)) {
        logger.info(`⏰ Fora do horário de captura para o canal ${channel.name || channelId}`);
        return [];
      }

      // Determinar limite baseado no capture_mode
      let messagesLimit = limit;
      let maxDaysBack = null;
      
      if (channel.capture_mode === '1_day') {
        maxDaysBack = 1;
      } else if (channel.capture_mode === '2_days') {
        maxDaysBack = 2;
      } else if (channel.capture_mode === 'new_only') {
        // Para apenas novas, buscar apenas as últimas mensagens
        messagesLimit = Math.min(limit, 50);
      }

      logger.info(`📥 Buscando ${messagesLimit} mensagens históricas do canal ${channelId}...`);
      if (maxDaysBack) {
        logger.info(`   Período: até ${maxDaysBack} dia(s) atrás`);
      }

      // Tentar obter entidade do canal de várias formas
      let entity = null;
      
      // Método 1: Tentar pelo channelId diretamente
      try {
        entity = await client.getEntity(channelId);
      } catch (idError) {
        logger.debug(`   Não foi possível obter entidade pelo ID: ${idError.message}`);
      }
      
      // Método 2: Tentar pelo username se disponível
      if (!entity && channel.username) {
        try {
          const username = channel.username.startsWith('@') ? channel.username : `@${channel.username}`;
          entity = await client.getEntity(username);
          logger.debug(`   Entidade obtida pelo username: ${username}`);
        } catch (usernameError) {
          logger.debug(`   Não foi possível obter entidade pelo username: ${usernameError.message}`);
        }
      }
      
      if (!entity) {
        logger.warn(`⚠️ Não foi possível obter entidade do canal ${channelId}`);
        return [];
      }

      // Buscar mensagens
      const messages = await client.getMessages(entity, {
        limit: messagesLimit
      });

      logger.info(`✅ ${messages.length} mensagens históricas encontradas do canal ${channelId}`);

      // Filtrar mensagens por data se necessário
      let filteredMessages = messages;
      if (maxDaysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxDaysBack);
        
        filteredMessages = messages.filter(msg => {
          if (!msg.date) return false;
          const msgDate = new Date(msg.date * 1000);
          return msgDate >= cutoffDate;
        });
        
        logger.info(`   ${filteredMessages.length} mensagens dentro do período de ${maxDaysBack} dia(s)`);
      }

      // Processar cada mensagem (em ordem reversa para processar as mais antigas primeiro)
      let processedCount = 0;
      for (const msg of filteredMessages.reverse()) {
        try {
          // Verificar se está dentro do período permitido
          if (!this.isMessageWithinTimeRange(msg, channel)) {
            continue;
          }
          
          await this.processMessage(msg, channelId);
          processedCount++;
        } catch (processError) {
          logger.warn(`   ⚠️ Erro ao processar mensagem histórica: ${processError.message}`);
          // Continuar com próxima mensagem
        }
      }

      logger.info(`✅ ${processedCount} mensagens históricas processadas do canal ${channelId}`);
      return filteredMessages;
    } catch (error) {
      logger.error(`Erro ao buscar mensagens históricas do canal ${channelId}: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return [];
    }
  }

  /**
   * Buscar mensagens históricas de todos os canais monitorados
   * Executado automaticamente ao iniciar o listener
   * Respeita as configurações de cada canal (horário, modo, plataforma)
   */
  async fetchAllHistoricalMessages(client, limitPerChannel = 100) {
    try {
      if (!client || (!client.connected && !client._connected)) {
        logger.warn('⚠️ Cliente não conectado para buscar mensagens históricas');
        return;
      }

      const channels = Array.from(this.monitoredChannels.entries());
      logger.info(`📥 Iniciando captura de mensagens antigas de ${channels.length} canal(is)...`);

      let totalMessages = 0;
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const [channelId, channel] of channels) {
        try {
          // Verificar se está no horário de captura
          if (!this.isWithinCaptureSchedule(channel)) {
            logger.info(`⏰ Canal ${channel.name || channelId} fora do horário de captura, pulando...`);
            skippedCount++;
            continue;
          }
          
          // Se o modo é 'new_only', não buscar mensagens antigas
          if (channel.capture_mode === 'new_only') {
            logger.info(`📥 Canal ${channel.name || channelId} configurado para apenas novas mensagens, pulando busca histórica...`);
            skippedCount++;
            continue;
          }
          
          logger.info(`📥 Buscando mensagens antigas do canal: ${channel.name || channel.username || channelId}...`);
          logger.info(`   Modo: ${channel.capture_mode || 'new_only'}`);
          logger.info(`   Filtro plataforma: ${channel.platform_filter || 'all'}`);
          
          const messages = await this.fetchHistoricalMessages(channelId, limitPerChannel);
          totalMessages += messages.length;
          successCount++;
          
          // Pequeno delay entre canais para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          errorCount++;
          logger.error(`   ❌ Erro ao buscar mensagens do canal ${channelId}: ${error.message}`);
          // Continuar com próximo canal mesmo se este falhar
        }
      }

      logger.info(`✅ Captura de mensagens antigas concluída:`);
      logger.info(`   - Canais processados: ${successCount}/${channels.length}`);
      logger.info(`   - Canais pulados: ${skippedCount}`);
      logger.info(`   - Total de mensagens: ${totalMessages}`);
      logger.info(`   - Erros: ${errorCount}`);
    } catch (error) {
      logger.error(`Erro ao buscar mensagens históricas de todos os canais: ${error.message}`);
      // Não lançar erro - continuar mesmo se falhar
    }
  }

  /**
   * Verificar status
   */
  async checkStatus() {
    try {
      let isConnected = false;
      let client = null;

      try {
        client = telegramClient.getClient();
        isConnected = client && (client.connected || client._connected);
      } catch (clientError) {
        // Cliente não existe ou não está inicializado
        logger.debug(`Cliente não disponível: ${clientError.message}`);
        isConnected = false;
      }

      // Determinar status
      let status = 'stopped';
      if (this.isRunning && isConnected) {
        status = 'running';
      } else if (this.isRunning && !isConnected) {
        status = 'disconnected';
      } else {
        status = 'stopped';
      }

      return {
        status: status,
        is_running: this.isRunning,
        is_connected: isConnected,
        channels_monitored: this.monitoredChannels.size,
        events_received: this.eventCount || 0,
        messages_received: this.messageCount || 0,
        error: null
      };
    } catch (error) {
      logger.error(`Erro ao verificar status: ${error.message}`);
      return {
        status: 'error',
        is_running: false,
        is_connected: false,
        channels_monitored: 0,
        error: error.message
      };
    }
  }
}

export default new TelegramListenerService();


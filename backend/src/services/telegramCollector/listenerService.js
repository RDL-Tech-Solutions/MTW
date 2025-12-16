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

class TelegramListenerService {
  constructor() {
    this.isRunning = false;
    this.monitoredChannels = new Map();
    this.pendingChannels = []; // Canais que precisam ter username resolvido
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
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

      const coupon = await Coupon.create(couponData);
      logger.info(`✅ Cupom salvo: ${couponData.code} (${couponData.platform})`);
      
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
          setTimeout(() => reject(new Error('Timeout ao resolver username')), 10000);
        });
        
        const entity = await Promise.race([getEntityPromise, entityTimeout]);
        
        if (!entity) {
          logger.warn(`   ⚠️ Não foi possível resolver: ${username} (entity é null)`);
          continue;
        }
        
        logger.debug(`   ✅ Entity obtido: ${entity.constructor?.name || 'desconhecido'}`);

        // Obter channel_id do entity
        let channelId = null;
        if (entity.id) {
          // Para canais, o ID é negativo (ex: -1001234567890)
          // Converter para string mantendo o sinal negativo
          channelId = entity.id.toString();
          logger.debug(`   Entity ID encontrado: ${channelId} (tipo: ${typeof entity.id})`);
        } else if (entity.channelId) {
          channelId = entity.channelId.toString();
          logger.debug(`   Channel ID encontrado: ${channelId}`);
        }

        if (!channelId) {
          logger.warn(`   ⚠️ Entity não tem ID válido: ${username}`);
          logger.warn(`   Entity keys: ${Object.keys(entity).join(', ')}`);
          continue;
        }

        // Garantir que o channelId seja negativo para canais (formato do Telegram)
        // Canais públicos têm IDs negativos começando com -100
        if (!channelId.startsWith('-') && entity.broadcast) {
          channelId = `-100${channelId}`;
          logger.debug(`   Ajustado channelId para formato de canal: ${channelId}`);
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
      
      // Buscar canal com comparação flexível de IDs
      let channel = this.monitoredChannels.get(channelIdStr);
      
      if (!channel) {
        // Tentar normalizar e buscar novamente
        const normalizedChatId = channelIdStr.replace(/^-/, '');
        for (const [monitoredId, ch] of this.monitoredChannels.entries()) {
          const normalizedMonitoredId = monitoredId.toString().replace(/^-/, '');
          if (normalizedChatId === normalizedMonitoredId || channelIdStr === monitoredId.toString()) {
            channel = ch;
            break;
          }
        }
      }
      
      if (!channel) {
        logger.debug(`📭 Mensagem de canal não monitorado: ${channelIdStr}`);
        return;
      }

      logger.info(`   Canal: ${channel.name || 'Sem nome'} (@${channel.username || channelIdStr})`);

      // Obter texto da mensagem
      let text = '';
      if (message.message) {
        text = message.message;
      } else if (message.text) {
        text = message.text;
      } else if (message.rawText) {
        text = message.rawText;
      }

      logger.debug(`   Texto da mensagem: ${text ? text.substring(0, 100) + '...' : 'vazio'}`);

      if (!text || text.trim().length < 10) {
        logger.debug(`   Mensagem muito curta ou vazia, ignorando`);
        return;
      }

      // Obter ID da mensagem
      const messageId = message.id || message.messageId || Date.now();

      // Extrair informações do cupom
      logger.debug(`   Extraindo informações do cupom...`);
      const couponData = couponExtractor.extractCouponInfo(
        text,
        messageId,
        channel.username || channel.name
      );

      if (!couponData) {
        logger.debug(`   Nenhum cupom detectado na mensagem`);
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
    
    // Verificar se cliente está conectado
    if (!client) {
      throw new Error('Cliente não disponível para configurar handlers');
    }
    
    const isConnected = client.connected || client._connected;
    if (!isConnected) {
      logger.warn(`⚠️ Cliente não está conectado ao configurar handlers`);
      logger.warn(`   Tentando conectar...`);
      await telegramClient.connect();
      // Obter cliente novamente
      const newClient = telegramClient.getClient();
      if (!newClient || (!newClient.connected && !newClient._connected)) {
        throw new Error('Não foi possível conectar cliente para configurar handlers');
      }
      client = newClient;
    }
    
    logger.info(`✅ Cliente conectado e pronto para receber eventos`);
    
    const { NewMessage } = await import('telegram/events/index.js');

    // Converter channel_ids para números (canais têm IDs negativos)
    const channelIds = Array.from(this.monitoredChannels.keys()).map(id => {
      // Se já é número, usar direto; se é string, converter
      const numId = typeof id === 'string' ? BigInt(id) : id;
      return numId;
    });

    logger.info(`📡 Configurando handlers para ${channelIds.length} canal(is)...`);
    logger.info(`   IDs dos canais: ${channelIds.map(id => id.toString()).join(', ')}`);

    // Handler para novas mensagens - usar filtro mais amplo primeiro para debug
    logger.info(`📡 Registrando handler de eventos...`);
    
    const handler = async (event) => {
      try {
        logger.info(`📨 EVENTO RECEBIDO: ${event.constructor?.name || 'desconhecido'}`);
        
        const message = event.message;
        if (!message) {
          logger.debug('📭 Evento sem mensagem, ignorando');
          return;
        }

        logger.info(`📨 Nova mensagem recebida!`);

        // Obter ID do chat/canal de várias formas
        let chatId = null;
        
        // Tentar obter do peerId
        if (message.peerId) {
          if (message.peerId.channelId !== undefined) {
            chatId = message.peerId.channelId.toString();
            logger.debug(`   Canal ID do peerId.channelId: ${chatId}`);
          } else if (message.peerId.chatId !== undefined) {
            chatId = message.peerId.chatId.toString();
            logger.debug(`   Chat ID do peerId.chatId: ${chatId}`);
          } else if (message.peerId.userId !== undefined) {
            // Mensagem de usuário, ignorar
            logger.debug(`   Mensagem de usuário, ignorando`);
            return;
          }
        }

        // Tentar obter do chatId da mensagem
        if (!chatId && message.chatId) {
          chatId = message.chatId.toString();
          logger.debug(`   Chat ID da mensagem: ${chatId}`);
        }

        // Tentar obter do chat da mensagem
        if (!chatId && message.chat) {
          if (message.chat.id) {
            chatId = message.chat.id.toString();
            logger.debug(`   Chat ID do objeto chat: ${chatId}`);
          }
        }

        if (!chatId) {
          logger.debug(`   ⚠️ Não foi possível obter ID do chat/canal da mensagem`);
          return;
        }

        logger.debug(`   🔍 Verificando se canal ${chatId} está sendo monitorado...`);
        logger.debug(`   Canais monitorados: ${Array.from(this.monitoredChannels.keys()).join(', ')}`);

        // Normalizar chatId para comparação (remover sinal negativo temporariamente para comparação)
        const normalizedChatId = chatId.replace(/^-/, '');
        let foundChannel = null;
        
        // Verificar se o canal está sendo monitorado (comparação flexível)
        for (const [monitoredId, channel] of this.monitoredChannels.entries()) {
          const normalizedMonitoredId = monitoredId.toString().replace(/^-/, '');
          if (normalizedChatId === normalizedMonitoredId || chatId === monitoredId.toString()) {
            foundChannel = channel;
            break;
          }
        }

        if (foundChannel) {
          logger.info(`✅ Mensagem de canal monitorado detectada: ${chatId} (${foundChannel.name || foundChannel.username})`);
          await this.processMessage(message, chatId);
        } else {
          logger.debug(`   📭 Mensagem de canal não monitorado: ${chatId}`);
          logger.debug(`   Tentando normalizar: ${normalizedChatId}`);
        }
      } catch (error) {
        logger.error(`❌ Erro no handler de mensagens: ${error.message}`);
        logger.error(`   Stack: ${error.stack}`);
      }
    };
    
    // Registrar handler com NewMessage
    try {
      client.addEventHandler(handler, new NewMessage({})); // Sem filtro para capturar todas as mensagens primeiro (para debug)
      logger.info(`✅ Handler registrado com sucesso`);
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

      const client = telegramClient.getClient();
      
      // Verificar se cliente está realmente conectado
      if (!client || (!client.connected && !client._connected)) {
        logger.warn(`⚠️ Cliente não está marcado como conectado, mas continuando...`);
      } else {
        logger.info(`✅ Cliente conectado e pronto para uso`);
      }
      
      // IMPORTANTE: Não desconectar o cliente - o listener precisa manter a conexão aberta
      logger.info(`📡 Mantendo conexão aberta para receber atualizações...`);

      // Carregar canais e resolver usernames para channel_id
      await this.loadChannels();
      await this.resolveChannelIds(client);

      if (this.monitoredChannels.size === 0) {
        logger.warn('⚠️ Nenhum canal ativo encontrado após resolução');
        logger.warn('   Verifique se os canais estão ativos e têm username válido');
        // Não marcar como running se não há canais
        this.isRunning = false;
        throw new Error('Nenhum canal ativo encontrado. Adicione canais e certifique-se de que têm username válido.');
      }

      // Configurar handlers ANTES de marcar como running
      await this.setupEventHandlers(client);

      // Verificar novamente se cliente está conectado após configurar handlers
      const finalCheck = client && (client.connected || client._connected);
      if (!finalCheck) {
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
        await client.getMe();
        logger.info(`✅ Sessão verificada e ativa`);
      } catch (getMeError) {
        logger.warn(`⚠️ Erro ao verificar sessão: ${getMeError.message}`);
        logger.warn(`   Continuando mesmo assim...`);
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

      // Log de confirmação
      logger.info(`🎯 Listener totalmente configurado e pronto para capturar mensagens`);
      logger.info(`   Canais monitorados: ${Array.from(this.monitoredChannels.keys()).join(', ')}`);

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
    
    while (this.isRunning) {
      try {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos

        // Verificar se ainda está conectado
        try {
          const client = telegramClient.getClient();
          const isConnected = client && (client.connected || client._connected);
          
          if (!isConnected) {
            logger.warn('⚠️ Conexão perdida. Tentando reconectar...');
            await this.reconnect();
          } else {
            logger.info(`💓 Conexão ativa - ${this.monitoredChannels.size} canais sendo monitorados`);
            
            // Chamar getMe() periodicamente para manter a sessão ativa
            // Isso ajuda a evitar que o loop de atualizações pare de receber mensagens
            try {
              await client.getMe();
              logger.debug(`   ✅ Sessão mantida ativa (getMe chamado)`);
            } catch (getMeError) {
              logger.warn(`   ⚠️ Erro ao chamar getMe(): ${getMeError.message}`);
            }
            
            // Log adicional para debug
            if (client._updateLoop) {
              logger.debug(`   ✅ Loop de atualizações ativo`);
            } else {
              logger.warn(`   ⚠️ Loop de atualizações não detectado`);
            }
          }
        } catch (clientError) {
          logger.warn(`⚠️ Erro ao verificar conexão: ${clientError.message}`);
          logger.warn(`   Tentando reconectar...`);
          await this.reconnect();
        }
      } catch (error) {
        logger.error(`Erro no keepAlive: ${error.message}`);
        // Continuar mesmo com erro para não parar o keepAlive
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
      await telegramClient.disconnect();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Aguardar 5 segundos
      
      await telegramClient.loadConfig();
      telegramClient.createClient();
      const connected = await telegramClient.connect();

      if (connected) {
        const client = telegramClient.getClient();
        await this.setupEventHandlers(client);
        this.reconnectAttempts = 0;
        logger.info('✅ Reconectado com sucesso');
      }
    } catch (error) {
      logger.error(`Erro ao reconectar: ${error.message}`);
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
      
      // Marcar que o listener não está mais ativo
      telegramClient.setListenerActive(false);
      
      await telegramClient.disconnect();
      
      logger.info('✅ Listener parado');
    } catch (error) {
      logger.error(`Erro ao parar listener: ${error.message}`);
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


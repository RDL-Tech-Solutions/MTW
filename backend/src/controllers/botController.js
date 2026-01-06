import BotChannel from '../models/BotChannel.js';
import BotConfig from '../models/BotConfig.js';
import NotificationLog from '../models/NotificationLog.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import whatsappService from '../services/bots/whatsappService.js';
import telegramService from '../services/bots/telegramService.js';
import logger from '../config/logger.js';
import axios from 'axios';

class BotController {
  // Listar todos os canais de bot
  async listChannels(req, res) {
    try {
      const { platform, is_active } = req.query;

      const filters = {};
      if (platform) filters.platform = platform;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const channels = await BotChannel.findAll(filters);

      res.json({
        success: true,
        data: channels
      });
    } catch (error) {
      logger.error(`Erro ao listar canais: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar canais',
        error: error.message
      });
    }
  }

  // Criar novo canal de bot
  async createChannel(req, res) {
    try {
      const { platform, identifier, name, is_active, only_coupons, category_filter } = req.body;

      // Validar dados
      if (!platform || !identifier) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma e identificador são obrigatórios'
        });
      }

      if (!['whatsapp', 'telegram'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida. Use "whatsapp" ou "telegram"'
        });
      }

      // Validar category_filter (deve ser array com máximo 2 categorias)
      if (category_filter !== undefined && category_filter !== null) {
        let categories = category_filter;
        if (typeof category_filter === 'string') {
          try {
            categories = JSON.parse(category_filter);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'category_filter deve ser um array JSON válido'
            });
          }
        }

        if (!Array.isArray(categories)) {
          return res.status(400).json({
            success: false,
            message: 'category_filter deve ser um array'
          });
        }

        if (categories.length > 10) {
          return res.status(400).json({
            success: false,
            message: 'category_filter pode ter no máximo 10 categorias'
          });
        }
      }

      // Verificar se já existe
      const existing = await BotChannel.findByPlatformAndIdentifier(platform, identifier);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Canal já cadastrado para esta plataforma e identificador'
        });
      }

      const channel = await BotChannel.create({
        platform,
        identifier,
        name,
        is_active,
        only_coupons: only_coupons || false,
        category_filter: category_filter || null
      });

      res.status(201).json({
        success: true,
        message: 'Canal criado com sucesso',
        data: channel
      });
    } catch (error) {
      logger.error(`Erro ao criar canal: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar canal',
        error: error.message
      });
    }
  }

  // Atualizar canal de bot
  async updateChannel(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validar category_filter se fornecido
      if (updates.category_filter !== undefined && updates.category_filter !== null) {
        let categories = updates.category_filter;
        if (typeof updates.category_filter === 'string') {
          try {
            categories = JSON.parse(updates.category_filter);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'category_filter deve ser um array JSON válido'
            });
          }
        }

        if (!Array.isArray(categories)) {
          return res.status(400).json({
            success: false,
            message: 'category_filter deve ser um array'
          });
        }

        if (categories.length > 10) {
          return res.status(400).json({
            success: false,
            message: 'category_filter pode ter no máximo 10 categorias'
          });
        }

        updates.category_filter = categories;
      }

      const channel = await BotChannel.update(id, updates);

      res.json({
        success: true,
        message: 'Canal atualizado com sucesso',
        data: channel
      });
    } catch (error) {
      logger.error(`Erro ao atualizar canal: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar canal',
        error: error.message
      });
    }
  }

  // Deletar canal de bot
  async deleteChannel(req, res) {
    try {
      const { id } = req.params;

      await BotChannel.delete(id);

      res.json({
        success: true,
        message: 'Canal deletado com sucesso'
      });
    } catch (error) {
      logger.error(`Erro ao deletar canal: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar canal',
        error: error.message
      });
    }
  }

  // Ativar/Desativar canal
  async toggleChannel(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const channel = is_active
        ? await BotChannel.activate(id)
        : await BotChannel.deactivate(id);

      res.json({
        success: true,
        message: `Canal ${is_active ? 'ativado' : 'desativado'} com sucesso`,
        data: channel
      });
    } catch (error) {
      logger.error(`Erro ao alterar status do canal: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar status do canal',
        error: error.message
      });
    }
  }

  // Enviar mensagem de teste
  async sendTest(req, res) {
    try {
      const { channelId, message } = req.body;

      if (channelId) {
        // Testar canal específico
        const channel = await BotChannel.findById(channelId);

        if (!channel) {
          return res.status(404).json({
            success: false,
            message: 'Canal não encontrado'
          });
        }

        let result;
        const testMessage = message || `🤖 *Teste de Bot*\n\n✅ Bot configurado e funcionando!\n⏰ ${new Date().toLocaleString('pt-BR')}`;

        if (channel.platform === 'whatsapp') {
          // Converter formatação para WhatsApp
          const templateRenderer = (await import('../services/bots/templateRenderer.js')).default;
          const convertedMessage = templateRenderer.convertBoldFormatting(testMessage, 'whatsapp');
          result = await whatsappService.sendMessage(channel.identifier, convertedMessage);
        } else if (channel.platform === 'telegram') {
          // Buscar parse_mode e converter formatação
          const BotConfig = (await import('../models/BotConfig.js')).default;
          const botConfig = await BotConfig.get();
          const parseMode = botConfig.telegram_parse_mode || 'HTML';
          const finalParseMode = (parseMode === 'Markdown' || parseMode === 'MarkdownV2') ? 'HTML' : parseMode;

          const templateRenderer = (await import('../services/bots/templateRenderer.js')).default;
          const convertedMessage = templateRenderer.convertBoldFormatting(testMessage, 'telegram', finalParseMode);

          result = await telegramService.sendMessage(channel.identifier, convertedMessage, {
            parse_mode: finalParseMode
          });
        }

        res.json({
          success: true,
          message: 'Mensagem de teste enviada',
          data: result
        });
      } else {
        // Testar todos os canais ativos
        const testMessage = message || `🤖 *Teste de Bot*\n\n✅ Bot configurado e funcionando!\n⏰ ${new Date().toLocaleString('pt-BR')}`;

        if (message) {
          // Se há mensagem customizada, enviar para todos os canais
          const result = await notificationDispatcher.sendCustomMessageToAllChannels(testMessage);
          res.json({
            success: true,
            message: 'Mensagens de teste enviadas para todos os canais',
            data: result
          });
        } else {
          // Usar método padrão
          const result = await notificationDispatcher.sendTestToAllChannels();
          res.json({
            success: true,
            message: 'Mensagens de teste enviadas para todos os canais',
            data: result
          });
        }
      }
    } catch (error) {
      logger.error(`Erro ao enviar teste: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem de teste',
        error: error.message
      });
    }
  }

  // Listar logs de notificações
  async listLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        event_type,
        platform,
        status,
        start_date,
        end_date
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (event_type) filters.event_type = event_type;
      if (platform) filters.platform = platform;
      if (status) filters.status = status;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const result = await NotificationLog.findAll(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao listar logs: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar logs',
        error: error.message
      });
    }
  }

  // Obter estatísticas de notificações
  async getStats(req, res) {
    try {
      const { start_date, end_date, platform } = req.query;

      const filters = {};
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;
      if (platform) filters.platform = platform;

      const stats = await NotificationLog.getStats(filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Erro ao obter estatísticas: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: error.message
      });
    }
  }

  // Verificar status dos bots
  async checkStatus(req, res) {
    try {
      const config = await BotConfig.get();

      const status = {
        whatsapp: {
          configured: config.whatsapp_enabled && !!config.whatsapp_api_token,
          enabled: config.whatsapp_enabled,
          channels: await BotChannel.countActive('whatsapp')
        },
        telegram: {
          configured: config.telegram_enabled && !!config.telegram_bot_token,
          enabled: config.telegram_enabled,
          channels: await BotChannel.countActive('telegram')
        }
      };

      // Verificar se Telegram está funcionando
      if (status.telegram.configured) {
        try {
          // Usar apenas token do banco de dados
          const token = config.telegram_bot_token;
          if (!token) {
            status.telegram.working = false;
            status.telegram.error = 'Token não configurado no banco de dados';
          } else {
            const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, {
              timeout: 5000
            });
            status.telegram.bot_info = response.data.result;
            status.telegram.working = true;
          }
        } catch (error) {
          status.telegram.working = false;
          status.telegram.error = error.message;
        }
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error(`Erro ao verificar status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status',
        error: error.message
      });
    }
  }

  // ============================================
  // CONFIGURAÇÕES
  // ============================================

  // Buscar configurações
  async getConfig(req, res) {
    try {
      const config = await BotConfig.get();

      // Mascarar tokens sensíveis para exibição
      const safeConfig = {
        ...config,
        telegram_bot_token: config.telegram_bot_token
          ? `${config.telegram_bot_token.substring(0, 10)}...${config.telegram_bot_token.slice(-5)}`
          : '',
        whatsapp_api_token: config.whatsapp_api_token
          ? `${config.whatsapp_api_token.substring(0, 10)}...${config.whatsapp_api_token.slice(-5)}`
          : '',
        // Indicar se está configurado
        telegram_token_set: !!config.telegram_bot_token,
        whatsapp_token_set: !!config.whatsapp_api_token
      };

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      logger.error(`Erro ao buscar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações',
        error: error.message
      });
    }
  }

  // Salvar configurações
  async saveConfig(req, res) {
    try {
      const configData = req.body;

      // Campos válidos na tabela bot_config
      const validFields = [
        'telegram_enabled',
        'telegram_bot_token',
        'telegram_bot_username',
        'telegram_parse_mode',
        'telegram_disable_preview',
        'whatsapp_enabled',
        'whatsapp_api_url',
        'whatsapp_api_token',
        'whatsapp_phone_number_id',
        'whatsapp_business_account_id',
        'notify_new_products',
        'notify_new_coupons',
        'notify_expired_coupons',
        'notify_price_drops',
        'min_discount_to_notify',
        'message_template_product',
        'message_template_coupon',
        'rate_limit_per_minute',
        'delay_between_messages'
      ];

      // Filtrar apenas campos válidos
      const filteredData = {};
      for (const field of validFields) {
        if (configData[field] !== undefined) {
          filteredData[field] = configData[field];
        }
      }

      // Se o token vier mascarado (com ...), não atualizar
      if (filteredData.telegram_bot_token && filteredData.telegram_bot_token.includes('...')) {
        delete filteredData.telegram_bot_token;
      }
      if (filteredData.whatsapp_api_token && filteredData.whatsapp_api_token.includes('...')) {
        delete filteredData.whatsapp_api_token;
      }

      const config = await BotConfig.upsert(filteredData);

      // Limpar cache das configurações se foram atualizadas
      if (filteredData.telegram_bot_token !== undefined) {
        telegramService.clearTokenCache();
        logger.info('🔄 Cache do token do Telegram limpo (novo token será carregado na próxima requisição)');
      }

      // Limpar cache do WhatsApp se foi atualizado
      if (filteredData.whatsapp_api_url !== undefined ||
        filteredData.whatsapp_api_token !== undefined ||
        filteredData.whatsapp_phone_number_id !== undefined) {
        whatsappService.clearConfigCache();
        logger.info('🔄 Cache das configurações do WhatsApp limpo (novas configurações serão carregadas na próxima requisição)');
      }

      logger.info('⚙️ Configurações de bots atualizadas');

      res.json({
        success: true,
        message: 'Configurações salvas com sucesso',
        data: config
      });
    } catch (error) {
      logger.error(`Erro ao salvar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar configurações',
        error: error.message
      });
    }
  }

  // Testar conexão do Telegram
  async testTelegram(req, res) {
    try {
      const { token } = req.body;

      // Usar token fornecido ou buscar do banco/env
      let botToken = token;

      // Se token não fornecido ou é mascarado, buscar do banco
      if (!botToken || botToken.includes('...')) {
        const config = await BotConfig.get();
        // Usar apenas token do banco de dados
        botToken = config.telegram_bot_token;
      }

      if (!botToken) {
        return res.status(400).json({
          success: false,
          message: 'Token do Telegram não configurado no banco de dados. Vá em Configurações e salve o token primeiro.'
        });
      }

      // Verificar se ainda é um token mascarado (erro de lógica)
      if (botToken.includes('...')) {
        return res.status(400).json({
          success: false,
          message: 'Token salvo está mascarado. Por favor, insira o token completo novamente.'
        });
      }

      logger.info(`🔍 Testando conexão Telegram com token: ${botToken.substring(0, 10)}...`);

      // Testar conexão
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, {
        timeout: 10000
      });

      const botInfo = response.data.result;

      logger.info(`✅ Telegram conectado: @${botInfo.username}`);

      res.json({
        success: true,
        message: 'Conexão com Telegram bem sucedida!',
        data: {
          bot_id: botInfo.id,
          bot_name: botInfo.first_name,
          bot_username: botInfo.username,
          can_join_groups: botInfo.can_join_groups,
          can_read_all_group_messages: botInfo.can_read_all_group_messages
        }
      });
    } catch (error) {
      logger.error(`Erro ao testar Telegram: ${error.message}`);

      let errorMessage = 'Erro ao conectar com o Telegram';
      if (error.response?.status === 401) {
        errorMessage = 'Token inválido. Verifique se o token está correto.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Bot não encontrado. Verifique se o token está correto e completo.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout na conexão. Tente novamente.';
      }

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
  }

  // Testar conexão do WhatsApp
  async testWhatsApp(req, res) {
    try {
      const { api_url, api_token, phone_number_id } = req.body;

      // Usar valores fornecidos ou buscar do banco
      let config = { api_url, api_token, phone_number_id };

      if (!api_url || !api_token) {
        const savedConfig = await BotConfig.get();
        // Usar apenas configurações do banco de dados
        config = {
          api_url: api_url || savedConfig.whatsapp_api_url,
          api_token: api_token || savedConfig.whatsapp_api_token,
          phone_number_id: phone_number_id || savedConfig.whatsapp_phone_number_id
        };
      }

      if (!config.api_url || !config.api_token) {
        return res.status(400).json({
          success: false,
          message: 'Configurações do WhatsApp não encontradas'
        });
      }

      // Testar conexão - verificar número de telefone
      const response = await axios.get(
        `${config.api_url}/${config.phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${config.api_token}`
          },
          timeout: 10000
        }
      );

      res.json({
        success: true,
        message: 'Conexão com WhatsApp bem sucedida!',
        data: {
          phone_number_id: response.data.id,
          display_phone_number: response.data.display_phone_number,
          verified_name: response.data.verified_name
        }
      });
    } catch (error) {
      logger.error(`Erro ao testar WhatsApp: ${error.message}`);

      let errorMessage = 'Erro ao conectar com o WhatsApp';
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Token inválido ou sem permissão.';
      }

      res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }
  }

  // Enviar mensagem de teste para canal específico
  async sendTestToChannel(req, res) {
    try {
      const { id } = req.params;

      const channel = await BotChannel.findById(id);
      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Canal não encontrado'
        });
      }

      // Usar identifier ou channel_id
      const channelId = channel.identifier || channel.channel_id;
      const channelName = channel.name || channel.channel_name || 'Canal';

      const config = await BotConfig.get();
      let result;

      if (channel.platform === 'telegram') {
        // Usar apenas token do banco de dados
        const token = config.telegram_bot_token;
        if (!token) {
          return res.status(400).json({
            success: false,
            message: 'Token do Telegram não configurado no banco de dados. Vá em Configurações e salve o token primeiro.'
          });
        }

        logger.info(`📱 Usando token do banco de dados`);

        logger.info(`📤 Enviando teste para Telegram: ${channelId}`);

        const message = `🤖 *Teste de Bot Telegram*

✅ Bot configurado e funcionando!
📱 Sistema PreçoCerto
⏰ ${new Date().toLocaleString('pt-BR')}
🆔 Canal: ${channelName}

Você receberá notificações automáticas sobre:
🔥 Novas promoções
🎟 Novos cupons
⏰ Cupons expirando`;

        try {
          const response = await axios.post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              chat_id: channelId,
              text: message,
              parse_mode: 'Markdown'
            },
            { timeout: 10000 }
          );

          result = {
            platform: 'telegram',
            message_id: response.data.result.message_id
          };

          logger.info(`✅ Mensagem enviada com sucesso para ${channelId}`);
        } catch (telegramError) {
          // Tratar erros específicos do Telegram
          const errorCode = telegramError.response?.data?.error_code;
          const errorDescription = telegramError.response?.data?.description || telegramError.message;
          const errorMessage = telegramError.response?.data?.description || telegramError.message;

          logger.error(`❌ Erro Telegram: ${errorDescription}`);
          logger.error(`   Error Code: ${errorCode}`);
          logger.error(`   Chat ID usado: ${channelId}`);
          logger.error(`   Token usado: ${token ? token.substring(0, 10) + '...' : 'não configurado'}`);

          let userMessage = 'Erro ao enviar mensagem';

          // Erro 401 - Unauthorized (token inválido ou bot não autorizado)
          if (errorCode === 401 || errorDescription.includes('Unauthorized') || errorMessage.includes('Unauthorized')) {
            userMessage = 'Token do bot inválido ou bot não autorizado. Verifique: 1) Se o token está correto nas configurações, 2) Se o bot foi iniciado com @BotFather, 3) Se o bot tem permissões para enviar mensagens.';
          }
          // Erro 400 - Bad Request
          else if (errorCode === 400) {
            if (errorDescription.includes('chat not found') || errorDescription.includes('Chat not found')) {
              userMessage = 'Chat não encontrado. Verifique: 1) Se o Chat ID está correto, 2) Se o bot foi adicionado ao grupo/canal, 3) Se o bot tem permissões de administrador (para canais).';
            } else if (errorDescription.includes('bot was blocked')) {
              userMessage = 'O bot foi bloqueado pelo usuário. Desbloqueie o bot para continuar.';
            } else if (errorDescription.includes('bot is not a member') || errorDescription.includes('not enough rights')) {
              userMessage = 'O bot não é membro do grupo ou não tem permissões. Adicione o bot ao grupo/canal e dê permissões de administrador (para canais).';
            } else if (errorDescription.includes('PEER_ID_INVALID')) {
              userMessage = 'ID do chat inválido. Para grupos, use o formato -100XXXXXXXXXX. Para canais, use o formato -100XXXXXXXXXX ou @username.';
            } else if (errorDescription.includes('group chat was upgraded')) {
              userMessage = 'O grupo foi convertido em supergrupo. O Chat ID mudou, obtenha o novo ID.';
            } else {
              userMessage = `Erro do Telegram (400): ${errorDescription}`;
            }
          }
          // Erro 403 - Forbidden
          else if (errorCode === 403) {
            userMessage = 'Acesso negado. O bot não tem permissões para enviar mensagens neste chat. Verifique se o bot é administrador (para canais) ou se tem permissões de envio de mensagens.';
          }
          // Outros erros
          else {
            userMessage = `Erro do Telegram (${errorCode || 'desconhecido'}): ${errorDescription}`;
          }

          return res.status(400).json({
            success: false,
            message: userMessage,
            error: errorDescription,
            error_code: errorCode
          });
        }
      } else if (channel.platform === 'whatsapp') {
        // Usar apenas configurações do banco de dados
        const whatsappConfig = {
          apiUrl: config.whatsapp_api_url,
          apiToken: config.whatsapp_api_token,
          phoneNumberId: config.whatsapp_phone_number_id
        };

        if (!whatsappConfig.apiUrl || !whatsappConfig.apiToken) {
          return res.status(400).json({
            success: false,
            message: 'WhatsApp não configurado'
          });
        }

        const message = `🤖 *Teste de Bot WhatsApp*

✅ Bot configurado e funcionando!
📱 Sistema PreçoCerto
⏰ ${new Date().toLocaleString('pt-BR')}
🆔 Canal: ${channelName}`;

        const response = await axios.post(
          `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: channelId,
            type: 'text',
            text: { body: message }
          },
          {
            headers: {
              'Authorization': `Bearer ${whatsappConfig.apiToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        result = {
          platform: 'whatsapp',
          message_id: response.data.messages?.[0]?.id
        };
      }

      // Registrar log (usando promotion_new até migration ser executada)
      await NotificationLog.create({
        channel_id: channel.id,
        channel_name: channelName,
        platform: channel.platform,
        event_type: 'promotion_new', // TODO: mudar para 'test' após executar migration 005
        success: true,
        message_id: result?.message_id,
        payload: { type: 'test_message', channel_identifier: channelId, is_test: true }
      });

      res.json({
        success: true,
        message: 'Mensagem de teste enviada com sucesso!',
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao enviar teste: ${error.message}`);

      // Registrar falha no log
      try {
        if (channel) {
          await NotificationLog.create({
            channel_id: channel.id,
            channel_name: channelName,
            platform: channel.platform,
            event_type: 'promotion_new', // TODO: mudar para 'test' após executar migration 005
            success: false,
            error_message: error.message,
            payload: { type: 'test_message_failed', error: error.message, is_test: true }
          });
        }
      } catch (logError) {
        logger.error(`Erro ao registrar log: ${logError.message}`);
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem de teste',
        error: error.message
      });
    }
  }
}

export default new BotController();

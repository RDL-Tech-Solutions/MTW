import BotChannel from '../models/BotChannel.js';
import NotificationLog from '../models/NotificationLog.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import whatsappService from '../services/bots/whatsappService.js';
import telegramService from '../services/bots/telegramService.js';
import logger from '../config/logger.js';

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
      const { platform, identifier, name, is_active } = req.body;

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
        is_active
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
      const { channelId } = req.body;

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
        if (channel.platform === 'whatsapp') {
          result = await whatsappService.sendTestMessage(channel.identifier);
        } else if (channel.platform === 'telegram') {
          result = await telegramService.sendTestMessage(channel.identifier);
        }

        res.json({
          success: true,
          message: 'Mensagem de teste enviada',
          data: result
        });
      } else {
        // Testar todos os canais ativos
        const result = await notificationDispatcher.sendTestToAllChannels();

        res.json({
          success: true,
          message: 'Mensagens de teste enviadas para todos os canais',
          data: result
        });
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
      const status = {
        whatsapp: {
          configured: !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN),
          channels: await BotChannel.countActive('whatsapp')
        },
        telegram: {
          configured: !!process.env.TELEGRAM_BOT_TOKEN,
          channels: await BotChannel.countActive('telegram')
        }
      };

      // Verificar se Telegram está funcionando
      if (status.telegram.configured) {
        try {
          status.telegram.bot_info = await telegramService.getBotInfo();
          status.telegram.working = true;
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
}

export default new BotController();

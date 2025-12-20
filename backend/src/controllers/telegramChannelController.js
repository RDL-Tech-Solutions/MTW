import TelegramChannel from '../models/TelegramChannel.js';
import Coupon from '../models/Coupon.js';
import logger from '../config/logger.js';
import couponAnalyzer from '../ai/couponAnalyzer.js';

class TelegramChannelController {
  /**
   * Listar todos os canais
   * GET /api/telegram-channels
   */
  async list(req, res) {
    try {
      const { is_active, search } = req.query;
      
      const channels = await TelegramChannel.findAll({
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        search
      });

      // Adicionar informações sobre IA
      const aiEnabled = await couponAnalyzer.isEnabled();
      
      // Contar cupons extraídos via IA
      let aiCouponsCount = 0;
      try {
        const result = await Coupon.findAll({
          capture_source: 'telegram_ai',
          limit: 1000
        });
        aiCouponsCount = result?.coupons?.length || result?.total || 0;
      } catch (error) {
        logger.warn(`Erro ao contar cupons de IA: ${error.message}`);
      }

      res.json({
        success: true,
        data: channels,
        ai: {
          enabled: aiEnabled,
          coupons_extracted: aiCouponsCount
        }
      });
    } catch (error) {
      logger.error(`Erro ao listar canais Telegram: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar canais',
        error: error.message
      });
    }
  }

  /**
   * Buscar canais ativos
   * GET /api/telegram-channels/active
   */
  async listActive(req, res) {
    try {
      const channels = await TelegramChannel.findActive();

      res.json({
        success: true,
        data: channels
      });
    } catch (error) {
      logger.error(`Erro ao listar canais ativos: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar canais ativos',
        error: error.message
      });
    }
  }

  /**
   * Buscar canal por ID
   * GET /api/telegram-channels/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const channel = await TelegramChannel.findById(id);

      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Canal não encontrado'
        });
      }

      res.json({
        success: true,
        data: channel
      });
    } catch (error) {
      logger.error(`Erro ao buscar canal: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar canal',
        error: error.message
      });
    }
  }

  /**
   * Criar novo canal
   * POST /api/telegram-channels
   */
  async create(req, res) {
    try {
      const { name, username, channel_id, is_active, example_messages, capture_schedule_start, capture_schedule_end, capture_mode, platform_filter } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nome é obrigatório'
        });
      }

      // Validar que pelo menos username ou channel_id seja fornecido
      if (!username && !channel_id) {
        return res.status(400).json({
          success: false,
          message: 'Username ou ID do canal são obrigatórios. Para canais públicos use username, para canais privados use channel_id'
        });
      }

      // Verificar se já existe por username (se fornecido)
      if (username) {
        const existing = await TelegramChannel.findByUsername(username);
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Canal já cadastrado com este username'
          });
        }
      }

      // Verificar se já existe por channel_id (se fornecido)
      if (channel_id) {
        const existing = await TelegramChannel.findByChannelId(channel_id);
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Canal já cadastrado com este ID'
          });
        }
      }

      const channel = await TelegramChannel.create({
        name,
        username: username || null,
        channel_id: channel_id || null,
        is_active: is_active !== undefined ? is_active : true,
        example_messages: Array.isArray(example_messages) ? example_messages.filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0) : [],
        capture_schedule_start: capture_schedule_start || null,
        capture_schedule_end: capture_schedule_end || null,
        capture_mode: capture_mode || 'new_only',
        platform_filter: platform_filter || 'all'
      });

      logger.info(`✅ Canal Telegram criado: ${channel.username ? `@${channel.username}` : `ID: ${channel.channel_id}`}`);

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

  /**
   * Atualizar canal
   * PUT /api/telegram-channels/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Buscar canal atual para verificar se tem username ou channel_id
      const currentChannel = await TelegramChannel.findById(id);
      if (!currentChannel) {
        return res.status(404).json({
          success: false,
          message: 'Canal não encontrado'
        });
      }

      // Se estiver atualizando username ou channel_id, validar que pelo menos um dos dois seja mantido
      const newUsername = updates.username !== undefined ? updates.username : currentChannel.username;
      const newChannelId = updates.channel_id !== undefined ? updates.channel_id : currentChannel.channel_id;

      // Validar que pelo menos um dos dois seja fornecido
      if (!newUsername && !newChannelId) {
        return res.status(400).json({
          success: false,
          message: 'Username ou ID do canal são obrigatórios. Pelo menos um dos dois deve ser mantido ou fornecido.'
        });
      }

      // Verificar duplicatas se estiver atualizando username
      if (updates.username && updates.username !== currentChannel.username) {
        const existing = await TelegramChannel.findByUsername(updates.username);
        if (existing && existing.id !== id) {
          return res.status(400).json({
            success: false,
            message: 'Canal já cadastrado com este username'
          });
        }
      }

      // Verificar duplicatas se estiver atualizando channel_id
      if (updates.channel_id && updates.channel_id !== currentChannel.channel_id) {
        const existing = await TelegramChannel.findByChannelId(updates.channel_id);
        if (existing && existing.id !== id) {
          return res.status(400).json({
            success: false,
            message: 'Canal já cadastrado com este ID'
          });
        }
      }

      const channel = await TelegramChannel.update(id, updates);

      logger.info(`✅ Canal Telegram atualizado: ${id}`);

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

  /**
   * Deletar canal
   * DELETE /api/telegram-channels/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await TelegramChannel.delete(id);

      logger.info(`✅ Canal Telegram deletado: ${id}`);

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

  /**
   * Atualizar estatísticas
   * PATCH /api/telegram-channels/:id/stats
   */
  async updateStats(req, res) {
    try {
      const { id } = req.params;
      const { coupons_captured, last_message_at } = req.body;

      const stats = {};
      if (coupons_captured !== undefined) stats.coupons_captured = coupons_captured;
      if (last_message_at) stats.last_message_at = last_message_at;

      const channel = await TelegramChannel.updateStats(id, stats);

      res.json({
        success: true,
        data: channel
      });
    } catch (error) {
      logger.error(`Erro ao atualizar stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar estatísticas',
        error: error.message
      });
    }
  }

  /**
   * Salvar cupom capturado do Telegram
   * POST /api/telegram-channels/coupons
   */
  async saveCoupon(req, res) {
    try {
      const couponData = req.body;

      // Validar campos obrigatórios
      if (!couponData.code || !couponData.platform) {
        return res.status(400).json({
          success: false,
          message: 'Código e plataforma são obrigatórios'
        });
      }

      // Verificar duplicata por message_hash se fornecido
      if (couponData.message_hash) {
        const existing = await Coupon.findByMessageHash(couponData.message_hash);
        if (existing) {
          return res.status(200).json({
            success: true,
            message: 'Cupom já existe (duplicata)',
            data: existing,
            isDuplicate: true
          });
        }
      }

      // Preparar dados do cupom
      const coupon = await Coupon.create({
        ...couponData,
        origem: 'telegram',
        auto_captured: true,
        is_pending_approval: couponData.is_pending_approval !== undefined 
          ? couponData.is_pending_approval 
          : true
      });

      // Incrementar contador do canal se fornecido
      if (couponData.channel_origin) {
        try {
          const channel = await TelegramChannel.findByUsername(couponData.channel_origin);
          if (channel) {
            await TelegramChannel.incrementCouponsCount(channel.id);
          }
        } catch (error) {
          logger.warn(`Erro ao atualizar contador do canal: ${error.message}`);
        }
      }

      logger.info(`✅ Cupom Telegram salvo: ${couponData.code} de @${couponData.channel_origin}`);

      // IMPORTANTE: Enviar notificação usando template do painel admin e logo da plataforma
      // Apenas se o cupom não estiver pendente de aprovação
      if (!coupon.is_pending_approval && coupon.is_active) {
        try {
          logger.info(`📢 Enviando notificação de novo cupom capturado do Telegram: ${coupon.code}`);
          const couponNotificationService = (await import('../services/coupons/couponNotificationService.js')).default;
          const notificationResult = await couponNotificationService.notifyNewCoupon(coupon);
          logger.info(`✅ Notificação de cupom enviada: ${JSON.stringify(notificationResult)}`);
        } catch (notifError) {
          logger.error(`❌ Erro ao enviar notificação de cupom: ${notifError.message}`);
          logger.error(`   Stack: ${notifError.stack}`);
          // Não falhar o salvamento se a notificação falhar
        }
      } else {
        logger.info(`⏸️ Cupom está pendente de aprovação ou inativo, notificação não será enviada`);
      }

      res.status(201).json({
        success: true,
        message: 'Cupom salvo com sucesso',
        data: coupon
      });
    } catch (error) {
      logger.error(`Erro ao salvar cupom Telegram: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar cupom',
        error: error.message
      });
    }
  }

  /**
   * Listar cupons capturados do Telegram
   * GET /api/telegram-channels/coupons
   */
  async listCoupons(req, res) {
    try {
      const { page = 1, limit = 20, channel_origin } = req.query;
      
      const filters = {
        origem: 'telegram',
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (channel_origin) {
        filters.channel_origin = channel_origin;
      }

      const result = await Coupon.findAll(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao listar cupons Telegram: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar cupons',
        error: error.message
      });
    }
  }

  /**
   * Obter status do módulo de IA
   * GET /api/telegram-channels/ai/status
   */
  async getAiStatus(req, res) {
    try {
      const aiEnabled = await couponAnalyzer.isEnabled();
      
      // Estatísticas de cupons extraídos via IA
      let stats = {
        total_ai_coupons: 0,
        total_traditional_coupons: 0,
        ai_success_rate: 0
      };

      try {
        // Contar cupons extraídos via IA
        const aiResult = await Coupon.findAll({
          capture_source: 'telegram_ai',
          limit: 10000
        });
        stats.total_ai_coupons = aiResult?.coupons?.length || aiResult?.total || 0;

        // Contar cupons extraídos via método tradicional
        const traditionalResult = await Coupon.findAll({
          origem: 'telegram',
          capture_source: 'telegram',
          limit: 10000
        });
        stats.total_traditional_coupons = traditionalResult?.coupons?.length || traditionalResult?.total || 0;

        // Calcular taxa de sucesso (se houver cupons)
        const total = stats.total_ai_coupons + stats.total_traditional_coupons;
        if (total > 0) {
          stats.ai_success_rate = (stats.total_ai_coupons / total) * 100;
        }
      } catch (error) {
        logger.warn(`Erro ao calcular estatísticas de IA: ${error.message}`);
      }

      res.json({
        success: true,
        data: {
          enabled: aiEnabled,
          stats: stats
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter status da IA: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status da IA',
        error: error.message
      });
    }
  }
}

export default new TelegramChannelController();






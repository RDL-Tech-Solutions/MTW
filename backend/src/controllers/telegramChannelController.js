import TelegramChannel from '../models/TelegramChannel.js';
import Coupon from '../models/Coupon.js';
import logger from '../config/logger.js';

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

      res.json({
        success: true,
        data: channels
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
      const { name, username, is_active } = req.body;

      if (!name || !username) {
        return res.status(400).json({
          success: false,
          message: 'Nome e username são obrigatórios'
        });
      }

      // Verificar se já existe
      const existing = await TelegramChannel.findByUsername(username);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Canal já cadastrado'
        });
      }

      const channel = await TelegramChannel.create({
        name,
        username,
        is_active: is_active !== undefined ? is_active : true
      });

      logger.info(`✅ Canal Telegram criado: @${channel.username}`);

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
}

export default new TelegramChannelController();




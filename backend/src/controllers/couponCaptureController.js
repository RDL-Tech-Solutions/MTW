import couponCaptureService from '../services/coupons/couponCaptureService.js';
import couponCaptureCron from '../cron/couponCaptureCron.js';
import CouponSettings from '../models/CouponSettings.js';
import CouponSyncLog from '../models/CouponSyncLog.js';
import Coupon from '../models/Coupon.js';
import logger from '../config/logger.js';

class CouponCaptureController {
  /**
   * Executar sincronização manual de todas as plataformas
   */
  async syncAll(req, res) {
    try {
      logger.info('🔧 Sincronização manual iniciada pelo admin');

      const result = await couponCaptureService.captureAll();

      res.json({
        success: true,
        message: 'Sincronização concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na sincronização manual: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na sincronização',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar plataforma específica
   */
  async syncPlatform(req, res) {
    try {
      const { platform } = req.params;

      if (!['shopee', 'mercadolivre', 'amazon', 'aliexpress'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida'
        });
      }

      logger.info(`🔧 Sincronização manual de ${platform} iniciada`);

      const result = await couponCaptureService.capturePlatform(platform);

      res.json({
        success: true,
        message: `Sincronização de ${platform} concluída`,
        data: result
      });

    } catch (error) {
      logger.error(`Erro na sincronização: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na sincronização',
        error: error.message
      });
    }
  }

  /**
   * Verificar cupons expirados
   */
  async checkExpired(req, res) {
    try {
      logger.info('🔧 Verificação manual de cupons expirados');

      const result = await couponCaptureService.checkExpiredCoupons();

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na verificação: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na verificação',
        error: error.message
      });
    }
  }

  /**
   * Verificar validade de cupons ativos
   */
  async verifyActive(req, res) {
    try {
      logger.info('🔧 Verificação manual de validade de cupons');

      const result = await couponCaptureService.verifyActiveCoupons();

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na verificação: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na verificação',
        error: error.message
      });
    }
  }

  /**
   * Obter estatísticas de captura
   */
  async getStats(req, res) {
    try {
      const { days = 7 } = req.query;

      const stats = await couponCaptureService.getStats(parseInt(days));

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

  /**
   * Obter logs de sincronização
   */
  async getLogs(req, res) {
    try {
      const {
        platform,
        sync_type,
        status,
        limit = 50,
        page = 1
      } = req.query;

      const logs = await CouponSyncLog.findRecent(parseInt(limit), {
        platform,
        sync_type,
        status
      }, parseInt(page));

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      logger.error(`Erro ao obter logs: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter logs',
        error: error.message
      });
    }
  }

  /**
   * Obter configurações do módulo
   */
  async getSettings(req, res) {
    try {
      const settings = await CouponSettings.get();

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao obter configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter configurações',
        error: error.message
      });
    }
  }

  /**
   * Atualizar configurações do módulo
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;

      const settings = await CouponSettings.update(updates);

      // Reiniciar cron se intervalo mudou
      if (updates.capture_interval_minutes || updates.auto_capture_enabled !== undefined) {
        await couponCaptureCron.restartCaptureJob();
      }

      res.json({
        success: true,
        message: 'Configurações atualizadas',
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao atualizar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configurações',
        error: error.message
      });
    }
  }

  /**
   * Ativar/Desativar captura automática
   */
  async toggleAutoCapture(req, res) {
    try {
      const { enabled } = req.body;

      const settings = await CouponSettings.toggleAutoCapture(enabled);

      if (enabled) {
        await couponCaptureCron.startCaptureJob();
      } else {
        couponCaptureCron.stopAll();
      }

      res.json({
        success: true,
        message: enabled ? 'Captura automática ativada' : 'Captura automática desativada',
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao alterar captura automática: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar configuração',
        error: error.message
      });
    }
  }

  /**
   * Obter status dos cron jobs
   */
  async getCronStatus(req, res) {
    try {
      const status = couponCaptureCron.getStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status',
        error: error.message
      });
    }
  }

  /**
   * Listar cupons capturados
   */
  async listCoupons(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        platform,
        is_active,
        auto_captured,
        verification_status,
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order
      };

      if (platform) filters.platform = platform;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (auto_captured !== undefined) filters.auto_captured = auto_captured === 'true';
      if (verification_status) filters.verification_status = verification_status;

      const result = await Coupon.findAll(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error(`Erro ao listar cupons: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar cupons',
        error: error.message
      });
    }
  }

  /**
   * Forçar expiração de um cupom
   */
  async expireCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.update(id, {
        is_active: false,
        verification_status: 'expired'
      });

      res.json({
        success: true,
        message: 'Cupom marcado como expirado',
        data: coupon
      });

    } catch (error) {
      logger.error(`Erro ao expirar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao expirar cupom',
        error: error.message
      });
    }
  }

  /**
   * Reativar cupom
   */
  async reactivateCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.update(id, {
        is_active: true,
        verification_status: 'active'
      });

      res.json({
        success: true,
        message: 'Cupom reativado',
        data: coupon
      });

    } catch (error) {
      logger.error(`Erro ao reativar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao reativar cupom',
        error: error.message
      });
    }
  }
}

export default new CouponCaptureController();

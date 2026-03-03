/**
 * Controller para Republicação Automática com IA
 */
import autoRepublishService from '../services/autoRepublishService.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';

class AutoRepublishController {
  /**
   * POST /api/auto-republish/toggle
   * Ativar/Desativar republicação automática
   */
  static async toggle(req, res, next) {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json(errorResponse('Campo "enabled" deve ser boolean'));
      }

      const result = await autoRepublishService.setEnabled(enabled);
      
      res.json(successResponse(
        result,
        `Republicação automática ${enabled ? 'ativada' : 'desativada'} com sucesso`
      ));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auto-republish/status
   * Obter status do serviço
   */
  static async status(req, res, next) {
    try {
      const enabled = await autoRepublishService.isEnabled();
      const status = autoRepublishService.getStatus();

      res.json(successResponse({
        enabled,
        ...status
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auto-republish/run
   * Executar republicação automática manualmente
   */
  static async run(req, res, next) {
    try {
      logger.info('🚀 Iniciando republicação automática manual...');
      
      const result = await autoRepublishService.analyzeAndSchedule();
      
      if (!result.success) {
        return res.status(400).json(errorResponse(result.message));
      }

      res.json(successResponse(result, result.message));
    } catch (error) {
      logger.error(`❌ Erro na republicação automática: ${error.message}`);
      next(error);
    }
  }
}

export default AutoRepublishController;

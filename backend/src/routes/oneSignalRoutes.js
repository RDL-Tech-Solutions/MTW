import express from 'express';
import oneSignalService from '../services/oneSignalService.js';
import oneSignalMigration from '../services/oneSignalMigration.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Rotas para gerenciamento do OneSignal e migração
 * Todas as rotas requerem autenticação de admin
 */

// Middleware: todas as rotas requerem admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/onesignal/status
 * Verificar status do OneSignal
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      enabled: oneSignalService.isEnabled(),
      initialized: oneSignalService.initialized,
      app_id: oneSignalService.appId ? `${oneSignalService.appId.substring(0, 8)}...` : null,
      has_api_key: !!oneSignalService.apiKey
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error(`Erro ao verificar status OneSignal: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message
    });
  }
});

/**
 * GET /api/onesignal/migration/stats
 * Obter estatísticas de migração
 */
router.get('/migration/stats', async (req, res) => {
  try {
    const result = await oneSignalMigration.getMigrationStats();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao obter estatísticas: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
});

/**
 * POST /api/onesignal/migration/start
 * Iniciar migração de usuários
 * 
 * Body:
 * - dryRun: boolean (opcional, default: false)
 * - limit: number (opcional)
 */
router.post('/migration/start', async (req, res) => {
  try {
    const { dryRun = false, limit } = req.body;

    logger.info(`🚀 Iniciando migração OneSignal (admin: ${req.user.email})`);
    logger.info(`   Dry Run: ${dryRun}`);
    logger.info(`   Limit: ${limit || 'sem limite'}`);

    const result = await oneSignalMigration.migrateAllUsers({ dryRun, limit });

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao iniciar migração: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar migração',
      error: error.message
    });
  }
});

/**
 * POST /api/onesignal/migration/user/:userId
 * Migrar um usuário específico
 */
router.post('/migration/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dryRun = false } = req.body;

    // Buscar usuário
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const result = await oneSignalMigration.migrateUser(user, dryRun);

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao migrar usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao migrar usuário',
      error: error.message
    });
  }
});

/**
 * POST /api/onesignal/migration/rollback/:userId
 * Reverter migração de um usuário
 */
router.post('/migration/rollback/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await oneSignalMigration.rollbackUser(userId);

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao reverter migração: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao reverter migração',
      error: error.message
    });
  }
});

/**
 * POST /api/onesignal/migration/cleanup
 * Limpar dados de migração (remover tokens Expo antigos)
 */
router.post('/migration/cleanup', async (req, res) => {
  try {
    logger.warn(`⚠️ Limpeza de dados de migração iniciada (admin: ${req.user.email})`);

    const result = await oneSignalMigration.cleanupMigrationData();

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao limpar dados: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar dados',
      error: error.message
    });
  }
});

/**
 * POST /api/onesignal/test
 * Enviar notificação de teste
 * 
 * Body:
 * - user_id: string (required)
 * - title: string (optional)
 * - message: string (optional)
 */
router.post('/test', async (req, res) => {
  try {
    const { user_id, title = '🧪 Teste OneSignal', message = 'Esta é uma notificação de teste do OneSignal' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id é obrigatório'
      });
    }

    const result = await oneSignalService.sendToUser({
      external_id: user_id.toString(),
      title,
      message,
      data: {
        type: 'test',
        sent_by: req.user.email,
        sent_at: new Date().toISOString()
      }
    });

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao enviar teste: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar notificação de teste',
      error: error.message
    });
  }
});

/**
 * GET /api/onesignal/notification/:notificationId/stats
 * Obter estatísticas de uma notificação
 */
router.get('/notification/:notificationId/stats', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await oneSignalService.getNotificationStats(notificationId);

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao obter estatísticas: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
});

/**
 * DELETE /api/onesignal/notification/:notificationId
 * Cancelar notificação agendada
 */
router.delete('/notification/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await oneSignalService.cancelNotification(notificationId);

    res.json(result);
  } catch (error) {
    logger.error(`Erro ao cancelar notificação: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar notificação',
      error: error.message
    });
  }
});

export default router;

import express from 'express';
import oneSignalService from '../services/oneSignalService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Rotas para gerenciamento do OneSignal
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

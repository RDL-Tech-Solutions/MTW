import express from 'express';
import telegramCollectorController from '../controllers/telegramCollectorController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// Configuração
router.get('/config', telegramCollectorController.getConfig);
router.put('/config', telegramCollectorController.updateConfig);

// Autenticação
router.post('/auth/send-code', telegramCollectorController.sendCode);
router.post('/auth/verify-code', telegramCollectorController.verifyCode);
router.get('/auth/status', telegramCollectorController.getAuthStatus);

// Listener
router.get('/listener/status', telegramCollectorController.getListenerStatus);
router.post('/listener/start', telegramCollectorController.startListener);
router.post('/listener/stop', telegramCollectorController.stopListener);
router.post('/listener/restart', telegramCollectorController.restartListener);

// Sessões
router.delete('/sessions', telegramCollectorController.clearSessions);

export default router;





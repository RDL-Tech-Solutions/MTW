import express from 'express';
import botController from '../controllers/botController.js';
import botTemplateController from '../controllers/botTemplateController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// ============================================
// CONFIGURAÇÕES
// ============================================
router.get('/config', botController.getConfig);
router.post('/config', botController.saveConfig);
router.post('/config/test-telegram', botController.testTelegram);
router.post('/config/test-whatsapp', botController.testWhatsApp);

// ============================================
// CANAIS
// ============================================
router.get('/channels', botController.listChannels);
router.post('/channels', botController.createChannel);
router.put('/channels/:id', botController.updateChannel);
router.delete('/channels/:id', botController.deleteChannel);
router.patch('/channels/:id/toggle', botController.toggleChannel);
router.post('/channels/:id/test', botController.sendTestToChannel);

// ============================================
// TESTES E LOGS
// ============================================
router.post('/test', botController.sendTest);
router.get('/logs', botController.listLogs);
router.get('/stats', botController.getStats);

// ============================================
// STATUS
// ============================================
router.get('/status', botController.checkStatus);

// ============================================
// TEMPLATES DE MENSAGENS
// ============================================
router.get('/templates', botTemplateController.list);
router.get('/templates/variables/:template_type', botTemplateController.getVariables);
router.get('/templates/:id', botTemplateController.getById);
router.post('/templates', botTemplateController.create);
router.put('/templates/:id', botTemplateController.update);
router.delete('/templates/:id', botTemplateController.delete);

export default router;

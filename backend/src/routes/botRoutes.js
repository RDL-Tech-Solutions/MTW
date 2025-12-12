import express from 'express';
import botController from '../controllers/botController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// Rotas de canais
router.get('/channels', botController.listChannels);
router.post('/channels', botController.createChannel);
router.put('/channels/:id', botController.updateChannel);
router.delete('/channels/:id', botController.deleteChannel);
router.patch('/channels/:id/toggle', botController.toggleChannel);

// Rotas de teste
router.post('/test', botController.sendTest);

// Rotas de logs
router.get('/logs', botController.listLogs);
router.get('/stats', botController.getStats);

// Status dos bots
router.get('/status', botController.checkStatus);

export default router;

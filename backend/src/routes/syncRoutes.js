import express from 'express';
import SyncController from '../controllers/syncController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas de sincronização requerem autenticação admin
router.use(authenticateToken);

// GET /api/sync/config - Buscar configuração
router.get('/config', SyncController.getConfig);

// POST /api/sync/config - Salvar configuração
router.post('/config', SyncController.saveConfig);

// POST /api/sync/run-now - Executar sincronização manual
router.post('/run-now', SyncController.runNow);

// GET /api/sync/history - Histórico de sincronizações
router.get('/history', SyncController.getHistory);

// GET /api/sync/stats - Estatísticas
router.get('/stats', SyncController.getStats);

export default router;

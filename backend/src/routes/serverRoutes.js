import express from 'express';
import { getServerStats, restartServer } from '../controllers/serverController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /api/server/stats - Obter estatísticas do servidor
router.get('/stats', getServerStats);

// POST /api/server/restart - Reiniciar servidor
router.post('/restart', restartServer);

export default router;

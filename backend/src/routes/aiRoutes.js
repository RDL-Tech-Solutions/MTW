import express from 'express';
import aiController from '../controllers/aiController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas de IA requerem autenticação de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Rota para obter status dos modelos
router.get('/models/status', aiController.getModelStatus.bind(aiController));

// Rota para executar teste de modelos
router.post('/models/test', aiController.testModels.bind(aiController));

export default router;

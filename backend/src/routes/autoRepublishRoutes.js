/**
 * Rotas para Republicação Automática com IA
 */
import express from 'express';
import AutoRepublishController from '../controllers/autoRepublishController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Ativar/Desativar republicação automática
router.post('/toggle', AutoRepublishController.toggle);

// Obter status
router.get('/status', AutoRepublishController.status);

// Executar republicação manual
router.post('/run', AutoRepublishController.run);

export default router;

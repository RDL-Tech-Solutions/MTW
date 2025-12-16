import express from 'express';
import appSettingsController from '../controllers/appSettingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// Rotas de configurações
router.get('/', appSettingsController.getSettings);
router.put('/', appSettingsController.updateSettings);
router.get('/:platform', appSettingsController.getPlatformSettings);

export default router;




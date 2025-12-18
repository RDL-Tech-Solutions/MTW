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

// Rotas específicas do Mercado Livre
router.post('/meli/authorize', appSettingsController.generateMeliAuthUrl);
router.post('/meli/exchange-code', appSettingsController.exchangeMeliCode);
router.post('/meli/refresh-token', appSettingsController.refreshMeliToken);

export default router;






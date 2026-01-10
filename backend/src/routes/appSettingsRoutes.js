import express from 'express';
import appSettingsController from '../controllers/appSettingsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// Rotas de configurações
router.get('/', appSettingsController.getSettings);
router.put('/', appSettingsController.updateSettings);
// IMPORTANTE: /reveal deve vir ANTES de /:platform para não ser interpretado como platform
router.get('/reveal', appSettingsController.revealSettings); // Endpoint para revelar valores sensíveis
router.get('/:platform', appSettingsController.getPlatformSettings);

// Rotas específicas do Mercado Livre
router.post('/meli/authorize', appSettingsController.generateMeliAuthUrl);
router.post('/meli/exchange-code', appSettingsController.exchangeMeliCode);
router.post('/meli/refresh-token', appSettingsController.refreshMeliToken);

// Rota para obter modelos OpenRouter disponíveis
router.get('/openrouter-models', appSettingsController.getOpenRouterModels);

// Rotas de limpeza automática
router.get('/cleanup/status', appSettingsController.getCleanupStatus);
router.put('/cleanup/schedule', appSettingsController.updateCleanupSchedule);
router.post('/cleanup/run', appSettingsController.runCleanupNow);

export default router;






import express from 'express';
import telegramChannelController from '../controllers/telegramChannelController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken, requireAdmin);

// Rotas de canais
router.get('/', telegramChannelController.list);
router.get('/active', telegramChannelController.listActive);
router.get('/:id', telegramChannelController.getById);
router.post('/', telegramChannelController.create);
router.put('/:id', telegramChannelController.update);
router.delete('/:id', telegramChannelController.delete);
router.patch('/:id/stats', telegramChannelController.updateStats);

// Rotas de cupons
router.post('/coupons', telegramChannelController.saveCoupon);
router.get('/coupons', telegramChannelController.listCoupons);

export default router;






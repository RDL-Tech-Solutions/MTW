import express from 'express';
import CouponController from '../controllers/couponController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, createCouponSchema, updateCouponSchema } from '../middleware/validation.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas públicas
router.get('/', CouponController.listActive);
router.get('/expiring', CouponController.expiringSoon);
router.get('/:id', CouponController.getById);

// Rotas protegidas
router.post('/:id/use', authenticateToken, CouponController.use);

// Rotas admin
router.get('/admin/all', authenticateToken, requireAdmin, CouponController.listAll);
router.post('/', authenticateToken, requireAdmin, createLimiter, validate(createCouponSchema), CouponController.create);
router.put('/:id', authenticateToken, requireAdmin, validate(updateCouponSchema), CouponController.update);
router.delete('/:id', authenticateToken, requireAdmin, CouponController.delete);

export default router;

import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validate, createProductSchema, updateProductSchema } from '../middleware/validation.js';
import { createLimiterDefault } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas públicas
router.get('/', optionalAuth, ProductController.list);
router.get('/:id', optionalAuth, ProductController.getById);
router.get('/:id/history', ProductController.priceHistory);
router.get('/:id/related', ProductController.related);

// Rotas protegidas
router.post('/:id/click', authenticateToken, ProductController.trackClick);

// Rotas admin
router.post('/', authenticateToken, requireAdmin, createLimiterDefault, validate(createProductSchema), ProductController.create);
router.put('/:id', authenticateToken, requireAdmin, validate(updateProductSchema), ProductController.update);
router.delete('/:id', authenticateToken, requireAdmin, ProductController.delete);
router.post('/batch-delete', authenticateToken, requireAdmin, ProductController.batchDelete);

export default router;

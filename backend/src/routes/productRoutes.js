import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validate, createProductSchema, updateProductSchema } from '../middleware/validation.js';
import { createLimiterDefault } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas para produtos pendentes (devem vir antes de /:id para evitar conflito)
router.get('/pending', authenticateToken, requireAdmin, ProductController.listPending);
router.post('/pending/:id/approve', authenticateToken, requireAdmin, ProductController.approve);
router.post('/pending/:id/approve-schedule', authenticateToken, requireAdmin, ProductController.approveAndSchedule);
router.post('/pending/:id/reject', authenticateToken, requireAdmin, ProductController.reject);

// Estatísticas de produtos
router.get('/stats', optionalAuth, ProductController.getStats);

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
router.post('/:id/republish', authenticateToken, requireAdmin, ProductController.republish);

export default router;

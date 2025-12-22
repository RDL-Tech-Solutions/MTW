import express from 'express';
import CouponController from '../controllers/couponController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, createCouponSchema, updateCouponSchema } from '../middleware/validation.js';
import { createLimiterDefault } from '../middleware/rateLimiter.js';

const router = express.Router();

// Middleware para converter datas antes da validação
const preprocessCouponData = (req, res, next) => {
  if (req.body.valid_from && typeof req.body.valid_from === 'string' && req.body.valid_from.trim() !== '') {
    try {
      req.body.valid_from = new Date(req.body.valid_from).toISOString();
    } catch (e) {
      // Manter como está se não conseguir converter
    }
  } else if (req.body.valid_from === '' || req.body.valid_from === null) {
    req.body.valid_from = new Date().toISOString(); // Usar data atual como padrão
  }

  if (req.body.valid_until && typeof req.body.valid_until === 'string' && req.body.valid_until.trim() !== '') {
    try {
      req.body.valid_until = new Date(req.body.valid_until).toISOString();
    } catch (e) {
      // Manter como está se não conseguir converter
    }
  }

  // Converter min_purchase para número
  if (req.body.min_purchase !== undefined) {
    if (req.body.min_purchase === '' || req.body.min_purchase === null) {
      req.body.min_purchase = 0;
    } else {
      req.body.min_purchase = parseFloat(req.body.min_purchase) || 0;
    }
  }

  // Converter max_uses para número ou null
  if (req.body.max_uses !== undefined) {
    if (req.body.max_uses === '' || req.body.max_uses === null) {
      req.body.max_uses = null;
    } else {
      const maxUses = parseInt(req.body.max_uses);
      req.body.max_uses = isNaN(maxUses) ? null : maxUses;
    }
  }

  // Converter max_discount_value para número ou null
  if (req.body.max_discount_value !== undefined) {
    if (req.body.max_discount_value === '' || req.body.max_discount_value === null) {
      req.body.max_discount_value = null;
    } else {
      req.body.max_discount_value = parseFloat(req.body.max_discount_value) || null;
    }
  }

  // Converter current_uses para número
  if (req.body.current_uses !== undefined) {
    req.body.current_uses = parseInt(req.body.current_uses) || 0;
  }

  // Converter discount_value para número
  if (req.body.discount_value !== undefined) {
    req.body.discount_value = parseFloat(req.body.discount_value);
  }

  next();
};

// Rotas públicas
router.get('/', CouponController.listActive);
router.get('/expiring', CouponController.expiringSoon);
router.get('/code/:code', CouponController.getByCode);
// IMPORTANTE: Rotas específicas devem vir ANTES de rotas com parâmetros dinâmicos
router.get('/pending', authenticateToken, requireAdmin, CouponController.listPending);
router.get('/export', authenticateToken, requireAdmin, CouponController.export);
router.get('/:id', CouponController.getById);

// Rotas protegidas
router.post('/:id/use', authenticateToken, CouponController.use);

// Rotas admin
router.get('/admin/all', authenticateToken, requireAdmin, CouponController.listAll);
router.post('/', authenticateToken, requireAdmin, createLimiterDefault, preprocessCouponData, validate(createCouponSchema), CouponController.create);
router.put('/:id', authenticateToken, requireAdmin, preprocessCouponData, validate(updateCouponSchema), CouponController.update);
router.delete('/:id', authenticateToken, requireAdmin, CouponController.delete);
router.post('/batch-delete', authenticateToken, requireAdmin, CouponController.batchDelete);
router.post('/:id/force-publish', authenticateToken, requireAdmin, CouponController.forcePublish);
router.post('/:id/mark-out-of-stock', authenticateToken, requireAdmin, CouponController.markAsOutOfStock);
router.post('/:id/mark-available', authenticateToken, requireAdmin, CouponController.markAsAvailable);

// Rotas de aprovação/rejeição
// NOTA: /pending e /export já foram movidos para antes de /:id acima
router.put('/:id/approve', authenticateToken, requireAdmin, CouponController.approve);
router.put('/:id/reject', authenticateToken, requireAdmin, CouponController.reject);
router.post('/approve-batch', authenticateToken, requireAdmin, CouponController.approveBatch);
router.post('/reject-batch', authenticateToken, requireAdmin, CouponController.rejectBatch);

export default router;

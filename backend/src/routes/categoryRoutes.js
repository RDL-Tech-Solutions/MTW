import express from 'express';
import CategoryController from '../controllers/categoryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, createCategorySchema, updateCategorySchema } from '../middleware/validation.js';

const router = express.Router();

// Rotas públicas
router.get('/', CategoryController.list);
router.get('/:id', CategoryController.getById);

// Rotas admin
router.post('/', authenticateToken, requireAdmin, validate(createCategorySchema), CategoryController.create);
router.put('/:id', authenticateToken, requireAdmin, validate(updateCategorySchema), CategoryController.update);
router.delete('/:id', authenticateToken, requireAdmin, CategoryController.delete);

export default router;

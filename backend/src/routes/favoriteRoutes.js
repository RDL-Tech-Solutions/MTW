import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { successResponse } from '../utils/helpers.js';

const router = express.Router();

// Todas as rotas são protegidas
router.use(authenticateToken);

// Listar favoritos
router.get('/', async (req, res, next) => {
  try {
    const favorites = await User.getFavorites(req.user.id);
    res.json(successResponse(favorites));
  } catch (error) {
    next(error);
  }
});

// Adicionar favorito
router.post('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    await User.addFavorite(req.user.id, productId);
    res.json(successResponse(null, 'Produto adicionado aos favoritos'));
  } catch (error) {
    next(error);
  }
});

// Remover favorito
router.delete('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    await User.removeFavorite(req.user.id, productId);
    res.json(successResponse(null, 'Produto removido dos favoritos'));
  } catch (error) {
    next(error);
  }
});

export default router;

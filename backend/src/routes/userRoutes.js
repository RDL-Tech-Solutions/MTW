import express from 'express';
import UserController from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas são protegidas e apenas para admin
router.use(authenticateToken, requireAdmin);

// Listar usuários
router.get('/', UserController.list);

// Estatísticas
router.get('/stats', UserController.stats);

// Obter usuário por ID
router.get('/:id', UserController.getById);

// Criar usuário
router.post('/', UserController.create);

// Atualizar usuário
router.put('/:id', UserController.update);

// Deletar usuário
router.delete('/:id', UserController.delete);

// Atualizar status VIP
router.patch('/:id/vip', UserController.updateVIP);

// Atualizar role
router.patch('/:id/role', UserController.updateRole);

export default router;


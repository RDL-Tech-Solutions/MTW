import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas públicas
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Rotas protegidas
router.get('/me', authenticateToken, AuthController.me);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/password', authenticateToken, AuthController.changePassword);
router.post('/push-token', authenticateToken, AuthController.registerPushToken);

export default router;

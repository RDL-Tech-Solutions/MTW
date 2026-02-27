import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas públicas
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/google', authLimiter, AuthController.googleAuth); // Nova rota Google direta
router.post('/social', authLimiter, AuthController.socialAuth); // Manter para compatibilidade
router.post('/social/url', authLimiter, AuthController.getOAuthUrl);
router.get('/social/callback', AuthController.socialAuthCallback);
router.post('/social/callback', AuthController.socialAuthCallback);
router.get('/meli/callback', AuthController.meliCallback); // Callback do Mercado Livre OAuth
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/verify-reset-code', authLimiter, AuthController.verifyResetCode);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// Rotas protegidas
router.get('/me', authenticateToken, AuthController.me);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/password', authenticateToken, AuthController.changePassword);
router.post('/push-token', authenticateToken, AuthController.registerPushToken);

export default router;

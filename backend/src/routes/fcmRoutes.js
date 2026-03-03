import express from 'express';
import fcmService from '../services/fcmService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Middleware: todas as rotas requerem admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/fcm/status
 * Verificar status do Firebase Admin / FCM
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            enabled: fcmService.isEnabled(),
            initialized: fcmService.initialized,
            service: 'Firebase Cloud Messaging (FCM)'
        };

        res.json({ success: true, status });
    } catch (error) {
        logger.error(`Erro ao verificar status FCM: ${error.message}`);
        res.status(500).json({ success: false, message: 'Erro ao verificar status', error: error.message });
    }
});

/**
 * POST /api/fcm/test
 * Enviar notificação de teste para um usuário
 * Body: { user_id, title?, message? }
 */
router.post('/test', async (req, res) => {
    try {
        const {
            user_id,
            title = '🧪 Teste FCM',
            message = 'Esta é uma notificação de teste via Firebase Cloud Messaging'
        } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
        }

        // Buscar token FCM do usuário
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }

        if (!user.fcm_token) {
            return res.status(400).json({
                success: false,
                message: 'Usuário não tem token FCM registrado. O usuário precisa abrir o app para registrar o token.'
            });
        }

        const result = await fcmService.sendToUser({
            fcm_token: user.fcm_token,
            title,
            message,
            data: {
                type: 'test',
                sent_by: req.user.email,
                sent_at: new Date().toISOString()
            }
        });

        res.json(result);
    } catch (error) {
        logger.error(`Erro ao enviar teste FCM: ${error.message}`);
        res.status(500).json({ success: false, message: 'Erro ao enviar notificação de teste', error: error.message });
    }
});

export default router;

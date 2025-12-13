import express from 'express';
import NotificationPreferenceController from '../controllers/notificationPreferenceController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas são protegidas
router.use(authenticateToken);

router.get('/', NotificationPreferenceController.get);
router.put('/', NotificationPreferenceController.update);
router.put('/theme', NotificationPreferenceController.updateTheme);

export default router;


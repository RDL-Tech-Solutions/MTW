import express from 'express';
import NotificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, registerPushTokenSchema } from '../middleware/validation.js';

const router = express.Router();

// Todas as rotas são protegidas
router.use(authenticateToken);

router.get('/', NotificationController.list);
router.get('/unread/count', NotificationController.countUnread);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);
router.post('/register-token', validate(registerPushTokenSchema), NotificationController.registerToken);

export default router;

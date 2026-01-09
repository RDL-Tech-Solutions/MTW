import express from 'express';
import ScheduledPostController from '../controllers/scheduledPostController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

router.get('/', ScheduledPostController.index);
router.delete('/:id', ScheduledPostController.destroy);
router.post('/:id/publish-now', ScheduledPostController.publishNow);

export default router;

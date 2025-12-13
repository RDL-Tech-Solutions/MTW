import express from 'express';
import AnalyticsController from '../controllers/analyticsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas são protegidas e apenas para admin
router.use(authenticateToken, requireAdmin);

router.get('/dashboard', AnalyticsController.dashboard);
router.get('/detailed', AnalyticsController.detailed);
router.get('/clicks', AnalyticsController.clicks);
router.get('/conversions', AnalyticsController.conversions);
router.get('/top-products', AnalyticsController.topProducts);
router.get('/top-coupons', AnalyticsController.topCoupons);

export default router;

import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import couponRoutes from './couponRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import botRoutes from './botRoutes.js';
import linkAnalyzerRoutes from './linkAnalyzerRoutes.js';
import syncRoutes from './syncRoutes.js';
import couponCaptureRoutes from './couponCaptureRoutes.js';
import userRoutes from './userRoutes.js';
import notificationPreferenceRoutes from './notificationPreferenceRoutes.js';
import telegramChannelRoutes from './telegramChannelRoutes.js';
import telegramCollectorRoutes from './telegramCollectorRoutes.js';
import appSettingsRoutes from './appSettingsRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API PreçoCerto está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rotas
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/coupons', couponRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/bots', botRoutes);
router.use('/link-analyzer', linkAnalyzerRoutes);
router.use('/sync', syncRoutes);
router.use('/coupon-capture', couponCaptureRoutes);
router.use('/users', userRoutes);
router.use('/notification-preferences', notificationPreferenceRoutes);
router.use('/telegram-channels', telegramChannelRoutes);
router.use('/telegram-collector', telegramCollectorRoutes);
router.use('/settings', appSettingsRoutes);

export default router;

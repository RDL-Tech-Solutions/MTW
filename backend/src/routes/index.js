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
import userRoutes from './userRoutes.js';
import notificationPreferenceRoutes from './notificationPreferenceRoutes.js';
import telegramChannelRoutes from './telegramChannelRoutes.js';
import telegramCollectorRoutes from './telegramCollectorRoutes.js';
import appSettingsRoutes from './appSettingsRoutes.js';
import cronRoutes from './cronRoutes.js';
import aiRoutes from './aiRoutes.js';
import scheduledPostRoutes from './scheduledPostRoutes.js';
import healthRoutes from './healthRoutes.js';
import serverRoutes from './serverRoutes.js';

const router = express.Router();

// Health check routes (sem /api prefix)
router.use('/', healthRoutes);


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
router.use('/users', userRoutes);
router.use('/notification-preferences', notificationPreferenceRoutes);
router.use('/telegram-channels', telegramChannelRoutes);
router.use('/telegram-collector', telegramCollectorRoutes);
router.use('/settings', appSettingsRoutes);
router.use('/server', serverRoutes);
router.use('/cron', cronRoutes); // Rotas para Vercel Cron
router.use('/ai', aiRoutes);
router.use('/scheduled-posts', scheduledPostRoutes);

export default router;

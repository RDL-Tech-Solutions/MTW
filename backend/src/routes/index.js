import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import couponRoutes from './couponRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import botRoutes from './botRoutes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API MTW Promo está funcionando',
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

export default router;

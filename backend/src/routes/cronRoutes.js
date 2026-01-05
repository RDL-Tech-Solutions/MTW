import express from 'express';
import { updatePrices } from '../services/cron/updatePrices.js';
import { checkExpiredCoupons } from '../services/cron/checkExpiredCoupons.js';
import { sendNotifications } from '../services/cron/sendNotifications.js';
import { cleanupOldData } from '../services/cron/cleanupOldData.js';
import { monitorExpiredCoupons } from '../services/cron/monitorExpiredCoupons.js';
import autoSyncCron from '../cron/autoSyncCron.js';
import couponCaptureCron from '../cron/couponCaptureCron.js';
import logger from '../config/logger.js';

const router = express.Router();

// Middleware de proteção para Cron Jobs
// O Vercel Cron envia um header de autorização, ou podemos usar um segredo na query/header
const protectCron = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET || process.env.VITE_CRON_SECRET;

    // Se for chamado internamente pelo Vercel (header específico) ou tiver a chave correta
    if (
        req.headers['x-vercel-cron'] === '1' ||
        (cronSecret && authHeader === `Bearer ${cronSecret}`)
    ) {
        return next();
    }

    // Em desenvolvimento, permitir acesso direto
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    logger.warn(`Tentativa não autorizada de acesso ao Cron: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
};

router.use(protectCron);

router.get('/update-prices', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Atualização de preços');
        await updatePrices();
        res.json({ success: true, message: 'Prices updated' });
    } catch (error) {
        logger.error('Erro no cron update-prices:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/check-expired', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Verificação de cupons');
        await checkExpiredCoupons();
        res.json({ success: true, message: 'Expired coupons checked' });
    } catch (error) {
        logger.error('Erro no cron check-expired:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/send-notifications', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Envio de notificações');
        await sendNotifications();
        res.json({ success: true, message: 'Notifications sent' });
    } catch (error) {
        logger.error('Erro no cron send-notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/cleanup', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Limpeza');
        await cleanupOldData();
        res.json({ success: true, message: 'Cleanup done' });
    } catch (error) {
        logger.error('Erro no cron cleanup:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/monitor-expired', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Monitoramento');
        await monitorExpiredCoupons();
        res.json({ success: true, message: 'Monitoring done' });
    } catch (error) {
        logger.error('Erro no cron monitor-expired:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync triggers
router.get('/sync-products', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Sync Products Auto');
        // Reutilizando lógica do autoSyncCron
        await autoSyncCron.runSync();
        res.json({ success: true, message: 'Sync started' });
    } catch (error) {
        logger.error('Erro no cron sync-products:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/capture-coupons', async (req, res) => {
    try {
        logger.info('🚀 Cron Trigger: Capture Coupons');
        await couponCaptureCron.runCapture();
        res.json({ success: true, message: 'Capture started' });
    } catch (error) {
        logger.error('Erro no cron capture-coupons:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

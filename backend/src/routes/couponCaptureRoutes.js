import express from 'express';
import couponCaptureController from '../controllers/couponCaptureController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken);
router.use(requireAdmin);

// ========================================
// SINCRONIZAÇÃO
// ========================================

/**
 * @route   POST /api/coupon-capture/sync/all
 * @desc    Executar sincronização manual de todas as plataformas
 * @access  Admin
 */
router.post('/sync/all', couponCaptureController.syncAll);

/**
 * @route   POST /api/coupon-capture/sync/:platform
 * @desc    Sincronizar plataforma específica
 * @access  Admin
 */
router.post('/sync/:platform', couponCaptureController.syncPlatform);

/**
 * @route   POST /api/coupon-capture/check-expired
 * @desc    Verificar e desativar cupons expirados
 * @access  Admin
 */
router.post('/check-expired', couponCaptureController.checkExpired);

/**
 * @route   POST /api/coupon-capture/verify-active
 * @desc    Verificar validade de cupons ativos
 * @access  Admin
 */
router.post('/verify-active', couponCaptureController.verifyActive);

// ========================================
// ESTATÍSTICAS E LOGS
// ========================================

/**
 * @route   GET /api/coupon-capture/stats
 * @desc    Obter estatísticas de captura
 * @access  Admin
 */
router.get('/stats', couponCaptureController.getStats);

/**
 * @route   GET /api/coupon-capture/logs
 * @desc    Obter logs de sincronização
 * @access  Admin
 */
router.get('/logs', couponCaptureController.getLogs);

/**
 * @route   GET /api/coupon-capture/cron-status
 * @desc    Obter status dos cron jobs
 * @access  Admin
 */
router.get('/cron-status', couponCaptureController.getCronStatus);

// ========================================
// CONFIGURAÇÕES
// ========================================

/**
 * @route   GET /api/coupon-capture/settings
 * @desc    Obter configurações do módulo
 * @access  Admin
 */
router.get('/settings', couponCaptureController.getSettings);

/**
 * @route   PUT /api/coupon-capture/settings
 * @desc    Atualizar configurações do módulo
 * @access  Admin
 */
router.put('/settings', couponCaptureController.updateSettings);

/**
 * @route   POST /api/coupon-capture/toggle-auto-capture
 * @desc    Ativar/Desativar captura automática
 * @access  Admin
 */
router.post('/toggle-auto-capture', couponCaptureController.toggleAutoCapture);

// ========================================
// GESTÃO DE CUPONS
// ========================================

/**
 * @route   GET /api/coupon-capture/coupons
 * @desc    Listar cupons capturados
 * @access  Admin
 */
router.get('/coupons', couponCaptureController.listCoupons);

/**
 * @route   PUT /api/coupon-capture/coupons/:id/expire
 * @desc    Forçar expiração de um cupom
 * @access  Admin
 */
router.put('/coupons/:id/expire', couponCaptureController.expireCoupon);

/**
 * @route   PUT /api/coupon-capture/coupons/:id/reactivate
 * @desc    Reativar cupom
 * @access  Admin
 */
router.put('/coupons/:id/reactivate', couponCaptureController.reactivateCoupon);

/**
 * @route   GET /api/coupon-capture/coupons/export
 * @desc    Exportar cupons (CSV/JSON)
 * @access  Admin
 */
router.get('/coupons/export', couponCaptureController.exportCoupons);

/**
 * @route   POST /api/coupon-capture/coupons/batch
 * @desc    Ações em lote nos cupons
 * @access  Admin
 */
router.post('/coupons/batch', couponCaptureController.batchAction);

/**
 * @route   POST /api/coupon-capture/coupons/:id/verify
 * @desc    Verificar cupom específico
 * @access  Admin
 */
router.post('/coupons/:id/verify', couponCaptureController.verifyCoupon);

// ========================================
// APROVAÇÃO DE CUPONS CAPTURADOS
// ========================================

/**
 * @route   GET /api/coupon-capture/pending
 * @desc    Listar cupons pendentes de aprovação
 * @access  Admin
 */
router.get('/pending', couponCaptureController.listPendingCoupons);

/**
 * @route   PUT /api/coupon-capture/coupons/:id/approve
 * @desc    Aprovar cupom
 * @access  Admin
 */
router.put('/coupons/:id/approve', couponCaptureController.approveCoupon);

/**
 * @route   PUT /api/coupon-capture/coupons/:id/reject
 * @desc    Rejeitar cupom
 * @access  Admin
 */
router.put('/coupons/:id/reject', couponCaptureController.rejectCoupon);

/**
 * @route   POST /api/coupon-capture/coupons/approve-batch
 * @desc    Aprovar múltiplos cupons
 * @access  Admin
 */
router.post('/coupons/approve-batch', couponCaptureController.approveBatch);

/**
 * @route   POST /api/coupon-capture/coupons/reject-batch
 * @desc    Rejeitar múltiplos cupons
 * @access  Admin
 */
router.post('/coupons/reject-batch', couponCaptureController.rejectBatch);

// ============================================
// Rotas Específicas Shopee
// ============================================
router.get('/shopee/categories', couponCaptureController.getShopeeCategories);
router.post('/shopee/keyword', couponCaptureController.captureShopeeByKeyword);
router.post('/shopee/category/:categoryId', couponCaptureController.captureShopeeByCategory);
router.post('/shopee/verify', couponCaptureController.verifyShopeeCoupon);
router.get('/shopee/commission-stats', couponCaptureController.getShopeeCommissionStats);
router.post('/shopee/analyze-coupon', couponCaptureController.analyzeShopeeCoupon);
router.post('/shopee/analyze-product', couponCaptureController.analyzeShopeeProduct);

// ============================================
// Rotas de IA para Cupons
// ============================================
router.post('/ai/batch-analyze', couponCaptureController.batchAnalyzeCoupons);
router.post('/ai/generate-report', couponCaptureController.generateAnalysisReport);
router.post('/ai/filter-by-analysis', couponCaptureController.filterCouponsByAnalysis);
router.post('/ai/enhance-coupons', couponCaptureController.enhanceCoupons);

export default router;

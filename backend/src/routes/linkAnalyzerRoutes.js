import express from 'express';
import LinkAnalyzerController from '../controllers/linkAnalyzerController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Analisar link de afiliado (com rate limiting)
const analyzeLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por minuto
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em alguns instantes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Analisar múltiplos links (batch)
const batchLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5, // 5 requisições batch por minuto
  message: {
    success: false,
    error: 'Muitas requisições em lote. Tente novamente em alguns instantes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Analisar link único
router.post('/analyze', authenticateToken, requireAdmin, analyzeLimiter, LinkAnalyzerController.analyzeLink);

// Analisar múltiplos links (batch)
router.post('/analyze-batch', authenticateToken, requireAdmin, batchLimiter, LinkAnalyzerController.analyzeBatch);

// Obter estatísticas de análise
router.get('/stats', authenticateToken, requireAdmin, LinkAnalyzerController.getStats);

export default router;

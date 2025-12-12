import express from 'express';
import LinkAnalyzerController from '../controllers/linkAnalyzerController.js';

const router = express.Router();

// Analisar link de afiliado (sem autenticação por enquanto para testar)
router.post('/analyze', LinkAnalyzerController.analyzeLink);

export default router;

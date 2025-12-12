import linkAnalyzer from '../services/linkAnalyzer.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';

class LinkAnalyzerController {
  // Analisar link de afiliado
  static async analyzeLink(req, res, next) {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json(
          errorResponse('URL é obrigatória', 'MISSING_URL')
        );
      }

      // Validar URL
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json(
          errorResponse('URL inválida', 'INVALID_URL')
        );
      }

      logger.info(`Analisando link: ${url}`);

      // Analisar link
      const productInfo = await linkAnalyzer.analyzeLink(url);

      if (productInfo.error) {
        return res.status(400).json(
          errorResponse(productInfo.error, 'ANALYSIS_ERROR')
        );
      }

      logger.info(`Link analisado com sucesso: ${productInfo.platform}`);

      res.json(
        successResponse(
          productInfo,
          'Link analisado com sucesso'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export default LinkAnalyzerController;

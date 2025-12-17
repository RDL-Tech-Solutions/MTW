import linkAnalyzer from '../services/linkAnalyzer.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';

class LinkAnalyzerController {
  // Analisar link de afiliado
  static async analyzeLink(req, res, next) {
    try {
      const { url } = req.body;

      logger.info(`📥 Requisição recebida para análise de link: ${url}`);

      if (!url) {
        logger.warn('⚠️ URL não fornecida');
        return res.status(400).json(
          errorResponse('URL é obrigatória', 'MISSING_URL')
        );
      }

      // Validar URL
      let validUrl;
      try {
        validUrl = new URL(url);
        logger.info(`✅ URL válida: ${validUrl.href}`);
      } catch (error) {
        logger.warn(`⚠️ URL inválida: ${url}`);
        return res.status(400).json(
          errorResponse('URL inválida', 'INVALID_URL')
        );
      }

      // Verificar cache
      const cacheKey = `link_analysis:${validUrl.href}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        // Validar cache antes de usar (não usar cache com dados vazios ou lixo conhecido)
        const isGarbage = cached.name === 'shopee__settings' ||
          (cached.name && cached.name.includes('shopee__')) ||
          (cached.name && !cached.name.includes(' ')); // Nomes de produtos geralmente têm espaços

        const hasValidData = !isGarbage && ((cached.name && cached.name.trim().length > 0) ||
          (cached.currentPrice && cached.currentPrice > 0));

        if (hasValidData) {
          logger.info(`Link analisado (cache): ${url}`);
          return res.json(
            successResponse(cached, 'Link analisado com sucesso (cache)')
          );
        } else {
          logger.warn(`Cache inválido encontrado, re-analisando: ${url}`);
          // Não retornar cache inválido, continuar com a análise
        }
      }

      logger.info(`Analisando link: ${url}`);

      // Analisar link com retry
      let productInfo;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          productInfo = await linkAnalyzer.analyzeLink(url);
          break; // Sucesso, sair do loop
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            logger.error(`Erro ao analisar link após ${maxAttempts} tentativas: ${error.message}`);
            return res.status(500).json(
              errorResponse(
                `Erro ao analisar link: ${error.message}`,
                'ANALYSIS_ERROR'
              )
            );
          }
          // Aguardar antes de tentar novamente (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      if (productInfo.error) {
        return res.status(400).json(
          errorResponse(productInfo.error, 'ANALYSIS_ERROR')
        );
      }

      // Validar se os dados essenciais foram extraídos antes de salvar no cache
      const hasName = productInfo.name && productInfo.name.trim().length > 0;
      const hasPrice = productInfo.currentPrice && productInfo.currentPrice > 0;

      if (!hasName && !hasPrice) {
        logger.warn(`Extração retornou dados vazios para: ${url}`);
        return res.status(400).json(
          errorResponse(
            'Não foi possível extrair informações do produto. O link pode estar inválido ou o produto pode não estar mais disponível.',
            'EXTRACTION_FAILED'
          )
        );
      }

      // Só salvar no cache se temos dados válidos
      if (hasName || hasPrice) {
        await cacheSet(cacheKey, productInfo, CACHE_TTL.LINK_ANALYSIS || 3600);
      }

      logger.info(`Link analisado com sucesso: ${productInfo.platform} - Nome: ${hasName ? 'Sim' : 'Não'}, Preço: ${hasPrice ? 'Sim' : 'Não'}`);

      res.json(
        successResponse(
          productInfo,
          'Link analisado com sucesso'
        )
      );
    } catch (error) {
      logger.error(`Erro no controller de análise: ${error.message}`);
      next(error);
    }
  }

  // Analisar múltiplos links (batch)
  static async analyzeBatch(req, res, next) {
    try {
      const { urls } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json(
          errorResponse('Lista de URLs é obrigatória e deve ser um array', 'MISSING_URLS')
        );
      }

      if (urls.length > 10) {
        return res.status(400).json(
          errorResponse('Máximo de 10 URLs por requisição', 'TOO_MANY_URLS')
        );
      }

      logger.info(`Analisando ${urls.length} links em lote`);

      const results = await Promise.allSettled(
        urls.map(async (url, index) => {
          try {
            const productInfo = await linkAnalyzer.analyzeLink(url);
            return {
              index,
              url,
              success: true,
              data: productInfo
            };
          } catch (error) {
            return {
              index,
              url,
              success: false,
              error: error.message
            };
          }
        })
      );

      const successful = results.filter(r => r.value?.success).length;
      const failed = results.length - successful;

      logger.info(`Análise em lote concluída: ${successful} sucesso, ${failed} falhas`);

      res.json(
        successResponse({
          total: urls.length,
          successful,
          failed,
          results: results.map(r => r.value || r.reason)
        }, `Análise concluída: ${successful} sucesso, ${failed} falhas`)
      );
    } catch (error) {
      logger.error(`Erro na análise em lote: ${error.message}`);
      next(error);
    }
  }

  // Obter estatísticas de análise
  static async getStats(req, res, next) {
    try {
      // Estatísticas básicas (pode ser expandido com dados do banco)
      const stats = {
        total_analyses: 0, // Seria obtido do banco de dados
        success_rate: 0,
        platforms: {
          shopee: 0,
          mercadolivre: 0,
          amazon: 0,
          unknown: 0
        },
        last_24h: 0
      };

      res.json(successResponse(stats, 'Estatísticas de análise'));
    } catch (error) {
      next(error);
    }
  }
}

export default LinkAnalyzerController;


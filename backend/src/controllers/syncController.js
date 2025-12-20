import SyncConfig from '../models/SyncConfig.js';
import SyncLog from '../models/SyncLog.js';
import Product from '../models/Product.js';
import meliSync from '../services/autoSync/meliSync.js';
import shopeeSync from '../services/autoSync/shopeeSync.js';
import amazonSync from '../services/autoSync/amazonSync.js';
import aliExpressSync from '../services/autoSync/aliExpressSync.js';
import publishService from '../services/autoSync/publishService.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';
// Módulos de IA
import productAnalyzer from '../ai/productAnalyzer.js';
import descriptionOptimizer from '../ai/descriptionOptimizer.js';
import priceAnalyzer from '../ai/priceAnalyzer.js';
import keywordOptimizer from '../ai/keywordOptimizer.js';
import intelligentFilter from '../ai/intelligentFilter.js';

class SyncController {
  /**
   * GET /api/sync/config
   * Buscar configuração atual
   */
  static async getConfig(req, res, next) {
    try {
      const config = await SyncConfig.get();
      res.json(successResponse(config));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/config
   * Salvar/atualizar configuração
   */
  static async saveConfig(req, res, next) {
    try {
      const config = await SyncConfig.upsert(req.body);

      logger.info('⚙️ Configuração de sincronização atualizada');

      res.json(successResponse(config, 'Configuração salva com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/run-now
   * Executar sincronização manualmente
   */
  static async runNow(req, res, next) {
    try {
      logger.info('🚀 Iniciando sincronização manual...');

      const config = await SyncConfig.get();

      if (!config.shopee_enabled && !config.mercadolivre_enabled && !config.amazon_enabled && !config.aliexpress_enabled) {
        return res.status(400).json(errorResponse(
          'Nenhuma plataforma habilitada para sincronização',
          'SYNC_DISABLED'
        ));
      }

      const results = {
        mercadolivre: { total: 0, new: 0, errors: 0 },
        shopee: { total: 0, new: 0, errors: 0 },
        amazon: { total: 0, new: 0, errors: 0 },
        aliexpress: { total: 0, new: 0, errors: 0 }
      };

      // Sincronizar Mercado Livre
      if (config.mercadolivre_enabled) {
        try {
          const meliResults = await SyncController.syncMercadoLivre(config);
          results.mercadolivre = meliResults;
        } catch (error) {
          logger.error(`❌ Erro na sincronização ML: ${error.message}`);
          results.mercadolivre.errors++;
        }
      }

      // Sincronizar Shopee
      if (config.shopee_enabled) {
        try {
          const shopeeResults = await SyncController.syncShopee(config);
          results.shopee = shopeeResults;
        } catch (error) {
          logger.error(`❌ Erro na sincronização Shopee: ${error.message}`);
          results.shopee.errors++;
        }
      }

      // Sincronizar Amazon
      if (config.amazon_enabled) {
        try {
          const amazonResults = await SyncController.syncAmazon(config);
          results.amazon = amazonResults;
        } catch (error) {
          logger.error(`❌ Erro na sincronização Amazon: ${error.message}`);
          results.amazon.errors++;
        }
      }

      // Sincronizar AliExpress
      if (config.aliexpress_enabled) {
        try {
          const aliExpressResults = await SyncController.syncAliExpress(config);
          results.aliexpress = aliExpressResults;
        } catch (error) {
          logger.error(`❌ Erro na sincronização AliExpress: ${error.message}`);
          results.aliexpress.errors++;
        }
      }

      // Sincronizar AliExpress
      if (config.aliexpress_enabled) {
        try {
          const aliExpressResults = await SyncController.syncAliExpress(config);
          results.aliexpress = aliExpressResults;
        } catch (error) {
          logger.error(`❌ Erro na sincronização AliExpress: ${error.message}`);
          results.aliexpress.errors++;
        }
      }

      logger.info('✅ Sincronização manual concluída', results);

      res.json(successResponse(results, 'Sincronização executada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sync/history
   * Buscar histórico de sincronizações
   */
  static async getHistory(req, res, next) {
    try {
      const result = await SyncLog.findAll(req.query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sync/stats
   * Estatísticas de sincronização
   */
  /**
   * POST /api/sync/run/:platform
   * Executar sincronização de uma plataforma específica
   */
  static async runPlatform(req, res, next) {
    try {
      const { platform } = req.params;
      const config = await SyncConfig.get();

      logger.info(`🚀 Iniciando sincronização manual de ${platform}...`);

      let results = { total: 0, new: 0, errors: 0 };

      switch (platform.toLowerCase()) {
        case 'mercadolivre':
        case 'meli':
          if (!config.mercadolivre_enabled) {
            return res.status(400).json(errorResponse('Mercado Livre não está habilitado', 'PLATFORM_DISABLED'));
          }
          results = await SyncController.syncMercadoLivre(config);
          break;

        case 'shopee':
          if (!config.shopee_enabled) {
            return res.status(400).json(errorResponse('Shopee não está habilitado', 'PLATFORM_DISABLED'));
          }
          results = await SyncController.syncShopee(config);
          break;

        case 'amazon':
          if (!config.amazon_enabled) {
            return res.status(400).json(errorResponse('Amazon não está habilitado', 'PLATFORM_DISABLED'));
          }
          results = await SyncController.syncAmazon(config);
          break;

        case 'aliexpress':
          if (!config.aliexpress_enabled) {
            return res.status(400).json(errorResponse('AliExpress não está habilitado', 'PLATFORM_DISABLED'));
          }
          results = await SyncController.syncAliExpress(config);
          break;

        default:
          return res.status(400).json(errorResponse(`Plataforma '${platform}' não reconhecida`, 'INVALID_PLATFORM'));
      }

      res.json(successResponse(results, `Sincronização de ${platform} concluída`));
    } catch (error) {
      logger.error(`❌ Erro ao sincronizar plataforma: ${error.message}`);
      next(error);
    }
  }

  static async getStats(req, res, next) {
    try {
      const { days = 7 } = req.query;
      const stats = await SyncLog.getStats(parseInt(days));
      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Métodos Auxiliares Privados
  // ============================================

  /**
   * Sincronizar produtos do Mercado Livre
   */
  static async syncMercadoLivre(config) {
    const results = { total: 0, new: 0, errors: 0 };

    try {
      // 1. Buscar produtos
      const products = await meliSync.fetchMeliProducts(config.keywords, 50);

      // 2. Filtrar promoções
      const promotions = await meliSync.filterMeliPromotions(
        products,
        config.min_discount_percentage
      );

      results.total = promotions.length;

      // 3. Salvar e publicar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await meliSync.saveMeliToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Publicar no app e enviar para bots
            const publishResult = await publishService.publishAll(product);

            // Registrar log
            await SyncLog.create({
              platform: 'mercadolivre',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });
          } else {
            // Produto já existia
            await SyncLog.create({
              platform: 'mercadolivre',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: false,
              sent_to_bots: false
            });
          }
        } catch (error) {
          logger.error(`❌ Erro ao processar produto: ${error.message}`);
          results.errors++;

          await SyncLog.create({
            platform: 'mercadolivre',
            product_name: promo.name,
            product_id: null,
            discount_percentage: promo.discount_percentage,
            is_new_product: false,
            sent_to_bots: false,
            error_message: error.message
          });
        }
      }
    } catch (error) {
      logger.error(`❌ Erro geral na sincronização ML: ${error.message}`);
      results.errors++;
      throw error;
    }

    return results;
  }

  /**
   * Sincronizar produtos da Shopee
   */
  /**
   * Sincronizar produtos da Amazon
   */
  static async syncAmazon(config) {
    const results = { total: 0, new: 0, errors: 0 };

    try {
      // 1. Buscar produtos
      const products = await amazonSync.fetchAmazonProducts(config.keywords, 50);

      // 2. Filtrar promoções
      const promotions = amazonSync.filterAmazonPromotions(
        products,
        config.min_discount_percentage
      );

      results.total = promotions.length;

      // 3. Salvar e publicar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await amazonSync.saveAmazonToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Publicar no app e enviar para bots
            const publishResult = await publishService.publishAll(product);

            // Registrar log
            await SyncLog.create({
              platform: 'amazon',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });
          } else {
            // Produto já existia
            await SyncLog.create({
              platform: 'amazon',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: false,
              sent_to_bots: false
            });
          }
        } catch (error) {
          results.errors++;
          logger.error(`❌ Erro ao processar ${promo.name}: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors++;
      throw error;
    }

    return results;
  }

  /**
   * Sincronizar produtos do AliExpress
   */
  static async syncAliExpress(config) {
    const results = { total: 0, new: 0, errors: 0 };

    try {
      // Obter configuração de origem de produtos do AliExpress
      const AppSettings = (await import('../models/AppSettings.js')).default;
      const aliExpressConfig = await AppSettings.getAliExpressConfig();
      const productOrigin = aliExpressConfig.productOrigin || 'both';
      
      logger.info(`🌍 Origem de produtos AliExpress: ${productOrigin}`);
      
      // 1. Buscar produtos com origem especificada
      const products = await aliExpressSync.fetchAliExpressProducts(config.keywords, 50, productOrigin);

      // 2. Filtrar promoções
      const promotions = aliExpressSync.filterAliExpressPromotions(
        products,
        config.min_discount_percentage
      );

      results.total = promotions.length;

      // 3. Processar cada promoção (salvar como pendente, não publicar automaticamente)
      for (const promo of promotions) {
        try {
          // Salvar no banco (já salva com status 'pending')
          const { product, isNew } = await aliExpressSync.saveAliExpressToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Log (produto salvo como pendente, não publicado automaticamente)
            // Seguindo a mesma estratégia do Mercado Livre
            await SyncLog.create({
              platform: 'aliexpress',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: false // Não enviar automaticamente, fica em /pending-products
            });

            logger.info(`📦 Novo produto salvo (pendente): ${product.name} (${product.discount_percentage}% OFF)`);
          } else {
            // Produto já existia
            await SyncLog.create({
              platform: 'aliexpress',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: false,
              sent_to_bots: false
            });
          }
        } catch (error) {
          results.errors++;
          logger.error(`❌ Erro ao processar ${promo.name}: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors++;
      throw error;
    }

    return results;
  }

  static async syncShopee(config) {
    const results = { total: 0, new: 0, errors: 0 };

    try {
      // 1. Buscar produtos
      const products = await shopeeSync.fetchShopeeProducts(config.keywords, 50);

      // 2. Filtrar promoções
      const promotions = shopeeSync.filterShopeePromotions(
        products,
        config.min_discount_percentage
      );

      results.total = promotions.length;

      // 3. Processar cada promoção (salvar como pendente, não publicar automaticamente)
      for (const promo of promotions) {
        try {
          // Salvar no banco (já salva com status 'pending')
          const { product, isNew } = await shopeeSync.saveShopeeToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Log (produto salvo como pendente, não publicado automaticamente)
            // Seguindo a mesma estratégia do AliExpress e do autoSyncCron
            await SyncLog.create({
              platform: 'shopee',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: false // Não enviar automaticamente, fica em /pending-products
            });

            logger.info(`📦 Novo produto salvo (pendente): ${product.name} (${product.discount_percentage}% OFF)`);
          } else {
            // Produto já existia
            await SyncLog.create({
              platform: 'shopee',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: false,
              sent_to_bots: false
            });
          }
        } catch (error) {
          logger.error(`❌ Erro ao processar produto: ${error.message}`);
          results.errors++;

          await SyncLog.create({
            platform: 'shopee',
            product_name: promo.name,
            product_id: null,
            discount_percentage: promo.discount_percentage,
            is_new_product: false,
            sent_to_bots: false,
            error_message: error.message
          });
        }
      }
    } catch (error) {
      logger.error(`❌ Erro geral na sincronização Shopee: ${error.message}`);
      results.errors++;
      throw error;
    }

    return results;
  }

  // ============================================
  // Endpoints de IA
  // ============================================

  /**
   * POST /api/sync/ai/analyze-product
   * Analisar produto usando IA
   */
  static async analyzeProduct(req, res, next) {
    try {
      const { product } = req.body;

      if (!product) {
        return res.status(400).json(errorResponse('Produto é obrigatório'));
      }

      const analysis = await productAnalyzer.analyzeProduct(product);

      res.json(successResponse(analysis, 'Análise concluída com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/ai/optimize-description
   * Otimizar descrição de produto usando IA
   */
  static async optimizeDescription(req, res, next) {
    try {
      const { product, current_description } = req.body;

      if (!product) {
        return res.status(400).json(errorResponse('Produto é obrigatório'));
      }

      const optimized = await descriptionOptimizer.optimizeDescription(
        product,
        current_description || ''
      );

      res.json(successResponse({ description: optimized }, 'Descrição otimizada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/ai/analyze-price
   * Analisar preço de produto usando IA
   */
  static async analyzePrice(req, res, next) {
    try {
      const { product, similar_products } = req.body;

      if (!product) {
        return res.status(400).json(errorResponse('Produto é obrigatório'));
      }

      const analysis = await priceAnalyzer.analyzePrice(
        product,
        similar_products || []
      );

      res.json(successResponse(analysis, 'Análise de preço concluída'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/ai/optimize-keywords
   * Otimizar keywords usando IA
   */
  static async optimizeKeywords(req, res, next) {
    try {
      const { current_keywords, product_name, category } = req.body;

      if (!product_name) {
        return res.status(400).json(errorResponse('Nome do produto é obrigatório'));
      }

      const optimized = await keywordOptimizer.optimizeKeywords(
        current_keywords || '',
        product_name,
        category || ''
      );

      res.json(successResponse(optimized, 'Keywords otimizadas com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/ai/filter-products
   * Filtrar produtos usando IA
   */
  static async filterProducts(req, res, next) {
    try {
      const { products, config } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json(errorResponse('Array de produtos é obrigatório'));
      }

      const filterConfig = {
        minQualityScore: config?.min_quality_score || 0.6,
        minRelevanceScore: config?.min_relevance_score || 0.5,
        minPriceScore: config?.min_price_score || 0.5,
        requireGoodDeal: config?.require_good_deal || false,
        useAI: config?.use_ai !== false, // Default true
        min_discount_percentage: config?.min_discount_percentage || 10,
        ...config
      };

      const results = await intelligentFilter.filterProducts(products, filterConfig);

      res.json(successResponse(results, 'Filtragem concluída'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/sync/ai/batch-analyze
   * Analisar múltiplos produtos em lote
   */
  static async batchAnalyze(req, res, next) {
    try {
      const { products } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json(errorResponse('Array de produtos é obrigatório'));
      }

      if (products.length > 50) {
        return res.status(400).json(errorResponse('Máximo de 50 produtos por lote'));
      }

      const analyses = await productAnalyzer.analyzeBatch(products);

      res.json(successResponse(analyses, 'Análises concluídas'));
    } catch (error) {
      next(error);
    }
  }
}

export default SyncController;

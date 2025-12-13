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
      const promotions = meliSync.filterMeliPromotions(
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
      // 1. Buscar produtos
      const products = await aliExpressSync.fetchAliExpressProducts(config.keywords, 50);

      // 2. Filtrar promoções
      const promotions = aliExpressSync.filterAliExpressPromotions(
        products,
        config.min_discount_percentage
      );

      results.total = promotions.length;

      // 3. Salvar e publicar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await aliExpressSync.saveAliExpressToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Publicar no app e enviar para bots
            const publishResult = await publishService.publishAll(product);

            // Registrar log
            await SyncLog.create({
              platform: 'aliexpress',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });
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

      // 3. Salvar e publicar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await shopeeSync.saveShopeeToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Publicar no app e enviar para bots
            const publishResult = await publishService.publishAll(product);

            // Registrar log
            await SyncLog.create({
              platform: 'shopee',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });
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
}

export default SyncController;

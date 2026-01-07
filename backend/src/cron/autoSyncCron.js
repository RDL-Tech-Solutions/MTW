import cron from 'node-cron';
import SyncConfig from '../models/SyncConfig.js';
import SyncLog from '../models/SyncLog.js';
import Product from '../models/Product.js';
import meliSync from '../services/autoSync/meliSync.js';
import shopeeSync from '../services/autoSync/shopeeSync.js';
import amazonSync from '../services/autoSync/amazonSync.js';
import aliExpressSync from '../services/autoSync/aliExpressSync.js';
import publishService from '../services/autoSync/publishService.js';
import productAnalyzer from '../ai/productAnalyzer.js';
import logger from '../config/logger.js';

class AutoSyncCron {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Iniciar o cron job
   */
  async start() {
    try {
      const config = await SyncConfig.get();

      if (!config.is_active) {
        logger.info('⏸️ Sincronização automática desativada');
        return;
      }

      // Parar tarefa anterior se existir
      if (this.task) {
        this.task.stop();
      }

      // Converter minutos para expressão cron
      const cronExpression = this.minutesToCronExpression(config.cron_interval_minutes);

      logger.info(`⏰ Agendando sincronização automática: a cada ${config.cron_interval_minutes} minutos`);
      logger.info(`📅 Expressão cron: ${cronExpression}`);

      // Criar nova tarefa
      this.task = cron.schedule(cronExpression, async () => {
        if (this.isRunning) {
          logger.warn('⚠️ Sincronização anterior ainda em execução, pulando...');
          return;
        }

        await this.runSync();
      });

      logger.info('✅ Cron de sincronização automática iniciado!');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar cron: ${error.message}`);
    }
  }

  /**
   * Parar o cron job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('⏹️ Cron de sincronização automática parado');
    }
  }

  /**
   * Reiniciar o cron job (após mudança de configuração)
   */
  async restart() {
    this.stop();
    await this.start();
  }

  /**
   * Executar sincronização
   */
  async runSync() {
    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🚀 ========== INICIANDO SINCRONIZAÇÃO AUTOMÁTICA ==========');

      const config = await SyncConfig.get();

      if (!config.is_active) {
        logger.info('⏸️ Sincronização desativada, abortando...');
        return;
      }

      const results = {
        mercadolivre: { total: 0, new: 0, errors: 0 },
        shopee: { total: 0, new: 0, errors: 0 },
        amazon: { total: 0, new: 0, errors: 0 },
        aliexpress: { total: 0, new: 0, errors: 0 }
      };

      // Sincronizar Mercado Livre
      if (config.mercadolivre_enabled) {
        logger.info('🛒 Sincronizando Mercado Livre...');
        try {
          results.mercadolivre = await this.syncMercadoLivre(config);
        } catch (error) {
          logger.error(`❌ Erro na sincronização ML: ${error.message}`);
          results.mercadolivre.errors++;
        }
      }

      // Sincronizar Shopee
      if (config.shopee_enabled) {
        logger.info('🛍️ Sincronizando Shopee...');
        try {
          results.shopee = await this.syncShopee(config);
        } catch (error) {
          logger.error(`❌ Erro na sincronização Shopee: ${error.message}`);
          results.shopee.errors++;
        }
      }

      // Sincronizar Amazon
      if (config.amazon_enabled) {
        logger.info('📦 Sincronizando Amazon...');
        try {
          results.amazon = await this.syncAmazon(config);
        } catch (error) {
          logger.error(`❌ Erro na sincronização Amazon: ${error.message}`);
          results.amazon.errors++;
        }
      }

      // Sincronizar AliExpress
      if (config.aliexpress_enabled) {
        logger.info('🌐 Sincronizando AliExpress...');
        try {
          results.aliexpress = await this.syncAliExpress(config);
        } catch (error) {
          logger.error(`❌ Erro na sincronização AliExpress: ${error.message}`);
          results.aliexpress.errors++;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalNew = results.mercadolivre.new + results.shopee.new + results.amazon.new + results.aliexpress.new;

      logger.info('✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========');
      logger.info(`⏱️ Duração: ${duration}s`);
      logger.info(`📊 Mercado Livre: ${results.mercadolivre.new} novos de ${results.mercadolivre.total}`);
      logger.info(`📊 Shopee: ${results.shopee.new} novos de ${results.shopee.total}`);
      logger.info(`📊 Amazon: ${results.amazon.new} novos de ${results.amazon.total}`);
      logger.info(`📊 AliExpress: ${results.aliexpress.new} novos de ${results.aliexpress.total}`);
      logger.info(`🎉 Total de produtos novos: ${totalNew}`);

    } catch (error) {
      logger.error(`❌ Erro fatal na sincronização: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Analisar produto estrategicamente com IA e decidir se deve publicar
   * @param {Object} product - Produto a analisar
   * @param {boolean} autoPublishEnabled - Se auto-publicação está habilitada
   * @returns {Promise<{shouldPublish: boolean, analysis: Object}>}
   */
  async analyzeAndDecidePublish(product, autoPublishEnabled) {
    if (!autoPublishEnabled) {
      return { shouldPublish: false, analysis: null };
    }

    try {
      logger.info(`🤖 Analisando produto estrategicamente: ${product.name?.substring(0, 50)}...`);
      const analysis = await productAnalyzer.analyzeProduct(product);

      logger.info(`📊 Análise estratégica: should_publish=${analysis.should_publish}, confidence=${analysis.confidence.toFixed(2)}`);
      const shouldPublish = analysis.should_publish === true && analysis.confidence >= 0.7;

      if (shouldPublish) {
        logger.info(`✅ Produto aprovado pela IA para publicação automática`);
      } else {
        logger.info(`⏸️ Produto rejeitado pela IA - ficará em /pending-products`);
      }

      return { shouldPublish, analysis };
    } catch (error) {
      // Re-throw critical errors
      const criticalErrors = [
        'OpenRouter API Key inválida',
        'Rate limit',
        'Créditos insuficientes',
        'OpenRouter está desabilitado'
      ];

      if (criticalErrors.some(msg => error.message && error.message.includes(msg))) {
        throw error;
      }

      logger.error(`❌ Erro na análise estratégica: ${error.message}`);
      return { shouldPublish: false, analysis: null };
    }
  }

  /**
   * Sincronizar Mercado Livre
   */
  async syncMercadoLivre(config) {
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

      // 3. Processar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await meliSync.saveMeliToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Verificar se auto-publicação está habilitada para esta plataforma
            const autoPublishEnabled = config.mercadolivre_auto_publish === true;

            if (autoPublishEnabled) {
              // Fazer análise estratégica com IA
              const { shouldPublish } = await this.analyzeAndDecidePublish(product, true);

              if (shouldPublish) {
                // Publicar automaticamente no app e enviar para bots
                const publishResult = await publishService.publishAll(product);
                await Product.update(product.id, { status: 'active' });

                await SyncLog.create({
                  platform: 'mercadolivre',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: publishResult.success
                });

                logger.info(`✅ Produto publicado automaticamente: ${product.name}`);
              } else {
                await SyncLog.create({
                  platform: 'mercadolivre',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: false
                });

                logger.info(`⏸️ Produto ficará em /pending-products: ${product.name}`);
              }
            } else {
              // Auto-publicação desabilitada - produto fica pendente
              await SyncLog.create({
                platform: 'mercadolivre',
                product_name: product.name,
                product_id: product.id,
                discount_percentage: product.discount_percentage,
                is_new_product: true,
                sent_to_bots: false
              });

              logger.info(`⏸️ Auto-publicação desabilitada - produto ficará em /pending-products: ${product.name}`);
            }
          }
        } catch (error) {
          // Check for critical errors to abort loop
          const criticalErrors = [
            'OpenRouter API Key inválida',
            'Rate limit',
            'Créditos insuficientes',
            'OpenRouter está desabilitado'
          ];
          if (criticalErrors.some(msg => error.message && error.message.includes(msg))) {
            logger.error(`⛔ Erro crítico na IA. Abortando sincronização ML para evitar loop: ${error.message}`);
            break;
          }

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
   * Sincronizar Shopee
   */
  async syncShopee(config) {
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

      // 3. Processar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await shopeeSync.saveShopeeToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Verificar se auto-publicação está habilitada para esta plataforma
            const autoPublishEnabled = config.shopee_auto_publish === true;

            if (autoPublishEnabled) {
              const { shouldPublish } = await this.analyzeAndDecidePublish(product, true);

              if (shouldPublish) {
                const publishResult = await publishService.publishAll(product);
                await Product.update(product.id, { status: 'active' });

                await SyncLog.create({
                  platform: 'shopee',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: publishResult.success
                });

                logger.info(`✅ Produto publicado automaticamente: ${product.name}`);
              } else {
                await SyncLog.create({
                  platform: 'shopee',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: false
                });

                logger.info(`⏸️ Produto ficará em /pending-products: ${product.name}`);
              }
            } else {
              await SyncLog.create({
                platform: 'shopee',
                product_name: product.name,
                product_id: product.id,
                discount_percentage: product.discount_percentage,
                is_new_product: true,
                sent_to_bots: false
              });

              logger.info(`⏸️ Auto-publicação desabilitada - produto ficará em /pending-products: ${product.name}`);
            }
          }
        } catch (error) {
          // Check for critical errors to abort loop
          const criticalErrors = [
            'OpenRouter API Key inválida',
            'Rate limit',
            'Créditos insuficientes',
            'OpenRouter está desabilitado'
          ];
          if (criticalErrors.some(msg => error.message && error.message.includes(msg))) {
            logger.error(`⛔ Erro crítico na IA. Abortando sincronização Shopee para evitar loop: ${error.message}`);
            break;
          }

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
   * Sincronizar Amazon
   */
  async syncAmazon(config) {
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

      // 3. Processar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await amazonSync.saveAmazonToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Verificar se auto-publicação está habilitada para esta plataforma
            const autoPublishEnabled = config.amazon_auto_publish === true;

            if (autoPublishEnabled) {
              const fullProduct = await Product.findById(product.id);
              const { shouldPublish } = await this.analyzeAndDecidePublish(fullProduct, true);

              if (shouldPublish) {
                const publishResult = await publishService.publishAll(fullProduct);
                await Product.update(fullProduct.id, { status: 'active' });

                await SyncLog.create({
                  platform: 'amazon',
                  product_name: fullProduct.name,
                  product_id: fullProduct.id,
                  discount_percentage: fullProduct.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: publishResult.success
                });

                logger.info(`✅ Produto publicado automaticamente: ${fullProduct.name}`);
              } else {
                await SyncLog.create({
                  platform: 'amazon',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: false
                });

                logger.info(`⏸️ Produto ficará em /pending-products: ${product.name}`);
              }
            } else {
              await SyncLog.create({
                platform: 'amazon',
                product_name: product.name,
                product_id: product.id,
                discount_percentage: product.discount_percentage,
                is_new_product: true,
                sent_to_bots: false
              });

              logger.info(`⏸️ Auto-publicação desabilitada - produto ficará em /pending-products: ${product.name}`);
            }
          }
        } catch (error) {
          // Check for critical errors to abort loop
          const criticalErrors = [
            'OpenRouter API Key inválida',
            'Rate limit',
            'Créditos insuficientes',
            'OpenRouter está desabilitado'
          ];
          if (criticalErrors.some(msg => error.message && error.message.includes(msg))) {
            logger.error(`⛔ Erro crítico na IA. Abortando sincronização Amazon para evitar loop: ${error.message}`);
            break;
          }

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
   * Sincronizar AliExpress
   */
  async syncAliExpress(config) {
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

      // 3. Processar cada promoção
      for (const promo of promotions) {
        try {
          // Salvar no banco
          const { product, isNew } = await aliExpressSync.saveAliExpressToDatabase(promo, Product);

          if (isNew) {
            results.new++;

            // Verificar se auto-publicação está habilitada para esta plataforma
            const autoPublishEnabled = config.aliexpress_auto_publish === true;

            if (autoPublishEnabled) {
              const { shouldPublish } = await this.analyzeAndDecidePublish(product, true);

              if (shouldPublish) {
                const publishResult = await publishService.publishAll(product);
                await Product.update(product.id, { status: 'active' });

                await SyncLog.create({
                  platform: 'aliexpress',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: publishResult.success
                });

                logger.info(`✅ Produto publicado automaticamente: ${product.name}`);
              } else {
                await SyncLog.create({
                  platform: 'aliexpress',
                  product_name: product.name,
                  product_id: product.id,
                  discount_percentage: product.discount_percentage,
                  is_new_product: true,
                  sent_to_bots: false
                });

                logger.info(`⏸️ Produto ficará em /pending-products: ${product.name}`);
              }
            } else {
              await SyncLog.create({
                platform: 'aliexpress',
                product_name: product.name,
                product_id: product.id,
                discount_percentage: product.discount_percentage,
                is_new_product: true,
                sent_to_bots: false
              });

              logger.info(`⏸️ Auto-publicação desabilitada - produto ficará em /pending-products: ${product.name}`);
            }
          }
        } catch (error) {
          // Check for critical errors to abort loop
          const criticalErrors = [
            'OpenRouter API Key inválida',
            'Rate limit',
            'Créditos insuficientes',
            'OpenRouter está desabilitado'
          ];
          if (criticalErrors.some(msg => error.message && error.message.includes(msg))) {
            logger.error(`⛔ Erro crítico na IA. Abortando sincronização AliExpress para evitar loop: ${error.message}`);
            break;
          }

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
   * Converter minutos para expressão cron
   */
  minutesToCronExpression(minutes) {
    if (minutes < 1) minutes = 1;
    if (minutes > 1440) minutes = 1440; // Max 24 horas

    if (minutes === 1) {
      return '* * * * *'; // Cada minuto
    } else if (minutes < 60) {
      return `*/${minutes} * * * *`; // A cada X minutos
    } else if (minutes === 60) {
      return '0 * * * *'; // A cada hora
    } else if (minutes === 1440) {
      return '0 0 * * *'; // Uma vez por dia
    } else {
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`; // A cada X horas
    }
  }
}

// Exportar instância única (singleton)
export default new AutoSyncCron();

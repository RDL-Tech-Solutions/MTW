import cron from 'node-cron';
import SyncConfig from '../models/SyncConfig.js';
import SyncLog from '../models/SyncLog.js';
import Product from '../models/Product.js';
import meliSync from '../services/autoSync/meliSync.js';
import shopeeSync from '../services/autoSync/shopeeSync.js';
import publishService from '../services/autoSync/publishService.js';
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
        shopee: { total: 0, new: 0, errors: 0 }
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

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalNew = results.mercadolivre.new + results.shopee.new;

      logger.info('✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========');
      logger.info(`⏱️ Duração: ${duration}s`);
      logger.info(`📊 Mercado Livre: ${results.mercadolivre.new} novos de ${results.mercadolivre.total}`);
      logger.info(`📊 Shopee: ${results.shopee.new} novos de ${results.shopee.total}`);
      logger.info(`🎉 Total de produtos novos: ${totalNew}`);

    } catch (error) {
      logger.error(`❌ Erro fatal na sincronização: ${error.message}`);
    } finally {
      this.isRunning = false;
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
      const promotions = meliSync.filterMeliPromotions(
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

            // Publicar e notificar
            const publishResult = await publishService.publishAll(product);

            // Log
            await SyncLog.create({
              platform: 'mercadolivre',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });

            logger.info(`✨ Novo produto publicado: ${product.name} (${product.discount_percentage}% OFF)`);
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

            // Publicar e notificar
            const publishResult = await publishService.publishAll(product);

            // Log
            await SyncLog.create({
              platform: 'shopee',
              product_name: product.name,
              product_id: product.id,
              discount_percentage: product.discount_percentage,
              is_new_product: true,
              sent_to_bots: publishResult.success
            });

            logger.info(`✨ Novo produto publicado: ${product.name} (${product.discount_percentage}% OFF)`);
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

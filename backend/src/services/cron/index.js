import cron from 'node-cron';
import logger from '../../config/logger.js';
import { updatePrices } from './updatePrices.js';
import { checkExpiredCoupons } from './checkExpiredCoupons.js';
import { sendNotifications } from './sendNotifications.js';
import { cleanupOldData } from './cleanupOldData.js';
import { syncProducts } from './syncProducts.js';
import { monitorExpiredCoupons } from './monitorExpiredCoupons.js';

export const startCronJobs = () => {
  logger.info('🕐 Iniciando cron jobs...');

  // Atualizar preços e sincronizar produtos - a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ Executando: Atualização de preços e sincronização');
    try {
      await syncProducts();
      await updatePrices();
    } catch (error) {
      logger.error(`Erro no cron de atualização: ${error.message}`);
    }
  });

  // Verificar cupons expirados - a cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    logger.info('⏰ Executando: Verificação de cupons expirados');
    try {
      await checkExpiredCoupons();
    } catch (error) {
      logger.error(`Erro no cron de cupons: ${error.message}`);
    }
  });

  // Enviar notificações pendentes - a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    logger.info('⏰ Executando: Envio de notificações');
    try {
      await sendNotifications();
    } catch (error) {
      logger.error(`Erro no cron de notificações: ${error.message}`);
    }
  });

  // Limpeza de dados antigos - diariamente às 3h
  cron.schedule('0 3 * * *', async () => {
    logger.info('⏰ Executando: Limpeza de dados antigos');
    try {
      await cleanupOldData();
    } catch (error) {
      logger.error(`Erro no cron de limpeza: ${error.message}`);
    }
  });

  // Monitorar cupons expirados e enviar notificações via bots - a cada 1 minuto
  cron.schedule('* * * * *', async () => {
    logger.info('⏰ Executando: Monitoramento de cupons expirados');
    try {
      await monitorExpiredCoupons();
    } catch (error) {
      logger.error(`Erro no cron de monitoramento: ${error.message}`);
    }
  });

  logger.info('✅ Cron jobs iniciados com sucesso');
};

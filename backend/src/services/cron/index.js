import cron from 'node-cron';
import logger from '../../config/logger.js';
import { updatePrices } from './updatePrices.js';
import { checkExpiredCoupons } from './checkExpiredCoupons.js';
import { sendNotifications } from './sendNotifications.js';
import { cleanupOldData } from './cleanupOldData.js';
import { monitorExpiredCoupons } from './monitorExpiredCoupons.js';
import autoSyncCron from '../../cron/autoSyncCron.js';
import couponCaptureCron from '../../cron/couponCaptureCron.js';
import schedulerCron from '../../cron/schedulerCron.js';
import AppSettings from '../../models/AppSettings.js';

// Armazenar referência da tarefa de limpeza para poder reiniciá-la
let cleanupTask = null;

export const startCronJobs = async () => {
  logger.info('🕐 Iniciando cron jobs...');

  // Atualizar preços - a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ Executando: Atualização de preços');
    try {
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

  // Limpeza de dados antigos - horário configurável
  await startCleanupCron();

  // Monitorar cupons expirados e enviar notificações via bots - a cada 1 minuto
  cron.schedule('* * * * *', async () => {
    logger.info('⏰ Executando: Monitoramento de cupons expirados');
    try {
      await monitorExpiredCoupons();
    } catch (error) {
      logger.error(`Erro no cron de monitoramento: ${error.message}`);
    }
  });

  // Iniciar sincronização automática de produtos (Shopee & Mercado Livre)
  // Intervalo configurável pelo painel admin
  autoSyncCron.start().catch(error => {
    logger.error(`Erro ao iniciar auto-sync cron: ${error.message}`);
  });

  // Iniciar captura automática de cupons (todas as plataformas)
  // Intervalo configurável pelo painel admin
  couponCaptureCron.startAll().catch(error => {
    logger.error(`Erro ao iniciar coupon capture cron: ${error.message}`);
  });

  // Iniciar Cron de Agendamento Inteligente de Posts
  schedulerCron.start();

  logger.info('✅ Cron jobs iniciados com sucesso');
};

/**
 * Iniciar/Reiniciar cron de limpeza com horário configurável
 */
export const startCleanupCron = async () => {
  try {
    // Obter horário configurado
    const { hour } = await AppSettings.getCleanupSchedule();
    const cronExpression = `0 ${hour} * * *`;

    // Parar tarefa anterior se existir
    if (cleanupTask) {
      cleanupTask.stop();
      logger.info('🛑 Cron de limpeza anterior parado');
    }

    // Criar nova tarefa
    cleanupTask = cron.schedule(cronExpression, async () => {
      logger.info('⏰ Executando: Limpeza de dados antigos');
      try {
        await cleanupOldData();
      } catch (error) {
        logger.error(`Erro no cron de limpeza: ${error.message}`);
      }
    });

    logger.info(`✅ Cron de limpeza agendado para ${hour}:00 (${cronExpression})`);
  } catch (error) {
    logger.error(`❌ Erro ao iniciar cron de limpeza: ${error.message}`);
  }
};

/**
 * Reiniciar cron de limpeza (chamado após mudança de configuração)
 */
export const restartCleanupCron = async () => {
  logger.info('🔄 Reiniciando cron de limpeza...');
  await startCleanupCron();
};

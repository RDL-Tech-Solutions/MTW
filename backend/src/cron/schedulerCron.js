import cron from 'node-cron';
import schedulerService from '../services/autoSync/schedulerService.js';
import logger from '../config/logger.js';

class SchedulerCron {
    constructor() {
        this.task = null;
    }

    start() {
        try {
            // Run every minute
            logger.info('⏰ Iniciando Cron de Agendamento Inteligente (verificando a cada 1 min)');
            logger.info(`   Timezone do servidor: ${process.env.TZ || 'não configurado (usando padrão do sistema)'}`);
            this.task = cron.schedule('* * * * *', async () => {
                const executionStart = new Date();
                try {
                    logger.info(`🔄 [${executionStart.toISOString()}] Executando verificação de posts agendados...`);
                    logger.info(`   Horário local: ${executionStart.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
                    await schedulerService.processScheduledQueue();
                    const executionEnd = new Date();
                    const duration = executionEnd - executionStart;
                    logger.info(`✅ [${executionEnd.toISOString()}] Verificação concluída (${duration}ms)`);
                } catch (error) {
                    const executionEnd = new Date();
                    const duration = executionEnd - executionStart;
                    logger.error(`❌ [${executionEnd.toISOString()}] Erro no cron de agendamento (${duration}ms): ${error.message}`);
                    logger.error(`   Stack: ${error.stack}`);
                    // NÃO lançar exceção - permitir que o cron continue executando
                }
            });
            logger.info('✅ Cron de Agendamento iniciado');
        } catch (error) {
            logger.error(`❌ Erro ao iniciar Cron de Agendamento: ${error.message}`);
        }
    }

    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            logger.info('⏹️ Cron de Agendamento parado');
        }
    }
}

export default new SchedulerCron();

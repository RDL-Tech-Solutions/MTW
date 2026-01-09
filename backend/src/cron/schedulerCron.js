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
            this.task = cron.schedule('* * * * *', async () => {
                await schedulerService.processScheduledQueue();
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

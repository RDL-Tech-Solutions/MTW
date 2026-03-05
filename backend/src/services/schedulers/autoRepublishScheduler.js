import cron from 'node-cron';
import autoRepublishService from '../autoRepublishService.js';
import logger from '../../config/logger.js';

/**
 * Scheduler para auto-republicação de produtos
 * Executa análise e agendamento a cada hora
 */
class AutoRepublishScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Iniciar scheduler
   */
  start() {
    if (this.task) {
      logger.warn('⚠️ Scheduler de auto-republicação já está rodando');
      return;
    }

    // Executar a cada hora (minuto 0)
    this.task = cron.schedule('0 * * * *', async () => {
      await this.execute();
    });

    logger.info('✅ Scheduler de auto-republicação iniciado (executa a cada hora)');

    // Executar imediatamente na inicialização (após 30 segundos)
    setTimeout(async () => {
      logger.info('🚀 Executando auto-republicação inicial...');
      await this.execute();
    }, 30000);
  }

  /**
   * Parar scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('⏹️ Scheduler de auto-republicação parado');
    }
  }

  /**
   * Executar análise e agendamento
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('⏸️ Auto-republicação já está em execução, pulando...');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('🤖 ========== EXECUTANDO AUTO-REPUBLICAÇÃO AGENDADA ==========');
      
      // Verificar se está habilitado
      const isEnabled = await autoRepublishService.isEnabled();
      
      if (!isEnabled) {
        logger.info('⏸️ Auto-republicação desabilitada nas configurações');
        return;
      }

      // Executar análise e agendamento
      const result = await autoRepublishService.analyzeAndSchedule();
      
      logger.info('✅ Auto-republicação concluída');
      logger.info(`   Produtos analisados: ${result.analyzed || 0}`);
      logger.info(`   Agendamentos criados: ${result.scheduled || 0}`);
      logger.info('========================================================');

    } catch (error) {
      logger.error(`❌ Erro na auto-republicação agendada: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Obter status do scheduler
   */
  getStatus() {
    return {
      active: !!this.task,
      running: this.isRunning,
      schedule: '0 * * * * (a cada hora)'
    };
  }
}

export default new AutoRepublishScheduler();

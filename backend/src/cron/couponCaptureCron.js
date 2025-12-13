import cron from 'node-cron';
import logger from '../config/logger.js';
import CouponSettings from '../models/CouponSettings.js';
import couponCaptureService from '../services/coupons/couponCaptureService.js';

class CouponCaptureCron {
  constructor() {
    this.captureTask = null;
    this.expirationTask = null;
    this.verificationTask = null;
    this.isCapturing = false;
    this.isCheckingExpiration = false;
  }

  /**
   * Iniciar todos os cron jobs de cupons
   */
  async startAll() {
    try {
      await this.startCaptureJob();
      await this.startExpirationJob();
      await this.startVerificationJob();
      
      logger.info('✅ Todos os cron jobs de cupons iniciados!');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar cron jobs: ${error.message}`);
    }
  }

  /**
   * Iniciar cron job de captura automática
   */
  async startCaptureJob() {
    try {
      const settings = await CouponSettings.get();

      if (!settings.auto_capture_enabled) {
        logger.info('⏸️ Captura automática de cupons desativada');
        return;
      }

      // Parar tarefa anterior se existir
      if (this.captureTask) {
        this.captureTask.stop();
      }

      // Converter minutos para expressão cron
      const cronExpression = this.minutesToCronExpression(settings.capture_interval_minutes);

      logger.info(`⏰ Agendando captura de cupons: a cada ${settings.capture_interval_minutes} minutos`);
      logger.info(`📅 Expressão cron: ${cronExpression}`);

      // Criar nova tarefa
      this.captureTask = cron.schedule(cronExpression, async () => {
        if (this.isCapturing) {
          logger.warn('⚠️ Captura anterior ainda em execução, pulando...');
          return;
        }

        await this.runCapture();
      });

      logger.info('✅ Cron de captura de cupons iniciado!');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar cron de captura: ${error.message}`);
    }
  }

  /**
   * Iniciar cron job de verificação de expiração
   * Executa a cada 6 horas
   */
  async startExpirationJob() {
    try {
      logger.info('⏰ Agendando verificação de cupons expirados: a cada 6 horas');

      this.expirationTask = cron.schedule('0 */6 * * *', async () => {
        if (this.isCheckingExpiration) {
          logger.warn('⚠️ Verificação de expiração anterior ainda em execução');
          return;
        }

        await this.checkExpiration();
      });

      logger.info('✅ Cron de verificação de expiração iniciado!');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar cron de expiração: ${error.message}`);
    }
  }

  /**
   * Iniciar cron job de verificação de validade
   * Executa diariamente às 3h da manhã
   */
  async startVerificationJob() {
    try {
      logger.info('⏰ Agendando verificação de validade de cupons: diariamente às 3h');

      this.verificationTask = cron.schedule('0 3 * * *', async () => {
        await this.runVerification();
      });

      logger.info('✅ Cron de verificação de validade iniciado!');
    } catch (error) {
      logger.error(`❌ Erro ao iniciar cron de verificação: ${error.message}`);
    }
  }

  /**
   * Executar captura de cupons
   */
  async runCapture() {
    this.isCapturing = true;

    try {
      logger.info('🚀 ========== EXECUTANDO CAPTURA DE CUPONS ==========');

      const result = await couponCaptureService.captureAll();

      if (result.success) {
        logger.info(`✅ Captura concluída: ${result.totalCreated} novos cupons`);
      } else {
        logger.error(`❌ Captura falhou: ${result.message || result.error}`);
      }

    } catch (error) {
      logger.error(`❌ Erro na captura automática: ${error.message}`);
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Verificar cupons expirados
   */
  async checkExpiration() {
    this.isCheckingExpiration = true;

    try {
      logger.info('🔄 ========== VERIFICANDO CUPONS EXPIRADOS ==========');

      const result = await couponCaptureService.checkExpiredCoupons();
      
      logger.info(`✅ Verificação concluída: ${result.deactivated} cupons desativados`);

    } catch (error) {
      logger.error(`❌ Erro na verificação de expiração: ${error.message}`);
    } finally {
      this.isCheckingExpiration = false;
    }
  }

  /**
   * Verificar validade de cupons ativos
   */
  async runVerification() {
    try {
      logger.info('🔍 ========== VERIFICANDO VALIDADE DE CUPONS ==========');

      const result = await couponCaptureService.verifyActiveCoupons();
      
      logger.info(`✅ Verificação concluída: ${result.verified} verificados, ${result.invalid} inválidos`);

    } catch (error) {
      logger.error(`❌ Erro na verificação de validade: ${error.message}`);
    }
  }

  /**
   * Parar todos os cron jobs
   */
  stopAll() {
    if (this.captureTask) {
      this.captureTask.stop();
      this.captureTask = null;
      logger.info('⏹️ Cron de captura parado');
    }

    if (this.expirationTask) {
      this.expirationTask.stop();
      this.expirationTask = null;
      logger.info('⏹️ Cron de expiração parado');
    }

    if (this.verificationTask) {
      this.verificationTask.stop();
      this.verificationTask = null;
      logger.info('⏹️ Cron de verificação parado');
    }

    logger.info('✅ Todos os cron jobs de cupons parados');
  }

  /**
   * Reiniciar cron job de captura (após mudança de configuração)
   */
  async restartCaptureJob() {
    if (this.captureTask) {
      this.captureTask.stop();
      this.captureTask = null;
    }
    await this.startCaptureJob();
  }

  /**
   * Executar captura manualmente
   */
  async runManualCapture() {
    if (this.isCapturing) {
      throw new Error('Uma captura já está em execução');
    }

    logger.info('🔧 Executando captura manual...');
    await this.runCapture();
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

  /**
   * Obter status dos cron jobs
   */
  getStatus() {
    return {
      capture: {
        running: this.captureTask !== null,
        isExecuting: this.isCapturing
      },
      expiration: {
        running: this.expirationTask !== null,
        isExecuting: this.isCheckingExpiration
      },
      verification: {
        running: this.verificationTask !== null
      }
    };
  }
}

// Exportar instância única (singleton)
export default new CouponCaptureCron();

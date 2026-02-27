import logger from '../config/logger.js';
import oneSignalEmailService from './oneSignalEmailService.js';
import smtpEmailService from './emailService.js';

/**
 * Wrapper para gerenciar a transição entre SMTP e OneSignal Email
 * 
 * Este serviço permite usar ambos os sistemas simultaneamente durante
 * a migração, com fallback automático e feature flags.
 * 
 * Após a migração completa, este wrapper pode ser removido e substituído
 * diretamente pelo oneSignalEmailService.
 */
class EmailServiceWrapper {
  constructor() {
    this.useOneSignal = process.env.ONESIGNAL_EMAIL_ENABLED === 'true';
    this.useSMTPFallback = process.env.SMTP_FALLBACK_ENABLED === 'true';
    
    logger.info('📧 Email Service Wrapper inicializado');
    logger.info(`   OneSignal Email: ${this.useOneSignal ? 'ATIVADO' : 'DESATIVADO'}`);
    logger.info(`   SMTP Fallback: ${this.useSMTPFallback ? 'ATIVADO' : 'DESATIVADO'}`);
  }

  /**
   * Determinar qual serviço usar
   */
  getService() {
    if (this.useOneSignal && oneSignalEmailService.isEnabled()) {
      return 'onesignal';
    }
    
    if (this.useSMTPFallback || smtpEmailService.isConfigured()) {
      return 'smtp';
    }

    // Default: OneSignal
    return 'onesignal';
  }

  /**
   * Verificar se está configurado
   */
  isConfigured() {
    const service = this.getService();
    
    if (service === 'onesignal') {
      return oneSignalEmailService.isConfigured();
    } else {
      return smtpEmailService.isConfigured();
    }
  }

  /**
   * Enviar email genérico
   * 
   * @param {Object} options - Opções do email
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendEmail(options) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        const result = await oneSignalEmailService.sendEmail(options);
        
        // Tentar fallback se OneSignal falhar e SMTP estiver disponível
        if (!result.success && this.useSMTPFallback && smtpEmailService.isConfigured()) {
          logger.info('🔄 Tentando fallback para SMTP...');
          return await smtpEmailService.sendEmail(options);
        }
        
        return result;
      } else {
        return await smtpEmailService.sendEmail(options);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar email (${service}): ${error.message}`);
      
      // Tentar fallback se configurado
      if (service === 'onesignal' && this.useSMTPFallback && smtpEmailService.isConfigured()) {
        logger.info('🔄 Tentando fallback para SMTP...');
        try {
          return await smtpEmailService.sendEmail(options);
        } catch (fallbackError) {
          logger.error(`❌ Fallback também falhou: ${fallbackError.message}`);
          return { success: false, error: fallbackError.message };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de recuperação de senha
   * 
   * @param {string} email - Email do destinatário
   * @param {string} resetToken - Token de reset
   * @param {string} userName - Nome do usuário (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        const result = await oneSignalEmailService.sendPasswordResetEmail(email, resetToken, userName);
        
        if (!result.success && this.useSMTPFallback && smtpEmailService.isConfigured()) {
          logger.info('🔄 Tentando fallback para SMTP...');
          return await smtpEmailService.sendPasswordResetEmail(email, resetToken, userName);
        }
        
        return result;
      } else {
        return await smtpEmailService.sendPasswordResetEmail(email, resetToken, userName);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar email de reset (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useSMTPFallback && smtpEmailService.isConfigured()) {
        logger.info('🔄 Tentando fallback para SMTP...');
        try {
          return await smtpEmailService.sendPasswordResetEmail(email, resetToken, userName);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: false, error: fallbackError.message };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de confirmação de senha alterada
   * 
   * @param {string} email - Email do destinatário
   * @param {string} userName - Nome do usuário (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPasswordChangedEmail(email, userName) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        const result = await oneSignalEmailService.sendPasswordChangedEmail(email, userName);
        
        if (!result.success && this.useSMTPFallback && smtpEmailService.isConfigured()) {
          logger.info('🔄 Tentando fallback para SMTP...');
          return await smtpEmailService.sendPasswordChangedEmail(email, userName);
        }
        
        return result;
      } else {
        return await smtpEmailService.sendPasswordChangedEmail(email, userName);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar email de confirmação (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useSMTPFallback && smtpEmailService.isConfigured()) {
        logger.info('🔄 Tentando fallback para SMTP...');
        try {
          return await smtpEmailService.sendPasswordChangedEmail(email, userName);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: false, error: fallbackError.message };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de boas-vindas
   * 
   * @param {string} email - Email do destinatário
   * @param {string} userName - Nome do usuário
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendWelcomeEmail(email, userName) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        const result = await oneSignalEmailService.sendWelcomeEmail(email, userName);
        
        if (!result.success && this.useSMTPFallback && smtpEmailService.isConfigured()) {
          logger.info('🔄 Tentando fallback para SMTP...');
          return await smtpEmailService.sendWelcomeEmail(email, userName);
        }
        
        return result;
      } else {
        return await smtpEmailService.sendWelcomeEmail(email, userName);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar email de boas-vindas (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useSMTPFallback && smtpEmailService.isConfigured()) {
        logger.info('🔄 Tentando fallback para SMTP...');
        try {
          return await smtpEmailService.sendWelcomeEmail(email, userName);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: false, error: fallbackError.message };
        }
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de novo cupom (apenas OneSignal)
   * 
   * @param {string} email - Email do destinatário
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendNewCouponEmail(email, coupon) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalEmailService.sendNewCouponEmail(email, coupon);
      } else {
        // SMTP não tem este método, retornar sucesso falso
        logger.warn('⚠️ sendNewCouponEmail não disponível no SMTP');
        return { success: false, error: 'Método não disponível no SMTP' };
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar email de cupom: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email em massa (apenas OneSignal)
   * 
   * @param {Array<string>} emails - Array de emails
   * @param {Object} emailData - Dados do email
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendBulkEmail(emails, emailData) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalEmailService.sendBulkEmail(emails, emailData);
      } else {
        // SMTP: enviar um por um
        logger.info(`📧 Enviando ${emails.length} emails via SMTP (um por um)`);
        
        let successCount = 0;
        let failedCount = 0;

        for (const email of emails) {
          try {
            const result = await smtpEmailService.sendEmail({
              to: email,
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text
            });

            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            failedCount++;
            logger.error(`❌ Erro ao enviar para ${email}: ${error.message}`);
          }
        }

        logger.info(`📊 Emails enviados: ${successCount} sucesso, ${failedCount} falhas`);

        return {
          success: successCount > 0,
          recipients: successCount,
          failed: failedCount
        };
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar emails em massa: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Criar ou atualizar usuário de email (apenas OneSignal)
   * 
   * @param {string} email - Email do usuário
   * @param {string} externalId - ID externo
   * @param {Object} tags - Tags adicionais
   * @returns {Promise<Object>} Resultado
   */
  async createOrUpdateEmailUser(email, externalId, tags = {}) {
    const service = this.getService();

    if (service === 'onesignal') {
      return await oneSignalEmailService.createOrUpdateEmailUser(email, externalId, tags);
    } else {
      // SMTP não precisa deste método
      return { success: true, message: 'SMTP não requer registro de usuário' };
    }
  }
}

export default new EmailServiceWrapper();

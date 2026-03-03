import logger from '../config/logger.js';
import smtpEmailService from './emailService.js';

/**
 * Email Service — usa SMTP exclusivamente
 * 
 * Todos os envios de email são feitos via SMTP (Gmail) configurado no .env.
 */
class EmailServiceWrapper {
  constructor() {
    logger.info('📧 Email Service inicializado (modo SMTP)');
  }

  isConfigured() {
    return smtpEmailService.isConfigured();
  }

  async sendEmail(options) {
    return smtpEmailService.sendEmail(options);
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    return smtpEmailService.sendPasswordResetEmail(email, resetToken, userName);
  }

  async sendPasswordChangedEmail(email, userName) {
    return smtpEmailService.sendPasswordChangedEmail(email, userName);
  }

  async sendWelcomeEmail(email, userName) {
    return smtpEmailService.sendWelcomeEmail(email, userName);
  }

  async sendNewCouponEmail(email, coupon) {
    logger.warn('⚠️ sendNewCouponEmail não disponível via SMTP padrão');
    return { success: false, error: 'Método não disponível' };
  }

  async sendBulkEmail(emails, emailData) {
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

    return { success: successCount > 0, recipients: successCount, failed: failedCount };
  }

  async createOrUpdateEmailUser(email, externalId, tags = {}) {
    // SMTP não requer registro de usuário
    return { success: true, message: 'SMTP não requer registro de usuário' };
  }
}

export default new EmailServiceWrapper();

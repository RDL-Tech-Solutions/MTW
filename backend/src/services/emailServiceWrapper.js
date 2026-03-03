import logger from '../config/logger.js';
import smtpEmailService from './emailService.js';
import oneSignalEmailService from './oneSignalEmailService.js';

/**
 * Wrapper para serviços de email
 * Suporta SMTP (Gmail/Nodemailer) e OneSignal Email API
 * 
 * Configuração via .env:
 * - EMAIL_PROVIDER=smtp (padrão) ou onesignal
 * - Para SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - Para OneSignal: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY
 */
class EmailServiceWrapper {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp';
    this.service = this.provider === 'onesignal' ? oneSignalEmailService : smtpEmailService;
    logger.info(`📧 Email Service inicializado (modo ${this.provider.toUpperCase()})`);
  }

  isConfigured() {
    return this.service.isConfigured();
  }

  async sendEmail(options) {
    return this.service.sendEmail(options);
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    return this.service.sendPasswordResetEmail(email, resetToken, userName);
  }

  async sendPasswordChangedEmail(email, userName) {
    return this.service.sendPasswordChangedEmail(email, userName);
  }

  async sendWelcomeEmail(email, userName) {
    return this.service.sendWelcomeEmail(email, userName);
  }

  async sendNewCouponEmail(email, coupon) {
    logger.warn('⚠️ sendNewCouponEmail não disponível via email padrão');
    return { success: false, error: 'Método não disponível' };
  }

  async sendBulkEmail(emails, emailData) {
    logger.info(`📧 Enviando ${emails.length} emails via ${this.provider.toUpperCase()} (um por um)`);
    let successCount = 0;
    let failedCount = 0;

    for (const email of emails) {
      try {
        const result = await this.service.sendEmail({
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
    // SMTP e OneSignal não requerem registro prévio de usuário
    return { success: true, message: `${this.provider.toUpperCase()} não requer registro de usuário` };
  }
}

export default new EmailServiceWrapper();

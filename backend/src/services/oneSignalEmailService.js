import axios from 'axios';
import logger from '../config/logger.js';
import AppSettings from '../models/AppSettings.js';

/**
 * Serviço de Email usando OneSignal
 * 
 * OneSignal oferece envio de emails transacionais e marketing
 * com melhor deliverability que SMTP tradicional.
 * 
 * Features:
 * - Templates de email
 * - Tracking de abertura e cliques
 * - Analytics detalhado
 * - Melhor deliverability
 * - Sem necessidade de SMTP
 */
class OneSignalEmailService {
  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;
    this.apiUrl = 'https://onesignal.com/api/v1';
    this.initialized = false;
    this.fromEmail = process.env.ONESIGNAL_FROM_EMAIL || process.env.SMTP_FROM_EMAIL;
    this.fromName = process.env.ONESIGNAL_FROM_NAME || process.env.SMTP_FROM_NAME || 'PreçoCerto';
    this.initializeService();
  }

  /**
   * Inicializar serviço
   */
  async initializeService() {
    try {
      // Tentar carregar configurações do banco de dados
      try {
        const settings = await AppSettings.get();
        if (settings.onesignal_app_id && settings.onesignal_rest_api_key) {
          this.appId = settings.onesignal_app_id;
          this.apiKey = settings.onesignal_rest_api_key;
        }
        if (settings.onesignal_from_email) {
          this.fromEmail = settings.onesignal_from_email;
        }
        if (settings.onesignal_from_name) {
          this.fromName = settings.onesignal_from_name;
        }
      } catch (dbError) {
        logger.warn(`⚠️ Não foi possível carregar configurações do banco: ${dbError.message}`);
      }

      if (!this.appId || !this.apiKey) {
        logger.warn('⚠️ OneSignal Email não configurado (APP_ID ou API_KEY ausentes)');
        return;
      }

      if (!this.fromEmail) {
        logger.warn('⚠️ Email de origem não configurado (ONESIGNAL_FROM_EMAIL)');
        return;
      }

      this.initialized = true;
      logger.info('✅ OneSignal Email Service inicializado');
    } catch (error) {
      logger.error(`❌ Erro ao inicializar OneSignal Email: ${error.message}`);
      this.initialized = false;
    }
  }

  /**
   * Verificar se o serviço está habilitado
   */
  isEnabled() {
    return this.initialized && process.env.ONESIGNAL_EMAIL_ENABLED !== 'false';
  }

  /**
   * Verificar se está configurado
   */
  isConfigured() {
    return this.initialized && this.appId && this.apiKey && this.fromEmail;
  }

  /**
   * Enviar email genérico via OneSignal
   * 
   * @param {Object} options - Opções do email
   * @param {string} options.to - Email do destinatário
   * @param {string} options.subject - Assunto do email
   * @param {string} options.html - Conteúdo HTML
   * @param {string} options.text - Conteúdo texto (opcional)
   * @param {Object} options.data - Dados adicionais (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendEmail({ to, subject, html, text, data = {} }) {
    if (!this.isConfigured()) {
      logger.warn('⚠️ Tentativa de enviar email sem OneSignal configurado');
      return { success: false, error: 'OneSignal Email não configurado' };
    }

    try {
      const payload = {
        app_id: this.appId,
        include_email_tokens: [to],
        email_subject: subject,
        email_body: html,
        email_from_name: this.fromName,
        email_from_address: this.fromEmail,
        ...(text && { email_preheader: text }),
        data: {
          ...data,
          sent_at: new Date().toISOString(),
          type: 'transactional'
        }
      };

      logger.info(`📧 Enviando email OneSignal para: ${to}`);
      logger.debug(`   Assunto: ${subject}`);

      const response = await axios.post(
        `${this.apiUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`
          },
          timeout: 15000
        }
      );

      if (response.data.errors) {
        logger.error(`❌ Erros ao enviar email: ${JSON.stringify(response.data.errors)}`);
        return {
          success: false,
          errors: response.data.errors
        };
      }

      logger.info(`✅ Email OneSignal enviado: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
        recipients: response.data.recipients || 1
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar email OneSignal para ${to}: ${error.message}`);
      
      if (error.response) {
        logger.error(`   Status: ${error.response.status}`);
        logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar ou atualizar usuário de email no OneSignal
   * 
   * @param {string} email - Email do usuário
   * @param {string} externalId - ID externo do usuário
   * @param {Object} tags - Tags adicionais (opcional)
   * @returns {Promise<Object>} Resultado
   */
  async createOrUpdateEmailUser(email, externalId, tags = {}) {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneSignal Email não configurado' };
    }

    try {
      const payload = {
        app_id: this.appId,
        identifier: email,
        external_id: externalId.toString(),
        tags: {
          ...tags,
          email_subscribed: true,
          created_at: new Date().toISOString()
        }
      };

      logger.info(`📧 Criando/atualizando usuário de email: ${email}`);

      const response = await axios.post(
        `${this.apiUrl}/players`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      logger.info(`✅ Usuário de email criado/atualizado: ${email}`);

      return {
        success: true,
        player_id: response.data.id,
        email
      };
    } catch (error) {
      logger.error(`❌ Erro ao criar usuário de email: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar email de recuperação de senha (com código de 6 dígitos)
   * 
   * @param {string} email - Email do destinatário
   * @param {string} verificationCode - Código de 6 dígitos
   * @param {string} userName - Nome do usuário (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPasswordResetEmail(email, verificationCode, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 3px dashed #DC2626; padding: 30px; text-align: center; margin: 30px 0; border-radius: 10px; }
          .code { font-size: 48px; font-weight: bold; color: #DC2626; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperação de Senha</h1>
          </div>
          <div class="content">
            <p>Olá${userName ? ` ${userName}` : ''},</p>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>PreçoCerto</strong>.</p>
            
            <p>Use o código abaixo para redefinir sua senha:</p>
            
            <div class="code-box">
              <div class="code">${verificationCode}</div>
              <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">Código de Verificação</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0;">
                <li>Este código expira em <strong>15 minutos</strong></li>
                <li>Digite o código no aplicativo para continuar</li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
                <li>Sua senha atual permanecerá inalterada</li>
              </ul>
            </div>
            
            <p>Se você tiver problemas, entre em contato com nosso suporte.</p>
            
            <p>Atenciosamente,<br><strong>Equipe PreçoCerto</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: '🔐 Código de Recuperação de Senha - PreçoCerto',
      html,
      text: `Seu código de recuperação de senha é: ${verificationCode}. Este código expira em 15 minutos.`,
      data: {
        type: 'password_reset',
        user_name: userName,
        verification_code: verificationCode
      }
    });
  }

  /**
   * Enviar email de confirmação de redefinição de senha
   * 
   * @param {string} email - Email do destinatário
   * @param {string} userName - Nome do usuário (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPasswordChangedEmail(email, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .alert { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Senha Alterada com Sucesso</h1>
          </div>
          <div class="content">
            <p>Olá${userName ? ` ${userName}` : ''},</p>
            
            <p>Sua senha foi alterada com sucesso em <strong>${new Date().toLocaleString('pt-BR')}</strong>.</p>
            
            <div class="alert">
              <strong>⚠️ Você não fez esta alteração?</strong>
              <p style="margin: 10px 0 0 0;">
                Se você não solicitou esta mudança, entre em contato com nosso suporte imediatamente.
              </p>
            </div>
            
            <p>Por segurança, recomendamos:</p>
            <ul>
              <li>Usar uma senha forte e única</li>
              <li>Não compartilhar sua senha com ninguém</li>
              <li>Ativar autenticação em duas etapas quando disponível</li>
            </ul>
            
            <p>Atenciosamente,<br><strong>Equipe PreçoCerto</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: '✅ Senha Alterada - PreçoCerto',
      html,
      text: 'Sua senha foi alterada com sucesso.',
      data: {
        type: 'password_changed',
        user_name: userName
      }
    });
  }

  /**
   * Enviar email de boas-vindas
   * 
   * @param {string} email - Email do destinatário
   * @param {string} userName - Nome do usuário
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendWelcomeEmail(email, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #DC2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao PreçoCerto!</h1>
          </div>
          <div class="content">
            <p>Olá ${userName},</p>
            
            <p>Seja muito bem-vindo(a) ao <strong>PreçoCerto</strong>! Estamos felizes em tê-lo(a) conosco.</p>
            
            <p>Com o PreçoCerto você pode:</p>
            
            <div class="feature">
              <strong>🔥 Encontrar as melhores ofertas</strong>
              <p style="margin: 5px 0 0 0;">Promoções atualizadas diariamente das principais lojas</p>
            </div>
            
            <div class="feature">
              <strong>🎫 Cupons de desconto exclusivos</strong>
              <p style="margin: 5px 0 0 0;">Economize ainda mais com cupons verificados</p>
            </div>
            
            <div class="feature">
              <strong>🔔 Notificações personalizadas</strong>
              <p style="margin: 5px 0 0 0;">Receba alertas de produtos que você procura</p>
            </div>
            
            <div class="feature">
              <strong>❤️ Lista de favoritos</strong>
              <p style="margin: 5px 0 0 0;">Salve produtos e acompanhe quedas de preço</p>
            </div>
            
            <p>Comece agora a economizar e aproveite as melhores ofertas!</p>
            
            <p>Atenciosamente,<br><strong>Equipe PreçoCerto</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: '🎉 Bem-vindo ao PreçoCerto!',
      html,
      text: `Bem-vindo ao PreçoCerto, ${userName}!`,
      data: {
        type: 'welcome',
        user_name: userName
      }
    });
  }

  /**
   * Enviar email de notificação de novo cupom
   * 
   * @param {string} email - Email do destinatário
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendNewCouponEmail(email, coupon) {
    const discount = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .coupon-box { background: white; border: 2px dashed #DC2626; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .coupon-code { font-size: 24px; font-weight: bold; color: #DC2626; letter-spacing: 2px; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Novo Cupom Disponível!</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            
            <p>Temos um novo cupom de desconto para você!</p>
            
            <div class="coupon-box">
              <p style="margin: 0 0 10px 0; font-size: 18px;">💰 <strong>${discount} OFF</strong></p>
              <div class="coupon-code">${coupon.code}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280;">Clique para copiar</p>
            </div>
            
            <p><strong>Plataforma:</strong> ${coupon.platform}</p>
            <p><strong>Válido até:</strong> ${new Date(coupon.valid_until).toLocaleDateString('pt-BR')}</p>
            ${coupon.min_purchase > 0 ? `<p><strong>Compra mínima:</strong> R$ ${coupon.min_purchase.toFixed(2)}</p>` : ''}
            
            ${coupon.affiliate_link ? `
            <div style="text-align: center;">
              <a href="${coupon.affiliate_link}" class="button">Usar Cupom Agora</a>
            </div>
            ` : ''}
            
            <p>Aproveite antes que expire!</p>
            
            <p>Atenciosamente,<br><strong>Equipe PreçoCerto</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject: `🎉 Novo Cupom: ${coupon.code} - ${discount} OFF`,
      html,
      text: `Novo cupom disponível: ${coupon.code} - ${discount} OFF`,
      data: {
        type: 'new_coupon',
        coupon_id: coupon.id,
        coupon_code: coupon.code
      }
    });
  }

  /**
   * Enviar email em massa
   * 
   * @param {Array<string>} emails - Array de emails
   * @param {Object} emailData - Dados do email
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendBulkEmail(emails, emailData) {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneSignal Email não configurado' };
    }

    try {
      const payload = {
        app_id: this.appId,
        include_email_tokens: emails,
        email_subject: emailData.subject,
        email_body: emailData.html,
        email_from_name: this.fromName,
        email_from_address: this.fromEmail,
        ...(emailData.text && { email_preheader: emailData.text }),
        data: {
          ...emailData.data,
          sent_at: new Date().toISOString(),
          type: 'bulk'
        }
      };

      logger.info(`📧 Enviando email em massa para ${emails.length} destinatários`);

      const response = await axios.post(
        `${this.apiUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.apiKey}`
          },
          timeout: 30000
        }
      );

      if (response.data.errors) {
        logger.error(`❌ Erros ao enviar emails: ${JSON.stringify(response.data.errors)}`);
        return {
          success: false,
          errors: response.data.errors
        };
      }

      logger.info(`✅ Emails enviados: ${response.data.recipients || emails.length}`);

      return {
        success: true,
        messageId: response.data.id,
        recipients: response.data.recipients || emails.length
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar emails em massa: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OneSignalEmailService();

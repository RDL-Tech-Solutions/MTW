import { createTransport } from 'nodemailer';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Inicializar transporter do nodemailer
   */
  initializeTransporter() {
    try {
      const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      if (!config.auth.user || !config.auth.pass) {
        logger.warn('⚠️ SMTP não configurado. Configure SMTP_USER e SMTP_PASS no .env');
        return;
      }

      this.transporter = createTransport(config);
      this.initialized = true;
      logger.info('✅ Serviço de email SMTP inicializado');
    } catch (error) {
      logger.error(`❌ Erro ao inicializar serviço de email: ${error.message}`);
    }
  }

  /**
   * Verificar se o serviço está configurado
   */
  isConfigured() {
    return this.initialized && this.transporter !== null;
  }

  /**
   * Enviar email genérico
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      logger.warn('⚠️ Tentativa de enviar email sem SMTP configurado');
      return { success: false, error: 'SMTP não configurado' };
    }

    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'PreçoCerto'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Fallback para texto puro
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`✅ Email enviado para ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`❌ Erro ao enviar email para ${to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de recuperação de senha (com código de 6 dígitos)
   */
  async sendPasswordResetEmail(email, verificationCode, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
    });
  }

  /**
   * Enviar email de confirmação de redefinição de senha
   */
  async sendPasswordChangedEmail(email, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
    });
  }

  /**
   * Enviar email de boas-vindas
   */
  async sendWelcomeEmail(email, userName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
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
    });
  }
}

export default new EmailService();

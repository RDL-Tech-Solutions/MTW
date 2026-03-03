import axios from 'axios';
import logger from '../config/logger.js';

/**
 * Serviço de Email usando OneSignal Email API
 * Documentação: https://documentation.onesignal.com/reference/create-notification
 */
class OneSignalEmailService {
  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_API_KEY;
    this.apiUrl = 'https://onesignal.com/api/v1/notifications';
    this.initialized = false;
    this.initialize();
  }

  /**
   * Inicializar serviço
   */
  initialize() {
    if (!this.appId || !this.apiKey) {
      logger.warn('⚠️ OneSignal Email não configurado. Configure ONESIGNAL_APP_ID e ONESIGNAL_API_KEY no .env');
      return;
    }

    this.initialized = true;
    logger.info('✅ OneSignal Email Service inicializado');
  }

  /**
   * Verificar se o serviço está configurado
   */
  isConfigured() {
    return this.initialized && this.appId && this.apiKey;
  }

  /**
   * Enviar email via OneSignal
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      logger.warn('⚠️ Tentativa de enviar email sem OneSignal configurado');
      return { success: false, error: 'OneSignal não configurado' };
    }

    try {
      const payload = {
        app_id: this.appId,
        include_email_tokens: [to],
        email_subject: subject,
        email_body: html || text,
        email_from_name: process.env.ONESIGNAL_EMAIL_FROM_NAME || 'PreçoCerto',
        email_from_address: process.env.ONESIGNAL_EMAIL_FROM_ADDRESS || 'noreply@precocerto.com',
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`,
        },
      });

      logger.info(`✅ Email OneSignal enviado para ${to}: ${response.data.id}`);
      return { 
        success: true, 
        messageId: response.data.id,
        recipients: response.data.recipients 
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar email OneSignal para ${to}: ${error.message}`);
      if (error.response) {
        logger.error(`   Status: ${error.response.status}`);
        logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar email de recuperação de senha (com código de 6 dígitos)
   */
  async sendPasswordResetEmail(email, verificationCode, userName) {
    const logoUrl = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/assets/logo.png` : 'https://i.imgur.com/placeholder.png';
    
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Recuperação de Senha - PreçoCerto</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 20px;
          }
          .email-wrapper { max-width: 600px; margin: 0 auto; }
          .container { 
            background: white; 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
            position: relative;
          }
          .logo-container {
            background: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .logo { 
            width: 50px; 
            height: 50px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header p {
            margin: 10px 0 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px; 
            background: white;
          }
          .greeting {
            font-size: 18px;
            color: #111827;
            margin-bottom: 20px;
          }
          .code-box { 
            background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
            border: 3px dashed #DC2626; 
            padding: 35px; 
            text-align: center; 
            margin: 35px 0; 
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
          }
          .code { 
            font-size: 56px; 
            font-weight: 900; 
            color: #DC2626; 
            letter-spacing: 12px; 
            font-family: 'Courier New', Courier, monospace;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            user-select: all;
          }
          .code-label { 
            margin-top: 15px; 
            color: #991B1B; 
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-box {
            background: #F0FDF4;
            border-left: 4px solid #10B981;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
          }
          .info-box strong {
            color: #065F46;
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .warning { 
            background: #FFFBEB; 
            border-left: 4px solid #F59E0B; 
            padding: 20px; 
            margin: 25px 0; 
            border-radius: 8px;
          }
          .warning strong { 
            color: #92400E;
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .warning ul { 
            margin: 10px 0; 
            padding-left: 20px; 
          }
          .warning li { 
            margin: 8px 0;
            color: #78350F;
          }
          .security-tips {
            background: #F3F4F6;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .security-tips h3 {
            color: #374151;
            font-size: 16px;
            margin-bottom: 12px;
          }
          .security-tips ul {
            padding-left: 20px;
          }
          .security-tips li {
            margin: 8px 0;
            color: #6B7280;
          }
          .footer { 
            background: #F9FAFB; 
            padding: 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px; 
            border-top: 1px solid #e5e7eb;
          }
          .footer-brand {
            font-weight: 700;
            color: #DC2626;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .social-links {
            margin: 15px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #6B7280;
            text-decoration: none;
            font-size: 12px;
          }
          @media only screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .code { font-size: 42px; letter-spacing: 8px; }
            .header h1 { font-size: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <svg class="logo" viewBox="0 0 24 24" fill="#DC2626">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-9h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                </svg>
              </div>
              <h1>🔐 Recuperação de Senha</h1>
              <p>Código de Verificação</p>
            </div>
            
            <div class="content">
              <p class="greeting">Olá${userName ? ` <strong>${userName}</strong>` : ''},</p>
              
              <p style="margin-bottom: 20px;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color: #DC2626;">PreçoCerto</strong>.</p>
              
              <div class="info-box">
                <strong>✅ Como usar este código:</strong>
                <p style="margin: 0; color: #065F46;">Digite o código abaixo no aplicativo PreçoCerto para criar uma nova senha.</p>
              </div>
              
              <div class="code-box">
                <div class="code">${verificationCode}</div>
                <div class="code-label">Código de Verificação</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Informações Importantes:</strong>
                <ul>
                  <li>Este código <strong>expira em 15 minutos</strong></li>
                  <li>Use apenas no aplicativo oficial PreçoCerto</li>
                  <li>Nunca compartilhe este código com ninguém</li>
                  <li>Nossa equipe nunca pedirá este código por telefone ou email</li>
                </ul>
              </div>
              
              <div class="security-tips">
                <h3>🔒 Você não solicitou esta alteração?</h3>
                <ul>
                  <li>Ignore este email - sua senha permanecerá inalterada</li>
                  <li>Verifique a segurança da sua conta</li>
                  <li>Considere alterar sua senha por precaução</li>
                  <li>Entre em contato com nosso suporte se suspeitar de atividade não autorizada</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">
                Se você tiver dúvidas ou precisar de ajuda, nossa equipe de suporte está sempre disponível.
              </p>
              
              <p style="margin-top: 30px;">
                Atenciosamente,<br>
                <strong style="color: #DC2626;">Equipe PreçoCerto</strong>
              </p>
            </div>
            
            <div class="footer">
              <div class="footer-brand">PreçoCerto</div>
              <p>As melhores ofertas e cupons de desconto</p>
              <div class="social-links">
                <a href="#">Instagram</a> • 
                <a href="#">Facebook</a> • 
                <a href="#">Twitter</a>
              </div>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
              <p style="margin-top: 5px; font-size: 11px;">Este é um email automático, por favor não responda.</p>
            </div>
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
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Senha Alterada - PreçoCerto</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 20px;
          }
          .email-wrapper { max-width: 600px; margin: 0 auto; }
          .container { 
            background: white; 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .logo-container {
            background: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .logo { 
            width: 50px; 
            height: 50px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .content { padding: 40px 30px; }
          .success-badge {
            background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
            border: 3px solid #10B981;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 15px;
          }
          .success-text {
            font-size: 18px;
            font-weight: 600;
            color: #065F46;
          }
          .timestamp {
            background: #F3F4F6;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
          }
          .timestamp-label {
            font-size: 12px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
          }
          .timestamp-value {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }
          .alert { 
            background: #FEE2E2; 
            border-left: 4px solid #DC2626; 
            padding: 20px; 
            margin: 25px 0; 
            border-radius: 8px;
          }
          .alert strong { 
            color: #991B1B;
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .security-tips {
            background: #F0FDF4;
            border: 2px solid #10B981;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .security-tips h3 {
            color: #065F46;
            font-size: 16px;
            margin-bottom: 12px;
          }
          .security-tips ul {
            padding-left: 20px;
          }
          .security-tips li {
            margin: 8px 0;
            color: #047857;
          }
          .footer { 
            background: #F9FAFB; 
            padding: 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px; 
            border-top: 1px solid #e5e7eb;
          }
          .footer-brand {
            font-weight: 700;
            color: #DC2626;
            font-size: 16px;
            margin-bottom: 10px;
          }
          @media only screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <svg class="logo" viewBox="0 0 24 24" fill="#10B981">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <h1>✅ Senha Alterada com Sucesso</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 20px;">Olá${userName ? ` <strong>${userName}</strong>` : ''},</p>
              
              <div class="success-badge">
                <div class="success-icon">🎉</div>
                <div class="success-text">Sua senha foi alterada com sucesso!</div>
              </div>
              
              <p style="margin-bottom: 20px;">A senha da sua conta no <strong style="color: #DC2626;">PreçoCerto</strong> foi alterada em:</p>
              
              <div class="timestamp">
                <div class="timestamp-label">Data e Hora</div>
                <div class="timestamp-value">${new Date().toLocaleString('pt-BR', { 
                  dateStyle: 'full', 
                  timeStyle: 'medium' 
                })}</div>
              </div>
              
              <div class="alert">
                <strong>⚠️ Você não fez esta alteração?</strong>
                <p style="margin: 10px 0 0 0; color: #991B1B;">
                  Se você não solicitou esta mudança, sua conta pode estar comprometida. 
                  <strong>Entre em contato com nosso suporte imediatamente</strong> para proteger sua conta.
                </p>
              </div>
              
              <div class="security-tips">
                <h3>🔒 Dicas de Segurança para sua Conta:</h3>
                <ul>
                  <li><strong>Senha Forte:</strong> Use no mínimo 8 caracteres com letras, números e símbolos</li>
                  <li><strong>Senha Única:</strong> Não reutilize senhas de outros serviços</li>
                  <li><strong>Gerenciador:</strong> Considere usar um gerenciador de senhas</li>
                  <li><strong>Atualizações:</strong> Troque sua senha periodicamente</li>
                  <li><strong>Cuidado:</strong> Nunca compartilhe sua senha com ninguém</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; padding: 15px; background: #F9FAFB; border-radius: 8px; font-size: 14px; color: #6B7280;">
                💡 <strong>Dica:</strong> Mantenha seu email atualizado para receber alertas de segurança importantes sobre sua conta.
              </p>
              
              <p style="margin-top: 30px;">
                Atenciosamente,<br>
                <strong style="color: #DC2626;">Equipe PreçoCerto</strong>
              </p>
            </div>
            
            <div class="footer">
              <div class="footer-brand">PreçoCerto</div>
              <p>As melhores ofertas e cupons de desconto</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
              <p style="margin-top: 10px;">Se você tiver dúvidas, entre em contato com nosso suporte.</p>
            </div>
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
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Bem-vindo ao PreçoCerto</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 20px;
          }
          .email-wrapper { max-width: 600px; margin: 0 auto; }
          .container { 
            background: white; 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); 
            color: white; 
            padding: 50px 30px; 
            text-align: center;
            position: relative;
          }
          .logo-container {
            background: white;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          }
          .logo { 
            width: 60px; 
            height: 60px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 32px; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header p {
            margin: 10px 0 0;
            font-size: 18px;
            opacity: 0.95;
          }
          .content { padding: 40px 30px; }
          .welcome-message {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
            border-radius: 12px;
            margin: 30px 0;
          }
          .welcome-icon {
            font-size: 72px;
            margin-bottom: 15px;
          }
          .welcome-text {
            font-size: 20px;
            font-weight: 600;
            color: #991B1B;
          }
          .feature { 
            background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 12px; 
            border-left: 4px solid #DC2626;
            transition: transform 0.2s;
          }
          .feature-icon {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .feature strong { 
            color: #DC2626; 
            font-size: 18px;
            display: block;
            margin-bottom: 8px;
          }
          .feature p { 
            margin: 0; 
            color: #6B7280;
            font-size: 15px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 16px;
            margin: 30px 0;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
            text-align: center;
            display: block;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            padding: 25px;
            background: #F0FDF4;
            border-radius: 12px;
          }
          .stat {
            text-align: center;
          }
          .stat-number {
            font-size: 32px;
            font-weight: 900;
            color: #DC2626;
            display: block;
          }
          .stat-label {
            font-size: 13px;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 5px;
          }
          .footer { 
            background: #F9FAFB; 
            padding: 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px; 
            border-top: 1px solid #e5e7eb;
          }
          .footer-brand {
            font-weight: 700;
            color: #DC2626;
            font-size: 18px;
            margin-bottom: 10px;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-icon {
            display: inline-block;
            width: 36px;
            height: 36px;
            margin: 0 8px;
            background: #DC2626;
            border-radius: 50%;
            color: white;
            text-decoration: none;
            line-height: 36px;
            font-size: 18px;
          }
          @media only screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .header h1 { font-size: 26px; }
            .stats { flex-direction: column; gap: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <svg class="logo" viewBox="0 0 24 24" fill="#DC2626">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h1>🎉 Bem-vindo ao PreçoCerto!</h1>
              <p>Sua jornada de economia começa agora</p>
            </div>
            
            <div class="content">
              <div class="welcome-message">
                <div class="welcome-icon">🎊</div>
                <div class="welcome-text">Olá ${userName}!</div>
                <p style="margin-top: 10px; color: #991B1B;">Estamos muito felizes em tê-lo(a) conosco</p>
              </div>
              
              <p style="font-size: 16px; text-align: center; margin: 30px 0; color: #6B7280;">
                Agora você faz parte da maior comunidade de caçadores de ofertas do Brasil! 
                Prepare-se para economizar muito. 💰
              </p>
              
              <div class="stats">
                <div class="stat">
                  <span class="stat-number">1000+</span>
                  <span class="stat-label">Ofertas</span>
                </div>
                <div class="stat">
                  <span class="stat-number">500+</span>
                  <span class="stat-label">Cupons</span>
                </div>
                <div class="stat">
                  <span class="stat-number">50%</span>
                  <span class="stat-label">Economia</span>
                </div>
              </div>
              
              <h2 style="text-align: center; color: #111827; margin: 40px 0 25px;">O que você pode fazer:</h2>
              
              <div class="feature">
                <div class="feature-icon">🔥</div>
                <strong>Encontrar as Melhores Ofertas</strong>
                <p>Promoções atualizadas diariamente das principais lojas do Brasil. Nunca perca uma oferta incrível!</p>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🎫</div>
                <strong>Cupons de Desconto Exclusivos</strong>
                <p>Cupons verificados e testados para você economizar ainda mais. Descontos de até 70% OFF!</p>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🔔</div>
                <strong>Notificações Personalizadas</strong>
                <p>Receba alertas instantâneos dos produtos e categorias que você mais gosta. Nunca perca uma oferta!</p>
              </div>
              
              <div class="feature">
                <div class="feature-icon">❤️</div>
                <strong>Lista de Favoritos</strong>
                <p>Salve produtos e acompanhe quedas de preço em tempo real. Compre no momento certo!</p>
              </div>
              
              <div class="feature">
                <div class="feature-icon">📊</div>
                <strong>Comparação de Preços</strong>
                <p>Compare preços entre diferentes lojas e encontre o melhor negócio. Economia garantida!</p>
              </div>
              
              <div class="feature">
                <div class="feature-icon">🎯</div>
                <strong>Filtros Inteligentes</strong>
                <p>Encontre exatamente o que procura com nossos filtros avançados por categoria, preço e desconto.</p>
              </div>
              
              <a href="#" class="cta-button">
                🚀 Começar a Economizar Agora
              </a>
              
              <div style="background: #FFFBEB; padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B; margin: 30px 0;">
                <strong style="color: #92400E; display: block; margin-bottom: 10px;">💡 Dica de Ouro:</strong>
                <p style="margin: 0; color: #78350F;">
                  Ative as notificações push para receber alertas instantâneos das melhores ofertas. 
                  Seja o primeiro a aproveitar os descontos!
                </p>
              </div>
              
              <p style="text-align: center; margin-top: 40px; font-size: 16px;">
                Pronto para começar a economizar?<br>
                <strong style="color: #DC2626;">Baixe o app e aproveite!</strong>
              </p>
              
              <p style="margin-top: 40px; text-align: center;">
                Atenciosamente,<br>
                <strong style="color: #DC2626; font-size: 18px;">Equipe PreçoCerto</strong>
              </p>
            </div>
            
            <div class="footer">
              <div class="footer-brand">PreçoCerto</div>
              <p style="margin-bottom: 15px;">As melhores ofertas e cupons de desconto</p>
              
              <div class="social-links">
                <a href="#" class="social-icon">📷</a>
                <a href="#" class="social-icon">📘</a>
                <a href="#" class="social-icon">🐦</a>
              </div>
              
              <p>© ${new Date().getFullYear()} PreçoCerto. Todos os direitos reservados.</p>
              <p style="margin-top: 10px;">Precisa de ajuda? Entre em contato com nosso suporte.</p>
            </div>
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

export default new OneSignalEmailService();

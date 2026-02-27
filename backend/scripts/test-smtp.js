import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

console.log(chalk.blue.bold('\n🔧 Teste de Configuração SMTP\n'));
console.log(chalk.gray('='.repeat(50)));

// Verificar variáveis de ambiente
console.log(chalk.cyan('\n📋 Configurações:'));
console.log(`   Host: ${process.env.SMTP_HOST || chalk.red('NÃO CONFIGURADO')}`);
console.log(`   Port: ${process.env.SMTP_PORT || chalk.red('NÃO CONFIGURADO')}`);
console.log(`   Secure: ${process.env.SMTP_SECURE || 'false'}`);
console.log(`   User: ${process.env.SMTP_USER || chalk.red('NÃO CONFIGURADO')}`);
console.log(`   Pass: ${process.env.SMTP_PASS ? chalk.green('***CONFIGURADO***') : chalk.red('NÃO CONFIGURADO')}`);
console.log(`   From Name: ${process.env.SMTP_FROM_NAME || 'PreçoCerto'}`);
console.log(`   From Email: ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || chalk.red('NÃO CONFIGURADO')}`);

// Verificar se está configurado
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log(chalk.red('\n❌ SMTP não está configurado!'));
  console.log(chalk.yellow('\nConfigure as seguintes variáveis no .env:'));
  console.log(chalk.gray('   SMTP_HOST=smtp.gmail.com'));
  console.log(chalk.gray('   SMTP_PORT=587'));
  console.log(chalk.gray('   SMTP_SECURE=false'));
  console.log(chalk.gray('   SMTP_USER=seu-email@gmail.com'));
  console.log(chalk.gray('   SMTP_PASS=sua-senha-de-app'));
  console.log(chalk.gray('   SMTP_FROM_NAME=PreçoCerto'));
  console.log(chalk.gray('   SMTP_FROM_EMAIL=seu-email@gmail.com'));
  console.log(chalk.yellow('\n💡 Para Gmail, use uma "Senha de App":'));
  console.log(chalk.gray('   https://myaccount.google.com/apppasswords\n'));
  process.exit(1);
}

// Criar transporter
const config = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  debug: true, // Mostrar logs detalhados
  logger: true, // Habilitar logger
};

console.log(chalk.cyan('\n🔌 Criando transporter...'));
const transporter = nodemailer.createTransport(config);

// Teste 1: Verificar conexão
console.log(chalk.cyan('\n🔍 Teste 1: Verificando conexão SMTP...'));
try {
  await transporter.verify();
  console.log(chalk.green('✅ Conexão SMTP verificada com sucesso!'));
} catch (error) {
  console.log(chalk.red('❌ Erro na conexão SMTP:'));
  console.log(chalk.red(`   ${error.message}`));
  
  if (error.code === 'EAUTH') {
    console.log(chalk.yellow('\n💡 Dicas para resolver erro de autenticação:'));
    console.log(chalk.gray('   1. Verifique se o email e senha estão corretos'));
    console.log(chalk.gray('   2. Para Gmail, use uma "Senha de App" (não a senha normal)'));
    console.log(chalk.gray('   3. Acesse: https://myaccount.google.com/apppasswords'));
    console.log(chalk.gray('   4. Crie uma nova senha de app e use no SMTP_PASS'));
  } else if (error.code === 'ECONNECTION') {
    console.log(chalk.yellow('\n💡 Dicas para resolver erro de conexão:'));
    console.log(chalk.gray('   1. Verifique se o host e porta estão corretos'));
    console.log(chalk.gray('   2. Verifique sua conexão com a internet'));
    console.log(chalk.gray('   3. Verifique se o firewall não está bloqueando'));
  }
  
  process.exit(1);
}

// Teste 2: Enviar email de teste
console.log(chalk.cyan('\n📧 Teste 2: Enviando email de teste...'));

const testEmail = process.env.SMTP_USER; // Enviar para o próprio email

const mailOptions = {
  from: `"${process.env.SMTP_FROM_NAME || 'PreçoCerto'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
  to: testEmail,
  subject: '🧪 Teste SMTP - PreçoCerto',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success { background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Teste SMTP Bem-Sucedido!</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>🎉 Parabéns!</strong>
            <p style="margin: 10px 0 0 0;">
              Seu servidor SMTP está configurado corretamente e funcionando perfeitamente.
            </p>
          </div>
          
          <p><strong>Detalhes da configuração:</strong></p>
          <ul>
            <li>Host: ${process.env.SMTP_HOST}</li>
            <li>Port: ${process.env.SMTP_PORT}</li>
            <li>Secure: ${process.env.SMTP_SECURE || 'false'}</li>
            <li>User: ${process.env.SMTP_USER}</li>
            <li>Data/Hora: ${new Date().toLocaleString('pt-BR')}</li>
          </ul>
          
          <p>Agora você pode usar o serviço de email para:</p>
          <ul>
            <li>Recuperação de senha</li>
            <li>Emails de boas-vindas</li>
            <li>Notificações importantes</li>
          </ul>
          
          <p>Atenciosamente,<br><strong>Sistema PreçoCerto</strong></p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
    ✅ Teste SMTP Bem-Sucedido!
    
    Parabéns! Seu servidor SMTP está configurado corretamente.
    
    Detalhes:
    - Host: ${process.env.SMTP_HOST}
    - Port: ${process.env.SMTP_PORT}
    - User: ${process.env.SMTP_USER}
    - Data/Hora: ${new Date().toLocaleString('pt-BR')}
  `,
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log(chalk.green('✅ Email enviado com sucesso!'));
  console.log(chalk.gray(`   Message ID: ${info.messageId}`));
  console.log(chalk.gray(`   Para: ${testEmail}`));
  console.log(chalk.green('\n🎉 Todos os testes passaram! SMTP está funcionando corretamente.\n'));
} catch (error) {
  console.log(chalk.red('❌ Erro ao enviar email:'));
  console.log(chalk.red(`   ${error.message}`));
  
  if (error.responseCode === 550) {
    console.log(chalk.yellow('\n💡 Erro 550 - Email rejeitado:'));
    console.log(chalk.gray('   1. Verifique se o email de destino está correto'));
    console.log(chalk.gray('   2. Verifique se o domínio do remetente está verificado'));
  }
  
  process.exit(1);
}

process.exit(0);

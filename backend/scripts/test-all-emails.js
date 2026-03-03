#!/usr/bin/env node

/**
 * Script para testar todos os tipos de email OneSignal
 */

import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

console.log(chalk.blue('\n📧 Teste Completo de OneSignal Email Service\n'));

async function testAllEmails() {
  try {
    // Verificar configuração
    console.log(chalk.yellow('1. Verificando configuração...\n'));

    const provider = process.env.EMAIL_PROVIDER || 'smtp';
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;

    console.log(chalk.white(`   EMAIL_PROVIDER: ${provider}`));
    console.log(chalk.white(`   ONESIGNAL_APP_ID: ${appId ? '✅ Configurado' : '❌ Não configurado'}`));
    console.log(chalk.white(`   ONESIGNAL_API_KEY: ${apiKey ? '✅ Configurado' : '❌ Não configurado'}\n`));

    if (provider !== 'onesignal') {
      console.log(chalk.yellow('⚠️  EMAIL_PROVIDER não está configurado como "onesignal"'));
      console.log(chalk.white('   Usando OneSignal mesmo assim para teste...\n'));
    }

    if (!appId || !apiKey) {
      console.log(chalk.red('❌ OneSignal não está configurado!\n'));
      process.exit(1);
    }

    // Importar serviço
    console.log(chalk.yellow('2. Importando serviço...\n'));
    const oneSignalEmailService = (await import('../src/services/oneSignalEmailService.js')).default;

    if (!oneSignalEmailService.isConfigured()) {
      console.log(chalk.red('❌ Serviço não está configurado corretamente\n'));
      process.exit(1);
    }

    console.log(chalk.green('   ✅ Serviço configurado e pronto\n'));

    // Email de teste
    const testEmail = process.env.TEST_EMAIL || 'robertosshbrasil@gmail.com';
    console.log(chalk.white(`   Email de teste: ${testEmail}\n`));

    // Teste 1: Código de Recuperação
    console.log(chalk.yellow('3. Testando: Código de Recuperação de Senha\n'));
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(chalk.white(`   Código gerado: ${code}`));
    
    const result1 = await oneSignalEmailService.sendPasswordResetEmail(testEmail, code, 'Usuário Teste');
    
    if (result1.success) {
      console.log(chalk.green(`   ✅ Enviado! Message ID: ${result1.messageId}\n`));
    } else {
      console.log(chalk.red(`   ❌ Falha: ${result1.error}\n`));
    }

    // Aguardar 2 segundos entre envios
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 2: Senha Alterada
    console.log(chalk.yellow('4. Testando: Confirmação de Senha Alterada\n'));
    
    const result2 = await oneSignalEmailService.sendPasswordChangedEmail(testEmail, 'Usuário Teste');
    
    if (result2.success) {
      console.log(chalk.green(`   ✅ Enviado! Message ID: ${result2.messageId}\n`));
    } else {
      console.log(chalk.red(`   ❌ Falha: ${result2.error}\n`));
    }

    // Aguardar 2 segundos entre envios
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 3: Boas-vindas
    console.log(chalk.yellow('5. Testando: Email de Boas-vindas\n'));
    
    const result3 = await oneSignalEmailService.sendWelcomeEmail(testEmail, 'Usuário Teste');
    
    if (result3.success) {
      console.log(chalk.green(`   ✅ Enviado! Message ID: ${result3.messageId}\n`));
    } else {
      console.log(chalk.red(`   ❌ Falha: ${result3.error}\n`));
    }

    // Aguardar 2 segundos entre envios
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Teste 4: Email Genérico
    console.log(chalk.yellow('6. Testando: Email Genérico\n'));
    
    const result4 = await oneSignalEmailService.sendEmail({
      to: testEmail,
      subject: '🧪 Teste OneSignal Email - PreçoCerto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #DC2626;">🧪 Teste de Email</h1>
          <p>Este é um email de teste do sistema OneSignal Email.</p>
          <p>Se você recebeu isso, significa que o sistema está funcionando perfeitamente!</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>PreçoCerto</strong><br>
            Sistema de Notificações por Email
          </p>
        </div>
      `
    });
    
    if (result4.success) {
      console.log(chalk.green(`   ✅ Enviado! Message ID: ${result4.messageId}\n`));
    } else {
      console.log(chalk.red(`   ❌ Falha: ${result4.error}\n`));
    }

    // Resumo
    console.log(chalk.blue('═══════════════════════════════════════════════\n'));
    console.log(chalk.green.bold('✅ TESTE COMPLETO CONCLUÍDO!\n'));
    
    const results = [result1, result2, result3, result4];
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(chalk.white(`📊 Resumo:`));
    console.log(chalk.green(`   ✅ Enviados com sucesso: ${successCount}/4`));
    if (failCount > 0) {
      console.log(chalk.red(`   ❌ Falharam: ${failCount}/4`));
    }
    console.log();
    console.log(chalk.white(`📧 Verifique a caixa de entrada de: ${testEmail}`));
    console.log(chalk.white(`   Você deve ter recebido ${successCount} email(s)\n`));

    if (successCount === 4) {
      console.log(chalk.green('🎉 Todos os emails foram enviados com sucesso!'));
      console.log(chalk.white('   O sistema OneSignal Email está funcionando perfeitamente.\n'));
    } else {
      console.log(chalk.yellow('⚠️  Alguns emails falharam. Verifique os logs acima.\n'));
    }

  } catch (error) {
    console.log(chalk.red('\n❌ Erro no teste:'));
    console.log(chalk.red(`   ${error.message}\n`));
    
    if (error.stack) {
      console.log(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

testAllEmails();

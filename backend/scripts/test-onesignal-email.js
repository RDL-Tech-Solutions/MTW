#!/usr/bin/env node

/**
 * Script para testar OneSignal Email Service
 */

import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log(chalk.blue('\n📧 Teste de OneSignal Email Service\n'));

async function testOneSignalEmail() {
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
      console.log(chalk.white('   Para usar OneSignal, defina EMAIL_PROVIDER=onesignal no .env\n'));
    }

    if (!appId || !apiKey) {
      console.log(chalk.red('❌ OneSignal não está configurado!'));
      console.log(chalk.yellow('\nPara configurar:'));
      console.log(chalk.white('1. Acesse https://onesignal.com/'));
      console.log(chalk.white('2. Crie uma conta e um app'));
      console.log(chalk.white('3. Vá em Settings → Keys & IDs'));
      console.log(chalk.white('4. Copie App ID e REST API Key'));
      console.log(chalk.white('5. Adicione no .env:'));
      console.log(chalk.white('   EMAIL_PROVIDER=onesignal'));
      console.log(chalk.white('   ONESIGNAL_APP_ID=seu-app-id'));
      console.log(chalk.white('   ONESIGNAL_API_KEY=sua-api-key\n'));
      rl.close();
      process.exit(1);
    }

    // Importar serviço
    console.log(chalk.yellow('2. Importando serviço...\n'));
    const oneSignalEmailService = (await import('../src/services/oneSignalEmailService.js')).default;

    if (!oneSignalEmailService.isConfigured()) {
      console.log(chalk.red('❌ Serviço não está configurado corretamente\n'));
      rl.close();
      process.exit(1);
    }

    console.log(chalk.green('   ✅ Serviço configurado e pronto\n'));

    // Solicitar email de destino
    console.log(chalk.yellow('3. Configurando teste...\n'));
    const email = await question(chalk.white('   Digite o email de destino: '));

    if (!email || !email.includes('@')) {
      console.log(chalk.red('\n❌ Email inválido\n'));
      rl.close();
      process.exit(1);
    }

    // Menu de opções
    console.log(chalk.yellow('\n4. Escolha o tipo de email:\n'));
    console.log(chalk.white('   1. Código de Recuperação de Senha'));
    console.log(chalk.white('   2. Senha Alterada'));
    console.log(chalk.white('   3. Boas-vindas'));
    console.log(chalk.white('   4. Email Genérico\n'));

    const option = await question(chalk.white('   Opção: '));

    console.log(chalk.yellow('\n5. Enviando email...\n'));

    let result;

    switch (option) {
      case '1':
        // Código de recuperação
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(chalk.white(`   Código gerado: ${code}\n`));
        result = await oneSignalEmailService.sendPasswordResetEmail(email, code, 'Usuário Teste');
        break;

      case '2':
        // Senha alterada
        result = await oneSignalEmailService.sendPasswordChangedEmail(email, 'Usuário Teste');
        break;

      case '3':
        // Boas-vindas
        result = await oneSignalEmailService.sendWelcomeEmail(email, 'Usuário Teste');
        break;

      case '4':
        // Email genérico
        result = await oneSignalEmailService.sendEmail({
          to: email,
          subject: 'Teste OneSignal Email',
          html: '<h1>Teste de Email</h1><p>Se você recebeu isso, OneSignal está funcionando!</p>'
        });
        break;

      default:
        console.log(chalk.red('   ❌ Opção inválida\n'));
        rl.close();
        process.exit(1);
    }

    // Resultado
    console.log(chalk.yellow('6. Resultado:\n'));

    if (result.success) {
      console.log(chalk.green('   ✅ Email enviado com sucesso!\n'));
      console.log(chalk.white(`   Message ID: ${result.messageId}`));
      if (result.recipients) {
        console.log(chalk.white(`   Recipients: ${result.recipients}`));
      }
      console.log();
      console.log(chalk.green('🎉 Teste concluído com sucesso!'));
      console.log(chalk.white('   Verifique a caixa de entrada do email de destino.\n'));
    } else {
      console.log(chalk.red('   ❌ Falha ao enviar email\n'));
      console.log(chalk.white(`   Erro: ${result.error}\n`));
      console.log(chalk.yellow('Possíveis causas:'));
      console.log(chalk.white('   • API Key inválida'));
      console.log(chalk.white('   • App ID incorreto'));
      console.log(chalk.white('   • Domínio não verificado no OneSignal'));
      console.log(chalk.white('   • Limite de envio atingido (10k/mês)\n'));
    }

    rl.close();

  } catch (error) {
    console.log(chalk.red('\n❌ Erro no teste:'));
    console.log(chalk.red(`   ${error.message}\n`));
    
    if (error.stack) {
      console.log(chalk.gray(error.stack));
    }
    
    rl.close();
    process.exit(1);
  }
}

testOneSignalEmail();

import dotenv from 'dotenv';
import chalk from 'chalk';
import readline from 'readline';
import oneSignalService from '../src/services/oneSignalService.js';
import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function printHeader() {
  console.log('\n' + chalk.bold.blue('='.repeat(60)));
  console.log(chalk.bold.blue('  🧪 Teste de Notificação Push OneSignal'));
  console.log(chalk.bold.blue('='.repeat(60)) + '\n');
}

async function listUsers() {
  console.log(chalk.bold.cyan('📋 Usuários Disponíveis:\n'));

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log(chalk.red('❌ Erro ao buscar usuários:'), error.message);
    return [];
  }

  if (!users || users.length === 0) {
    console.log(chalk.yellow('⚠️  Nenhum usuário encontrado no banco de dados'));
    return [];
  }

  users.forEach((user, index) => {
    console.log(chalk.white(`${index + 1}. ${chalk.bold(user.name || 'Sem nome')} (${user.email})`));
    console.log(chalk.gray(`   ID: ${user.id}`));
    console.log(chalk.gray(`   Cadastrado em: ${new Date(user.created_at).toLocaleString('pt-BR')}\n`));
  });

  return users;
}

async function sendTestNotification(userId, title, message) {
  console.log(chalk.bold.cyan('\n📤 Enviando notificação...\n'));

  try {
    const result = await oneSignalService.sendToUser({
      external_id: userId.toString(),
      title: title,
      message: message,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        test_id: Math.random().toString(36).substring(7)
      },
      priority: 'high',
      badge: 1
    });

    if (result.success) {
      console.log(chalk.green('✅ Notificação enviada com sucesso!\n'));
      console.log(chalk.white('📊 Detalhes:'));
      console.log(chalk.gray(`   Notification ID: ${result.notification_id}`));
      console.log(chalk.gray(`   Recipients: ${result.recipients || 'N/A'}`));
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('\n⚠️  Avisos:'));
        result.errors.forEach(err => console.log(chalk.yellow(`   - ${err}`)));
      }
    } else {
      console.log(chalk.red('❌ Falha ao enviar notificação\n'));
      console.log(chalk.red('Erro:'), result.error || 'Erro desconhecido');
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red('\nErros detalhados:'));
        result.errors.forEach(err => console.log(chalk.red(`   - ${err}`)));
      }
    }

    return result;
  } catch (error) {
    console.log(chalk.red('❌ Erro ao enviar notificação:'), error.message);
    console.log(chalk.gray('\nStack trace:'));
    console.log(chalk.gray(error.stack));
    return { success: false, error: error.message };
  }
}

async function checkOneSignalStatus() {
  console.log(chalk.bold.cyan('🔍 Verificando configuração do OneSignal...\n'));

  // Aguardar inicialização se necessário
  if (!oneSignalService.initialized && oneSignalService.appId && oneSignalService.apiKey) {
    console.log(chalk.yellow('⏳ Aguardando inicialização do OneSignal...'));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const enabled = process.env.ONESIGNAL_ENABLED === 'true';
  const initialized = oneSignalService.initialized;
  const hasAppId = !!oneSignalService.appId;
  const hasApiKey = !!oneSignalService.apiKey;

  console.log(chalk.white('Status:'));
  console.log(enabled ? chalk.green('   ✓ OneSignal habilitado') : chalk.red('   ✗ OneSignal desabilitado'));
  console.log(initialized ? chalk.green('   ✓ Cliente inicializado') : chalk.red('   ✗ Cliente não inicializado'));
  console.log(hasAppId ? chalk.green('   ✓ App ID configurado') : chalk.red('   ✗ App ID não configurado'));
  console.log(hasApiKey ? chalk.green('   ✓ API Key configurada') : chalk.red('   ✗ API Key não configurada'));

  if (hasAppId) {
    console.log(chalk.gray(`   App ID: ${oneSignalService.appId.substring(0, 8)}...`));
  }

  console.log('');

  return enabled && initialized && hasAppId && hasApiKey;
}

async function main() {
  try {
    printHeader();

    // Verificar status do OneSignal
    const isConfigured = await checkOneSignalStatus();

    if (!isConfigured) {
      console.log(chalk.red('❌ OneSignal não está configurado corretamente'));
      console.log(chalk.yellow('\nVerifique as variáveis de ambiente:'));
      console.log(chalk.gray('   - ONESIGNAL_ENABLED=true'));
      console.log(chalk.gray('   - ONESIGNAL_APP_ID=<seu-app-id>'));
      console.log(chalk.gray('   - ONESIGNAL_REST_API_KEY=<sua-api-key>'));
      console.log('');
      rl.close();
      process.exit(1);
    }

    // Listar usuários
    const users = await listUsers();

    if (users.length === 0) {
      console.log(chalk.yellow('\n⚠️  Não há usuários para testar'));
      console.log(chalk.gray('Cadastre um usuário no app mobile primeiro\n'));
      rl.close();
      process.exit(0);
    }

    // Perguntar qual usuário
    const userChoice = await question(chalk.cyan('Digite o número do usuário (ou "all" para todos): '));

    let selectedUsers = [];

    if (userChoice.toLowerCase() === 'all') {
      selectedUsers = users;
    } else {
      const index = parseInt(userChoice) - 1;
      if (index >= 0 && index < users.length) {
        selectedUsers = [users[index]];
      } else {
        console.log(chalk.red('\n❌ Opção inválida'));
        rl.close();
        process.exit(1);
      }
    }

    // Perguntar título e mensagem
    const title = await question(chalk.cyan('\nTítulo da notificação (Enter para padrão): ')) || '🧪 Teste de Notificação';
    const message = await question(chalk.cyan('Mensagem da notificação (Enter para padrão): ')) || 'Esta é uma notificação de teste do PreçoCerto! Se você recebeu isso, as notificações push estão funcionando! 🎉';

    console.log('');

    // Enviar notificações
    let successCount = 0;
    let failCount = 0;

    for (const user of selectedUsers) {
      console.log(chalk.bold(`\n📱 Enviando para: ${user.name || user.email}`));
      const result = await sendTestNotification(user.id, title, message);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Aguardar um pouco entre envios para não sobrecarregar
      if (selectedUsers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Resumo
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold('  📊 Resumo'));
    console.log(chalk.bold('='.repeat(60)) + '\n');
    console.log(chalk.green(`✓ Enviadas com sucesso: ${successCount}`));
    console.log(chalk.red(`✗ Falharam: ${failCount}`));
    console.log('');

    if (successCount > 0) {
      console.log(chalk.bold.green('✅ Teste concluído com sucesso!'));
      console.log(chalk.gray('\nVerifique o dispositivo móvel para confirmar o recebimento.\n'));
      console.log(chalk.yellow('⚠️  Importante:'));
      console.log(chalk.gray('   - O usuário deve ter feito login no app mobile'));
      console.log(chalk.gray('   - O OneSignal SDK deve estar inicializado no app'));
      console.log(chalk.gray('   - O external_id deve ter sido definido como user.id no login'));
      console.log(chalk.gray('   - As permissões de notificação devem estar habilitadas\n'));
    } else {
      console.log(chalk.bold.red('❌ Todas as notificações falharam'));
      console.log(chalk.yellow('\nPossíveis causas:'));
      console.log(chalk.gray('   - Usuário não está registrado no OneSignal'));
      console.log(chalk.gray('   - App mobile não inicializou o OneSignal SDK'));
      console.log(chalk.gray('   - external_id não foi definido no login'));
      console.log(chalk.gray('   - Credenciais do OneSignal incorretas\n'));
    }

    rl.close();
    process.exit(successCount > 0 ? 0 : 1);

  } catch (error) {
    console.error(chalk.red('\n❌ Erro durante o teste:'), error.message);
    console.error(chalk.gray(error.stack));
    rl.close();
    process.exit(1);
  }
}

main();

import dotenv from 'dotenv';
import chalk from 'chalk';
import readline from 'readline';
import fcmService from '../src/services/fcmService.js';
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
  console.log(chalk.bold.blue('  🧪 Teste de Notificação Push FCM'));
  console.log(chalk.bold.blue('='.repeat(60)) + '\n');
}

async function listUsers() {
  console.log(chalk.bold.cyan('📋 Usuários Disponíveis:\n'));

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, fcm_token, created_at')
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
    const hasToken = user.fcm_token ? chalk.green('✓') : chalk.red('✗');
    console.log(chalk.white(`${index + 1}. ${chalk.bold(user.name || 'Sem nome')} (${user.email}) ${hasToken} FCM`));
    console.log(chalk.gray(`   ID: ${user.id}`));
    if (user.fcm_token) {
      console.log(chalk.gray(`   Token: ${user.fcm_token.substring(0, 30)}...`));
    }
    console.log(chalk.gray(`   Cadastrado em: ${new Date(user.created_at).toLocaleString('pt-BR')}\n`));
  });

  return users;
}

async function sendTestNotification(user, title, message) {
  console.log(chalk.bold.cyan('\n📤 Enviando notificação...\n'));

  try {
    if (!user.fcm_token) {
      console.log(chalk.red('❌ Usuário não tem FCM token registrado'));
      console.log(chalk.yellow('\n💡 O usuário precisa:'));
      console.log(chalk.gray('   1. Abrir o app mobile'));
      console.log(chalk.gray('   2. Fazer login'));
      console.log(chalk.gray('   3. Conceder permissão de notificações'));
      return { success: false, error: 'No FCM token' };
    }

    const result = await fcmService.sendToUser({
      fcm_token: user.fcm_token,
      title: title,
      message: message,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        test_id: Math.random().toString(36).substring(7)
      },
      priority: 'high'
    });

    if (result.success) {
      console.log(chalk.green('✅ Notificação enviada com sucesso!\n'));
      console.log(chalk.white('📊 Detalhes:'));
      console.log(chalk.gray(`   Message ID: ${result.message_id}`));
      console.log(chalk.gray(`   Recipients: ${result.recipients || 1}`));
    } else {
      console.log(chalk.red('❌ Falha ao enviar notificação\n'));
      console.log(chalk.red('Erro:'), result.error || 'Erro desconhecido');
      
      if (result.code === 'messaging/registration-token-not-registered') {
        console.log(chalk.yellow('\n⚠️  Token FCM inválido ou expirado'));
        console.log(chalk.gray('   O usuário precisa fazer login novamente no app'));
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

async function checkFCMStatus() {
  console.log(chalk.bold.cyan('🔍 Verificando configuração do FCM...\n'));

  const initialized = fcmService.isEnabled();

  console.log(chalk.white('Status:'));
  console.log(initialized ? chalk.green('   ✓ Firebase Admin inicializado') : chalk.red('   ✗ Firebase Admin não inicializado'));
  console.log(initialized ? chalk.green('   ✓ FCM Messaging disponível') : chalk.red('   ✗ FCM Messaging não disponível'));

  if (!initialized) {
    console.log(chalk.yellow('\n⚠️  Firebase Admin não está configurado'));
    console.log(chalk.gray('   Verifique se firebase-service-account.json existe'));
    console.log(chalk.gray('   Ou configure FIREBASE_SERVICE_ACCOUNT_PATH no .env'));
  }

  console.log('');

  return initialized;
}

async function main() {
  try {
    printHeader();

    // Verificar status do FCM
    const isConfigured = await checkFCMStatus();

    if (!isConfigured) {
      console.log(chalk.red('❌ Firebase Admin não está configurado corretamente'));
      console.log(chalk.yellow('\nPara configurar:'));
      console.log(chalk.gray('   1. Baixe firebase-service-account.json do Firebase Console'));
      console.log(chalk.gray('   2. Salve em: backend/firebase-service-account.json'));
      console.log(chalk.gray('   3. Ou configure FIREBASE_SERVICE_ACCOUNT_PATH no .env'));
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

    // Verificar se algum usuário tem FCM token
    const usersWithToken = users.filter(u => u.fcm_token);
    if (usersWithToken.length === 0) {
      console.log(chalk.yellow('\n⚠️  Nenhum usuário tem FCM token registrado'));
      console.log(chalk.gray('Os usuários precisam:'));
      console.log(chalk.gray('   1. Abrir o app mobile'));
      console.log(chalk.gray('   2. Fazer login'));
      console.log(chalk.gray('   3. Conceder permissão de notificações\n'));
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
      const result = await sendTestNotification(user, title, message);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Aguardar um pouco entre envios para não sobrecarregar
      if (selectedUsers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
      console.log(chalk.gray('   - O Firebase Messaging SDK deve estar inicializado'));
      console.log(chalk.gray('   - O FCM token deve ter sido registrado no backend'));
      console.log(chalk.gray('   - As permissões de notificação devem estar habilitadas\n'));
    } else {
      console.log(chalk.bold.red('❌ Todas as notificações falharam'));
      console.log(chalk.yellow('\nPossíveis causas:'));
      console.log(chalk.gray('   - Usuário não tem FCM token registrado'));
      console.log(chalk.gray('   - App mobile não inicializou o Firebase Messaging'));
      console.log(chalk.gray('   - Token FCM expirou (usuário precisa fazer login novamente)'));
      console.log(chalk.gray('   - Firebase Service Account não está configurado\n'));
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

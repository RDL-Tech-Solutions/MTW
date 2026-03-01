import dotenv from 'dotenv';
import chalk from 'chalk';
import oneSignalService from '../src/services/oneSignalService.js';
import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

dotenv.config();

async function main() {
  try {
    console.log(chalk.bold.blue('\n🧪 Teste Rápido de Notificação Push OneSignal\n'));

    // Aguardar inicialização
    if (!oneSignalService.initialized) {
      console.log(chalk.yellow('⏳ Aguardando inicialização...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Verificar status
    const enabled = process.env.ONESIGNAL_ENABLED === 'true';
    const initialized = oneSignalService.initialized;

    if (!enabled || !initialized) {
      console.log(chalk.red('❌ OneSignal não está configurado'));
      process.exit(1);
    }

    console.log(chalk.green('✅ OneSignal configurado e pronto\n'));

    // Buscar primeiro usuário
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !users || users.length === 0) {
      console.log(chalk.yellow('⚠️  Nenhum usuário encontrado'));
      process.exit(0);
    }

    const user = users[0];
    console.log(chalk.cyan(`📱 Enviando para: ${user.name || user.email}`));
    console.log(chalk.gray(`   ID: ${user.id}\n`));

    // Enviar notificação
    const result = await oneSignalService.sendToUser({
      external_id: user.id.toString(),
      title: '🧪 Teste Rápido OneSignal',
      message: 'Notificação de teste enviada com sucesso! 🎉',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      priority: 'high'
    });

    if (result.success) {
      console.log(chalk.green('✅ Notificação enviada com sucesso!\n'));
      console.log(chalk.white('📊 Detalhes:'));
      console.log(chalk.gray(`   Notification ID: ${result.notification_id}`));
      console.log(chalk.gray(`   Recipients: ${result.recipients || 'N/A'}\n`));
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('⚠️  Avisos:'));
        result.errors.forEach(err => console.log(chalk.yellow(`   - ${err}`)));
        console.log('');
      }

      console.log(chalk.bold.green('✅ Teste concluído com sucesso!'));
      console.log(chalk.gray('Verifique o dispositivo móvel para confirmar o recebimento.\n'));
      process.exit(0);
    } else {
      console.log(chalk.red('❌ Falha ao enviar notificação\n'));
      console.log(chalk.red('Erro:'), result.error || 'Erro desconhecido');
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.red('\nErros detalhados:'));
        result.errors.forEach(err => console.log(chalk.red(`   - ${err}`)));
      }
      
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Erro:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

main();

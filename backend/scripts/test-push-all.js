import dotenv from 'dotenv';
import chalk from 'chalk';
import oneSignalService from '../src/services/oneSignalService.js';

dotenv.config();

async function main() {
  try {
    console.log(chalk.bold.blue('\n🧪 Teste de Notificação Push para TODOS os Dispositivos\n'));

    // Verificar se OneSignal está configurado
    if (!oneSignalService.initialized) {
      console.log(chalk.yellow('⏳ Aguardando inicialização...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const enabled = process.env.ONESIGNAL_ENABLED === 'true';
    const initialized = oneSignalService.initialized;

    if (!enabled || !initialized) {
      console.log(chalk.red('❌ OneSignal não está configurado'));
      process.exit(1);
    }

    console.log(chalk.green('✅ OneSignal configurado e pronto\n'));
    console.log(chalk.cyan('📱 Enviando para TODOS os dispositivos inscritos...\n'));

    // Enviar para todos os dispositivos
    const result = await oneSignalService.sendToAll({
      title: '🧪 Teste OneSignal - Broadcast',
      message: 'Esta é uma notificação de teste enviada para todos os dispositivos! 🎉',
      data: {
        type: 'test',
        screen: 'Home',
        timestamp: new Date().toISOString()
      },
      priority: 'high'
    });

    if (result.success) {
      console.log(chalk.green('✅ Notificação enviada com sucesso!\n'));
      console.log(chalk.white('📊 Detalhes:'));
      console.log(chalk.gray(`   Notification ID: ${result.notification_id}`));
      console.log(chalk.gray(`   Recipients: ${result.recipients || 'Todos os inscritos'}\n`));
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('⚠️  Avisos:'));
        result.errors.forEach(err => console.log(chalk.yellow(`   - ${err}`)));
        console.log('');
      }

      console.log(chalk.bold.green('✅ Teste concluído com sucesso!'));
      console.log(chalk.gray('Verifique os dispositivos móveis para confirmar o recebimento.\n'));
      
      if (result.recipients === 0) {
        console.log(chalk.yellow('⚠️  Nenhum dispositivo inscrito encontrado!\n'));
        console.log(chalk.white('Para receber notificações:'));
        console.log(chalk.gray('   1. Faça build nativo do app (não funciona no Expo Go)'));
        console.log(chalk.gray('   2. Instale o app no dispositivo'));
        console.log(chalk.gray('   3. Faça login no app'));
        console.log(chalk.gray('   4. Vá em Configurações → Notificações'));
        console.log(chalk.gray('   5. Clique em "Ativar Notificações"'));
        console.log(chalk.gray('   6. Conceda a permissão\n'));
      }
      
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

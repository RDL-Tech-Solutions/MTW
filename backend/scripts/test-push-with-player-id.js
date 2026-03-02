import dotenv from 'dotenv';
import chalk from 'chalk';
import oneSignalService from '../src/services/oneSignalService.js';

dotenv.config();

async function main() {
  try {
    console.log(chalk.bold.blue('\n🧪 Teste de Notificação Push com Player ID\n'));

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

    // Obter Player ID dos argumentos ou usar um de teste
    const playerIdArg = process.argv[2];
    
    if (!playerIdArg) {
      console.log(chalk.yellow('⚠️  Nenhum Player ID fornecido\n'));
      console.log(chalk.white('Como usar:'));
      console.log(chalk.cyan('  npm run test:push-player -- SEU_PLAYER_ID\n'));
      console.log(chalk.white('Como obter seu Player ID:'));
      console.log(chalk.gray('  1. Abra o app no dispositivo (build nativo)'));
      console.log(chalk.gray('  2. Vá em Configurações → Notificações'));
      console.log(chalk.gray('  3. Copie o Player ID mostrado'));
      console.log(chalk.gray('  4. Execute: npm run test:push-player -- PLAYER_ID\n'));
      
      console.log(chalk.white('Ou teste enviando para TODOS os dispositivos:'));
      console.log(chalk.cyan('  npm run test:push-all\n'));
      process.exit(0);
    }

    const playerId = playerIdArg;
    console.log(chalk.cyan(`📱 Enviando para Player ID: ${playerId}\n`));

    // Enviar notificação diretamente para o Player ID
    const result = await oneSignalService.sendToPlayerIds({
      player_ids: [playerId],
      title: '🧪 Teste OneSignal',
      message: 'Notificação de teste enviada diretamente para seu dispositivo! 🎉',
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
      
      console.log(chalk.yellow('\n💡 Dicas:'));
      console.log(chalk.gray('   - Verifique se o Player ID está correto'));
      console.log(chalk.gray('   - Certifique-se de que o app está instalado (build nativo)'));
      console.log(chalk.gray('   - Verifique se as notificações estão ativadas no app'));
      console.log(chalk.gray('   - Tente enviar para todos: npm run test:push-all\n'));
      
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Erro:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

main();

/**
 * Teste simples de notificação FCM
 */

import logger from '../src/config/logger.js';
import fcmService from '../src/services/fcmService.js';
import { supabase } from '../src/config/database.js';

async function testFCM() {
  console.log('\n🧪 TESTE DE NOTIFICAÇÃO FCM\n');

  try {
    // 1. Verificar se FCM está habilitado
    console.log('1️⃣ Verificando FCM...');
    
    // Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isEnabled = fcmService.isEnabled();
    console.log(`   FCM habilitado: ${isEnabled ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!isEnabled) {
      console.log('\n❌ FCM não está habilitado. Verifique a configuração.');
      process.exit(1);
    }

    // 2. Buscar usuário com token FCM
    console.log('\n2️⃣ Buscando usuário com token FCM...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, fcm_token')
      .not('fcm_token', 'is', null)
      .limit(1);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('   ❌ Nenhum usuário com token FCM encontrado');
      console.log('   💡 Abra o app e permita notificações para registrar um token');
      process.exit(1);
    }

    const user = users[0];
    console.log(`   ✅ Usuário encontrado: ${user.name || user.email}`);
    console.log(`   Token: ${user.fcm_token.substring(0, 50)}...`);

    // 3. Enviar notificação de teste
    console.log('\n3️⃣ Enviando notificação de teste...');
    
    const notification = {
      fcm_token: user.fcm_token,
      title: '🎉 Teste de Notificação',
      message: 'Esta é uma notificação de teste do sistema MTW!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    const result = await fcmService.sendToUser(notification);
    
    console.log('\n📊 Resultado:');
    console.log(`   Sucesso: ${result.success ? '✅' : '❌'}`);
    
    if (result.success) {
      console.log(`   Message ID: ${result.messageId}`);
      console.log('\n✅ Notificação enviada com sucesso!');
      console.log('   Verifique seu dispositivo móvel');
    } else {
      console.log(`   Erro: ${result.error}`);
      console.log('\n❌ Falha ao enviar notificação');
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar teste
testFCM()
  .then(() => {
    console.log('\n✅ Teste concluído\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  });

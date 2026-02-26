import 'dotenv/config';
import pushNotificationService from './src/services/pushNotification.js';
import logger from './src/config/logger.js';

const pushToken = 'ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]';

async function sendTest() {
  console.log('🧪 Enviando notificação de teste...');
  console.log(`📱 Token: ${pushToken}`);
  console.log(`🔑 EXPO_ACCESS_TOKEN: ${process.env.EXPO_ACCESS_TOKEN ? 'Configurado ✅' : 'Não configurado ⚠️'}`);
  console.log('');
  
  try {
    const result = await pushNotificationService.sendToUser(
      pushToken,
      {
        title: '🧪 Teste de Notificação',
        message: 'Esta é uma notificação de teste do PreçoCerto! Se você recebeu isso, as notificações push estão funcionando perfeitamente! 🎉',
        type: 'test',
        data: { 
          screen: 'Home',
          timestamp: new Date().toISOString()
        }
      }
    );
    
    console.log('');
    if (result) {
      console.log('✅ Notificação enviada com sucesso!');
      console.log('📱 Verifique seu dispositivo móvel');
      console.log('');
      console.log('💡 Lembre-se:');
      console.log('   - O app deve estar em background ou fechado');
      console.log('   - Notificações não aparecem com app aberto');
    } else {
      console.log('❌ Falha ao enviar notificação');
      console.log('');
      console.log('🔍 Possíveis causas:');
      console.log('   - Token inválido ou expirado');
      console.log('   - Expo API fora do ar');
      console.log('   - Problema de conexão');
      console.log('   - Verifique os logs acima para mais detalhes');
      console.log('');
      console.log('💡 Tente:');
      console.log('   1. Verificar se EXPO_ACCESS_TOKEN está no .env');
      console.log('   2. Fazer logout/login no app para gerar novo token');
      console.log('   3. Verificar https://status.expo.dev');
    }
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Erro ao enviar notificação:', error.message);
    console.error('');
    if (error.response) {
      console.error('📡 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    console.error('');
  }
  
  process.exit(0);
}

sendTest();

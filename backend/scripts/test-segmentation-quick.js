/**
 * Teste rápido de segmentação
 */

import logger from '../src/config/logger.js';
import User from '../src/models/User.js';
import notificationSegmentationService from '../src/services/notificationSegmentationService.js';

async function testSegmentation() {
  console.log('\n🧪 TESTE DE SEGMENTAÇÃO\n');

  try {
    // 1. Verificar usuários com FCM token
    console.log('1️⃣ Buscando usuários com FCM token...');
    const users = await User.findAllWithFCMToken();
    console.log(`   ✅ ${users.length} usuários encontrados`);
    
    users.forEach(u => {
      console.log(`   - ${u.name || u.email} (${u.fcm_token.substring(0, 30)}...)`);
    });

    // 2. Testar segmentação de cupom
    console.log('\n2️⃣ Testando segmentação de cupom...');
    const testCoupon = {
      id: 'test-123',
      code: 'TESTE123',
      platform: 'shopee',
      title: 'Cupom de Teste',
      description: 'Teste de segmentação'
    };

    const segmentedUsers = await notificationSegmentationService.getUsersForCoupon(testCoupon);
    console.log(`\n   ✅ ${segmentedUsers.length} usuários segmentados`);
    
    if (segmentedUsers.length > 0) {
      console.log('\n   Usuários que receberão notificação:');
      segmentedUsers.forEach(u => {
        console.log(`   - ${u.name || u.email}`);
      });
    } else {
      console.log('\n   ❌ Nenhum usuário será notificado');
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar teste
testSegmentation()
  .then(() => {
    console.log('\n✅ Teste concluído\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  });

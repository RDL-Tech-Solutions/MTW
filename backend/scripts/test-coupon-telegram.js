/**
 * Teste rápido de envio de cupom para Telegram
 */

import logger from '../src/config/logger.js';
import Coupon from '../src/models/Coupon.js';
import couponNotificationService from '../src/services/coupons/couponNotificationService.js';

async function testCouponTelegram() {
  console.log('\n🧪 TESTE DE CUPOM PARA TELEGRAM\n');

  try {
    // 1. Criar cupom de teste
    console.log('1️⃣ Criando cupom de teste...');
    
    const testCoupon = {
      code: `TESTE_TELEGRAM_${Date.now()}`,
      platform: 'shopee',
      discount_type: 'percentage',
      discount_value: 20,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      is_pending_approval: false,
      is_general: true,
      title: 'Teste de Telegram',
      description: 'Cupom de teste para verificar envio ao Telegram'
    };

    const coupon = await Coupon.create(testCoupon);
    console.log(`   ✅ Cupom criado: ${coupon.code} (ID: ${coupon.id})`);

    // 2. Enviar notificação
    console.log('\n2️⃣ Enviando notificação para Telegram...');
    
    const result = await couponNotificationService.notifyNewCoupon(coupon, { manual: true });
    
    console.log('\n📊 Resultado:');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   WhatsApp: ${JSON.stringify(result.whatsapp)}`);
    console.log(`   Telegram: ${JSON.stringify(result.telegram)}`);

    // 3. Limpar cupom de teste
    console.log('\n3️⃣ Limpando cupom de teste...');
    await Coupon.delete(coupon.id);
    console.log('   ✅ Cupom removido');

    // 4. Verificar resultado
    if (result.telegram && result.telegram.success && result.telegram.sent > 0) {
      console.log('\n✅ SUCESSO! Cupom foi enviado para o Telegram');
      console.log(`   Canais: ${result.telegram.sent}/${result.telegram.total}`);
    } else {
      console.log('\n❌ FALHA! Cupom não foi enviado para o Telegram');
      console.log(`   Motivo: ${result.telegram?.reason || 'Desconhecido'}`);
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar teste
testCouponTelegram()
  .then(() => {
    console.log('\n✅ Teste concluído\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  });

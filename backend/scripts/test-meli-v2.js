/**
 * Teste da Captura V2 do Mercado Livre
 * Execute: node scripts/test-meli-v2.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🧪 TESTE - Captura de Cupons Mercado Livre V2\n');
console.log('='.repeat(70));

async function testCapture() {
  try {
    // Importar o serviço V2
    const { default: meliService } = await import('../src/services/coupons/meliCouponCaptureV2.js');

    console.log('\n1️⃣ Testando captura de cupons/ofertas...\n');
    
    const coupons = await meliService.captureCoupons();

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ SUCESSO! ${coupons.length} ofertas capturadas\n`);

    if (coupons.length > 0) {
      console.log('📋 Primeiras 5 ofertas:\n');
      
      coupons.slice(0, 5).forEach((coupon, index) => {
        console.log(`${index + 1}. ${coupon.title.substring(0, 60)}...`);
        console.log(`   💰 Desconto: ${coupon.discount_value}% OFF`);
        console.log(`   💵 De R$ ${coupon.original_price} por R$ ${coupon.final_price}`);
        console.log(`   🔗 Link: ${coupon.affiliate_link.substring(0, 50)}...`);
        console.log(`   🎟️  Código: ${coupon.code}`);
        console.log('');
      });

      console.log('💡 PRÓXIMOS PASSOS:\n');
      console.log('1. Ativar o módulo no banco de dados');
      console.log('2. Reiniciar o backend');
      console.log('3. Os cupons serão salvos automaticamente a cada 10 minutos');
      console.log('4. Você verá as ofertas no painel admin');
    } else {
      console.log('⚠️  Nenhuma oferta encontrada no momento.');
      console.log('💡 Isso pode acontecer se não houver produtos com desconto.');
      console.log('   O sistema continuará tentando automaticamente.');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO no teste:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Executar teste
testCapture();

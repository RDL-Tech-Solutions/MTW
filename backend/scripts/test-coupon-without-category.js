import dotenv from 'dotenv';
dotenv.config();

import notificationDispatcher from '../src/services/bots/notificationDispatcher.js';
import logger from '../src/config/logger.js';

/**
 * Testar publicação de cupom SEM categoria com flag manual=true
 * Deve funcionar agora com o bypass corrigido
 */

async function testCouponWithoutCategory() {
    console.log('🧪 TESTE: Publicação de Cupom SEM Categoria\n');
    console.log('='.repeat(80));

    try {
        // Cupom de teste SEM categoria
        const testCoupon = {
            id: 'test-' + Date.now(),
            code: 'TESTE10',
            platform: 'shopee',
            discount_value: 10,
            discount_type: 'percentage',
            min_purchase: 0,
            is_general: true,
            is_active: true,
            // category_id: undefined, // SEM CATEGORIA!
            valid_from: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        console.log('\n📋 Dados do cupom de teste:');
        console.log(JSON.stringify(testCoupon, null, 2));

        console.log('\n\n🚀 Disparando notificação com manual=true...');
        console.log('-'.repeat(80));

        const result = await notificationDispatcher.dispatch(
            'coupon_new',
            testCoupon,
            { manual: true } // FLAG MANUAL ATIVA
        );

        console.log('\n\n📊 RESULTADO:');
        console.log('='.repeat(80));
        console.log(`Total de canais: ${result.total || 0}`);
        console.log(`Enviados: ${result.sent || 0}`);
        console.log(`Falhas: ${result.failed || 0}`);
        console.log(`Filtrados: ${result.filtered || 0}`);

        if (result.details && result.details.length > 0) {
            console.log('\n📝 Detalhes por canal:');
            result.details.forEach((detail, index) => {
                console.log(`\n   Canal ${index + 1}:`);
                console.log(`   ├─ ID: ${detail.channelId}`);
                console.log(`   ├─ Plataforma: ${detail.platform}`);
                console.log(`   ├─ Sucesso: ${detail.success ? '✅ SIM' : '❌ NÃO'}`);
                if (detail.skipped) {
                    console.log(`   ├─ Pulado: ${detail.reason}`);
                }
                if (detail.error) {
                    console.log(`   └─ Erro: ${detail.error}`);
                }
            });
        }

        console.log('\n' + '='.repeat(80));

        if (result.sent > 0) {
            console.log('\n✅ SUCESSO! Cupom sem categoria foi publicado com bypass manual!');
            console.log('   O problema foi corrigido.');
        } else if (result.filtered === result.total) {
            console.log('\n❌ FALHA! Todos os canais foram filtrados.');
            console.log('   O bypass manual NÃO está funcionando corretamente.');
        } else {
            console.log('\n⚠️ PARCIAL: Alguns canais receberam, outros não.');
            console.log('   Verifique os detalhes acima.');
        }

    } catch (error) {
        console.error('\n❌ Erro durante teste:', error);
        logger.error('Erro no teste:', error);
    }
}

// Executar teste
testCouponWithoutCategory()
    .then(() => {
        console.log('\n✅ Teste concluído!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });

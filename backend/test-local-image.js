import NotificationDispatcher from './src/services/bots/notificationDispatcher.js';
import BotChannel from './src/models/BotChannel.js';

async function testImageFailure() {
    try {
        console.log('🧪 Testando falha de imagem (URL Local/Inválida)...');

        const channels = await BotChannel.findActive('whatsapp');
        if (!channels || channels.length === 0) return;

        // Simular o que acontece com CUPONS (logo local)
        const mockCoupon = {
            id: 'coupon-test-local',
            name: 'Cupom Desconto 20%',
            code: 'PROMO20',
            platform: 'shopee',
            image_url: 'C:\\Users\\RDL Tech Solutions\\Documents\\RDL\\Projetos\\MTW\\backend\\src\\assets\\logos\\shopee.png', // CAMINHO LOCAL
            category_id: null
        };

        console.log('--- 📤 Disparando CUPOM com logo LOCAL ---');
        const result = await NotificationDispatcher.dispatch('coupon_new', mockCoupon, { manual: true });

        console.log('\n--- RESULTADO ---');
        console.log(JSON.stringify(result, null, 2));

        if (result.success === false || result.failed > 0) {
            console.log('\n✅ CONFIRMADO: O despacho FALHOU porque o caminho da imagem é local/inválido e não houve fallback para texto.');
        } else {
            console.log('\n❌ Erro no teste: O despacho deveria ter falhado.');
        }

    } catch (error) {
        console.error('Erro:', error);
    }
}

testImageFailure();

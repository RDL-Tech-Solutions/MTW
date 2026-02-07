import notificationDispatcher from './src/services/bots/notificationDispatcher.js';
import dotenv from 'dotenv';
import logger from './src/config/logger.js';

dotenv.config();

// Mock Data
const mockPromotion = {
    id: 'test-promo-' + Date.now(),
    name: '🔥 Teste de Promoção WhatsApp Web',
    current_price: 199.90,
    old_price: 299.90,
    discount_percentage: 33,
    affiliate_link: 'https://www.amazon.com.br',
    platform: 'amazon',
    category_id: 1, // Assume categoria 1 existe
    image_url: 'https://m.media-amazon.com/images/I/61+U12sw3XL._AC_SL1000_.jpg' // Imagem real da Amazon
};

const mockCoupon = {
    id: 'test-coupon-' + Date.now(),
    code: 'TESTE10',
    discount_value: 10,
    discount_type: 'percentage',
    min_purchase: 100,
    platform: 'shopee',
    affiliate_link: 'https://shopee.com.br',
    valid_until: new Date(Date.now() + 86400000), // Amanhã
    is_general: true
};

async function testDispatch() {
    console.log('🚀 Iniciando teste de disparo WhatsApp Web...');

    try {
        // 0. Diagnóstico de Configuração
        const BotConfig = (await import('./src/models/BotConfig.js')).default;
        const BotChannel = (await import('./src/models/BotChannel.js')).default;

        const config = await BotConfig.get();
        console.log('\n🔧 Configuração Atual:');
        console.log(`- WhatsApp Web Habilitado (DB): ${config.whatsapp_web_enabled}`);
        console.log(`- WhatsApp Web Habilitado (ENV): ${process.env.WHATSAPP_WEB_ENABLED}`);

        const channels = await BotChannel.findActive('whatsapp_web');
        console.log(`\n📋 Canais WhatsApp Web Ativos: ${channels.length}`);
        channels.forEach(c => console.log(`  - ${c.name} (${c.identifier})`));

        if (channels.length === 0) {
            console.error('❌ Nenhum canal WhatsApp Web ativo encontrado. O teste falhará.');
            return;
        }

        // 1. Testar Promoção
        console.log('\n📦 Disparando Promoção...');
        const resultPromo = await notificationDispatcher.dispatch('promotion_new', mockPromotion, { manual: true });
        console.log('✅ Resultado Promoção:', JSON.stringify(resultPromo, null, 2));

        // 2. Testar Cupom
        console.log('\n🎟️ Disparando Cupom...');
        const resultCoupon = await notificationDispatcher.dispatch('coupon_new', mockCoupon, { manual: true });
        console.log('✅ Resultado Cupom:', JSON.stringify(resultCoupon, null, 2));

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        console.log('🏁 Teste finalizado.');
        process.exit(0);
    }
}

testDispatch();

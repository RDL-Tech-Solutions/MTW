import NotificationDispatcher from './src/services/bots/notificationDispatcher.js';
import BotChannel from './src/models/BotChannel.js';
import WhatsAppService from './src/services/bots/whatsappService.js';
import logger from './src/config/logger.js';

async function simulateRealPublication() {
    try {
        console.log('🧪 Simulando publicação real de produto no WhatsApp...');

        // 1. Pegar um canal WhatsApp ativo
        const channels = await BotChannel.findActive('whatsapp');
        if (!channels || channels.length === 0) {
            console.error('❌ Nenhum canal WhatsApp ativo encontrado para o teste.');
            return;
        }
        const channel = channels[0];
        console.log(`📡 Usando canal: ${channel.name} (${channel.identifier})`);

        // 2. Dados de um produto fictício, mas com estrutura real
        const mockProduct = {
            id: 'sim-prod-' + Date.now(),
            name: 'iPhone 15 Pro Max 256GB Titanium',
            current_price: 8500.00,
            old_price: 9999.00,
            discount_percentage: 15,
            platform: 'mercadolivre',
            affiliate_link: 'https://mercadolivre.com.br/test-prod',
            image_url: '//m.media-amazon.com/images/I/81+GI9S9+9L._AC_SL1500_.jpg', // Protocol-relative
            category_id: null // Para passar em todos os filtros básicos
        };

        // 3. Tentar disparar via Dispatcher (Isso testa o fluxo Completo)
        console.log('--- 📤 Disparando via NotificationDispatcher.dispatch() ---');
        const result = await NotificationDispatcher.dispatch('promotion_new', mockProduct, { manual: true });

        console.log('\n--- RESULTADO FINAL ---');
        console.log(JSON.stringify(result, null, 2));

        if (result.sent > 0) {
            console.log('\n✅ Dispatch reportou SUCESSO.');
            // Verificar se houve fallback no whatsappService
            // Como o whatsappService retorna success: true mesmo no fallback, precisamos ver se algo foi logado
        } else {
            console.log('\n❌ Dispatch reportou FALHA.');
        }

    } catch (error) {
        console.error('\n❌ Erro na simulação:', error);
    }
}

simulateRealPublication();

import BotConfig from './src/models/BotConfig.js';
import notificationDispatcher from './src/services/bots/notificationDispatcher.js';
import logger from './src/config/logger.js';

async function testDisableBug() {
    try {
        console.log('🧪 Iniciando teste de bloqueio global...');

        // 1. Buscar config atual
        const originalConfig = await BotConfig.get();
        console.log(`Config original - Telegram Enabled: ${originalConfig.telegram_enabled}`);

        // 2. Forçar desativação do Telegram para o teste
        console.log('--- 🛑 Desabilitando Telegram globalmente para teste ---');
        await BotConfig.updateField('telegram_enabled', false);

        // 3. Tentar disparar uma notificação via Dispatcher
        console.log('--- 📤 Tentando disparar notificação (Deve ser bloqueada) ---');
        const result = await notificationDispatcher.dispatch('promotion_new', {
            id: 'test-disable-bug',
            name: 'Produto Teste Bloqueio',
            platform: 'shopee',
            current_price: 100,
            image_url: 'https://placehold.co/600x400'
        });

        console.log('Resultado do Dispatch:', JSON.stringify(result, null, 2));

        if (result.success === false && result.message === 'Plataformas desabilitadas') {
            console.log('✅ SUCESSO: Notificação bloqueada corretamente pela flag global!');
        } else {
            console.log('❌ FALHA: Notificação passou ou retornou erro inesperado.');
        }

        // 4. Restaurar config original (se era true)
        if (originalConfig.telegram_enabled) {
            console.log('--- 🔄 Restaurando configuração original ---');
            await BotConfig.updateField('telegram_enabled', true);
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testDisableBug();

import axios from 'axios';
import BotConfig from './src/models/BotConfig.js';

async function diagnostic() {
    try {
        const config = await BotConfig.get();
        const testNumber = '5571999541560';

        console.log('--- DIAGNÓSTICO WHATSAPP ---');
        console.log(`URL: ${config.whatsapp_api_url}`);
        console.log(`Phone ID: ${config.whatsapp_phone_number_id}`);

        const headers = {
            'Authorization': `Bearer ${config.whatsapp_api_token}`,
            'Content-Type': 'application/json'
        };

        // TESTE 1: MENSAGEM DE TEXTO (Precisa de janela de 24h aberta)
        console.log('\n🧪 Teste 1: Mensagem de Texto Simples...');
        try {
            const resText = await axios.post(
                `${config.whatsapp_api_url}/${config.whatsapp_phone_number_id}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: testNumber,
                    type: 'text',
                    text: { body: '🤖 Teste de diagnóstico (Texto)' }
                },
                { headers }
            );
            console.log('✅ Teste 1 SUCESSO!');
        } catch (err) {
            console.log('❌ Teste 1 FALHOU');
            console.log(`   Erro: ${err.response?.data?.error?.message || err.message}`);
            console.log(`   Código: ${err.response?.data?.error?.code}`);
        }

        // TESTE 2: TEMPLATE HELLO WORLD
        console.log('\n🧪 Teste 2: Template hello_world...');
        try {
            const resTemp = await axios.post(
                `${config.whatsapp_api_url}/${config.whatsapp_phone_number_id}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: testNumber,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: 'en_US' }
                    }
                },
                { headers }
            );
            console.log('✅ Teste 2 SUCESSO!');
        } catch (err) {
            console.log('❌ Teste 2 FALHOU');
            console.log(`   Erro: ${err.response?.data?.error?.message || err.message}`);
            console.log(`   Código: ${err.response?.data?.error?.code}`);
        }

        console.log('\n----------------------------');
    } catch (error) {
        console.error('Erro fatal no diagnóstico:', error.message);
    }
}

diagnostic();

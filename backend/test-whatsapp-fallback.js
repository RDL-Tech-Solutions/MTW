import axios from 'axios';
import BotConfig from './src/models/BotConfig.js';

async function testFallback() {
    try {
        const config = await BotConfig.get();
        const testNumber = '5571999541560';
        const headers = {
            'Authorization': `Bearer ${config.whatsapp_api_token}`,
            'Content-Type': 'application/json'
        };

        console.log('🧪 Iniciando teste de Robustez...');

        try {
            console.log('📤 Tentando Mensagem de Texto (Normalmente falha sem janela)...');
            await axios.post(
                `${config.whatsapp_api_url}/${config.whatsapp_phone_number_id}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: testNumber,
                    type: 'text',
                    text: { body: '🤖 Teste de Robustez (Texto)' }
                },
                { headers }
            );
            console.log('✅ Mensagem de texto enviada (Janela aberta!).');
        } catch (error) {
            const fbError = error.response?.data?.error;
            console.log(`❌ Erro detectado: (${fbError?.code}) ${fbError?.message}`);

            if (fbError?.code === 131055 || fbError?.message?.includes('outside the allowed window')) {
                console.log('🔄 Janela fechada. Tentando Fallback para Template hello_world...');
                try {
                    await axios.post(
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
                    console.log('✅ Fallback SUCESSO! Template hello_world enviado.');
                } catch (tempError) {
                    const tempFbError = tempError.response?.data?.error;
                    console.log(`❌ Fallback FALHOU: (${tempFbError?.code}) ${tempFbError?.message}`);
                }
            }
        }
    } catch (err) {
        console.error('Erro fatal:', err.message);
    }
}

testFallback();

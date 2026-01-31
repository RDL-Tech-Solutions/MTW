import axios from 'axios';
import BotChannel from './src/models/BotChannel.js';
import BotConfig from './src/models/BotConfig.js';

async function simulateControllerTest() {
    try {
        const channels = await BotChannel.findAll({ platform: 'whatsapp' });

        if (!channels || channels.length === 0) {
            console.log('❌ Nenhum canal WhatsApp encontrado no banco!');
            return;
        }

        const channel = channels[0];
        const config = await BotConfig.get();
        const whatsappConfig = {
            apiUrl: config.whatsapp_api_url,
            apiToken: config.whatsapp_api_token,
            phoneNumberId: config.whatsapp_phone_number_id
        };

        console.log('--- SIMULANDO CONTROLLER (DINÂMICO) ---');
        console.log(`Identifier do Canal: ${channel.identifier}`);
        console.log(`Phone Number ID: ${whatsappConfig.phoneNumberId}`);

        const message = `🤖 *Teste de Bot WhatsApp*\n\n✅ Bot configurado e funcionando!\n⏰ ${new Date().toLocaleString('pt-BR')}\n🆔 Canal: ${channel.name}`;

        try {
            const response = await axios.post(
                `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: channel.identifier,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${whatsappConfig.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log('✅ SUCESSO na simulação!');
            console.log('Message ID:', response.data.messages?.[0]?.id);
        } catch (error) {
            console.log('❌ FALHA na simulação!');
            console.log('Erro:', error.response?.data?.error?.message || error.message);
            console.log('Código:', error.response?.data?.error?.code);
        }
    } catch (error) {
        console.error('Erro fatal:', error.message);
    }
}

simulateControllerTest();

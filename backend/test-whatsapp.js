import axios from 'axios';

async function testWhatsApp() {
    try {
        console.log('🧪 Testando WhatsApp Business API...\n');

        const response = await axios.post(
            'https://graph.facebook.com/v22.0/959275473928854/messages',
            {
                messaging_product: 'whatsapp',
                to: '5571999541560',
                type: 'template',
                template: {
                    name: 'hello_world',
                    language: {
                        code: 'en_US'
                    }
                }
            },
            {
                headers: {
                    'Authorization': 'Bearer EAAfZC8XhekGsBQcJi4KsBlVvBkjr53PmZAwEUf17xwV2AC4hZCRs91a6dgkGzxpN2LgbbFIcEYwolSdgaIDcGeCsBxsrP9fXkpHiZA8cytGNLAAanMQpXtCD4uzRtwoZAkl07XZAMOA7Dup7ZArm9fq0E0iyssGPVuZC6jyitPhJz75d9yKKtV9QJnup8ZAh192hqpBHQZAnrZCDMXIPfbZBeISeUcYi4YvVZCY61eDSB0tKs2PThAFNi9lVrHOg7j5NHUF3ki8L3NDZCdTUfO6q4HRCmdLHENNQZDZD',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ SUCESSO! Mensagem enviada!');
        console.log('\n📨 Resposta da API:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n💬 Verifique o WhatsApp do número 5571999541560');
        console.log('\n🎯 Message ID:', response.data.messages?.[0]?.id);

    } catch (error) {
        console.error('❌ ERRO ao enviar mensagem:');
        console.error('Status:', error.response?.status);
        console.error('Mensagem:', error.response?.data?.error?.message || error.message);
        console.error('\n📋 Detalhes completos:', JSON.stringify(error.response?.data, null, 2));

        // Diagnósticos adicionais
        if (error.response?.status === 401) {
            console.error('\n⚠️ Token inválido ou expirado. Gere um novo no Meta Dashboard.');
        } else if (error.response?.status === 403) {
            console.error('\n⚠️ Acesso negado. Verifique Phone Number ID e permissões.');
        } else if (error.response?.data?.error?.code === 131047) {
            console.error('\n⚠️ Número não registrado. Adicione em "Para" no Meta Dashboard.');
        }
    }
}

testWhatsApp();

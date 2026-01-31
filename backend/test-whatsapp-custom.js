import axios from 'axios';

// ✅ CONFIGURAÇÕES FORNECIDAS PELO USUÁRIO
const CONFIG = {
    apiUrl: 'https://graph.facebook.com/v22.0',
    phoneNumberId: '895149630357817',
    apiToken: 'EAAMm3AW5otcBQm8syJHykoo2ZARdZC5T6ZB16fzkmmWmziw026Q6qkHsBAN8IkcPK6CUfHZARaa0T3ctjZACZBxQilUZCKu8QUvbofzr0DmaVp28V2dkbWsLiVXjN22rBsOu3wFSZBnwSqY6W4NqHNLD9L0yq2sUsKqBUMmapbTCddfqPoLQVCMkAWVzZBh7Q5K7ILFVCpGDxTF9qHqgQnB2KrZCByCf8jneLaAr8vvGMjfGvL0TibfnrY0Feqa1DATYo6LaeJA3AfEknVTFtkWjSBB96c',
    testNumber: '5571999541560' // Com código do país (55)
};

async function testWhatsAppConnection() {
    try {
        console.log('🧪 TESTANDO WHATSAPP BUSINESS API\n');
        console.log('📋 Configuração:');
        console.log(`   API URL: ${CONFIG.apiUrl}`);
        console.log(`   Phone Number ID: ${CONFIG.phoneNumberId}`);
        console.log(`   Número de teste: ${CONFIG.testNumber}`);
        console.log(`   Token: ${CONFIG.apiToken.substring(0, 20)}...`);
        console.log('\n⏳ Enviando mensagem de teste...\n');

        const response = await axios.post(
            `${CONFIG.apiUrl}/${CONFIG.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: CONFIG.testNumber,
                type: 'template',
                template: {
                    name: 'hello_world', // Template padrão aprovado pela Meta
                    language: {
                        code: 'en_US'
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${CONFIG.apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log('✅ ================ SUCESSO! ================');
        console.log('✅ Mensagem enviada com sucesso!\n');
        console.log('📨 Resposta da API:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\n🎯 Message ID:', response.data.messages?.[0]?.id);
        console.log('\n💬 VERIFIQUE O WHATSAPP DO NÚMERO:', CONFIG.testNumber);
        console.log('   Você deve receber uma mensagem "Hello World"\n');
        console.log('✅ ============================================\n');

    } catch (error) {
        console.error('❌ ================ ERRO ================');
        console.error('❌ Falha ao enviar mensagem\n');
        console.error('📋 Detalhes do erro:');
        console.error('   Status HTTP:', error.response?.status || 'N/A');
        console.error('   Mensagem:', error.response?.data?.error?.message || error.message);

        if (error.response?.data) {
            console.error('\n📄 Resposta completa da API:');
            console.error(JSON.stringify(error.response.data, null, 2));
        }

        console.error('\n🔍 DIAGNÓSTICO:');

        if (error.response?.status === 401) {
            console.error('   ⚠️ ERRO 401: Token inválido ou expirado');
            console.error('   Solução: Gere um novo token no Meta for Developers');
            console.error('   URL: https://developers.facebook.com/apps/');
        }
        else if (error.response?.status === 403) {
            console.error('   ⚠️ ERRO 403: Acesso negado');
            console.error('   Solução: Verifique o Phone Number ID');
            console.error('   Certifique-se de ter permissões corretas');
        }
        else if (error.response?.data?.error?.code === 131047) {
            console.error('   ⚠️ ERRO 131047: Número não registrado');
            console.error('   Solução: Adicione o número em "Meta Dashboard → WhatsApp → Para"');
            console.error('   Número a adicionar: ' + CONFIG.testNumber);
        }
        else if (error.response?.data?.error?.code === 131026) {
            console.error('   ⚠️ ERRO 131026: Formato de número inválido');
            console.error('   Formato correto: 5571999999999 (país + DDD + número)');
            console.error('   Seu número: ' + CONFIG.testNumber);
        }
        else if (error.response?.data?.error?.code === 100) {
            console.error('   ⚠️ ERRO 100: Parâmetro inválido');
            console.error('   Verifique Phone Number ID e formato da mensagem');
        }
        else if (error.code === 'ECONNABORTED') {
            console.error('   ⚠️ Timeout na requisição');
            console.error('   Verifique sua conexão com a internet');
        }
        else {
            console.error('   ⚠️ Erro desconhecido');
            console.error('   Verifique todas as credenciais');
        }

        console.error('\n❌ ========================================\n');
        process.exit(1);
    }
}

// Executar teste
testWhatsAppConnection();

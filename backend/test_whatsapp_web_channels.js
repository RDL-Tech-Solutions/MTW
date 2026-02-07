import fetch from 'node-fetch';

// IDs obtidos do banco de dados (plataforma 'whatsapp_web')
const CHANNELS = [
    { id: '88650c0f-c533-4a62-8d36-993b133a6fa2', name: 'Canal d (Newsletter)' },
    { id: 'd813463e-f9ad-472c-aaa2-f893039b0512', name: 'Canal fre (Newsletter)' }
];

const API_URL = 'http://localhost:3000/api/bots/test';

async function testChannels() {
    console.log('🚀 Iniciando teste de entrega para canais WhatsApp Web...');

    for (const channel of CHANNELS) {
        console.log(`\n📤 Testando canal: ${channel.name} (ID: ${channel.id})...`);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: channel.id,
                    message: `🤖 *Teste Automático*\n\n✅ Verificando entrega no canal ${channel.name}.\n⏰ ${new Date().toLocaleString('pt-BR')}`
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCESSO! Resposta do servidor:`, JSON.stringify(data, null, 2));
            } else {
                const text = await response.text();
                console.error(`❌ FALHA! Status: ${response.status}. Erro: ${text}`);
            }
        } catch (error) {
            console.error(`❌ ERRO DE CONEXÃO: ${error.message}`);
            console.log('⚠️ Certifique-se de que o servidor backend está rodando (npm run dev)!');
        }
    }
}

testChannels();

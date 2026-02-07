import fetch from 'node-fetch';

const CHANNEL_ID = '88650c0f-c533-4a62-8d36-993b133a6fa2'; // Canal "d" do dump
const API_URL = 'http://localhost:3000/api/bots/test';

async function testApi() {
    console.log(`🚀 Enviando teste para canal ${CHANNEL_ID}...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channelId: CHANNEL_ID,
                message: "🤖 Teste de Debug via API - Verificando Newsletter"
            })
        });

        const data = await response.json();
        console.log('📡 Status:', response.status);
        console.log('📦 Resposta:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
    }
}

testApi();

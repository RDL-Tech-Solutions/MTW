import fetch from 'node-fetch';
import path from 'path';

async function testImage() {
    // ID da Newsletter identificado nos logs anteriores
    const channelIdentifier = '120363405400556600@newsletter';
    // Caminho local absoluto para teste
    const localImagePath = 'c:\\Users\\RDL Tech Solutions\\Documents\\RDL\\Projetos\\MTW\\backend\\src\\assets\\logos\\shopee.png';

    console.log(`🚀 Testando envio de IMAGEM LOCAL para: ${channelIdentifier}`);
    console.log(`📁 Path: ${localImagePath}`);

    try {
        const response = await fetch('http://localhost:3000/api/bots/test-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channelId: channelIdentifier,
                imageUrl: localImagePath, // Enviando PATH local para API (simulando comportamento do Dispatcher)
                caption: '🤖 Teste de Imagem LOCAL (Shopee Logo)'
            })
        });

        const data = await response.json();
        console.log('📡 Status:', response.status);
        console.log('📦 Resposta:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
    }
}

testImage();

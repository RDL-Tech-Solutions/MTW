import whatsappService from './src/services/bots/whatsappService.js';
import axios from 'axios';
import sharp from 'sharp';
import logger from './src/config/logger.js';

const TEST_NUMBER = '5571999541560';
const DELAY_BETWEEN_TESTS = 3000; // 3 segundos entre cada teste

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testImageSending() {
    console.log('🧪 TESTE ABRANGENTE DE ENVIO DE IMAGENS WHATSAPP\n');
    console.log('='.repeat(60));
    console.log(`Número de teste: ${TEST_NUMBER}`);
    console.log('='.repeat(60) + '\n');

    const results = [];

    // TESTE 1: Imagem JPEG pública simples
    console.log('📤 TESTE 1: JPEG público simples (Picsum)');
    try {
        const url = 'https://picsum.photos/800/600.jpg';
        console.log(`   URL: ${url}`);
        const result = await whatsappService.sendImage(TEST_NUMBER, url, '');
        console.log(`   ✅ Sucesso - Message ID: ${result.messageId}\n`);
        results.push({ test: 'JPEG Picsum', success: true, messageId: result.messageId });
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'JPEG Picsum', success: false, error: error.message });
    }
    await sleep(DELAY_BETWEEN_TESTS);

    // TESTE 2: PNG público (Logo Google)
    console.log('📤 TESTE 2: PNG público (Google Logo)');
    try {
        const url = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
        console.log(`   URL: ${url}`);
        const result = await whatsappService.sendImage(TEST_NUMBER, url, '');
        console.log(`   ✅ Sucesso - Message ID: ${result.messageId}\n`);
        results.push({ test: 'PNG Google', success: true, messageId: result.messageId });
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'PNG Google', success: false, error: error.message });
    }
    await sleep(DELAY_BETWEEN_TESTS);

    // TESTE 3: WebP do Mercado Livre (DIRETO)
    console.log('📤 TESTE 3: WebP do Mercado Livre (DIRETO)');
    try {
        const url = 'https://http2.mlstatic.com/D_Q_NP_2X_650792-MLA102889792863_122025-E.webp';
        console.log(`   URL: ${url}`);
        const result = await whatsappService.sendImage(TEST_NUMBER, url, '');
        console.log(`   ✅ Sucesso - Message ID: ${result.messageId}\n`);
        results.push({ test: 'WebP ML Direto', success: true, messageId: result.messageId });
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'WebP ML Direto', success: false, error: error.message });
    }
    await sleep(DELAY_BETWEEN_TESTS);

    // TESTE 4: WebP convertido para JPEG
    console.log('📤 TESTE 4: WebP do ML convertido para JPEG');
    try {
        const webpUrl = 'https://http2.mlstatic.com/D_Q_NP_2X_650792-MLA102889792863_122025-E.webp';
        console.log(`   1. Baixando WebP...`);
        const response = await axios.get(webpUrl, { responseType: 'arraybuffer' });
        console.log(`   2. Convertendo para JPEG...`);
        const jpegBuffer = await sharp(response.data).jpeg({ quality: 90 }).toBuffer();
        console.log(`   3. Salvando temporariamente...`);

        const fs = await import('fs');
        const tempPath = './temp-converted.jpg';
        fs.writeFileSync(tempPath, jpegBuffer);

        console.log(`   4. Enviando JPEG convertida...`);
        // Nota: WhatsApp API precisa de URL pública, não arquivo local
        // Vamos usar base64 inline (se suportado) ou pular este teste
        console.log(`   ⚠️ Pulando - WhatsApp API requer URL pública, não arquivo local\n`);
        results.push({ test: 'WebP ML Convertido', success: false, error: 'Requer URL pública' });

        fs.unlinkSync(tempPath);
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'WebP ML Convertido', success: false, error: error.message });
    }
    await sleep(DELAY_BETWEEN_TESTS);

    // TESTE 5: Imagem com caption
    console.log('📤 TESTE 5: JPEG com caption');
    try {
        const url = 'https://picsum.photos/800/600.jpg';
        const caption = '🔥 Teste de caption com formatação *negrito* e ~riscado~';
        console.log(`   URL: ${url}`);
        console.log(`   Caption: ${caption}`);
        const result = await whatsappService.sendImage(TEST_NUMBER, url, caption);
        console.log(`   ✅ Sucesso - Message ID: ${result.messageId}\n`);
        results.push({ test: 'JPEG com Caption', success: true, messageId: result.messageId });
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'JPEG com Caption', success: false, error: error.message });
    }
    await sleep(DELAY_BETWEEN_TESTS);

    // TESTE 6: Método sendMessageWithImage (imagem + texto separados)
    console.log('📤 TESTE 6: sendMessageWithImage (imagem SEM caption + texto separado)');
    try {
        const url = 'https://picsum.photos/800/600.jpg';
        const message = '🔥 *TESTE DE MENSAGEM SEPARADA*\n\nEsta mensagem foi enviada APÓS a imagem.\n\n✅ Se você viu a imagem primeiro e depois esta mensagem, funcionou!';
        console.log(`   URL: ${url}`);
        console.log(`   Mensagem: ${message.substring(0, 50)}...`);
        const result = await whatsappService.sendMessageWithImage(TEST_NUMBER, url, message);
        console.log(`   ✅ Sucesso - Image ID: ${result.imageMessageId}, Text ID: ${result.textMessageId}\n`);
        results.push({ test: 'sendMessageWithImage', success: true, imageId: result.imageMessageId, textId: result.textMessageId });
    } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
        results.push({ test: 'sendMessageWithImage', success: false, error: error.message });
    }

    // RESUMO DOS RESULTADOS
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60) + '\n');

    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} Teste ${index + 1}: ${result.test}`);
        if (result.success) {
            if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
            if (result.imageId) console.log(`   Image ID: ${result.imageId}, Text ID: ${result.textId}`);
        } else {
            console.log(`   Erro: ${result.error}`);
        }
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`\n📈 Taxa de sucesso: ${successCount}/${totalCount} (${Math.round(successCount / totalCount * 100)}%)\n`);

    console.log('='.repeat(60));
    console.log('📱 VERIFIQUE SEU WHATSAPP AGORA!');
    console.log('='.repeat(60));
    console.log('\nVocê deve ter recebido:');
    console.log('1. Uma foto aleatória colorida (JPEG Picsum)');
    console.log('2. Logo do Google (PNG)');
    console.log('3. Foto de notebook (WebP Mercado Livre)');
    console.log('4. Foto aleatória COM legenda formatada');
    console.log('5. Foto aleatória SEM legenda + mensagem de texto separada');
    console.log('\n⚠️ Se você NÃO recebeu NENHUMA imagem:');
    console.log('   → Problema com permissões da conta Meta/WhatsApp Business API');
    console.log('\n⚠️ Se você recebeu algumas mas NÃO a do Mercado Livre (teste 3):');
    console.log('   → Problema específico com formato WebP do Mercado Livre');
    console.log('   → Solução: Implementar conversão automática WebP → JPEG');
}

testImageSending().catch(error => {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error.stack);
});

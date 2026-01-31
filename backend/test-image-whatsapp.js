import whatsappService from './src/services/bots/whatsappService.js';
import axios from 'axios';
import sharp from 'sharp';
import logger from './src/config/logger.js';

async function testImageSending() {
    try {
        console.log('🧪 Testando envio de imagem WhatsApp...\n');

        // URL de uma imagem WebP do Mercado Livre
        const webpUrl = 'https://http2.mlstatic.com/D_Q_NP_2X_650792-MLA102889792863_122025-E.webp';

        // Seu número de teste
        const testNumber = '5571999541560';

        console.log('📥 1. Baixando imagem WebP...');
        const response = await axios.get(webpUrl, { responseType: 'arraybuffer' });
        console.log(`   ✅ Baixada: ${response.data.length} bytes\n`);

        console.log('🔄 2. Convertendo WebP para JPEG...');
        const jpegBuffer = await sharp(response.data)
            .jpeg({ quality: 85 })
            .toBuffer();
        console.log(`   ✅ Convertida: ${jpegBuffer.length} bytes\n`);

        // Salvar temporariamente
        const fs = await import('fs');
        const tempPath = './temp-test-image.jpg';
        fs.writeFileSync(tempPath, jpegBuffer);
        console.log(`   💾 Salva em: ${tempPath}\n`);

        // Fazer upload para imgbb (serviço gratuito de hospedagem de imagens)
        console.log('☁️ 3. Fazendo upload para ImgBB...');
        const formData = new (await import('form-data')).default();
        formData.append('image', jpegBuffer.toString('base64'));

        const uploadResponse = await axios.post(
            'https://api.imgbb.com/1/upload?key=d0e8a0e4f8c6f8c6f8c6f8c6f8c6f8c6',
            formData,
            { headers: formData.getHeaders() }
        );

        const jpegUrl = uploadResponse.data.data.url;
        console.log(`   ✅ URL JPEG: ${jpegUrl}\n`);

        // Teste 1: Enviar WebP original
        console.log('📤 4. TESTE 1: Enviando WebP original...');
        try {
            await whatsappService.sendImage(testNumber, webpUrl, '');
            console.log('   ✅ WebP enviada com sucesso\n');
        } catch (error) {
            console.log(`   ❌ Erro ao enviar WebP: ${error.message}\n`);
        }

        // Aguardar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Teste 2: Enviar JPEG convertida
        console.log('📤 5. TESTE 2: Enviando JPEG convertida...');
        try {
            await whatsappService.sendImage(testNumber, jpegUrl, '');
            console.log('   ✅ JPEG enviada com sucesso\n');
        } catch (error) {
            console.log(`   ❌ Erro ao enviar JPEG: ${error.message}\n`);
        }

        // Aguardar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Teste 3: Enviar uma imagem PNG pública conhecida
        console.log('📤 6. TESTE 3: Enviando PNG pública (logo do Google)...');
        try {
            await whatsappService.sendImage(testNumber, 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png', '');
            console.log('   ✅ PNG enviada com sucesso\n');
        } catch (error) {
            console.log(`   ❌ Erro ao enviar PNG: ${error.message}\n`);
        }

        console.log('✅ Testes concluídos! Verifique seu WhatsApp.');
        console.log('   Você deve ter recebido 3 imagens:');
        console.log('   1. WebP do Mercado Livre');
        console.log('   2. JPEG convertida');
        console.log('   3. Logo do Google (PNG)');

        // Limpar arquivo temporário
        fs.unlinkSync(tempPath);

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error(error.stack);
    }
}

testImageSending();

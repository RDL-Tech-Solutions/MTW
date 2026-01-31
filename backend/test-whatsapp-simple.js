/**
 * Teste simples de envio de imagem WhatsApp
 * Usa o serviço existente para testar
 */

import whatsappService from './src/services/bots/whatsappService.js';
import logger from './src/config/logger.js';

async function testWhatsAppImage() {
    try {
        console.log('\n🧪 TESTE DE ENVIO DE IMAGEM WHATSAPP\n');
        console.log('='.repeat(70));

        // Carregar configurações
        await whatsappService.loadConfig();

        // Número de teste (primeiro canal ativo)
        const testNumber = '5571999541560'; // Ajuste se necessário

        // Imagem de teste (WebP do Mercado Livre)
        const testImageUrl = 'https://http2.mlstatic.com/D_Q_NP_2X_913663-MLA99951896463_112025-E.webp';

        // Mensagem de teste
        const testMessage = '🧪 *TESTE DE IMAGEM*\n\nSe você recebeu a imagem acima, está funcionando! ✅';

        console.log(`\n📱 Número de destino: ${testNumber}`);
        console.log(`📸 URL da imagem: ${testImageUrl.substring(0, 60)}...`);
        console.log(`📝 Mensagem: ${testMessage.substring(0, 50)}...\n`);

        console.log('⏳ Enviando imagem + mensagem...\n');

        // Usar o método sendMessageWithImage
        const result = await whatsappService.sendMessageWithImage(
            testNumber,
            testImageUrl,
            testMessage
        );

        console.log('\n' + '='.repeat(70));
        console.log('\n✅ RESULTADO DO TESTE:\n');
        console.log(JSON.stringify(result, null, 2));

        console.log('\n' + '='.repeat(70));
        console.log('\n📱 VERIFIQUE SEU WHATSAPP AGORA!\n');
        console.log('Você deve ter recebido:');
        console.log('  1. ✅ UMA IMAGEM (relógio Casio)');
        console.log('  2. ✅ UMA MENSAGEM DE TEXTO\n');
        console.log('Se recebeu ambos: ✅ Sistema funcionando!');
        console.log('Se NÃO recebeu a imagem: ❌ Problema identificado!\n');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:');
        console.error(`   ${error.message}`);
        console.error(`\n   Stack: ${error.stack}`);
    }
}

// Executar
testWhatsAppImage();

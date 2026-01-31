import whatsappService from './src/services/bots/whatsappService.js';
import logger from './src/config/logger.js';

async function testSimpleImage() {
    try {
        console.log('🧪 Teste SIMPLES de envio de imagem\n');

        const testNumber = '5571999541560';

        // Testar com uma imagem PNG simples e pública
        const publicImageUrl = 'https://picsum.photos/800/600.jpg';

        console.log(`📤 Enviando imagem pública para ${testNumber}...`);
        console.log(`   URL: ${publicImageUrl}\n`);

        const result = await whatsappService.sendImage(testNumber, publicImageUrl, 'Teste de imagem');

        console.log('\n✅ Resultado:');
        console.log(JSON.stringify(result, null, 2));

        console.log('\n📱 Verifique seu WhatsApp agora!');
        console.log('   Se você NÃO recebeu a imagem, o problema é:');
        console.log('   1. Permissões da Meta API');
        console.log('   2. Número não verificado');
        console.log('   3. Limite de mensagens atingido');

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        if (error.response) {
            console.error('\n📋 Resposta da API:');
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSimpleImage();

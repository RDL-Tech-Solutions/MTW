import linkAnalyzer from '../src/services/linkAnalyzer.js';
import logger from '../src/config/logger.js';

const url = 'https://mercadolivre.com/sec/2zJEfh3';

async function testMeliProduct() {
    console.log('🔍 TESTE DE EXTRAÇÃO - MERCADO LIVRE\n');
    console.log('URL:', url);
    console.log('─'.repeat(60));

    try {
        const result = await linkAnalyzer.analyzeLink(url);

        console.log('\n📊 RESULTADO DA EXTRAÇÃO:\n');
        console.log('Nome:', result.name || 'N/A');
        console.log('Preço Atual:', result.currentPrice ? `R$ ${result.currentPrice}` : 'N/A');
        console.log('Preço Original:', result.oldPrice ? `R$ ${result.oldPrice}` : 'N/A');

        if (result.oldPrice && result.currentPrice) {
            const discount = ((result.oldPrice - result.currentPrice) / result.oldPrice * 100).toFixed(0);
            console.log('Desconto:', discount + '%');
        }

        console.log('Imagem:', result.imageUrl ? '✅ OK' : '❌ Ausente');
        console.log('Link:', result.affiliateLink?.substring(0, 50) + '...');

        if (result.error) {
            console.log('\n❌ ERRO:', result.error);
        }

        console.log('\n─'.repeat(60));
        console.log('VALIDAÇÃO:');

        // Valores esperados baseados na imagem do usuário
        const expectedOriginal = 214;
        const expectedCurrent = 105.90;

        const originalOK = result.oldPrice && Math.abs(result.oldPrice - expectedOriginal) < 5;
        const currentOK = result.currentPrice && Math.abs(result.currentPrice - expectedCurrent) < 5;

        console.log('Preço Original:', originalOK ? '✅ CORRETO' : `❌ INCORRETO (esperado: R$ ${expectedOriginal})`);
        console.log('Preço Atual:', currentOK ? '✅ CORRETO' : `❌ INCORRETO (esperado: R$ ${expectedCurrent})`);

        if (originalOK && currentOK) {
            console.log('\n🎉 TESTE PASSOU! Preços extraídos corretamente!');
        } else {
            console.log('\n⚠️ TESTE FALHOU! Preços incorretos.');
            console.log('\nDados completos do resultado:');
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:', error.message);
        console.error(error.stack);
    }
}

testMeliProduct();

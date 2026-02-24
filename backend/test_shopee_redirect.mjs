import LinkAnalyzer from './src/services/linkAnalyzer.js';

const url = 'https://s.shopee.com.br/5AnHTGdLFq';

console.log('=== Testando Redirecionamento da Shopee ===');
console.log('URL de entrada:', url);

async function testRedirect() {
    try {
        const finalUrl = await LinkAnalyzer.followRedirects(url, 5);
        console.log('\n=== RESULTADO ===');
        console.log('URL Final:', finalUrl);

        const ids = await LinkAnalyzer.extractShopeeIds(finalUrl);
        console.log('IDs Extraídos:', ids);

        if (ids && ids.itemId) {
            console.log('✅ IDs da Shopee foram identificados corretamente após os redirecionamentos.');
        } else {
            console.log('❌ Falha ao identificar IDs da Shopee após redirecionamentos.');
        }
    } catch (e) {
        console.error('ERRO:', e.message);
    }
}

testRedirect();

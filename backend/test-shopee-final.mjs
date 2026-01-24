
import analyzer from './src/services/linkAnalyzer.js';

async function test() {
    const url = 'https://s.shopee.com.br/2B8secvRH2';

    console.log(`🔍 Analisando link: ${url}`);

    try {
        const result = await analyzer.analyzeLink(url);
        console.log('✅ Resultado:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

test();

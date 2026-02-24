// Test real linkAnalyzer with the Shopee short link
import LinkAnalyzer from './src/services/linkAnalyzer.js';

const url = 'https://s.shopee.com.br/5AnHTGdLFq';
console.log('=== Testando LinkAnalyzer.analyzeLink() ===');
console.log('URL:', url, '\n');

try {
    const result = await LinkAnalyzer.analyzeLink(url);
    console.log('\n=== RESULTADO FINAL ===');
    console.log('Nome:', result?.name);
    console.log('Preco Atual:', result?.currentPrice);
    console.log('Preco Original:', result?.oldPrice);
    console.log('Plataforma:', result?.platform);
    console.log('Imagem URL:', result?.imageUrl ? 'SIM - ' + result.imageUrl.substring(0, 60) : 'NAO');
    console.log('Affiliate Link:', result?.affiliateLink ? result.affiliateLink.substring(0, 80) : 'NAO');
    console.log('Erro:', result?.error || 'Nenhum');
} catch (e) {
    console.error('ERRO CRITICO:', e.message);
    console.error(e.stack?.substring(0, 300));
}

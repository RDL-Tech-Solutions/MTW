/**
 * Teste rápido do scrapeSearchPagePuppeteer
 * Uso: node scripts/test_meli_puppeteer.js
 */
import dotenv from 'dotenv';
dotenv.config();

import meliSync from '../src/services/autoSync/meliSync.js';
import browserPool from '../src/utils/browserPool.js';

console.log('\n🧪 Testando scrapeSearchPagePuppeteer("smart tv")...\n');

try {
    const products = await meliSync.scrapeSearchPagePuppeteer('smart tv');

    console.log(`\n📊 Total: ${products.length} produtos\n`);

    // Mostrar 3 primeiros
    for (const p of products.slice(0, 3)) {
        console.log(`  📦 ${p.title}`);
        console.log(`     💰 R$ ${p.price} ${p.original_price ? `(de R$ ${p.original_price})` : ''}`);
        console.log(`     🖼️  ${p.thumbnail ? 'Com imagem' : 'Sem imagem'}`);
        console.log(`     🔗 ${p.permalink?.substring(0, 80)}...`);
        console.log('');
    }

} catch (error) {
    console.error(`❌ Erro: ${error.message}`);
} finally {
    await browserPool.closeAll();
    process.exit(0);
}

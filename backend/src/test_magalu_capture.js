
import LinkAnalyzer from './services/linkAnalyzer.js';

async function test() {
    console.log("🚀 Iniciando teste de captura Magalu com link encurtado...");
    const url = "https://divulgador.magalu.com/NIyHLrpP";

    try {
        console.log(`📡 Analisando link: ${url}`);
        const result = await LinkAnalyzer.analyzeLink(url);

        console.log("\n📊 Resultado da Análise:");
        console.log(JSON.stringify(result, null, 2));

        if (result.platform === 'magazineluiza' && !result.error && result.name) {
            console.log("\n✅ SUCESSO: Produto Magalu identificado e capturado!");
            console.log(`📦 Produto: ${result.name}`);
            console.log(`💰 Preço: R$ ${result.currentPrice}`);
            console.log(`🔗 Link Afiliado Preservado: ${result.affiliateLink}`);
            const fs = await import('fs');
            fs.writeFileSync('name_only.txt', `Name: ${result.name}`);
        } else {
            console.log("\n❌ FALHA: Produto não capturado corretamente.");
        }

    } catch (error) {
        console.error("\n❌ Erro durante o teste:", error);
    }
}

test();

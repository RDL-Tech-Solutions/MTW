
import LinkAnalyzer from './services/linkAnalyzer.js';

// Setup basic logger mock if needed, or rely on console
// If LinkAnalyzer imports a logger, we might need to handle it.
// Assuming LinkAnalyzer works with standard imports.

async function test() {
    console.log("🚀 Iniciando teste de captura Kabum com link encurtado...");
    const url = "https://tidd.ly/4kjGiwV";

    try {
        console.log(`📡 Analisando link: ${url}`);
        const result = await LinkAnalyzer.analyzeLink(url);

        console.log("\n📊 Resultado da Análise:");
        console.log(JSON.stringify(result, null, 2));

        if (result.platform === 'kabum' && !result.error && result.name) {
            console.log("\n✅ SUCESSO: Produto Kabum identificado e capturado!");
            console.log(`📦 Produto: ${result.name}`);
            console.log(`💰 Preço: R$ ${result.currentPrice}`);
            console.log(`🔗 Link Afiliado Preservado: ${result.affiliateLink}`);
        } else {
            console.log("\n❌ FALHA: Produto não capturado corretamente.");
        }

    } catch (error) {
        console.error("\n❌ Erro durante o teste:", error);
    }
}

test();

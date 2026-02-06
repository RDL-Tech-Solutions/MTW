
import LinkAnalyzer from './services/linkAnalyzer.js';

async function test() {
    console.log("🚀 Iniciando teste de captura KaBuM!...");
    // Link de exemplo da KaBuM
    const url = "https://www.kabum.com.br/produto/472665/monitor-gamer-acer-nitro-23-8-full-hd-180hz-0-5ms-ips-99-srgb-hdr10-freesync-premium-vga-hdmi-e-dp-kg241y-s3biip";

    try {
        console.log(`📡 Analisando link: ${url}`);
        const result = await LinkAnalyzer.analyzeLink(url);

        console.log("\n📊 Resultado da Análise:");
        console.log(JSON.stringify(result, null, 2));

        if (result.platform === 'kabum' && !result.error && result.currentPrice > 0) {
            console.log("\n✅ SUCESSO: Produto KaBuM! identificado e capturado!");
            console.log(`📦 Produto: ${result.name}`);
            console.log(`💰 Preço: R$ ${result.currentPrice}`);
            console.log(`💰 Preço Original: R$ ${result.oldPrice}`);
        } else {
            console.log("\n❌ FALHA: Produto não capturado corretamente.");
        }

    } catch (error) {
        console.error("\n❌ Erro durante o teste:", error);
    }
}

test();

/**
 * Script de Teste para Novas Plataformas
 * Testa a captura de produtos da Kabum, Magazine Luiza e Terabyteshop
 * 
 * Como usar:
 * node backend/scripts/test-new-platforms.js
 */

import LinkAnalyzer from '../src/services/linkAnalyzer.js';

// Simple logger
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};

// URLs de produtos reais para teste
const TEST_URLS = {
    kabum: [
        'https://www.kabum.com.br/produto/113599/mouse-gamer-logitech-g203-rgb-lightsync-6-botoes-8000-dpi-branco-910-005791',
        'https://www.kabum.com.br/produto/112992/teclado-mecanico-gamer-redragon-kumara-rgb-switch-outemu-blue-abnt2-preto-k552rgb-2-pt-blue',
        'https://www.kabum.com.br/produto/85215/headset-gamer-hyperx-cloud-stinger-core-drivers-40mm-preto-e-azul-ps4-4p5l7aa'
    ],
    magazineluiza: [
        'https://www.magazineluiza.com.br/notebook-gamer-lenovo-ideapad-gaming-3i-intel-core-i5-11300h-8gb-512gb-ssd-nvidia-geforce-gtx-1650-15-6-full-hd-linux/p/235792500/in/note/',
        'https://www.magazineluiza.com.br/smartphone-samsung-galaxy-a14-128gb-preto-4g-octa-core-4gb-ram-6-6-cam-tripla-selfie-13mp/p/237106400/te/galx/',
        'https://www.magazineluiza.com.br/smart-tv-50-4k-uhd-led-samsung-50cu7700-processador-crystal-4k-tela-sem-limites-visual-livre-de-cabos-alexa-built-in-3-hdmi/p/237633800/et/tlsm/'
    ],
    terabyteshop: [
        'https://www.terabyteshop.com.br/produto/21985/placa-de-video-gainward-geforce-rtx-3060-ghost-12gb-gddr6-192-bit-ne63060019k9-190au',
        'https://www.terabyteshop.com.br/produto/18594/processador-amd-ryzen-5-5600g-39-ghz-44ghz-turbo-6-cores-12-threads-cooler-wraith-stealth-am4',
        'https://www.terabyteshop.com.br/produto/11658/memoria-ddr4-xpg-gammix-d30-8gb-3200mhz-black-ax4u320038g16a-sb30'
    ]
};

// Validadores de dados
const validators = {
    hasName: (data) => data.name && data.name.trim().length > 0,
    hasPrice: (data) => data.currentPrice && data.currentPrice > 0,
    hasImage: (data) => data.imageUrl && data.imageUrl.startsWith('http'),
    hasPlatform: (data) => data.platform && data.platform.length > 0,
    hasDiscount: (data) => {
        if (data.oldPrice && data.currentPrice) {
            return data.oldPrice > data.currentPrice;
        }
        return true; // Sem desconto é válido
    }
};

class PlatformTester {
    constructor() {
        this.analyzer = new LinkAnalyzer();
        this.results = {
            kabum: { success: 0, failed: 0, errors: [] },
            magazineluiza: { success: 0, failed: 0, errors: [] },
            terabyteshop: { success: 0, failed: 0, errors: [] }
        };
    }

    /**
     * Testa uma URL específica
     */
    async testUrl(url, platform) {
        try {
            logger.info(`\n🔍 Testando ${platform}: ${url.substring(0, 60)}...`);

            const startTime = Date.now();
            const result = await this.analyzer.analyze(url);
            const duration = Date.now() - startTime;

            logger.info(`⏱️  Tempo de resposta: ${duration}ms`);

            // Verificar se há erro
            if (result.error) {
                logger.error(`❌ Erro retornado: ${result.error}`);
                this.results[platform].failed++;
                this.results[platform].errors.push({
                    url,
                    error: result.error,
                    type: 'api_error'
                });
                return false;
            }

            // Validar dados extraídos
            const validations = {
                hasName: validators.hasName(result),
                hasPrice: validators.hasPrice(result),
                hasImage: validators.hasImage(result),
                hasPlatform: validators.hasPlatform(result),
                hasDiscount: validators.hasDiscount(result)
            };

            // Exibir dados extraídos
            logger.info(`📦 Dados extraídos:`);
            logger.info(`   Nome: ${result.name || 'N/A'}`);
            logger.info(`   Preço atual: R$ ${result.currentPrice || 0}`);
            logger.info(`   Preço antigo: R$ ${result.oldPrice || 'N/A'}`);
            logger.info(`   Imagem: ${result.imageUrl ? 'Sim ✓' : 'Não ✗'}`);
            logger.info(`   Plataforma: ${result.platform || 'N/A'}`);
            logger.info(`   Desconto: ${result.discount || 0}%`);

            // Verificar validações
            const failedValidations = Object.entries(validations)
                .filter(([_, passed]) => !passed)
                .map(([name]) => name);

            if (failedValidations.length > 0) {
                logger.warn(`⚠️  Validações falhadas: ${failedValidations.join(', ')}`);
                this.results[platform].failed++;
                this.results[platform].errors.push({
                    url,
                    error: `Validações falhadas: ${failedValidations.join(', ')}`,
                    type: 'validation_error',
                    data: result
                });
                return false;
            }

            logger.info(`✅ Todos os dados extraídos com sucesso!`);
            this.results[platform].success++;
            return true;

        } catch (error) {
            logger.error(`❌ Exceção durante teste: ${error.message}`);
            logger.error(`   Stack: ${error.stack}`);
            this.results[platform].failed++;
            this.results[platform].errors.push({
                url,
                error: error.message,
                stack: error.stack,
                type: 'exception'
            });
            return false;
        }
    }

    /**
     * Testa todas as URLs de uma plataforma
     */
    async testPlatform(platform) {
        logger.info(`\n${'='.repeat(80)}`);
        logger.info(`🚀 Iniciando testes para ${platform.toUpperCase()}`);
        logger.info(`${'='.repeat(80)}`);

        const urls = TEST_URLS[platform];

        for (const url of urls) {
            await this.testUrl(url, platform);
            // Aguardar 1 segundo entre requisições para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * Testa todas as plataformas
     */
    async testAll() {
        logger.info(`\n${'#'.repeat(80)}`);
        logger.info(`🧪 INICIANDO TESTES DE CAPTURA DE PRODUTOS - NOVAS PLATAFORMAS`);
        logger.info(`${'#'.repeat(80)}`);

        const platforms = Object.keys(TEST_URLS);

        for (const platform of platforms) {
            await this.testPlatform(platform);
        }

        // Exibir resumo
        this.printSummary();
    }

    /**
     * Exibe resumo dos testes
     */
    printSummary() {
        logger.info(`\n${'#'.repeat(80)}`);
        logger.info(`📊 RESUMO DOS TESTES`);
        logger.info(`${'#'.repeat(80)}\n`);

        let totalSuccess = 0;
        let totalFailed = 0;

        Object.entries(this.results).forEach(([platform, result]) => {
            const total = result.success + result.failed;
            const successRate = total > 0 ? ((result.success / total) * 100).toFixed(1) : 0;

            logger.info(`\n📍 ${platform.toUpperCase()}`);
            logger.info(`   ✅ Sucessos: ${result.success}/${total}`);
            logger.info(`   ❌ Falhas: ${result.failed}/${total}`);
            logger.info(`   📈 Taxa de sucesso: ${successRate}%`);

            if (result.errors.length > 0) {
                logger.info(`\n   🔍 Erros detalhados:`);
                result.errors.forEach((error, index) => {
                    logger.error(`   ${index + 1}. ${error.type}: ${error.error}`);
                    logger.error(`      URL: ${error.url}`);
                });
            }

            totalSuccess += result.success;
            totalFailed += result.failed;
        });

        const grandTotal = totalSuccess + totalFailed;
        const overallRate = grandTotal > 0 ? ((totalSuccess / grandTotal) * 100).toFixed(1) : 0;

        logger.info(`\n${'='.repeat(80)}`);
        logger.info(`📊 TOTAL GERAL`);
        logger.info(`   ✅ Total de sucessos: ${totalSuccess}/${grandTotal}`);
        logger.info(`   ❌ Total de falhas: ${totalFailed}/${grandTotal}`);
        logger.info(`   📈 Taxa de sucesso geral: ${overallRate}%`);
        logger.info(`${'='.repeat(80)}\n`);

        // Recomendações
        this.printRecommendations();
    }

    /**
     * Imprime recomendações baseadas nos erros
     */
    printRecommendations() {
        logger.info(`\n💡 RECOMENDAÇÕES:\n`);

        Object.entries(this.results).forEach(([platform, result]) => {
            if (result.errors.length > 0) {
                const errorTypes = result.errors.reduce((acc, err) => {
                    acc[err.type] = (acc[err.type] || 0) + 1;
                    return acc;
                }, {});

                logger.info(`📍 ${platform.toUpperCase()}:`);

                if (errorTypes.validation_error) {
                    logger.info(`   • ${errorTypes.validation_error} erro(s) de validação`);
                    logger.info(`     → Verificar seletores CSS no método extract${this.capitalize(platform)}Info()`);
                }

                if (errorTypes.api_error) {
                    logger.info(`   • ${errorTypes.api_error} erro(s) de API`);
                    logger.info(`     → Verificar Headers HTTP e User-Agent`);
                }

                if (errorTypes.exception) {
                    logger.info(`   • ${errorTypes.exception} exceção(ões)`);
                    logger.info(`     → Verificar logs de stack trace acima`);
                }

                logger.info('');
            }
        });
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Retorna resultados para análise programática
     */
    getResults() {
        return this.results;
    }
}

// Executar testes
async function main() {
    const tester = new PlatformTester();

    try {
        await tester.testAll();

        // Verificar se há falhas
        const results = tester.getResults();
        const hasFailed = Object.values(results).some(r => r.failed > 0);

        if (hasFailed) {
            logger.warn(`\n⚠️  Alguns testes falharam. Revise os erros acima.`);
            process.exit(1);
        } else {
            logger.info(`\n✅ Todos os testes passaram com sucesso!`);
            process.exit(0);
        }
    } catch (error) {
        logger.error(`\n❌ Erro crítico durante execução dos testes:`);
        logger.error(error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default PlatformTester;

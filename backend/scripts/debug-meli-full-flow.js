import meliSync from '../src/services/autoSync/meliSync.js';
import logger from '../src/config/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

const KEYWORD = 'celular';
const MIN_DISCOUNT = 1; // 1% para ser bem permissivo no teste

async function debugFullFlow() {
    console.log(`🧪 Iniciando diagnóstico completo para termo: "${KEYWORD}"`);
    console.log(`   Configuração: Desconto Mínimo > ${MIN_DISCOUNT}%`);

    try {
        // 1. BUSCA
        console.log('\n1️⃣  Etapa 1: FETCH (Busca e Extração)');
        const products = await meliSync.fetchMeliProducts(KEYWORD, 10);

        console.log(`   Resultado: ${products.length} produtos encontrados.`);

        if (products.length === 0) {
            console.log('   ❌ FALHA: Nenhum produto retornado na busca.');
            return;
        }

        // Analisar primeiros produtos para ver se preço original está vindo
        console.log('\n   🔍 Análise dos dados brutos (Primeiros 3):');
        products.slice(0, 3).forEach((p, i) => {
            console.log(`   [${i + 1}] ${p.title}`);
            console.log(`       Preço: ${p.price}`);
            console.log(`       Original: ${p.original_price} (Tipo: ${typeof p.original_price})`);
            console.log(`       Permalink: ${p.permalink}`);

            // Simular cálculo de desconto
            if (p.original_price && p.original_price > p.price) {
                const disc = ((p.original_price - p.price) / p.original_price) * 100;
                console.log(`       📉 Desconto Calculado: ${disc.toFixed(2)}%`);
            } else {
                console.log(`       ⚠️ SEM DESCONTO DETECTADO (Original <= Preço ou Nulo)`);
            }
        });

        // 2. FILTRO
        console.log('\n2️⃣  Etapa 2: FILTER (Filtro de Desconto)');
        const promotions = meliSync.filterMeliPromotions(products, MIN_DISCOUNT);

        console.log(`   Resultado: ${promotions.length} promoções válidas.`);

        if (promotions.length === 0) {
            console.log('   ❌ FALHA: Filtro removeu TODOS os produtos.');
            console.log('   MOTIVO PROVÁVEL: O sistema não está conseguindo extrair o "original_price" (preço antigo/riscado) ou os produtos não tem desconto real.');
        } else {
            console.log('   ✅ SUCESSO: Fluxo funcionando. Promoções encontradas!');
            console.log('   Exemplo:', promotions[0].name);
            console.log('   Desconto:', promotions[0].discount_percentage + '%');
        }

    } catch (error) {
        console.error('❌ ERRO CRÍTICO:', error);
    }
}

debugFullFlow();

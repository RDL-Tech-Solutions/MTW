import meliSync from '../src/services/autoSync/meliSync.js';
import logger from '../src/config/logger.js';

// Mock logger simples para ver output no console
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function test() {
    console.log('🧪 Iniciando teste de sync do Mercado Livre (bypass 403)...');
    try {
        // Busca 5 produtos com termo "smartphone"
        const products = await meliSync.fetchMeliProducts('smartphone', 5);

        if (products && products.length > 0) {
            console.log(`✅ SUCESSO! Encontrados ${products.length} produtos.`);
            console.log('Primeiro produto:', products[0].title, 'Preço:', products[0].price);
        } else {
            console.log('⚠️ SUCESSO (Sem bloqueio), mas nenhum produto encontrado.');
        }

    } catch (error) {
        console.error('❌ FALHA NO TESTE:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
}

test();

import 'dotenv/config'; // Carregar .env automaticamente
import meliSync from '../src/services/autoSync/meliSync.js';
import meliAuth from '../src/services/autoSync/meliAuth.js';
import logger from '../src/config/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function testAffiliateConversion() {
    console.log('🧪 Iniciando teste de conversão de link de afiliado...');

    if (!meliAuth.isConfigured()) {
        console.log('❌ Credenciais (CLIENT_ID/SECRET) não configuradas no .env');
        console.log('   O teste não funcionará corretamente sem autenticação.');
        return;
    }

    try {
        // 1. Buscar um produto real para ter um ID válido
        console.log('🔍 Buscando um produto aleatório para teste...');
        const products = await meliSync.fetchMeliProducts('notebook', 1);

        if (products.length === 0) {
            console.log('❌ Nenhum produto encontrado para o teste.');
            return;
        }

        const product = products[0];
        const mockProduct = {
            external_id: `mercadolivre-${product.id}`,
            affiliate_link: product.permalink,
            name: product.title
        };

        console.log('\n📦 Produto Teste:', mockProduct.name);
        console.log('🔗 Link Original:', mockProduct.affiliate_link);
        console.log('🔑 Token configurado?', meliAuth.accessToken ? 'Sim (Cache)' : 'Não (Vai gerar)');

        // 2. Tentar converter
        console.log('\n⚙️  Tentando converter link via API autenticada...');
        const resultLink = await meliSync.generateMeliAffiliateLink(mockProduct);

        console.log('\n📊 RESULTADO DA CONVERSÃO:');
        console.log('--------------------------------------------------');
        console.log('🔗 LINK FINAL:', resultLink);
        console.log('--------------------------------------------------');

        if (resultLink !== mockProduct.affiliate_link) {
            console.log('✅ O link mudou! A API retornou uma URL diferente.');
            console.log('   Verifique se o link acima possui parâmetros de rastreamento (ex: click_id, tracking_id, etc).');
        } else {
            console.log('⚠️ O link NÃO mudou.');
            console.log('   Possíveis causas:');
            console.log('   1. A conta vinculada não é de afiliado.');
            console.log('   2. A API retornou o mesmo permalink (comum se não houver parametro de tracking configurado na conta).');
        }

    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}

testAffiliateConversion();

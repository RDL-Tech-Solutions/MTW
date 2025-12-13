import meliSync from '../src/services/autoSync/meliSync.js';
import Product from '../src/models/Product.js';
import { testConnection } from '../src/config/database.js';
import logger from '../src/config/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function testSave() {
    console.log('🧪 Testando salvamento no banco...');

    await testConnection();

    const mockProduct = {
        external_id: `mercadolivre-TESTE-${Date.now()}`,
        name: 'Produto Teste Debug',
        image_url: 'https://http2.mlstatic.com/D_NQ_NP_123456-MLB123456789_122020-O.webp',
        platform: 'mercadolivre',
        current_price: 100,
        old_price: 150,
        discount_percentage: 33,
        affiliate_link: 'https://www.mercadolivre.com.br/teste',
        stock_available: true
    };

    try {
        console.log('💾 Tentando salvar...');
        // Nota: isso vai tentar gerar link de afiliado, que chama API do ML
        // Se falhar a autenticação lá, deve retornar o link original e salvar.
        const result = await meliSync.saveMeliToDatabase(mockProduct, Product);
        console.log('✅ Resultado:', result);
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
    }
}

testSave();

import meliSync from '../src/services/autoSync/meliSync.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para busca de produtos no Mercado Livre
 * 
 * Uso:
 * node scripts/test-meli-search.js
 * node scripts/test-meli-search.js "smartphone samsung"
 */

async function testMeliSearch() {
    logger.info('🧪 Iniciando teste de busca no Mercado Livre...\n');

    // Pegar keyword dos argumentos ou usar padrão
    const keywords = process.argv[2] || 'notebook gamer';
    const limit = parseInt(process.argv[3]) || 10;

    logger.info(`📝 Parâmetros do teste:`);
    logger.info(`   Keywords: "${keywords}"`);
    logger.info(`   Limite: ${limit} produtos\n`);

    try {
        // Testar busca via API
        logger.info('🔍 Buscando produtos via API...');
        const products = await meliSync.fetchMeliProducts(keywords, limit, { forceScraping: false });

        logger.info(`\n📊 Resultados da busca:`);
        logger.info(`   Total de produtos encontrados: ${products.length}`);

        if (products.length === 0) {
            logger.warn('\n⚠️ Nenhum produto encontrado. Verifique:');
            logger.warn('   - Se as credenciais do Mercado Livre estão configuradas');
            logger.warn('   - Se a keyword é válida');
            logger.warn('   - Se há produtos disponíveis para essa busca');
            return;
        }

        // Mostrar detalhes do primeiro produto
        const firstProduct = products[0];
        logger.info(`\n📦 Primeiro produto encontrado:`);
        logger.info(`   ID: ${firstProduct.id}`);
        logger.info(`   Título: ${firstProduct.title}`);
        logger.info(`   Preço: R$ ${firstProduct.price?.toFixed(2) || 'N/A'}`);
        logger.info(`   Preço Original: R$ ${firstProduct.original_price?.toFixed(2) || 'N/A'}`);

        if (firstProduct.original_price && firstProduct.price) {
            const discount = ((firstProduct.original_price - firstProduct.price) / firstProduct.original_price) * 100;
            logger.info(`   Desconto: ${discount.toFixed(0)}%`);
        }

        logger.info(`   Imagem: ${firstProduct.thumbnail ? '✅ OK' : '❌ FALTANDO'}`);
        logger.info(`   Link: ${firstProduct.permalink ? '✅ OK' : '❌ FALTANDO'}`);
        logger.info(`   Quantidade: ${firstProduct.available_quantity || 0}`);
        logger.info(`   Cupom: ${firstProduct.coupon ? '✅ SIM' : '❌ NÃO'}`);

        if (firstProduct.coupon) {
            logger.info(`\n   🎟️ Detalhes do Cupom:`);
            logger.info(`      Código: ${firstProduct.coupon.code}`);
            logger.info(`      Valor: R$ ${firstProduct.coupon.discount_value}`);
            logger.info(`      Tipo: ${firstProduct.coupon.discount_type}`);
        }

        // Filtrar promoções
        logger.info(`\n🎯 Filtrando promoções (desconto ≥ 10%)...`);
        const promotions = await meliSync.filterMeliPromotions(products, 10);
        logger.info(`   Promoções válidas encontradas: ${promotions.length}`);

        if (promotions.length > 0) {
            logger.info(`\n📋 Lista de promoções:`);
            promotions.slice(0, 5).forEach((promo, index) => {
                logger.info(`\n   ${index + 1}. ${promo.name}`);
                logger.info(`      Preço: R$ ${promo.current_price?.toFixed(2)}`);
                logger.info(`      Preço Antigo: R$ ${promo.old_price?.toFixed(2)}`);
                logger.info(`      Desconto: ${promo.discount_percentage}%`);
                logger.info(`      Imagem: ${promo.image_url ? '✅' : '❌'}`);
                logger.info(`      Link: ${promo.affiliate_link ? '✅' : '❌'}`);
                if (promo.coupon) {
                    logger.info(`      Cupom: ${promo.coupon.code} (R$ ${promo.coupon.discount_value})`);
                }
            });

            if (promotions.length > 5) {
                logger.info(`\n   ... e mais ${promotions.length - 5} promoções`);
            }
        }

        // Estatísticas
        logger.info(`\n📈 Estatísticas:`);
        const withImages = products.filter(p => p.thumbnail && p.thumbnail.startsWith('http')).length;
        const withOriginalPrice = products.filter(p => p.original_price && p.original_price > p.price).length;
        const withCoupons = products.filter(p => p.coupon).length;

        logger.info(`   Produtos com imagem válida: ${withImages}/${products.length} (${((withImages / products.length) * 100).toFixed(0)}%)`);
        logger.info(`   Produtos com desconto: ${withOriginalPrice}/${products.length} (${((withOriginalPrice / products.length) * 100).toFixed(0)}%)`);
        logger.info(`   Produtos com cupom: ${withCoupons}/${products.length} (${((withCoupons / products.length) * 100).toFixed(0)}%)`);

        // Validações
        logger.info(`\n✅ Validações:`);
        const validations = {
            'API retornou produtos': products.length > 0,
            'Produtos têm ID': products.every(p => p.id),
            'Produtos têm título': products.every(p => p.title),
            'Produtos têm preço': products.every(p => p.price > 0),
            'Produtos têm link': products.every(p => p.permalink),
            'Imagens são válidas': withImages === products.length,
            'Cupons têm código válido': withCoupons === 0 || products.filter(p => p.coupon).every(p => {
                const code = p.coupon.code;
                return code && code.length >= 4 && code.length <= 20 && /[A-Z]/i.test(code) && /[0-9]/.test(code);
            })
        };

        Object.entries(validations).forEach(([check, passed]) => {
            logger.info(`   ${passed ? '✅' : '❌'} ${check}`);
        });

        const allPassed = Object.values(validations).every(v => v);

        if (allPassed) {
            logger.info(`\n✅ ✅ ✅ TESTE CONCLUÍDO COM SUCESSO! ✅ ✅ ✅`);
        } else {
            logger.warn(`\n⚠️ TESTE CONCLUÍDO COM AVISOS - Verifique as validações acima`);
        }

    } catch (error) {
        logger.error(`\n❌ ERRO NO TESTE: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Executar teste
testMeliSearch().then(() => {
    logger.info('\n🏁 Teste finalizado\n');
    process.exit(0);
}).catch(error => {
    logger.error(`\n❌ Erro fatal: ${error.message}`);
    process.exit(1);
});

import shopeeSync from '../src/services/autoSync/shopeeSync.js';
import Product from '../src/models/Product.js';

/**
 * Script de teste para sincronização Shopee com links de afiliado
 */

async function testShopeeSync() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE DE SINCRONIZAÇÃO SHOPEE COM LINKS DE AFILIADO');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Buscar produtos
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TESTE 1: Buscar Produtos/Ofertas');
    console.log('═══════════════════════════════════════════════════════════');
    
    const keywords = ['notebook', 'smartphone'];
    const products = await shopeeSync.fetchShopeeProducts(keywords, 5);
    
    console.log(`\n✅ ${products.length} produtos/ofertas encontrados\n`);
    
    if (products.length > 0) {
      console.log('📦 Primeira oferta:');
      console.log(`   Nome: ${products[0].title}`);
      console.log(`   Link Original: ${products[0].permalink?.substring(0, 60)}...`);
      console.log(`   Link Afiliado: ${products[0].affiliate_link?.substring(0, 60)}...`);
      console.log(`   Comissão: ${(products[0].commission_rate * 100).toFixed(2)}%`);
      console.log(`   Tipo: ${products[0].offer_type === 1 ? 'Coleção' : 'Categoria'}`);
    }

    // 2. Filtrar promoções
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TESTE 2: Filtrar Promoções');
    console.log('═══════════════════════════════════════════════════════════');
    
    const promotions = shopeeSync.filterShopeePromotions(products, 10);
    
    console.log(`\n✅ ${promotions.length} promoções válidas encontradas\n`);
    
    if (promotions.length > 0) {
      console.log('🎯 Primeira promoção:');
      console.log(`   Nome: ${promotions[0].name}`);
      console.log(`   Link Afiliado: ${promotions[0].affiliate_link?.substring(0, 60)}...`);
      console.log(`   Comissão: ${(promotions[0].commission_rate * 100).toFixed(2)}%`);
      console.log(`   Score: ${promotions[0].quality_score?.toFixed(2)}`);
    }

    // 3. Testar geração de link de afiliado
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TESTE 3: Gerar Link de Afiliado');
    console.log('═══════════════════════════════════════════════════════════');
    
    const testUrl = 'https://shopee.com.br/product/123456';
    const affiliateLink = await shopeeSync.generateShopeeAffiliateLink(testUrl);
    
    console.log(`\n   URL Original: ${testUrl}`);
    console.log(`   Link Afiliado: ${affiliateLink}`);
    
    if (affiliateLink !== testUrl) {
      console.log(`   ✅ Link de afiliado gerado com sucesso!`);
    } else {
      console.log(`   ⚠️ Link não foi gerado (retornou URL original)`);
    }

    // 4. Testar salvamento (opcional - comentado para não criar dados de teste)
    /*
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('TESTE 4: Salvar no Banco (SIMULADO)');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (promotions.length > 0) {
      const promo = promotions[0];
      console.log(`\n   Produto: ${promo.name}`);
      console.log(`   Link Afiliado: ${promo.affiliate_link?.substring(0, 60)}...`);
      console.log(`   ✅ Pronto para salvar no banco com link de afiliado`);
    }
    */

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Produtos encontrados: ${products.length}`);
    console.log(`✅ Promoções válidas: ${promotions.length}`);
    console.log(`✅ Links de afiliado: ${promotions.filter(p => p.affiliate_link && p.affiliate_link !== p.permalink).length}`);
    
    if (promotions.length > 0 && promotions[0].affiliate_link) {
      console.log(`\n🎉 Sincronização funcionando! Links de afiliado serão compartilhados.`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error(`\n❌ Erro no teste: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

// Executar teste
testShopeeSync().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});








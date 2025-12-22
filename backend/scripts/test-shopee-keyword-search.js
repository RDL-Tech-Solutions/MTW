import shopeeService from '../src/services/shopee/shopeeService.js';

/**
 * Script de teste específico para busca por keyword na Shopee
 * Testa diferentes combinações de parâmetros
 */

async function testKeywordSearch() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE: Busca por Keyword - Shopee productOfferV2');
  console.log('═══════════════════════════════════════════════════════════\n');

  const keywords = ['smartphone', 'notebook', 'fone'];
  
  for (const keyword of keywords) {
    console.log(`📝 Testando keyword: "${keyword}"`);
    console.log('───────────────────────────────────────────────────────────');
    
    try {
      // Teste 1: Apenas keyword usando shopeeOfferV2 (suporta keyword)
      console.log(`\n   Teste 1.1: shopeeOfferV2 com keyword`);
      const result1 = await shopeeService.getShopeeOffers({
        keyword: keyword,
        sortType: 1, // LATEST_DESC = 1
        page: 1,
        limit: 5
      });
      
      if (result1.nodes && result1.nodes.length > 0) {
        console.log(`   ✅ SUCESSO! ${result1.nodes.length} ofertas encontradas`);
        console.log(`   Primeira oferta: ${result1.nodes[0].offerName?.substring(0, 60)}...`);
        console.log(`   Tipo: ${result1.nodes[0].offerType === 1 ? 'Coleção' : 'Categoria'}`);
        console.log(`   Comissão: ${(parseFloat(result1.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      } else {
        console.log(`   ⚠️ Nenhuma oferta encontrada`);
      }
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste 2: Keyword com sortType HIGHEST_COMMISSION_DESC
    try {
      console.log(`\n   Teste 1.2: shopeeOfferV2 com keyword e HIGHEST_COMMISSION_DESC`);
      const result2 = await shopeeService.getShopeeOffers({
        keyword: keyword,
        sortType: 2, // HIGHEST_COMMISSION_DESC = 2
        page: 1,
        limit: 5
      });
      
      if (result2.nodes && result2.nodes.length > 0) {
        console.log(`   ✅ SUCESSO! ${result2.nodes.length} ofertas encontradas`);
        console.log(`   Primeira oferta: ${result2.nodes[0].offerName?.substring(0, 60)}...`);
        console.log(`   Comissão: ${(parseFloat(result2.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      } else {
        console.log(`   ⚠️ Nenhuma oferta encontrada`);
      }
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste 3: shopOfferV2 com keyword (busca por nome da loja)
    try {
      console.log(`\n   Teste 1.3: shopOfferV2 com keyword (busca por nome da loja)`);
      const result3 = await shopeeService.getShopOffers({
        keyword: keyword,
        sortType: 2, // SHOP_LIST_SORT_TYPE_HIGHEST_COMMISSION_DESC = 2
        page: 1,
        limit: 5
      });
      
      if (result3.nodes && result3.nodes.length > 0) {
        console.log(`   ✅ SUCESSO! ${result3.nodes.length} lojas encontradas`);
        console.log(`   Primeira loja: ${result3.nodes[0].shopName?.substring(0, 60) || 'N/A'}...`);
        console.log(`   Comissão: ${(parseFloat(result3.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      } else {
        console.log(`   ⚠️ Nenhuma loja encontrada`);
      }
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste 4: shopOfferV2 com keyword e isKeySeller
    try {
      console.log(`\n   Teste 1.4: shopOfferV2 com keyword e isKeySeller=true`);
      const result4 = await shopeeService.getShopOffers({
        keyword: keyword,
        sortType: 2,
        page: 1,
        limit: 5,
        isKeySeller: true
      });
      
      if (result4.nodes && result4.nodes.length > 0) {
        console.log(`   ✅ SUCESSO! ${result4.nodes.length} lojas encontradas`);
        console.log(`   Primeira loja: ${result4.nodes[0].shopName?.substring(0, 60) || 'N/A'}...`);
        console.log(`   Comissão: ${(parseFloat(result4.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      } else {
        console.log(`   ⚠️ Nenhuma loja encontrada`);
      }
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
    }
    
    console.log('\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Testes de keyword concluídos!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testKeywordSearch().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});



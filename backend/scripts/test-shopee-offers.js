import shopeeService from '../src/services/shopee/shopeeService.js';

/**
 * Teste para verificar se shopeeOfferV2 retorna ofertas sem keyword
 */

async function testShopeeOffers() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE: shopeeOfferV2 - Verificar se retorna ofertas');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Teste 1: Sem keyword (todas as ofertas)
  console.log('📝 Teste 1: shopeeOfferV2 SEM keyword (todas as ofertas)');
  console.log('───────────────────────────────────────────────────────────');
  try {
    const offers = await shopeeService.getShopeeOffers({
      keyword: null,
      sortType: 2, // HIGHEST_COMMISSION_DESC
      page: 1,
      limit: 10
    });

    if (offers.nodes && offers.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${offers.nodes.length} ofertas encontradas\n`);
      
      offers.nodes.slice(0, 3).forEach((offer, index) => {
        console.log(`📦 Oferta ${index + 1}:`);
        console.log(`   Nome: ${offer.offerName}`);
        console.log(`   Tipo: ${offer.offerType === 1 ? 'Coleção' : 'Categoria'}`);
        console.log(`   Comissão: ${(parseFloat(offer.commissionRate || 0) * 100).toFixed(2)}%`);
        console.log(`   Link: ${offer.offerLink?.substring(0, 60) || 'N/A'}...`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhuma oferta encontrada');
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2: Com keyword genérico
  console.log('📝 Teste 2: shopeeOfferV2 COM keyword "roupa"');
  console.log('───────────────────────────────────────────────────────────');
  try {
    const offers = await shopeeService.getShopeeOffers({
      keyword: 'roupa',
      sortType: 2,
      page: 1,
      limit: 5
    });

    if (offers.nodes && offers.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${offers.nodes.length} ofertas encontradas\n`);
      offers.nodes.slice(0, 2).forEach((offer, index) => {
        console.log(`📦 Oferta ${index + 1}: ${offer.offerName}`);
      });
    } else {
      console.log('⚠️ Nenhuma oferta encontrada para "roupa"');
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Testes concluídos!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testShopeeOffers().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});

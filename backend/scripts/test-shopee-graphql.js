import shopeeService from '../src/services/shopee/shopeeService.js';

/**
 * Script de teste para API GraphQL de Afiliados Shopee
 * Testa as principais queries e mutations
 */

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE DE API GRAPHQL SHOPEE AFFILIATE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = [];

  // Teste 1: shopeeOfferV2 - Lista de ofertas da Shopee
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTE 1: shopeeOfferV2 - Lista de Ofertas');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const offers = await shopeeService.getShopeeOffers({
      keyword: null,
      sortType: 1, // Mais recentes
      page: 1,
      limit: 10
    });

    if (offers.nodes && offers.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${offers.nodes.length} ofertas encontradas`);
      console.log(`   Primeira oferta: ${offers.nodes[0].offerName}`);
      console.log(`   Comissão: ${(parseFloat(offers.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      results.push({ test: 'shopeeOfferV2', success: true, count: offers.nodes.length });
    } else {
      console.log(`⚠️ Nenhuma oferta encontrada`);
      results.push({ test: 'shopeeOfferV2', success: false, error: 'Nenhuma oferta retornada' });
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
    results.push({ test: 'shopeeOfferV2', success: false, error: error.message });
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2: productOffer - Ofertas de produtos
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTE 2: productOffer - Ofertas de Produtos');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const productOffers = await shopeeService.getProductOffers({
      keyword: null, // Sem keyword para pegar todas
      page: 1,
      limit: 5
    });

    if (productOffers.nodes && productOffers.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${productOffers.nodes.length} ofertas encontradas`);
      console.log(`   Primeira oferta: ${productOffers.nodes[0].offerName || productOffers.nodes[0].productName}`);
      console.log(`   Tipo: ${productOffers.nodes[0].offerType === 1 ? 'Coleção' : 'Categoria'}`);
      console.log(`   Comissão: ${(parseFloat(productOffers.nodes[0].commissionRate || 0) * 100).toFixed(2)}%`);
      results.push({ test: 'productOffer', success: true, count: productOffers.nodes.length });
    } else {
      console.log(`⚠️ Nenhuma oferta encontrada`);
      results.push({ test: 'productOffer', success: false, error: 'Nenhuma oferta retornada' });
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
    results.push({ test: 'productOffer', success: false, error: error.message });
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 3: generateShortLink - Gerar link curto
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTE 3: generateShortLink - Gerar Link Curto');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const testUrl = 'https://shopee.com.br/product/123456';
    const shortLink = await shopeeService.generateShortLink(testUrl, ['test']);

    if (shortLink && shortLink !== testUrl) {
      console.log(`✅ SUCESSO! Link gerado:`);
      console.log(`   Original: ${testUrl}`);
      console.log(`   Curto: ${shortLink}`);
      results.push({ test: 'generateShortLink', success: true });
    } else {
      console.log(`⚠️ Link não foi gerado (retornou URL original)`);
      results.push({ test: 'generateShortLink', success: false, error: 'Link não gerado' });
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
    results.push({ test: 'generateShortLink', success: false, error: error.message });
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 4: Métodos de compatibilidade - getOffers
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTE 4: getOffers (Compatibilidade)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const offers = await shopeeService.getOffers(null, 5);

    if (offers.item_list && offers.item_list.length > 0) {
      console.log(`✅ SUCESSO! ${offers.item_list.length} ofertas encontradas`);
      console.log(`   Primeira: ${offers.item_list[0].name}`);
      results.push({ test: 'getOffers (compat)', success: true, count: offers.item_list.length });
    } else {
      console.log(`⚠️ Nenhuma oferta encontrada`);
      results.push({ test: 'getOffers (compat)', success: false, error: 'Nenhuma oferta retornada' });
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
    results.push({ test: 'getOffers (compat)', success: false, error: error.message });
  }

  // Resumo
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════════\n');

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test}:`);
    if (result.success) {
      console.log(`   ✅ SUCESSO${result.count ? ` (${result.count} itens)` : ''}`);
    } else {
      console.log(`   ❌ FALHOU`);
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
    }
    console.log('');
  });

  console.log(`📈 RESULTADO FINAL: ${successCount}/${totalCount} testes passaram\n`);

  if (successCount === 0) {
    console.log('⚠️ Nenhum teste passou. Possíveis causas:');
    console.log('   1. AppID/Secret incorretos ou não ativados');
    console.log('   2. AppID ainda não foi aprovado pela Shopee');
    console.log('   3. Problemas de autenticação (verifique os logs acima)');
    console.log('   4. API temporariamente indisponível');
  } else if (successCount < totalCount) {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima para detalhes.');
  } else {
    console.log('🎉 Todos os testes passaram! A API GraphQL está funcionando corretamente.');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Executar testes
runTests().catch(error => {
  console.error('\n❌ Erro fatal ao executar testes:', error);
  process.exit(1);
});







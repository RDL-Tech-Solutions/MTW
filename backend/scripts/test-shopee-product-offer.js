import shopeeService from '../src/services/shopee/shopeeService.js';

/**
 * Script de teste para productOfferV2 da Shopee
 * Testa a nova implementação conforme documentação
 */

async function testProductOfferV2() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE: productOfferV2 - Shopee Affiliate API');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Teste 1: Buscar produtos por keyword
  console.log('📝 Teste 1: Buscar produtos por keyword');
  console.log('───────────────────────────────────────────────────────────');
  try {
    const products = await shopeeService.getProductOffers({
      keyword: 'smartphone',
      sortType: 2, // ITEM_SOLD_DESC
      page: 1,
      limit: 5
    });

    if (products.nodes && products.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${products.nodes.length} produtos encontrados\n`);
      
      const firstProduct = products.nodes[0];
      console.log('📦 Primeiro produto:');
      console.log(`   Nome: ${firstProduct.productName}`);
      console.log(`   Item ID: ${firstProduct.itemId}`);
      console.log(`   Preço: R$ ${firstProduct.priceMin || 'N/A'} - R$ ${firstProduct.priceMax || 'N/A'}`);
      console.log(`   Comissão: ${(parseFloat(firstProduct.commissionRate || 0) * 100).toFixed(2)}%`);
      console.log(`   Avaliação: ${firstProduct.ratingStar || 'N/A'} ⭐`);
      console.log(`   Vendas: ${firstProduct.sales || 0}`);
      console.log(`   Desconto: ${firstProduct.priceDiscountRate || 0}%`);
      console.log(`   Loja: ${firstProduct.shopName || 'N/A'}`);
      console.log(`   Link produto: ${firstProduct.productLink?.substring(0, 60) || 'N/A'}...`);
      console.log(`   Link afiliado: ${firstProduct.offerLink?.substring(0, 60) || 'N/A'}...`);
    } else {
      console.log('⚠️ Nenhum produto encontrado');
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 2: Buscar produtos top performing
  console.log('📝 Teste 2: Buscar produtos top performing');
  console.log('───────────────────────────────────────────────────────────');
  try {
    const products = await shopeeService.getProductOffers({
      listType: 2, // TOP_PERFORMING
      sortType: 2, // ITEM_SOLD_DESC
      page: 1,
      limit: 5
    });

    if (products.nodes && products.nodes.length > 0) {
      console.log(`✅ SUCESSO! ${products.nodes.length} produtos encontrados\n`);
      
      const firstProduct = products.nodes[0];
      console.log('📦 Primeiro produto:');
      console.log(`   Nome: ${firstProduct.productName}`);
      console.log(`   Item ID: ${firstProduct.itemId}`);
      console.log(`   Preço: R$ ${firstProduct.priceMin || 'N/A'} - R$ ${firstProduct.priceMax || 'N/A'}`);
      console.log(`   Comissão: ${(parseFloat(firstProduct.commissionRate || 0) * 100).toFixed(2)}%`);
    } else {
      console.log('⚠️ Nenhum produto encontrado');
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
  }

  console.log('\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Teste 3: Gerar link curto
  console.log('📝 Teste 3: Gerar link curto (generateShortLink)');
  console.log('───────────────────────────────────────────────────────────');
  try {
    const testUrl = 'https://shopee.com.br/product/123456/789012';
    const shortLink = await shopeeService.generateShortLink(testUrl, ['test1', 'test2']);

    if (shortLink && shortLink !== testUrl) {
      console.log(`✅ SUCESSO! Link gerado:`);
      console.log(`   Original: ${testUrl}`);
      console.log(`   Curto: ${shortLink}`);
    } else {
      console.log(`⚠️ Link não foi gerado (retornou URL original)`);
    }
  } catch (error) {
    console.log(`❌ ERRO: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Testes concluídos!');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testProductOfferV2().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});

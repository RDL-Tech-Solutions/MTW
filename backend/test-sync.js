// IMPORTANTE: Carregar .env ANTES de tudo!
import dotenv from 'dotenv';
dotenv.config();

console.log('✅ .env carregado');
console.log(`   MELI_APP_ID: ${process.env.MELI_APP_ID ? 'Configurado' : 'NÃO CONFIGURADO'}`);
console.log(`   MELI_SECRET_KEY: ${process.env.MELI_SECRET_KEY ? 'Configurado' : 'NÃO CONFIGURADO'}\n`);

console.log('🧪 TESTE DE SINCRONIZAÇÃO DO MERCADO LIVRE\n');
console.log('==========================================\n');

async function testMeliSync() {
  // Import dinâmico APÓS carregar .env
  const { default: meliSync } = await import('./src/services/autoSync/meliSync.js');
  const { default: meliAuth } = await import('./src/services/autoSync/meliAuth.js');
  try {
    // 0. Testar autenticação
    console.log('0️⃣ Testando autenticação OAuth...\n');
    
    console.log('DEBUG - APP_ID:', process.env.MELI_APP_ID ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('DEBUG - SECRET:', process.env.MELI_SECRET_KEY ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('');
    
    if (meliAuth.isConfigured()) {
      const token = await meliAuth.getAccessToken();
      console.log('✅ Token obtido com sucesso!');
      console.log(`   Token (primeiros 20 chars): ${token.substring(0, 20)}...`);
      console.log('');
    } else {
      console.log('⚠️ Credenciais não configuradas no .env\n');
    }
    
    // 1. Testar busca de produtos
    console.log('1️⃣ Testando busca de produtos...\n');
    
    const keywords = 'notebook, smartphone';
    const products = await meliSync.fetchMeliProducts(keywords, 10);
    
    console.log(`✅ ${products.length} produtos encontrados\n`);
    
    if (products.length > 0) {
      console.log('📦 Exemplo de produto:');
      console.log('   ID:', products[0].id);
      console.log('   Título:', products[0].title?.substring(0, 50) + '...');
      console.log('   Preço:', products[0].price);
      console.log('   Preço Original:', products[0].original_price || 'N/A');
      console.log('');
    }
    
    // 2. Testar filtro de promoções
    console.log('2️⃣ Testando filtro de promoções (desconto >= 10%)...\n');
    
    const promotions = meliSync.filterMeliPromotions(products, 10);
    
    console.log(`✅ ${promotions.length} promoções válidas encontradas\n`);
    
    if (promotions.length > 0) {
      console.log('🔥 Exemplos de promoções:');
      promotions.slice(0, 3).forEach((promo, index) => {
        console.log(`\n   ${index + 1}. ${promo.name?.substring(0, 40)}...`);
        console.log(`      Preço Atual: R$ ${promo.current_price}`);
        console.log(`      Preço Antigo: R$ ${promo.old_price}`);
        console.log(`      Desconto: ${promo.discount_percentage}%`);
      });
    } else {
      console.log('⚠️ Nenhuma promoção encontrada com as palavras-chave testadas.');
      console.log('💡 Isso é normal! A API do ML só retorna original_price quando há desconto real.');
      console.log('💡 Tente palavras-chave diferentes ou aguarde promoções reais.');
    }
    
    console.log('\n\n✅ TESTE CONCLUÍDO COM SUCESSO!\n');
    console.log('==========================================');
    console.log('📊 RESUMO:');
    console.log(`   Total de produtos: ${products.length}`);
    console.log(`   Promoções válidas: ${promotions.length}`);
    console.log('==========================================\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('\nDetalhes:', error);
  }
}

testMeliSync();

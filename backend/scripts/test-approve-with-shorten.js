import Product from '../src/models/Product.js';
import urlShortener from '../src/services/urlShortener.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para simular o fluxo de aprovação com encurtamento
 */
async function testApproveWithShorten() {
  console.log('🧪 Testando fluxo de aprovação com encurtamento...\n');

  try {
    // 1. Simular link de afiliado
    const originalAffiliateLink = 'https://pt.aliexpress.com/item/1005001234567890.html?aff_trace_key=abc123&terminal_id=MTWPromo';
    console.log(`📝 Link original: ${originalAffiliateLink}\n`);

    // 2. Encurtar link
    console.log('🔗 Encurtando link...');
    const shortenedLink = await urlShortener.shorten(originalAffiliateLink);
    console.log(`   Link encurtado: ${shortenedLink}`);
    console.log(`   ✅ Encurtado: ${shortenedLink !== originalAffiliateLink ? 'SIM' : 'NÃO'}\n`);

    // 3. Simular o que acontece no controller
    console.log('📝 Simulando fluxo do controller...');
    let finalAffiliateLink = originalAffiliateLink.trim();
    const shorten_link = true; // Simular parâmetro do request

    if (shorten_link === true || shorten_link === 'true' || shorten_link === 1 || shorten_link === '1') {
      console.log('   ✅ Encurtamento solicitado');
      try {
        const shortenedUrl = await urlShortener.shorten(originalAffiliateLink.trim());
        
        if (shortenedUrl && shortenedUrl !== originalAffiliateLink.trim() && shortenedUrl.startsWith('http')) {
          finalAffiliateLink = shortenedUrl;
          console.log(`   ✅ Link encurtado com sucesso`);
          console.log(`   Original: ${originalAffiliateLink.substring(0, 80)}...`);
          console.log(`   Encurtado: ${finalAffiliateLink}`);
        } else {
          console.log(`   ⚠️ URL não foi encurtada (retornou original)`);
          finalAffiliateLink = originalAffiliateLink.trim();
        }
      } catch (error) {
        console.error(`   ❌ Erro ao encurtar: ${error.message}`);
        finalAffiliateLink = originalAffiliateLink.trim();
      }
    }

    // 4. Simular updateData
    const updateData = {
      affiliate_link: finalAffiliateLink,
      status: 'approved'
    };

    console.log(`\n📝 updateData que seria salvo:`);
    console.log(`   affiliate_link: ${updateData.affiliate_link.substring(0, 100)}...`);
    console.log(`   status: ${updateData.status}`);
    console.log(`   ✅ Link no updateData é encurtado: ${updateData.affiliate_link !== originalAffiliateLink ? 'SIM' : 'NÃO'}\n`);

    // 5. Simular Product.approve
    console.log('📝 Simulando Product.approve...');
    const affiliateLinkParam = finalAffiliateLink;
    const additionalData = updateData;

    // Simular o que acontece no Product.approve
    const updateDataForDB = {
      status: 'approved',
      updated_at: new Date().toISOString(),
      ...additionalData,
      affiliate_link: affiliateLinkParam // Definir depois do spread
    };

    console.log(`   affiliateLinkParam: ${affiliateLinkParam.substring(0, 100)}...`);
    console.log(`   additionalData.affiliate_link: ${additionalData.affiliate_link.substring(0, 100)}...`);
    console.log(`   updateDataForDB.affiliate_link: ${updateDataForDB.affiliate_link.substring(0, 100)}...`);
    console.log(`   ✅ Link final é encurtado: ${updateDataForDB.affiliate_link !== originalAffiliateLink ? 'SIM' : 'NÃO'}\n`);

    console.log('✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('   Stack:', error.stack);
  }
}

testApproveWithShorten().catch(console.error);


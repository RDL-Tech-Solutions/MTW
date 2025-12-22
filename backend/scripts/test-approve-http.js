import axios from 'axios';

/**
 * Script para testar o endpoint de aprovação via HTTP real
 * 
 * IMPORTANTE: Configure as variáveis abaixo antes de executar
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Token JWT de autenticação
const PRODUCT_ID = process.env.PRODUCT_ID || ''; // ID de um produto pendente

async function testApproveWithShorten() {
  console.log('🧪 Testando endpoint de aprovação com encurtamento via HTTP...\n');

  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN não configurado.');
    console.log('   Configure: AUTH_TOKEN=seu_token npm run test:approve-http');
    return;
  }

  if (!PRODUCT_ID) {
    console.error('❌ PRODUCT_ID não fornecido.');
    console.log('   Configure: PRODUCT_ID=uuid-do-produto npm run test:approve-http');
    return;
  }

  const testAffiliateLink = 'https://pt.aliexpress.com/item/1005001234567890.html?aff_trace_key=abc123&terminal_id=MTWPromo';

  console.log(`📝 Configuração:`);
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Product ID: ${PRODUCT_ID}`);
  console.log(`   Link original: ${testAffiliateLink}\n`);

  // Teste: Aprovar COM encurtamento
  console.log('📝 Teste: Aprovar COM encurtamento de link');
  try {
    const payload = {
      affiliate_link: testAffiliateLink,
      shorten_link: true // Enviar boolean true
    };

    console.log(`📤 Payload enviado:`, JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${API_URL}/api/products/pending/${PRODUCT_ID}/approve`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`\n✅ Resposta recebida:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.product?.affiliate_link) {
      const savedLink = response.data.data.product.affiliate_link;
      console.log(`\n🔗 Link salvo no produto:`);
      console.log(`   ${savedLink}`);
      console.log(`   É encurtado: ${savedLink !== testAffiliateLink ? 'SIM ✅' : 'NÃO ❌'}`);
      console.log(`   Link original: ${testAffiliateLink.substring(0, 80)}...`);
      console.log(`   Link salvo: ${savedLink.substring(0, 80)}...`);
    }

  } catch (error) {
    console.error(`\n❌ Erro:`);
    console.error(`   Mensagem: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.request) {
      console.error(`   Request:`, error.request);
    }
  }

  console.log('\n✅ Teste concluído!');
  console.log('\n💡 Dica: Verifique os logs do servidor para ver o processo completo.');
}

testApproveWithShorten().catch(console.error);



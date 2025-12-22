import axios from 'axios';

/**
 * Script para testar o endpoint de aprovação com encurtamento
 * 
 * IMPORTANTE: Este script precisa de:
 * 1. Um produto pendente no banco de dados
 * 2. Um token de autenticação válido
 * 3. O servidor backend rodando
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Configure seu token aqui

async function testApproveEndpoint() {
  console.log('🧪 Testando endpoint de aprovação com encurtamento...\n');

  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN não configurado. Configure no .env ou passe como variável de ambiente.');
    console.log('   Exemplo: AUTH_TOKEN=seu_token npm run test:approve-endpoint');
    return;
  }

  // Você precisa fornecer um ID de produto pendente real
  const PRODUCT_ID = process.env.PRODUCT_ID || '';
  
  if (!PRODUCT_ID) {
    console.error('❌ PRODUCT_ID não fornecido. Configure no .env ou passe como variável de ambiente.');
    console.log('   Exemplo: PRODUCT_ID=uuid-do-produto npm run test:approve-endpoint');
    return;
  }

  const testAffiliateLink = 'https://pt.aliexpress.com/item/1005001234567890.html?aff_trace_key=abc123&terminal_id=MTWPromo';

  console.log(`📝 Testando com:`);
  console.log(`   Product ID: ${PRODUCT_ID}`);
  console.log(`   Link original: ${testAffiliateLink}\n`);

  // Teste 1: Aprovar SEM encurtar
  console.log('📝 Teste 1: Aprovar SEM encurtar link');
  try {
    const response1 = await axios.post(
      `${API_URL}/api/products/pending/${PRODUCT_ID}/approve`,
      {
        affiliate_link: testAffiliateLink,
        shorten_link: false
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ Sucesso!`);
    console.log(`   Link salvo: ${response1.data.data?.product?.affiliate_link || 'N/A'}`);
    console.log(`   Link é encurtado: ${response1.data.data?.product?.affiliate_link !== testAffiliateLink ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    console.log('');
  }

  // Teste 2: Aprovar COM encurtamento
  console.log('📝 Teste 2: Aprovar COM encurtamento de link');
  try {
    const response2 = await axios.post(
      `${API_URL}/api/products/pending/${PRODUCT_ID}/approve`,
      {
        affiliate_link: testAffiliateLink,
        shorten_link: true
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ Sucesso!`);
    console.log(`   Link salvo: ${response2.data.data?.product?.affiliate_link || 'N/A'}`);
    console.log(`   Link é encurtado: ${response2.data.data?.product?.affiliate_link !== testAffiliateLink ? 'SIM' : 'NÃO'}`);
    console.log(`   Link começa com https://: ${response2.data.data?.product?.affiliate_link?.startsWith('https://') ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    console.log('');
  }

  console.log('✅ Testes concluídos!');
  console.log('\n💡 Dica: Verifique os logs do servidor para ver o processo completo de encurtamento.');
}

testApproveEndpoint().catch(console.error);



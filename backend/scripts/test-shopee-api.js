import axios from 'axios';
import crypto from 'crypto';

/**
 * Script de teste para API da Shopee
 * Testa autenticação e requisições básicas
 */

// Credenciais fornecidas pela Shopee
const APP_ID = '18349000441';
const SECRET = 'LDIJV6UD5UMSSK4AB3F7WCWHBILR5BQD';

// URL base da API Shopee
const API_BASE_URL = 'https://partner.shopeemobile.com/api/v2';

/**
 * Gerar assinatura HMAC-SHA256 conforme documentação Shopee
 */
function generateSignature(partnerId, apiPath, timestamp, accessToken = '', shopId = '') {
  // Base string: partner_id + api_path + timestamp + access_token + shop_id
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  
  console.log('\n🔐 === GERANDO ASSINATURA ===');
  console.log(`   Partner ID: ${partnerId}`);
  console.log(`   API Path: ${apiPath}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Access Token: ${accessToken || '(vazio)'}`);
  console.log(`   Shop ID: ${shopId || '(vazio)'}`);
  console.log(`   Base String: ${baseString}`);
  
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(baseString)
    .digest('hex');
  
  console.log(`   Signature: ${signature}`);
  console.log('   ✅ Assinatura gerada com sucesso\n');
  
  return signature;
}

/**
 * Fazer requisição de teste para a API Shopee
 */
async function testShopeeAPI(endpoint, params = {}) {
  try {
    console.log(`\n🚀 === TESTANDO ENDPOINT: ${endpoint} ===`);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = `/api/v2${endpoint}`;
    
    // Gerar assinatura
    const signature = generateSignature(APP_ID, apiPath, timestamp);
    
    // Construir URL
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Parâmetros da requisição
    const requestParams = {
      partner_id: APP_ID,
      timestamp,
      sign: signature,
      ...params
    };
    
    console.log(`📤 === ENVIANDO REQUISIÇÃO ===`);
    console.log(`   URL: ${url}`);
    console.log(`   Método: GET`);
    console.log(`   Parâmetros:`, JSON.stringify(requestParams, null, 2));
    
    // Fazer requisição
    const response = await axios.get(url, {
      params: requestParams,
      timeout: 30000,
      validateStatus: (status) => status < 500 // Não lançar erro para 4xx
    });
    
    console.log(`\n📥 === RESPOSTA RECEBIDA ===`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log(`\n✅ === SUCESSO! ===`);
      console.log(`   A API Shopee respondeu com sucesso!`);
      return { success: true, data: response.data };
    } else {
      console.log(`\n⚠️ === RESPOSTA COM ERRO ===`);
      if (response.data && response.data.error) {
        console.log(`   Erro: ${response.data.error}`);
        console.log(`   Mensagem: ${response.data.message || 'N/A'}`);
        if (response.data.request_id) {
          console.log(`   Request ID: ${response.data.request_id}`);
        }
      }
      return { success: false, status: response.status, data: response.data };
    }
  } catch (error) {
    console.log(`\n❌ === ERRO NA REQUISIÇÃO ===`);
    if (error.response) {
      console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      return { 
        success: false, 
        status: error.response.status, 
        data: error.response.data,
        error: error.message 
      };
    } else if (error.request) {
      console.log(`   Erro: Nenhuma resposta recebida`);
      console.log(`   Detalhes:`, error.message);
      return { success: false, error: error.message };
    } else {
      console.log(`   Erro:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Executar testes
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE DE API SHOPEE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📋 Credenciais:`);
  console.log(`   AppID (Partner ID): ${APP_ID}`);
  console.log(`   Secret (Partner Key): ${SECRET.substring(0, 8)}... (${SECRET.length} caracteres)`);
  console.log(`   API Base URL: ${API_BASE_URL}`);
  
  const results = [];
  
  // Teste 1: Endpoint básico de teste (shop/get_info)
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('TESTE 1: shop/get_info');
  console.log('═══════════════════════════════════════════════════════════');
  const result1 = await testShopeeAPI('/shop/get_info');
  results.push({ test: 'shop/get_info', ...result1 });
  
  // Aguardar 2 segundos entre requisições
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 2: product/get_item_list (sem parâmetros adicionais)
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('TESTE 2: product/get_item_list');
  console.log('═══════════════════════════════════════════════════════════');
  const result2 = await testShopeeAPI('/product/get_item_list', {
    pagination_offset: 0,
    pagination_entries_per_page: 10
  });
  results.push({ test: 'product/get_item_list', ...result2 });
  
  // Aguardar 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Teste 3: product/get_item_base_info (requer item_id e shop_id)
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('TESTE 3: product/get_item_base_info (com item_id de exemplo)');
  console.log('═══════════════════════════════════════════════════════════');
  // Usando um item_id de exemplo (pode não existir, mas testa a autenticação)
  const result3 = await testShopeeAPI('/product/get_item_base_info', {
    item_id_list: '123456789',
    need_tax_info: false,
    need_complaint_policy: false
  });
  results.push({ test: 'product/get_item_base_info', ...result3 });
  
  // Resumo dos testes
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════════');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.test}:`);
    if (result.success) {
      console.log(`   ✅ SUCESSO (Status: ${result.status || 200})`);
    } else {
      console.log(`   ❌ FALHOU (Status: ${result.status || 'N/A'})`);
      if (result.data && result.data.error) {
        console.log(`   Erro: ${result.data.error}`);
        console.log(`   Mensagem: ${result.data.message || 'N/A'}`);
      }
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n\n📈 RESULTADO FINAL: ${successCount}/${totalCount} testes passaram`);
  
  if (successCount === 0) {
    console.log('\n⚠️ Nenhum teste passou. Possíveis causas:');
    console.log('   1. AppID/Secret incorretos ou não ativados na Shopee');
    console.log('   2. AppID ainda não foi aprovado pela Shopee');
    console.log('   3. Problemas de rede ou API temporariamente indisponível');
    console.log('   4. Assinatura gerada incorretamente (verifique os logs acima)');
  } else if (successCount < totalCount) {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima para detalhes.');
  } else {
    console.log('\n🎉 Todos os testes passaram! A API está funcionando corretamente.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Executar testes
runTests().catch(error => {
  console.error('\n❌ Erro fatal ao executar testes:', error);
  process.exit(1);
});







import axios from 'axios';
import crypto from 'crypto';

/**
 * Script de teste para API de AFILIADOS da Shopee Brasil
 * A API de afiliados pode ter endpoints e autenticação diferentes
 */

// Credenciais fornecidas pela Shopee (API de Afiliados)
const APP_ID = '18349000441';
const SECRET = 'LDIJV6UD5UMSSK4AB3F7WCWHBILR5BQD';

// Possíveis URLs da API de Afiliados
const AFFILIATE_API_URLS = [
  'https://affiliate.shopee.com.br/api',
  'https://api.affiliate.shopee.com.br',
  'https://open-api.affiliate.shopee.com.br',
  'https://partner.shopeemobile.com/api/v2', // API Partner (pode ser diferente)
  'https://open.shopee.com/api/v2' // API Open Platform
];

/**
 * Gerar assinatura para API de Afiliados
 * Pode ter formato diferente da API Partner
 */
function generateAffiliateSignature(appId, endpoint, timestamp, params = {}) {
  // Tentar diferentes formatos de assinatura
  
  // Formato 1: app_id + endpoint + timestamp + secret
  const baseString1 = `${appId}${endpoint}${timestamp}${SECRET}`;
  
  // Formato 2: app_id + timestamp + secret (sem endpoint)
  const baseString2 = `${appId}${timestamp}${SECRET}`;
  
  // Formato 3: app_id + endpoint + timestamp + params ordenados + secret
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const baseString3 = `${appId}${endpoint}${timestamp}${sortedParams}${SECRET}`;
  
  console.log('\n🔐 === GERANDO ASSINATURAS (múltiplos formatos) ===');
  console.log(`   AppID: ${appId}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Secret: ${SECRET.substring(0, 8)}...`);
  console.log(`\n   Formato 1 (app_id + endpoint + timestamp + secret):`);
  console.log(`   Base String: ${appId}${endpoint}${timestamp}[SECRET]`);
  console.log(`   Signature: ${crypto.createHmac('sha256', SECRET).update(baseString1).digest('hex')}`);
  console.log(`\n   Formato 2 (app_id + timestamp + secret):`);
  console.log(`   Base String: ${appId}${timestamp}[SECRET]`);
  console.log(`   Signature: ${crypto.createHmac('sha256', SECRET).update(baseString2).digest('hex')}`);
  console.log(`\n   Formato 3 (app_id + endpoint + timestamp + params + secret):`);
  console.log(`   Base String: ${appId}${endpoint}${timestamp}${sortedParams}[SECRET]`);
  console.log(`   Signature: ${crypto.createHmac('sha256', SECRET).update(baseString3).digest('hex')}`);
  
  // Retornar formato 1 por padrão (mais comum)
  return {
    format1: crypto.createHmac('sha256', SECRET).update(baseString1).digest('hex'),
    format2: crypto.createHmac('sha256', SECRET).update(baseString2).digest('hex'),
    format3: crypto.createHmac('sha256', SECRET).update(baseString3).digest('hex')
  };
}

/**
 * Testar endpoint de afiliados
 */
async function testAffiliateEndpoint(baseUrl, endpoint, method = 'GET', params = {}, signatureFormat = 'format1') {
  const timestamp = Math.floor(Date.now() / 1000);
  const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${fullEndpoint}`;
  
  try {
    
    // Gerar assinaturas
    const signatures = generateAffiliateSignature(APP_ID, fullEndpoint, timestamp, params);
    const signature = signatures[signatureFormat];
    
    // Preparar requisição
    const requestConfig = {
      method: method.toLowerCase(),
      url,
      timeout: 30000,
      validateStatus: (status) => status < 500
    };
    
    // Adicionar parâmetros
    if (method === 'GET') {
      requestConfig.params = {
        app_id: APP_ID,
        timestamp,
        sign: signature,
        ...params
      };
    } else {
      requestConfig.data = {
        app_id: APP_ID,
        timestamp,
        sign: signature,
        ...params
      };
      requestConfig.headers = {
        'Content-Type': 'application/json'
      };
    }
    
    console.log(`\n📤 === ENVIANDO REQUISIÇÃO ===`);
    console.log(`   URL: ${url}`);
    console.log(`   Método: ${method}`);
    console.log(`   Formato de Assinatura: ${signatureFormat}`);
    console.log(`   Parâmetros:`, JSON.stringify(requestConfig.params || requestConfig.data, null, 2));
    
    const response = await axios(requestConfig);
    
    console.log(`\n📥 === RESPOSTA RECEBIDA ===`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log(`\n✅ === SUCESSO! ===`);
      return { success: true, data: response.data, url, signatureFormat };
    } else {
      console.log(`\n⚠️ === RESPOSTA COM ERRO ===`);
      if (response.data && response.data.error) {
        console.log(`   Erro: ${response.data.error}`);
        console.log(`   Mensagem: ${response.data.message || 'N/A'}`);
      }
      return { success: false, status: response.status, data: response.data, url, signatureFormat };
    }
  } catch (error) {
    console.log(`\n❌ === ERRO NA REQUISIÇÃO ===`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      return { 
        success: false, 
        status: error.response.status, 
        data: error.response.data,
        url: url || `${baseUrl}${fullEndpoint}`,
        signatureFormat,
        error: error.message 
      };
    } else {
      console.log(`   Erro:`, error.message);
      return { 
        success: false, 
        error: error.message, 
        url: url || `${baseUrl}${fullEndpoint}`, 
        signatureFormat 
      };
    }
  }
}

/**
 * Testar múltiplos formatos e URLs
 */
async function testAffiliateAPI() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TESTE DE API DE AFILIADOS SHOPEE BRASIL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📋 Credenciais:`);
  console.log(`   AppID: ${APP_ID}`);
  console.log(`   Secret: ${SECRET.substring(0, 8)}... (${SECRET.length} caracteres)`);
  
  const results = [];
  
  // Endpoints comuns de API de Afiliados
  const endpoints = [
    '/v1/product/list', // Listar produtos
    '/v1/product/detail', // Detalhes do produto
    '/v1/deal/list', // Listar deals
    '/v1/category/list', // Listar categorias
    '/product/list', // Sem versão
    '/deal/list', // Sem versão
    '/category/list', // Sem versão
    '/api/v1/product/list', // Com /api
    '/api/v1/deal/list' // Com /api
  ];
  
  // Testar cada URL base
  for (const baseUrl of AFFILIATE_API_URLS) {
    console.log(`\n\n═══════════════════════════════════════════════════════════`);
    console.log(`🌐 TESTANDO URL BASE: ${baseUrl}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Testar alguns endpoints principais
    const testEndpoints = endpoints.slice(0, 3); // Limitar para não demorar muito
    
    for (const endpoint of testEndpoints) {
      // Testar diferentes formatos de assinatura
      for (const format of ['format1', 'format2', 'format3']) {
        const result = await testAffiliateEndpoint(
          baseUrl, 
          endpoint, 
          'GET', 
          { limit: 10, offset: 0 },
          format
        );
        
        results.push({
          baseUrl,
          endpoint,
          format,
          ...result
        });
        
        // Se funcionou, parar de testar outros formatos para este endpoint
        if (result.success) {
          console.log(`\n🎉 FUNCIONOU! Parando testes para este endpoint.`);
          break;
        }
        
        // Aguardar 1 segundo entre requisições
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Resumo
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════════════');
  
  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  if (successResults.length > 0) {
    console.log(`\n✅ ${successResults.length} teste(s) passaram:`);
    successResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.baseUrl}${result.endpoint}`);
      console.log(`   Formato: ${result.signatureFormat}`);
      console.log(`   Status: 200 OK`);
    });
  }
  
  if (failedResults.length > 0) {
    console.log(`\n❌ ${failedResults.length} teste(s) falharam`);
    // Agrupar por erro
    const errors = {};
    failedResults.forEach(result => {
      const errorKey = result.data?.error || result.error || 'unknown';
      if (!errors[errorKey]) errors[errorKey] = [];
      errors[errorKey].push(result);
    });
    
    Object.entries(errors).forEach(([error, results]) => {
      console.log(`\n   Erro: ${error} (${results.length} ocorrências)`);
      if (results[0].data?.message) {
        console.log(`   Mensagem: ${results[0].data.message}`);
      }
    });
  }
  
  console.log(`\n\n📈 RESULTADO FINAL: ${successResults.length}/${results.length} testes passaram`);
  
  if (successResults.length === 0) {
    console.log('\n⚠️ Nenhum teste passou. Possíveis causas:');
    console.log('   1. URL da API de afiliados diferente');
    console.log('   2. Formato de autenticação diferente');
    console.log('   3. AppID/Secret incorretos ou não ativados');
    console.log('   4. API de afiliados requer configuração adicional');
    console.log('\n💡 Dica: Verifique a documentação em https://www.affiliateshopee.com.br/');
    console.log('   ou use o API Playground para testar: https://www.affiliateshopee.com.br/');
  } else {
    console.log('\n🎉 Encontramos uma combinação que funciona!');
    console.log('   Use essas configurações no sistema.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Executar testes
testAffiliateAPI().catch(error => {
  console.error('\n❌ Erro fatal ao executar testes:', error);
  process.exit(1);
});









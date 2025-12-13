/**
 * Teste Completo da API do Mercado Livre
 * Execute: node scripts/test-meli-api.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🔍 TESTE DA API DO MERCADO LIVRE\n');
console.log('='.repeat(70));

const baseUrl = process.env.MELI_API_URL;
const token = process.env.MELI_ACCESS_TOKEN;

// Endpoints para testar
const endpoints = [
  { 
    name: 'Site do Brasil',
    url: '/sites/MLB',
    needsAuth: false
  },
  { 
    name: 'Categorias',
    url: '/sites/MLB/categories',
    needsAuth: false
  },
  {
    name: 'Busca de Produtos (ofertas)',
    url: '/sites/MLB/search',
    params: { q: 'oferta', limit: 5 },
    needsAuth: false
  },
  {
    name: 'Trends/Hot Products',
    url: '/trends/MLB',
    needsAuth: false
  },
  {
    name: 'Deals (pode não existir)',
    url: '/deals/MLB',
    needsAuth: true
  },
  {
    name: 'Promociones (promoções)',
    url: '/promotions/MLB',
    needsAuth: true
  }
];

async function testEndpoint(endpoint) {
  try {
    const config = {
      params: endpoint.params || {},
      timeout: 10000
    };

    if (endpoint.needsAuth) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    const response = await axios.get(`${baseUrl}${endpoint.url}`, config);
    
    console.log(`✅ ${endpoint.name}`);
    console.log(`   Status: ${response.status}`);
    
    // Mostrar preview dos dados
    if (response.data) {
      if (Array.isArray(response.data)) {
        console.log(`   Resultados: ${response.data.length} items`);
      } else if (response.data.results) {
        console.log(`   Resultados: ${response.data.results.length} items`);
      } else if (response.data.paging) {
        console.log(`   Total: ${response.data.paging.total} items`);
      } else {
        console.log(`   Dados recebidos: ${Object.keys(response.data).join(', ')}`);
      }
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log(`❌ ${endpoint.name}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status} - ${error.response.statusText}`);
      
      if (error.response.status === 404) {
        console.log(`   Motivo: Endpoint não existe ou foi descontinuado`);
      } else if (error.response.status === 401) {
        console.log(`   Motivo: Token inválido ou expirado`);
      } else if (error.response.data?.message) {
        console.log(`   Motivo: ${error.response.data.message}`);
      }
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

// Executar testes
console.log('\n📊 Testando Endpoints:\n');

let successCount = 0;
let failCount = 0;
const workingEndpoints = [];

for (const endpoint of endpoints) {
  const result = await testEndpoint(endpoint);
  console.log('');
  
  if (result.success) {
    successCount++;
    workingEndpoints.push(endpoint);
  } else {
    failCount++;
  }
  
  // Delay entre requisições
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Resumo
console.log('='.repeat(70));
console.log('\n📋 RESUMO:\n');
console.log(`✅ Endpoints funcionando: ${successCount}`);
console.log(`❌ Endpoints com erro: ${failCount}`);

if (workingEndpoints.length > 0) {
  console.log('\n🎯 Endpoints Disponíveis:\n');
  workingEndpoints.forEach(ep => {
    console.log(`   ✓ ${ep.name}: ${ep.url}`);
  });
}

// Recomendações
console.log('\n💡 RECOMENDAÇÕES:\n');

if (successCount === 0) {
  console.log('❌ Nenhum endpoint funcionou!');
  console.log('   - Verifique se o token está válido');
  console.log('   - Verifique sua conexão com internet');
  console.log('   - O Mercado Livre pode estar indisponível');
} else if (failCount > 0) {
  console.log('⚠️  Alguns endpoints não funcionaram:');
  console.log('   - Isso é normal! Nem todos os endpoints são públicos');
  console.log('   - O sistema usará os endpoints disponíveis');
  console.log('   - Ajustaremos o código para usar endpoints válidos');
}

// Sugestão de estratégia
console.log('\n🎯 ESTRATÉGIA PARA CAPTURA:\n');
console.log('1. Usar busca de produtos com filtro "oferta"');
console.log('2. Buscar produtos em trends/hot products');
console.log('3. Extrair descontos e criar cupons virtuais');
console.log('4. Monitorar preços e gerar alertas');

console.log('\n' + '='.repeat(70) + '\n');

// Se nenhum endpoint funcionou, retornar erro
if (successCount === 0) {
  process.exit(1);
}

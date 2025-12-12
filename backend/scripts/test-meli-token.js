// Script para testar Access Token do Mercado Livre
// Uso: node scripts/test-meli-token.js

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ACCESS_TOKEN = process.env.MELI_ACCESS_TOKEN;

console.log('🧪 Testando Access Token do Mercado Livre\n');

if (!ACCESS_TOKEN) {
  console.error('❌ MELI_ACCESS_TOKEN não encontrado no .env');
  console.log('\nℹ️  Execute primeiro: node scripts/get-meli-token.js\n');
  process.exit(1);
}

async function testToken() {
  try {
    console.log('1️⃣ Testando autenticação...\n');

    // Testar token obtendo dados do usuário
    const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    const user = userResponse.data;

    console.log('✅ Token válido!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Dados do Usuário:\n');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nickname: ${user.nickname}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   País: ${user.country_id}`);
    console.log(`   Site: ${user.site_id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Testar busca de produtos
    console.log('2️⃣ Testando busca de produtos...\n');

    const searchResponse = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
      params: {
        q: 'smartphone',
        limit: 5
      }
    });

    const products = searchResponse.data.results;

    console.log(`✅ Encontrados ${searchResponse.data.paging.total} produtos\n`);
    console.log('📦 Primeiros 5 produtos:\n');

    products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.title}`);
      console.log(`      Preço: R$ ${product.price}`);
      console.log(`      Link: ${product.permalink}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Integração com Mercado Livre está funcionando!\n');

  } catch (error) {
    console.error('❌ Erro ao testar token:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Erro:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n⚠️  Token inválido ou expirado.');
        console.log('   Execute: node scripts/refresh-meli-token.js\n');
      }
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

testToken();

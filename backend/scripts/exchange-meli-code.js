// Script para trocar CODE por ACCESS TOKEN do Mercado Livre
// Uso: node scripts/exchange-meli-code.js TG-seu-code-aqui

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const CLIENT_ID = process.env.MELI_CLIENT_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;
const REDIRECT_URI = 'https://www.google.com';

// Pegar CODE dos argumentos
const code = process.argv[2];

console.log('🔄 Trocando CODE por ACCESS TOKEN do Mercado Livre\n');

if (!code) {
  console.error('❌ CODE não fornecido!\n');
  console.log('📋 Uso correto:');
  console.log('   node scripts/exchange-meli-code.js TG-seu-code-aqui\n');
  console.log('💡 Exemplo:');
  console.log('   node scripts/exchange-meli-code.js TG-693c3048d3465600017a2371-260114746\n');
  process.exit(1);
}

// Limpar CODE (remover parâmetros extras se houver)
const cleanCode = code.split('&')[0].trim();

console.log('📋 Informações:');
console.log(`   CODE: ${cleanCode.substring(0, 30)}...`);
console.log(`   Client ID: ${CLIENT_ID}`);
console.log(`   Redirect URI: ${REDIRECT_URI}\n`);

async function exchangeCode() {
  try {
    console.log('📡 Enviando requisição para Mercado Livre...\n');

    // IMPORTANTE: Enviar parâmetros no body (não querystring) conforme documentação de segurança
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('code', cleanCode);
    params.append('redirect_uri', REDIRECT_URI);

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in, user_id } = response.data;

    console.log('✅ TOKENS OBTIDOS COM SUCESSO!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 COPIE ESTES VALORES PARA O backend/.env:\n');
    console.log(`MELI_ACCESS_TOKEN=${access_token}`);
    console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ℹ️  Informações adicionais:');
    console.log(`   User ID: ${user_id}`);
    console.log(`   Expira em: ${expires_in} segundos (${expires_in / 3600} horas)`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Copie os tokens acima');
    console.log('   2. Cole no arquivo backend/.env');
    console.log('   3. O access_token expira em 6 horas');
    console.log('   4. Use refresh-meli-token.js para renovar\n');
    console.log('✅ Próximo passo: node scripts/test-meli-token.js\n');

  } catch (error) {
    console.error('❌ Erro ao trocar CODE por TOKEN:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Erro:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.message === 'invalid_grant') {
        console.log('\n⚠️  Possíveis causas:');
        console.log('   1. CODE expirou (válido por 10 minutos)');
        console.log('   2. CODE já foi usado');
        console.log('   3. CODE inválido');
        console.log('\n💡 Solução:');
        console.log('   Gere um novo CODE acessando:');
        console.log('   https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI));
        console.log('\n');
      } else if (error.response.data.message === 'invalid_client') {
        console.log('\n⚠️  Client ID ou Secret incorretos!');
        console.log('   Verifique as credenciais no .env\n');
      }
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

exchangeCode();

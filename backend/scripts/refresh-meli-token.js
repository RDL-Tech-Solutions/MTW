// Script para renovar Access Token do Mercado Livre
// Uso: node scripts/refresh-meli-token.js

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const CLIENT_ID = process.env.MELI_CLIENT_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.MELI_REFRESH_TOKEN;

console.log('🔄 Renovando Access Token do Mercado Livre\n');

if (!REFRESH_TOKEN) {
  console.error('❌ MELI_REFRESH_TOKEN não encontrado no .env');
  console.log('\nℹ️  Execute primeiro: node scripts/get-meli-token.js\n');
  process.exit(1);
}

async function refreshToken() {
  try {
    console.log('📡 Enviando requisição para Mercado Livre...\n');

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    console.log('✅ Token renovado com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ATUALIZE ESTES VALORES NO .env:\n');
    console.log(`MELI_ACCESS_TOKEN=${access_token}`);
    console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ℹ️  Informações:');
    console.log(`   Expira em: ${expires_in} segundos (${expires_in / 3600} horas)`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Atualize os tokens no backend/.env');
    console.log('   - O novo access_token expira em 6 horas');
    console.log('   - O refresh_token também foi renovado\n');

  } catch (error) {
    console.error('❌ Erro ao renovar token:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Erro:', error.response.data);
      
      if (error.response.data.message === 'invalid_token') {
        console.log('\n⚠️  O refresh_token expirou ou é inválido.');
        console.log('   Execute: node scripts/get-meli-token.js\n');
      }
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

refreshToken();

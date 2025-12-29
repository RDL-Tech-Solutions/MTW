// Script para trocar código de autorização por tokens do Mercado Livre
// E salvar automaticamente no banco de dados

import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Suas credenciais
const CLIENT_ID = '1016544593231768';
const CLIENT_SECRET = '2VA7yCY4fEPX7PWEvwG0rrq6N0qKzxfG';
const AUTHORIZATION_CODE = 'TG-69528776593e890001e4954a-432803229';
const REDIRECT_URI = 'http://localhost:3000/api/auth/meli/callback';

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function exchangeCodeForTokens() {
  console.log('🔐 Trocando código por tokens do Mercado Livre...\n');

  try {
    // Preparar parâmetros
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('code', AUTHORIZATION_CODE);
    params.append('redirect_uri', REDIRECT_URI);

    console.log('📤 Enviando requisição para Mercado Livre...');

    // Trocar código por tokens
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    const { access_token, refresh_token, expires_in, user_id } = response.data;

    console.log('\n✅ Tokens obtidos com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 INFORMAÇÕES:');
    console.log(`   User ID: ${user_id}`);
    console.log(`   Expira em: ${expires_in} segundos (${Math.floor(expires_in / 3600)} horas)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Salvar no banco de dados
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      console.log('💾 Salvando tokens no banco de dados...');

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const { error } = await supabase
        .from('app_settings')
        .update({
          meli_client_id: CLIENT_ID,
          meli_client_secret: CLIENT_SECRET,
          meli_access_token: access_token,
          meli_refresh_token: refresh_token,
          meli_user_id: user_id.toString(),
          meli_redirect_uri: REDIRECT_URI
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        console.error('❌ Erro ao salvar no banco:', error.message);
        throw error;
      }

      console.log('✅ Tokens salvos no banco de dados com sucesso!\n');
    } else {
      console.log('⚠️  Supabase não configurado. Tokens não salvos no banco.\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TOKENS (Copie e salve em local seguro):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`MELI_CLIENT_ID=${CLIENT_ID}`);
    console.log(`MELI_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`MELI_ACCESS_TOKEN=${access_token}`);
    console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
    console.log(`MELI_USER_ID=${user_id}`);
    console.log(`MELI_REDIRECT_URI=${REDIRECT_URI}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ O sistema já está pronto para usar a API do Mercado Livre.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO ao trocar código por tokens:\n');

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMsg = errorData.message || errorData.error || 'Erro desconhecido';

      console.error(`   Status: ${status}`);
      console.error(`   Mensagem: ${errorMsg}`);
      console.error(`   Detalhes:`, JSON.stringify(errorData, null, 2));

      if (status === 400) {
        if (errorMsg.includes('invalid_grant') || errorMsg.includes('expired') || errorMsg.includes('already used')) {
          console.error('\n⚠️  O código de autorização expirou ou já foi usado.');
          console.error('💡 SOLUÇÃO:');
          console.error('   1. Acesse: https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI));
          console.error('   2. Autorize novamente');
          console.error('   3. Copie o NOVO código da URL');
          console.error('   4. Edite este script com o novo código');
          console.error('   5. Execute novamente\n');
        }
      }
    } else {
      console.error(`   Erro: ${error.message}`);
    }

    process.exit(1);
  }
}

// Executar
exchangeCodeForTokens();

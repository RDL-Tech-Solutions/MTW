import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFcmToken() {
  try {
    console.log('🔍 Verificando tokens FCM do usuário robertosshbrasil@gmail.com...\n');

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, push_enabled')
      .eq('email', 'robertosshbrasil@gmail.com')
      .single();

    if (userError || !user) {
      console.error('❌ Usuário não encontrado');
      return;
    }

    console.log('✅ Usuário encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Push Enabled: ${user.push_enabled}`);
    console.log('');

    // Buscar tokens FCM
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', user.id);

    if (tokensError) {
      console.error('❌ Erro ao buscar tokens:', tokensError.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ Nenhum token FCM registrado para este usuário');
      console.log('');
      console.log('📱 AÇÃO NECESSÁRIA:');
      console.log('   1. Abra o app no celular');
      console.log('   2. Faça login com robertosshbrasil@gmail.com');
      console.log('   3. Aceite permissão de notificações');
      console.log('   4. Execute este script novamente');
      return;
    }

    console.log(`📱 ${tokens.length} token(s) FCM encontrado(s):\n`);

    for (const token of tokens) {
      console.log('─────────────────────────────────────────────────');
      console.log(`Token ID: ${token.id}`);
      console.log(`Token (primeiros 50 chars): ${token.fcm_token.substring(0, 50)}...`);
      console.log(`Token (últimos 20 chars): ...${token.fcm_token.substring(token.fcm_token.length - 20)}`);
      console.log(`Token completo length: ${token.fcm_token.length} caracteres`);
      console.log(`Device ID: ${token.device_id || 'N/A'}`);
      console.log(`Platform: ${token.platform || 'N/A'}`);
      console.log(`Criado em: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
      console.log(`Atualizado em: ${new Date(token.updated_at).toLocaleString('pt-BR')}`);
      console.log('');

      // Validar formato do token
      const isValidFormat = token.fcm_token && 
                           typeof token.fcm_token === 'string' && 
                           token.fcm_token.length > 100 && 
                           !token.fcm_token.includes(' ');

      if (isValidFormat) {
        console.log('✅ Formato do token parece válido');
      } else {
        console.log('❌ Formato do token parece INVÁLIDO');
        if (!token.fcm_token) console.log('   - Token está vazio');
        if (token.fcm_token && token.fcm_token.length <= 100) console.log('   - Token muito curto');
        if (token.fcm_token && token.fcm_token.includes(' ')) console.log('   - Token contém espaços');
      }
      console.log('');
    }

    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('🧪 TESTE DE ENVIO');
    console.log('');
    console.log('Para testar o envio de notificação com este token, execute:');
    console.log('');
    console.log('node scripts/test-fcm-send-direct.js');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

testFcmToken();

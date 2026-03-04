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

async function findUsers() {
  try {
    console.log('🔍 Buscando usuários com tokens FCM...\n');

    // Buscar todos os tokens FCM
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('user_id, fcm_token, device_id, platform, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (tokensError) {
      console.error('❌ Erro ao buscar tokens:', tokensError.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ Nenhum token FCM registrado no banco');
      console.log('');
      console.log('📱 AÇÃO NECESSÁRIA:');
      console.log('   1. Abra o app no celular');
      console.log('   2. Faça login');
      console.log('   3. Aceite permissão de notificações');
      console.log('   4. Execute este script novamente');
      return;
    }

    console.log(`📱 ${tokens.length} token(s) FCM encontrado(s)\n`);

    // Buscar usuários correspondentes
    const userIds = [...new Set(tokens.map(t => t.user_id))];
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, push_enabled')
      .in('id', userIds);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }

    // Mapear usuários
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u;
    });

    // Exibir informações
    for (const token of tokens) {
      const user = userMap[token.user_id];
      
      console.log('─────────────────────────────────────────────────');
      console.log(`👤 Usuário: ${user?.email || 'Desconhecido'}`);
      console.log(`   ID: ${token.user_id}`);
      console.log(`   Nome: ${user?.name || 'N/A'}`);
      console.log(`   Push Enabled: ${user?.push_enabled ? '✅ Sim' : '❌ Não'}`);
      console.log('');
      console.log(`📱 Token FCM:`);
      console.log(`   Primeiros 50 chars: ${token.fcm_token.substring(0, 50)}...`);
      console.log(`   Últimos 20 chars: ...${token.fcm_token.substring(token.fcm_token.length - 20)}`);
      console.log(`   Length: ${token.fcm_token.length} caracteres`);
      console.log(`   Device ID: ${token.device_id || 'N/A'}`);
      console.log(`   Platform: ${token.platform || 'N/A'}`);
      console.log(`   Criado: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Atualizado: ${new Date(token.updated_at).toLocaleString('pt-BR')}`);
      console.log('');
    }

    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('🧪 Para testar envio de notificação, edite o email em:');
    console.log('   backend/scripts/test-fcm-send-direct.js');
    console.log('');
    console.log('E execute:');
    console.log('   node scripts/test-fcm-send-direct.js');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

findUsers();

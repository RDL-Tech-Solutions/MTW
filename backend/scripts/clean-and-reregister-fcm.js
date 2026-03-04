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

async function cleanAndReregister() {
  try {
    console.log('🧹 Limpando tokens Expo antigos...\n');

    // 1. Buscar todos os tokens Expo
    const { data: expoTokens, error: fetchError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .like('fcm_token', 'ExponentPushToken%');

    if (fetchError) {
      console.error('❌ Erro ao buscar tokens:', fetchError.message);
      return;
    }

    if (!expoTokens || expoTokens.length === 0) {
      console.log('✅ Nenhum token Expo encontrado. Banco está limpo!');
      console.log('');
    } else {
      console.log(`📱 ${expoTokens.length} token(s) Expo encontrado(s):\n`);

      for (const token of expoTokens) {
        console.log(`   - Token: ${token.fcm_token}`);
        console.log(`     User ID: ${token.user_id}`);
        console.log(`     Criado: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      }

      // 2. Deletar tokens Expo
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .like('fcm_token', 'ExponentPushToken%');

      if (deleteError) {
        console.error('❌ Erro ao deletar tokens:', deleteError.message);
        return;
      }

      console.log(`✅ ${expoTokens.length} token(s) Expo removido(s) do banco\n`);
    }

    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('📱 PRÓXIMOS PASSOS:');
    console.log('');
    console.log('1. Abra o app NATIVO no celular (não Expo Go)');
    console.log('2. Faça LOGOUT');
    console.log('3. Faça LOGIN novamente');
    console.log('4. Aceite permissão de notificações');
    console.log('5. Aguarde 5 segundos');
    console.log('');
    console.log('6. Execute para verificar novo token:');
    console.log('   node scripts/find-user-with-fcm.js');
    console.log('');
    console.log('7. Execute para testar envio:');
    console.log('   node scripts/test-fcm-send-direct.js');
    console.log('');
    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('✅ Token FCM válido deve ter ~150-200 caracteres');
    console.log('❌ Token Expo tem formato: ExponentPushToken[...]');
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

cleanAndReregister();

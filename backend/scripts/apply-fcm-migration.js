import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Aplicar migração para criar tabela fcm_tokens
 */
async function applyMigration() {
  console.log('🔄 ========== APLICANDO MIGRAÇÃO FCM_TOKENS ==========\n');

  try {
    // Ler arquivo de migração
    const migrationPath = path.resolve(__dirname, '../database/migrations/create_fcm_tokens_table.sql');
    console.log(`📄 Lendo migração: ${migrationPath}`);
    
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    console.log(`✅ Migração carregada (${migrationSQL.length} caracteres)\n`);

    // Executar migração
    console.log('⚙️ Executando migração...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // Tentar executar diretamente se RPC não existir
      console.log('⚠️ RPC exec_sql não disponível, tentando executar diretamente...\n');
      
      // Dividir em statements individuais
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length === 0) continue;

        console.log(`Executando statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error: stmtError } = await supabase.rpc('exec', {
            query: statement + ';'
          });

          if (stmtError) {
            console.error(`❌ Erro no statement ${i + 1}:`, stmtError.message);
            
            // Se for erro de "já existe", continuar
            if (stmtError.message.includes('already exists') || 
                stmtError.message.includes('duplicate')) {
              console.log(`   ⚠️ Objeto já existe, continuando...\n`);
              continue;
            }
            
            throw stmtError;
          }
        } catch (e) {
          console.error(`❌ Erro ao executar statement ${i + 1}:`, e.message);
          throw e;
        }
      }
    }

    console.log('\n✅ ========== MIGRAÇÃO APLICADA COM SUCESSO ==========\n');

    // Verificar se tabela foi criada
    console.log('🔍 Verificando tabela fcm_tokens...');
    const { data: tokens, error: checkError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Erro ao verificar tabela:', checkError.message);
      console.log('\n⚠️ A tabela pode não ter sido criada corretamente.');
      console.log('Execute a migração manualmente no Supabase SQL Editor:\n');
      console.log(`   ${migrationPath}\n`);
      return;
    }

    console.log('✅ Tabela fcm_tokens existe e está acessível\n');

    // Verificar tokens migrados
    const { data: allTokens, error: countError } = await supabase
      .from('fcm_tokens')
      .select('*');

    if (!countError) {
      console.log(`📊 Tokens migrados: ${allTokens?.length || 0}`);
      
      if (allTokens && allTokens.length > 0) {
        console.log('\n📋 Tokens encontrados:');
        for (const token of allTokens) {
          const { data: user } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', token.user_id)
            .single();

          console.log(`   - ${user?.email || token.user_id}`);
          console.log(`     Platform: ${token.platform || 'N/A'}`);
          console.log(`     Device: ${token.device_id || 'N/A'}`);
          console.log(`     Token: ${token.fcm_token.substring(0, 30)}...`);
          console.log('');
        }
      } else {
        console.log('\n⚠️ Nenhum token migrado de users.push_token');
        console.log('   Isso é normal se usuários ainda não registraram tokens FCM.\n');
      }
    }

    console.log('✅ ========== MIGRAÇÃO CONCLUÍDA ==========\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Execute: node scripts/debug-notifications.js');
    console.log('   2. Abra o app e faça login para registrar token FCM');
    console.log('   3. Execute novamente: node scripts/debug-notifications.js');
    console.log('   4. Teste notificações: node scripts/test-all-notifications-user.js\n');

  } catch (error) {
    console.error('\n❌ ========== ERRO NA MIGRAÇÃO ==========');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n💡 Solução alternativa:');
    console.error('   1. Acesse Supabase Dashboard');
    console.error('   2. Vá em SQL Editor');
    console.error('   3. Execute o conteúdo de:');
    console.error(`      ${path.resolve(__dirname, '../database/migrations/create_fcm_tokens_table.sql')}\n`);
    process.exit(1);
  }
}

// Executar
applyMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

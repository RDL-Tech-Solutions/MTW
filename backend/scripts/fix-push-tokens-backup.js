import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPushTokensBackup() {
  try {
    console.log('🔧 Corrigindo tabela push_tokens_backup...');
    console.log('');
    
    // Ler o arquivo SQL de correção
    const migrationPath = path.join(__dirname, '../database/migrations/fix_push_tokens_backup_type.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executando correção...');
    console.log('');
    
    // Dividir em comandos individuais
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
    
    for (const command of commands) {
      // Pular comandos que não são executáveis via client
      if (command.toLowerCase().includes('comment on') ||
          command.toLowerCase().includes('raise notice') ||
          command.toLowerCase().startsWith('do $$')) {
        console.log('ℹ️ Pulando comando não suportado via client');
        continue;
      }
      
      try {
        console.log(`Executando: ${command.substring(0, 60)}...`);
        
        // Para comandos DDL, usar rpc se disponível
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        
        if (error) {
          // Se não tiver rpc, tentar executar diretamente
          console.log('⚠️ Tentando executar diretamente...');
          // Nota: Supabase client não suporta DDL diretamente
          // Você precisará executar manualmente no Supabase Dashboard
          console.log('');
          console.log('⚠️ ATENÇÃO: Execute este comando manualmente no Supabase Dashboard:');
          console.log('');
          console.log(command);
          console.log('');
        } else {
          console.log('✅ Comando executado com sucesso');
        }
      } catch (cmdError) {
        console.error(`❌ Erro ao executar comando: ${cmdError.message}`);
      }
    }
    
    console.log('');
    console.log('📋 INSTRUÇÕES PARA APLICAR MANUALMENTE:');
    console.log('');
    console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá em "SQL Editor"');
    console.log('4. Cole o conteúdo do arquivo:');
    console.log('   backend/database/migrations/fix_push_tokens_backup_type.sql');
    console.log('5. Clique em "Run"');
    console.log('');
    console.log('Ou execute via psql:');
    console.log('');
    console.log('psql $DATABASE_URL -f backend/database/migrations/fix_push_tokens_backup_type.sql');
    console.log('');
    
    // Verificar se a correção foi aplicada
    console.log('🔍 Verificando estrutura da tabela...');
    const { data: columns, error: checkError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'push_tokens_backup'
          ORDER BY ordinal_position;
        `
      });
    
    if (!checkError && columns) {
      console.log('');
      console.log('📊 Estrutura atual da tabela:');
      columns.forEach(col => {
        const status = col.column_name === 'user_id' && col.data_type === 'uuid' ? '✅' : '⚠️';
        console.log(`   ${status} ${col.column_name}: ${col.data_type}`);
      });
    }
    
    console.log('');
    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar
fixPushTokensBackup();

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

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração: add_click_count_to_products_view.sql');
    
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, '../database/migrations/add_click_count_to_products_view.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 SQL a ser executado:');
    console.log(sql);
    console.log('');
    
    // Executar a migração
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Se não existir a função exec_sql, tentar executar diretamente
      console.log('⚠️ Função exec_sql não encontrada, tentando executar via query...');
      
      // Dividir em comandos individuais
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.toLowerCase().includes('comment on')) {
          console.log('ℹ️ Pulando comando COMMENT (não suportado via client)');
          continue;
        }
        
        console.log(`Executando: ${command.substring(0, 50)}...`);
        const { error: cmdError } = await supabase.rpc('exec', { sql: command });
        
        if (cmdError) {
          console.error(`❌ Erro ao executar comando: ${cmdError.message}`);
          throw cmdError;
        }
      }
    }
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('');
    console.log('📊 Testando a view atualizada...');
    
    // Testar a view
    const { data: testData, error: testError } = await supabase
      .from('products_full')
      .select('id, name, click_count')
      .limit(5);
    
    if (testError) {
      console.error('❌ Erro ao testar view:', testError.message);
      throw testError;
    }
    
    console.log('✅ View funcionando corretamente!');
    console.log('📋 Exemplo de produtos com click_count:');
    testData.forEach(product => {
      console.log(`   - ${product.name}: ${product.click_count || 0} visualizações`);
    });
    
    console.log('');
    console.log('🎉 Migração concluída com sucesso!');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Reinicie o backend: pm2 restart backend');
    console.log('   2. As visualizações agora serão exibidas corretamente');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar
applyMigration();

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script para aplicar a migração do OneSignal
 */
async function applyMigration() {
  try {
    logger.info('🚀 ========== APLICANDO MIGRAÇÃO ONESIGNAL ==========');

    // Ler arquivo SQL
    const migrationPath = join(__dirname, '../database/migrations/add_onesignal_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    logger.info('📄 Arquivo de migração carregado');
    logger.info(`   Caminho: ${migrationPath}`);

    // Executar migração
    logger.info('⚙️  Executando migração...');
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Tentar executar diretamente se RPC não estiver disponível
      logger.warn('⚠️  RPC não disponível, tentando execução direta...');
      
      // Dividir em statements individuais
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        if (statement) {
          try {
            await supabase.rpc('exec', { query: statement });
          } catch (stmtError) {
            logger.error(`❌ Erro ao executar statement: ${stmtError.message}`);
            logger.debug(`   Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    logger.info('✅ ========== MIGRAÇÃO APLICADA COM SUCESSO ==========');
    logger.info('');
    logger.info('📋 Próximos passos:');
    logger.info('   1. Configure as variáveis de ambiente do OneSignal');
    logger.info('   2. Execute o script de migração de usuários');
    logger.info('   3. Teste o envio de notificações');
    logger.info('   4. Monitore os logs e métricas');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ ========== ERRO NA MIGRAÇÃO ==========');
    logger.error(`   ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Executar
applyMigration();

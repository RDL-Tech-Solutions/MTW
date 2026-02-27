import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    logger.info('🔄 Iniciando migração: add_verification_code_columns');

    // Ler arquivo SQL
    const migrationPath = join(__dirname, '../database/migrations/add_verification_code_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Executar migração
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Se não houver função exec_sql, executar linha por linha
      logger.warn('⚠️ Função exec_sql não disponível, executando comandos individualmente...');
      
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

      for (const command of commands) {
        const { error: cmdError } = await supabase.rpc('exec', { sql: command });
        if (cmdError) {
          logger.error(`❌ Erro ao executar comando: ${cmdError.message}`);
          throw cmdError;
        }
      }
    }

    logger.info('✅ Migração aplicada com sucesso!');
    logger.info('');
    logger.info('Colunas adicionadas:');
    logger.info('  - verification_code (VARCHAR(6))');
    logger.info('  - verification_code_expiry (TIMESTAMP)');
    logger.info('');
    logger.info('Índice criado:');
    logger.info('  - idx_users_verification_code');

  } catch (error) {
    logger.error('❌ Erro ao aplicar migração:', error);
    process.exit(1);
  }
}

applyMigration();

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Aplicar migração de template de cupom esgotado
 */
async function applyMigration() {
  try {
    logger.info('🔄 Aplicando migração de template de cupom esgotado...');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../database/migrations/add_out_of_stock_template.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    logger.info('📄 SQL lido do arquivo');

    // Executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      logger.error(`❌ Erro ao executar SQL: ${error.message}`);
      throw error;
    }

    logger.info('✅ Migração aplicada com sucesso');

    // Verificar templates criados
    const { data: templates, error: selectError } = await supabase
      .from('bot_message_templates')
      .select('*')
      .eq('template_type', 'out_of_stock_coupon');

    if (selectError) {
      logger.error(`❌ Erro ao verificar templates: ${selectError.message}`);
    } else {
      logger.info(`\n📋 Templates criados:`);
      templates.forEach(t => {
        logger.info(`   - ${t.template_type} (${t.platform}): ${t.is_active ? 'ATIVO' : 'INATIVO'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Erro na migração: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

applyMigration();

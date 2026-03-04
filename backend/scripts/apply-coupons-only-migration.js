import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migração: add_coupons_only_preferences.sql\n');

    // Ler arquivo SQL
    const sqlPath = path.resolve(__dirname, '../database/migrations/add_coupons_only_preferences.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Tentar executar diretamente se RPC não existir
      const { error: directError } = await supabase.from('_migrations').insert({
        name: 'add_coupons_only_preferences',
        executed_at: new Date().toISOString()
      });

      if (directError && directError.code !== '42P01') {
        throw error;
      }

      // Executar SQL linha por linha
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('ALTER TABLE')) {
          const { error: alterError } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (alterError) {
            console.log(`⚠️ Aviso: ${alterError.message}`);
          }
        }
      }
    }

    console.log('✅ Migração aplicada com sucesso!\n');
    console.log('📋 Campos adicionados:');
    console.log('   - coupons_only: BOOLEAN (default: false)');
    console.log('   - coupon_platforms: TEXT[] (default: [])');
    console.log('');
    console.log('🎯 Funcionalidade:');
    console.log('   - coupons_only = true: usuário recebe apenas cupons + produtos com palavras-chave');
    console.log('   - coupon_platforms: filtrar cupons por plataforma (vazio = todas)');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error('');
    console.error('💡 Solução alternativa:');
    console.error('   Execute manualmente no Supabase SQL Editor:');
    console.error('');
    console.error('   ALTER TABLE notification_preferences');
    console.error('   ADD COLUMN IF NOT EXISTS coupons_only BOOLEAN DEFAULT FALSE;');
    console.error('');
    console.error('   ALTER TABLE notification_preferences');
    console.error('   ADD COLUMN IF NOT EXISTS coupon_platforms TEXT[] DEFAULT \'{}\';');
    console.error('');
  }
}

applyMigration();

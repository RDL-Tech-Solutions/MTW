import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    try {
        console.log('🔧 Aplicando migração: update_bot_channels_platform...\n');

        const migrationPath = path.join(__dirname, 'database/migrations/08_update_bot_channels_platform.sql');
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 SQL Migration:\n', migrationSQL);
        console.log('\n🚀 Executando migração...\n');

        // Executar a migração
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            console.log('⚠️  Função exec_sql falhou:', error.message);
            throw new Error('Falha ao executar via RPC exec_sql. É necessário rodar manualmente no Dashboard.');
        }

        console.log('✅ Migração aplicada com sucesso!\n');

    } catch (error) {
        console.error('❌ Erro ao aplicar migração:', error.message);
        console.log('\n📝 Execute manualmente o SQL no Supabase:');
        console.log('   backend/database/migrations/08_update_bot_channels_platform.sql\n');
        process.exit(1);
    }
}

applyMigration();

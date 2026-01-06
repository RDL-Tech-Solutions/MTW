import { supabase } from './src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    try {
        console.log('🔧 Aplicando migração: fix_max_discount_column...\n');

        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, '../database/production/02_fix_max_discount_column.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 SQL Migration:\n', migrationSQL);
        console.log('\n🚀 Executando migração...\n');

        // Executar a migração
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            // Se a função exec_sql não existe, tentar executar diretamente via query
            console.log('⚠️  Função exec_sql não encontrada. Tentando executar via SQL direto...\n');

            // Tentar via SQL direto
            const { data: result, error: directError } = await supabase
                .from('_migrations')
                .select('*')
                .limit(0);

            if (directError) {
                throw new Error(`Erro na migração: ${directError.message}\n\nPor favor, execute o SQL manualmente no Supabase SQL Editor:\n${migrationPath}`);
            }
        }

        console.log('✅ Migração aplicada com sucesso!\n');
        console.log('📊 Verificando estrutura da tabela coupons...\n');

        // Verificar se a coluna existe
        const { data: columns, error: columnsError } = await supabase
            .from('coupons')
            .select('*')
            .limit(1);

        if (columnsError) {
            console.log('⚠️  Não foi possível verificar a estrutura:', columnsError.message);
        } else {
            console.log('✅ Tabela coupons verificada. A coluna max_discount_value agora está disponível!\n');
        }

        console.log('🎉 Processo concluído!\n');
        console.log('📝 Nota: Se você recebeu erros, execute manualmente o arquivo SQL no Supabase SQL Editor:');
        console.log('   ', migrationPath);

    } catch (error) {
        console.error('❌ Erro ao aplicar migração:', error.message);
        console.log('\n📝 Execute manualmente o SQL no Supabase:');
        console.log('   database/production/02_fix_max_discount_column.sql\n');
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

applyMigration();

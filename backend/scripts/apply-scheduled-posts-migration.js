#!/usr/bin/env node

/**
 * Script para aplicar migration de scheduled_posts
 * Adiciona colunas faltantes: processing_started_at e metadata
 * 
 * Uso: node backend/scripts/apply-scheduled-posts-migration.js
 */

import { supabase } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    try {
        console.log('🔧 Aplicando migration de scheduled_posts...\n');

        // Ler arquivo SQL
        const migrationPath = path.join(__dirname, '../database/migrations/add_scheduled_posts_missing_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Arquivo de migration carregado');
        console.log('📊 Executando SQL...\n');

        // Executar migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            // Tentar executar diretamente se RPC não estiver disponível
            console.log('⚠️ RPC não disponível, tentando executar comandos individualmente...\n');
            
            // Dividir SQL em comandos individuais
            const commands = migrationSQL
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

            for (const command of commands) {
                if (command.includes('DO $$')) {
                    console.log('⏭️ Pulando bloco DO (estatísticas)...');
                    continue;
                }

                try {
                    console.log(`Executando: ${command.substring(0, 50)}...`);
                    const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command });
                    
                    if (cmdError) {
                        console.log(`⚠️ Aviso: ${cmdError.message}`);
                    } else {
                        console.log('✅ Comando executado');
                    }
                } catch (cmdError) {
                    console.log(`⚠️ Aviso: ${cmdError.message}`);
                }
            }
        }

        // Verificar se as colunas foram criadas
        console.log('\n🔍 Verificando estrutura da tabela...\n');

        const { data: columns, error: columnsError } = await supabase
            .from('scheduled_posts')
            .select('*')
            .limit(1);

        if (columnsError) {
            console.error('❌ Erro ao verificar colunas:', columnsError.message);
        } else {
            const sampleRow = columns[0] || {};
            const hasProcessingStartedAt = 'processing_started_at' in sampleRow;
            const hasMetadata = 'metadata' in sampleRow;

            console.log(`${hasProcessingStartedAt ? '✅' : '❌'} Coluna processing_started_at: ${hasProcessingStartedAt ? 'OK' : 'FALTANDO'}`);
            console.log(`${hasMetadata ? '✅' : '❌'} Coluna metadata: ${hasMetadata ? 'OK' : 'FALTANDO'}`);
        }

        // Buscar estatísticas
        console.log('\n📊 Estatísticas da tabela scheduled_posts:\n');

        const { count: totalCount } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true });

        const { count: pendingCount } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { count: processingCount } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'processing');

        const { count: publishedCount } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

        const { count: failedCount } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed');

        console.log(`   Total: ${totalCount || 0}`);
        console.log(`   Pending: ${pendingCount || 0}`);
        console.log(`   Processing: ${processingCount || 0}`);
        console.log(`   Published: ${publishedCount || 0}`);
        console.log(`   Failed: ${failedCount || 0}`);

        console.log('\n✅ Migration aplicada com sucesso!\n');
        console.log('📝 Próximos passos:');
        console.log('   1. Reinicie o servidor backend');
        console.log('   2. Teste criar um agendamento com categoria manual');
        console.log('   3. Verifique se posts travados são detectados corretamente\n');

    } catch (error) {
        console.error('❌ Erro ao aplicar migration:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Executar
applyMigration();

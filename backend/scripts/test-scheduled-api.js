import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para verificar a API de agendamentos
 * Testa conexão com o banco e listagem de scheduled_posts
 */
async function testScheduledPosts() {
    console.log('\n🧪 ===== TESTE: API de Agendamentos =====\n');

    try {
        // 1. Verificar se tabela existe e buscar dados
        console.log('📋 Teste 1: Verificando tabela scheduled_posts...');
        const { data: posts, error: fetchError } = await supabase
            .from('scheduled_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (fetchError) {
            console.error('❌ ERRO ao buscar agendamentos:', fetchError.message);
            console.error('   Código:', fetchError.code);
            console.error('   Detalhes:', fetchError.details);

            if (fetchError.code === '42P01') {
                console.error('\n💡 DIAGNÓSTICO: Tabela "scheduled_posts" NÃO EXISTE!');
                console.error('   Solução: Execute a migration 05_autosync_enhancements.sql');
            }
            return;
        }

        console.log('✅ Tabela existe e é acessível');
        console.log(`📊 Registros encontrados: ${posts?.length || 0}`);

        if (posts && posts.length > 0) {
            console.log('\n📝 Primeiros registros:');
            posts.forEach((post, index) => {
                console.log(`\n${index + 1}. ID: ${post.id}`);
                console.log(`   Produto ID: ${post.product_id}`);
                console.log(`   Plataforma: ${post.platform}`);
                console.log(`   Status: ${post.status}`);
                console.log(`   Agendado para: ${post.scheduled_at}`);
                console.log(`   Criado em: ${post.created_at}`);
                if (post.error_message) {
                    console.log(`   Erro: ${post.error_message}`);
                }
            });
        } else {
            console.log('\n⚠️ Nenhum agendamento encontrado na tabela');
        }

        // 2. Contar total de registros por status
        console.log('\n📋 Teste 2: Contando registros por status...');

        const statuses = ['pending', 'published', 'failed'];
        for (const status of statuses) {
            const { count, error: countError } = await supabase
                .from('scheduled_posts')
                .select('*', { count: 'exact', head: true })
                .eq('status', status);

            if (countError) {
                console.error(`❌ Erro ao contar ${status}:`, countError.message);
            } else {
                console.log(`   ${status}: ${count || 0} registro(s)`);
            }
        }

        // 3. Contar total geral
        const { count: totalCount, error: totalError } = await supabase
            .from('scheduled_posts')
            .select('*', { count: 'exact', head: true });

        if (totalError) {
            console.error('❌ Erro ao contar total:', totalError.message);
        } else {
            console.log(`   TOTAL: ${totalCount || 0} registro(s)`);
        }

        // 4. Buscar com join de produtos
        console.log('\n📋 Teste 3: Testando JOIN com tabela products...');
        const { data: postsWithProducts, error: joinError } = await supabase
            .from('scheduled_posts')
            .select('*, products(*)')
            .limit(5);

        if (joinError) {
            console.error('❌ Erro no JOIN:', joinError.message);
        } else {
            console.log('✅ JOIN funcionando corretamente');
            if (postsWithProducts && postsWithProducts.length > 0) {
                console.log(`   Encontrados ${postsWithProducts.length} agendamento(s) com produtos`);
                postsWithProducts.forEach((post, index) => {
                    console.log(`   ${index + 1}. Produto: ${post.products?.name || 'N/A'}`);
                });
            }
        }

        console.log('\n✅ ===== TESTE CONCLUÍDO =====\n');

    } catch (error) {
        console.error('\n❌ ERRO FATAL no teste:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar teste
testScheduledPosts()
    .then(() => {
        console.log('Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });

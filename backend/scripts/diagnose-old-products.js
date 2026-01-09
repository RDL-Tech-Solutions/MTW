import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

/**
 * Script de diagnóstico para verificar produtos pendentes antigos
 */
async function diagnoseOldProducts() {
    console.log('\n🔍 ===== DIAGNÓSTICO: Produtos Pendentes Antigos =====\n');

    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`📅 Limite (24h atrás): ${twentyFourHoursAgo.toLocaleString('pt-BR')}`);
        console.log(`   ISO: ${twentyFourHoursAgo.toISOString()}`);

        // 1. Buscar produtos pendentes antigos
        console.log('\n📋 1. Buscando produtos pendentes com mais de 24h...');
        const { data: pendingProducts, error: pendingError, count } = await supabase
            .from('products')
            .select('id, name, status, created_at', { count: 'exact' })
            .eq('status', 'pending')
            .lt('created_at', twentyFourHoursAgo.toISOString());

        if (pendingError) {
            console.error('   ❌ Erro na query:', pendingError.message);
            console.error('   Código:', pendingError.code);
            console.error('   Detalhes:', JSON.stringify(pendingError, null, 2));
            return;
        }

        console.log(`   ✅ Encontrados: ${count || pendingProducts?.length || 0} produtos`);

        if (pendingProducts && pendingProducts.length > 0) {
            console.log('\n📝 Produtos encontrados:');
            pendingProducts.slice(0, 10).forEach((p, i) => {
                const createdAt = new Date(p.created_at);
                const hoursAgo = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
                console.log(`   ${i + 1}. ${p.name?.substring(0, 50)}...`);
                console.log(`      ID: ${p.id}`);
                console.log(`      Status: ${p.status}`);
                console.log(`      Criado: ${createdAt.toLocaleString('pt-BR')} (${hoursAgo}h atrás)`);
            });

            if (pendingProducts.length > 10) {
                console.log(`   ... e mais ${pendingProducts.length - 10} produtos`);
            }

            // 2. Verificar se há agendamentos vinculados
            console.log('\n📋 2. Verificando agendamentos vinculados...');
            const productIds = pendingProducts.map(p => p.id);

            const { data: schedules, error: schedError } = await supabase
                .from('scheduled_posts')
                .select('id, product_id, platform, status')
                .in('product_id', productIds);

            if (schedError) {
                console.log(`   ⚠️ Erro ao buscar agendamentos: ${schedError.message}`);
            } else {
                console.log(`   ✅ Agendamentos vinculados: ${schedules?.length || 0}`);
                if (schedules && schedules.length > 0) {
                    console.log('   Agendamentos:');
                    schedules.slice(0, 5).forEach(s => {
                        console.log(`      - ${s.id} (${s.platform}) - ${s.status}`);
                    });
                }
            }

            // 3. Testar delete de um produto
            console.log('\n📋 3. Testando delete de produtos...');
            console.log(`   IDs a deletar: ${productIds.length} produtos`);

            // Testar com apenas 1 produto primeiro
            if (productIds.length > 0) {
                const testId = productIds[0];
                console.log(`   Testando delete do produto: ${testId}`);

                // Primeiro deletar agendamentos deste produto
                const { error: schedDelErr } = await supabase
                    .from('scheduled_posts')
                    .delete()
                    .eq('product_id', testId);

                if (schedDelErr) {
                    console.log(`   ⚠️ Erro ao deletar agendamentos: ${schedDelErr.message}`);
                } else {
                    console.log('   ✅ Agendamentos deletados');
                }

                // Agora deletar o produto
                const { error: delErr } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', testId);

                if (delErr) {
                    console.log(`   ❌ Erro ao deletar produto: ${delErr.message}`);
                    console.log(`   Código: ${delErr.code}`);
                    console.log(`   Detalhes: ${JSON.stringify(delErr, null, 2)}`);
                } else {
                    console.log(`   ✅ Produto ${testId} deletado com sucesso!`);
                }
            }

        } else {
            console.log('\n✅ Nenhum produto pendente antigo encontrado!');
        }

        console.log('\n✅ ===== DIAGNÓSTICO CONCLUÍDO =====\n');

    } catch (error) {
        console.error('\n❌ ERRO no diagnóstico:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar
diagnoseOldProducts()
    .then(() => {
        console.log('Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });

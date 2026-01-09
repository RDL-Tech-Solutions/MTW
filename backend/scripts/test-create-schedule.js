import ScheduledPost from '../src/models/ScheduledPost.js';
import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

/**
 * Script de teste para criar um agendamento de teste
 * Verifica se o model ScheduledPost.create() funciona corretamente
 */
async function testCreateSchedule() {
    console.log('\n🧪 ===== TESTE: Criar Agendamento =====\n');

    try {
        // 1. Buscar um produto existente para teste
        console.log('📋 Buscando produto para teste...');
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id, name, platform')
            .limit(1);

        if (productError) {
            console.error('❌ Erro ao buscar produtos:', productError.message);
            return;
        }

        if (!products || products.length === 0) {
            console.error('❌ Nenhum produto encontrado no banco');
            console.log('💡 Adicione pelo menos um produto antes de executar este teste');
            return;
        }

        const product = products[0];
        console.log(`✅ Produto encontrado: ${product.name} (ID: ${product.id})`);

        // 2. Criar horário de agendamento (daqui a 10 minutos)
        const scheduledTime = new Date();
        scheduledTime.setMinutes(scheduledTime.getMinutes() + 10);
        console.log(`⏰ Agendamento para: ${scheduledTime.toLocaleString('pt-BR')}`);

        // 3. Criar agendamento para Telegram
        console.log('\n📋 Criando agendamento de teste (Telegram)...');
        const telegramPost = await ScheduledPost.create({
            product_id: product.id,
            platform: 'telegram',
            scheduled_at: scheduledTime.toISOString()
        });

        console.log('✅ Agendamento Telegram criado:');
        console.log(`   ID: ${telegramPost.id}`);
        console.log(`   Status: ${telegramPost.status}`);
        console.log(`   Agendado para: ${telegramPost.scheduled_at}`);

        // 4. Criar agendamento para WhatsApp (2 minutos depois)
        const whatsappTime = new Date(scheduledTime);
        whatsappTime.setMinutes(whatsappTime.getMinutes() + 2);

        console.log('\n📋 Criando agendamento de teste (WhatsApp)...');
        const whatsappPost = await ScheduledPost.create({
            product_id: product.id,
            platform: 'whatsapp',
            scheduled_at: whatsappTime.toISOString()
        });

        console.log('✅ Agendamento WhatsApp criado:');
        console.log(`   ID: ${whatsappPost.id}`);
        console.log(`   Status: ${whatsappPost.status}`);
        console.log(`   Agendado para: ${whatsappPost.scheduled_at}`);

        // 5. Verificar se foram criados consultando o banco
        console.log('\n📋 Verificando agendamentos criados...');
        const { data: createdPosts, error: verifyError } = await supabase
            .from('scheduled_posts')
            .select('*, products(*)')
            .in('id', [telegramPost.id, whatsappPost.id]);

        if (verifyError) {
            console.error('❌ Erro ao verificar:', verifyError.message);
        } else {
            console.log(`✅ Verificação concluída: ${createdPosts.length} agendamento(s) confirmado(s)`);
            createdPosts.forEach((post, index) => {
                console.log(`\n${index + 1}. ${post.platform.toUpperCase()}`);
                console.log(`   Produto: ${post.products?.name}`);
                console.log(`   Status: ${post.status}`);
                console.log(`   Agendado: ${new Date(post.scheduled_at).toLocaleString('pt-BR')}`);
            });
        }

        console.log('\n✅ ===== TESTE CONCLUÍDO COM SUCESSO =====');
        console.log('\n💡 Agora acesse o painel admin em /scheduled-posts para ver os agendamentos');

    } catch (error) {
        console.error('\n❌ ERRO no teste:', error.message);
        console.error('Stack:', error.stack);

        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.error('\n💡 DIAGNÓSTICO: Tabela "scheduled_posts" NÃO EXISTE!');
            console.error('   Solução: Execute a migration 05_autosync_enhancements.sql no Supabase');
        }
    }
}

// Executar teste
testCreateSchedule()
    .then(() => {
        console.log('\nScript finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });

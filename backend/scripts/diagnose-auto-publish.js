import SyncConfig from '../src/models/SyncConfig.js';
import logger from '../src/config/logger.js';

/**
 * Script para diagnosticar configuração de Auto-Publish
 * Verifica se auto_publish está ativado para alguma plataforma
 */
async function diagnoseAutoPublish() {
    console.log('\n🔍 ===== DIAGNÓSTICO: Configuração Auto-Publish =====\n');

    try {
        const config = await SyncConfig.get();

        console.log('📋 Configuração Atual:\n');
        console.log(`   Mercado Livre:`);
        console.log(`      - Habilitado: ${config.mercadolivre_enabled ? '✅' : '❌'}`);
        console.log(`      - Auto-Publish: ${config.mercadolivre_auto_publish ? '✅ SIM' : '❌ NÃO'}`);

        console.log(`\n   Shopee:`);
        console.log(`      - Habilitado: ${config.shopee_enabled ? '✅' : '❌'}`);
        console.log(`      - Auto-Publish: ${config.shopee_auto_publish ? '✅ SIM' : '❌ NÃO'}`);

        console.log(`\n   Amazon:`);
        console.log(`      - Habilitado: ${config.amazon_enabled ? '✅' : '❌'}`);
        console.log(`      - Auto-Publish: ${config.amazon_auto_publish ? '✅ SIM' : '❌ NÃO'}`);

        console.log(`\n   AliExpress:`);
        console.log(`      - Habilitado: ${config.aliexpress_enabled ? '✅' : '❌'}`);
        console.log(`      - Auto-Publish: ${config.aliexpress_auto_publish ? '✅ SIM' : '❌ NÃO'}`);

        console.log(`\n📊 Outras Configurações:`);
        console.log(`   - Sincronização Ativa: ${config.is_active ? '✅' : '❌'}`);
        console.log(`   - Keywords: ${config.keywords || 'Não definidas'}`);
        console.log(`   - Desconto Mínimo: ${config.min_discount_percentage || 0}%`);
        console.log(`   - Usar IA Keywords: ${config.use_ai_keywords ? '✅' : '❌'}`);
        console.log(`   - Intervalo Cron: ${config.cron_interval_minutes || 60} minutos`);

        // Diagnóstico
        console.log('\n🔍 ===== DIAGNÓSTICO =====\n');

        const anyAutoPublishEnabled = config.mercadolivre_auto_publish ||
            config.shopee_auto_publish ||
            config.amazon_auto_publish ||
            config.aliexpress_auto_publish;

        if (!anyAutoPublishEnabled) {
            console.log('❌ PROBLEMA IDENTIFICADO:');
            console.log('   Auto-Publish está DESATIVADO em TODAS as plataformas!');
            console.log('');
            console.log('💡 SOLUÇÃO:');
            console.log('   Para que os agendamentos sejam criados, você precisa:');
            console.log('   1. Ir em Admin Panel → Auto-Sync');
            console.log('   2. Na seção "Auto-Publicação com IA"');
            console.log('   3. Ativar o switch para pelo menos UMA plataforma');
            console.log('   4. Clicar em "Salvar Configuração"');
            console.log('');
            console.log('📝 COMO FUNCIONA:');
            console.log('   - Auto-Publish DESATIVADO → Produtos vão para /pending-products');
            console.log('   - Auto-Publish ATIVADO → IA analisa produto:');
            console.log('      • Se aprovado → Cria agendamentos (Telegram + WhatsApp)');
            console.log('      • Se rejeitado → Vai para /pending-products');

        } else {
            console.log('✅ Auto-Publish está ATIVADO em pelo menos uma plataforma');
            console.log('');

            const enabledPlatforms = [];
            if (config.mercadolivre_auto_publish) enabledPlatforms.push('Mercado Livre');
            if (config.shopee_auto_publish) enabledPlatforms.push('Shopee');
            if (config.amazon_auto_publish) enabledPlatforms.push('Amazon');
            if (config.aliexpress_auto_publish) enabledPlatforms.push('AliExpress');

            console.log(`   Plataformas com Auto-Publish: ${enabledPlatforms.join(', ')}`);
            console.log('');
            console.log('💡 Se ainda não houver agendamentos, verifique:');
            console.log('   1. Se a IA está APROVANDO produtos (check logs)');
            console.log('   2. Se bots estão configurados corretamente');
            console.log('   3. Se há produtos sendo sincronizados (keywords corretas)');
        }

        console.log('\n✅ ===== DIAGNÓSTICO CONCLUÍDO =====\n');

    } catch (error) {
        console.error('\n❌ ERRO no diagnóstico:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar diagnóstico
diagnoseAutoPublish()
    .then(() => {
        console.log('Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });

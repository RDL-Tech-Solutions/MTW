#!/usr/bin/env node

/**
 * Script de Health Check do Sistema de Scheduled Posts
 * Verifica se tudo está funcionando corretamente
 * 
 * Uso: node backend/scripts/check-scheduled-posts-health.js
 */

import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function checkHealth() {
    console.log('🏥 Health Check do Sistema de Scheduled Posts\n');
    console.log('═'.repeat(60));
    
    let allChecks = [];
    
    // Check 1: Verificar se tabela existe
    console.log('\n📋 Check 1: Verificando se tabela scheduled_posts existe...');
    try {
        const { data, error } = await supabase
            .from('scheduled_posts')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        console.log('✅ Tabela scheduled_posts existe');
        allChecks.push({ name: 'Tabela existe', status: 'OK' });
    } catch (error) {
        console.log('❌ Tabela scheduled_posts não existe ou não acessível');
        console.log(`   Erro: ${error.message}`);
        allChecks.push({ name: 'Tabela existe', status: 'FAIL' });
    }
    
    // Check 2: Verificar coluna processing_started_at
    console.log('\n📋 Check 2: Verificando coluna processing_started_at...');
    try {
        const { data, error } = await supabase
            .from('scheduled_posts')
            .select('processing_started_at')
            .limit(1);
        
        if (error) throw error;
        console.log('✅ Coluna processing_started_at existe');
        allChecks.push({ name: 'Coluna processing_started_at', status: 'OK' });
    } catch (error) {
        console.log('❌ Coluna processing_started_at não existe');
        console.log('   Execute: node backend/scripts/apply-scheduled-posts-migration.js');
        allChecks.push({ name: 'Coluna processing_started_at', status: 'FAIL' });
    }
    
    // Check 3: Verificar coluna metadata
    console.log('\n📋 Check 3: Verificando coluna metadata...');
    try {
        const { data, error } = await supabase
            .from('scheduled_posts')
            .select('metadata')
            .limit(1);
        
        if (error) throw error;
        console.log('✅ Coluna metadata existe');
        allChecks.push({ name: 'Coluna metadata', status: 'OK' });
    } catch (error) {
        console.log('❌ Coluna metadata não existe');
        console.log('   Execute: node backend/scripts/apply-scheduled-posts-migration.js');
        allChecks.push({ name: 'Coluna metadata', status: 'FAIL' });
    }
    
    // Check 4: Verificar índices
    console.log('\n📋 Check 4: Verificando índices...');
    try {
        // Não há forma direta de verificar índices via Supabase client
        // Assumimos OK se as queries anteriores funcionaram
        console.log('⚠️ Verificação de índices não implementada (requer acesso direto ao PostgreSQL)');
        console.log('   Índices esperados:');
        console.log('   - idx_scheduled_posts_processing_stuck');
        console.log('   - idx_scheduled_posts_status_platform_scheduled');
        allChecks.push({ name: 'Índices', status: 'SKIP' });
    } catch (error) {
        console.log('❌ Erro ao verificar índices');
        allChecks.push({ name: 'Índices', status: 'FAIL' });
    }
    
    // Check 5: Verificar posts travados
    console.log('\n📋 Check 5: Verificando posts travados...');
    try {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        const { data: stuckPosts, error } = await supabase
            .from('scheduled_posts')
            .select('id, processing_started_at, attempts')
            .eq('status', 'processing')
            .lt('processing_started_at', fiveMinutesAgo.toISOString());
        
        if (error) throw error;
        
        if (stuckPosts.length === 0) {
            console.log('✅ Nenhum post travado encontrado');
            allChecks.push({ name: 'Posts travados', status: 'OK' });
        } else {
            console.log(`⚠️ ${stuckPosts.length} post(s) travado(s) encontrado(s):`);
            stuckPosts.forEach(post => {
                const minutesStuck = Math.floor((Date.now() - new Date(post.processing_started_at).getTime()) / 60000);
                console.log(`   - Post ${post.id.substring(0, 8)}... travado há ${minutesStuck} minutos (tentativa ${post.attempts}/3)`);
            });
            console.log('   Ação: Aguarde o próximo ciclo do cron (1 minuto) para liberação automática');
            allChecks.push({ name: 'Posts travados', status: 'WARN' });
        }
    } catch (error) {
        console.log('❌ Erro ao verificar posts travados');
        console.log(`   Erro: ${error.message}`);
        allChecks.push({ name: 'Posts travados', status: 'FAIL' });
    }
    
    // Check 6: Verificar posts pendentes
    console.log('\n📋 Check 6: Verificando posts pendentes...');
    try {
        const now = new Date().toISOString();
        
        const { data: pendingPosts, error } = await supabase
            .from('scheduled_posts')
            .select('id, scheduled_at, platform')
            .eq('status', 'pending')
            .lte('scheduled_at', now);
        
        if (error) throw error;
        
        if (pendingPosts.length === 0) {
            console.log('✅ Nenhum post pendente aguardando processamento');
            allChecks.push({ name: 'Posts pendentes', status: 'OK' });
        } else {
            console.log(`⚠️ ${pendingPosts.length} post(s) pendente(s) aguardando processamento:`);
            pendingPosts.forEach(post => {
                const minutesOverdue = Math.floor((Date.now() - new Date(post.scheduled_at).getTime()) / 60000);
                console.log(`   - Post ${post.id.substring(0, 8)}... (${post.platform}) atrasado ${minutesOverdue} minutos`);
            });
            console.log('   Ação: Verifique se o cron está rodando');
            allChecks.push({ name: 'Posts pendentes', status: 'WARN' });
        }
    } catch (error) {
        console.log('❌ Erro ao verificar posts pendentes');
        console.log(`   Erro: ${error.message}`);
        allChecks.push({ name: 'Posts pendentes', status: 'FAIL' });
    }
    
    // Check 7: Verificar variável de ambiente
    console.log('\n📋 Check 7: Verificando variável ENABLE_CRON_JOBS...');
    if (process.env.ENABLE_CRON_JOBS === 'true') {
        console.log('✅ ENABLE_CRON_JOBS=true');
        allChecks.push({ name: 'ENABLE_CRON_JOBS', status: 'OK' });
    } else {
        console.log('❌ ENABLE_CRON_JOBS não está definida como "true"');
        console.log('   Ação: Adicione ENABLE_CRON_JOBS=true no arquivo .env');
        allChecks.push({ name: 'ENABLE_CRON_JOBS', status: 'FAIL' });
    }
    
    // Check 8: Estatísticas gerais
    console.log('\n📋 Check 8: Estatísticas gerais...');
    try {
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
        
        console.log('📊 Estatísticas:');
        console.log(`   Total: ${totalCount || 0}`);
        console.log(`   Pending: ${pendingCount || 0}`);
        console.log(`   Processing: ${processingCount || 0}`);
        console.log(`   Published: ${publishedCount || 0}`);
        console.log(`   Failed: ${failedCount || 0}`);
        
        // Calcular taxa de sucesso
        const totalProcessed = (publishedCount || 0) + (failedCount || 0);
        const successRate = totalProcessed > 0 ? ((publishedCount || 0) / totalProcessed * 100).toFixed(2) : 0;
        console.log(`   Taxa de sucesso: ${successRate}%`);
        
        if (successRate >= 95) {
            console.log('✅ Taxa de sucesso excelente (>= 95%)');
            allChecks.push({ name: 'Taxa de sucesso', status: 'OK' });
        } else if (successRate >= 90) {
            console.log('⚠️ Taxa de sucesso boa (>= 90%)');
            allChecks.push({ name: 'Taxa de sucesso', status: 'WARN' });
        } else {
            console.log('❌ Taxa de sucesso baixa (< 90%)');
            console.log('   Ação: Investigue os posts falhados');
            allChecks.push({ name: 'Taxa de sucesso', status: 'FAIL' });
        }
    } catch (error) {
        console.log('❌ Erro ao buscar estatísticas');
        console.log(`   Erro: ${error.message}`);
        allChecks.push({ name: 'Estatísticas', status: 'FAIL' });
    }
    
    // Resumo final
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 RESUMO DO HEALTH CHECK\n');
    
    const okCount = allChecks.filter(c => c.status === 'OK').length;
    const warnCount = allChecks.filter(c => c.status === 'WARN').length;
    const failCount = allChecks.filter(c => c.status === 'FAIL').length;
    const skipCount = allChecks.filter(c => c.status === 'SKIP').length;
    
    allChecks.forEach(check => {
        const icon = check.status === 'OK' ? '✅' : 
                     check.status === 'WARN' ? '⚠️' : 
                     check.status === 'SKIP' ? '⏭️' : '❌';
        console.log(`${icon} ${check.name}: ${check.status}`);
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`Total: ${allChecks.length} checks`);
    console.log(`✅ OK: ${okCount}`);
    console.log(`⚠️ WARN: ${warnCount}`);
    console.log(`❌ FAIL: ${failCount}`);
    console.log(`⏭️ SKIP: ${skipCount}`);
    
    if (failCount === 0 && warnCount === 0) {
        console.log('\n🎉 Sistema de Scheduled Posts está 100% saudável!');
        process.exit(0);
    } else if (failCount === 0) {
        console.log('\n⚠️ Sistema de Scheduled Posts está funcionando, mas há avisos.');
        process.exit(0);
    } else {
        console.log('\n❌ Sistema de Scheduled Posts tem problemas que precisam ser corrigidos.');
        process.exit(1);
    }
}

// Executar
checkHealth().catch(error => {
    console.error('❌ Erro fatal no health check:', error);
    process.exit(1);
});

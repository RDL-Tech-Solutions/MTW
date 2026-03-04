import dotenv from 'dotenv';
dotenv.config();

import BotChannel from '../src/models/BotChannel.js';
import BotConfig from '../src/models/BotConfig.js';
import Coupon from '../src/models/Coupon.js';
import notificationDispatcher from '../src/services/bots/notificationDispatcher.js';
import logger from '../src/config/logger.js';

/**
 * Script de diagnóstico para verificar por que cupons não estão sendo publicados no WhatsApp Web
 */

async function diagnoseWhatsAppCoupons() {
    console.log('🔍 DIAGNÓSTICO: Publicação de Cupons no WhatsApp Web\n');
    console.log('='.repeat(80));

    try {
        // 1. Verificar configuração global
        console.log('\n📋 1. CONFIGURAÇÃO GLOBAL DO BOT');
        console.log('-'.repeat(80));
        const botConfig = await BotConfig.get();
        console.log(`   WhatsApp Web Enabled: ${botConfig.whatsapp_web_enabled}`);
        console.log(`   Telegram Enabled: ${botConfig.telegram_enabled}`);
        console.log(`   WhatsApp Cloud Enabled: ${botConfig.whatsapp_enabled}`);

        if (!botConfig.whatsapp_web_enabled) {
            console.log('\n❌ PROBLEMA ENCONTRADO: WhatsApp Web está DESABILITADO globalmente!');
            console.log('   Solução: Ative o WhatsApp Web no painel admin ou no banco de dados.');
            return;
        }

        // 2. Listar todos os canais WhatsApp Web
        console.log('\n📱 2. CANAIS WHATSAPP WEB CADASTRADOS');
        console.log('-'.repeat(80));
        const allChannels = await BotChannel.findAll();
        const whatsappWebChannels = allChannels.filter(c => c.platform === 'whatsapp_web');

        if (whatsappWebChannels.length === 0) {
            console.log('❌ PROBLEMA ENCONTRADO: Nenhum canal WhatsApp Web cadastrado!');
            console.log('   Solução: Cadastre canais WhatsApp Web no painel admin.');
            return;
        }

        console.log(`   Total de canais WhatsApp Web: ${whatsappWebChannels.length}\n`);

        whatsappWebChannels.forEach((channel, index) => {
            console.log(`   Canal ${index + 1}:`);
            console.log(`   ├─ ID: ${channel.id}`);
            console.log(`   ├─ Nome: ${channel.name}`);
            console.log(`   ├─ Identifier: ${channel.identifier}`);
            console.log(`   ├─ Ativo: ${channel.is_active ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   ├─ Only Coupons: ${channel.only_coupons ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   ├─ No Coupons: ${channel.no_coupons ? '🚫 SIM (BLOQUEIA CUPONS!)' : '✅ NÃO'}`);
            
            // Verificar content_filter
            if (channel.content_filter && typeof channel.content_filter === 'object') {
                console.log(`   ├─ Content Filter:`);
                console.log(`   │  ├─ Aceita Produtos: ${channel.content_filter.products !== false ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   │  └─ Aceita Cupons: ${channel.content_filter.coupons !== false ? '✅ SIM' : '❌ NÃO'}`);
                
                if (channel.content_filter.coupons === false) {
                    console.log(`   ├─ ⚠️ PROBLEMA: Este canal está configurado para NÃO receber cupons!`);
                }
            } else {
                console.log(`   ├─ Content Filter: Não configurado (aceita tudo)`);
            }

            // Verificar filtros de categoria
            if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
                console.log(`   ├─ Filtro de Categoria: ${channel.category_filter.join(', ')}`);
                console.log(`   │  └─ ⚠️ Cupons SEM categoria serão BLOQUEADOS neste canal!`);
            } else {
                console.log(`   ├─ Filtro de Categoria: Nenhum (aceita todas)`);
            }

            // Verificar filtros de plataforma
            if (channel.platform_filter && Array.isArray(channel.platform_filter) && channel.platform_filter.length > 0) {
                console.log(`   ├─ Filtro de Plataforma: ${channel.platform_filter.join(', ')}`);
            } else {
                console.log(`   ├─ Filtro de Plataforma: Nenhum (aceita todas)`);
            }

            // Verificar horários
            if (channel.schedule_start && channel.schedule_end) {
                console.log(`   ├─ Horário: ${channel.schedule_start} - ${channel.schedule_end}`);
            } else {
                console.log(`   ├─ Horário: 24/7 (sem restrição)`);
            }

            console.log(`   └─ Evitar Duplicatas: ${channel.avoid_duplicates_hours || 0} horas`);
            console.log('');
        });

        // 3. Verificar canais ativos que aceitam cupons
        console.log('\n✅ 3. CANAIS ATIVOS QUE ACEITAM CUPONS');
        console.log('-'.repeat(80));
        const activeChannelsThatAcceptCoupons = whatsappWebChannels.filter(channel => {
            if (!channel.is_active) return false;
            if (channel.no_coupons === true) return false;
            if (channel.content_filter && channel.content_filter.coupons === false) return false;
            return true;
        });

        if (activeChannelsThatAcceptCoupons.length === 0) {
            console.log('❌ PROBLEMA CRÍTICO ENCONTRADO: Nenhum canal WhatsApp Web ativo aceita cupons!');
            console.log('\n   Possíveis causas:');
            console.log('   1. Todos os canais estão inativos (is_active = false)');
            console.log('   2. Todos os canais têm no_coupons = true');
            console.log('   3. Todos os canais têm content_filter.coupons = false');
            console.log('\n   Solução:');
            console.log('   - Ative pelo menos um canal WhatsApp Web');
            console.log('   - Configure o canal para aceitar cupons (no_coupons = false)');
            console.log('   - Se usar content_filter, configure coupons = true');
            return;
        }

        console.log(`   ✅ ${activeChannelsThatAcceptCoupons.length} canal(is) ativo(s) aceita(m) cupons:\n`);
        activeChannelsThatAcceptCoupons.forEach(channel => {
            console.log(`   - ${channel.name} (${channel.identifier})`);
        });

        // 4. Buscar cupom recente para teste
        console.log('\n\n🎟️ 4. TESTANDO COM CUPOM RECENTE');
        console.log('-'.repeat(80));
        const recentCoupons = await Coupon.findAll({ limit: 1, orderBy: 'created_at DESC' });
        
        if (recentCoupons.length === 0) {
            console.log('⚠️ Nenhum cupom encontrado no banco de dados para teste.');
            console.log('   Crie um cupom para testar a publicação.');
            return;
        }

        const testCoupon = recentCoupons[0];
        console.log(`   Cupom de teste: ${testCoupon.code}`);
        console.log(`   Plataforma: ${testCoupon.platform || 'general'}`);
        console.log(`   Categoria: ${testCoupon.category_id || 'NÃO DEFINIDA'}`);
        console.log(`   Desconto: ${testCoupon.discount_value}${testCoupon.discount_type === 'percentage' ? '%' : 'R$'}`);

        // 5. Simular filtros de segmentação
        console.log('\n\n🔍 5. SIMULANDO FILTROS DE SEGMENTAÇÃO');
        console.log('-'.repeat(80));
        
        for (const channel of activeChannelsThatAcceptCoupons) {
            console.log(`\n   Testando canal: ${channel.name}`);
            
            let blocked = false;
            let blockReason = '';

            // Verificar filtro de categoria
            if (testCoupon.category_id) {
                if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
                    const categoryId = String(testCoupon.category_id);
                    const allowedCategories = channel.category_filter.map(c => String(c));
                    
                    if (!allowedCategories.includes(categoryId)) {
                        blocked = true;
                        blockReason = `Categoria ${testCoupon.category_id} não está na lista permitida: ${allowedCategories.join(', ')}`;
                    }
                }
            } else {
                if (channel.category_filter && Array.isArray(channel.category_filter) && channel.category_filter.length > 0) {
                    blocked = true;
                    blockReason = 'Cupom sem categoria e canal tem filtro de categoria restrito';
                }
            }

            // Verificar filtro de plataforma
            if (!blocked && testCoupon.platform) {
                if (channel.platform_filter && Array.isArray(channel.platform_filter) && channel.platform_filter.length > 0) {
                    if (!channel.platform_filter.includes(testCoupon.platform)) {
                        blocked = true;
                        blockReason = `Plataforma ${testCoupon.platform} não está na lista permitida: ${channel.platform_filter.join(', ')}`;
                    }
                }
            }

            if (blocked) {
                console.log(`   ❌ BLOQUEADO: ${blockReason}`);
            } else {
                console.log(`   ✅ PASSARIA pelos filtros - Cupom seria publicado neste canal`);
            }
        }

        // 6. Resumo e recomendações
        console.log('\n\n📊 6. RESUMO E RECOMENDAÇÕES');
        console.log('='.repeat(80));
        
        const activeCount = whatsappWebChannels.filter(c => c.is_active).length;
        const acceptCouponsCount = activeChannelsThatAcceptCoupons.length;
        const withCategoryFilter = activeChannelsThatAcceptCoupons.filter(c => 
            c.category_filter && Array.isArray(c.category_filter) && c.category_filter.length > 0
        ).length;

        console.log(`\n   Total de canais WhatsApp Web: ${whatsappWebChannels.length}`);
        console.log(`   Canais ativos: ${activeCount}`);
        console.log(`   Canais que aceitam cupons: ${acceptCouponsCount}`);
        console.log(`   Canais com filtro de categoria: ${withCategoryFilter}`);

        if (acceptCouponsCount === 0) {
            console.log('\n   ❌ AÇÃO NECESSÁRIA:');
            console.log('      Configure pelo menos um canal para aceitar cupons!');
        } else if (withCategoryFilter === acceptCouponsCount) {
            console.log('\n   ⚠️ ATENÇÃO:');
            console.log('      Todos os canais têm filtro de categoria.');
            console.log('      Cupons SEM categoria NÃO serão publicados!');
            console.log('      Recomendação: Adicione categoria aos cupons ou remova o filtro de um canal.');
        } else {
            console.log('\n   ✅ Configuração parece OK!');
            console.log('      Se ainda não está recebendo cupons, verifique:');
            console.log('      1. Se o WhatsApp Web está conectado (QR Code escaneado)');
            console.log('      2. Se os números dos canais estão corretos');
            console.log('      3. Logs do servidor para erros de conexão');
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Erro durante diagnóstico:', error);
        logger.error('Erro no diagnóstico:', error);
    }
}

// Executar diagnóstico
diagnoseWhatsAppCoupons()
    .then(() => {
        console.log('\n✅ Diagnóstico concluído!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });

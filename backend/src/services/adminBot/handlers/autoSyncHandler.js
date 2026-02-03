import { InlineKeyboard } from 'grammy';
import SyncConfig from '../../../models/SyncConfig.js';
import logger from '../../../config/logger.js';
import shopeeSync from '../../autoSync/shopeeSync.js';
import meliSync from '../../autoSync/meliSync.js';
import amazonSync from '../../autoSync/amazonSync.js';
import aliExpressSync from '../../autoSync/aliExpressSync.js';
import kabumSync from '../../autoSync/kabumSync.js';
import magaluSync from '../../autoSync/magaluSync.js';
import pichauSync from '../../autoSync/pichauSync.js';

// Mapa de serviços de sync
const services = {
    shopee: shopeeSync,
    mercadolivre: meliSync,
    amazon: amazonSync,
    aliexpress: aliExpressSync,
    kabum: kabumSync,
    magazineluiza: magaluSync,
    pichau: pichauSync
};

/**
 * Menu Principal do Auto-Sync
 */
export const showAutoSyncMenu = async (ctx) => {
    try {
        const config = await SyncConfig.get();
        const kb = new InlineKeyboard();

        // Linha 1: Status Geral e TrendHunter
        kb.text(config.is_active ? '🟢 Sync Ativo' : '🔴 Sync Pausado', 'autosync:toggle:global')
            .text(config.use_ai_keywords ? '🧠 AI Trends ON' : '🧠 AI Trends OFF', 'autosync:toggle:ai').row();

        // Linha 2: Configurações Gerais
        kb.text(`⏱️ ${config.cron_interval_minutes} min`, 'autosync:edit:interval')
            .text(`📉 Mín ${config.min_discount_percentage}%`, 'autosync:edit:discount')
            .text('📝 Palavras-Chave', 'autosync:edit:keywords').row();

        // Seção de Plataformas
        // Para cada plataforma, mostrar: [Nome] [Status Sync] [Status Pub]
        const platforms = [
            { id: 'shopee', name: 'Shopee', icon: '🛍️' },
            { id: 'mercadolivre', name: 'ML', icon: '🛒' },
            { id: 'amazon', name: 'Amazon', icon: '📦' },
            { id: 'aliexpress', name: 'Ali', icon: '🌐' },
            { id: 'kabum', name: 'Kabum', icon: '🏷️' },
            { id: 'magazineluiza', name: 'Magalu', icon: '🔵' },
            { id: 'pichau', name: 'Pichau', icon: '💻' }
        ];

        platforms.forEach(p => {
            const isEnabled = config[`${p.id}_enabled`];
            const isPub = config[`${p.id}_auto_publish`];

            kb.text(`${p.icon} ${p.name}`, `autosync:sync_now:${p.id}`) // Clicar no nome sincroniza agora
                .text(isEnabled ? '✅ Sync' : '❌ Sync', `autosync:toggle_plat:${p.id}`)
                .text(isPub ? '🚀 Pub' : '⏸️ Pub', `autosync:toggle_pub:${p.id}`)
                .row();
        });

        // Ações Manuais
        kb.row().text('🔄 Sincronizar TUDO Agora', 'autosync:sync_all');
        kb.row().text('🔙 Voltar ao Menu', 'main_menu');

        const message =
            `🔄 *Painel Auto-Sync*\n\n` +
            `Gerencie a sincronização automática de produtos.\n` +
            `• *Sync Geral:* Liga/Desliga todo o sistema.\n` +
            `• *AI Trends:* Usa IA para buscar palavras-chave do momento.\n` +
            `• *Plataformas:* Controle individual de busca (Sync) e publicação (Pub).\n\n` +
            `_Toque no nome da loja para sincronizar apenas ela agora._`;

        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: kb });
            } catch (e) {
                try { await ctx.deleteMessage(); } catch (delErr) { }
                await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: kb });
            }
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: kb });
        }

    } catch (error) {
        logger.error('Erro menu autosync:', error);
        await ctx.reply('❌ Erro ao carregar configurações.');
    }
};

/**
 * Toggle Geral (Global Active)
 */
export const toggleGlobal = async (ctx) => {
    const config = await SyncConfig.get();
    await SyncConfig.upsert({ ...config, is_active: !config.is_active });
    await showAutoSyncMenu(ctx);
};

/**
 * Toggle AI Trends
 */
export const toggleAi = async (ctx) => {
    const config = await SyncConfig.get();
    await SyncConfig.upsert({ ...config, use_ai_keywords: !config.use_ai_keywords });
    await showAutoSyncMenu(ctx);
};

/**
 * Toggle Plataforma (Enabled)
 */
export const togglePlatform = async (ctx, platformId) => {
    const config = await SyncConfig.get();
    const key = `${platformId}_enabled`;
    await SyncConfig.upsert({ ...config, [key]: !config[key] });
    await showAutoSyncMenu(ctx); // Refresh silent
};

/**
 * Toggle Auto-Publish Plataforma
 */
export const toggleAutoPublish = async (ctx, platformId) => {
    const config = await SyncConfig.get();
    const key = `${platformId}_auto_publish`;
    await SyncConfig.upsert({ ...config, [key]: !config[key] });
    await showAutoSyncMenu(ctx);
};

/**
 * Iniciar Edição de Texto (Keywords, Interval, Discount)
 */
export const startEdit = async (ctx, field) => {
    const config = await SyncConfig.get();
    let msg = '';

    if (field === 'keywords') {
        msg = `📝 *Edição de Palavras-Chave Manuais*\n\nAtuais: \`${config.keywords || 'Nenhuma'}\`\n\nDigite as novas palavras separadas por vírgula (ex: iphone, ps5, notebook):`;
        ctx.session.step = 'AUTOSYNC_EDIT_KEYWORDS';
    } else if (field === 'interval') {
        msg = `⏱️ *Intervalo de Sincronização*\n\nAtual: ${config.cron_interval_minutes} minutos\n\nDigite o novo intervalo em minutos (ex: 30):`;
        ctx.session.step = 'AUTOSYNC_EDIT_INTERVAL';
    } else if (field === 'discount') {
        msg = `📉 *Desconto Mínimo*\n\nAtual: ${config.min_discount_percentage}%\n\nDigite a nova porcentagem (ex: 15):`;
        ctx.session.step = 'AUTOSYNC_EDIT_DISCOUNT';
    }

    try {
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
    } catch (e) {
        await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
};

/**
 * Processar Input de Edição
 */
export const handleEditInput = async (ctx, text) => {
    const step = ctx.session.step;
    const config = await SyncConfig.get();
    const updates = { ...config };

    try {
        if (step === 'AUTOSYNC_EDIT_KEYWORDS') {
            updates.keywords = text;
            await ctx.reply(`✅ Palavras-chave atualizadas!`);
        } else if (step === 'AUTOSYNC_EDIT_INTERVAL') {
            const val = parseInt(text);
            if (isNaN(val) || val < 5) return ctx.reply('❌ Inválido. Digite um número maior que 5.');
            updates.cron_interval_minutes = val;
            await ctx.reply(`✅ Intervalo ajustado para ${val} min.`);
        } else if (step === 'AUTOSYNC_EDIT_DISCOUNT') {
            const val = parseInt(text);
            if (isNaN(val) || val < 0 || val > 99) return ctx.reply('❌ Inválido. Digite entre 0 e 99.');
            updates.min_discount_percentage = val;
            await ctx.reply(`✅ Desconto mínimo ajustado para ${val}%.`);
        }

        await SyncConfig.upsert(updates);
        ctx.session.step = 'IDLE';
        await showAutoSyncMenu(ctx);

    } catch (e) {
        logger.error('Erro update config:', e);
        await ctx.reply('❌ Erro ao salvar.');
        await showAutoSyncMenu(ctx);
    }
};

/**
 * Trigger Sync Individual
 */
export const triggerSync = async (ctx, platformId) => {
    const service = services[platformId];
    if (!service) return ctx.answerCallbackQuery('❌ Serviço não disponível.');

    if (typeof service.sync !== 'function') {
        const platformName = platformId.charAt(0).toUpperCase() + platformId.slice(1);
        return ctx.reply(`⚠️ O módulo ${platformName} ainda não suporta Sync Manual.`);
    }

    ctx.answerCallbackQuery(`🔄 Iniciando sync: ${platformId}...`);

    // Executar sem await para não travar o bot
    service.sync().then((res) => {
        const count = res?.newProducts || 0;
        ctx.reply(`✅ Sync ${platformId} finalizado! ${count} novos produtos.`);
    }).catch(e => {
        logger.error(`Erro sync manual ${platformId}:`, e);
        ctx.reply(`❌ Erro no sync ${platformId}: ${e.message}`);
    });
};

/**
 * Trigger Sync ALL
 */
export const triggerSyncAll = async (ctx) => {
    ctx.answerCallbackQuery('🔄 Iniciando Sincronização Geral...');
    ctx.editMessageText('🔄 *Sincronizando TUDO...*\nIsso pode levar alguns minutos. Você será notificado ao fim.', { parse_mode: 'Markdown' });

    // Sequencial para não explodir memória/CPU
    const runAll = async () => {
        const results = [];
        for (const [name, service] of Object.entries(services)) {
            try {
                if (typeof service.sync === 'function') {
                    const res = await service.sync();
                    const count = res?.newProducts || 0;
                    results.push(`✅ ${name}: OK (${count})`);
                } else {
                    results.push(`⚠️ ${name}: Sem suporte a Sync`);
                }
            } catch (e) {
                results.push(`❌ ${name}: Erro`);
                logger.error(`Erro sync all (${name}):`, e);
            }
        }
        return results;
    };

    runAll().then((res) => {
        ctx.reply(`🏁 *Sincronização Geral Concluída*\n\n${res.join('\n')}`, { parse_mode: 'Markdown' });
        showAutoSyncMenu(ctx);
    });
};

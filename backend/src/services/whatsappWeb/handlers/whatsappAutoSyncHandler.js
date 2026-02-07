import { config } from '../config.js';
import logger from '../../../config/logger.js';
import SyncConfig from '../../../models/SyncConfig.js';
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

const PLATFORMS = [
    { id: 'shopee', name: 'Shopee', icon: '🛍️' },
    { id: 'mercadolivre', name: 'ML', icon: '🛒' },
    { id: 'amazon', name: 'Amazon', icon: '📦' },
    { id: 'aliexpress', name: 'Ali', icon: '🌐' },
    { id: 'kabum', name: 'Kabum', icon: '🏷️' },
    { id: 'magazineluiza', name: 'Magalu', icon: '🔵' },
    { id: 'pichau', name: 'Pichau', icon: '💻' }
];

/**
 * Ponto de entrada: Mostrar Menu Principal do Auto-Sync
 */
export const showAutoSyncMenu = async (msg) => {
    try {
        const config = await SyncConfig.get();

        let text = `🔄 *Painel Auto-Sync*\n\n`;
        text += `Status Geral: ${config.is_active ? '🟢 ATIVO' : '🔴 PAUSADO'}\n`;
        text += `AI Trends: ${config.use_ai_keywords ? '🧠 LIGADO' : '⚪ DESLIGADO'}\n`;
        text += `Intervalo: ${config.cron_interval_minutes} min | Desconto Mín: ${config.min_discount_percentage}%\n\n`;

        text += `*Opções:*\n`;
        text += `1️⃣ Alternar Sync Geral (Ligar/Desligar)\n`;
        text += `2️⃣ Alternar AI Trends\n`;
        text += `3️⃣ 🔄 Sincronizar TUDO Agora\n`;
        text += `4️⃣ Gerenciar Plataformas (Ver Status/Pub)\n`;
        text += `5️⃣ Configurações (Intervalo, Desconto, Keywords)\n`;
        text += `0️⃣ Sair`;

        await msg.reply(text);

        return { step: 'AUTOSYNC_MENU' };

    } catch (error) {
        logger.error('Erro menu autosync whatsapp:', error);
        await msg.reply('❌ Erro ao carregar configurações.');
        return { step: 'IDLE' };
    }
};

/**
 * Handle input no menu principal
 */
export const handleAutoSyncMenu = async (msg, body, state) => {
    if (body === '0') {
        await msg.reply('❌ Saindo do Auto-Sync.');
        return { step: 'IDLE' };
    }

    if (body === '1') { // Toggle Global
        const config = await SyncConfig.get();
        await SyncConfig.upsert({ ...config, is_active: !config.is_active });
        await msg.reply(`✅ Sync Geral ${!config.is_active ? 'ATIVADO' : 'PAUSADO'}!`);
        return showAutoSyncMenu(msg);
    }

    if (body === '2') { // Toggle AI
        const config = await SyncConfig.get();
        await SyncConfig.upsert({ ...config, use_ai_keywords: !config.use_ai_keywords });
        await msg.reply(`✅ AI Trends ${!config.use_ai_keywords ? 'LIGADO' : 'DESLIGADO'}!`);
        return showAutoSyncMenu(msg);
    }

    if (body === '3') { // Sync All
        await msg.reply('🔄 *Iniciando Sincronização Geral...*\nIsso será feito em segundo plano. Você será notificado se houver novidades nos logs.');
        triggerSyncAll(msg); // Async, fire and forget
        return { step: 'IDLE' };
    }

    if (body === '4') { // Gerenciar Plataformas
        return showPlatformsMenu(msg);
    }

    if (body === '5') { // Configurações
        return showConfigMenu(msg);
    }

    await msg.reply('❌ Opção inválida.');
    return state;
};

/**
 * Menu de Plataformas
 */
const showPlatformsMenu = async (msg) => {
    try {
        const config = await SyncConfig.get();
        let text = `🛍️ *Gerenciar Plataformas*\n\n`;
        text += `Legenda: [S]=Sync Ativo | [P]=Auto-Pub Ativo\n\n`;

        PLATFORMS.forEach((p, index) => {
            const isEnabled = config[`${p.id}_enabled`];
            const isPub = config[`${p.id}_auto_publish`];
            const status = `${isEnabled ? '✅[S]' : '❌[S]'} ${isPub ? '🚀[P]' : '⏸️[P]'}`;
            text += `${index + 1}. ${p.icon} *${p.name}* - ${status}\n`;
        });

        text += `\n*Digite o número da plataforma para gerenciar (1-${PLATFORMS.length})*\nOu 0 para Voltar.`;

        await msg.reply(text);
        return { step: 'AUTOSYNC_PLATFORMS' };

    } catch (error) {
        logger.error('Erro menu plataformas:', error);
        return { step: 'IDLE' };
    }
};

/**
 * Handle input no menu de plataformas
 */
export const handlePlatformsMenu = async (msg, body, state) => {
    if (body === '0') return showAutoSyncMenu(msg);

    const index = parseInt(body);
    if (isNaN(index) || index < 1 || index > PLATFORMS.length) {
        await msg.reply('❌ Opção inválida.');
        return state;
    }

    const platform = PLATFORMS[index - 1];
    return showPlatformDetail(msg, platform);
};

/**
 * Detalhe da Plataforma e Ações
 */
const showPlatformDetail = async (msg, platform) => {
    try {
        const config = await SyncConfig.get();
        const isEnabled = config[`${platform.id}_enabled`];
        const isPub = config[`${platform.id}_auto_publish`];

        let text = `${platform.icon} *Gerenciar ${platform.name}*\n\n`;
        text += `Status Sync: ${isEnabled ? '✅ ATIVO' : '❌ PAUSADO'}\n`;
        text += `Auto-Publicação: ${isPub ? '🚀 LIGADO' : '⏸️ DESLIGADO'}\n\n`;
        text += `1️⃣ Alternar Sync (Ligar/Desligar)\n`;
        text += `2️⃣ Alternar Auto-Publicação\n`;
        text += `3️⃣ 🔄 Sincronizar AGORA (Só ${platform.name})\n`;
        text += `0️⃣ Voltar`;

        await msg.reply(text);
        return { step: `AUTOSYNC_PLATFORM_DETAIL:${platform.id}` };
    } catch (error) {
        logger.error('Erro detalhe plataforma:', error);
        return { step: 'IDLE' };
    }
};

/**
 * Handle input no detalhe da plataforma
 */
export const handlePlatformDetail = async (msg, body, state) => {
    const platformId = state.step.split(':')[1];
    const platform = PLATFORMS.find(p => p.id === platformId);

    if (!platform) {
        await msg.reply('❌ Erro de estado.');
        return showPlatformsMenu(msg);
    }

    if (body === '0') return showPlatformsMenu(msg);

    const config = await SyncConfig.get();

    if (body === '1') { // Toggle Sync
        const key = `${platformId}_enabled`;
        await SyncConfig.upsert({ ...config, [key]: !config[key] });
        await msg.reply(`✅ Sync de ${platform.name} ${!config[key] ? 'ATIVADO' : 'PAUSADO'}!`);
        return showPlatformDetail(msg, platform);
    }

    if (body === '2') { // Toggle Pub
        const key = `${platformId}_auto_publish`;
        await SyncConfig.upsert({ ...config, [key]: !config[key] });
        await msg.reply(`✅ Auto-Pub de ${platform.name} ${!config[key] ? 'LIGADO' : 'DESLIGADO'}!`);
        return showPlatformDetail(msg, platform);
    }

    if (body === '3') { // Sync Now
        await msg.reply(`🔄 Iniciando sync de ${platform.name}...`);
        triggerSync(msg, platformId); // Async
        return { step: 'IDLE' };
    }

    await msg.reply('❌ Opção inválida.');
    return state;
};

/**
 * Menu de Configurações Textuais
 */
const showConfigMenu = async (msg) => {
    let text = `⚙️ *Configurações Avançadas*\n\n`;
    text += `1️⃣ Alterar Intervalo (minutos)\n`;
    text += `2️⃣ Alterar Desconto Mínimo (%)\n`;
    text += `3️⃣ Editar Palavras-Chave\n`;
    text += `0️⃣ Voltar`;

    await msg.reply(text);
    return { step: 'AUTOSYNC_CONFIG' };
};

export const handleConfigMenu = async (msg, body, state) => {
    if (body === '0') return showAutoSyncMenu(msg);

    if (body === '1') {
        await msg.reply('⏱️ Digite o novo intervalo em minutos (ex: 30):');
        return { step: 'AUTOSYNC_EDIT_INTERVAL' };
    }
    if (body === '2') {
        await msg.reply('📉 Digite a nova porcentagem de desconto mínimo (ex: 20):');
        return { step: 'AUTOSYNC_EDIT_DISCOUNT' };
    }
    if (body === '3') {
        const config = await SyncConfig.get();
        await msg.reply(`📝 *Palavras-Chave Atuais:*\n${config.keywords || 'Nenhuma'}\n\nDigite as novas palavras separadas por vírgula (ou 'limpar'):`);
        return { step: 'AUTOSYNC_EDIT_KEYWORDS' };
    }

    await msg.reply('❌ Opção inválida.');
    return state;
};

export const handleConfigEdit = async (msg, body, state) => {
    const config = await SyncConfig.get();
    const updates = { ...config };

    try {
        if (state.step === 'AUTOSYNC_EDIT_INTERVAL') {
            const val = parseInt(body);
            if (isNaN(val) || val < 5) {
                await msg.reply('❌ Inválido. Minimo 5 minutos. Tente novamente ou 0 para sair.');
                if (body === '0') return showConfigMenu(msg);
                return state;
            }
            updates.cron_interval_minutes = val;
            await SyncConfig.upsert(updates);
            await msg.reply(`✅ Intervalo atualizado para ${val} min.`);
            return showConfigMenu(msg);
        }

        if (state.step === 'AUTOSYNC_EDIT_DISCOUNT') {
            const val = parseInt(body);
            if (isNaN(val) || val < 0 || val > 99) {
                await msg.reply('❌ Inválido (0-99). Tente novamente ou 0 para sair.');
                if (body === '0') return showConfigMenu(msg);
                return state;
            }
            updates.min_discount_percentage = val;
            await SyncConfig.upsert(updates);
            await msg.reply(`✅ Desconto mínimo atualizado para ${val}%.`);
            return showConfigMenu(msg);
        }

        if (state.step === 'AUTOSYNC_EDIT_KEYWORDS') {
            if (body.toLowerCase() === 'limpar') updates.keywords = '';
            else updates.keywords = body;

            await SyncConfig.upsert(updates);
            await msg.reply(`✅ Palavras-chave atualizadas!`);
            return showConfigMenu(msg);
        }
    } catch (e) {
        logger.error('Erro salvar config whatsapp:', e);
        await msg.reply('❌ Erro ao salvar.');
    }
    return showConfigMenu(msg);
};


/**
 * Helpers de Sync (Cópia simplificada do logic do Telegram)
 */
const triggerSync = async (msg, platformId) => {
    const service = services[platformId];
    if (!service || typeof service.sync !== 'function') {
        await msg.reply(`❌ Serviço ${platformId} não disponível.`);
        return;
    }

    service.sync().then((res) => {
        const count = res?.newProducts || 0;
        msg.reply(`✅ Sync ${platformId} finalizado! ${count} novos produtos.`);
    }).catch(e => {
        logger.error(`Erro sync manual ${platformId}:`, e);
        msg.reply(`❌ Erro no sync ${platformId}: ${e.message}`);
    });
};

const triggerSyncAll = async (msg) => {
    const runAll = async () => {
        const results = [];
        for (const [name, service] of Object.entries(services)) {
            try {
                if (typeof service.sync === 'function') {
                    const res = await service.sync();
                    const count = res?.newProducts || 0;
                    results.push(`✅ ${name}: OK (${count})`);
                }
            } catch (e) {
                results.push(`❌ ${name}: Erro`);
            }
        }
        return results;
    };

    runAll().then((res) => {
        msg.reply(`🏁 *Sincronização Geral Concluída*\n\n${res.join('\n')}`);
    });
};

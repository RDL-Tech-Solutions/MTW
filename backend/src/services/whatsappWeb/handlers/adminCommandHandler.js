import { config } from '../config.js';
import logger from '../../../config/logger.js';
import NotificationLog from '../../../models/NotificationLog.js';
import BotChannel from '../../../models/BotChannel.js';
import Product from '../../../models/Product.js';

export const handleAdminCommand = async (client, msg, body) => {
    try {
        const command = body.toLowerCase().trim();

        // Menu Principal
        if (command === '/start' || command === '/menu' || command === 'menu' || command === 'voltar') {
            await sendMainMenu(client, msg);
            return true;
        }

        // Status do Sistema
        if (command === '/status' || command === 'status' || command === '2') {
            await sendStatus(client, msg);
            return true;
        }

        // Estatísticas
        if (command === '/stats' || command === 'stats') {
            await sendStats(client, msg);
            return true;
        }

        // Pendentes
        if (command === '/pendentes' || command === 'pendentes' || command === '1') {
            // Agora delegamos para o MessageHandler iniciar o fluxo complexo
            return { action: 'SHOW_PENDING' };
        }

        // Ajuda
        if (command === '/help' || command === 'ajuda') {
            await msg.reply(`🤖 *Comandos Disponíveis:*\n\n/menu - Menu Principal\n/status - Status do Sistema\n/stats - Estatísticas de Envio\n/pendentes - Produtos Pendentes\n/republicar <ID> - Republicar produto (com opção de cupom)`);
            return true;
        }

        // Republicar (Novo)
        if (command.startsWith('/republicar') || command.startsWith('republicar')) {
            const parts = body.split(' ');
            if (parts.length < 2) {
                await msg.reply('❌ Use: `/republicar <ID_DO_PRODUTO>`');
                return true;
            }
            const productId = parts[1].trim();
            const product = await Product.findById(productId);

            if (!product) {
                await msg.reply('❌ Produto não encontrado.');
                return true;
            }

            // Retornar objeto de ação para o MessageHandler iniciar o fluxo
            return {
                action: 'START_REPUBLISH',
                product: product
            };
        }

        return false; // Não foi um comando processado
    } catch (error) {
        logger.error('Erro ao processar comando admin:', error);
        await msg.reply('❌ Erro ao processar comando.');
        return true;
    }
};

const sendMainMenu = async (client, msg) => {
    const menu = `🤖 *PreçoCerto Admin (WhatsApp)*\n\nEscolha uma opção:\n\n1️⃣ *Pendentes* (Ver produtos aguardando aprovação)\n2️⃣ *Status* (Verificar canais e serviços)\n\n_Responda com o número ou digite o comando (ex: /status)_`;

    // Adicionar delay pequeno para parecer natural
    // await new Promise(r => setTimeout(r, 500));
    await msg.reply(menu);
};

const sendStatus = async (client, msg) => {
    try {
        await msg.react('⏳');

        const activeChannels = await BotChannel.countActive('all');
        const telegramChannels = await BotChannel.countActive('telegram');
        const whatsappChannels = await BotChannel.countActive('whatsapp'); // Legacy/Cloud
        const whatsappWebChannels = await BotChannel.countActive('whatsapp_web');

        const statusMsg = `📊 *Status do Sistema*\n\n` +
            `🟢 *Bot Online*\n` +
            `📱 *WhatsApp Web:* Conectado\n` +
            `📢 *Canais Ativos:* ${activeChannels}\n` +
            `   • Telegram: ${telegramChannels}\n` +
            `   • WhatsApp Web: ${whatsappWebChannels}\n\n` +
            `🕒 ${new Date().toLocaleString('pt-BR')}`;

        await msg.reply(statusMsg);
        await msg.react('✅');
    } catch (error) {
        logger.error('Erro ao buscar status:', error);
        await msg.reply('❌ Erro ao buscar status do sistema.');
    }
};

const sendStats = async (client, msg) => {
    try {
        await msg.react('⏳');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await NotificationLog.getStats({ start_date: today.toISOString() });

        const statsMsg = `📈 *Estatísticas de Hoje*\n\n` +
            `📨 *Total Enviado:* ${stats.total}\n` +
            `✅ *Sucesso:* ${stats.success} (${stats.successRate}%)\n` +
            `❌ *Falhas:* ${stats.failed}\n`;

        await msg.reply(statsMsg);
        await msg.react('✅');
    } catch (error) {
        logger.error('Erro ao buscar stats:', error);
        await msg.reply('❌ Erro ao buscar estatísticas.');
    }
};

const listPending = async (client, msg) => {
    try {
        await msg.react('⏳');

        const pendingProducts = await Product.findPending(1, 5); // Traz os 5 mais recentes

        const list = pendingProducts?.data || [];

        if (list.length === 0) {
            await msg.reply('✅ *Nenhum produto pendente!*');
            await msg.react('👍');
            return;
        }

        let reply = `📋 *Produtos Pendentes (${pendingProducts.total})*\n\n`;

        for (const p of pendingProducts.data) {
            reply += `🛒 *${p.name.substring(0, 30)}...*\n` +
                `💰 R$ ${p.current_price.toFixed(2)}\n` +
                `🔗 ${p.product_url}\n\n`;
        }

        reply += `_Acesse o painel web para aprovar ou use o bot do Telegram para gerenciamento avançado._`;

        await msg.reply(reply);
        await msg.react('✅');
    } catch (error) {
        logger.error('Erro ao listar pendentes:', error);
        await msg.reply('❌ Erro ao listar produtos pendentes.');
    }
};

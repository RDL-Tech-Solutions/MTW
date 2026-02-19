import { InlineKeyboard } from 'grammy';
import ScheduledPost from '../../../models/ScheduledPost.js';
import logger from '../../../config/logger.js';
import SchedulerService from '../../autoSync/schedulerService.js';
import supabase from '../../../config/database.js';

/**
 * Menu principal de Posts Agendados
 */
export const showScheduledPostsMenu = async (ctx) => {
    try {
        const result = await ScheduledPost.findAll({ page: 1, limit: 10, status: 'pending' });
        const posts = result.data || [];
        const count = result.count || 0;

        let message = `📅 *Gerenciamento de Agendamentos*\n\n`;
        message += `Total Pendentes: *${count}*\n\n`;

        if (posts.length === 0) {
            message += `_Nenhum post agendado no momento._`;
        } else {
            posts.forEach((post, index) => {
                const date = new Date(post.scheduled_at).toLocaleString('pt-BR');
                const product = post.products?.name || 'Produto desconhecido';
                const shortId = post.id.substring(0, 8);

                message += `*${index + 1}.* ${product.substring(0, 30)}... (ID: ${shortId})\n`;
                message += `   🕒 ${date} | 📱 ${post.platform}\n`;
                message += `   /pub\\_${shortId} (Antecipar 🚀)\n`;
                message += `   /del\\_${shortId} (Cancelar ❌)\n\n`;
            });
            message += `_Comandos:_\n_/pub_ID - Publicar Agora_\n_/del_ID - Cancelar_`;
        }

        const kb = new InlineKeyboard();
        kb.text('🔄 Atualizar Lista', 'scheduled:refresh').row();

        if (count > 0) {
            kb.text('🗑️ Cancelar TODOS', 'scheduled:delete_all_confirm').row();
        }

        kb.text('🔙 Voltar ao Menu', 'main_menu');

        await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: kb });
    } catch (error) {
        logger.error('Erro menu scheduled posts:', error);
        await ctx.reply('❌ Erro ao buscar agendamentos.');
    }
};

/**
 * Confirmar Exclusão de Todos
 */
export const confirmDeleteAll = async (ctx) => {
    const kb = new InlineKeyboard()
        .text('✅ SIM, Cancelar TUDO', 'scheduled:delete_all_execute').row()
        .text('❌ Não, Voltar', 'scheduled:refresh');

    await ctx.reply('⚠️ *Tem certeza?*\nIsso cancelará todos os posts pendentes de envio.', { parse_mode: 'Markdown', reply_markup: kb });
};

/**
 * Executar Exclusão de Todos
 */
export const executeDeleteAll = async (ctx) => {
    try {
        const count = await ScheduledPost.deleteAllPending();
        await ctx.reply(`✅ *${count}* agendamentos cancelados com sucesso!`, { parse_mode: 'Markdown' });
        await showScheduledPostsMenu(ctx);
    } catch (error) {
        logger.error('Erro delete all scheduled:', error);
        await ctx.reply('❌ Erro ao cancelar agendamentos.');
    }
};

/**
 * Deletar Post Específico (Comando /del_ID)
 */
/**
 * Deletar Post Específico (Comando /del_ID)
 */
export const deletePostByCommand = async (ctx, commandText) => {
    try {
        // Formato /del_ID (pode ser curto ou longo)
        const idFragment = commandText.replace('/del_', '').trim();
        if (!idFragment) return;

        // Buscar via Model com suporte a short ID
        const post = await ScheduledPost.findByShortId(idFragment);

        if (!post) {
            return ctx.reply('❌ Agendamento não encontrado.');
        }

        await ScheduledPost.delete(post.id);
        await ctx.reply(`✅ Agendamento ${post.id.substring(0, 8)}... cancelado!`);
        // Opcional: recarregar lista
        // await showScheduledPostsMenu(ctx);
    } catch (error) {
        logger.error(`Erro ao deletar post ${commandText}:`, error);
        await ctx.reply('❌ Erro ao cancelar.');
    }
};

/**
 * Forçar Publicação de Post Específico (Comando /pub_ID)
 */
export const forcePublishPost = async (ctx, commandText) => {
    try {
        const idFragment = commandText.replace('/pub_', '').trim();
        if (!idFragment) return;

        // Buscar via Model com suporte a short ID
        const post = await ScheduledPost.findByShortId(idFragment);

        if (!post) {
            return ctx.reply('❌ Agendamento não encontrado.');
        }

        if (post.status !== 'pending' && post.status !== 'failed') {
            return ctx.reply(`⚠️ Este post está com status: ${post.status}. Só é possível antecipar posts pendentes ou falhados.`);
        }

        await ctx.reply(`🚀 Antecipando publicação do post ${post.id.substring(0, 8)}...`);

        // Executar publicação
        const success = await SchedulerService.processSinglePost(post, { isForced: true });

        if (success) {
            await ctx.reply(`✅ Post publicado com sucesso!`);
        } else {
            await ctx.reply(`❌ Falha ao publicar post. Verifique os logs.`);
        }
    } catch (error) {
        logger.error(`Erro ao antecipar post ${commandText}:`, error);
        await ctx.reply(`❌ Erro ao executar: ${error.message}`);
    }
};

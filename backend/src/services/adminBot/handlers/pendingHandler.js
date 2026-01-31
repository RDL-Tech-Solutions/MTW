import Product from '../../../models/Product.js';
import { InlineKeyboard } from 'grammy';
import logger from '../../../config/logger.js';
import { captureLinkHandler } from './captureHandler.js'; // Reutilizar preview se necessário ou criar função comum

const PAGE_SIZE = 5;

/**
 * Listar Produtos Pendentes
 */
export const listPendingProducts = async (ctx, page = 1) => {
    try {
        // const { tenantId } = ctx.session.user; // REMOVIDO
        const offset = (page - 1) * PAGE_SIZE;

        if (page === 1 && !ctx.callbackQuery) {
            await ctx.reply('⏳ Carregando produtos pendentes...');
        }

        const { products, total } = await Product.findPending({
            limit: PAGE_SIZE,
            page: page,
            sort: 'created_at',
            order: 'desc'
            // tenant_id removido anteriormente
        });

        if (!products || products.length === 0) {
            const msg = '✅ *Nenhum produto pendente.* Todos em dia!';
            if (ctx.callbackQuery) {
                // Tentar editar, se falhar mandar novo (caso seja msg de texto antes)
                try { await ctx.editMessageText(msg, { parse_mode: 'Markdown' }); }
                catch (e) { await ctx.reply(msg, { parse_mode: 'Markdown' }); }
            } else {
                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
            return;
        }

        let message = `📋 *Produtos Pendentes* (${total})\n\n`;
        const keyboard = new InlineKeyboard();

        products.forEach((p, index) => {
            const idx = offset + index + 1;
            const price = p.current_price ? `R$${p.current_price}` : '';
            // Botão para ver detalhes
            keyboard.text(`${idx}. ${p.name.substring(0, 20)}... ${price}`, `pending:view:${p.id}`).row();
        });

        // Paginação
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const navRow = [];
        if (page > 1) navRow.push({ text: '⬅️ Ant', callback_data: `pending:page:${page - 1}` });
        if (page < totalPages) navRow.push({ text: 'Prox ➡️', callback_data: `pending:page:${page + 1}` });

        if (navRow.length > 0) keyboard.row(...navRow);

        keyboard.row().text('🔄 Atualizar', 'pending:refresh');

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

    } catch (error) {
        logger.error('Erro listar pendentes admin:', error);
        await ctx.reply('❌ Erro ao listar pendentes.');
    }
};

/**
 * Ver Detalhe de Pendente
 */
export const viewPendingDetail = async (ctx, productId) => {
    try {
        // const { tenantId } = ctx.session.user; // REMOVIDO
        const product = await Product.findById(productId);

        if (!product) return ctx.reply('❌ Produto não encontrado.');

        // Reutilizar lógica de preview ( similar ao captureHandler )
        // Aqui simplificado:
        const price = product.current_price ? `R$ ${product.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
        const message =
            `🛒 *${product.name}*\n` +
            `🏪 ${product.platform || 'Loja'}\n` +
            `💰 *${price}*\n` +
            `🔗 [Link](${product.original_link})\n\n` +
            `_Selecione uma ação:_`;

        const keyboard = new InlineKeyboard()
            .text('✏️ Editar e Publicar', `edit_wizard:start:${product.id}`)
            .text('🚀 Publicar', `publish:now:${product.id}`).row()
            .text('🔙 Voltar', 'pending:back');

        // Se tiver foto, enviar nova msg com foto (Telegram não edita texto -> media facilmente)
        // Para simplificar fluxo de admin, vamos apagar a lista e mandar o card do produto
        if (ctx.callbackQuery) await ctx.deleteMessage().catch(() => { });

        if (product.image_url) {
            await ctx.replyWithPhoto(product.image_url, {
                caption: message,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }

    } catch (error) {
        logger.error('Erro view pendente:', error);
    }
}

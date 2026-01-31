import { Bot, session, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import logger from '../../config/logger.js';
import authService from './services/authService.js';
import { adminMainMenu } from './menus/mainMenu.js';

// Handlers
import { captureLinkHandler } from './handlers/captureHandler.js';
import * as couponHandler from './handlers/couponHandler.js';
import * as pendingHandler from './handlers/pendingHandler.js';
import * as editHandler from './handlers/editHandler.js';
import Product from '../../models/Product.js'; // Importar Model Product para actions diretas

let bot = null;

export const initAdminBot = async () => {
    try {
        const token = process.env.ADMIN_BOT_TOKEN;
        if (!token) {
            logger.warn('⚠️ ADMIN_BOT_TOKEN não configurado. O Bot Admin não será iniciado.');
            return;
        }

        bot = new Bot(token);

        // Middleware de Sessão
        bot.use(session({
            initial: () => ({
                step: 'IDLE',
                isAuthenticated: false,
                user: null,
                tempData: {}
            })
        }));

        // Logger básico
        bot.use(async (ctx, next) => {
            if (ctx.message?.text) {
                logger.debug(`[AdminBot] Msg de ${ctx.from.id}: ${ctx.message.text}`);
            }
            await next();
        });

        // Comandos Básicos
        bot.command('start', async (ctx) => {
            if (authService.isAuthenticated(ctx)) {
                await ctx.reply('Olá Admin! Você já está logado.', { reply_markup: adminMainMenu });
            } else {
                await ctx.reply('Bem-vindo ao *PreçoCerto Admin*.\n\nUse /login para acessar.', { parse_mode: 'Markdown' });
            }
        });

        bot.command('login', async (ctx) => await authService.startLogin(ctx));

        bot.command('menu', async (ctx) => {
            if (!authService.isAuthenticated(ctx)) return ctx.reply('Faça login primeiro: /login');
            await ctx.reply('Menu Principal:', { reply_markup: adminMainMenu });
        });

        // Handler de Texto Geral (Roteamento por Estado ou Menu)
        bot.on('message:text', async (ctx) => {
            const text = ctx.message.text;
            const step = ctx.session.step;

            // Fluxo de Login
            if (step === 'AWAITING_EMAIL') {
                return await authService.handleEmail(ctx, text);
            }
            if (step === 'AWAITING_PASSWORD') {
                return await authService.handlePassword(ctx, text);
            }

            // Ações do Menu (Requer Autenticação)
            if (!authService.isAuthenticated(ctx)) {
                return ctx.reply('🔒 Acesso negado. Use /login.');
            }

            // Fluxo de Cupom (inputs de texto)
            if (step.startsWith('COUPON_')) {
                return await couponHandler.handleCouponSteps(ctx, text);
            }

            // Fluxo de Edição (Wizard Steps)
            if (step.startsWith('EDIT_WIZARD_') && step !== 'EDIT_WIZARD_CONFIRM') {
                return await editHandler.handleWizardStep(ctx, text);
            }

            switch (text) {
                case '🎫 Criar Cupom':
                    await couponHandler.startCreateCoupon(ctx);
                    break;
                case '📋 Pendentes':
                    await pendingHandler.listPendingProducts(ctx, 1);
                    break;
                default:
                    // Captura Automática se for link
                    if (text.startsWith('http')) {
                        await captureLinkHandler(ctx, text);
                        ctx.session.step = 'IDLE';
                    } else {
                        await ctx.reply('Comando não reconhecido ou use o menu. Para capturar, envie apenas o link.', { reply_markup: adminMainMenu });
                    }
            }
        });

        // Handler de Fotos (para Cupons)
        bot.on('message:photo', async (ctx) => {
            const step = ctx.session.step;
            if (step && step.startsWith('COUPON_')) {
                return await couponHandler.handleCouponSteps(ctx, null); // Passa null no texto, o handler deve pegar ctx.message.photo
            }
        });

        // Handler de Callbacks
        bot.on('callback_query:data', async (ctx) => {
            const data = ctx.callbackQuery.data;
            if (!authService.isAuthenticated(ctx)) return ctx.answerCallbackQuery('Login expirado.');

            try {
                // Edição Wizard
                if (data.startsWith('wizard_confirm:')) {
                    const action = data.split(':')[1];
                    return await editHandler.handleWizardConfirm(ctx, action);
                }

                if (data.startsWith('wizard_cat:')) {
                    const action = data.split(':')[1];
                    return await editHandler.handleWizardCategorySelection(ctx, action);
                }

                if (data.startsWith('edit_wizard:start:')) {
                    const id = data.split(':')[2];
                    return await editHandler.startEditWizard(ctx, id);
                }

                // Wizard Cupom (Pergunta e Seleção)
                if (data.startsWith('wizard_coup_ask:')) {
                    const action = data.split(':')[1];
                    return await editHandler.handleWizardCouponAsk(ctx, action);
                }

                if (data.startsWith('wizard_coup_sel:')) {
                    const id = data.split(':')[1];
                    return await editHandler.handleWizardCouponSelect(ctx, id);
                }

                // Legado (manter ou remover se não usado mais)
                // if (data.startsWith('pending:edit:')) ...

                // Pendentes
                if (data.startsWith('pending:')) {
                    if (data === 'pending:refresh') return await pendingHandler.listPendingProducts(ctx, 1);
                    if (data.startsWith('pending:page:')) {
                        const page = parseInt(data.split(':')[2]);
                        return await pendingHandler.listPendingProducts(ctx, page);
                    }
                    if (data.startsWith('pending:view:')) {
                        const id = data.split(':')[2];
                        return await pendingHandler.viewPendingDetail(ctx, id);
                    }
                    if (data === 'pending:back') return await pendingHandler.listPendingProducts(ctx, 1);
                    if (data.startsWith('pending:edit:')) return ctx.answerCallbackQuery('Edição complexa não implementada neste MVP. Use o painel web.');
                    // if (data.startsWith('pending:reject:')) ... (implementar se necessário)
                }

                // Publicação direta -> Agora inicia fluxo rápido de verificação (Cupom -> Resumo -> Publicar)
                if (data.startsWith('publish:now:')) {
                    const id = data.split(':')[2];
                    return await editHandler.startQuickPublishFlow(ctx, id);
                }

                // Cupons (Fluxo Avançado Unificado)
                if (data.startsWith('cp:') || data.startsWith('coupon_type:') || data.startsWith('coupon_plat:')) {
                    await couponHandler.handleCouponCallbacks(ctx, data);
                    try { await ctx.answerCallbackQuery(); } catch (e) { }
                }

                // Shortcut criar cupom para produto capturado
                if (data.startsWith('coupon:create:')) {
                    // Iniciar fluxo de cupom mas talvez pré-preencher algo? Por enquanto fluxo padrão.
                    await couponHandler.startCreateCoupon(ctx);
                    await ctx.answerCallbackQuery();
                }

            } catch (e) {
                logger.error('Erro callback admin:', e);
                await ctx.answerCallbackQuery('Erro ao processar ação.');
            }
        });

        // Error Handling
        bot.catch((err) => {
            const ctx = err.ctx;
            logger.error(`Erro no AdminBot update ${ctx.update.update_id}:`, err);
        });

        // Start
        bot.start({
            onStart: (botInfo) => {
                logger.info(`🤖 Admin Bot iniciado como @${botInfo.username}`);
            }
        });

        return bot;

    } catch (error) {
        logger.error('Erro fatal ao iniciar Admin Bot:', error);
    }
};

export const stopAdminBot = async () => {
    if (bot) {
        await bot.stop();
        logger.info('🛑 Admin Bot parado.');
        bot = null;
    }
};

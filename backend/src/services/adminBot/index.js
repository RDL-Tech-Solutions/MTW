import { Bot, session, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import logger from '../../config/logger.js';
import authService from './services/authService.js';
import { adminMainMenu } from './menus/mainMenu.js';
import aiService from './services/aiService.js';
import supabase from '../../config/database.js';

// Handlers
import { captureLinkHandler } from './handlers/captureHandler.js';
import * as couponHandler from './handlers/couponHandler.js';
import * as pendingHandler from './handlers/pendingHandler.js';
import * as editHandler from './handlers/editHandler.js';
import * as autoSyncHandler from './handlers/autoSyncHandler.js';
import * as scheduledPostsHandler from './handlers/scheduledPostsHandler.js';

import Product from '../../models/Product.js'; // Importar Model Product para actions diretas
import Coupon from '../../models/Coupon.js';
import PublishService from '../autoSync/publishService.js';



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

        // AI ADVANCED Toggle
        const toggleAiMode = async (ctx, active) => {
            if (!ctx.session.user) return;

            try {
                // Atualizar no banco
                await supabase.from('users').update({ ai_mode_active: active }).eq('id', ctx.session.user.id);

                // Atualizar sessão
                ctx.session.user.ai_mode_active = active;

                if (active) {
                    await ctx.reply('🤖 *ESTADO ALTERADO: IA ATIVADA*\n\nAgora você está falando com a IA Advanced. Digite qualquer comando em linguagem natural.\n_Ex: "Listar produtos pendentes"_', {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [[{ text: "❌ Sair da IA" }]],
                            resize_keyboard: true,
                            persistent: true
                        }
                    });
                } else {
                    await ctx.reply('🔙 *IA Desativada*. Retornando ao menu padrão.', {
                        parse_mode: 'Markdown',
                        reply_markup: adminMainMenu
                    });
                }
            } catch (error) {
                logger.error('Erro ao alternar modo IA:', error);
                await ctx.reply('Erro ao salvar estado da IA.');
            }
        };

        // Command handler for AI exit (prioridade alta)
        bot.hears('❌ Sair da IA', async (ctx) => {
            if (authService.isAuthenticated(ctx)) {
                await toggleAiMode(ctx, false);
            }
        });

        // Handler Unificado de Texto e Legenda (Caption)
        const handleGeneralInput = async (ctx, text) => {
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

            // Busca de Pendentes
            if (step === 'AWAITING_PENDING_SEARCH') {
                if (!ctx.session.tempData.pendingFilters) ctx.session.tempData.pendingFilters = {};
                ctx.session.tempData.pendingFilters.search = text;
                ctx.session.step = 'IDLE';
                return await pendingHandler.listPendingProducts(ctx, 1);
            }

            // Edição Auto-Sync (Keywords, Interval, Discount)
            if (step && step.startsWith('AUTOSYNC_EDIT_')) {
                return await autoSyncHandler.handleEditInput(ctx, text);
            }

            switch (text) {
                case '🤖 IA ADVANCED':
                    await toggleAiMode(ctx, true);
                    break;
                case '🎫 Criar Cupom':
                    await couponHandler.startCreateCoupon(ctx);
                    break;
                case '📋 Pendentes':
                    await pendingHandler.listPendingProducts(ctx, 1);
                    break;
                case '🔄 Auto-Sync':
                    await autoSyncHandler.showAutoSyncMenu(ctx);
                    break;
                case '📅 Posts Agendados':
                    await scheduledPostsHandler.showScheduledPostsMenu(ctx);
                    break;
                default:
                    // Deletar Post Agendado (/del_ID)
                    if (text.startsWith('/del_')) {
                        return await scheduledPostsHandler.deletePostByCommand(ctx, text);
                    }

                    // Antecipar Post (/pub_ID)
                    if (text.startsWith('/pub_')) {
                        return await scheduledPostsHandler.forcePublishPost(ctx, text);
                    }

                    // Republicar Produto (/republicar ID)
                    if (text.startsWith('/republicar')) {
                        const parts = text.split(' ');
                        if (parts.length < 2) return ctx.reply('❌ Use: /republicar ID');
                        const pid = parts[1].trim();
                        const prod = await Product.findById(pid);
                        if (!prod) return ctx.reply('❌ Produto não encontrado.');

                        const { InlineKeyboard } = await import('grammy');
                        const kb = new InlineKeyboard()
                            .text('Sim', `repub:yes:${pid}`)
                            .text('Não', `repub:no:${pid}`);

                        return ctx.reply(`🔄 *Republicando: ${prod.name}*\n\nDeseja vincular um cupom?`, {
                            parse_mode: 'Markdown',
                            reply_markup: kb
                        });
                    }

                    // SE ESTIVER EM MODO IA
                    if (ctx.session.user?.ai_mode_active) {
                        return await aiService.processMessage(ctx, text);
                    }

                    // Verificação aprimorada: Link ou Texto Longo (Clone)
                    if (text.startsWith('http') || (text.length > 20 && (text.includes('R$') || text.toLowerCase().includes('cupom') || text.toLowerCase().includes('oferta') || text.toLowerCase().includes('desconto')))) {

                        // Armazenar texto para processamento posterior
                        ctx.session.tempData.pendingInput = text;

                        // Armazenar ID da foto se houver (para clonagem)
                        if (ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
                            const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Maior resolução
                            ctx.session.tempData.pendingPhoto = photo.file_id;
                        }

                        if (!ctx.session.tempData.coupon) ctx.session.tempData.coupon = { is_general: true };

                        const { InlineKeyboard } = await import('grammy');
                        const kb = new InlineKeyboard()
                            .text('🛍️ Captura de Produto', 'action_choice:capture').row()
                            .text('🎫 Clonagem de Cupom', 'action_choice:clone');

                        const replyOptions = {
                            parse_mode: 'Markdown',
                            reply_markup: kb
                        };

                        // Tentar responder citando a mensagem, se possível
                        if (ctx.message && ctx.message.message_id) {
                            replyOptions.reply_to_message_id = ctx.message.message_id;
                        }

                        await ctx.reply('🤖 *O que deseja fazer com esta mensagem?*', replyOptions);
                    } else {
                        await ctx.reply('Comando não reconhecido ou use o menu. Envie um Link ou uma Mensagem de Oferta para processar.', { reply_markup: adminMainMenu });
                    }
            }
        };

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

        // Handler de Texto Geral
        bot.on('message:text', async (ctx) => {
            const text = ctx.message.text;
            await handleGeneralInput(ctx, text);
        });

        // Handler de Fotos
        bot.on('message:photo', async (ctx) => {
            const step = ctx.session.step;

            // PRIORIDADE: Se estiver em um passo de receber foto (Cupom), processa a foto
            if (step && step.startsWith('COUPON_WAITING_PHOTO')) {
                return await couponHandler.handleCouponSteps(ctx, null);
            }

            // Se tiver uma legenda (caption), trata como imput de texto/comando
            if (ctx.message.caption) {
                return await handleGeneralInput(ctx, ctx.message.caption);
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

                if (data.startsWith('schedule_ai:')) {
                    const id = data.split(':')[1];
                    return await aiService.handleScheduleAI(ctx, id);
                }

                if (data.startsWith('schedule_set_cat:')) {
                    return await aiService.handleScheduleCategory(ctx, data);
                }

                if (data.startsWith('vc:')) {
                    return await aiService.handleCouponSelection(ctx, data);
                }

                if (data.startsWith('vincular_cupom:')) {
                    return await aiService.handleCouponSelection(ctx, data);
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

                    // Novos Handlers de Filtro e Busca
                    if (data === 'pending:filter:menu') return await pendingHandler.showFilterMenu(ctx);

                    if (data.startsWith('pending:filter:')) {
                        const filter = data.split(':')[2];
                        if (filter === 'clear') {
                            ctx.session.tempData.pendingFilters = {};
                        } else {
                            if (!ctx.session.tempData.pendingFilters) ctx.session.tempData.pendingFilters = {};
                            ctx.session.tempData.pendingFilters.platform = filter;
                        }
                        return await pendingHandler.listPendingProducts(ctx, 1);
                    }

                    if (data === 'pending:search:start') {
                        ctx.session.step = 'AWAITING_PENDING_SEARCH';
                        return await ctx.reply('🔍 *Busca de Pendentes*\nDigite o termo que deseja buscar (ex: o nome do produto):', { parse_mode: 'Markdown' });
                    }

                    if (data.startsWith('pending:edit:')) return ctx.answerCallbackQuery('Edição complexa não implementada neste MVP. Use o painel web.');
                }

                // === AUTO-SYNC ===
                if (data === 'menu:autosync') return await autoSyncHandler.showAutoSyncMenu(ctx);

                if (data.startsWith('autosync:')) {
                    if (data === 'autosync:toggle:global') return await autoSyncHandler.toggleGlobal(ctx);
                    if (data === 'autosync:toggle:ai') return await autoSyncHandler.toggleAi(ctx);

                    if (data.startsWith('autosync:toggle_plat:')) return await autoSyncHandler.togglePlatform(ctx, data.split(':')[2]);
                    if (data.startsWith('autosync:toggle_pub:')) return await autoSyncHandler.toggleAutoPublish(ctx, data.split(':')[2]);

                    if (data === 'autosync:sync_all') return await autoSyncHandler.triggerSyncAll(ctx);
                    if (data.startsWith('autosync:sync_now:')) return await autoSyncHandler.triggerSync(ctx, data.split(':')[2]);

                    if (data.startsWith('autosync:edit:')) return await autoSyncHandler.startEdit(ctx, data.split(':')[2]);
                }

                // === SCHEDULED POSTS ===
                if (data.startsWith('scheduled:')) {
                    if (data === 'scheduled:refresh') return await scheduledPostsHandler.showScheduledPostsMenu(ctx);
                    if (data === 'scheduled:delete_all_confirm') return await scheduledPostsHandler.confirmDeleteAll(ctx);
                    if (data === 'scheduled:delete_all_execute') return await scheduledPostsHandler.executeDeleteAll(ctx);
                }

                // Handler de Publicação Rápida
                if (data.startsWith('publish:now:')) {
                    const id = data.split(':')[2];
                    return await editHandler.startQuickPublishFlow(ctx, id);
                }

                // === REPUBLICACAO ===
                if (data.startsWith('repub:')) {
                    const parts = data.split(':');
                    const action = parts[1];
                    const pid = parts[2];

                    if (action === 'no') {
                        await ctx.editMessageText('🚀 Publicando sem cupom...');
                        const prod = await Product.findById(pid);
                        if (!prod) return ctx.reply('❌ Produto não encontrado.');

                        const res = await PublishService.publishAll(prod, { manual: true });
                        await ctx.reply(res.success ? '✅ Publicado com sucesso!' : `❌ Erro: ${res.reason}`);
                    }

                    if (action === 'yes') {
                        const prod = await Product.findById(pid);
                        if (!prod) return ctx.reply('❌ Produto não encontrado.');

                        // Buscar cupons
                        const platform = prod.platform || 'general';
                        const result = await Coupon.findActive({ platform, limit: 10 });
                        const coupons = result.coupons || [];

                        if (coupons.length === 0) {
                            await ctx.editMessageText(`⚠️ Sem cupons ativos para ${platform}. Publicando sem cupom...`);
                            const res = await PublishService.publishAll(prod, { manual: true });
                            await ctx.reply(res.success ? '✅ Publicado com sucesso!' : `❌ Erro: ${res.reason}`);
                            return;
                        }

                        // Montar teclado de cupons
                        const { InlineKeyboard } = await import('grammy');
                        const kb = new InlineKeyboard();
                        coupons.forEach(c => {
                            kb.text(`${c.code} (-${c.discount_type === 'percentage' ? c.discount_value + '%' : c.discount_value})`, `repub:sel_coup:${pid}:${c.id}`).row();
                        });
                        kb.text('❌ Cancelar Vínculo', `repub:no:${pid}`);

                        await ctx.editMessageText('🎟️ *Selecione o Cupom:*', { parse_mode: 'Markdown', reply_markup: kb });
                    }

                    if (action === 'sel_coup') {
                        const couponId = parts[3];
                        await ctx.editMessageText('🚀 Vinculando cupom e publicando...');

                        const prod = await Product.findById(pid);
                        if (!prod) return ctx.reply('❌ Produto não encontrado.');

                        // Clonar e atribuir cupom
                        const prodToPub = { ...prod, coupon_id: couponId };
                        const res = await PublishService.publishAll(prodToPub, { manual: true });
                        await ctx.reply(res.success ? '✅ Publicado com sucesso!' : `❌ Erro: ${res.reason}`);
                    }
                }

                // === INTERCEPTAÇÃO DE AÇÃO (PRODUTO vs CUPOM) ===
                if (data === 'action_choice:capture') {
                    const text = ctx.session.tempData.pendingInput;
                    if (!text) return ctx.reply('❌ Dados perdidos. Envie o link novamente.');

                    try {
                        await ctx.editMessageText('🕵️ Iniciando captura de produto...');
                    } catch (e) {
                        // Se falhar (ex: legenda de foto), deleta e manda nova
                        try { await ctx.deleteMessage(); } catch (delErr) { }
                        await ctx.reply('🕵️ Iniciando captura de produto...');
                    }
                    await captureLinkHandler(ctx, text);
                    ctx.session.step = 'IDLE';
                    delete ctx.session.tempData.pendingInput;
                }

                if (data === 'action_choice:clone') {
                    const text = ctx.session.tempData.pendingInput;
                    if (!text) return ctx.reply('❌ Dados perdidos. Envie a mensagem novamente.');

                    try {
                        await ctx.editMessageText('📋 Processando mensagem para clonagem de cupom...');
                    } catch (e) {
                        try { await ctx.deleteMessage(); } catch (delErr) { }
                        await ctx.reply('📋 Processando mensagem para clonagem de cupom...');
                    }

                    // Configurar estado para simular que estamos no passo de espera
                    ctx.session.step = 'COUPON_CLONE_WAITING_MSG';
                    // Inicializar estrutura do cupom se não existir
                    if (!ctx.session.tempData.coupon) ctx.session.tempData.coupon = { is_general: true };

                    // Verificar se temos foto pendente do encaminhamento
                    if (ctx.session.tempData.pendingPhoto) {
                        try {
                            const photoId = ctx.session.tempData.pendingPhoto;
                            const fileInfo = await ctx.api.getFile(photoId);
                            const fileUrl = `https://api.telegram.org/file/bot${process.env.ADMIN_BOT_TOKEN}/${fileInfo.file_path}`;
                            ctx.session.tempData.coupon.pending_image_url = fileUrl;
                            logger.info('📸 Foto encaminhada recuperada e definida para o cupom.');
                        } catch (err) {
                            logger.warn('Falha ao recuperar foto encaminhada:', err);
                        }
                    }

                    // Chamar handler diretamente passando o texto armazenado
                    await couponHandler.handleCouponSteps(ctx, text);
                    delete ctx.session.tempData.pendingInput;
                    delete ctx.session.tempData.pendingPhoto;
                }

                // Cupons (Fluxo Avançado Unificado)
                if (data.startsWith('cp:') || data.startsWith('coupon_type:') || data.startsWith('coupon_plat:')) {
                    await couponHandler.handleCouponCallbacks(ctx, data);
                    try { await ctx.answerCallbackQuery(); } catch (e) { }
                }

                if (data.startsWith('coupon:create:')) {
                    await couponHandler.startCreateCoupon(ctx);
                    await ctx.answerCallbackQuery();
                }

            } catch (e) {
                logger.error('Erro callback admin:', e);
                try { await ctx.answerCallbackQuery('Erro ao processar ação.'); } catch (e2) { }
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

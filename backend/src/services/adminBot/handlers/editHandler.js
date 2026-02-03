import { InlineKeyboard } from 'grammy';
import Product from '../../../models/Product.js';
import Category from '../../../models/Category.js';
import publishService from '../../autoSync/publishService.js';
import logger from '../../../config/logger.js';
import { adminMainMenu } from '../menus/mainMenu.js';

/**
 * Iniciar o Wizard de Edição Completa
 * Fluxo: Categoria -> Preço Original -> Preço Atual -> Link -> Confirmação
 */
export const startEditWizard = async (ctx, productId, isQuick = false) => {
    try {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();

        ctx.session.tempData.editingProductId = productId;
        ctx.session.tempData.editData = {}; // Dados temporários da edição
        ctx.session.tempData.isQuickPublish = isQuick; // Define modo da edição

        // Passo 1: Categoria
        ctx.session.step = 'EDIT_WIZARD_CATEGORY_SELECT';

        // Carregar produto
        const product = await Product.findById(productId);
        ctx.session.tempData.existingProduct = product;

        // Carregar categorias ativas
        const categories = await Category.findAll(true);

        // Montar teclado de categorias
        const keyboard = new InlineKeyboard();
        categories.forEach((cat, index) => {
            if (index > 0 && index % 2 === 0) keyboard.row(); // 2 por linha
            keyboard.text(`${cat.icon || '📁'} ${cat.name}`, `wizard_cat:${cat.id}`);
        });

        // Adicionar opções extras
        keyboard.row()
            .text('⏭️ Manter Atual', 'wizard_cat:keep')
            .text('✏️ Digitar Outra', 'wizard_cat:custom');

        await ctx.reply(
            `✏️ *Iniciando Edição do Produto*\n\n` +
            `📂 *Passo 1/4: Categoria*\n` +
            `Atual: _${product.category_name || product.category_id || 'Não def.'}_\n\n` +
            `Selecione uma categoria da lista:`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );

    } catch (error) {
        logger.error('Erro ao iniciar wizard edição:', error);
        await ctx.reply('❌ Erro ao iniciar edição. Tente novamente.');
    }
};

/**
 * Processar Seleção de Categoria (Callback)
 */
export const handleWizardCategorySelection = async (ctx, action) => {
    try {
        const editData = ctx.session.tempData.editData;

        if (action === 'keep') {
            await ctx.answerCallbackQuery('⏭️ Mantendo atual');
            // Segue para preço
        } else if (action === 'custom') {
            await ctx.answerCallbackQuery();
            ctx.session.step = 'EDIT_WIZARD_CATEGORY_CUSTOM';
            await ctx.reply('✍️ Digite o nome da nova categoria:', { parse_mode: 'Markdown' });
            return; // Interrompe aqui, espera input de texto
        } else {
            // ID da categoria selecionada
            const categoryId = action;
            // Buscar nome para display (opcional, ou pegar do cache/lista se tivesse)
            editData.category_id = categoryId;

            // Tentar descobrir o nome para feedback imediato
            try {
                const cat = await Category.findById(categoryId);
                editData.category_name = cat ? cat.name : 'Outra';
                await ctx.answerCallbackQuery(`✅ ${editData.category_name}`);
            } catch (e) { await ctx.answerCallbackQuery('✅ Selecionado'); }
        }

        // SE FOR PUBLICACAO RÁPIDA (Correção apenas de categoria)
        // Pular passos de preço e link, ir direto para cupom
        if (ctx.session.tempData.isQuickPublish) {
            return await askCouponQuestion(ctx);
        }

        // Avançar para próximo passo (Preço Original)
        ctx.session.step = 'EDIT_WIZARD_ORIGINAL_PRICE';
        const product = ctx.session.tempData.existingProduct;

        await ctx.editMessageText( // Edita a mensagem anterior para limpar botões
            `✅ Categoria definida: *${editData.category_name || 'Mantida'}*\n\n` +
            `💰 *Passo 2/4: Preço Original* (De)\n` +
            `Atual: R$ ${product.old_price || 0}\n\n` +
            `Digite o novo valor (ex: 199.90) ou 0 para manter:`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        logger.error('Erro select categoria wizard:', error);
    }
};

/**
 * Processar passods do Wizard (Input de Texto)
 */
export const handleWizardStep = async (ctx, text) => {
    const step = ctx.session.step;
    const productId = ctx.session.tempData.editingProductId;
    const product = ctx.session.tempData.existingProduct;
    const editData = ctx.session.tempData.editData;

    // ... validações de sessão ...
    if (!productId || !product) {
        await ctx.reply('❌ Sessão perdida. Reinicie a edição.');
        ctx.session.step = 'IDLE';
        return;
    }

    try {
        // --- PASSO 1 ALTERNATIVO: CATEGORIA CUSTOM (TEXTO) ---
        if (step === 'EDIT_WIZARD_CATEGORY_CUSTOM') {
            if (text !== '0') {
                editData.category_custom_name = text; // Nome digitado manualmente
                // OBS: O backend precisaria tratar create ou buscar por nome. 
                // Aqui só salvamos pra indicar intenção.
            }

            // SE FOR PUBLICACAO RÁPIDA
            if (ctx.session.tempData.isQuickPublish) {
                return await askCouponQuestion(ctx);
            }

            // Avançar
            ctx.session.step = 'EDIT_WIZARD_ORIGINAL_PRICE';
            await ctx.reply(
                `💰 *Passo 2/4: Preço Original* (De)\n` +
                `Atual: R$ ${product.old_price || 0}\n\n` +
                `Digite o novo valor (ex: 199.90) ou 0 para manter:`,
                { parse_mode: 'Markdown' }
            );

        } else if (step === 'EDIT_WIZARD_ORIGINAL_PRICE') {
            if (text !== '0') {
                const price = parseFloat(text.replace(',', '.'));
                if (isNaN(price)) return ctx.reply('❌ Valor inválido. Digite apenas números (ex: 199.90).');
                editData.old_price = price;
            }

            // Próximo passo
            ctx.session.step = 'EDIT_WIZARD_CURRENT_PRICE';
            await ctx.reply(
                `💵 *Passo 3/4: Preço Promocional* (Por)\n` +
                `Atual: R$ ${product.current_price || 0}\n\n` +
                `Digite o novo valor (ex: 149.90) ou 0 para manter:`,
                { parse_mode: 'Markdown' }
            );


            // --- PASSO 3: PREÇO ATUAL ---
        } else if (step === 'EDIT_WIZARD_CURRENT_PRICE') {
            if (text !== '0') {
                const price = parseFloat(text.replace(',', '.'));
                if (isNaN(price)) return ctx.reply('❌ Valor inválido. Digite apenas números.');
                editData.current_price = price;
            }

            // Próximo passo
            ctx.session.step = 'EDIT_WIZARD_LINK';
            await ctx.reply(
                `🔗 *Passo 4/4: Link de Afiliado*\n` +
                `Atual: ${product.affiliate_link ? 'Definido' : 'Vazio'}\n\n` +
                `Cole o novo link ou 0 para manter:`,
                { parse_mode: 'Markdown' }
            );


            // --- PASSO 4: LINK ---
        } else if (step === 'EDIT_WIZARD_LINK') {
            if (text !== '0') {
                if (!text.startsWith('http')) return ctx.reply('❌ Link inválido. Deve começar com http.');
                editData.affiliate_link = text;
            }

            // Próximo passo: Perguntar sobre Cupom (NOVO FLUXO)
            await askCouponQuestion(ctx);
        }

    } catch (error) {
        logger.error('Erro no wizard step:', error);
        await ctx.reply('❌ Ocorreu um erro no processamento. Tente novamente.');
    }
};

/**
 * Perguntar se deseja vincular cupom
 */
const askCouponQuestion = async (ctx) => {
    ctx.session.step = 'EDIT_WIZARD_COUPON_ASK';

    const keyboard = new InlineKeyboard()
        .text('✅ Sim, vincular cupom', 'wizard_coup_ask:yes')
        .text('❌ Não precisa', 'wizard_coup_ask:no');

    await ctx.reply(
        `🎫 *Passo Extra: Cupom de Desconto*\n\n` +
        `Deseja vincular um cupom existente a esta oferta?`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
};

// Importar Coupon Model (Adicionar no topo do arquivo se não tiver) - Feito via replace separado ou assumir import
// Para garantir, vamos adicionar a função de callback e assumir que o Coupon será importado.

/**
 * Handle Resposta Pergunta Cupom
 */
export const handleWizardCouponAsk = async (ctx, action) => {
    try {
        if (action === 'no') {
            await ctx.answerCallbackQuery();
            // Ir para resumo
            return await generateSummaryAndConfirm(ctx);
        }

        if (action === 'yes') {
            await ctx.answerCallbackQuery('Carregando cupons...');

            // Buscar cupons ativos para a plataforma do produto
            const product = ctx.session.tempData.existingProduct;
            const Coupon = (await import('../../../models/Coupon.js')).default; // Import dinâmico para evitar circular deps se houver

            const { coupons } = await Coupon.findActive({
                platform: product.platform,
                limit: 10
            });

            if (!coupons || coupons.length === 0) {
                await ctx.reply('⚠️ Nenhum cupom ativo encontrado para esta plataforma. Seguindo sem cupom.');
                return await generateSummaryAndConfirm(ctx);
            }

            const keyboard = new InlineKeyboard();
            coupons.forEach((coupon, index) => {
                if (index > 0 && index % 1 === 0) keyboard.row();
                // Label: [CODE] - Desc (R$ XX)
                const label = `[${coupon.code}] ${coupon.discount_value ? `R$${coupon.discount_value}` : ''} ${coupon.description || ''}`.substring(0, 40);
                keyboard.text(label, `wizard_coup_sel:${coupon.id}`);
            });
            keyboard.row().text('❌ Cancelar seleção', 'wizard_coup_sel:none');

            ctx.session.step = 'EDIT_WIZARD_COUPON_SELECT';
            await ctx.editMessageText('🎫 Selecione um cupom para vincular:', { reply_markup: keyboard });
        }
    } catch (e) {
        logger.error('Erro wizard coupon ask:', e);
        await ctx.reply('Erro ao carregar cupons. Pulando etapa.');
        return await generateSummaryAndConfirm(ctx);
    }
};

/**
 * Handle Seleção de Cupom
 */
export const handleWizardCouponSelect = async (ctx, couponId) => {
    try {
        if (couponId !== 'none') {
            const Coupon = (await import('../../../models/Coupon.js')).default;
            const coupon = await Coupon.findById(couponId);

            if (coupon) {
                ctx.session.tempData.editData.coupon_id = coupon.id;
                ctx.session.tempData.editData.coupon_code = coupon.code; // Para display
                await ctx.answerCallbackQuery(`✅ Cupom ${coupon.code} vinculado!`);
            } else {
                await ctx.answerCallbackQuery('⚠️ Cupom não encontrado.');
            }
        } else {
            await ctx.answerCallbackQuery();
        }

        // Ir para resumo
        return await generateSummaryAndConfirm(ctx);

    } catch (e) {
        logger.error('Erro wizard coupon select:', e);
        return await generateSummaryAndConfirm(ctx);
    }
};

/**
 * Gerar Resumo Final e Pedir Confirmação
 */
const generateSummaryAndConfirm = async (ctx) => {
    const product = ctx.session.tempData.existingProduct;
    const editData = ctx.session.tempData.editData;

    // FIM: Mostrar Resumo e Confirmar
    const finalOldPrice = editData.old_price !== undefined ? editData.old_price : product.old_price;
    const finalCurrentPrice = editData.current_price !== undefined ? editData.current_price : product.current_price;

    // Recalcular desconto
    let discount = 0;
    if (finalOldPrice > finalCurrentPrice && finalOldPrice > 0) {
        discount = Math.round(((finalOldPrice - finalCurrentPrice) / finalOldPrice) * 100);
    }
    editData.discount_percentage = discount;

    const summary =
        `📋 *Confirmação de Edição*\n\n` +
        `🏷️ Nome: *${product.name}*\n` +
        `📂 Categoria: ${editData.category_name || editData.category_id || product.category_id || 'N/A'}\n` +
        `💰 De: R$ ${finalOldPrice}\n` +
        `💵 Por: R$ ${finalCurrentPrice}\n` +
        `📉 Desconto: ${discount}%\n` +
        `🎫 Cupom: ${editData.coupon_code || (product.coupon_id ? 'Mantido' : 'Nenhum')}\n` +
        `🔗 Link: ${editData.affiliate_link ? 'Alterado' : 'Mantido'}`;

    const keyboard = new InlineKeyboard()
        .text('✅ Salvar e Publicar', 'wizard_confirm:save_publish').row()
        .text('💾 Apenas Salvar', 'wizard_confirm:save_only').row()
        .text('❌ Cancelar', 'wizard_confirm:cancel');

    try {
        // Se for edição de mensagem (callback)
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(summary, { parse_mode: 'Markdown', reply_markup: keyboard });
            } catch (e) {
                try { await ctx.deleteMessage(); } catch (err) { }
                await ctx.reply(summary, { parse_mode: 'Markdown', reply_markup: keyboard });
            }
        } else {
            await ctx.reply(summary, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
        ctx.session.step = 'EDIT_WIZARD_CONFIRM';
    } catch (e) {
        // Fallback sem markdown
        const safeSummary = summary.replace(/\*/g, '').replace(/_/g, '');
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(safeSummary, { reply_markup: keyboard });
            } catch (err) {
                try { await ctx.deleteMessage(); } catch (delErr) { }
                await ctx.reply(safeSummary, { reply_markup: keyboard });
            }
        } else {
            await ctx.reply(safeSummary, { reply_markup: keyboard });
        }
        ctx.session.step = 'EDIT_WIZARD_CONFIRM';
    }
};

/**
 * Confirmar e Salvar (Callback) - CORRIGIDO
 */
export const handleWizardConfirm = async (ctx, action) => {
    try {
        const productId = ctx.session.tempData.editingProductId;
        const editData = ctx.session.tempData.editData;

        if (action === 'cancel') {
            try {
                await ctx.editMessageText('❌ Edição cancelada.');
            } catch (e) {
                try { await ctx.deleteMessage(); } catch (err) { }
                await ctx.reply('❌ Edição cancelada.');
            }
            ctx.session.step = 'IDLE';
            return;
        }

        // Aplicar as edições no banco
        const updates = {};
        if (editData.category_id) updates.category_id = editData.category_id;
        if (editData.old_price !== undefined) updates.old_price = editData.old_price;
        if (editData.current_price !== undefined) updates.current_price = editData.current_price;
        if (editData.affiliate_link) updates.affiliate_link = editData.affiliate_link;
        if (editData.discount_percentage !== undefined) updates.discount_percentage = editData.discount_percentage;
        if (editData.coupon_id) updates.coupon_id = editData.coupon_id;

        // Se a categoria foi editada manualmente, marcar flag
        const manualCategory = !!editData.category_id;

        // Salvar updates iniciais
        await Product.update(productId, updates);

        if (action === 'save_publish') {
            await ctx.answerCallbackQuery('🚀 Processando publicação...');
            try {
                await ctx.editMessageText('⏳ Publicando nos canais... aguarde.');
            } catch (e) {
                // Se falhar edit, manda novo msg de status
                await ctx.reply('⏳ Publicando nos canais... aguarde.');
            }

            // Buscar produto atualizado completo
            const fullProduct = await Product.findById(productId);

            // Verificar imagem (apenas log)
            if (!fullProduct.image_url || fullProduct.image_url.includes('placeholder')) {
                logger.warn(`AdminBot: Produto ${productId} sem imagem válida para publicação.`);
            }

            try {
                // Executar Serviço de Publicação Real
                const publishResult = await publishService.publishAll(fullProduct, {
                    manual: true, // Força publicação imediata
                    skipAiCategory: manualCategory,
                    manualCategoryId: editData.category_id
                });

                if (publishResult.success) {
                    await Product.update(productId, { status: 'published', stock_available: true, is_active: true });

                    // SUCESSO SEM MARKDOWN COMPLEXO
                    // Evita o erro 'can't parse entities' removendo JSON e chars especiais
                    await ctx.editMessageText(
                        `✅ *Sucesso!* O produto foi salvo e enviado para publicação.\n\n` +
                        `📢 _Aguarde alguns instantes para ver nos canais._`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    await Product.update(productId, { status: 'approved' });
                    await ctx.editMessageText(
                        `⚠️ *Salvo, mas não publicado*\n\n` +
                        `Erro: ${publishResult.reason || 'Desconhecido'}\n` +
                        `_Status: Aprovado_`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (pubError) {
                logger.error('Erro no publishService:', pubError);
                await ctx.editMessageText(`❌ Erro ao invocar serviço de publicação: ${pubError.message}`);
            }

        } else {
            // Apenas salvar
            await ctx.answerCallbackQuery('✅ Salvo!');
            try {
                await ctx.editMessageText('✅ Alterações salvas com sucesso! (Não publicado)', { reply_markup: adminMainMenu });
            } catch (e) {
                try { await ctx.deleteMessage(); } catch (err) { }
                await ctx.reply('✅ Alterações salvas com sucesso! (Não publicado)', { reply_markup: adminMainMenu });
            }
        }

        ctx.session.step = 'IDLE';

    } catch (error) {
        logger.error('Erro ao salvar wizard:', error);
        // Fallback seguro de erro
        try {
            await ctx.reply(`❌ Ocorreu um erro: ${error.message}`);
        } catch (e) { }
    }
};

/**
 * Iniciar Fluxo Rápido de Publicação (Pular wizard, ir para Cupom -> Resumo)
 */
export const startQuickPublishFlow = async (ctx, productId) => {
    try {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();

        // Inicializar sessão
        ctx.session.tempData.editingProductId = productId;
        ctx.session.tempData.editData = {};

        // Carregar produto
        const product = await Product.findById(productId);
        if (!product) {
            return ctx.reply('❌ Produto não encontrado.');
        }
        ctx.session.tempData.existingProduct = product;

        // VERIFICAÇÃO DE CATEGORIA OBRIGATÓRIA
        // Se não tiver categoria, os canais podem rejeitar (como visto nos logs).
        // Forçar o usuário a definir categoria iniciando o wizard completo.
        if (!product.category_id) {
            // Flag passada via argumento para startEditWizard
            await ctx.reply('⚠️ *Atenção:* Este produto não tem uma categoria definida.\n\nPara publicar, é necessário selecionar uma categoria. Iniciando edição rápida...', { parse_mode: 'Markdown' });
            return await startEditWizard(ctx, productId, true);
        }

        // Ir direto para pergunta de cupom
        await askCouponQuestion(ctx);

    } catch (error) {
        logger.error('Erro ao iniciar quick publish:', error);
        await ctx.reply('❌ Erro ao iniciar fluxo de publicação.');
    }
};

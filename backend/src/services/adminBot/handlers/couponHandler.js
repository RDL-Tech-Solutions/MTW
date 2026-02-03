import Coupon from '../../../models/Coupon.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';
import logger from '../../../config/logger.js';
import { InlineKeyboard } from 'grammy';
import advancedTemplateGenerator from '../../../ai/advancedTemplateGenerator.js';
import openrouterClient from '../../../ai/openrouterClient.js';
import path from 'path';

/**
 * Iniciar criação de cupom (Menu Inicial)
 */
export const startCreateCoupon = async (ctx) => {
    // Inicializar sessão de cupom
    ctx.session.tempData.coupon = {
        is_general: true // Default: Para todos os produtos
    };

    const keyboard = new InlineKeyboard()
        .text('📋 Clonar de Mensagem', 'cp:start_clone').row()
        .text('✍️ Criar Manualmente', 'cp:start_manual');

    await ctx.reply(
        '🎫 *Gerenciador de Cupons*\n\n' +
        'Como você deseja adicionar o cupom?',
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
    ctx.session.step = 'COUPON_MENU';
};

/**
 * Funções auxiliares para Perguntas
 */
async function askPhotoQuestion(ctx) {
    const kb = new InlineKeyboard()
        .text('📸 Sim, enviar foto', 'cp:photo:yes')
        .text('❌ Não (Padrão)', 'cp:photo:no');

    await ctx.reply(
        '📸 *Deseja enviar uma foto personalizada para este cupom?*\n\n' +
        'Se selecionar *Não*, usaremos a logo padrão da plataforma.',
        { parse_mode: 'Markdown', reply_markup: kb }
    );
    ctx.session.step = 'COUPON_WAITING_PHOTO_DECISION';
}

/**
 * Processar entradas de Texto e FOTOS para Steps
 */
export const handleCouponSteps = async (ctx, text) => {
    const step = ctx.session.step;
    const coupon = ctx.session.tempData.coupon;

    // --- MODO FOTO (NOVO) ---
    if (step === 'COUPON_WAITING_PHOTO') {
        // Verificar se tem foto
        if (ctx.message && ctx.message.photo && ctx.message.photo.length > 0) {
            try {
                // Pegar a foto de maior resolução
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                const fileId = photo.file_id;

                // Obter URL do arquivo (grammy)
                const fileInfo = await ctx.api.getFile(fileId);
                const fileUrl = `https://api.telegram.org/file/bot${process.env.ADMIN_BOT_TOKEN}/${fileInfo.file_path}`;

                coupon.image_url = fileUrl;

                await ctx.reply('✅ Foto recebida com sucesso!');
                return await showReviewMenu(ctx);
            } catch (e) {
                logger.error('Erro ao processar foto:', e);
                await ctx.reply('❌ Erro ao baixar foto. Tente novamente ou pule.');
            }
        } else {
            // Se mandou texto em vez de foto
            if (text && (text.toLowerCase() === 'pular' || text === '0')) {
                coupon.image_url = null;
                await ctx.reply('⏩ Foto pulada.');
                return await showReviewMenu(ctx);
            }
            await ctx.reply('❌ Por favor, envie uma **imagem** ou digite "Pular".', { parse_mode: 'Markdown' });
        }
        return;
    }


    // --- MODO CLONE ---
    if (step === 'COUPON_CLONE_WAITING_MSG') {
        const msgText = text || (ctx.message && ctx.message.caption);

        if (msgText) {
            const replyOptions = {};
            if (ctx.message && ctx.message.message_id) {
                replyOptions.reply_to_message_id = ctx.message.message_id;
            }
            await ctx.reply('🤖 Analisando mensagem com IA...', replyOptions);

            // 1. Tentar Extração via IA (Análise Completa)
            let extractedData = {};
            try {
                const aiPrompt = `Extraia os detalhes do cupom desta mensagem de oferta. 
                Seja preciso com o código, valor e plataforma.
                Procure especialmente por códigos entre aspas simples como 'CUPOM10'.
                
                Mensagem: "${msgText}"
                
                Retorne APENAS um JSON:
                {
                  "code": "CÓDIGO",
                  "discount_value": 10,
                  "discount_type": "percentage|fixed",
                  "platform": "shopee|mercadolivre|amazon|aliexpress|magazineluiza|kabum|pichau|general",
                  "min_purchase": 0,
                  "max_discount_value": null,
                  "is_general": true
                }`;

                const aiResponse = await openrouterClient.makeRequest(aiPrompt);
                extractedData = aiResponse;
                logger.info(`🤖 [IA] Dados extraídos: ${JSON.stringify(extractedData)}`);
            } catch (aiError) {
                logger.warn(`⚠️ Falha na IA, usando extração padrão: ${aiError.message}`);
                extractedData = parseMessageWithAI(msgText);
            }

            // 2. Sincronização com Banco de Dados
            if (extractedData.code) {
                try {
                    const existing = await Coupon.findByCode(extractedData.code.toUpperCase());
                    if (existing) {
                        logger.info(`📦 [Banco] Cupom ${extractedData.code} encontrado, mesclando dados.`);
                        // Mesclar dados do banco (prioridade) com os novos da mensagem
                        extractedData = {
                            ...extractedData,
                            ...existing,
                            id: null, // Resetar ID para criar novo ou tratar como novo objeto na sessão
                            _original_id: existing.id // Guardar para aprovação posterior
                        };
                        await ctx.reply('📦 *Cupom encontrado no banco!* Os dados foram carregados automaticamente.', { parse_mode: 'Markdown' });
                    }
                } catch (dbError) {
                    logger.error(`Erro ao buscar cupom no banco: ${dbError.message}`);
                }
            }

            ctx.session.tempData.coupon = { ...coupon, ...extractedData };

            // 3. Detecção de Foto na Mensagem Original (ou encaminhada)
            // Verificar explicitamente a mensagem atual OU se já temos uma URL pendente vinda do index.js
            const hasCurrentPhoto = ctx.message && ctx.message.photo && ctx.message.photo.length > 0;
            const hasPendingPhoto = ctx.session.tempData.coupon.pending_image_url;

            if (hasCurrentPhoto || hasPendingPhoto) {
                // Se for foto nova na mensagem atual, processar ela
                if (hasCurrentPhoto) {
                    try {
                        const photo = ctx.message.photo[ctx.message.photo.length - 1];
                        const fileInfo = await ctx.api.getFile(photo.file_id);
                        const fileUrl = `https://api.telegram.org/file/bot${process.env.ADMIN_BOT_TOKEN}/${fileInfo.file_path}`;
                        ctx.session.tempData.coupon.pending_image_url = fileUrl;
                    } catch (e) {
                        logger.warn('Erro ao processar foto da mensagem no passo clone:', e);
                    }
                }

                const kb = new InlineKeyboard()
                    .text('✅ Usar Foto da Mensagem', 'cp:photo:use_current')
                    .text('📸 Enviar Outra', 'cp:photo:yes')
                    .text('❌ Usar Padrão (Logo)', 'cp:photo:no');

                await ctx.reply('🖼️ *Detectei uma foto na mensagem!*\nO que deseja fazer?', { parse_mode: 'Markdown', reply_markup: kb });
                ctx.session.step = 'COUPON_WAITING_PHOTO_DECISION';
                return;
            }

        }

        // Fluxo padrão se não tiver foto ou falhar extração
        return await askPhotoQuestion(ctx);
    }

    // --- MODO MANUAL / EDIÇÃO ---
    if (step === 'COUPON_EDIT_FIELD_CODE' || step === 'COUPON_MANUAL_CODE') {
        coupon.code = text.toUpperCase().trim();
        if (step === 'COUPON_MANUAL_CODE') {
            ctx.session.step = 'COUPON_MANUAL_VALUE';
            await ctx.reply('💰 *Valor do Desconto* (ex: 10 ou 15.90):', { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(`✅ Código atualizado: *${coupon.code}*`, { parse_mode: 'Markdown' });
            return await showReviewMenu(ctx);
        }
    }

    else if (step === 'COUPON_EDIT_FIELD_DISCOUNT' || step === 'COUPON_MANUAL_VALUE') {
        const num = parseFloat(text.replace(',', '.').replace(/[^0-9.]/g, ''));
        if (isNaN(num)) return ctx.reply('❌ Digite um número válido.');
        coupon.discount_value = num;

        if (step === 'COUPON_MANUAL_VALUE') {
            const kb = new InlineKeyboard()
                .text('% Porcentagem', 'cp:type:percentage')
                .text('R$ Fixo', 'cp:type:fixed');
            await ctx.reply('Qual o *tipo* de desconto?', { parse_mode: 'Markdown', reply_markup: kb });
        } else {
            await ctx.reply(`✅ Desconto atualizado: *${num}*`, { parse_mode: 'Markdown' });
            return await showReviewMenu(ctx);
        }
    }

    else if (step === 'COUPON_EDIT_FIELD_MIN') {
        const num = parseFloat(text.replace(',', '.').replace(/[^0-9.]/g, ''));
        if (!isNaN(num) || text === '0') {
            coupon.min_purchase = text === '0' ? 0 : num;
            await ctx.reply(`✅ Mínimo atualizado.`, { parse_mode: 'Markdown' });
            return await showReviewMenu(ctx);
        } else {
            await ctx.reply('❌ Digite um valor válido ou 0.');
        }
    }

    else if (step === 'COUPON_MANUAL_MAX_DISCOUNT' || step === 'COUPON_EDIT_FIELD_MAX_DISCOUNT') {
        const num = parseFloat(text.replace(',', '.').replace(/[^0-9.]/g, ''));
        if (text === '0' || text.toLowerCase() === 'pular') {
            coupon.max_discount_value = null;
        } else if (!isNaN(num)) {
            coupon.max_discount_value = num;
        } else {
            return ctx.reply('❌ Digite um valor válido ou 0 para pular.');
        }

        if (step === 'COUPON_MANUAL_MAX_DISCOUNT') {
            return await askPlatformSelection(ctx);
        } else {
            await ctx.reply(`✅ Limite de desconto atualizado.`);
            return await showReviewMenu(ctx);
        }
    }

    // --- NOVOS CAMPOS OPCIONAIS ---
    else if (step === 'COUPON_MANUAL_EXPIRATION' || step === 'COUPON_EDIT_FIELD_EXPIRATION') {
        if (text === '0' || text.toLowerCase() === 'pular') {
            coupon.valid_until = null;
        } else {
            const date = parseDate(text);
            if (!date) return ctx.reply('❌ Data inválida. Use DD/MM/AAAA ou responda "0" para pular.');
            coupon.valid_until = date;
        }

        if (step === 'COUPON_MANUAL_EXPIRATION') {
            // Próximo passo manual: Aplicabilidade
            const kb = new InlineKeyboard()
                .text('🌍 Todos os Produtos', 'cp:app:general')
                .text('🔒 Produtos Selecionados', 'cp:app:specific');

            await ctx.reply('A aplicabilidade é para *Todos os Produtos* ou *Produtos Selecionados*?', { parse_mode: 'Markdown', reply_markup: kb });
            ctx.session.step = 'COUPON_WAITING_APPLICABILITY';
        } else {
            await ctx.reply('✅ Data atualizada.');
            return await showReviewMenu(ctx);
        }
    }

    else if (step === 'COUPON_MANUAL_PRODUCTS' || step === 'COUPON_EDIT_FIELD_PRODUCTS') {
        // Receber lista de produtos
        const prods = text.split(',').map(p => p.trim()).filter(p => p.length > 0);
        coupon.applicable_products = prods;
        coupon.is_general = false;

        await ctx.reply(`✅ ${prods.length} produtos definidos.`);

        // Se estava editando, volta pro menu. Se estava criando manual, vai pra foto.
        if (step === 'COUPON_MANUAL_PRODUCTS') {
            return await askPhotoQuestion(ctx);
        }
        return await showReviewMenu(ctx);
    }
};

/**
 * Processar Callbacks (Botões)
 */
export const handleCouponCallbacks = async (ctx, action) => {
    const coupon = ctx.session.tempData.coupon || {};
    if (!ctx.session.tempData.coupon) ctx.session.tempData.coupon = coupon;

    // --- INÍCIO ---
    if (action === 'cp:start_clone') {
        ctx.session.step = 'COUPON_CLONE_WAITING_MSG';
        try {
            await ctx.editMessageText('📋 *Modo Clone*\nCole a mensagem do cupom:', { parse_mode: 'Markdown' });
        } catch (e) {
            try { await ctx.deleteMessage(); } catch (delErr) { }
            await ctx.reply('📋 *Modo Clone*\nCole a mensagem do cupom:', { parse_mode: 'Markdown' });
        }
    }
    if (action === 'cp:start_manual') {
        ctx.session.step = 'COUPON_MANUAL_CODE';
        try {
            await ctx.editMessageText('✍️ Digite o *CÓDIGO* do cupom:', { parse_mode: 'Markdown' });
        } catch (e) {
            try { await ctx.deleteMessage(); } catch (delErr) { }
            await ctx.reply('✍️ Digite o *CÓDIGO* do cupom:', { parse_mode: 'Markdown' });
        }
    }

    // --- FLUXO MANUAL ---
    if (action.startsWith('cp:type:')) {
        coupon.discount_type = action.split(':')[2];

        if (coupon.discount_type === 'percentage') {
            ctx.session.step = 'COUPON_MANUAL_MAX_DISCOUNT';
            const kb = new InlineKeyboard().text('⏩ Pular', 'cp:skip_max_discount');
            await ctx.editMessageText('💰 *Limite Máximo de Desconto* (R$)\nDigite o valor máximo (ex: 20) ou 0 para sem limite:', { parse_mode: 'Markdown', reply_markup: kb });
        } else {
            coupon.max_discount_value = null;
            await askPlatformSelection(ctx);
        }
    }

    if (action === 'cp:skip_max_discount') {
        coupon.max_discount_value = null;
        await askPlatformSelection(ctx);
    }

    if (action.startsWith('cp:plat:')) {
        coupon.platform = action.split(':')[2];
        const kb = new InlineKeyboard().text('⏩ Pular / Sem data', 'cp:skip_expiration');
        ctx.session.step = 'COUPON_MANUAL_EXPIRATION';
        await ctx.editMessageText('📅 *Data de Expiração* (Opcional)\nDigite a data data (DD/MM/AAAA) ou clique em Pular:', { parse_mode: 'Markdown', reply_markup: kb });
    }

    if (action === 'cp:skip_expiration') {
        coupon.valid_until = null;
        // Próximo passo: Aplicabilidade
        const kb = new InlineKeyboard()
            .text('🌍 Todos os Produtos', 'cp:app:general')
            .text('🔒 Produtos Selecionados', 'cp:app:specific');
        await ctx.editMessageText('A aplicabilidade é para *Todos os Produtos* ou *Produtos Selecionados*?', { parse_mode: 'Markdown', reply_markup: kb });
        ctx.session.step = 'COUPON_WAITING_APPLICABILITY';
    }

    if (action.startsWith('cp:app:')) {
        const type = action.split(':')[2];
        if (type === 'general') {
            coupon.is_general = true;
            coupon.applicable_products = [];
            // Depois de geral, vai para Foto
            await askPhotoQuestion(ctx);
        } else {
            coupon.is_general = false;
            coupon.applicable_products = []; // Lista vazia (genérico)
            // Pular pergunta de produtos, ir direto para foto
            await askPhotoQuestion(ctx);
        }
    }

    if (action === 'cp:photo:use_current') {
        coupon.image_url = coupon.pending_image_url;
        delete coupon.pending_image_url;
        try {
            await ctx.editMessageText('✅ Foto da mensagem será utilizada.');
        } catch (e) {
            await ctx.reply('✅ Foto da mensagem será utilizada.');
        }
        await showReviewMenu(ctx);
    }

    if (action === 'cp:photo:yes') {
        ctx.session.step = 'COUPON_WAITING_PHOTO';
        await ctx.editMessageText('📸 *Envie a foto do cupom agora:*', { parse_mode: 'Markdown' });
    }
    if (action === 'cp:photo:no') {
        coupon.image_url = null; // Reset para garantir default
        delete coupon.pending_image_url;
        await showReviewMenu(ctx);
    }


    // --- REVISÃO / EDIÇÃO ---
    if (action.startsWith('cp:edit:')) {
        const field = action.split(':')[2];

        if (field === 'plat') {
            await ctx.editMessageText('Selecione a nova *Plataforma*:', { reply_markup: getPlatformKeyboard() });
            return;
        }
        if (field === 'type') {
            const kb = new InlineKeyboard().text('%', 'cp:set_type:percentage').text('R$', 'cp:set_type:fixed');
            await ctx.editMessageText('Selecione o *Tipo*:', { reply_markup: kb });
            return;
        }
        if (field === 'app') {
            const kb = new InlineKeyboard().text('🌍 Todos os Produtos', 'cp:app:general').text('🔒 Produtos Selecionados', 'cp:app:specific');
            await ctx.editMessageText('A aplicabilidade é para *Todos os Produtos* ou *Produtos Selecionados*?', { reply_markup: kb });
            return;
        }
        if (field === 'photo') {
            const kb = new InlineKeyboard().text('📸 Sim, alterar', 'cp:photo:yes').text('❌ Não (Padrão)', 'cp:photo:no');
            await ctx.editMessageText('Deseja enviar uma foto personalizada?', { reply_markup: kb });
            return;
        }

        let prompt = '';
        if (field === 'code') { prompt = '✏️ Digite o novo *CÓDIGO*:'; ctx.session.step = 'COUPON_EDIT_FIELD_CODE'; }
        else if (field === 'discount') { prompt = '✏️ Digite o *VALOR*:'; ctx.session.step = 'COUPON_EDIT_FIELD_DISCOUNT'; }
        else if (field === 'max_discount') { prompt = '✏️ Digite o *Limite Máximo* (0 para sem limite):'; ctx.session.step = 'COUPON_EDIT_FIELD_MAX_DISCOUNT'; }
        else if (field === 'min') { prompt = '✏️ Digite o *Mínimo* (0 para limpar):'; ctx.session.step = 'COUPON_EDIT_FIELD_MIN'; }
        else if (field === 'expiration') { prompt = '📅 Digite a nova *Data* (DD/MM/AAAA) ou "0":'; ctx.session.step = 'COUPON_EDIT_FIELD_EXPIRATION'; }
        else if (field === 'products') { prompt = '📝 Digite os *Produtos* (separados por vírgula):'; ctx.session.step = 'COUPON_EDIT_FIELD_PRODUCTS'; }

        await ctx.editMessageText(prompt, { parse_mode: 'Markdown' });
    }

    if (action.startsWith('cp:set_type:')) {
        coupon.discount_type = action.split(':')[2];
        await showReviewMenu(ctx);
    }

    // --- SALVAR / PUBLICAR ---
    if (action === 'cp:save_only') {
        await saveCoupon(ctx, coupon);
        try {
            await ctx.editMessageText('💾 Cupom salvo com sucesso! (Não publicado)');
        } catch (e) {
            await ctx.reply('💾 Cupom salvo com sucesso! (Não publicado)');
        }
        ctx.session.step = 'IDLE';
    }

    if (action === 'cp:publish_now') {
        const saved = await saveCoupon(ctx, coupon);
        if (saved) {
            try {
                await ctx.editMessageText('🚀 Enviando para canais...');
            } catch (e) { await ctx.reply('🚀 Enviando para canais...'); }
            await publishCoupon(ctx, saved);
        }
    }
};

// --- FUNÇÕES AUXILIARES ---

async function showReviewMenu(ctx) {
    const coupon = ctx.session.tempData.coupon;
    const preview = formatMatches(coupon);

    const keyboard = new InlineKeyboard()
        .text(coupon.platform ? `🏪 ${coupon.platform}` : '🏪 Plataforma', 'cp:edit:plat')
        .text(coupon.code ? `🎟️ ${coupon.code}` : '🎟️ Código', 'cp:edit:code').row()

        .text(coupon.discount_value ? `💰 ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}` : '💰 Valor', 'cp:edit:discount')
        .text(coupon.max_discount_value ? `📉 Max R$${coupon.max_discount_value}` : '📉 Limite', 'cp:edit:max_discount').row()

        .text(coupon.min_purchase ? `🛒 Mín R$${coupon.min_purchase}` : '🛒 Mínimo', 'cp:edit:min')
        .text(coupon.valid_until ? `📅 ${new Date(coupon.valid_until).toLocaleDateString('pt-BR').substring(0, 5)}` : '📅 Expira', 'cp:edit:expiration').row()

        .text(coupon.is_general ? '🌍 Todos Produtos' : '🔒 Selecionados', 'cp:edit:app')
        .text(coupon.image_url ? '📸 Com Foto' : '🖼️ Sem Foto', 'cp:edit:photo').row()

        .text('🚀 PUBLICAR AGORA', 'cp:publish_now').row()
        .text('💾 Apenas Salvar', 'cp:save_only');

    const msg = `📋 *Revisão do Cupom*\n\n${preview}\n\n_Toque nos botões para editar cada campo._`;
    ctx.session.step = 'COUPON_CONFIRM_PUBLISH';
    try { await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard }); }
    catch (e) {
        try { await ctx.deleteMessage(); } catch (delErr) { }
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
}

async function askPlatformSelection(ctx) {
    const msg = 'Selecione a *Plataforma* do cupom:';
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: getPlatformKeyboard() });
        } catch (e) {
            try { await ctx.deleteMessage(); } catch (delErr) { }
            await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: getPlatformKeyboard() });
        }
    } else {
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: getPlatformKeyboard() });
    }
}

function getPlatformKeyboard() {
    return new InlineKeyboard()
        .text('Amazon', 'cp:plat:amazon').text('Shopee', 'cp:plat:shopee').row()
        .text('Mercado Livre', 'cp:plat:mercadolivre').text('AliExpress', 'cp:plat:aliexpress').row()
        .text('Magalu', 'cp:plat:magazineluiza').text('Kabum', 'cp:plat:kabum').row()
        .text('Geral / Outra', 'cp:plat:general');
}

function formatMatches(c) {
    let txt = `🏪 Plataforma: *${c.platform || '❓ Indefinida'}*\n` +
        `🎟️ Código: *${c.code || '❓'}*\n` +
        `💰 Desconto: *${c.discount_value || 0}${c.discount_type === 'percentage' ? '%' : ' R$'}*\n`;

    if (c.max_discount_value) txt += `📉 Limite: R$ ${c.max_discount_value}\n`;
    if (c.min_purchase) txt += `🛒 Mínimo: R$ ${c.min_purchase}\n`;
    if (c.valid_until) txt += `📅 Validade: ${new Date(c.valid_until).toLocaleDateString('pt-BR')}\n`;

    txt += `📦 Regra: ${c.is_general ? '🌍 Todos Produtos' : `🔒 Em produtos selecionados`}\n`;
    txt += `📸 Imagem: ${c.image_url ? '✅ Personalizada' : '🖼️ Padrão'}\n`;

    return txt;
}

function parseDate(str) {
    const parts = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!parts) return null;
    const dt = new Date(`${parts[3]}-${parts[2]}-${parts[1]}T23:59:59`); // Fim do dia
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString();
}

async function saveCoupon(ctx, data) {
    try {
        const toSave = {
            ...data,
            valid_from: new Date().toISOString(),
            is_active: true,
            capture_source: 'admin_bot'
        };
        // Garantir campos opcionais nulos se vazios
        if (!toSave.valid_until) toSave.valid_until = null;
        if (toSave.is_general === undefined) toSave.is_general = true;

        const saved = await Coupon.create(toSave);

        // 4. Aprovação Automática de Cupons Pendentes
        if (saved && saved.code) {
            try {
                // Buscar outros cupons com o mesmo código que estão pendentes
                const pendingCoupons = await Coupon.findAllByCode(saved.code, {
                    excludeId: saved.id,
                    onlyPending: true
                });

                if (pendingCoupons.length > 0) {
                    logger.info(`✅ [Aprovação] Aprovando ${pendingCoupons.length} cupons pendentes com código ${saved.code}`);
                    for (const pc of pendingCoupons) {
                        await Coupon.approve(pc.id);
                    }
                }
            } catch (approvalError) {
                logger.error(`Erro ao aprovar cupons pendentes: ${approvalError.message}`);
            }
        }

        return saved;
    } catch (e) {
        logger.error('Erro ao salvar cupom:', e);
        await ctx.reply(`❌ Erro ao salvar: ${e.message}`);
        return null;
    }
}

async function publishCoupon(ctx, coupon) {
    try {
        // Converter documento mongoose para objeto para garantir que notificationDispatcher possa alterar data
        const couponData = coupon.toObject ? coupon.toObject() : { ...coupon };

        // Assinatura correta: dispatch(eventType, data, options)
        const result = await notificationDispatcher.dispatch('coupon_new', couponData, { manual: true });

        let msg = `✅ *Cupom Publicado!*\n\n`;
        if (result.results && result.results.length > 0) {
            const success = result.results.filter(r => r.success).length;
            msg += `📢 Enviado para ${success}/${result.results.length} canais.`;
        } else {
            msg += `⚠️ Nenhum envio confirmado. Verifique logs.`;
        }
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
        ctx.session.step = 'IDLE';
    } catch (e) {
        logger.error('Erro publicando cupom:', e);
        await ctx.reply(`❌ Erro na publicação: ${e.message}`);
    }
}

// --- PARSER DE TEXTO ("IA") ---
function parseMessageWithAI(text) {
    const data = { platform: 'general', discount_type: 'percentage', discount_value: 0, is_general: true };
    const t = text.toLowerCase();

    // Plataforma
    if (t.includes('shopee') || t.includes('shp.ee')) data.platform = 'shopee';
    else if (t.includes('mercado') || t.includes('livre') || t.includes('ml')) data.platform = 'mercadolivre';
    else if (t.includes('amazon') || t.includes('amzn')) data.platform = 'amazon';
    else if (t.includes('magalu') || t.includes('magazine')) data.platform = 'magazineluiza';
    else if (t.includes('ali') || t.includes('express')) data.platform = 'aliexpress';
    else if (t.includes('kabum')) data.platform = 'kabum';
    else if (t.includes('pichau')) data.platform = 'pichau';

    // Código - Aprimorado para aspas simples
    const quoteMatch = text.match(/'([^']+)'/);
    if (quoteMatch) {
        data.code = quoteMatch[1].toUpperCase();
    } else {
        const codeMatch = text.match(/(?:cupom|c[óo]digo|use|code)[:\s]*([A-Z0-9_-]{4,20})/i);
        if (codeMatch) data.code = codeMatch[1].toUpperCase();
        else { const upperMatch = text.match(/\b[A-Z0-9]{5,15}\b/); if (upperMatch) data.code = upperMatch[0]; }
    }

    // Desconto
    const percentMatch = text.match(/(\d+)%\s*(?:off|de desconto)/i);
    if (percentMatch) { data.discount_value = parseInt(percentMatch[1]); data.discount_type = 'percentage'; }
    else {
        const fixedMatch = text.match(/R\$\s*(\d+[,.]?\d*)/i);
        if (fixedMatch) { data.discount_value = parseFloat(fixedMatch[1].replace(',', '.')); data.discount_type = 'fixed'; }
    }

    // Mínimo
    const minMatch = text.match(/m[íi]nimo.*?R\$\s*(\d+[,.]?\d*)/i);
    if (minMatch) data.min_purchase = parseFloat(minMatch[1].replace(',', '.'));

    // Data - Tentativa aprimorada
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
        try {
            // Aceita dd/mm ou dd/mm/aaaa
            const day = dateMatch[1];
            const month = dateMatch[2];
            const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : new Date().getFullYear();
            const dt = new Date(`${year}-${month}-${day}T23:59:59`);
            // Validar se é data válida
            if (!isNaN(dt.getTime())) {
                data.valid_until = dt.toISOString();
            }
        } catch (e) { }
    }

    // Exclusividade
    const exclusivityKeywords = ['lista', 'selecionad', 'exclusiv', 'apenas', 'neste link', 'link abaixo', 'produtos'];
    if (exclusivityKeywords.some(kw => t.includes(kw))) {
        data.is_general = false;
        data.applicable_products = ['(Verifique a mensagem original)'];
    }

    return data;
}

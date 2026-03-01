import Product from '../../../models/Product.js';
import Coupon from '../../../models/Coupon.js';
import Category from '../../../models/Category.js';
import PublishService from '../../autoSync/publishService.js';
import schedulerService from '../../autoSync/schedulerService.js';
import { extractCouponData, formatCouponPreview } from './whatsappCouponHandler.js';
import logger from '../../../config/logger.js';

// State keys:
// EDIT_MENU:{productId}
// EDIT_FIELD:{field}:{productId}
// PUBLISH_WIZARD_CATEGORY:{productId}
// PUBLISH_WIZARD_LINK:{productId}
// REPUBLISH_CONFIRM_COUPON:{productId}
// REPUBLISH_SELECT_COUPON:{productId}
// EDIT_PUBLISH_CATEGORY:{productId}
// EDIT_PUBLISH_OLD_PRICE:{productId}
// EDIT_PUBLISH_NEW_PRICE:{productId}

export const handleEditFlow = async (client, msg, userState, body) => {
    const step = userState.step;
    const parts = step.split(':');
    const productId = parts[parts.length - 1]; // Sempre o ultimo

    const product = userState.tempProduct || await Product.findById(productId);
    if (!product) {
        await msg.reply('❌ Produto não encontrado.');
        return { step: 'IDLE' }; // Abort
    }
    userState.tempProduct = product; // Cache temp

    // --- 1. Verificação de Link Afiliado (Legado/Fluxo Direto) ---
    if (step.startsWith('EDIT_CHECK_LINK')) {
        return await handleLinkInput(msg, product, body, userState);
    }

    // --- 2. Menu de Edição ---
    if (step.startsWith('EDIT_MENU')) {
        if (body === '1') { // Editar Nome
            await msg.reply('✏️ *Digite o novo Título:*');
            return { step: `EDIT_FIELD:name:${productId}`, tempProduct: product };
        }
        if (body === '2') { // Editar Preço Original
            await msg.reply(`💲 *Digite o Preço ORIGINAL (Antigo).* \nAtual: R$${product.old_price || 0}`);
            return { step: `EDIT_FIELD:old_price:${productId}`, tempProduct: product };
        }
        if (body === '3') { // Editar Preço com Desconto
            await msg.reply(`💰 *Digite o Preço COM DESCONTO (Atual).* \nAtual: R$${product.current_price}`);
            return { step: `EDIT_FIELD:current_price:${productId}`, tempProduct: product };
        }
        if (body === '4') { // Editar Link Afiliado
            await msg.reply(`🔗 *Envie o novo Link de Afiliado:* \nAtual: ${product.affiliate_link || 'Nenhum'}`);
            return { step: `EDIT_FIELD:affiliate_link:${productId}`, tempProduct: product };
        }
        if (body === '5') { // PUBLICAR AGORA (Wizard)
            return await startPublishWizard(msg, product);
        }
        if (body === '6' || body === '0') { // Voltar
            // Volta para a lista ou detalhe (Handler pai decide ou simulamos)
            return { step: `PENDING_DETAIL:${productId}` };
        }

        await msg.reply('❌ Opção inválida.');
        return await showEditMenu(msg, product);
    }

    // --- 3. Edição de Campo Específico ---
    if (step.startsWith('EDIT_FIELD')) {
        const field = parts[1];

        if (field === 'name') {
            product.name = body;
            await Product.update(productId, { name: body });
        }
        else if (field === 'old_price') {
            const price = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, ''));
            if (!isNaN(price)) {
                product.old_price = price;
                await Product.update(productId, { old_price: price });
            } else {
                await msg.reply('❌ Valor inválido.');
                return userState;
            }
        }
        else if (field === 'current_price') {
            const price = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, ''));
            if (!isNaN(price)) {
                product.current_price = price;
                // Update trigger recalculates discount automatically
                await Product.update(productId, { current_price: price });
            } else {
                await msg.reply('❌ Valor inválido.');
                return userState;
            }
        }
        else if (field === 'affiliate_link') {
            if (body.startsWith('http')) {
                product.affiliate_link = body.trim();
                await Product.update(productId, { affiliate_link: body.trim() });
            } else {
                await msg.reply('❌ Link inválido. Deve começar com http.');
                return userState;
            }
        }

        userState.tempProduct = product;
        await msg.reply('✅ Alteração salva!');
        return await showEditMenu(msg, product);
    }

    // ==========================================
    // FLUXO: EDITAR E PUBLICAR (Novo)
    // ==========================================

    // Passo 1: Categoria
    if (step.startsWith('EDIT_PUBLISH_CATEGORY')) {
        const index = parseInt(body);
        const categories = userState.categories || [];

        if (isNaN(index) || index < 1 || index > categories.length) {
            await msg.reply('❌ Opção inválida. Selecione uma categoria da lista.');
            return userState;
        }

        const selectedCat = categories[index - 1];
        product.category_id = selectedCat.id;
        await Product.update(productId, { category_id: selectedCat.id });
        userState.tempProduct = product;

        // Next: Old Price
        await msg.reply(`💲 *Preço ORIGINAL (Antigo):*\nAtual: R$${product.old_price || 0}\n\nDigite o novo valor ou '0' para manter/pular.`);
        return { step: `EDIT_PUBLISH_OLD_PRICE:${productId}`, tempProduct: product };
    }

    // Passo 2: Old Price
    if (step.startsWith('EDIT_PUBLISH_OLD_PRICE')) {
        if (body !== '0' && body.toLowerCase() !== 'pular') {
            const price = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, ''));
            if (!isNaN(price)) {
                product.old_price = price;
                await Product.update(productId, { old_price: price });
            }
            // Se for invalido, ignorar ou avisar? Vamos avisar mas aceitar pular.
        }
        // Next: New Price
        await msg.reply(`💰 *Preço COM DESCONTO (Atual):*\nAtual: R$${product.current_price}\n\nDigite o novo valor ou '0' para manter/pular.`);
        return { step: `EDIT_PUBLISH_NEW_PRICE:${productId}`, tempProduct: product };
    }

    // Passo 3: New Price -> Ir para Link (Wizard Normal)
    if (step.startsWith('EDIT_PUBLISH_NEW_PRICE')) {
        if (body !== '0' && body.toLowerCase() !== 'pular') {
            const price = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, ''));
            if (!isNaN(price)) {
                product.current_price = price;
                await Product.update(productId, { current_price: price });
            }
        }

        // Agora pula para o passo de Link do Wizard normal
        // Se já tiver link ok, ele vai confirmar e ir pro cupom
        return await askAffiliateLink(msg, product);
    }

    // ==========================================

    // --- 4. PUBLISH WIZARD: CATEGORIA ---
    if (step.startsWith('PUBLISH_WIZARD_CATEGORY')) {
        const index = parseInt(body);
        const categories = userState.categories || [];

        if (isNaN(index) || index < 1 || index > categories.length) {
            await msg.reply('❌ Opção inválida. Selecione uma categoria da lista.');
            return userState;
        }

        const selectedCat = categories[index - 1];
        product.category_id = selectedCat.id;
        await Product.update(productId, { category_id: selectedCat.id });
        userState.tempProduct = product;

        await msg.reply(`📂 Categoria definida: *${selectedCat.name}*`);

        // Next Step: Affiliate Link
        return await askAffiliateLink(msg, product);
    }

    // --- 5. PUBLISH WIZARD: LINK ---
    if (step.startsWith('PUBLISH_WIZARD_LINK')) {
        // Se usuário mandou um link, atualiza
        if (body.startsWith('http')) {
            product.affiliate_link = body.trim();
            await Product.update(productId, { affiliate_link: body.trim() });
            userState.tempProduct = product;
            await msg.reply('✅ Link atualizado!');
            return await startCouponFlow(msg, product);
        }
        // Se usuário confirmou (ex: "ok", "sim", "1") e já tinha link, assume que mantém
        else if (product.affiliate_link) {
            // Aceita qualquer input positivo como confirmação se já tem link,
            // mas idealmente deveria clicar num botão ou enviar "ok".
            // Vamos simplificar: se não é link, avisa.
            if (body.toLowerCase() === 'ok' || body === '1') {
                return await startCouponFlow(msg, product);
            }
            await msg.reply('⚠️ Envie o Link de Afiliado para continuar (ou digite o link novo). Ou digite "OK".');
            return userState;
        } else {
            await msg.reply('❌ Link obrigatório. Envie o link.');
            return userState;
        }
    }

    // --- 6. Fluxo Cupom (Republication Logic Reused) ---
    if (step.startsWith('REPUBLISH_CONFIRM_COUPON')) {
        const answer = body.toLowerCase();
        if (['sim', 's', 'y', '1'].includes(answer)) {
            const platform = product.platform || 'general';
            const activeCouponsResult = await Coupon.findActive({ platform, limit: 10 });
            const activeCoupons = activeCouponsResult.coupons || [];

            if (activeCoupons.length === 0) {
                await msg.reply(`⚠️ *Nenhum cupom ativo para ${platform}.* Publicando sem cupom...`);
                await _publish(msg, product, null);
                return { step: 'IDLE' };
            } else {
                let reply = `🎟️ *Selecione um Cupom:*\n\n`;
                activeCoupons.forEach((c, index) => {
                    reply += `${index + 1}. *${c.code}* (${c.discount_type === 'percentage' ? c.discount_value + '%' : 'R$' + c.discount_value})\n`;
                });
                reply += `\n0. Cancelar Vínculo`;
                await msg.reply(reply);
                return { step: `REPUBLISH_SELECT_COUPON:${productId}`, availableCoupons: activeCoupons, tempProduct: product };
            }
        } else if (['não', 'nao', 'n', 'no', '0'].includes(answer)) {
            await msg.reply('🚀 Publicando sem cupom...');
            await _publish(msg, product, null);
            return { step: 'IDLE' };
        } else {
            await msg.reply('🤖 Sim ou Não?');
            return userState;
        }
    }

    if (step.startsWith('REPUBLISH_SELECT_COUPON')) {
        const index = parseInt(body);
        if (isNaN(index)) return { ...userState };

        if (index === 0) {
            await _publish(msg, product, null);
            return { step: 'IDLE' };
        }

        const coupons = userState.availableCoupons || [];
        const selected = coupons[index - 1];
        if (selected) {
            await msg.reply(`✅ Cupom *${selected.code}* vinculado!`);
            await _publish(msg, product, selected.id);
            return { step: 'IDLE' };
        }
        await msg.reply('❌ Inválido.');
        return userState;
    }

    // --- 7. SCHEDULE WIZARD: CATEGORY ---
    if (step.startsWith('SCHEDULE_WIZARD_CATEGORY')) {
        const index = parseInt(body);
        const categories = userState.categories || [];

        if (isNaN(index) || index < 1 || index > categories.length) {
            await msg.reply('❌ Opção inválida. Selecione uma categoria da lista.');
            return userState;
        }

        const selectedCat = categories[index - 1];
        product.category_id = selectedCat.id;
        await Product.update(productId, { category_id: selectedCat.id });

        await msg.reply(`📂 Categoria definida: *${selectedCat.name}*`);
        return await _schedule(msg, product);
    }

    return userState;
};

// --- Helpers ---

export const startApprovalFlow = async (msg, product) => {
    // Redireciona para o Wizard completo (Categoria -> Link -> Cupom -> Publish)
    return await startPublishWizard(msg, product);
};

export const startEditAndPublishFlow = async (msg, product) => {
    // Novo Fluxo: Categoria -> OldPrice -> NewPrice -> Link/Publish

    // Reutiliza logica de listar categorias
    const categories = await Category.findAll(true);
    const limitedCats = categories.slice(0, 15);

    let text = `📂 *Passo 1: Selecione a Categoria:*\n\n`;
    limitedCats.forEach((c, i) => {
        text += `${i + 1}. ${c.icon || ''} ${c.name}\n`;
    });

    const currentCat = categories.find(c => c.id === product.category_id);
    if (currentCat) {
        text += `\n(Atual: *${currentCat.name}*)`;
    }

    await msg.reply(text);
    return { step: `EDIT_PUBLISH_CATEGORY:${product.id}`, categories: limitedCats, tempProduct: product };
};

export const startEditWizard = async (msg, product) => {
    return await showEditMenu(msg, product);
};

export const startScheduleFlow = async (msg, product) => {
    // Verificar se já tem categoria
    if (product.category_id) {
        return await _schedule(msg, product);
    }

    // Se não tiver, pedir categoria
    const categories = await Category.findAll(true);
    const limitedCats = categories.slice(0, 15);

    let text = `📂 *Para agendar, selecione a Categoria:*\n\n`;
    limitedCats.forEach((c, i) => {
        text += `${i + 1}. ${c.icon || ''} ${c.name}\n`;
    });

    await msg.reply(text);
    return { step: `SCHEDULE_WIZARD_CATEGORY:${product.id}`, categories: limitedCats, tempProduct: product };
};

async function _schedule(msg, product) {
    await msg.reply('⏳ *Solicitando agendamento à IA...*');
    await schedulerService.scheduleProduct(product);

    // Atualizar status para 'approved' para que o produto apareça no app
    if (product.id) {
        try {
            await Product.update(product.id, { status: 'approved' });
            logger.info(`✅ [WhatsApp] Produto ${product.id} agendado e marcado como 'approved'`);
        } catch (updateError) {
            logger.warn(`⚠️ [WhatsApp] Não foi possível atualizar status do produto ${product.id}: ${updateError.message}`);
        }
    }

    await msg.reply('✅ *Agendamento Solicitado!*\n\nA IA definiu o melhor horário para publicação com base na categoria.');
    return { step: 'IDLE' };
}

// Logica auxiliar para input de link isolado (se necessário)
async function handleLinkInput(msg, product, body, userState) {
    if (body.startsWith('http')) {
        product.affiliate_link = body.trim();
        await Product.update(product.id, { affiliate_link: body.trim() });
        userState.tempProduct = product;
        await msg.reply('✅ Link salvo!');
        return await startCouponFlow(msg, product);
    } else {
        await msg.reply('❌ Link inválido. Envie o link http...');
        return userState;
    }
}

async function showEditMenu(msg, product) {
    const text = `✏️ *Editar Produto: ${product.name}*\n\n` +
        `1️⃣ Editar Nome\n` +
        `2️⃣ Editar Preço Original (Antigo): R$${product.old_price || '0,00'}\n` +
        `3️⃣ Editar Preço Com Desconto (Atual): R$${product.current_price}\n` +
        `4️⃣ Editar Link Afiliado: ${product.affiliate_link ? '✅ Definido' : '❌ Pendente'}\n` +
        `---------------------------------\n` +
        `5️⃣ *PUBLICAR AGORA* (Inicia Fluxo)\n` +
        `0️⃣ Voltar`;

    await msg.reply(text);
    return { step: `EDIT_MENU:${product.id}`, tempProduct: product };
}

// ----------------------------------------------------
// WIZARD STEPS
// ----------------------------------------------------

async function startPublishWizard(msg, product) {
    // STEP 1: CATEGORY
    // Lista categorias simples (Top 10-15?)
    const categories = await Category.findAll(true);
    // Se tiver muitas, ideal seria paginar ou limitar, mas vamos listar as primeiras 15.
    const limitedCats = categories.slice(0, 15);

    let text = `📂 *Selecione a Categoria:*\n\n`;
    limitedCats.forEach((c, i) => {
        text += `${i + 1}. ${c.icon || ''} ${c.name}\n`; // Ajustar se icon for null
    });

    // Identificar categoria atual
    const currentCat = categories.find(c => c.id === product.category_id);
    if (currentCat) {
        text += `\n(Atual: *${currentCat.name}*) - Selecione para mudar ou escolha a mesma.`;
    }

    await msg.reply(text);
    return { step: `PUBLISH_WIZARD_CATEGORY:${product.id}`, categories: limitedCats, tempProduct: product };
}

async function askAffiliateLink(msg, product) {
    // STEP 2: LINK
    if (product.affiliate_link && product.affiliate_link !== product.product_url) {
        // Já tem link (supostamente afiliado)
        await msg.reply(`🔗 *Verifique o Link de Afiliado:*\n\n${product.affiliate_link}\n\nEnvie um NOVO link para trocar, ou digite 'OK' para confirmar este.`);
    } else {
        // Não tem, ou é igual ao original
        await msg.reply(`🔗 *Link de Afiliado Necessário!*\n\nCole o link de afiliado abaixo para continuar:`);
    }

    return { step: `PUBLISH_WIZARD_LINK:${product.id}`, tempProduct: product };
}

async function startCouponFlow(msg, product) {
    // STEP 3: COUPON
    await msg.reply('🎫 *Vincular Cupom?* (Responda Sim ou Não)');
    return { step: `REPUBLISH_CONFIRM_COUPON:${product.id}`, tempProduct: product };
}

async function _publish(msg, product, couponId) {
    const productToPublish = { ...product };
    if (couponId) {
        productToPublish.coupon_id = couponId;
        
        // CORREÇÃO: Adicionar ao applicable_products se não for geral
        const Coupon = (await import('../../../models/Coupon.js')).default;
        const coupon = await Coupon.findById(couponId);
        if (coupon && coupon.is_general === false) {
            const applicableProducts = coupon.applicable_products || [];
            if (!applicableProducts.includes(product.id)) {
                applicableProducts.push(product.id);
                await Coupon.update(couponId, { applicable_products: applicableProducts });
                logger.info(`✅ Produto ${product.id} adicionado ao applicable_products do cupom ${coupon.code}`);
            }
        }
    }
    const res = await PublishService.publishAll(productToPublish, { manual: true });
    await msg.reply(res.success ? '✅ *Sucesso!*' : `❌ Erro: ${res.reason}`);

    // Atualizar status do produto no banco após publicação
    if (product.id) {
        try {
            if (res.success) {
                await Product.update(product.id, { status: 'published' });
                logger.info(`✅ [WhatsApp] Status do produto ${product.id} atualizado para 'published'`);
            } else {
                // Publicação falhou, mas produto foi aprovado — marcar como approved para aparecer no app
                await Product.update(product.id, { status: 'approved' });
                logger.warn(`⚠️ [WhatsApp] Publicação falhou, produto ${product.id} marcado como 'approved'`);
            }
        } catch (updateError) {
            logger.warn(`⚠️ [WhatsApp] Não foi possível atualizar status do produto ${product.id}: ${updateError.message}`);
        }
    }
}

import LinkAnalyzer from '../../linkAnalyzer.js';
import Product from '../../../models/Product.js';
import { startApprovalFlow, startEditAndPublishFlow, startScheduleFlow } from './whatsappEditHandler.js';
import { generateUniqueId } from '../../../utils/helpers.js';

// State keys:
// CAPTURE_MENU:{productId}

// ... (handleCaptureLink stays same)

export const handleCaptureLink = async (client, msg, url, chatId) => {
    await msg.react('⏳');
    try {
        // 1. Analisar Link
        const productData = await LinkAnalyzer.analyzeLink(url);

        // 2. Verificar erro explícito da análise
        if (!productData || productData.error) {
            const errMsg = productData?.error || 'Falha na análise do link.';
            const isShopeeBlock = url.includes('shopee') && (!productData?.name);
            if (isShopeeBlock) {
                await msg.reply(
                    '⚠️ *Não foi possível capturar automaticamente.*\n\n' +
                    'A Shopee está bloqueando o acesso ou a API não está configurada.\n\n' +
                    '📝 *Digite o nome do produto:*\n_(ou "cancelar" para desistir)_'
                );
                return {
                    step: 'CAPTURE_MANUAL_NAME',
                    data: { platform: 'shopee', affiliateLink: url },
                    type: 'product'
                };
            }
            throw new Error(errMsg);
        }

        // 3. Verificar se os dados retornados são válidos
        const nameIsUrl = productData.name && (
            productData.name.startsWith('http') ||
            productData.name.includes('shopee.com') ||
            /^\d{8,}$/.test(productData.name?.trim())
        );
        const nameIsEmpty = !productData.name || productData.name.trim().length < 3;
        const priceIsZero = !productData.currentPrice || productData.currentPrice <= 0;
        const platform = productData.platform || 'shopee';
        const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

        if (nameIsUrl || nameIsEmpty) {
            await msg.reply(
                `⚠️ *Não consegui identificar o nome do produto (${platformLabel}).*\n\n` +
                `📝 *Digite o nome do produto:*\n_(ou "cancelar" para desistir)_`
            );
            return {
                step: 'CAPTURE_MANUAL_NAME',
                data: { ...productData, platform, affiliateLink: productData.affiliateLink || url },
                type: 'product'
            };
        }

        if (priceIsZero) {
            await msg.reply(
                `⚠️ *Não consegui capturar o preço de "${productData.name}".*\n\n` +
                `💰 *Digite o preço atual (ex: 49.90):*\n_(ou "0" para continuar sem preço)_`
            );
            return {
                step: 'CAPTURE_MANUAL_PRICE',
                data: { ...productData, affiliateLink: productData.affiliateLink || url },
                type: 'product'
            };
        }

        // 4. Produto capturado com sucesso — salvar como pendente
        let product = await Product.findByExternalId(productData.externalId, productData.platform);

        if (!product) {
            const newProductData = {
                name: productData.name,
                image_url: productData.imageUrl,
                platform: productData.platform || 'unknown',
                current_price: productData.currentPrice || 0,
                old_price: productData.oldPrice || 0,
                original_link: productData.url || url,
                affiliate_link: productData.affiliateLink,
                status: 'created', // Aparece no app mas não foi publicado
                external_id: productData.externalId || generateUniqueId(),
                capture_source: 'whatsapp_admin',
                is_active: true
            };
            product = await Product.create(newProductData);
        }

        // 5. Mostrar Preview e Menu
        return await showCaptureMenu(client, msg, product);

    } catch (e) {
        await msg.reply(`❌ Erro: ${e.message}`);
        return null;
    }
};


export const handleCaptureFlow = async (client, msg, userState, body) => {
    const step = userState.step;

    // --- FLUXO DE CORREÇÃO MANUAL ---
    if (step === 'CAPTURE_MANUAL_NAME') {
        if (body.toLowerCase() === 'cancelar') {
            await msg.reply('❌ Operação cancelada.');
            return { step: 'IDLE' };
        }
        // Salvar nome e pedir preço
        const updatedData = { ...userState.data, name: body.trim() };
        await msg.reply(
            `✅ Nome: *${body.trim()}*\n\n💰 *Digite o preço atual (ex: 49.90):*\n_(ou "0" para continuar sem preço)_`
        );
        return { ...userState, step: 'CAPTURE_MANUAL_PRICE', data: updatedData };
    }

    if (step === 'CAPTURE_MANUAL_PRICE') {
        if (body.toLowerCase() === 'cancelar') {
            await msg.reply('❌ Operação cancelada.');
            return { step: 'IDLE' };
        }
        const price = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        const productToSave = {
            name: userState.data.name,
            image_url: userState.data.imageUrl || userState.data.image_url || null,
            platform: userState.data.platform || 'shopee',
            current_price: price,
            old_price: userState.data.oldPrice || userState.data.old_price || 0,
            original_link: userState.data.originalLink || userState.data.original_link || null,
            affiliate_link: userState.data.affiliateLink || userState.data.affiliate_link,
            status: 'created', // Aparece no app mas não foi publicado
            external_id: generateUniqueId(),
            capture_source: 'whatsapp_admin',
            is_active: true
        };
        try {
            const product = await Product.create(productToSave);
            return await showCaptureMenu(client, msg, product);
        } catch (e) {
            await msg.reply(`❌ Erro ao salvar produto: ${e.message}`);
            return { step: 'IDLE' };
        }
    }

    // --- FLUXO NORMAL (produto já salvo no DB) ---
    const productId = step.split(':')[1];

    // Assegurar produto produto atual
    const product = await Product.findById(productId);
    if (!product) {
        await msg.reply('❌ Produto não encontrado.');
        return { step: 'IDLE' };
    }

    if (body === '1') { // Publicar Agora
        // Fluxo: Categoria -> Link -> Cupom -> Publish
        return await startApprovalFlow(msg, product);
    }

    if (body === '2') { // Editar e Publicar
        // Fluxo: Categoria -> Preço Old -> Preço New -> Fluxo Publicar Agora
        return await startEditAndPublishFlow(msg, product);
    }

    if (body === '3') { // Agendar (IA)
        return await startScheduleFlow(msg, product);
    }

    if (body === '0') { // Cancelar / Manter Salvo
        await msg.reply('✅ Produto salvo! Ele já aparece no app.');
        return { step: 'IDLE' };
    }

    await msg.reply('❌ Opção inválida.');
    return userState;
};

async function showCaptureMenu(client, msg, product) {
    const currentPrice = product.current_price ? `R$ ${product.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00';
    const oldPrice = product.old_price ? `R$ ${product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;

    let text = `✅ *Produto Capturado*\n\n` +
        `📦 *${product.name}*\n`;

    if (oldPrice) {
        text += `💰 De: ~${oldPrice}~\n` +
            `🤑 Por: *${currentPrice}*\n`;
    } else {
        text += `💰 Valor: *${currentPrice}*\n`;
    }

    text += `🏪 ${product.platform}\n\n` +
        `👇 *Ações:*\n` +
        `1️⃣ 🚀 *Publicar Agora*\n` +
        `2️⃣ ✏️ *Editar e Publicar*\n` +
        `3️⃣ 📅 *Agendar (IA)*\n` +
        `0️⃣ *Manter Salvo* (já aparece no app)`;

    if (product.image_url) {
        // Tentar enviar imagem e texto junto
        try {
            const whatsappWebService = (await import('../whatsappWebService.js')).default;
            // Se a imagem falhar, o serviço tem fallback? Sim, deve ter. 
            // Mas aqui chamamos sendImage diretamente.
            await whatsappWebService.sendImage(msg.from, product.image_url, text);
        } catch (err) {
            // Fallback texto
            await msg.reply(text);
        }
    } else {
        await msg.reply(text);
    }

    return { step: `CAPTURE_MENU:${product.id}` };
}

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
        if (!productData || !productData.name) throw new Error('Falha na análise do link.');

        // 2. Salvar como Pendente (Igual Telegram)
        // Tentativa de encontrar existente pelo external ID ou link original
        let product = await Product.findByExternalId(productData.externalId, productData.platform);

        if (!product) {
            // Criação
            const newProductData = {
                name: productData.name,
                image_url: productData.imageUrl,
                platform: productData.platform || 'unknown',
                current_price: productData.currentPrice || 0,
                old_price: productData.oldPrice || 0,
                original_link: productData.url || url,
                affiliate_link: productData.affiliateLink, // Salva se o analyzer já pegou
                status: 'pending',
                external_id: productData.externalId || generateUniqueId(),
                capture_source: 'whatsapp_admin',
                is_active: true
            };
            product = await Product.create(newProductData);
        } else {
            // Atualizar basicas se já existe ?? Melhor não sobrescrever tudo, mas o link captura deve ser 'fresco'
            // O usuário pode querer atualizar preços. Vamos manter assim por enquanto.
        }

        // 3. Mostrar Preview e Menu
        return await showCaptureMenu(client, msg, product);

    } catch (e) {
        await msg.reply(`❌ Erro: ${e.message}`);
        return null;
    }
};

export const handleCaptureFlow = async (client, msg, userState, body) => {
    const step = userState.step;
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

    if (body === '0') { // Cancelar / Manter Pendente
        await msg.reply('✅ Mantido como pendente.');
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
        `0️⃣ *Manter Pendente*`;

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

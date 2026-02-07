import Product from '../../../models/Product.js';
import { config } from '../config.js';

// State keys
// PENDING_VIEW:{page}
// PENDING_DETAIL:{productId}
// PENDING_FILTER:{step}

export const handlePendingFlow = async (client, msg, userState, body) => {
    const chatId = msg.from;
    const step = userState.step;

    // --- 1. Listagem de Pendentes ---
    if (step.startsWith('PENDING_LIST')) {
        const page = parseInt(step.split(':')[1]) || 1;

        // Comandos de Navegação e Filtro
        if (body === '6') { // Próxima Página
            await listPendingProducts(client, msg, page + 1, userState);
            return { step: `PENDING_LIST:${page + 1}` };
        }
        if (body === '7') { // Filtrar
            await showFilterMenu(client, msg);
            return { step: 'PENDING_FILTER_MENU' };
        }
        if (body === '8') { // Buscar
            await msg.reply('🔍 *Digite o termo da busca:*');
            return { step: 'PENDING_SEARCH_INPUT' };
        }
        if (body === '0' || body.toLowerCase() === 'voltar') {
            await msg.reply('🔙 *Menu Principal*');
            // Retorna para handler principal limpar ou setar IDLE
            return { step: 'IDLE', action: 'SHOW_MAIN_MENU' };
        }

        // Seleção de Produto (1-5)
        const selectedIndex = parseInt(body);
        if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= 5) {
            const products = userState.tempList || [];
            const product = products[selectedIndex - 1];
            if (product) {
                return await showProductDetail(client, msg, product.id);
            }
        }

        // Se não for comando válido, repete a lista
        await listPendingProducts(client, msg, page, userState);
        return { step: `PENDING_LIST:${page}` }; // Mantém estado
    }

    // --- 2. Filtros ---
    if (step === 'PENDING_FILTER_MENU') {
        const platformMap = {
            '1': 'amazon', '2': 'mercadolivre', '3': 'shopee', '4': 'aliexpress',
            '5': 'kabum', '6': 'magazineluiza'
        };
        const selected = platformMap[body];
        if (selected) {
            userState.filters = { ...userState.filters, platform: selected };
            await msg.reply(`✅ Filtro aplicado: *${selected.toUpperCase()}*`);
            await listPendingProducts(client, msg, 1, userState);
            return { step: 'PENDING_LIST:1' };
        }
        if (body === '0') {
            userState.filters = {}; // Limpar
            await listPendingProducts(client, msg, 1, userState);
            return { step: 'PENDING_LIST:1' };
        }
        await msg.reply('❌ Opção inválida.');
        return { step: 'PENDING_FILTER_MENU' };
    }

    if (step === 'PENDING_SEARCH_INPUT') {
        userState.filters = { ...userState.filters, search: body };
        await msg.reply(`🔍 Buscando por: *${body}*`);
        await listPendingProducts(client, msg, 1, userState);
        return { step: 'PENDING_LIST:1' };
    }

    // --- 3. Detalhe do Produto ---
    if (step.startsWith('PENDING_DETAIL')) {
        const productId = step.split(':')[1];

        if (body === '1') { // Publicar Agora (Fluxo Aprovação)
            // Retorna ação para o messageHandler delegar ao EditHandler ou PublishService
            return { step: 'IDLE', action: 'START_APPROVAL_FLOW', productId };
        }
        if (body === '2') { // Editar
            return { step: 'IDLE', action: 'START_EDIT_FLOW', productId };
        }
        if (body === '3') { // Recusar/Deletar
            await Product.delete(productId);
            await msg.reply('🗑️ *Produto removido.*');
            // Voltar para lista
            await listPendingProducts(client, msg, 1, userState);
            return { step: 'PENDING_LIST:1' };
        }
        if (body === '0') { // Voltar
            await listPendingProducts(client, msg, 1, userState);
            return { step: 'PENDING_LIST:1' };
        }
    }

    return userState;
};

export const listPendingProducts = async (client, msg, page = 1, userState) => {
    const filters = userState.filters || {};
    const { products, total } = await Product.findPending({
        page,
        limit: 5,
        platform: filters.platform,
        search: filters.search
    });

    // Guardar lista temporária na sessão para navegação por índice (1-5)
    userState.tempList = products;

    if (!products || products.length === 0) {
        await msg.reply('✅ *Nenhum produto pendente encontrado.*');
        return;
    }

    let reply = `📋 *Pendentes (Pág ${page})* - Total: ${total}\n`;
    if (filters.platform) reply += `📍 Filtro: ${filters.platform}\n`;
    if (filters.search) reply += `🔍 Busca: ${filters.search}\n`;
    reply += `\n`;

    products.forEach((p, i) => {
        reply += `${i + 1}️⃣ *${p.name.substring(0, 25)}...*\n💰 R$${p.current_price}\n🏪 ${p.platform || '?'}\n\n`;
    });

    reply += `👇 *Opções:*\n`;
    reply += `*1-5* - Ver Detalhes\n`;
    reply += `*6* - ➡️ Próxima Página\n`;
    reply += `*7* - 📍 Filtros\n`;
    reply += `*8* - 🔍 Buscar\n`;
    reply += `*0* - 🔙 Voltar`;

    await msg.reply(reply);
};

const showFilterMenu = async (client, msg) => {
    const text = `📍 *Filtrar por Loja:*\n\n` +
        `1️⃣ Amazon\n` +
        `2️⃣ Mercado Livre\n` +
        `3️⃣ Shopee\n` +
        `4️⃣ AliExpress\n` +
        `5️⃣ Kabum\n` +
        `6️⃣ Magalu\n\n` +
        `0️⃣ Limpar Filtros`;
    await msg.reply(text);
};

const showProductDetail = async (client, msg, productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        await msg.reply('❌ Produto não encontrado.');
        return { step: 'PENDING_LIST:1' };
    }

    const currentPriceFormatted = `R$ ${product.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    let priceDisplay = currentPriceFormatted;

    if (product.old_price && product.old_price > product.current_price) {
        const oldPriceFormatted = `R$ ${product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        priceDisplay = `De ~${oldPriceFormatted}~ por ${currentPriceFormatted}`;
    }

    let text = `🛒 *DETALHE DO PRODUTO*\n\n` +
        `📦 *${product.name}*\n` +
        `💰 Preço: ${priceDisplay}\n` +
        `🏪 Loja: ${product.platform}\n` +
        `🔗 Link Original: ${product.original_link || 'N/A'}\n`;

    if (product.affiliate_link) {
        text += `🔗 *Link Afiliado:* ${product.affiliate_link}\n`;
    } else {
        text += `⚠️ *Sem Link Afiliado*\n`;
    }

    text += `\n👇 *Ações:*\n` +
        `1️⃣ 🚀 *Aprovar & Publicar*\n` +
        `2️⃣ ✏️ *Editar*\n` +
        `3️⃣ 🗑️ *Excluir*\n` +
        `0️⃣ 🔙 *Voltar*`;

    if (product.image_url) {
        const whatsappWebService = (await import('../whatsappWebService.js')).default;
        await whatsappWebService.sendImage(msg.from, product.image_url, text);
    } else {
        await msg.reply(text);
    }

    return { step: `PENDING_DETAIL:${productId}` };
};

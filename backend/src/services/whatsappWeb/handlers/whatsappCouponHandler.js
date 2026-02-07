import Coupon from '../../../models/Coupon.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';
import logger from '../../../config/logger.js';

/**
 * 1. Extração de Dados
 */
export const extractCouponData = (text) => {
    return parseMessage(text);
};

/**
 * 2. Gerar Visualização (Preview)
 */
export const formatCouponPreview = (data) => {
    const discount = data.discount_type === 'percentage'
        ? `${data.discount_value}% OFF`
        : `R$ ${data.discount_value} OFF`;

    return `🎟️ *CONFIRMAÇÃO DE CUPOM*\n\n` +
        `🔖 *Código:* ${data.code}\n` +
        `💰 *Desconto:* ${discount}\n` +
        `🏪 *Loja:* ${data.platform || 'Geral'}\n` +
        `🔗 *Link:* ${data.link || 'N/A'}\n\n` +
        `👇 *O que deseja fazer?*\n` +
        `1️⃣ *Publicar Agora*\n` +
        `2️⃣ *Editar Código*\n` +
        `3️⃣ *Editar Desconto*\n` +
        `4️⃣ *Cancelar*`;
};

/**
 * 3. Salvar e Publicar (Ação Final)
 */
export const saveAndPublishCoupon = async (data) => {
    try {
        // Salvar
        const saved = await saveCoupon(data);
        if (!saved) throw new Error('Falha ao salvar cupom no banco.');

        // Publicar
        const publishResult = await publishCoupon(saved);

        let reply = `✅ *Cupom Salvo e Publicado!*\n\n` +
            `🎟️ *${saved.code}*\n` +
            `📢 Enviado para ${publishResult.successCount} canais.`;

        return { success: true, reply };
    } catch (error) {
        logger.error('Erro saveAndPublishCoupon:', error);
        return { success: false, reply: `❌ Erro: ${error.message}` };
    }
};

// --- FUNÇÕES INTERNAS (Mantidas e adaptadas) ---

function parseMessage(text) {
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

    // Código
    const quoteMatch = text.match(/'([^']+)'/);
    if (quoteMatch) {
        data.code = quoteMatch[1].toUpperCase();
    } else {
        const codeMatch = text.match(/(?:cupom|c[óo]digo|use|code)[:\s]*([A-Z0-9_-]{4,20})/i);
        if (codeMatch) data.code = codeMatch[1].toUpperCase();
        else {
            // Tentar capturar palavra em uppercase isolada que pareça cupom
            const upperMatch = text.match(/\b[A-Z0-9]{5,15}\b/);
            // Filtrar palavras comuns que podem ser uppercase
            const ignored = ['FRETE', 'GRATIS', 'OFF', 'HOJE', 'AGORA', 'BRASIL', 'MELI', 'APP'];
            if (upperMatch && !ignored.includes(upperMatch[0])) data.code = upperMatch[0];
        }
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

    // Data
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
        try {
            const day = dateMatch[1];
            const month = dateMatch[2];
            const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : new Date().getFullYear();
            const dt = new Date(`${year}-${month}-${day}T23:59:59`);
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

async function saveCoupon(data) {
    try {
        const toSave = {
            ...data,
            valid_from: new Date().toISOString(),
            is_active: true,
            capture_source: 'whatsapp_admin'
        };
        // Garantir campos opcionais nulos se vazios
        if (!toSave.valid_until) toSave.valid_until = null;
        if (toSave.is_general === undefined) toSave.is_general = true;

        const saved = await Coupon.create(toSave);

        // Aprovação Automática de Cupons Pendentes (lógica do adminBot)
        if (saved && saved.code) {
            // Opcional: Adicionar lógica de aprovação em massa aqui se necessário
        }

        return saved;
    } catch (e) {
        logger.error('Erro ao salvar cupom WS:', e);
        return null;
    }
}

async function publishCoupon(coupon) {
    try {
        const couponData = coupon.toObject ? coupon.toObject() : { ...coupon };
        const result = await notificationDispatcher.dispatch('coupon_new', couponData, { manual: true });

        const successCount = (result.results || []).filter(r => r.success).length;
        return { successCount };
    } catch (e) {
        logger.error('Erro publicando cupom WS:', e);
        return { successCount: 0 };
    }
}

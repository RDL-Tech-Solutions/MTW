import Coupon from '../../../models/Coupon.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';
import logger from '../../../config/logger.js';
import openrouterClient from '../../../ai/openrouterClient.js';

/**
 * 1a. Extração via IA (identical to Telegram couponHandler)
 */
const extractCouponDataWithAI = async (text) => {
    const aiPrompt = `Extraia os detalhes do cupom desta mensagem de oferta.
    Seja preciso com o código, valor e plataforma.
    Procure especialmente por códigos entre aspas simples como 'CUPOM10'.

    Mensagem: "${text}"

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

    const aiData = await openrouterClient.makeRequest(aiPrompt);
    if (aiData && aiData.code) {
        logger.info(`🤖 [WhatsApp IA] Cupom extraído: ${JSON.stringify(aiData)}`);
        return aiData;
    }
    return null;
};

/**
 * 1b. Extração via Regex (fallback)
 */
export const extractCouponData = (text) => {
    return parseMessage(text);
};

/**
 * 2. Gerar Visualização (Preview)
 */
export const formatCouponPreview = (data) => {
    const discountType = data.discount_type === 'percentage' ? '%' : 'R$';
    const discount = data.discount_type === 'percentage'
        ? `${data.discount_value || 0}% OFF`
        : `R$ ${(data.discount_value || 0).toFixed(2)} OFF`;

    let preview = `🎟️ *CONFIRMAÇÃO DE CUPOM*\n\n`;
    preview += `🏪 *Plataforma:* ${data.platform || 'general'}\n`;
    preview += `🔖 *Código:* \`${data.code || '?'}\`\n`;
    preview += `💰 *Desconto:* ${discount} (${discountType})\n`;
    if (data.min_purchase && data.min_purchase > 0) {
        preview += `🛒 *Mínimo:* R$ ${Number(data.min_purchase).toFixed(2)}\n`;
    }
    if (data.max_discount_value) {
        preview += `📉 *Limite:* R$ ${Number(data.max_discount_value).toFixed(2)}\n`;
    }
    if (data.valid_until) {
        preview += `📅 *Validade:* ${new Date(data.valid_until).toLocaleDateString('pt-BR')}\n`;
    }
    preview += `\n👇 *O que deseja fazer?*\n`;
    preview += `1️⃣ *Publicar Agora*\n`;
    preview += `2️⃣ *Editar Código*\n`;
    preview += `3️⃣ *Editar Desconto*\n`;
    preview += `4️⃣ *Editar Plataforma*\n`;
    preview += `5️⃣ *Editar Tipo* (% ou R$)\n`;
    preview += `6️⃣ *Editar Mínimo*\n`;
    preview += `7️⃣ *Editar Validade*\n`;
    preview += `8️⃣ *Cancelar*`;
    return preview;
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

/**
 * 4. Executar fluxo de captura com IA
 */
export const executeCouponCapture = async (client, msg, text, chatId) => {
    try {
        // 1. Tentar extração via IA
        await msg.reply('🤖 *Analisando mensagem com IA...*');

        let data = null;
        try {
            data = await extractCouponDataWithAI(text);
        } catch (aiError) {
            logger.warn(`⚠️ [WhatsApp] IA falhou, usando regex: ${aiError.message}`);
        }

        // 2. Fallback para regex se a IA não retornou código válido
        if (!data || !data.code) {
            logger.info('🔄 [WhatsApp] Usando extração regex como fallback');
            data = parseMessage(text);
        }

        // 3. Validar que um código foi detectado
        if (!data.code) {
            await msg.reply(
                '❌ *Não foi possível identificar um código de cupom no texto.*\n\n' +
                'Certifique-se de que o texto contém o código do cupom. Exemplos:\n' +
                '• `Cupom: SHOPEE20`\n' +
                '• `Use o código PROMO10`\n' +
                '• Código entre aspas simples: `\'MELI30\'`\n\n' +
                'Reencaminhe o texto do cupom novamente.'
            );
            return null;
        }

        // 4. Gerar Preview
        const preview = formatCouponPreview(data);

        // 5. Enviar
        await msg.reply(preview);

        // 6. Retornar Estado para Review
        return {
            type: 'coupon',
            data: data,
            step: 'REVIEW'
        };

    } catch (error) {
        logger.error('Erro em executeCouponCapture:', error);
        await msg.reply('❌ Erro ao processar cupom.');
        return null;
    }
};

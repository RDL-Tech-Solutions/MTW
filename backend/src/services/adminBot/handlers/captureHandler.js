// import CaptureService from '../../../core/capture/CaptureService.js'; // REMOVIDO: Módulo não encontrado
import LinkAnalyzer from '../../linkAnalyzer.js'; // Caminho correto para services/linkAnalyzer.js
// import UsageTracking from '../../../core/usage/usageTracking.js'; // REMOVIDO: Módulo não encontrado

import Product from '../../../models/Product.js';
import logger from '../../../config/logger.js';
import { InlineKeyboard } from 'grammy';
import { generateUniqueId } from '../../../utils/helpers.js';

/**
 * Handler de Captura de Links
 * Processa links enviados pelo admin e gera preview com templates atuais
 */
export const captureLinkHandler = async (ctx, url) => {
    try {
        await ctx.reply('⏳ *Processando link... Aguarde.*', { parse_mode: 'Markdown' });

        // const { tenantId } = ctx.session.user; // REMOVIDO

        // 1. Analisar Link (Com Retry - Similar ao LinkAnalyzerController)
        logger.info(`[AdminBot] Analisando link: ${url}`);

        let productData;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                productData = await LinkAnalyzer.analyzeLink(url);
                if (productData && productData.name) break; // Sucesso
            } catch (error) {
                attempts++;
                logger.warn(`[AdminBot] Tentativa ${attempts}/${maxAttempts} falhou: ${error.message}`);
                if (attempts >= maxAttempts) break;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
            // Se chegou aqui e não quebrou, tenta de novo se attempts < maxAttempts
            if (!productData && attempts < maxAttempts) {
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        if (!productData || !productData.name) {
            // Última chance: se tiver dados parciais, aceitar. Se não, erro.
            if (!productData) {
                await ctx.reply('❌ Não foi possível extrair dados deste link. Site inacessível ou não suportado.');
                return;
            }
        }

        // Lógica de Preservação de Link Original (Short Links)
        let finalAffiliateLink = productData.affiliateLink || url;

        const isShortLink =
            url.includes('/sec/') || // Mercado Livre Short Link
            url.includes('amzn.to') || // Amazon Short Link
            (url.includes('shopee') && url.length < 60) || // Shopee Short Link
            url.includes('bit.ly') ||
            url.includes('t.me');

        if (isShortLink) {
            finalAffiliateLink = url;
            logger.info(`[AdminBot] Mantendo link curto original: ${finalAffiliateLink}`);
        }

        // 2. Verificar se já existe (Duplicidade)
        let product = null;
        if (productData.externalId) {
            product = await Product.findByExternalId(productData.externalId, productData.platform);
            if (product) {
                logger.info(`[AdminBot] Produto já existe no banco: ${product.id}`);
            }
        }

        if (!product) {
            const newProductData = {
                name: productData.name,
                image_url: productData.imageUrl || 'https://via.placeholder.com/800x800.png?text=Sem+Imagem',
                platform: productData.platform || 'unknown',
                current_price: productData.currentPrice || 0,
                old_price: productData.oldPrice || 0,
                original_link: productData.url || productData.originalLink || url, // Link resolvido
                affiliate_link: finalAffiliateLink, // Link curto preservado
                status: 'pending',
                external_id: productData.externalId || generateUniqueId(),
                capture_source: 'admin_bot',
                is_active: true
            };

            product = await Product.create(newProductData);

            if (!product) {
                throw new Error('Falha ao salvar produto no banco.');
            }
            logger.info(`[AdminBot] Novo produto capturado: ${product.id} - ${product.name} `);
        }

        // Formatar valores
        const price = (product.current_price !== undefined && product.current_price !== null && product.current_price > 0)
            ? `R$ ${parseFloat(product.current_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'R$ 0,00 (Definir)';

        const oldPrice = parseFloat(product.old_price) > 0 ? `R$ ${parseFloat(product.old_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ` : '';
        const discountAmount = parseFloat(product.old_price) - parseFloat(product.current_price);
        const discountPercentage = (parseFloat(product.old_price) > 0 && parseFloat(product.current_price) > 0)
            ? Math.round((discountAmount / parseFloat(product.old_price)) * 100)
            : 0;

        const discountLabel = discountPercentage > 0 ? `${discountPercentage}% OFF` : '';

        // Montar mensagem de confirmação
        const message =
            `✅ *Produto Capturado (Admin)*\n\n` +
            `🛒 *${product.name}*\n` +
            `📂 *Categoria:* ${product.category_name || product.category_id || 'Não def.'}\n` +
            `🏪 ${product.platform || 'Loja'} \n\n` +
            `💰 *${price}* ${oldPrice ? `~~${oldPrice}~~` : ''} \n` +
            `${discountLabel ? `🏷️ ${discountLabel}\n` : ''} \n` +
            `🔗 [Link Oficial](${product.original_link || url}) \n` +
            `_Status: Pendente (Salvo no Banco)_`;

        // Keyboard atualizado
        const keyboard = new InlineKeyboard()
            .text('✏️ Editar e Publicar', `edit_wizard:start:${product.id}`)
            .row()
            .text('🚀 Publicar Agora', `publish:now:${product.id}`)
            .text('🎫 Criar Cupom', `coupon:create:${product.id}`);

        // Tentar enviar com foto
        try {
            if (product.image_url && product.image_url.startsWith('http')) {
                // Tentar baixar a imagem primeiro para evitar bloqueios ou erros de tipo (WebP com link direto as vezes falha)
                // Usando dynamic import para axios se necessário, mas axios já é usado no projeto
                const axios = (await import('axios')).default;

                logger.info(`[AdminBot] Baixando imagem para envio: ${product.image_url}`);
                const response = await axios.get(product.image_url, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });

                const { InputFile } = await import('grammy');

                await ctx.replyWithPhoto(new InputFile(response.data, 'image.jpg'), {
                    caption: message,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } else {
                throw new Error('URL de imagem inválida ou ausente');
            }
        } catch (photoError) {
            logger.warn(`[AdminBot] Erro ao enviar foto via buffer (${photoError.message}). Tentando envio direto de URL...`);

            // Tentativa 2: Envio direto da URL (Fallback)
            try {
                await ctx.replyWithPhoto(product.image_url, {
                    caption: message,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } catch (urlError) {
                logger.warn(`[AdminBot] Falha total no envio de imagem. Enviando apenas texto.`);
                await ctx.reply(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard,
                    disable_web_page_preview: false
                });
            }
        }

    } catch (error) {
        logger.error('Erro no handler de captura admin:', error);
        await ctx.reply(`❌ Erro ao capturar: ${error.message} `);
    }
};

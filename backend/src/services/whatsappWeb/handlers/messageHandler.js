import { config } from '../config.js';
import logger from '../../../config/logger.js';
import LinkAnalyzer from '../../linkAnalyzer.js';
import { handleAdminCommand } from './adminCommandHandler.js';
import { extractCouponData, formatCouponPreview, saveAndPublishCoupon, executeCouponCapture } from './whatsappCouponHandler.js';
import Coupon from '../../../models/Coupon.js';
import PublishService from '../../autoSync/publishService.js';
import { handlePendingFlow } from './whatsappPendingHandler.js';
import { handleEditFlow, startApprovalFlow, startEditWizard } from './whatsappEditHandler.js';
import { handleCaptureFlow, handleCaptureLink } from './whatsappCaptureHandler.js';
import { handleAutoSyncMenu, handleConfigEdit, handleConfigMenu, handlePlatformDetail, handlePlatformsMenu, showAutoSyncMenu } from './whatsappAutoSyncHandler.js';

// Mapa de Estado para Interações (Review, Edição, etc.)
// Key: chatId, Value: { type: 'product'|'coupon', data: Object, step: 'REVIEW'|'EDIT_NAME'|'EDIT_PRICE'|'EDIT_CODE'|'EDIT_DISCOUNT' }
const pendingInteractions = new Map();

// Mapa para escolha inicial (Capture vs Clone)
const pendingChoices = new Map();

// Cache de admin numbers do banco (recarrega a cada 60s)
let _cachedAdminNumbers = null;
let _adminNumbersCacheTime = 0;
const ADMIN_CACHE_TTL = 60 * 1000; // 60 segundos

/**
 * Normaliza um número de telefone removendo tudo que não é dígito
 */
function normalizePhone(num) {
    if (!num) return '';
    return num.replace(/\D/g, '');
}

/**
 * Busca admin numbers do banco com cache de 60s
 * Combina números do .env (config) + banco de dados
 */
async function getAdminNumbers() {
    const now = Date.now();
    if (_cachedAdminNumbers && (now - _adminNumbersCacheTime) < ADMIN_CACHE_TTL) {
        return _cachedAdminNumbers;
    }

    try {
        const BotConfig = (await import('../../../models/BotConfig.js')).default;
        const dbConfig = await BotConfig.get();

        // Números do banco
        const dbNumbers = (dbConfig.whatsapp_web_admin_numbers || '')
            .split(',')
            .map(n => normalizePhone(n))
            .filter(Boolean);

        // Números do .env (config original)
        const envNumbers = (config.adminNumbers || [])
            .map(n => normalizePhone(n))
            .filter(Boolean);

        // Combinar e deduplicar
        const allNumbers = [...new Set([...dbNumbers, ...envNumbers])];

        _cachedAdminNumbers = allNumbers;
        _adminNumbersCacheTime = now;

        logger.debug(`[AdminAuth] Loaded admin numbers: ${JSON.stringify(allNumbers)} (DB: ${dbNumbers.length}, ENV: ${envNumbers.length})`);

        return allNumbers;
    } catch (err) {
        logger.error(`[AdminAuth] Error loading admin numbers from DB: ${err.message}`);
        // Fallback para config em memória
        return (config.adminNumbers || []).map(n => normalizePhone(n)).filter(Boolean);
    }
}

// Limpeza Periódica de Memória (Evitar Leak)
setInterval(() => {
    const now = Date.now();
    const expiryTime = 30 * 60 * 1000; // 30 minutos de inatividade

    for (const [chatId, interaction] of pendingInteractions.entries()) {
        if (now - (interaction.lastUpdate || 0) > expiryTime) {
            logger.info(`🧹 Limpando interação pendente expirada de ${chatId}`);
            pendingInteractions.delete(chatId);
        }
    }

    for (const [chatId, choice] of pendingChoices.entries()) {
        if (now - (choice.timestamp || 0) > expiryTime) {
            logger.info(`🧹 Limpando escolha pendente expirada de ${chatId}`);
            pendingChoices.delete(chatId);
        }
    }
}, 15 * 60 * 1000); // Rodar a cada 15 min

export const handleMessage = async (client, msg) => {
    try {
        const contact = await msg.getContact();
        const senderNum = normalizePhone(contact.number);
        const fromMe = msg.fromMe;

        // 1. Validação de Segurança (busca números atualizados do DB com cache)
        const allowedNumbers = await getAdminNumbers();
        const isAllowed = fromMe || allowedNumbers.includes(senderNum);

        logger.info(`[MsgHandler] Auth Check: Sender=${senderNum}, Allowed=${JSON.stringify(allowedNumbers)}, IsAllowed=${isAllowed}, FromMe=${fromMe}`);

        if (!isAllowed) return;

        const chat = await msg.getChat();
        if (chat.isGroup) {
            // logger.debug(`[MsgHandler] Grupo detectado (${chat.name}). Ignorando interação.`);
            return;
        }

        const body = msg.body.trim();
        const chatId = msg.from;

        // Log para Debug
        const isForwarded = msg.isForwarded;
        logger.info(`[MsgHandler] ${senderNum} (Fwd:${isForwarded}): "${body.substring(0, 30)}..."`);

        // =================================================================================
        // FLUXO 1: Máquina de Estados (Edição e Publicação)
        // =================================================================================
        // =================================================================================
        // FLUXO 1: Máquina de Estados (Edição, Publicação, Pendentes)
        // =================================================================================
        let interaction = pendingInteractions.get(chatId);

        if (interaction) {
            // Delegação para Sub-Handlers
            // 1. Pendentes e Filtros
            if (interaction.step.startsWith('PENDING_')) {
                const newState = await handlePendingFlow(client, msg, interaction, body);

                // Processar ações de transição retornadas pelo handler
                if (newState.action === 'START_APPROVAL_FLOW') {
                    const nextState = await startApprovalFlow(msg, await import('../../../models/Product.js').then(m => m.default.findById(newState.productId)));
                    pendingInteractions.set(chatId, { ...nextState, lastUpdate: Date.now() });
                    return;
                }
                if (newState.action === 'START_EDIT_FLOW') {
                    const nextState = await startEditWizard(msg, await import('../../../models/Product.js').then(m => m.default.findById(newState.productId)));
                    pendingInteractions.set(chatId, { ...nextState, lastUpdate: Date.now() });
                    return;
                }
                if (newState.action === 'SHOW_MAIN_MENU') {
                    pendingInteractions.delete(chatId);
                    // Opcional: chamar sendMainMenu aqui se quiser
                    return;
                }

                pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }

            // 3. Captura (Menu após Link)
            if (interaction.step.startsWith('CAPTURE_')) {
                const newState = await handleCaptureFlow(client, msg, interaction, body);

                // Se o capture flow delegar para edit/approval (retornar steps EDIT_ ou REPUBLISH_)
                if (newState.step.startsWith('EDIT_') || newState.step.startsWith('REPUBLISH_')) {
                    // ...
                    pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                } else if (newState.step === 'IDLE') {
                    pendingInteractions.delete(chatId);
                } else {
                    pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                }
                return;
            }

            // 2. Edição e Aprovação (EDIT_*, REPUBLISH_*, PUBLISH_WIZARD_*)
            if (interaction.step.startsWith('EDIT_') || interaction.step.startsWith('REPUBLISH_') || interaction.step.startsWith('PUBLISH_WIZARD_')) {
                const newState = await handleEditFlow(client, msg, interaction, body);
                if (newState.step === 'IDLE') {
                    pendingInteractions.delete(chatId);
                } else if (newState.step.startsWith('PENDING_DETAIL')) {
                    // Voltar para detalhe
                    const productId = newState.step.split(':')[1];
                    const dummyState = { filters: interaction.filters, step: `PENDING_LIST:1`, lastUpdate: Date.now() }; // Preserva filtros
                    // Reinicializar fluxo pendente no detalhe
                    // Precisamos importar o showProductDetail logicamente ou simular chamada
                    // Simplificação: volta pra lista
                    const { listPendingProducts } = await import('./whatsappPendingHandler.js');
                    await listPendingProducts(client, msg, 1, dummyState);
                    pendingInteractions.set(chatId, dummyState);
                } else {
                    pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                }
                return;
            }


            // 4. Fluxos de Auto-Sync
            if (interaction.step === 'AUTOSYNC_MENU') {
                const newState = await handleAutoSyncMenu(msg, body, interaction);
                if (newState.step === 'IDLE') pendingInteractions.delete(chatId);
                else pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }
            if (interaction.step === 'AUTOSYNC_PLATFORMS') {
                const newState = await handlePlatformsMenu(msg, body, interaction);
                if (newState.step === 'IDLE') pendingInteractions.delete(chatId);
                else pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }
            if (interaction.step.startsWith('AUTOSYNC_PLATFORM_DETAIL')) {
                const newState = await handlePlatformDetail(msg, body, interaction);
                if (newState.step === 'IDLE') pendingInteractions.delete(chatId);
                else pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }
            if (interaction.step === 'AUTOSYNC_CONFIG') {
                const newState = await handleConfigMenu(msg, body, interaction);
                if (newState.step === 'IDLE') pendingInteractions.delete(chatId);
                else pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }
            if (interaction.step.startsWith('AUTOSYNC_EDIT_')) {
                const newState = await handleConfigEdit(msg, body, interaction);
                if (newState.step === 'IDLE') pendingInteractions.delete(chatId);
                else pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }


            // Legacy Edit Logic (Capture Flow) - Manter por enquanto se não conflitar
            // A. Modo de Edição (Usuário enviou o novo valor)
            // A. Modo de Edição (Usuário enviou o novo valor)
            if (interaction.step.startsWith('EDIT_')) {
                const field = interaction.step.replace('EDIT_', '').toLowerCase();

                // Atualizar Campo
                if (interaction.type === 'product') {
                    if (field === 'name') interaction.data.name = body;
                    if (field === 'price') interaction.data.currentPrice = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, '')) || interaction.data.currentPrice;
                } else if (interaction.type === 'coupon') {
                    if (field === 'code') interaction.data.code = body.toUpperCase();
                    if (field === 'discount') {
                        // Tentar detectar se é % ou R$
                        if (body.includes('%')) {
                            interaction.data.discount_type = 'percentage';
                            interaction.data.discount_value = parseInt(body.replace(/\D/g, ''));
                        } else {
                            interaction.data.discount_type = 'fixed';
                            interaction.data.discount_value = parseFloat(body.replace(',', '.').replace(/[^\d.]/g, ''));
                        }
                    }
                }

                // Voltar para Review
                interaction.step = 'REVIEW';
                pendingInteractions.set(chatId, interaction);

                // Reenviar Preview
                const preview = interaction.type === 'product'
                    ? formatProductPreview(interaction.data)
                    : formatCouponPreview(interaction.data);

                await msg.reply(`✅ *Dado Atualizado! Confirme abaixo:*\n\n${preview}`);
                return;
            }

            // B. Modo de Revisão (Usuário escolheu opção do menu)
            if (interaction.step === 'REVIEW') {
                if (body === '1') { // PUBLICAR
                    await msg.react('🚀');
                    pendingInteractions.delete(chatId);

                    if (interaction.type === 'product') {
                        const PublishService = (await import('../../autoSync/publishService.js')).default;
                        // Mapear campos
                        const norm = {
                            name: interaction.data.name,
                            current_price: interaction.data.currentPrice,
                            old_price: interaction.data.oldPrice,
                            image_url: interaction.data.imageUrl,
                            platform: interaction.data.platform,
                            url: interaction.data.url || interaction.data.affiliateLink,
                            affiliate_link: interaction.data.affiliateLink || interaction.data.url,
                            description: interaction.data.description
                        };
                        const res = await PublishService.publishAll(norm, { manual: true });
                        await msg.reply(res.success ? '✅ *Produto Publicado!*' : `❌ Erro: ${res.reason}`);

                    } else if (interaction.type === 'coupon') {
                        const res = await saveAndPublishCoupon(interaction.data);
                        await msg.reply(res.reply);
                    }
                    return;
                }

                if (body === '4') { // CANCELAR
                    pendingInteractions.delete(chatId);
                    await msg.reply('❌ Operação cancelada.');
                    return;
                }

                // Edições
                if (interaction.type === 'product') {
                    if (body === '2') {
                        interaction.step = 'EDIT_NAME';
                        await msg.reply('✏️ *Digite o novo Título do produto:*');
                    } else if (body === '3') {
                        interaction.step = 'EDIT_PRICE';
                        await msg.reply('💲 *Digite o novo Preço (ex: 100.00):*');
                    }
                } else if (interaction.type === 'coupon') {
                    if (body === '2') {
                        interaction.step = 'EDIT_CODE';
                        await msg.reply('🎟️ *Digite o novo Código do cupom:*');
                    } else if (body === '3') {
                        interaction.step = 'EDIT_DISCOUNT';
                        await msg.reply('💰 *Digite o novo Desconto (ex: 10% ou 50.00):*');
                    }
                }
                pendingInteractions.set(chatId, interaction);
                return;
            }

            // C. Fluxo de Republicação - Escolha de Vínculo
            if (interaction.step === 'REPUBLISH_CONFIRM_COUPON') {
                const answer = body.toLowerCase();
                if (answer === 'sim' || answer === 's' || answer === 'y') {
                    // Buscar cupons da plataforma
                    const platform = interaction.data.platform || 'general';
                    const activeCouponsResult = await Coupon.findActive({ platform, limit: 10 });
                    const activeCoupons = activeCouponsResult.coupons || [];

                    if (activeCoupons.length === 0) {
                        await msg.reply(`⚠️ *Nenhum cupom ativo encontrado para ${platform}.* Publicando sem cupom...`);
                        await _publishProduct(msg, interaction.data, null);
                        pendingInteractions.delete(chatId);
                    } else {
                        // Listar cupons
                        let reply = `🎟️ *Selecione um Cupom para Vincular:*\n\n`;
                        activeCoupons.forEach((c, index) => {
                            reply += `${index + 1}. *${c.code}* (${c.discount_type === 'percentage' ? c.discount_value + '%' : 'R$' + c.discount_value})\n`;
                        });
                        reply += `\nDigite o número do cupom ou '0' para cancelar vínculo.`;

                        interaction.step = 'REPUBLISH_SELECT_COUPON';
                        interaction.availableCoupons = activeCoupons;
                        pendingInteractions.set(chatId, interaction);
                        await msg.reply(reply);
                    }
                } else if (answer === 'não' || answer === 'nao' || answer === 'n' || answer === 'no') {
                    await msg.reply('🚀 Publicando sem cupom vinculado...');
                    await _publishProduct(msg, interaction.data, null);
                    pendingInteractions.delete(chatId);
                } else {
                    await msg.reply('🤖 Responda com *Sim* ou *Não*. Deseja vincular um cupom?');
                }
                return;
            }

            // D. Fluxo de Republicação - Seleção de Cupom
            if (interaction.step === 'REPUBLISH_SELECT_COUPON') {
                const index = parseInt(body);
                if (isNaN(index)) {
                    await msg.reply('❌ Digite um número válido.');
                    return;
                }

                if (index === 0) {
                    await msg.reply('🚀 Publicando sem cupom vinculado...');
                    await _publishProduct(msg, interaction.data, null);
                    pendingInteractions.delete(chatId);
                    return;
                }

                const selectedCoupon = interaction.availableCoupons[index - 1];
                if (!selectedCoupon) {
                    await msg.reply('❌ Opção inválida. Tente novamente.');
                    return;
                }

                await msg.reply(`✅ Cupom *${selectedCoupon.code}* selecionado!\n🚀 Publicando...`);
                await _publishProduct(msg, interaction.data, selectedCoupon.id);
                pendingInteractions.delete(chatId);
                return;
            }
        }

        // =================================================================================
        // FLUXO 2: Escolha Inicial (Capture vs Clone)
        // =================================================================================
        const choiceContext = pendingChoices.get(chatId);
        if (choiceContext && (body === '1' || body === '2')) {
            pendingChoices.delete(chatId);
            const targetText = choiceContext.text;

            if (body === '1') { // Capture Product
                // Delegar para novo Handler de Captura
                const url = (choiceContext.text.match(/(https?:\/\/[^\s]+)/) || [choiceContext.text])[0];
                const newState = await handleCaptureLink(client, msg, url, chatId);
                if (newState) {
                    pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                }
            } else if (body === '2') { // Clone Coupon
                const newState = await executeCouponCapture(client, msg, targetText, chatId);
                if (newState) {
                    pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                }
            }
            return;
        }

        // =================================================================================
        // FLUXO 3: Comandos Admin & Detecção Link
        // =================================================================================
        // =================================================================================
        // FLUXO 3: Comandos Admin & Detecção Link
        // =================================================================================
        // COMANDO AUTO-SYNC
        if (body.toLowerCase() === '/autosync') {
            const newState = await showAutoSyncMenu(msg);
            pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
            return;
        }

        const commandResult = await handleAdminCommand(client, msg, body);

        // Se retornou objeto de ação (ex: START_REPUBLISH, SHOW_PENDING)
        if (typeof commandResult === 'object') {
            if (commandResult.action === 'START_REPUBLISH') {
                const product = commandResult.product;
                // Re-use logic from Edit Handler for coupon flow
                await msg.reply(`🔄 *Republicando: ${product.name}*`);
                const nextState = await startApprovalFlow(msg, product); // Reutiliza fluxo de aprovação (Link + Cupom)
                pendingInteractions.set(chatId, { ...nextState, lastUpdate: Date.now() });
                return;
            }
            if (commandResult.action === 'SHOW_PENDING') {
                const { listPendingProducts } = await import('./whatsappPendingHandler.js');
                const initialState = { step: 'PENDING_LIST:1', filters: {}, lastUpdate: Date.now() };
                await listPendingProducts(client, msg, 1, initialState);
                pendingInteractions.set(chatId, initialState);
                return;
            }
            if (commandResult.action === 'SHOW_AUTOSYNC') {
                const newState = await showAutoSyncMenu(msg);
                pendingInteractions.set(chatId, { ...newState, lastUpdate: Date.now() });
                return;
            }
        }

        if (commandResult === true) return; // Comando tratado e finalizado

        // Lógica de Detecção Automática (Link/Oferta)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasUrl = urlRegex.test(body);
        const offerKeywords = ['cupom', 'código', 'desconto', 'oferta', 'off', 'use o código'];
        const isOfferText = offerKeywords.some(kw => body.toLowerCase().includes(kw));

        // Evitar loops: Detectar apenas mensagens QUE COMEÇAM com assinaturas do bot
        // "🎟️" removido da lista para permitir cupons com emojis
        const botPrefixes = [
            '✅ *Prévia',
            '🤖 *Como deseja',
            '🤖 *O que deseja',
            '✅ *Cupom Salvo',
            '✅ *Produto Publicado',
            '✅ *Publicado',
            '📋 *Produtos Pendentes',
            '📊 *Status do Sistema',
            '📈 *Estatísticas',
            '❌ Erro',
            '🆔 ID',
            '✅ *Dado Atualizado',
            '❌ Operação cancelada',
            '✏️ *Digite',
            '💲 *Digite',
            '🎟️ *Digite',
            '💰 *Digite',
            '💲 *Preço',
            '💰 *Preço',
            '💰 De:',
            '🤑 Por:',
            '💰 Valor:',
            '🛒 *DETALHE DO PRODUTO*',
            '✅ *Produto Capturado*',
            '📋 *Pendentes',
            '🎫 *Vincular Cupom?',
            '✏️ *Editar Produto:',
            '🔗 *Link Original Detectado!*',
            '🔗 *Verifique o Link de Afiliado:*',
            '🔗 *Link de Afiliado Necessário!*',
            '✅ *Link de afiliado salvo!*',
            '✅ *Sucesso!*',
            '📂 *Selecione a Categoria:*',
            '📂 *Passo 1: Selecione a Categoria:*',
            '🚀 Publicando',
            '🔄 *Republicando',
            '🔥',
            '⚡',
            '📢',
            '🔴',
            '📣'
        ];
        const isBotOutput = botPrefixes.some(prefix => body.startsWith(prefix));

        // Ignorar APENAS se: (Vem de MIM) E (Parece Bot OU é Longa) E (NÃO É ENCAMINHADA - por segurança)
        // Mensagens longas (>150 chars) vindas de mim geralmente são promoções/broadcasts, não comandos de captura.
        const isLongSelfMessage = body.length > 150;
        const shouldIgnore = fromMe && (isBotOutput || isLongSelfMessage) && !msg.isForwarded;

        // VERIFICAÇÃO DE FLUXO ATIVO
        // Se já existe uma interação pendente recente (< 60s), NÃO interromper com menu de captura
        const activeInteraction = pendingInteractions.get(chatId);
        const isInteractionActive = activeInteraction && (Date.now() - (activeInteraction.lastUpdate || 0) < 60000);

        if ((hasUrl || (isOfferText && body.length > 5) || msg.isForwarded) && !shouldIgnore) {
            // Se já existe uma interação pendente recente, IGNORAR (exceto se for link novo explícito, mas idealmente nem isso)
            if (activeInteraction) {
                logger.info(`[MsgHandler] Interação ativa (${activeInteraction.step}). Ignorando detecção de oferta/link para evitar interrupção.`);
                return;
            }

            pendingChoices.set(chatId, { text: body, timestamp: Date.now() });
            await msg.react('🤔');
            await msg.reply(`🤖 *O que deseja fazer?*\n\n1️⃣ Captura de Produto\n2️⃣ Clonagem de Cupom`);
        }

    } catch (error) {
        logger.error('Erro MessageHandler:', error);
    }
};

// --- Helpers ---


// Helper formatProductPreview removido pois agora é tratado nos handlers especificos (ou movido para util)


async function _publishProduct(msg, product, couponId) {
    // Se tiver couponId, forçamos o valor no objeto (mesmo que não persista no banco,
    // o PublishService vai usar para escolher o template e gerar links)
    // Se quisermos persistir, deveríamos dar update no product antes.
    // Para republicação pontual, talvez não queiramos alterar o vínculo permanente do produto?
    // O Implementation Plan diz "Publish with coupon_id override".

    // Vamos clonar para não afetar o objeto original se não for intenção salvar
    const productToPublish = { ...product };
    if (couponId) {
        productToPublish.coupon_id = couponId;
    }

    const res = await PublishService.publishAll(productToPublish, { manual: true });
    await msg.reply(res.success ? '✅ *Produto Publicado com Sucesso!*' : `❌ Erro na publicação: ${res.reason}`);
}

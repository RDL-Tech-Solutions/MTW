import openrouterClient from '../../../ai/openrouterClient.js'; // AI Client
import { InlineKeyboard } from 'grammy';
import logger from '../../../config/logger.js';
import SyncConfig from '../../../models/SyncConfig.js';
import Product from '../../../models/Product.js';
import Coupon from '../../../models/Coupon.js';
import Category from '../../../models/Category.js';
import User from '../../../models/User.js';
import AppSettings from '../../../models/AppSettings.js';
import ClickTracking from '../../../models/ClickTracking.js';
import TelegramChannel from '../../../models/TelegramChannel.js';
import ScheduledPost from '../../../models/ScheduledPost.js';
import { adminMainMenu } from '../menus/mainMenu.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';
import publishService from '../../autoSync/publishService.js';
import schedulerService from '../../autoSync/schedulerService.js';
import { syncProducts } from '../../cron/syncProducts.js';
import LinkAnalyzer from '../../linkAnalyzer.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase from '../../../config/database.js';


import { PLATFORM_CATEGORY_MAP, CATEGORY_IDS } from '../../../utils/categoryMap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AiService {
    constructor() {
        this.systemPrompt = `
Você é a IA ADVANCED, Administradora AUTÔNOMA do sistema PreçoCerto.
Você tem autoridade total sobre o backend para gerenciar a plataforma.

PRINCÍPIOS DE AUTONOMIA (RIGOROSO):
1. **Decisão de Fluxo**: Você decide o que fazer com base na intenção. NUNCA use wizards ou menus antigos.
2. **Contexto**: Use o "CONTEXTO ATUAL" para entender referências (ex: "publicar este", "com cupom", "o link é X").
3. **Segurança**: NUNCA publique nada sem validação humana explicita (confirm: true).
4. **Interação**: Pergunte sempre que faltar informação crítica (preço, link afiliado, código cupom).
5. **Preenchimento de Contexto**: Se context.missing_field estiver definido (ex: 'affiliate_link') e o usuário enviar um valor compatível (ex: um link ou número), você DEVE usar esse valor para completar a ação anterior (publish_product) em vez de iniciar uma nova ação (como capture_product).

CAPACIDADES (Use APENAS estes comandos JSON):

--- GESTÃO DE PRODUTOS ---
- list_products: { page: number, status: string }
  -> Lista produtos (padrão: publicados). Use para "listar todos", "meus produtos".
- get_product_details: { id: string }
  -> Exibe detalhes do produto e pergunta ação. Use quando usuário enviar APENAS um ID.
- capture_product: { url: string }
- publish_product: { id: string, affiliate_link: string, confirm: boolean }
- update_product: { id: string, name: string, price: number, link: string }
- delete_product: { id: string, confirm: boolean }
- search_products: { query: string, platform: string, status: string }
- list_pending_products: { page: number }
- republish_product: { id: string, confirm: boolean }
- set_stock_status: { id: string, available: boolean }
  -> Define se tem estoque (true) ou esgotado (false).
- product_history: { id: string }
  -> Exibe gráfico/lista de variação de preço.
- refresh_metadata: { id: string }
  -> Re-analisa o link original para atualizar preço/foto.

--- CUPONS (/coupons) ---
- extract_coupon: { text: string } -> Analisa texto e sugere criação.
- create_coupon: { code, discount_value, discount_type, platform, valid_until }
- list_coupons: { search: string, page: number }
- mark_coupon_expired: { code: string }
  -> Marca cupom como esgotado e notifica canais. Use para "cupom X esgotou".

--- CATEGORIAS (/categories) ---
- manage_categories: { action: 'list'|'create'|'delete', name: string, id: string, confirm: boolean }

--- USUÁRIOS (/users) ---
- manage_users: { action: 'list'|'toggle_status', id: string, active: boolean }

--- SISTEMA (/bots, /settings) ---
- manage_schedules: { action: 'list'|'create'|'delete', product_id: string, date: string, id: string }
- manage_channels: { action: 'list'|'toggle', id: string, active: boolean }
- manage_bot_settings: { action: 'status'|'toggle_feature', feature: string, enabled: boolean }
- read_logs: { lines: number, type: 'app'|'error' }
- post_to_channel: { channel_id: string, message: string }
- check_system_health: {}
  -> Status técnico (Memória, Uptime, PID).
- block_user: { id: string, reason: string }
  -> Bane usuário (role='banned').
- cleanup_system: { action: 'scan'|'execute', target: 'rejected_products'|'expired_coupons'|'all' }
  -> Limpeza de dados antigos.
- backup_data: { type: 'products'|'users'|'full' }
  -> Gera e envia arquivo JSON com backup.
- get_dashboard_stats: {}

--- INTERAÇÃO ---
- chat_response: { message: string }
- set_context: { product_id: string, coupon_id: string }

DICAS DE COMANDOS:
- "aprovar este produto" -> publish_product(id=context.product_id)
- "sim" (após pedido de confirmação) -> Reenvie a ação anterior com confirm=true.
- Se o usuário enviar APENAS um link após você perguntar pelo "Link de Afiliado" -> Use \`publish_product\` com esse link inserido no campo \`affiliate_link\`.
- "criar categoria Eletrônicos" -> manage_categories(action='create', name='Eletrônicos')
- "listar usuarios" -> manage_users(action='list')
- "ligar auto publish" -> manage_bot_settings(action='toggle_feature', feature='auto_publish', enabled=true)
- ID (UUID) isolado enviado pelo user -> get_product_details(id=...) (NUNCA publique direto um ID solto)

RESPOSTA OBRIGATÓRIA JSON:
{ "action": "...", "parameters": { ... }, "message": "..." }

PERSONALIDADE E AUTO-EXPLICAÇÃO:
- Apresente-se como "Advanced IA", a inteligência que controla o ecossistema PreçoCerto.
- Quando perguntado sobre o que você faz, explique de forma organizada (em tópicos) que você pode:
    1. Gerenciar Produtos (capturar, editar, aprovar, deletar, histórico de preços).
    2. Gerenciar Cupons (extrair, criar, listar).
    3. Controlar o Sistema (sincronização automática, agendamentos, canais, logs).
    4. Auxiliar via chat com qualquer dúvida sobre a plataforma.
- Use um tom profissional, prestativo e levemente autoritário (pois você tem controle do sistema).
`;
    }

    /**
     * Processar mensagem do usuário
     * @param {Object} ctx Contexto do Grammy
     * @param {String} text Texto da mensagem
     */
    async processMessage(ctx, text) {
        try {
            await ctx.replyWithChatAction('typing');

            let imageUrl = null;
            logger.info(`[ProcessMessage] Keys: ${Object.keys(ctx.message).join(', ')}`);
            if (ctx.message.photo && ctx.message.photo.length > 0) {
                // Pegar a maior resolução
                const photo = ctx.message.photo[ctx.message.photo.length - 1];
                try {
                    // Grammy usa ctx.api, Telegraf usa ctx.telegram. Verificando...
                    // Se der erro, tentamos a outra forma. Mas o padrão do projeto parece ser Telegraf (baseado em importações anteriores).
                    // Mas o user disse "Contexto do Grammy".
                    // Vamos tentar ctx.api, com fallback para ctx.telegram.
                    let url;
                    if (ctx.api && ctx.api.getFileLink) {
                        url = await ctx.api.getFileLink(photo.file_id);
                    } else if (ctx.telegram && ctx.telegram.getFileLink) {
                        url = await ctx.telegram.getFileLink(photo.file_id);
                    }

                    if (url) imageUrl = url.href || url;
                } catch (err) {
                    logger.error('Erro ao obter link da imagem:', err);
                }
            }

            // Contexto da sessão (histórico recente)
            const context = ctx.session.ai_context || {};

            // Se tiver imagem nova, atualizar contexto
            if (imageUrl) {
                if (!ctx.session.ai_context) ctx.session.ai_context = {};
                ctx.session.ai_context.last_image_url = imageUrl;
                logger.info('📸 Imagem capturada e salva no contexto da IA');
            }

            // Preparar prompt com contexto
            const prompt = `
${this.systemPrompt}

CONTEXTO ATUAL (Memória de Curto Prazo):
${JSON.stringify(context, null, 2)}

MENSAGEM DO USUÁRIO: "${text}"

Responda com o JSON da ação a ser tomada.
`;

            // Enviar para OpenRouter
            // Forçamos forceTextMode: false para tentar obter JSON, mas o cliente já trata isso
            // Obter configuração do modelo Admin
            const config = await AppSettings.getOpenRouterConfig();
            const adminModel = config.adminModel;

            // Enviar para OpenRouter definindo o modelo explicitamente
            const response = await openrouterClient.enqueueRequest(prompt, { model: adminModel });

            logger.info(`[AI Service] Modelo: ${adminModel} | Ação sugerida: ${JSON.stringify(response)}`);

            // Executar ação
            await this.executeAction(ctx, response);

        } catch (error) {
            logger.error('[AI Service] Erro ao processar mensagem:', error);
            await ctx.reply('❌ Ocorreu um erro ao processar sua solicitação com a IA. Tente novamente.');
        }
    }

    /**
     * Executar ação retornada pela IA
     */
    async executeAction(ctx, aiResponse) {
        const { action, parameters, message } = aiResponse;

        // Responder ao usuário com a mensagem da IA (se houver)
        if (message) {
            await ctx.reply(`🤖 ${message}`);
        }

        switch (action) {
            case 'manage_bot_settings':
                await this.manageBotSettings(ctx, parameters);
                break;

            case 'manage_categories':
                await this.manageCategories(ctx, parameters);
                break;

            case 'manage_users':
                await this.manageUsers(ctx, parameters);
                break;

            case 'delete_product':
                await this.deleteProduct(ctx, parameters);
                break;

            case 'update_product':
                await this.updateProduct(ctx, parameters);
                break;

            case 'chat_response':
                // Apenas a mensagem já foi enviada
                break;

            case 'search_products':
                await this.searchProducts(ctx, parameters);
                break;

            case 'list_products':
                // Forçar busca limpa
                await this.searchProducts(ctx, {
                    query: '',
                    status: parameters.status || 'published',
                });
                break;

            case 'get_product_details':
                await this.getProductDetails(ctx, parameters);
                break;

            case 'list_pending_products':
                await this.listPendingProductsDirect(ctx, parameters.page);
                break;

            case 'approve_product':
                await this.approveProduct(ctx, parameters);
                break;

            case 'reject_product':
                await this.rejectProduct(ctx, parameters);
                break;

            case 'publish_product':
                // Inserir implementação do método instantPublishProduct diretamente aqui ou abaixo
                await this.instantPublishProduct(ctx, parameters);
                break;

            case 'set_stock_status':
                await this.setStockStatus(ctx, parameters);
                break;

            case 'product_history':
                await this.getProductHistory(ctx, parameters);
                break;

            case 'mark_coupon_expired':
                await this.markCouponExpired(ctx, parameters);
                break;

            case 'refresh_metadata':
                await this.refreshMetadata(ctx, parameters);
                break;

            case 'extract_coupon':
                await this.extractCouponFromText(ctx, parameters.text || text);
                break;

            case 'capture_product':
                // Garantir que passamos a URL string e não o objeto de parâmetros
                await this.captureProduct(ctx, parameters.url || parameters);
                break;

            case 'create_coupon':
                await this.createCouponAutonomous(ctx, parameters);
                break;

            case 'republish_product':
                await this.republishProduct(ctx, parameters);
                break;

            case 'schedule_ai':
                await this.handleScheduleAI(ctx, parameters);
                break;

            case 'manage_schedules':
                await this.manageSchedules(ctx, parameters);
                break;

            case 'manage_channels':
                await this.manageChannels(ctx, parameters);
                break;

            case 'read_logs':
                await this.getRecentLogs(ctx, parameters);
                break;

            case 'post_to_channel':
                await this.postToChannel(ctx, parameters);
                break;

            case 'check_system_health':
                await this.checkSystemHealth(ctx);
                break;

            case 'block_user':
                await this.blockUser(ctx, parameters);
                break;

            case 'cleanup_system':
                await this.cleanupSystem(ctx, parameters);
                break;

            case 'backup_data':
                await this.backupData(ctx, parameters);
                break;

            case 'unknown_command':
                await ctx.reply('❓ Não entendi exatamente o que fazer. Pode ser mais específico?');
                break;

            default:
                if (action !== 'chat_response') {
                    logger.warn(`[AI Service] Ação não implementada: ${action}`);
                    await ctx.reply(`⚠️ A ação "${action}" foi identificada, mas ainda não sei executá-la.`);
                }
                break;
        }
    }

    // --- IMPLEMENTAÇÃO DE AÇÕES ---

    /**
     * Capturar produto de forma autônoma
     */
    async captureProduct(ctx, rawUrl) {
        try {
            // Extrair URL de string ou objeto
            const url = typeof rawUrl === 'string' ? rawUrl : rawUrl?.url;

            if (!url) {
                return ctx.reply('⚠️ URL não fornecida para captura.');
            }

            await ctx.reply('⏳ *Analisando link e capturando informações...*', { parse_mode: 'Markdown' });

            // 1. Analisar link
            const productData = await LinkAnalyzer.analyzeLink(url);

            if (!productData || !productData.name) {
                return ctx.reply('❌ Não consegui extrair dados deste link. Verifique se o site é suportado.');
            }

            // 2. Salvar ou atualizar
            let product = null;
            if (productData.externalId) {
                product = await Product.findByExternalId(productData.externalId, productData.platform);
            }

            if (product) {
                // Se já existe, atualizamos links e garantimos que está ativo
                await Product.update(product.id, {
                    original_link: url,
                    affiliate_link: productData.affiliateLink || url,
                    image_url: productData.imageUrl || product.image_url,
                    current_price: productData.currentPrice || product.current_price,
                    old_price: productData.oldPrice || product.old_price,
                    is_active: true
                });
                product = await Product.findById(product.id);
            } else {
                const { generateUniqueId } = await import('../../../utils/helpers.js');
                product = await Product.create({
                    name: productData.name,
                    image_url: productData.imageUrl || 'https://via.placeholder.com/800x800',
                    platform: productData.platform || 'unknown',
                    category_id: (() => {
                        if (productData.platform) {
                            const key = productData.platform.toLowerCase();
                            const mapEntry = PLATFORM_CATEGORY_MAP[key];
                            if (mapEntry && mapEntry.slug && CATEGORY_IDS[mapEntry.slug]) {
                                return CATEGORY_IDS[mapEntry.slug];
                            }
                        }
                        return null;
                    })(),
                    current_price: productData.currentPrice || 0,
                    old_price: productData.oldPrice || 0,
                    original_link: url,
                    affiliate_link: productData.affiliateLink || url,
                    status: 'pending',
                    external_id: productData.externalId || generateUniqueId(),
                    capture_source: 'ai_autonomous',
                    is_active: true
                });
            }

            // 3. Atualizar contexto da IA
            ctx.session.ai_context = {
                last_action: 'product_captured',
                product_id: product.id,
                product_name: product.name,
                original_link: product.original_link,
                has_affiliate_link: !!product.affiliate_link
            };

            // 4. Formatar mensagem de preview
            let msg = `📦 *Produto Capturado!*\n\n`;
            msg += `🏷 *Nome:* ${product.name}\n`;

            if (product.current_price > 0) {
                msg += `💰 *Preço:* R$ ${product.current_price.toFixed(2).replace('.', ',')}\n`;
                if (product.old_price > product.current_price) {
                    msg += `📉 *De:* ~~R$ ${product.old_price.toFixed(2).replace('.', ',')}~~\n`;
                }
            }

            msg += `🌐 *Plataforma:* ${product.platform.toUpperCase()}\n`;
            msg += `🆔 *ID:* \`${product.id}\`\n\n`;

            if (!product.affiliate_link || product.affiliate_link === product.original_link) {
                msg += `⚠️ *Aviso:* Link de afiliado não detectado. Vou precisar que você forneça um se desejar publicar.\n\n`;
            }

            msg += `🤖 *Deseja publicar este produto agora?*\n_(Responda "sim", "publicar" ou peça para agendar)_`;

            // NOVO: Verificar cupons da plataforma
            const coupons = await this.checkPlatformCoupons(product.platform);
            if (coupons && coupons.length > 0) {
                // Store coupons in context to use index in callback_data (save bytes)
                ctx.session.ai_context.available_coupons = coupons.map(c => ({ id: c.id, code: c.code, value: c.discount_value, type: c.discount_type }));

                msg += `\n\n🎟️ *Cupons Encontrados:* Notei que temos ${coupons.length} cupom(ns) ativo(s) para ${product.platform.toUpperCase()}. Deseja vincular algum?\n`;

                const buttons = coupons.map((c, index) => ([{
                    text: `🎫 Usar ${c.code} (${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' OFF'})`,
                    callback_data: `vc:${product.id}:${index}`
                }]));

                buttons.push([{ text: '❌ Não vincular cupom', callback_data: `vc:${product.id}:n` }]);

                if (productData.imageUrl) {
                    await ctx.replyWithPhoto(productData.imageUrl, {
                        caption: msg.substring(0, 1024),
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: buttons }
                    });
                } else {
                    await ctx.reply(msg, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: buttons }
                    });
                }
                return;
            }

            // Tentar enviar imagem se não caiu no fluxo de cupons
            if (product.image_url && product.image_url.startsWith('http')) {
                try {
                    await ctx.replyWithPhoto(product.image_url, { caption: msg, parse_mode: 'Markdown' });
                } catch (e) {
                    await ctx.reply(msg, { parse_mode: 'Markdown' });
                }
            } else {
                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            logger.error('Erro captureProduct:', error);
            await ctx.reply(`❌ Erro ao capturar produto: ${error.message}`);
        }
    }

    /**
     * Tratar seleção de cupom via botão
     */
    async handleCouponSelection(ctx, data) {
        // data format: vc:productId:couponIndex[:p]
        const parts = data.split(':');
        const productId = parts[1];
        const couponIndexOrNone = parts[2];
        const shouldPublish = parts[3] === 'p';

        try {
            const product = await Product.findById(productId);
            if (!product) return ctx.answerCallbackQuery('❌ Produto não encontrado.');

            if (couponIndexOrNone === 'n') {
                // Não vincular cupom
                await Product.update(productId, { coupon_id: null });
                await ctx.answerCallbackQuery('✅ Continuando sem cupom.');
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

                if (shouldPublish) {
                    return await this.instantPublishProduct(ctx, { id: productId, skip_coupon_check: true });
                } else {
                    return ctx.reply(`👍 Entendido. *${product.name}* salvo sem cupom. Pode pedir para publicar quando quiser.`, { parse_mode: 'Markdown' });
                }
            }

            // Vincular cupom selecionado via index
            const coupons = ctx.session.ai_context.available_coupons;
            if (!coupons || !coupons[couponIndexOrNone]) {
                return ctx.answerCallbackQuery('❌ Erro: Seleção de cupom expirou. Tente capturar novamente.');
            }

            const couponData = coupons[couponIndexOrNone];
            await Product.update(productId, { coupon_id: couponData.id });
            await ctx.answerCallbackQuery(`✅ Vinculado: ${couponData.code}`);
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

            if (shouldPublish) {
                await ctx.reply(`✨ Cupom *${couponData.code}* vinculado com sucesso! Iniciando publicação...`, { parse_mode: 'Markdown' });
                return await this.instantPublishProduct(ctx, { id: productId, skip_coupon_check: true });
            } else {
                return ctx.reply(`✨ Cupom *${couponData.code}* vinculado com sucesso a *${product.name}*! Deseja publicar agora?`, { parse_mode: 'Markdown' });
            }

        } catch (error) {
            logger.error('Erro handleCouponSelection:', error);
            await ctx.answerCallbackQuery('❌ Erro ao processar seleção.');
        }
    }

    /**
     * Buscar produtos (Smart Search)
     */
    async searchProducts(ctx, params) {
        try {
            let query = params.query || '';
            let platform = params.platform;
            let status = params.status;

            // Limpeza de parâmetros 'all'
            if (platform === 'all') platform = undefined;
            if (status === 'all') status = undefined;

            // Se query for igual a plataforma, limpar query (evitar filtro por nome 'mercadolivre')
            if (platform && query && query.toLowerCase().includes(platform.toLowerCase())) {
                query = '';
            }

            // Se a query for termo de parada (exatos ou frases comuns de listagem)
            const stopPhrases = [
                'lista', 'produtos', 'todos', 'pendentes',
                'todos os produtos', 'lista de produtos', 'listar produtos',
                'meus produtos', 'cadastrados', 'ativos'
            ];

            if (stopPhrases.includes(query.toLowerCase().trim())) {
                query = '';
            }

            const filters = {
                search: query,
                limit: 5,
                platform: platform,
                status: status
            };

            const res = await Product.findAll(filters);

            if (!res.products || res.products.length === 0) {
                return ctx.reply(`❌ Nenhum produto encontrado para "${query}".`);
            }

            let msg = `🔍 *Resultados de Busca*:\n\n`;
            res.products.forEach(p => {
                msg += `📌 *${p.name.substring(0, 40)}...*\n`;
                msg += `ID: \`${p.id}\` | Status: ${p.status}\n`;
                msg += `Preço: R$${p.current_price}\n\n`;
            });

            // Atualizar contexto com o primeiro resultado para facilitar referência
            if (res.products.length > 0) {
                ctx.session.ai_context = {
                    last_search_results: res.products.map(p => p.id),
                    product_id: res.products[0].id // Default suggestion
                };
            }

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro searchProducts:', error);
            await ctx.reply('Erro ao buscar produtos.');
        }
    }

    /**
     * Exibir Detalhes do Produto (ação segura para IDs soltos)
     */
    async getProductDetails(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID inválido.');

        try {
            const product = await Product.findById(id);
            if (!product) return ctx.reply('❌ Produto não encontrado.');

            // Atualizar contexto
            ctx.session.ai_context = {
                last_action: 'view_details',
                product_id: product.id,
                product_name: product.name,
                original_link: product.original_link
            };

            const statusEmoji = {
                'pending': '⏳',
                'approved': '✅',
                'published': '🚀',
                'rejected': '❌'
            };

            let msg = `📦 *Detalhes do Produto*\n\n`;
            msg += `*${product.name}*\n`;
            msg += `ID: \`${product.id}\`\n`;
            msg += `Status: ${statusEmoji[product.status] || '❓'} ${product.status}\n`;
            msg += `Preço: R$${product.current_price}\n`;
            msg += `Link Orig: ${product.original_link}\n`;

            if (product.affiliate_link && product.affiliate_link !== product.original_link) {
                msg += `Link Afiliado: ${product.affiliate_link}\n`;
            } else {
                msg += `Link Afiliado: ⚠️ *Pendente*\n`;
            }

            msg += `\n_O que deseja fazer?_\n`;
            msg += `- "Publicar"\n`;
            msg += `- "Editar"\n`;
            msg += `- "Remover"`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });

        } catch (error) {
            logger.error('Erro getProductDetails:', error);
            await ctx.reply('Erro ao buscar detalhes.');
        }
    }

    /**
     * Aprovar Produto (Interativo)
     */

    /**
     * Aprovar produto
     */
    async approveProduct(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID do produto necessário.');

        try {
            await Product.update(id, { status: 'approved' });
            await ctx.reply(`✅ Produto ${id} aprovado com sucesso!`);
        } catch (error) {
            logger.error('Erro approveProduct:', error);
            await ctx.reply('Erro ao aprovar produto.');
        }
    }

    /**
     * Rejeitar produto
     */
    async rejectProduct(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID do produto necessário.');

        try {
            await Product.update(id, { status: 'rejected' });
            await ctx.reply(`🚫 Produto ${id} rejeitado.`);
        } catch (error) {
            logger.error('Erro rejectProduct:', error);
            await ctx.reply('Erro ao rejeitar produto.');
        }
    }

    /**
     * Listar Cupons
     */
    async listCoupons(ctx, params) {
        try {
            const page = params.page || 1;
            const res = await Coupon.findActive({ page, limit: 5 });

            if (!res.coupons || res.coupons.length === 0) {
                return ctx.reply('🎫 Nenhum cupom ativo encontrado.');
            }

            let msg = `🎫 *Cupons Ativos* (Pág ${page}):\n\n`;
            res.coupons.forEach(c => {
                const val = c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${c.discount_value}`;
                msg += `🏷️ *${c.code}* - ${val}\nID: \`${c.id}\`\nExpira: ${c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'Nunca'}\nUses: ${c.current_uses}\n\n`;
            });

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro listCoupons:', error);
            await ctx.reply('Erro ao listar cupons.');
        }
    }

    /**
     * Deletar Cupom
     */
    async deleteCoupon(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID do cupom necessário.');

        try {
            await Coupon.delete(id);
            await ctx.reply(`🗑️ Cupom ${id} removido.`);
        } catch (error) {
            logger.error('Erro deleteCoupon:', error);
            await ctx.reply('Erro ao deletar cupom.');
        }
    }

    /**
     * Configurar horário de limpeza
     */
    async setCleanupSchedule(ctx, params) {
        let hour = params.hour;
        if (hour === undefined) return ctx.reply('⚠️ Informe a hora (0-23).');
        hour = parseInt(hour);

        if (isNaN(hour) || hour < 0 || hour > 23) {
            return ctx.reply('❌ Hora inválida. Use um número entre 0 e 23.');
        }

        try {
            await AppSettings.updateCleanupSchedule(hour);
            await ctx.reply(`⏰ Horário de auto-limpeza definido para *${hour}h*.`, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro setCleanupSchedule:', error);
            await ctx.reply('Erro ao configurar horário.');
        }
    }

    /**
     * Alternar Publicação Automática
     */
    async toggleAutoPublish(ctx, params) {
        const enabled = params.enabled;
        if (enabled === undefined) return ctx.reply('⚠️ Informe true ou false.');

        try {
            await AppSettings.update({ ai_enable_auto_publish: enabled });
            await ctx.reply(`🤖 Publicação automática via IA: *${enabled ? 'ATIVADA' : 'DESATIVADA'}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro toggleAutoPublish:', error);
            await ctx.reply('Erro ao atualizar configuração.');
        }
    }

    /**
     * Obter Estatísticas do Dashboard
     */
    async getDashboardStats(ctx) {
        try {
            const stats = await Product.getStats();

            let msg = '📊 *Estatísticas do Sistema*\n\n';
            msg += `📦 *Total de Produtos*: ${stats.total}\n`;
            msg += `🏷️ *Com Desconto*: ${stats.withDiscount}\n`;
            msg += `📉 *Média de Desconto*: ${stats.averageDiscount}%\n\n`;

            if (stats.byStatus) {
                msg += '*Por Status:*\n';
                for (const [status, count] of Object.entries(stats.byStatus)) {
                    msg += `- ${status}: ${count}\n`;
                }
                msg += '\n';
            }

            if (stats.byPlatform) {
                msg += '*Por Plataforma:*\n';
                for (const [plat, count] of Object.entries(stats.byPlatform)) {
                    msg += `- ${plat}: ${count}\n`;
                }
            }

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro getDashboardStats:', error);
            await ctx.reply('Erro ao buscar estatísticas.');
        }
    }

    /**
     * Relatório de Performance (Cliques/Conversões)
     */
    async getPerformanceReport(ctx, params) {
        try {
            const days = params.days || 30;
            const stats = await ClickTracking.getStats(days);

            let msg = `📈 *Relatório de Performance (${days} dias)*\n\n`;
            msg += `🖱️ *Cliques Totais*: ${stats.total_clicks}\n`;
            msg += `🤝 *Conversões*: ${stats.total_conversions}\n`;
            msg += `📊 *Taxa de Conversão*: ${stats.conversion_rate}%\n`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro getPerformanceReport:', error);
            await ctx.reply('Erro ao gerar relatório de performance.');
        }
    }

    /**
     * Top Produtos
     */
    async getTopProducts(ctx, params) {
        try {
            const limit = params.limit || 5;
            const days = params.days || 30;
            const top = await ClickTracking.getMostClicked(limit, days);

            if (!top || top.length === 0) return ctx.reply('📉 Sem dados de cliques recentes.');

            let msg = `🔥 *Top ${limit} Produtos (últimos ${days} dias)*:\n\n`;

            // Buscar detalhes dos produtos
            for (const item of top) {
                if (item.product_id) {
                    const product = await Product.findById(item.product_id);
                    const name = product ? product.name.substring(0, 30) : 'Produto Removido';
                    msg += `📦 *${name}* ...\n`;
                    msg += `   Cliques: ${item.click_count}\n`;
                    msg += `   ID: \`${item.product_id}\`\n\n`;
                }
            }

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro getTopProducts:', error);
            await ctx.reply('Erro ao buscar top produtos.');
        }
    }

    /**
     * Listar Canais do Telegram
     */
    async listChannels(ctx, params) {
        try {
            const activeOnly = params.active_only;
            const channels = await TelegramChannel.findAll({ is_active: activeOnly });

            if (!channels || channels.length === 0) return ctx.reply('📭 Nenhum canal encontrado.');

            let msg = '📢 *Canais Conectados:*\n\n';
            channels.forEach(ch => {
                const status = ch.is_active ? '✅ Ativo' : '⏸️ Pausado';
                msg += `📺 *${ch.name}* (${status})\n`;
                msg += `   ID: \`${ch.id}\`\n`;
                msg += `   Username: @${ch.username || 'N/A'}\n\n`;
            });

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro listChannels:', error);
            await ctx.reply('Erro ao listar canais.');
        }
    }

    /**
     * Ativar/Desativar Canal
     */
    async toggleChannel(ctx, params) {
        const id = params.id;
        const active = params.active;

        if (!id) return ctx.reply('⚠️ ID do canal necessário.');
        if (active === undefined) return ctx.reply('⚠️ Defina se deve ativar (true) ou desativar (false).');

        try {
            await TelegramChannel.update(id, { is_active: active });
            const status = active ? 'ATIVADO' : 'PAUSADO';
            await ctx.reply(`📢 Canal ${id} *${status}* com sucesso.`, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro toggleChannel:', error);
            await ctx.reply('Erro ao alterar status do canal.');
        }
    }

    /**
     * Enviar mensagem para canal (Broadcast)
     */
    async postToChannel(ctx, params) {
        const { channel_id, message } = params;
        if (!channel_id || !message) return ctx.reply('⚠️ ID do canal e mensagem necessários.');

        try {
            const channel = await TelegramChannel.findById(channel_id);
            if (!channel) return ctx.reply('❌ Canal não encontrado.');

            // Use bot telegram instance (ctx.api or ctx.telegram)
            const telegramInfo = ctx.api || ctx.telegram;
            await telegramInfo.sendMessage(channel.chat_id, message, { parse_mode: 'Markdown' });
            await ctx.reply(`✅ Mensagem enviada para *${channel.name}*!`);
        } catch (error) {
            logger.error('Erro postToChannel:', error);
            await ctx.reply(`❌ Erro ao enviar: ${error.message}`);
        }
    }

    /**
     * Ler logs recentes
     */
    async getRecentLogs(ctx, params) {
        try {
            const type = params.type || 'error'; // 'error' ou 'app'
            const linesToRead = params.lines || 15;

            const logFileName = type === 'app' ? 'app.log' : 'error.log';
            // Caminho relativo: src/services/adminBot/services -> ../../../../logs
            const logPath = path.join(__dirname, '../../../../logs', logFileName);

            try {
                const content = await fs.readFile(logPath, 'utf8');
                const lines = content.trim().split('\n');
                const lastLines = lines.slice(-linesToRead).join('\n');

                if (!lastLines) return ctx.reply(`📂 Arquivo de log ${logFileName} está vazio.`);

                // Enviar em blocos se for muito grande
                if (lastLines.length > 4000) {
                    const chunk = lastLines.substring(lastLines.length - 4000);
                    await ctx.reply(`📝 *Logs Recentes (${type})*:\n\`\`\`\n${chunk}\n\`\`\``, { parse_mode: 'Markdown' });
                } else {
                    await ctx.reply(`📝 *Logs Recentes (${type})*:\n\`\`\`\n${lastLines}\n\`\`\``, { parse_mode: 'Markdown' });
                }

            } catch (err) {
                if (err.code === 'ENOENT') {
                    await ctx.reply(`❌ Arquivo de log não encontrado: ${logFileName}`);
                } else {
                    throw err;
                }
            }
        } catch (error) {
            logger.error('Erro getRecentLogs:', error);
            await ctx.reply('Erro ao ler logs.');
        }
    }

    /**
     * Verificar saúde do sistema
     */
    async checkSystemHealth(ctx) {
        try {
            const mem = process.memoryUsage();
            const uptime = process.uptime();

            // Converter bytes para MB
            const rss = (mem.rss / 1024 / 1024).toFixed(2);
            const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);
            const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);

            // Formatar uptime
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            let msg = '🏥 *Saúde do Sistema*\n\n';
            msg += `🧠 *Memória RSS*: ${rss} MB\n`;
            msg += `🧠 *Heap Usado*: ${heapUsed} / ${heapTotal} MB\n`;
            msg += `⏱️ *Uptime*: ${hours}h ${minutes}m ${seconds}s\n`;
            msg += `💻 *PID*: ${process.pid}\n`;
            msg += `⚙️ *Node*: ${process.version}\n`;
            msg += `🖥️ *Plataforma*: ${process.platform} (${process.arch})`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro checkSystemHealth:', error);
            await ctx.reply('Erro ao verificar saúde do sistema.');
        }
    }

    /**
     * Bloquear usuário
     */
    async blockUser(ctx, params) {
        const { id, reason } = params;
        if (!id) return ctx.reply('⚠️ ID do usuário necessário.');

        try {
            const user = await User.findById(id);
            if (!user) return ctx.reply('❌ Usuário não encontrado.');

            await User.update(id, { role: 'banned' });
            await ctx.reply(`🚫 Usuário *${user.name}* foi banido.\nMotivo: ${reason || 'Não especificado'}.`, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro blockUser:', error);
            await ctx.reply('Erro ao banir usuário.');
        }
    }

    /**
     * Limpeza do Sistema
     */
    async cleanupSystem(ctx, params) {
        const { action, target } = params;

        try {
            if (action === 'scan') {
                // Simples contagem (estimativa)
                let msg = '🧹 *Análise de Limpeza:*\n\n';

                if (target === 'rejected_products' || target === 'all') {
                    const rej = await Product.findAll({ status: 'rejected', limit: 100 });
                    msg += `🗑️ Produtos Rejeitados: ${rej.products.length} encontrados (apenas recentes verificados)\n`;
                }

                // (Adicionar contagem de cupons vencidos se houver método)

                msg += '\nUse `action: "execute"` para limpar de verdade.';
                return ctx.reply(msg, { parse_mode: 'Markdown' });
            }

            if (action === 'execute') {
                let deletedCount = 0;

                if (target === 'rejected_products' || target === 'all') {
                    // Buscar e deletar
                    const rej = await Product.findAll({ status: 'rejected', limit: 50 });
                    for (const p of rej.products) {
                        // Hard delete ou soft delete? Product.delete soft-deletes.
                        await Product.delete(p.id);
                        deletedCount++;
                    }
                }

                return ctx.reply(`🧹 Limpeza concluída! ${deletedCount} itens removidos.`);
            }

        } catch (error) {
            logger.error('Erro cleanupSystem:', error);
            ctx.reply('Erro ao executar limpeza.');
        }
    }

    /**
     * Backup de Dados
     */
    async backupData(ctx, params) {
        const { type } = params;
        await ctx.reply('⏳ Gerando backup... aguarde.');

        try {
            let data = {};
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${type || 'full'}_${timestamp}.json`;
            const filepath = path.join(os.tmpdir(), filename); // Requires os import or hardcoded tmp

            // Como não importamos os, usamos __dirname/temp ou similar
            // Melhor: usar /tmp do sistema se linux, ou process.env.TEMP
            const tempDir = process.env.TEMP || '/tmp';
            const safePath = path.join(tempDir, filename);

            if (type === 'products' || type === 'full') {
                const res = await Product.findAll({ limit: 1000 }); // Limite seguro
                data.products = res.products;
            }

            if (type === 'users' || type === 'full') {
                const res = await User.findAll(1, 1000);
                data.users = res.users;
            }

            await fs.writeFile(safePath, JSON.stringify(data, null, 2));

            await ctx.replyWithDocument({ source: safePath, filename: filename });

            // Limpar arquivo depois de enviar (opcional, mas bom pra não encher disco)
            // setTimeout(() => fs.unlink(safePath), 10000); 

        } catch (error) {
            logger.error('Erro backupData:', error);
            ctx.reply('Erro ao gerar backup.');
        }
    }

    /**
     * Mostrar status do servidor/settings
     */
    async showServerStatus(ctx) {
        try {
            const settings = await AppSettings.get();
            const cleanup = await AppSettings.getCleanupSchedule();

            let msg = '*⚙️ Status do Sistema*\n\n';
            msg += `🕒 Hora atual: ${new Date().toLocaleTimeString()}\n`;
            msg += `🧹 Auto-limpeza: ${cleanup.hour}h (Última: ${cleanup.lastRun ? new Date(cleanup.lastRun).toLocaleString() : 'N/A'})\n`;
            msg += `🛍️ Amazon: ${settings.amazon_marketplace || 'Desc.'}\n`;

            // AI Info
            const aiConfig = await AppSettings.getOpenRouterConfig();
            msg += `🤖 IA Model: \`${aiConfig.model}\`\n`;
            msg += `✨ IA Ativa: ${aiConfig.enabled ? 'Sim' : 'Não'}\n`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro ao buscar status', error);
            await ctx.reply('Erro ao buscar informações do sistema.');
        }
    }

    /**
     * Publicar produto com validação rigorosa (Core Correction 2)
     */
    async instantPublishProduct(ctx, params) {
        const id = params.id;
        const providedAffiliateLink = params.affiliate_link; // Pode vir do comando da IA

        if (!id) return ctx.reply('⚠️ ID do produto obrigatório.');

        try {
            const product = await Product.findById(id);
            if (!product) return ctx.reply('❌ Produto não encontrado.');

            // --- VALIDAÇÃO DE LINK DE AFILIADO (Correction 2) ---
            let affiliateLinkToUse = providedAffiliateLink || product.affiliate_link;

            // Se não tiver link de afiliado, ou se for igual ao original (e não for short link confiável)
            // Lógica simples: Se affiliate_link for nulo, vazio, ou igual ao original_link, pedimos confirmação
            // BLOQUEIO TOTAL: Não permite publicar se for suspeito, mesmo com confirm=true, a menos que venha um novo link.
            // CORREÇÃO: Permitir separams.confirm for true (vinda de um "confirmar assim mesmo")
            const isSuspicious = !affiliateLinkToUse || affiliateLinkToUse === product.original_link || affiliateLinkToUse.trim() === '';

            if (isSuspicious && !params.confirm) {
                // Atualizar contexto para permitir resposta direta
                ctx.session.ai_context = {
                    last_action: 'publish_attempt',
                    product_id: product.id,
                    missing_field: 'affiliate_link',
                    original_link: product.original_link
                };

                let msg = `⚠️ *Validação Necessária*\n\n`;
                msg += `O produto *${product.name}* parece não ter um link de afiliado válido configurado.\n\n`;
                msg += `🔗 *Link Original:* ${product.original_link}\n`;
                msg += `🔗 *Link Atual:* ${affiliateLinkToUse || '(Vazio)'}\n\n`;
                msg += `🤖 Por favor, envie o **Link de Afiliado** correto para prosseguir.\n`;
                msg += `_Ou diga "confirmar assim mesmo" se tiver certeza._`;

                return ctx.reply(msg, { parse_mode: 'Markdown' });
            }

            // Se o usuário enviou um link de afiliado novo no comando, atualizamos
            if (providedAffiliateLink && providedAffiliateLink !== product.affiliate_link) {
                await Product.update(id, { affiliate_link: providedAffiliateLink });
                affiliateLinkToUse = providedAffiliateLink;
                // REFRESH: Atualizar o objeto product em memória para que o publishAll use o link certo
                const updatedProduct = await Product.findById(id);
                Object.assign(product, updatedProduct);
            }

            // --- VALIDAÇÃO DE PREÇO (Correction 2) ---
            if (product.current_price <= 0 && !params.confirm) {
                ctx.session.ai_context = {
                    last_action: 'publish_attempt',
                    product_id: product.id,
                    issue: 'zero_price'
                };
                return ctx.reply('⚠️ O preço do produto está zerado. Qual o valor correto?');
            }

            // Prosseguir com publicação
            // REMOVIDO: Travamento de categoria manual. publishAll cuidará da detecção via IA.
            // if (!product.category_id && !params.skip_category) { ... }

            // --- VERIFICAÇÃO DE CUPONS (Novo Requisito) ---
            if (!product.coupon_id && !params.skip_coupon_check) {
                const coupons = await this.checkPlatformCoupons(product.platform);
                if (coupons && coupons.length > 0) {
                    // Store coupons in context to use index in callback_data (save bytes)
                    ctx.session.ai_context.available_coupons = coupons.map(c => ({ id: c.id, code: c.code, value: c.discount_value, type: c.discount_type }));

                    let msg = `🎟️ *Cupom Sugerido*\n\n`;
                    msg += `Encontrei ${coupons.length} cupom(ns) ativo(s) para *${product.platform.toUpperCase()}*.\n`;
                    msg += `Deseja vincular algum antes de publicar *${product.name}*?\n`;

                    const buttons = coupons.map((c, index) => ([{
                        text: `🎫 Usar ${c.code} (${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' OFF'})`,
                        callback_data: `vc:${product.id}:${index}:p`
                    }]));

                    buttons.push([{ text: '🚀 Publicar sem cupom', callback_data: `vc:${product.id}:n:p` }]);

                    return ctx.reply(msg, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: buttons }
                    });
                }
            }

            await ctx.reply('🚀 Validado! Publicando em todos os canais...');

            // Publicar
            const result = await publishService.publishAll(product, {
                manual: true,
                skipAiCategory: false // Permitir que a IA detecte se estiver faltando
            });

            if (result.success) {
                await Product.update(id, { status: 'published', stock_available: true, is_active: true });
                await ctx.reply(`✅ *${product.name}* publicado com sucesso!`, { parse_mode: 'Markdown' });

                // Limpar contexto relevante
                ctx.session.ai_context = {};
            } else {
                await ctx.reply(`⚠️ Falha na publicação: ${result.reason}`);
            }
        } catch (error) {
            logger.error('Erro instantPublish:', error);
            await ctx.reply('❌ Erro ao publicar produto.');
        }
    }

    /**
     * Marcar Cupom como Esgotado
     */
    async markCouponExpired(ctx, params) {
        const { code } = params;
        if (!code) return ctx.reply('⚠️ Código do cupom necessário.');

        try {
            const coupon = await Coupon.findByCode(code.toUpperCase());
            if (!coupon) return ctx.reply(`❌ Cupom *${code}* não encontrado.`, { parse_mode: 'Markdown' });

            // Atualizar no banco
            await Coupon.update(coupon.id, { is_out_of_stock: true, is_active: false });

            // Notificar Canais
            await ctx.reply(`⏳ Notificando canais sobre o esgotamento do cupom *${code}*...`, { parse_mode: 'Markdown' });

            const results = await notificationDispatcher.notifyCouponExpired(coupon);

            let resultMsg = `✅ Cupom *${code}* marcado como esgotado e removido das listas.\n`;
            if (results && results.sent > 0) {
                resultMsg += `📢 Notificação enviada para ${results.sent} canal(is).`;
            } else {
                resultMsg += `ℹ️ Nenhuma notificação enviada (canais desativados ou filtros aplicados).`;
            }

            await ctx.reply(resultMsg, { parse_mode: 'Markdown' });

        } catch (error) {
            logger.error('Erro markCouponExpired:', error);
            await ctx.reply('❌ Erro ao processar esgotamento de cupom.');
        }
    }


    /**
     * Gerenciar Categorias
     */
    async manageCategories(ctx, params) {
        const { action, name, id, confirm } = params;

        try {
            if (action === 'create') {
                if (!name) return ctx.reply('⚠️ Nome da categoria necessário.');

                // Validação de existência
                const slug = name.toLowerCase().replace(/ /g, '-');
                const exists = await Category.findBySlug(slug);
                if (exists) return ctx.reply(`⚠️ Categoria *${exists.name}* já existe.`, { parse_mode: 'Markdown' });

                const cat = await Category.create({ name });
                return ctx.reply(`✅ Categoria *${cat.name}* criada!`, { parse_mode: 'Markdown' });
            }

            if (action === 'delete') {
                if (!id) return ctx.reply('⚠️ ID da categoria necessário.');

                if (!confirm) {
                    const cat = await Category.findById(id);
                    ctx.session.ai_context = { last_action: 'delete_category_confirm', category_id: id, category_name: cat.name };
                    return ctx.reply(`⚠️ Tem certeza que deseja apagar a categoria *${cat.name}*?`, { parse_mode: 'Markdown' });
                }

                await Category.delete(id);
                return ctx.reply('🗑️ Categoria apagada com sucesso.');
            }

            // List
            const cats = await Category.findAll(true);
            let msg = '📂 *Categorias Ativas:*\n\n';
            cats.forEach(c => msg += `- ${c.name} (ID: \`${c.id}\`)\n`);
            ctx.reply(msg, { parse_mode: 'Markdown' });

        } catch (error) {
            logger.error('Erro manageCategories:', error);
            ctx.reply('Erro ao gerenciar categorias.');
        }
    }

    /**
     * Gerenciar Usuários
     */
    async manageUsers(ctx, params) {
        const { action, id, active } = params;

        try {
            if (action === 'toggle_status') {
                // Implementar lógica de ativação/desativação se modelo User suportar
                // Como o User.js não tem método direto 'toggle', simularemos via update
                // (assumindo que existisse campo is_active, se não existir, avisamos)
                return ctx.reply('⚠️ Gestão de status de usuário ainda não implementada no modelo.');
            }

            // List
            const { users } = await User.findAll(1, 10);
            let msg = '👥 *Usuários Recentes:*\n\n';
            users.forEach(u => msg += `- ${u.name} (${u.email}) - ${u.role}\n`);
            ctx.reply(msg);

        } catch (error) {
            logger.error('Erro manageUsers:', error);
            ctx.reply('Erro ao gerenciar usuários.');
        }
    }

    /**
     * Gerenciar Configurações do Bot
     */
    async manageBotSettings(ctx, params) {
        const { action, feature, enabled } = params;

        try {
            if (action === 'status') {
                // Mostra status detalhado além do showServerStatus
                const config = await AppSettings.getAIConfig();
                let msg = '🤖 *Configurações da IA:*\n\n';
                msg += `Publicação Auto: ${config.enable_auto_publish ? '✅' : '❌'}\n`;
                msg += `Edição Produtos: ${config.enable_product_editing ? '✅' : '❌'}\n`;
                msg += `Score Qualidade: ${config.enable_quality_scoring ? '✅' : '❌'}\n`;
                return ctx.reply(msg, { parse_mode: 'Markdown' });
            }

            if (action === 'toggle_feature') {
                // Mapear features para colunas do banco
                const featureMap = {
                    'auto_publish': 'ai_enable_auto_publish',
                    'product_editing': 'ai_enable_product_editing',
                    'duplicate_detection': 'ai_enable_duplicate_detection'
                };

                const dbField = featureMap[feature];
                if (!dbField) return ctx.reply('⚠️ Feature desconhecida.');

                await AppSettings.update({ [dbField]: enabled });
                return ctx.reply(`✅ Feature *${feature}* alterada para ${enabled}.`, { parse_mode: 'Markdown' });
            }

        } catch (error) {
            logger.error('Erro manageBotSettings:', error);
            ctx.reply('Erro ao configurar bot.');
        }
    }

    /**
     * Deletar Produto
     */
    async deleteProduct(ctx, params) {
        const { id, confirm } = params;
        if (!id) return ctx.reply('⚠️ ID necessário.');

        if (!confirm) {
            ctx.session.ai_context = { last_action: 'delete_product_confirm', product_id: id };
            return ctx.reply(`🗑️ Confirma a exclusão do produto ${id}?`);
        }

        await Product.delete(id);
        ctx.reply('🗑️ Produto removido.');
    }

    /**
     * Definir Estoque
     */
    async setStockStatus(ctx, params) {
        const { id, available } = params;
        if (!id) return ctx.reply('⚠️ ID necessário.');

        try {
            if (available) {
                await Product.markInStock(id);
                ctx.reply(`✅ Produto ${id} marcado como **Em Estoque**.`);
            } else {
                await Product.markOutOfStock(id);
                ctx.reply(`🚫 Produto ${id} marcado como **Esgotado**.`);
            }
        } catch (error) {
            logger.error('Erro setStockStatus:', error);
            ctx.reply('Erro ao atualizar estoque.');
        }
    }

    /**
     * Histórico de Preços
     */
    async getProductHistory(ctx, params) {
        const { id } = params;
        if (!id) return ctx.reply('⚠️ ID necessário.');

        try {
            const history = await Product.getPriceHistory(id);
            if (!history || history.length === 0) return ctx.reply('📉 Sem histórico de preços para este produto.');

            let msg = `📈 *Histórico de Preços (${history.length} registros)*:\n\n`;
            history.slice(-10).forEach(h => { // Últimos 10
                msg += `📅 ${new Date(h.recorded_at).toLocaleDateString()}: R$${h.price}\n`;
            });

            ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro getProductHistory:', error);
            ctx.reply('Erro ao buscar histórico.');
        }
    }

    /**
     * Re-scanear Link (Refresh Metadata)
     */
    async refreshMetadata(ctx, params) {
        const { id } = params;
        if (!id) return ctx.reply('⚠️ ID necessário.');

        await ctx.reply('🔄 Reanalisando link original... aguarde.');

        try {
            const product = await Product.findById(id);
            if (!product) return ctx.reply('❌ Produto não encontrado.');

            if (!product.original_link) return ctx.reply('❌ Este produto não tem link original.');

            const newData = await LinkAnalyzer.analyzeLink(product.original_link);
            if (!newData) return ctx.reply('⚠️ Falha ao analisar o link novamente.');

            const updates = {};
            let changes = [];

            if (newData.currentPrice && newData.currentPrice !== product.current_price) {
                updates.current_price = newData.currentPrice;
                changes.push(`Preço: R$${product.current_price} -> R$${newData.currentPrice}`);
            }

            if (newData.name && newData.name !== product.name) {
                updates.name = newData.name; // Opcional, as vezes não queremos mudar titulo editado
            }

            // Se detectou estoque novo? LinkAnalyzer retorna? Vamos assumir que se conseguiu ler preço, tá ok.

            if (Object.keys(updates).length > 0) {
                await Product.update(id, updates);
                let msg = `✅ *Produto Atualizado!*\n\n`;
                changes.forEach(c => msg += `- ${c}\n`);
                ctx.reply(msg, { parse_mode: 'Markdown' });
            } else {
                ctx.reply('✅ Dados já estão atualizados. Nenhuma mudança detectada.');
            }

        } catch (error) {
            logger.error('Erro refreshMetadata:', error);
            ctx.reply(`❌ Erro ao atualizar: ${error.message}`);
        }
    }

    async extractCouponFromText(ctx, text) {
        // Como o modelo já recebe o texto no processMessage, aqui poderíamos apenas confirmar
        // Mas para garantir a extração estruturada se o primeiro passo não o fez:
        try {
            // Se a IA chamou essa função, ela provavelmente já identificou que é um cupom mas quer que a gente "formalize"
            // Na verdade, o ideal é a IA já retornar 'create_coupon' com os parametros extraidos.
            // Mas se ela retornar 'extract_coupon', usamos um "mini-prompt" de extração puro.

            const prompt = `
            Extraia dados deste texto de oferta/cupom para JSON: "${text}"
            Campos: code (string), discount_value (number), discount_type (percentage/fixed), platform (string), valid_until (YYYY-MM-DD).
            Se houver vários, retorne um ARRAY JSON: [ {...}, {...} ].
            Se não achar algo, retorne null.
            IMPORTANTE: Responda APENAS com o JSON cru. Não use blocos de código markdown (sem \`\`\`). Não adicione texto antes ou depois.
            `;

            const config = await AppSettings.getOpenRouterConfig();
            const response = await openrouterClient.enqueueRequest(prompt, { model: config.model });

            // Detectar Array ou Objeto Único
            let coupons = [];
            if (Array.isArray(response)) {
                coupons = response;
            } else if (response && response.code) {
                coupons = [response];
            }

            if (coupons.length > 0) {
                let msg = `🎟️ *${coupons.length} Cupom(ns) Detectado(s):*\n\n`;

                coupons.forEach((c, idx) => {
                    const plat = c.platform || 'Geral';
                    msg += `${idx + 1}. \`${c.code}\` (${c.discount_value}${c.discount_type}) - ${plat}\n`;
                });

                msg += `\nDeseja criar estes cupons?`;

                // Verificar se temos imagem no contexto
                let detectedImage = null;
                if (ctx.session.ai_context && ctx.session.ai_context.last_image_url) {
                    detectedImage = ctx.session.ai_context.last_image_url;
                    msg += `\n📸 *Imagem detectada! Será usada para todos.*`;
                }

                // Injetar imagem em todos
                const finalCoupons = coupons.map(c => ({
                    ...c,
                    image_url: detectedImage
                }));

                ctx.session.ai_context = {
                    last_action: 'coupon_detected',
                    suggested_coupons: finalCoupons // Array
                };

                await ctx.reply(msg, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply('Não consegui identificar códigos de cupom claros.');
            }

        } catch (error) {
            logger.error('Erro extractCoupon:', error);
            await ctx.reply('Erro ao analisar cupom.');
        }
    }

    /**
     * Criar Cupom Autônomo
     */
    async createCouponAutonomous(ctx, params) {
        // Se vier do contexto (confirmação rápida)
        let dataList = [];
        const context = ctx.session.ai_context || {};

        if (context.last_action === 'coupon_detected') {
            if (context.suggested_coupons) {
                dataList = context.suggested_coupons;
            } else if (context.suggested_coupon) {
                dataList = [context.suggested_coupon];
            }
        }

        // Se parametros vierem diretos (comando explícito)
        if (dataList.length === 0 && params.code) {
            dataList = [params];
        }

        if (dataList.length === 0) {
            return ctx.reply('⚠️ Nenhum cupom para criar.');
        }

        try {
            let createdCount = 0;

            for (const data of dataList) {
                const couponData = {
                    code: data.code.toUpperCase(),
                    discount_value: data.discount_value || 0,
                    discount_type: (data.discount_type === 'percentage' || data.discount_type === '%') ? 'percentage' : 'fixed',
                    platform: data.platform || 'general',
                    is_active: true,
                    capture_source: 'ai_autonomous',
                    valid_from: new Date().toISOString(),
                    is_general: true,
                    valid_until: data.valid_until || null,
                    category_id: data.category_id || (data.platform === 'general' ? null : null) // TODO: Mapear categoria padrão por plataforma se necessário
                };

                // Tentar inferir categoria baseada na plataforma se não vier da IA
                // Ex: Gamer -> categoria X. Por enquanto deixa null ou o que vier.
                if (!couponData.category_id && couponData.platform) {
                    // Lógica opcional para setar categoria padrão
                }

                // Verificar duplicata rapidinho? create lança erro se unique constraint falhar?
                // Coupon.create já lida com try/catch? Não, aqui estamos no try.

                const saved = await Coupon.create(couponData);
                createdCount++;

                // Dispatch notification event directly
                const notificationData = {
                    ...saved,
                    image_url: data.image_url || null,
                    category_id: couponData.category_id // Injetar categoria para roteamento correto (mesmo que não salve no banco)
                };

                logger.info(`🔍 [DEBUG] Pre-Dispatch Check: CategoryID=${notificationData.category_id}, Platform=${notificationData.platform}`);

                await notificationDispatcher.dispatch('coupon_new', notificationData, { manual: true });
            }

            await ctx.reply(`✅ ${createdCount} cupom(ns) criado(s) e notificado(s)!`);

        } catch (error) {
            logger.error('Erro createCouponAutonomous:', error);
            await ctx.reply(`❌ Erro ao criar cupons: ${error.message}`);
        }
    }



    /**
     * Republicar Produto
     */
    async republishProduct(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID necessário.');

        try {
            if (!params.confirm) {
                const p = await Product.findById(id);
                ctx.session.ai_context = { last_action: 'republish_confirm', product_id: id };
                return ctx.reply(`Deseja mesmo republicar *${p.name}*? (Responda 'sim' para confirmar)`);
            }

            const product = await Product.findById(id);
            // Publicar
            const result = await publishService.publishAll(product, {
                manual: true,
                republish: true
            });

            if (result.success) {
                await ctx.reply(`✅ *${product.name}* republicado com sucesso!`);
            } else {
                await ctx.reply(`⚠️ Falha na republicação: ${result.reason}`);
            }

        } catch (e) {
            logger.error('Erro republish:', e);
            ctx.reply('Erro ao republicar.');
        }
    }

    /**
     * Gerenciar Agendamentos
     */
    async manageSchedules(ctx, params) {
        const { action, product_id, date, id } = params;

        try {
            if (action === 'create') {
                if (!product_id || !date) return ctx.reply('⚠️ ID produto e data necessários.');
                await ScheduledPost.create({
                    product_id,
                    scheduled_at: new Date(date).toISOString(),
                    status: 'pending'
                });
                return ctx.reply(`📅 Agendado para ${date}!`);
            }

            if (action === 'delete') {
                await ScheduledPost.delete(id);
                return ctx.reply('🗑️ Agendamento removido.');
            }

            // List
            const list = await ScheduledPost.findPending();
            if (!list.length) return ctx.reply('📅 Nenhum agendamento pendente.');

            let msg = '📅 *Agendamentos:*\n';
            list.forEach(i => msg += `- ${new Date(i.scheduled_at).toLocaleString()} (Prod: ${i.product_id})\n`);
            ctx.reply(msg);

        } catch (e) {
            logger.error('Erro manageSchedules:', e);
            ctx.reply('Erro ao gerenciar agendamentos.');
        }
    }

    // --- UTILS ---

    // As funções listPendingProductsDirect, listCoupons, updateProductDirect, showServerStatus
    // continuam úteis e podem ser mantidas, mas sem usar handlers externos se tiver lógica lá.
    // O listPendingProductsDirect já está implementado dentro desta classe (verificado anteriormente).

    /**
     * Gerenciar Auto-Sync
     */
    /**
     * Atualizar Produto (Nome, Preço, Link)
     */
    async updateProduct(ctx, params) {
        const { id, name, price, link } = params;
        if (!id) return ctx.reply('⚠️ ID do produto necessário.');

        try {
            const updates = {};
            if (name) updates.name = name;
            if (price) updates.current_price = parseFloat(price);
            if (link) {
                updates.affiliate_link = link;
                // Se atualizou link, assumimos que é válido
            }

            if (Object.keys(updates).length === 0) return ctx.reply('⚠️ Nada para atualizar.');

            await Product.update(id, updates);
            await ctx.reply(`✅ Produto ${id} atualizado com sucesso!`);
        } catch (error) {
            logger.error('Erro updateProduct:', error);
            ctx.reply('Erro ao atualizar produto.');
        }
    }

    /**
     * Gerenciar Canais
     */
    async manageChannels(ctx, params) {
        const { action, id, active } = params;
        if (action === 'list') {
            return this.listChannels(ctx, {});
        }
        if (action === 'toggle') {
            return this.toggleChannel(ctx, { id, active });
        }
    }

    // ... MANTER MÉTODOS AUXILIARES EXISTENTES ...

    // SUBSTITUIÇÃO: createCouponDirect (ANTIGO com fallback) -> REMOVIDO/SUBSTITUIDO POR createCouponAutonomous
    // listPendingProductsDirect -> MANTER (já é autônomo)

    // -- REIMPLEMENTAÇÃO DE listPendingProductsDirect E createCouponDirect SE NECESSÁRIO 
    // PARA GARANTIR QUE NÃO CHAMEM HANDLERS --

    async listPendingProductsDirect(ctx, page = 1) {
        try {
            const limit = 5;
            const { products, total } = await Product.findPending({ limit, page });

            if (!products || products.length === 0) return ctx.reply('✅ Nenhum produto pendente.');

            // Atualizar contexto para permitir referências ("aprovar o primeiro", "esse")
            ctx.session.ai_context = {
                last_action: 'list_pending',
                listed_products: products.map(p => ({ id: p.id, name: p.name })),
                product_id: products[0].id // Default suggestion
            };

            let msg = `📋 *Produtos Pendentes* (${total}):\n\n`;
            products.forEach((p, index) => {
                const price = p.current_price ? `R$${p.current_price}` : 'N/A';
                msg += `${index + 1}. 📦 *${p.name.substring(0, 50)}...*\n`;
                msg += `   🔗 [Link Original](${p.original_link})\n`;
                msg += `   ID: \`${p.id}\` | ${price}\n\n`;
            });
            msg += `_Dica: Diga "aprovar 1", "aprovar o da Nivea" ou "Publicar ID"._`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro listPending:', error);
            await ctx.reply('Erro ao listar pendentes.');
        }
    }

    /**
     * Verificar cupons ativos para uma plataforma
     */
    async checkPlatformCoupons(platform) {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('platform', Coupon.normalizePlatform(platform))
                .eq('is_active', true)
                .eq('is_pending_approval', false)
                .eq('is_general', true)
                .lte('valid_from', now)
                .or(`valid_until.is.null,valid_until.gte.${now}`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Erro checkPlatformCoupons:', error);
            return [];
        }
    }

    /**
     * Agendar via IA (Callback ou Ação)
     */
    async handleScheduleAI(ctx, params) {
        // Params pode vir de JSON (AI) ou ser o próprio productId (se chamado via callback wrapper)
        // Mas a chamada do index.js provavelmente passará o ID extraido do callback

        let productId;
        if (typeof params === 'object' && params.id) {
            productId = params.id;
        } else if (typeof params === 'object' && params.product_id) {
            productId = params.product_id;
        } else if (typeof params === 'string') {
            productId = params;
        }

        if (!productId) {
            if (ctx.reply) await ctx.reply('⚠️ ID do produto não identificado.');
            return;
        }

        try {
            const product = await Product.findById(productId);
            if (!product) {
                if (ctx.answerCallbackQuery) await ctx.answerCallbackQuery('Produto não encontrado.');
                return;
            }

            // VERIFICAÇÃO DE CATEGORIA (Enforce)
            if (!product.category_id) {
                // Se não tem categoria, pedir para selecionar
                const categories = await Category.findAll(true);
                const limitedCats = categories.slice(0, 15); // Top 15

                // Salvar ID do produto na sessão para persistência
                if (!ctx.session.tempData) ctx.session.tempData = {};
                ctx.session.tempData.schedule_product_id = product.id;

                const kb = new InlineKeyboard();
                limitedCats.forEach((c, index) => {
                    // Short callback: sch_cat:CATEGORY_ID (8 + 36 = 44 chars)
                    kb.text(c.name, `sch_cat:${c.id}`);
                    if ((index + 1) % 2 === 0) kb.row(); // 2 por linha
                });

                if (ctx.reply) await ctx.reply(`📂 *Categoria Necessária*\n\nPara a IA agendar no melhor horário, preciso saber a categoria do produto *${product.name}*.\n\nSelecione abaixo:`, { parse_mode: 'Markdown', reply_markup: kb });
                return;
            }

            if (ctx.answerCallbackQuery) await ctx.answerCallbackQuery('⏳ Solicitando agendamento à IA...');
            if (ctx.reply) await ctx.reply(`⏳ *IA analisando melhor horário para ${product.name}...*`, { parse_mode: 'Markdown' });

            // Chamar Scheduler Service
            await schedulerService.scheduleProduct(product);

            // Atualizar status para 'approved' para que o produto apareça no app
            try {
                await Product.update(product.id, { status: 'approved' });
                logger.info(`✅ [BotAI] Produto ${product.id} agendado e marcado como 'approved'`);
            } catch (updateError) {
                logger.warn(`⚠️ [BotAI] Não foi possível atualizar status do produto ${product.id}: ${updateError.message}`);
            }

            if (ctx.reply) await ctx.reply('✅ *Agendamento Solicitado com Sucesso!*\n\nO produto foi colocado na fila e a IA decidirá o momento ideal para publicar nas próximas horas (ou amanhã).', { parse_mode: 'Markdown' });

            // Tentar remover botões da mensagem original para evitar duplo clique
            if (ctx.callbackQuery && ctx.editMessageReplyMarkup) {
                try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (e) { }
            }

        } catch (error) {
            logger.error('Erro handleScheduleAI:', error);
            if (ctx.reply) await ctx.reply(`❌ Erro ao agendar: ${error.message}`);
        }
    }
    /**
     * Definir categoria e continuar agendamento
     */
    async handleScheduleCategory(ctx, data) {
        // data format: sch_cat:categoryId
        const parts = data.split(':');
        const categoryId = parts[1];

        // Recuperar ID do produto da sessão
        const productId = ctx.session?.tempData?.schedule_product_id;

        if (!productId) {
            if (ctx.answerCallbackQuery) await ctx.answerCallbackQuery('❌ Sessão expirada. Tente novamente.');
            return;
        }

        try {
            await Product.update(productId, { category_id: categoryId });
            if (ctx.answerCallbackQuery) await ctx.answerCallbackQuery('✅ Categoria salva!');

            // Remover menu de categorias
            try { await ctx.editMessageText('✅ Categoria definida. Retomando agendamento...'); } catch (e) { }

            // Chamar handleScheduleAI novamente (agora vai passar na verificação)
            return await this.handleScheduleAI(ctx, productId);

        } catch (error) {
            logger.error('Erro handleScheduleCategory:', error);
            if (ctx.reply) await ctx.reply('❌ Erro ao salvar categoria.');
        }
    }
}

export default new AiService();

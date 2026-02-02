import openrouterClient from '../../../ai/openrouterClient.js'; // AI Client
import logger from '../../../config/logger.js';
import Product from '../../../models/Product.js';
import Coupon from '../../../models/Coupon.js';
import AppSettings from '../../../models/AppSettings.js';
import ClickTracking from '../../../models/ClickTracking.js';
import TelegramChannel from '../../../models/TelegramChannel.js';
import ScheduledPost from '../../../models/ScheduledPost.js';
import { adminMainMenu } from '../menus/mainMenu.js';
import * as pendingHandler from '../handlers/pendingHandler.js';
import { captureLinkHandler } from '../handlers/captureHandler.js';
import * as couponHandler from '../handlers/couponHandler.js';
import notificationDispatcher from '../../bots/notificationDispatcher.js';
import publishService from '../../autoSync/publishService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AiService {
    constructor() {
        this.systemPrompt = `
Você é a IA ADVANCED, uma assistente administrativa do sistema PreçoCerto.
Sua função é gerenciar produtos, cupons e configurações do sistema através de comandos em linguagem natural.

REGRAS DE COMPORTAMENTO:
1. Você tem permissão de ADMINISTRADOR.
2. Autonomia: Se o usuário der um comando CLARO e ESPECÍFICO (ex: "Publicar produto 123", "Pausar canal XYZ"), execute a ação IMEDIATAMENTE. Não peça confirmação redundante se o comando for direto.
3. Seja direto e profissional.
4. Responda APENAS em JSON no formato especificado para que o sistema possa executar a ação. NÃO responda com texto livre a menos que seja solicitado.
5. Se não entender o comando ou for uma conversa casual, retorne uma ação do tipo "chat_response".

FERRAMENTAS DISPONÍVEIS:
- list_pending_products: Listar produtos pendentes de aprovação (param: page).
- search_products: Buscar produtos por nome (param: query).
- approve_product: Aprovar um produto (param: id).
- reject_product: Rejeitar um produto (param: id).
- publish_product: Publicar imediatamente um produto (param: id).
- capture_product: Capturar dados de um produto a partir de um link (param: url).
- update_product: Alterar dados de um produto (params: id, name, price, link).
- create_coupon: Criar cupom diretamente (params: code, discount_value, discount_type, platform).
- list_coupons: Listar cupons ativos (param: page).
- delete_coupon: Excluir um cupom (param: id).
- get_server_status: Ver status do servidor/configurações.
- set_cleanup_schedule: Configurar horário de limpeza automática (param: hour).
- toggle_auto_publish: Ativar/Desativar publicação automática (param: enabled).
- get_recent_logs: Ler logs recentes do sistema (param: type='error'|'app').
- get_dashboard_stats: Ver estatísticas gerais de produtos (total, média de descontos, etc).
- get_performance_report: Relatório de performance de cliques e conversões (param: days).
- get_top_products: Listar produtos mais clicados (param: days, limit).
- list_channels: Listar canais do Telegram (param: active_only).
- toggle_channel: Ativar/Desativar um canal do Telegram (param: id, active).
- chat_response: Responder ao usuário com texto (dúvidas, conversa, explicações).
- unknown_command: Quando não for possível determinar uma ação clara.


DICAS DE INTERPRETAÇÃO:
1. Typos: Se o usuário digitar "produtor", "promuto", "cria", assuma que ele quis dizer "produto" ou "criar". Corrija erros de digitação óbvios.
2. Incerteza: Se o usuário disser "lista de produtos", prefira 'list_pending_products' se não houver termo de busca, ou 'search_products' se houver.
3. Comandos parciais: "publicar" sem ID deve pedir o ID ou listar pendentes. Mas se for comando direto, tente inferir.
4. "cria produtor" -> 'capture_product' (se tiver link) ou instrução de como criar.
5. Execução Direta: Se o usuário disser "publicar produto X", use 'publish_product' com o ID (ou nome). Se for encontrado mais de um, o sistema avisará.
6. Cupons: "Criar cupom TESTE 10%" -> extraia code='TESTE', discount_value=10, discount_type='percentage'.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "action": "nome_da_acao",
  "parameters": { ... },
  "message": "Mensagem para exibir ao usuário explicando o que será feito ou pedindo confirmação"
}
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

            // Preparar prompt com contexto
            const prompt = `
${this.systemPrompt}

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
            case 'chat_response':
                // Apenas a mensagem já foi enviada
                break;

            case 'search_products':
                await this.searchProducts(ctx, parameters);
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

            case 'list_pending_products':
                await this.listPendingProductsDirect(ctx, parameters?.page || 1);
                break;

            case 'create_coupon':
                await this.createCouponDirect(ctx, parameters);
                break;

            case 'get_server_status':
                await this.showServerStatus(ctx);
                break;

            case 'delete_coupon':
                await this.deleteCoupon(ctx, parameters);
                break;

            case 'list_coupons':
                await this.listCoupons(ctx, parameters);
                break;

            case 'set_cleanup_schedule':
                await this.setCleanupSchedule(ctx, parameters);
                break;

            case 'toggle_auto_publish':
                await this.toggleAutoPublish(ctx, parameters);
                break;

            case 'get_recent_logs':
                await this.getRecentLogs(ctx, parameters);
                break;

            case 'get_dashboard_stats':
                await this.getDashboardStats(ctx);
                break;

            case 'get_performance_report':
                await this.getPerformanceReport(ctx, parameters);
                break;

            case 'get_top_products':
                await this.getTopProducts(ctx, parameters);
                break;

            case 'list_channels':
                await this.listChannels(ctx, parameters);
                break;

            case 'toggle_channel':
                await this.toggleChannel(ctx, parameters);
                break;

            case 'capture_product':
                if (parameters.url) {
                    await ctx.reply('🕵️ Iniciando captura inteligente...');
                    const { captureLinkHandler } = await import('../handlers/captureHandler.js');
                    await captureLinkHandler(ctx, parameters.url);
                } else {
                    await ctx.reply('⚠️ URL não fornecida.');
                }
                break;

            case 'update_product':
                await this.updateProductDirect(ctx, parameters);
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

    /**
     * Buscar produtos
     */
    async searchProducts(ctx, params) {
        try {
            const query = params.query;
            if (!query) return ctx.reply('🔍 Por favor, informe o que deseja buscar.');

            const res = await Product.findAll({ search: query, limit: 5 });
            if (!res.products || res.products.length === 0) {
                return ctx.reply('❌ Nenhum produto encontrado.');
            }

            let msg = `🔍 *Resultados para "${query}"*:\n\n`;
            res.products.forEach(p => {
                msg += `📌 *${p.name.substring(0, 30)}...*\nID: \`${p.id}\`\nPreço: R$${p.current_price}\nStatus: ${p.status}\n\n`;
            });

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro searchProducts:', error);
            await ctx.reply('Erro ao buscar produtos.');
        }
    }

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
     * Publicar produto instantaneamente (autonomia)
     */
    async instantPublishProduct(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID do produto obrigatório.');

        try {
            const product = await Product.findById(id);
            if (!product) return ctx.reply('❌ Produto não encontrado.');

            if (!product.category_id) {
                // Fallback para wizard se faltar categoria
                const { startEditWizard } = await import('../handlers/editHandler.js');
                await ctx.reply('⚠️ Categoria não definida. Iniciando assistente...');
                return startEditWizard(ctx, id, true);
            }

            await ctx.reply('🚀 Publicando imediatamente...');

            // Publicar
            const result = await publishService.publishAll(product, {
                manual: true,
                skipAiCategory: true
            });

            if (result.success) {
                await Product.update(id, { status: 'published', stock_available: true, is_active: true });
                await ctx.reply(`✅ *${product.name}* publicado com sucesso!`, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(`⚠️ Falha na publicação: ${result.reason}`);
            }
        } catch (error) {
            logger.error('Erro instantPublish:', error);
            await ctx.reply('❌ Erro ao publicar produto.');
        }
    }

    /**
     * Listar Pendentes Diretamente (Sem bot handler)
     */
    async listPendingProductsDirect(ctx, page = 1) {
        try {
            const limit = 5;
            const { products, total } = await Product.findPending({
                limit, page, sort: 'created_at', order: 'desc'
            });

            if (!products || products.length === 0) {
                return ctx.reply('✅ Nenhum produto pendente.');
            }

            let msg = `📋 *Produtos Pendentes* (${total}):\n\n`;
            products.forEach(p => {
                const price = p.current_price ? `R$${p.current_price}` : 'N/A';
                msg += `📦 *${p.name}*\nID: \`${p.id}\` | ${price}\n\n`;
            });
            msg += `_Use "Publicar ID" para aprovar e postar._`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        } catch (error) {
            logger.error('Erro listPendingDirect:', error);
            await ctx.reply('Erro ao listar pendentes.');
        }
    }

    /**
     * Criar Cupom Diretamente (Sem Wizard)
     */
    async createCouponDirect(ctx, params = {}) {
        // Se faltar dados essenciais e não tiver parâmetros vindos do prompt
        if (!params.code) {
            const { startCreateCoupon } = await import('../handlers/couponHandler.js');
            await ctx.reply('📝 Iniciando assistente de criação...');
            return startCreateCoupon(ctx);
        }

        try {
            const couponData = {
                code: params.code.toUpperCase(),
                discount_value: params.discount_value || 0,
                discount_type: params.discount_type === 'percentage' || params.discount_type === '%' ? 'percentage' : 'fixed',
                platform: params.platform || 'general',
                is_active: true,
                capture_source: 'ai_direct',
                valid_from: new Date().toISOString(),
                is_general: true
            };

            const saved = await Coupon.create(couponData);
            await ctx.reply(`✅ Cupom *${saved.code}* criado com ID \`${saved.id}\`!`);

            await notificationDispatcher.dispatch('coupon_new', saved, { manual: true });

        } catch (error) {
            logger.error('Erro createCouponDirect:', error);
            await ctx.reply(`❌ Erro ao criar cupom: ${error.message}`);
        }
    }

    /**
     * Atualizar Produto Diretamente
     */
    async updateProductDirect(ctx, params) {
        const id = params.id;
        if (!id) return ctx.reply('⚠️ ID do produto obrigatório.');

        try {
            const product = await Product.findById(id);
            if (!product) return ctx.reply('❌ Produto não encontrado.');

            const updates = {};
            if (params.name) updates.name = params.name;
            if (params.price) updates.current_price = parseFloat(params.price);
            if (params.link) updates.link = params.link;

            if (Object.keys(updates).length === 0) return ctx.reply('⚠️ Nada para atualizar.');

            await Product.update(id, updates);
            await ctx.reply(`✅ Produto *${id}* atualizado com sucesso!`, { parse_mode: 'Markdown' });

        } catch (error) {
            logger.error('Erro updateProductDirect:', error);
            await ctx.reply('❌ Erro ao atualizar produto.');
        }
    }
}

export default new AiService();

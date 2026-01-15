import ScheduledPost from '../../models/ScheduledPost.js';
import publishService from './publishService.js';
import logger from '../../config/logger.js';
import SyncConfig from '../../models/SyncConfig.js';
import schedulerAI from '../../ai/schedulerAI.js';

class SchedulerService {
    /**
     * Agendar publicação de um produto
     * @param {Object} product - Produto a ser agendado
     * @param {Object} options - Opções de publicação (skipAiCategory, manualCategoryId, etc.)
     * @returns {Promise<void>}
     */
    async scheduleProduct(product, options = {}) {
        try {
            // 1. Tentar obter horário ótimo via IA
            let schedulingData = await schedulerAI.determineOptimalTime(product);

            // 2. Se IA falhar, usar Fallback Determinístico Inteligente
            if (!schedulingData) {
                logger.info('⚠️ Usando Inteligência Determinística (Fallback) para agendamento.');
                schedulingData = this.getFallbackSchedule(product);
            }

            const { scheduled_at, reason } = schedulingData;
            const scheduledTime = new Date(scheduled_at);

            // Garantir delay mínimo de 2 minutos se for muito próximo
            const minTime = new Date(Date.now() + 2 * 60000);
            if (scheduledTime < minTime) {
                scheduledTime.setTime(minTime.getTime());
            }

            // NOVO: Preparar metadata com opções de categoria (se fornecidas)
            const metadata = {};
            if (options.skipAiCategory || options.manualCategoryId) {
                metadata.skipAiCategory = options.skipAiCategory;
                metadata.manualCategoryId = options.manualCategoryId;
                logger.info(`📂 Agendamento com categoria manual protegida: ${options.manualCategoryId}`);
            }

            // Criar agendamento para Telegram
            await ScheduledPost.create({
                product_id: product.id,
                platform: 'telegram',
                scheduled_at: scheduledTime.toISOString(),
                metadata: Object.keys(metadata).length > 0 ? metadata : null
            });

            // Criar agendamento para WhatsApp (+2~5 min de diferença para parecer natural)
            const whatsappTime = new Date(scheduledTime);
            whatsappTime.setMinutes(whatsappTime.getMinutes() + Math.floor(Math.random() * 4) + 2);

            await ScheduledPost.create({
                product_id: product.id,
                platform: 'whatsapp',
                scheduled_at: whatsappTime.toISOString(),
                metadata: Object.keys(metadata).length > 0 ? metadata : null
            });

            logger.info(`📅 Agendamento [${product.platform}]: ${product.name.substring(0, 30)}...`);
            logger.info(`   ⏰ Horário: ${scheduledTime.toLocaleTimeString()} (${reason})`);

        } catch (error) {
            logger.error(`❌ Erro ao agendar produto ${product.id}: ${error.message}`);
        }
    }

    /**
     * Fallback Determinístico: Janelas de horário baseadas em categoria
     * @param {Object} product 
     * @returns {Object} { scheduled_at, reason }
     */
    getFallbackSchedule(product) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const category = (product.category || product.ai_detected_category_id || 'outros').toLowerCase();
        let targetTime = new Date(now);
        let reason = 'Janela padrão';

        // Definição de Janelas (Hora Inicial, Hora Final)
        // Se passar do horário final, joga para o próximo dia na hora inicial
        const windows = {
            'eletrônicos': { start: 10, end: 20 }, // 10h às 20h
            'celulares': { start: 11, end: 21 },
            'moda': { start: 9, end: 19 },
            'casa': { start: 8, end: 18 },
            'beleza': { start: 9, end: 20 },
            'default': { start: 9, end: 21 }
        };

        const rule = Object.keys(windows).find(k => category.includes(k)) ?
            windows[Object.keys(windows).find(k => category.includes(k))] :
            windows['default'];

        const currentHour = now.getHours();

        if (currentHour < rule.start) {
            // Hoje, mais tarde (no início da janela)
            targetTime.setHours(rule.start);
            targetTime.setMinutes(Math.floor(Math.random() * 59));
            reason = `Início da janela de ${category} (Hoje)`;
        } else if (currentHour >= rule.end) {
            // Amanhã, no início da janela
            targetTime.setDate(targetTime.getDate() + 1);
            targetTime.setHours(rule.start);
            targetTime.setMinutes(Math.floor(Math.random() * 59));
            reason = `Início da janela de ${category} (Amanhã)`;
        } else {
            // Dentro da janela: Agendar para daqui a pouco + random
            targetTime.setMinutes(targetTime.getMinutes() + 10 + Math.floor(Math.random() * 30));
            reason = `Horário de pico de ${category} (Imediato)`;
        }

        return { scheduled_at: targetTime, reason };
    }

    /**
     * Processar fila de agendamentos pendentes (Cron Job)
     */
    async processScheduledQueue() {
        try {
            const posts = await ScheduledPost.getPendingPosts(10); // Processar 10 por vez

            if (posts.length === 0) return;

            logger.info(`⏰ Processando ${posts.length} posts agendados...`);

            for (const post of posts) {
                await this.processSinglePost(post);
            }
        } catch (error) {
            logger.error(`❌ Erro no processamento da fila de agendamento: ${error.message}`);
        }
    }

    /**
     * Processar um único post agendado (Publicar)
     * @param {Object} post - Objeto do post agendado
     */
    async processSinglePost(post) {
        try {
            if (!post.products) {
                logger.warn(`⚠️ Produto não encontrado para agendamento ${post.id}. Marcando como falha.`);
                await ScheduledPost.update(post.id, { status: 'failed', error_message: 'Product not found' });
                return false;
            }

            // NOVO: Recuperar opções de metadata (categoria manual, etc.)
            const publishOptions = {};
            if (post.metadata) {
                if (post.metadata.skipAiCategory) publishOptions.skipAiCategory = post.metadata.skipAiCategory;
                if (post.metadata.manualCategoryId) publishOptions.manualCategoryId = post.metadata.manualCategoryId;
                logger.info(`📂 Publicando post agendado com categoria manual protegida: ${post.metadata.manualCategoryId}`);
            }

            // Executar publicação
            let result = false;
            if (post.platform === 'telegram') {
                result = await publishService.notifyTelegramBot(post.products, publishOptions);
            } else if (post.platform === 'whatsapp') {
                result = await publishService.notifyWhatsAppBot(post.products, publishOptions);
            }

            // Atualizar status
            if (result) {
                await ScheduledPost.update(post.id, { status: 'published' });
                logger.info(`✅ Post agendado executado: ${post.platform} - ${post.products.name}`);
                return true;
            } else {
                await ScheduledPost.update(post.id, {
                    status: 'failed',
                    error_message: 'Falha no envio do bot',
                    attempts: (post.attempts || 0) + 1
                });
                return false;
            }

        } catch (postError) {
            logger.error(`❌ Erro ao processar agendamento ${post.id}: ${postError.message}`);
            await ScheduledPost.update(post.id, {
                status: 'failed',
                error_message: postError.message,
                attempts: (post.attempts || 0) + 1
            });
            return false;
        }
    }
}

export default new SchedulerService();

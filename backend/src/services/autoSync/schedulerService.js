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

            // Buscar configuração global para respeitar flags master de ativação
            const BotConfig = (await import('../../models/BotConfig.js')).default;
            const botConfig = await BotConfig.get();

            // Criar agendamento para Telegram (apenas se habilitado globalmente)
            if (botConfig.telegram_enabled !== false) {
                await ScheduledPost.create({
                    product_id: product.id,
                    platform: 'telegram',
                    scheduled_at: scheduledTime.toISOString(),
                    metadata: Object.keys(metadata).length > 0 ? metadata : null
                });
            } else {
                logger.info(`   🚫 Agendamento Telegram pulado (desabilitado globalmente)`);
            }

            // Criar agendamento para WhatsApp (apenas se habilitado globalmente)
            if (botConfig.whatsapp_enabled !== false) {
                const whatsappTime = new Date(scheduledTime);
                whatsappTime.setMinutes(whatsappTime.getMinutes() + Math.floor(Math.random() * 4) + 2);

                await ScheduledPost.create({
                    product_id: product.id,
                    platform: 'whatsapp',
                    scheduled_at: whatsappTime.toISOString(),
                    metadata: Object.keys(metadata).length > 0 ? metadata : null
                });
            } else {
                logger.info(`   🚫 Agendamento WhatsApp pulado (desabilitado globalmente)`);
            }

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
     * Liberar posts travados em "processing" há mais de 5 minutos
     * Chamado antes de processar a fila para recuperar posts que falharam silenciosamente
     */
    async releaseStuckPosts() {
        try {
            logger.debug(`🔍 Verificando posts travados em "processing"...`);
            const stuckPosts = await ScheduledPost.getStuckPosts(5); // 5 minutos de timeout

            if (stuckPosts.length === 0) {
                logger.debug(`   ✅ Nenhum post travado encontrado`);
                return;
            }

            logger.warn(`⚠️ Encontrados ${stuckPosts.length} post(s) travado(s) em "processing"`);
            for (const post of stuckPosts) {
                logger.warn(`   Post ${post.id}: travado há ${Math.floor((Date.now() - new Date(post.processing_started_at).getTime()) / 60000)} minutos`);
            }

            for (const post of stuckPosts) {
                await ScheduledPost.releaseStuckPost(post.id);
            }
        } catch (error) {
            logger.error(`❌ Erro ao liberar posts travados: ${error.message}`);
            logger.error(`   Stack: ${error.stack}`);
        }
    }

    /**
     * Processar fila de agendamentos pendentes (Cron Job)
     */
    async processScheduledQueue() {
        try {
            const now = new Date();
            logger.debug(`📊 [processScheduledQueue] Iniciando processamento`);
            logger.debug(`   Horário atual (ISO): ${now.toISOString()}`);
            logger.debug(`   Horário atual (Local BR): ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            logger.debug(`   Timezone do processo: ${process.env.TZ || 'não configurado'}`);

            // 1. Primeiro, liberar posts travados (timeout)
            await this.releaseStuckPosts();

            // 2. Buscar posts pendentes prontos para processar
            logger.debug(`🔍 Buscando posts pendentes prontos para processar...`);
            const posts = await ScheduledPost.getPendingPosts(10); // Processar 10 por vez

            if (posts.length === 0) {
                logger.debug(`   ℹ️ Nenhum post pendente encontrado para processar agora`);
                return;
            }

            logger.info(`⏰ Processando ${posts.length} posts agendados...`);
            posts.forEach((post, index) => {
                logger.info(`   ${index + 1}. Post ${post.id}: agendado para ${post.scheduled_at} (${post.platform})`);
            });

            for (const post of posts) {
                // Marcar como "processing" antes de executar
                try {
                    await ScheduledPost.markAsProcessing(post.id);
                    await this.processSinglePost(post);
                } catch (error) {
                    logger.error(`❌ Erro ao processar post ${post.id}: ${error.message}`);
                    logger.error(`   Stack: ${error.stack}`);
                    // CRÍTICO: Garantir que o post seja marcado como failed ou pending mesmo em caso de exceção
                    // Isso evita que posts fiquem travados em "processing" indefinidamente
                    try {
                        const currentAttempts = (post.attempts || 0) + 1;
                        const maxRetries = 3;

                        await ScheduledPost.update(post.id, {
                            status: currentAttempts >= maxRetries ? 'failed' : 'pending',
                            error_message: error.message,
                            attempts: currentAttempts,
                            processing_started_at: null
                        });

                        logger.info(`   Post ${post.id} marcado como "${currentAttempts >= maxRetries ? 'failed' : 'pending'}" após erro (tentativa ${currentAttempts}/${maxRetries})`);
                    } catch (updateError) {
                        logger.error(`   ❌ ERRO CRÍTICO: Falha ao atualizar status do post ${post.id}: ${updateError.message}`);
                        logger.error(`   Post pode estar travado em "processing"!`);
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Erro no processamento da fila de agendamento: ${error.message}`);
        }
    }

    /**
     * Processar um único post agendado (Publicar)
     * @param {Object} post - Objeto do post agendado
     * @param {Object} options - Opções adicionais (couponId, etc.)
     */
    async processSinglePost(post, options = {}) {
        const startTime = new Date();
        const maxRetries = 3;
        const currentAttempt = (post.attempts || 0) + 1;

        try {
            logger.info(`📤 [${startTime.toISOString()}] Processando post ${post.id} (tentativa ${currentAttempt}/${maxRetries})`);
            logger.info(`   Platform: ${post.platform}, Product: ${post.product_id}`);
            logger.info(`   Scheduled at: ${post.scheduled_at}`);
            logger.info(`   Current time: ${startTime.toISOString()}`);

            if (!post.products) {
                logger.warn(`⚠️ Produto não encontrado para agendamento ${post.id}. Marcando como falha.`);
                await ScheduledPost.update(post.id, {
                    status: 'failed',
                    error_message: 'Product not found',
                    attempts: currentAttempt
                });
                return false;
            }

            // NOVO: Recuperar opções de metadata (categoria manual, etc.)
            const publishOptions = {};
            if (post.metadata) {
                if (post.metadata.skipAiCategory) publishOptions.skipAiCategory = post.metadata.skipAiCategory;
                if (post.metadata.manualCategoryId) publishOptions.manualCategoryId = post.metadata.manualCategoryId;
                logger.info(`📂 Publicando post agendado com categoria manual protegida: ${post.metadata.manualCategoryId}`);
            }

            // NOVO: Vincular cupom se fornecido
            if (options.couponId) {
                const Coupon = (await import('../../models/Coupon.js')).default;
                const coupon = await Coupon.findById(options.couponId);

                if (coupon) {
                    logger.info(`🎟️ Vinculando cupom ${coupon.code} ao produto ${post.products.name}`);

                    // Adicionar dados do cupom ao produto
                    post.products.coupon_id = coupon.id;
                    post.products.coupon_code = coupon.code;
                    post.products.coupon_discount = coupon.discount_value;
                    post.products.coupon_discount_type = coupon.discount_type;
                    post.products.coupon_valid_until = coupon.valid_until;

                    // Forçar uso do template promotion_with_coupon
                    publishOptions.forceTemplate = 'promotion_with_coupon';
                    logger.info(`📋 Forçando template 'promotion_with_coupon'`);
                } else {
                    logger.warn(`⚠️ Cupom ${options.couponId} não encontrado, publicando sem cupom`);
                }
            }

            // Executar publicação com retry logic
            let result = false;
            let lastError = null;

            // Tentar publicar (com delay se for retry)
            if (currentAttempt > 1) {
                const delayMs = Math.pow(2, currentAttempt - 1) * 1000; // Backoff exponencial: 2s, 4s, 8s
                logger.info(`⏳ Aguardando ${delayMs}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            try {
                if (post.platform === 'telegram') {
                    result = await publishService.notifyTelegramBot(post.products, publishOptions);
                } else if (post.platform === 'whatsapp') {
                    result = await publishService.notifyWhatsAppBot(post.products, publishOptions);
                }
            } catch (publishError) {
                lastError = publishError;
                logger.error(`❌ Erro ao publicar: ${publishError.message}`);
                logger.error(`   Stack: ${publishError.stack}`);
            }

            const endTime = new Date();
            const duration = endTime - startTime;

            // Atualizar status baseado no resultado
            if (result && result.success) {
                await ScheduledPost.update(post.id, {
                    status: 'published',
                    attempts: currentAttempt,
                    processing_started_at: null
                });
                logger.info(`✅ [${endTime.toISOString()}] Post agendado executado com sucesso: ${post.platform} - ${post.products.name} (${duration}ms)`);
                return true;
            } else {
                // Falhou - verificar se deve tentar novamente
                if (currentAttempt >= maxRetries) {
                    // Atingiu o máximo de tentativas
                    await ScheduledPost.update(post.id, {
                        status: 'failed',
                        error_message: lastError ? lastError.message : 'Falha no envio do bot após múltiplas tentativas',
                        attempts: currentAttempt,
                        processing_started_at: null
                    });
                    logger.error(`❌ [${endTime.toISOString()}] Post ${post.id} falhou após ${maxRetries} tentativas (${duration}ms)`);
                    return false;
                } else {
                    // Ainda há tentativas restantes - retornar para pending
                    await ScheduledPost.update(post.id, {
                        status: 'pending',
                        error_message: lastError ? lastError.message : 'Falha no envio do bot',
                        attempts: currentAttempt,
                        processing_started_at: null
                    });
                    logger.warn(`⚠️ [${endTime.toISOString()}] Post ${post.id} falhou (tentativa ${currentAttempt}/${maxRetries}). Será tentado novamente. (${duration}ms)`);
                    return false;
                }
            }

        } catch (postError) {
            const endTime = new Date();
            const duration = endTime - startTime;

            logger.error(`❌ [${endTime.toISOString()}] Erro crítico ao processar agendamento ${post.id}: ${postError.message} (${duration}ms)`);
            logger.error(`   Stack: ${postError.stack}`);

            // Verificar se deve tentar novamente
            if (currentAttempt >= maxRetries) {
                await ScheduledPost.update(post.id, {
                    status: 'failed',
                    error_message: postError.message,
                    attempts: currentAttempt,
                    processing_started_at: null
                });
                logger.error(`❌ Post ${post.id} marcado como "failed" após ${maxRetries} tentativas`);
            } else {
                await ScheduledPost.update(post.id, {
                    status: 'pending',
                    error_message: postError.message,
                    attempts: currentAttempt,
                    processing_started_at: null
                });
                logger.warn(`⚠️ Post ${post.id} retornado para "pending" para nova tentativa (${currentAttempt}/${maxRetries})`);
            }

            return false;
        }
    }
}

export default new SchedulerService();

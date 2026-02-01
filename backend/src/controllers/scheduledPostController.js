import ScheduledPost from '../models/ScheduledPost.js';
import schedulerService from '../services/autoSync/schedulerService.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';

class ScheduledPostController {
    /**
     * GET /api/scheduled-posts
     * Listar agendamentos
     */
    static async index(req, res, next) {
        try {
            const { page = 1, limit = 20, status } = req.query;
            const result = await ScheduledPost.findAll({ page, limit, status });
            res.json(successResponse(result));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/scheduled-posts/:id
     * Cancelar agendamento
     */
    static async destroy(req, res, next) {
        try {
            const { id } = req.params;
            await ScheduledPost.delete(id);
            logger.info(`🗑️ Agendamento ${id} cancelado pelo usuário`);
            res.json(successResponse(null, 'Agendamento cancelado com sucesso'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/scheduled-posts/:id/publish-now
     * Forçar publicação imediata
     * Body (opcional): { coupon_id: string }
     */
    static async publishNow(req, res, next) {
        try {
            const { id } = req.params;
            const { coupon_id } = req.body || {};

            logger.info(`🚀 Forçando publicação imediata do agendamento ${id}...`);
            if (coupon_id) {
                logger.info(`   🎟️ Cupom vinculado: ${coupon_id}`);
            }

            const post = await ScheduledPost.findById(id);
            if (!post) {
                return res.status(404).json(errorResponse('Agendamento não encontrado'));
            }

            if (post.status === 'published') {
                return res.status(400).json(errorResponse('Este item já foi publicado'));
            }

            const success = await schedulerService.processSinglePost(post, { couponId: coupon_id });

            if (success) {
                res.json(successResponse(null, 'Publicado com sucesso!'));
            } else {
                res.status(500).json(errorResponse('Falha ao publicar. Verifique os logs.'));
            }
        } catch (error) {
            next(error);
        }
    }


    /**
     * DELETE /api/scheduled-posts/bulk/pending
     * Deletar todos os agendamentos pendentes em lote
     */
    static async bulkDeletePending(req, res, next) {
        try {
            logger.info('🗑️ Iniciando exclusão em lote de agendamentos pendentes...');
            const deletedCount = await ScheduledPost.deleteAllPending();

            res.json(successResponse(
                { deletedCount },
                `${deletedCount} agendamento(s) pendente(s) cancelado(s) com sucesso`
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/scheduled-posts/debug
     * Endpoint de debug para diagnosticar problemas com posts agendados
     */
    /**
     * GET /api/scheduled-posts/debug
     * Endpoint de debug para diagnosticar problemas com posts agendados
     */
    static async debug(req, res, next) {
        try {
            const { supabase } = await import('../config/database.js');
            const schedulerCron = (await import('../cron/schedulerCron.js')).default;
            const now = new Date();

            logger.info('🔍 Executando diagnóstico de posts agendados...');

            // 1. Buscar posts pendentes
            const pending = await ScheduledPost.getPendingPosts(100);

            // 2. Buscar posts em processamento
            const { data: processing, error: processingError } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('status', 'processing');

            if (processingError) throw processingError;

            // 3. Buscar posts travados
            const stuck = await ScheduledPost.getStuckPosts(5);

            // 4. Buscar todos os posts (últimos 50)
            const { data: allRecent, error: allError } = await supabase
                .from('scheduled_posts')
                .select('id, status, scheduled_at, created_at, attempts, platform')
                .order('created_at', { ascending: false })
                .limit(50);

            if (allError) throw allError;

            // 5. Contar por status
            const { data: statusCounts, error: countError } = await supabase
                .from('scheduled_posts')
                .select('status')
                .then(result => {
                    if (result.error) throw result.error;
                    const counts = {};
                    result.data.forEach(post => {
                        counts[post.status] = (counts[post.status] || 0) + 1;
                    });
                    return { data: counts, error: null };
                });

            if (countError) throw countError;

            const cronStatus = {
                isRunning: !!schedulerCron.task,
                envEnabled: process.env.ENABLE_CRON_JOBS === 'true',
                isVercel: !!process.env.VERCEL,
                timezone: process.env.TZ || 'not set'
            };

            const diagnostics = {
                serverInfo: {
                    currentTime: now.toISOString(),
                    localTime: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    timezone: process.env.TZ || 'not set',
                    nodeVersion: process.version,
                    platform: process.platform,
                    uptime: process.uptime()
                },
                cronStatus,
                postsStatus: {
                    pending: pending.length,
                    processing: processing?.length || 0,
                    stuck: stuck.length,
                    totalByStatus: statusCounts
                },
                details: {
                    pendingPosts: pending.map(p => ({
                        id: p.id,
                        scheduled_at: p.scheduled_at,
                        platform: p.platform,
                        product_id: p.product_id,
                        attempts: p.attempts,
                        minutesOverdue: Math.floor((now - new Date(p.scheduled_at)) / 60000)
                    })),
                    stuckPosts: stuck.map(p => ({
                        id: p.id,
                        scheduled_at: p.scheduled_at,
                        minutesStuck: Math.floor((now - new Date(p.processing_started_at)) / 60000)
                    }))
                },
                solutions: !cronStatus.envEnabled ?
                    ['⚠️ ENV VAR MISSING: Set ENABLE_CRON_JOBS=true in your .env file'] :
                    (!cronStatus.isRunning ? ['⚠️ CRON STOPPED: Use POST /api/scheduled-posts/cron/start to start it'] : [])
            };

            logger.info('✅ Diagnóstico concluído');
            res.json(successResponse(diagnostics, 'Diagnóstico de posts agendados'));
        } catch (error) {
            logger.error(`❌ Erro no diagnóstico: ${error.message}`);
            next(error);
        }
    }

    /**
     * POST /api/scheduled-posts/cron/start
     * Forçar inicio do cron
     */
    static async startCron(req, res, next) {
        try {
            const schedulerCron = (await import('../cron/schedulerCron.js')).default;
            if (schedulerCron.task) {
                return res.json(successResponse({ status: 'already_running' }, 'O cron já está rodando.'));
            }
            schedulerCron.start();
            res.json(successResponse({ status: 'started' }, 'Cron de agendamento iniciado manualmente.'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/scheduled-posts/cron/stop
     * Parar cron
     */
    static async stopCron(req, res, next) {
        try {
            const schedulerCron = (await import('../cron/schedulerCron.js')).default;
            if (!schedulerCron.task) {
                return res.json(successResponse({ status: 'not_running' }, 'O cron não está rodando.'));
            }
            schedulerCron.stop();
            res.json(successResponse({ status: 'stopped' }, 'Cron de agendamento parado manualmente.'));
        } catch (error) {
            next(error);
        }
    }
}

export default ScheduledPostController;

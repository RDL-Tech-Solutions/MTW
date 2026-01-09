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
     */
    static async publishNow(req, res, next) {
        try {
            const { id } = req.params;
            logger.info(`🚀 Forçando publicação imediata do agendamento ${id}...`);

            const post = await ScheduledPost.findById(id);
            if (!post) {
                return res.status(404).json(errorResponse('Agendamento não encontrado'));
            }

            if (post.status === 'published') {
                return res.status(400).json(errorResponse('Este item já foi publicado'));
            }

            const success = await schedulerService.processSinglePost(post); // Reutiliza lógica refatorada

            if (success) {
                res.json(successResponse(null, 'Publicado com sucesso!'));
            } else {
                res.status(500).json(errorResponse('Falha ao publicar. Verifique os logs.'));
            }
        } catch (error) {
            next(error);
        }
    }
}

export default ScheduledPostController;

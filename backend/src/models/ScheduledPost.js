import { supabase } from '../config/database.js';
import logger from '../config/logger.js';

class ScheduledPost {
    /**
     * Criar um novo agendamento
     * @param {Object} data - Dados do agendamento
     * @returns {Promise<Object>} Agendamento criado
     */
    static async create(data) {
        try {
            const { data: post, error } = await supabase
                .from('scheduled_posts')
                .insert([{
                    product_id: data.product_id,
                    platform: data.platform,
                    scheduled_at: data.scheduled_at,
                    status: 'pending',
                    attempts: 0,
                    metadata: data.metadata || null
                }])
                .select()
                .single();

            if (error) throw error;
            return post;
        } catch (error) {
            logger.error(`Erro ao criar agendamento: ${error.message}`);
            throw error;
        }
    }

    /**
     * Buscar posts pendentes para processamento
     * @param {Date} date - Data limite para buscar (default: agora)
     * @returns {Promise<Array>} Lista de posts
     */
    static async getPendingPosts(limit = 10) {
        try {
            const now = new Date().toISOString();
            const { data: posts, error } = await supabase
                .from('scheduled_posts')
                .select('*, products!product_id(*)')
                .eq('status', 'pending')
                .lte('scheduled_at', now)
                .order('scheduled_at', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return posts;
        } catch (error) {
            logger.error(`Erro ao buscar posts pendentes: ${error.message}`);
            throw error;
        }
    }

    /**
     * Atualizar status do agendamento
     * @param {string} id - ID do agendamento
     * @param {Object} updateData - Dados para atualizar (status, error_message, etc)
     */
    static async update(id, updateData) {
        try {
            const { data, error } = await supabase
                .from('scheduled_posts')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Erro ao atualizar agendamento ${id}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Buscar todos os agendamentos com paginação
     * @param {Object} query - Filtros e paginação
     */
    static async findAll(query = {}) {
        try {
            const { page = 1, limit = 20, status } = query;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let dbQuery = supabase
                .from('scheduled_posts')
                .select('*, products!product_id(*, category:categories!category_id(id, name, icon))', { count: 'exact' })
                .order('scheduled_at', { ascending: true })
                .range(from, to);

            if (status) {
                dbQuery = dbQuery.eq('status', status);
            }

            const { data, count, error } = await dbQuery;

            if (error) throw error;
            return { data, count };
        } catch (error) {
            logger.error(`Erro ao buscar agendamentos: ${error.message}`);
            throw error;
        }
    }

    /**
     * Buscar um agendamento pelo ID
     */
    static async findById(id) {
        try {
            const { data, error } = await supabase
                .from('scheduled_posts')
                .select('*, products!product_id(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Erro ao buscar agendamento ${id}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deletar agendamento (Cancelar)
     */
    static async delete(id) {
        try {
            const { error } = await supabase
                .from('scheduled_posts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            logger.error(`Erro ao deletar agendamento ${id}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deletar todos os agendamentos pendentes (Exclusão em lote)
     * @returns {Promise<number>} Número de registros deletados
     */
    static async deleteAllPending() {
        try {
            // Primeiro, contar quantos existem
            const { count: totalCount, error: countError } = await supabase
                .from('scheduled_posts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (countError) throw countError;

            if (totalCount === 0) {
                logger.info('Nenhum agendamento pendente para deletar');
                return 0;
            }

            // Deletar todos os pendentes
            const { error } = await supabase
                .from('scheduled_posts')
                .delete()
                .eq('status', 'pending');

            if (error) throw error;

            logger.info(`🗑️ ${totalCount} agendamento(s) pendente(s) deletado(s) em lote`);
            return totalCount;
        } catch (error) {
            logger.error(`Erro ao deletar agendamentos pendentes em lote: ${error.message}`);
            throw error;
        }
    }

    /**
     * Marcar post como "processing" e registrar timestamp de início
     * @param {string} id - ID do agendamento
     * @returns {Promise<Object>}
     */
    static async markAsProcessing(id) {
        try {
            const { data, error } = await supabase
                .from('scheduled_posts')
                .update({
                    status: 'processing',
                    processing_started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            logger.info(`🔄 Post ${id} marcado como "processing"`);
            return data;
        } catch (error) {
            logger.error(`Erro ao marcar post ${id} como processing: ${error.message}`);
            throw error;
        }
    }

    /**
     * Buscar posts travados em "processing" há mais de X minutos
     * @param {number} timeoutMinutes - Timeout em minutos (padrão: 5)
     * @returns {Promise<Array>}
     */
    static async getStuckPosts(timeoutMinutes = 5) {
        try {
            const timeoutDate = new Date();
            timeoutDate.setMinutes(timeoutDate.getMinutes() - timeoutMinutes);

            const { data: posts, error } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('status', 'processing')
                .lt('processing_started_at', timeoutDate.toISOString());

            if (error) throw error;
            return posts || [];
        } catch (error) {
            logger.error(`Erro ao buscar posts travados: ${error.message}`);
            throw error;
        }
    }

    /**
     * Liberar post travado, retornando para "pending" e incrementando tentativas
     * @param {string} id - ID do agendamento
     * @returns {Promise<Object>}
     */
    static async releaseStuckPost(id) {
        try {
            // Buscar post atual para pegar número de tentativas
            const { data: currentPost, error: fetchError } = await supabase
                .from('scheduled_posts')
                .select('attempts')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            const newAttempts = (currentPost.attempts || 0) + 1;
            const maxAttempts = 3;

            // Se já atingiu o máximo de tentativas, marcar como failed
            if (newAttempts >= maxAttempts) {
                const { data, error } = await supabase
                    .from('scheduled_posts')
                    .update({
                        status: 'failed',
                        error_message: `Timeout após ${maxAttempts} tentativas`,
                        attempts: newAttempts,
                        processing_started_at: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                logger.warn(`❌ Post ${id} marcado como "failed" após ${maxAttempts} tentativas`);
                return data;
            }

            // Caso contrário, retornar para pending
            const { data, error } = await supabase
                .from('scheduled_posts')
                .update({
                    status: 'pending',
                    attempts: newAttempts,
                    processing_started_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            logger.info(`🔓 Post ${id} liberado e retornado para "pending" (tentativa ${newAttempts}/${maxAttempts})`);
            return data;
        } catch (error) {
            logger.error(`Erro ao liberar post travado ${id}: ${error.message}`);
            throw error;
        }
    }
}

export default ScheduledPost;

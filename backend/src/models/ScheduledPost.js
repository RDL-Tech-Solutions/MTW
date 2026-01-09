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
                    attempts: 0
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
                .select('*, products(*)')
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
}

export default ScheduledPost;

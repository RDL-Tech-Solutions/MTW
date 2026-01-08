import supabase from '../config/database.js';
import logger from '../config/logger.js';

class AIModelStatus {
    static async getAll() {
        try {
            const { data, error } = await supabase
                .from('ai_model_status')
                .select('*')
                .order('model_id');

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error(`Erro ao buscar status dos modelos: ${error.message}`);
            return [];
        }
    }

    static async updateStatus(modelId, statusData) {
        try {
            const { data, error } = await supabase
                .from('ai_model_status')
                .upsert({
                    model_id: modelId,
                    status: statusData.status,
                    last_tested_at: new Date().toISOString(),
                    error_message: statusData.error_message || null,
                    latency_ms: statusData.latency_ms || null
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Erro ao atualizar status do modelo ${modelId}: ${error.message}`);
            throw error;
        }
    }

    static async getLastTestDate() {
        try {
            const { data, error } = await supabase
                .from('ai_model_status')
                .select('last_tested_at')
                .order('last_tested_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
            return data ? new Date(data.last_tested_at) : null;
        } catch (error) {
            logger.error(`Erro ao buscar última data de teste: ${error.message}`);
            return null;
        }
    }
}

export default AIModelStatus;

/**
 * Model para logs de decisões da IA
 * Observabilidade e rastreabilidade das decisões automáticas
 */
import supabase from '../config/database.js';
import logger from '../config/logger.js';

class AIDecisionLog {
  /**
   * Criar log de decisão da IA
   */
  static async create(logData) {
    const {
      entity_type,
      entity_id,
      decision_type,
      confidence_score = null,
      decision_reason = null,
      input_data = null,
      output_data = null,
      model_used = null,
      processing_time_ms = null,
      success = true,
      error_message = null
    } = logData;

    try {
      const { data, error } = await supabase
        .from('ai_decision_logs')
        .insert([{
          entity_type,
          entity_id,
          decision_type,
          confidence_score,
          decision_reason,
          input_data,
          output_data,
          model_used,
          processing_time_ms,
          success,
          error_message
        }])
        .select()
        .single();

      if (error) throw error;

      logger.debug(`📝 Log de decisão da IA criado: ${decision_type} para ${entity_type} ${entity_id}`);
      return data;
    } catch (error) {
      logger.error(`Erro ao criar log de decisão da IA: ${error.message}`);
      // Não lançar erro - logs não devem quebrar o fluxo principal
      return null;
    }
  }

  /**
   * Buscar logs por entidade
   */
  static async findByEntity(entityType, entityId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('ai_decision_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar logs: ${error.message}`);
      return [];
    }
  }

  /**
   * Buscar logs por tipo de decisão
   */
  static async findByDecisionType(decisionType, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('ai_decision_logs')
        .select('*')
        .eq('decision_type', decisionType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar logs por tipo: ${error.message}`);
      return [];
    }
  }

  /**
   * Estatísticas de decisões da IA
   */
  static async getStats(days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('ai_decision_logs')
        .select('decision_type, success, confidence_score')
        .gte('created_at', since.toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        by_type: {},
        success_rate: 0,
        avg_confidence: 0
      };

      let successCount = 0;
      let confidenceSum = 0;
      let confidenceCount = 0;

      for (const log of data) {
        // Por tipo
        if (!stats.by_type[log.decision_type]) {
          stats.by_type[log.decision_type] = { total: 0, success: 0 };
        }
        stats.by_type[log.decision_type].total++;
        if (log.success) {
          stats.by_type[log.decision_type].success++;
          successCount++;
        }

        // Confiança média
        if (log.confidence_score !== null) {
          confidenceSum += parseFloat(log.confidence_score);
          confidenceCount++;
        }
      }

      stats.success_rate = data.length > 0 ? (successCount / data.length) * 100 : 0;
      stats.avg_confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

      return stats;
    } catch (error) {
      logger.error(`Erro ao buscar estatísticas: ${error.message}`);
      return { total: 0, by_type: {}, success_rate: 0, avg_confidence: 0 };
    }
  }

  /**
   * Deletar logs antigos
   */
  static async deleteOld(days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { error } = await supabase
        .from('ai_decision_logs')
        .delete()
        .lt('created_at', since.toISOString());

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Erro ao deletar logs antigos: ${error.message}`);
      return false;
    }
  }
}

export default AIDecisionLog;





/**
 * Validador de confiança das extrações da IA
 */
import logger from '../config/logger.js';

class ConfidenceValidator {
  /**
   * Validar se a extração tem confiança suficiente
   * @param {Object} extraction - Dados extraídos pela IA
   * @returns {Object} - { valid: boolean, reason: string }
   */
  validate(extraction) {
    try {
      // ✅ LOG DETALHADO: Estado da validação
      logger.info(`🔍 [VALIDAÇÃO IA] Iniciando validação de cupom`);
      logger.info(`   Código: ${extraction.coupon_code || 'N/A'}`);
      logger.info(`   Plataforma: ${extraction.platform || 'N/A'}`);
      logger.info(`   is_valid_coupon: ${extraction.is_valid_coupon}`);
      logger.info(`   confidence: ${extraction.confidence?.toFixed(2) || 'N/A'}`);
      logger.info(`   discount: ${extraction.discount || 'N/A'}`);

      // Verificar se is_valid_coupon é false
      if (extraction.is_valid_coupon === false) {
        logger.warn(`❌ [VALIDAÇÃO IA] Cupom marcado como INVÁLIDO pela IA`);
        logger.warn(`   Código: ${extraction.coupon_code || 'N/A'}`);
        logger.warn(`   Será REJEITADO e NÃO será salvo`);
        return {
          valid: false,
          reason: 'IA identificou que não é um cupom válido'
        };
      }

      // Verificar confiança mínima (configurável, padrão 0.75)
      // Para publicação automática, usamos 0.90 (definido em saveCoupon)
      const minConfidence = 0.75;
      if (extraction.confidence < minConfidence) {
        logger.debug(`❌ Confiança insuficiente: ${extraction.confidence} < ${minConfidence}`);
        return {
          valid: false,
          reason: `Confiança muito baixa (${extraction.confidence.toFixed(2)} < ${minConfidence})`
        };
      }

      // Verificar se tem código de cupom
      if (!extraction.coupon_code || extraction.coupon_code.trim().length === 0) {
        logger.debug(`❌ Código de cupom ausente`);
        return {
          valid: false,
          reason: 'Código de cupom não encontrado'
        };
      }

      // Verificar se tem desconto
      if (!extraction.discount || extraction.discount.trim().length === 0) {
        logger.warn(`⚠️ Desconto não encontrado, mas continuando (código: ${extraction.coupon_code})`);
        // Não rejeitar por falta de desconto, apenas avisar
      }

      // Validações adicionais
      const code = extraction.coupon_code.trim();

      // Código muito curto (menos de 3 caracteres)
      if (code.length < 3) {
        logger.debug(`❌ Código muito curto: ${code}`);
        return {
          valid: false,
          reason: 'Código de cupom muito curto'
        };
      }

      // Código muito longo (mais de 20 caracteres)
      if (code.length > 20) {
        logger.debug(`❌ Código muito longo: ${code}`);
        return {
          valid: false,
          reason: 'Código de cupom muito longo'
        };
      }

      logger.info(`✅ [VALIDAÇÃO IA] Cupom APROVADO pela validação`);
      logger.info(`   Código: ${code}`);
      logger.info(`   Confiança: ${extraction.confidence.toFixed(2)}`);
      logger.info(`   Plataforma: ${extraction.platform || 'N/A'}`);
      logger.info(`   Desconto: ${extraction.discount || 'Não especificado'}`);

      return {
        valid: true,
        reason: 'Extração validada com sucesso',
        confidence_score: extraction.confidence
      };

    } catch (error) {
      logger.error(`Erro ao validar confiança: ${error.message}`);
      return {
        valid: false,
        reason: `Erro na validação: ${error.message}`
      };
    }
  }

  /**
   * Logar tentativa inválida para análise
   * @param {string} message - Mensagem original
   * @param {Object} extraction - Dados extraídos
   * @param {string} reason - Motivo da rejeição
   */
  logInvalidAttempt(message, extraction, reason) {
    logger.warn(`⚠️ Tentativa inválida de extração:`);
    logger.warn(`   Mensagem: ${message.substring(0, 100)}...`);
    logger.warn(`   Código extraído: ${extraction.coupon_code || 'N/A'}`);
    logger.warn(`   Confiança: ${extraction.confidence?.toFixed(2) || 'N/A'}`);
    logger.warn(`   Motivo: ${reason}`);

    // Aqui poderia salvar em uma tabela de logs para análise futura
    // Por enquanto, apenas logar
  }
}

export default new ConfidenceValidator();









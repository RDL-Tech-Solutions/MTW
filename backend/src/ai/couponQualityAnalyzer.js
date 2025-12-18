/**
 * Analisador de Qualidade de Cupons com IA
 * Analisa qualidade, relevância e validade de cupons
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class CouponQualityAnalyzer {
  /**
   * Gerar prompt para análise de qualidade de cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {string} - Prompt formatado
   */
  generateAnalysisPrompt(coupon) {
    return `Você é um especialista em análise de cupons de desconto para e-commerce.

Analise o cupom abaixo e retorne APENAS um JSON válido com a análise.

Dados do Cupom:
- Código: ${coupon.code || 'N/A'}
- Plataforma: ${coupon.platform || 'N/A'}
- Desconto: ${coupon.discount_value || 'N/A'} ${coupon.discount_type || ''}
- Compra Mínima: ${coupon.min_purchase || 'N/A'}
- Validade: ${coupon.valid_until || 'N/A'}
- Descrição: ${coupon.description || 'N/A'}
- Categoria: ${coupon.category || 'N/A'}

Formato obrigatório do JSON:
{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "value_score": 0.0-1.0,
  "is_high_quality": true | false,
  "is_relevant": true | false,
  "is_valuable": true | false,
  "should_approve": true | false,
  "suggested_category": "string | null",
  "suggested_tags": ["string"],
  "issues": ["string"],
  "strengths": ["string"],
  "recommendation": "approve | review | reject",
  "confidence": 0.0-1.0
}

Regras:
- quality_score: Avalie qualidade geral do cupom (0.0 = ruim, 1.0 = excelente)
- relevance_score: Avalie relevância para o público (0.0 = irrelevante, 1.0 = muito relevante)
- value_score: Avalie valor do desconto (0.0 = sem valor, 1.0 = excelente valor)
- is_high_quality: Se o cupom é de alta qualidade
- is_relevant: Se o cupom é relevante
- is_valuable: Se o cupom oferece bom valor
- should_approve: Se deve ser aprovado automaticamente
- suggested_category: Categoria sugerida se a atual estiver incorreta
- suggested_tags: Array de tags sugeridas para melhor organização
- issues: Array de problemas encontrados (ex: ["código inválido", "desconto baixo"])
- strengths: Array de pontos fortes (ex: ["desconto alto", "sem compra mínima"])
- recommendation: Recomendação (approve = aprovar, review = revisar, reject = rejeitar)
- confidence: Confiança na análise (0.0-1.0)

Retorne SOMENTE o JSON, sem explicações ou markdown.`;
  }

  /**
   * Analisar qualidade de cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>} - Análise do cupom
   */
  async analyzeCoupon(coupon) {
    try {
      logger.info(`🤖 Analisando qualidade de cupom via IA: ${coupon.code?.substring(0, 20)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando análise padrão.');
        return this.getDefaultAnalysis(coupon);
      }

      // Gerar prompt
      const prompt = this.generateAnalysisPrompt(coupon);

      // Fazer requisição para OpenRouter
      const response = await openrouterClient.makeRequest(prompt);

      // Validar resposta
      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      // Normalizar resposta
      const analysis = {
        quality_score: this.normalizeScore(response.quality_score),
        relevance_score: this.normalizeScore(response.relevance_score),
        value_score: this.normalizeScore(response.value_score),
        is_high_quality: response.is_high_quality === true || response.is_high_quality === 'true',
        is_relevant: response.is_relevant === true || response.is_relevant === 'true',
        is_valuable: response.is_valuable === true || response.is_valuable === 'true',
        should_approve: response.should_approve === true || response.should_approve === 'true',
        suggested_category: response.suggested_category || null,
        suggested_tags: Array.isArray(response.suggested_tags) ? response.suggested_tags : [],
        issues: Array.isArray(response.issues) ? response.issues : [],
        strengths: Array.isArray(response.strengths) ? response.strengths : [],
        recommendation: this.normalizeRecommendation(response.recommendation),
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

      logger.info(`✅ Análise concluída: recommendation=${analysis.recommendation}, confidence=${analysis.confidence.toFixed(2)}`);

      return analysis;

    } catch (error) {
      logger.error(`❌ Erro ao analisar cupom: ${error.message}`);
      return this.getDefaultAnalysis(coupon);
    }
  }

  /**
   * Normalizar score (0-1)
   */
  normalizeScore(score) {
    if (typeof score === 'number') {
      return Math.max(0, Math.min(1, score));
    }
    if (typeof score === 'string') {
      const parsed = parseFloat(score);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(1, parsed));
      }
    }
    return 0.5;
  }

  /**
   * Normalizar recomendação
   */
  normalizeRecommendation(rec) {
    const validRecs = ['approve', 'review', 'reject'];
    if (validRecs.includes(rec)) {
      return rec;
    }
    return 'review'; // Default
  }

  /**
   * Análise padrão quando IA não está disponível
   */
  getDefaultAnalysis(coupon) {
    const hasCode = coupon.code && coupon.code.trim().length >= 4;
    const hasDiscount = coupon.discount_value && parseFloat(coupon.discount_value) > 0;
    const hasPlatform = coupon.platform && coupon.platform.trim().length > 0;
    const discountValue = parseFloat(coupon.discount_value) || 0;
    const isGoodDiscount = discountValue >= 10;

    return {
      quality_score: hasCode && hasDiscount && hasPlatform ? 0.7 : 0.3,
      relevance_score: 0.5,
      value_score: isGoodDiscount ? 0.8 : 0.5,
      is_high_quality: hasCode && hasDiscount && hasPlatform && isGoodDiscount,
      is_relevant: hasCode && hasPlatform,
      is_valuable: isGoodDiscount,
      should_approve: hasCode && hasDiscount && hasPlatform && isGoodDiscount,
      suggested_category: null,
      suggested_tags: [],
      issues: !hasCode ? ['Código ausente'] : !hasDiscount ? ['Desconto ausente'] : !isGoodDiscount ? ['Desconto baixo'] : [],
      strengths: isGoodDiscount ? ['Desconto atrativo'] : [],
      recommendation: hasCode && hasDiscount && hasPlatform && isGoodDiscount ? 'approve' : 'review',
      confidence: 0.5
    };
  }

  /**
   * Analisar múltiplos cupons em lote
   * @param {Array} coupons - Array de cupons
   * @returns {Promise<Array>} - Array de análises
   */
  async analyzeBatch(coupons) {
    const analyses = [];
    for (const coupon of coupons) {
      try {
        const analysis = await this.analyzeCoupon(coupon);
        analyses.push({
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          analysis
        });
        // Pequeno delay para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Erro ao analisar cupom ${coupon.id}: ${error.message}`);
        analyses.push({
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          analysis: this.getDefaultAnalysis(coupon),
          error: error.message
        });
      }
    }
    return analyses;
  }
}

export default new CouponQualityAnalyzer();

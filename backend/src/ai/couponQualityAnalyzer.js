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
    return `Você é um especialista em análise de cupons de desconto para e-commerce brasileiro.

CONTEXTO DE MERCADO:
- Shopee: Descontos típicos 10-30%, cupons de frete grátis são valiosos
- Mercado Livre: Descontos típicos 5-20%, cupons acima de R$ 50 são raros
- Amazon: Descontos típicos 10-40%, cupons em eletrônicos são mais valiosos
- AliExpress: Descontos típicos 20-50%, mas frete pode anular benefício

EXEMPLOS DE CUPONS EXCELENTES:
✅ Shopee: "FRETEGRATIS" + sem mínimo = score 0.9+
✅ Mercado Livre: "50REAIS" + mínimo R$ 100 = score 0.85+
✅ Amazon: "30%" em eletrônicos = score 0.9+

EXEMPLOS DE CUPONS RUINS:
❌ Qualquer plataforma: "5%" + mínimo R$ 500 = score 0.3-
❌ Código genérico sem desconto claro = score 0.2-
❌ Cupom expirado ou sem validade = score 0.1-

DADOS DO CUPOM PARA ANÁLISE:
- Código: ${coupon.code || 'N/A'}
- Plataforma: ${coupon.platform || 'N/A'}
- Desconto: ${coupon.discount_value || 'N/A'} ${coupon.discount_type || ''}
- Compra Mínima: ${coupon.min_purchase || 'Sem mínimo'}
- Validade: ${coupon.valid_until || 'Não especificada'}
- Descrição: ${coupon.description || 'N/A'}
- Categoria: ${coupon.category || 'Geral'}

CRITÉRIOS DE AVALIAÇÃO DETALHADOS:

1. **quality_score** (0.0-1.0):
   - 0.9-1.0: Cupom excepcional (frete grátis sem mínimo, desconto >40%)
   - 0.7-0.9: Cupom muito bom (desconto 20-40% ou valor alto)
   - 0.5-0.7: Cupom bom (desconto 10-20%)
   - 0.3-0.5: Cupom mediano (desconto 5-10%)
   - 0.0-0.3: Cupom fraco (desconto <5% ou requisitos ruins)

2. **relevance_score** (0.0-1.0):
   - Considere: popularidade da plataforma, categoria do produto, época do ano
   - Cupons de eletrônicos/moda = mais relevantes
   - Cupons de nicho específico = menos relevantes (a menos que seja categoria popular)

3. **value_score** (0.0-1.0):
   - Calcule: desconto_real / compra_mínima
   - Se desconto >= 30% do mínimo = score alto (0.8+)
   - Se desconto >= 15% do mínimo = score médio (0.6+)
   - Se desconto < 10% do mínimo = score baixo (0.4-)
   - Frete grátis sem mínimo = sempre 0.9+

4. **should_approve** (true/false):
   - TRUE se: quality_score >= 0.7 E value_score >= 0.6 E código válido
   - FALSE se: quality_score < 0.5 OU value_score < 0.4 OU código suspeito

FORMATO DE RESPOSTA (JSON):
{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "value_score": 0.0-1.0,
  "is_high_quality": true | false,
  "is_relevant": true | false,
  "is_valuable": true | false,
  "should_approve": true | false,
  "suggested_category": "string | null",
  "suggested_tags": ["tag1", "tag2"],
  "issues": ["problema1", "problema2"],
  "strengths": ["ponto_forte1", "ponto_forte2"],
  "recommendation": "approve | review | reject",
  "confidence": 0.0-1.0,
  "reasoning": "Explicação breve da análise (max 100 caracteres)"
}

IMPORTANTE: Seja rigoroso mas justo. Retorne APENAS o JSON.`;
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
   * Algoritmo melhorado com scoring granular
   */
  getDefaultAnalysis(coupon) {
    const hasCode = coupon.code && coupon.code.trim().length >= 4;
    const hasDiscount = coupon.discount_value && parseFloat(coupon.discount_value) > 0;
    const hasPlatform = coupon.platform && coupon.platform.trim().length > 0;

    const discountValue = parseFloat(coupon.discount_value) || 0;
    const minPurchase = parseFloat(coupon.min_purchase) || 0;
    const discountType = coupon.discount_type || 'fixed';

    // Calcular scores de forma mais granular
    let quality_score = 0.3; // Base
    let value_score = 0.3;
    let relevance_score = 0.5;

    // Quality Score - Baseado em múltiplos fatores
    if (hasCode) quality_score += 0.2;
    if (hasDiscount) quality_score += 0.2;
    if (hasPlatform) quality_score += 0.1;

    // Bonus por código bem formatado (letras + números)
    if (hasCode && /[A-Z]/.test(coupon.code) && /[0-9]/.test(coupon.code)) {
      quality_score += 0.1;
    }

    // Value Score - Baseado no desconto real
    if (discountType === 'percentage') {
      // Desconto percentual
      if (discountValue >= 40) value_score = 0.95;
      else if (discountValue >= 30) value_score = 0.85;
      else if (discountValue >= 20) value_score = 0.75;
      else if (discountValue >= 15) value_score = 0.65;
      else if (discountValue >= 10) value_score = 0.55;
      else if (discountValue >= 5) value_score = 0.45;
      else value_score = 0.3;
    } else {
      // Desconto fixo - considerar relação com compra mínima
      if (minPurchase > 0) {
        const ratio = discountValue / minPurchase;
        if (ratio >= 0.5) value_score = 0.95; // 50%+ de desconto
        else if (ratio >= 0.3) value_score = 0.85; // 30%+ de desconto
        else if (ratio >= 0.2) value_score = 0.75; // 20%+ de desconto
        else if (ratio >= 0.15) value_score = 0.65; // 15%+ de desconto
        else if (ratio >= 0.10) value_score = 0.55; // 10%+ de desconto
        else value_score = 0.4;
      } else {
        // Sem mínimo - avaliar valor absoluto
        if (discountValue >= 100) value_score = 0.9;
        else if (discountValue >= 50) value_score = 0.8;
        else if (discountValue >= 30) value_score = 0.7;
        else if (discountValue >= 20) value_score = 0.6;
        else if (discountValue >= 10) value_score = 0.5;
        else value_score = 0.4;
      }
    }

    // Relevance Score - Baseado na plataforma
    const platformRelevance = {
      'shopee': 0.8,
      'mercadolivre': 0.9,
      'amazon': 0.85,
      'aliexpress': 0.7
    };
    relevance_score = platformRelevance[coupon.platform?.toLowerCase()] || 0.5;

    // Bonus se tiver categoria popular
    const popularCategories = ['eletronicos', 'moda', 'casa', 'beleza', 'games'];
    if (coupon.category && popularCategories.some(cat =>
      coupon.category.toLowerCase().includes(cat))) {
      relevance_score = Math.min(1.0, relevance_score + 0.1);
    }

    // Normalizar scores
    quality_score = Math.max(0, Math.min(1, quality_score));
    value_score = Math.max(0, Math.min(1, value_score));
    relevance_score = Math.max(0, Math.min(1, relevance_score));

    // Decisões baseadas em scores
    const is_high_quality = quality_score >= 0.7;
    const is_relevant = relevance_score >= 0.6;
    const is_valuable = value_score >= 0.65;

    // Auto-aprovação mais criteriosa
    const should_approve =
      quality_score >= 0.7 &&
      value_score >= 0.65 &&
      relevance_score >= 0.6 &&
      hasCode &&
      hasDiscount;

    // Identificar issues
    const issues = [];
    if (!hasCode) issues.push('Código ausente');
    if (!hasDiscount) issues.push('Desconto ausente');
    if (value_score < 0.5) issues.push('Desconto baixo');
    if (minPurchase > discountValue * 10) issues.push('Compra mínima muito alta');

    // Identificar strengths
    const strengths = [];
    if (value_score >= 0.8) strengths.push('Desconto excelente');
    if (minPurchase === 0 || !minPurchase) strengths.push('Sem compra mínima');
    if (quality_score >= 0.8) strengths.push('Alta qualidade');
    if (hasCode && /^[A-Z0-9]{6,}$/.test(coupon.code)) strengths.push('Código bem formatado');

    // Recommendation
    let recommendation = 'review';
    if (should_approve) recommendation = 'approve';
    else if (quality_score < 0.4 || value_score < 0.4) recommendation = 'reject';

    return {
      quality_score,
      relevance_score,
      value_score,
      is_high_quality,
      is_relevant,
      is_valuable,
      should_approve,
      suggested_category: null,
      suggested_tags: [],
      issues,
      strengths,
      recommendation,
      confidence: 0.6, // Análise padrão tem confiança média
      reasoning: `Q:${quality_score.toFixed(2)} V:${value_score.toFixed(2)} R:${relevance_score.toFixed(2)}`
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









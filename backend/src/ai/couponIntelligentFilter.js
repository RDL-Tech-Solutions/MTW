/**
 * Filtro Inteligente de Cupons com IA
 * Filtra cupons usando análise de qualidade, relevância e valor
 */
import logger from '../config/logger.js';
import shopeeAnalyzer from './shopeeAnalyzer.js';
import priceAnalyzer from './priceAnalyzer.js';
import openrouterClient from './openrouterClient.js';

class CouponIntelligentFilter {
  /**
   * Filtrar cupons usando IA
   * @param {Array} coupons - Array de cupons a filtrar
   * @param {Object} config - Configuração de filtragem
   * @returns {Promise<Object>} - Resultado da filtragem
   */
  async filterCoupons(coupons, config = {}) {
    try {
      logger.info(`🤖 Filtrando ${coupons.length} cupons com IA...`);

      // Thresholds dinâmicos baseados na plataforma
      const platformThresholds = {
        'shopee': {
          minQualityScore: 0.65,
          minRelevanceScore: 0.6,
          minValueScore: 0.6
        },
        'mercadolivre': {
          minQualityScore: 0.7,
          minRelevanceScore: 0.65,
          minValueScore: 0.65
        },
        'amazon': {
          minQualityScore: 0.7,
          minRelevanceScore: 0.7,
          minValueScore: 0.7
        },
        'aliexpress': {
          minQualityScore: 0.6,
          minRelevanceScore: 0.55,
          minValueScore: 0.6
        },
        'default': {
          minQualityScore: 0.65,
          minRelevanceScore: 0.6,
          minValueScore: 0.6
        }
      };

      // Usar thresholds da plataforma ou padrão
      const platform = config.platform?.toLowerCase() || 'default';
      const thresholds = platformThresholds[platform] || platformThresholds.default;

      // Permitir override manual
      const {
        minQualityScore = thresholds.minQualityScore,
        minRelevanceScore = thresholds.minRelevanceScore,
        minPriceScore = thresholds.minValueScore,
        requireGoodDeal = false,
        useAI = true
      } = config;

      if (!useAI) {
        return this.basicFilter(coupons, config);
      }

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Usando filtragem básica.');
        return this.basicFilter(coupons, config);
      }

      const results = {
        total: coupons.length,
        approved: [],
        rejected: [],
        needsReview: [],
        stats: {
          byQuality: { high: 0, medium: 0, low: 0 },
          byRelevance: { high: 0, medium: 0, low: 0 },
          byValue: { high: 0, medium: 0, low: 0 }
        }
      };

      // Analisar cada cupom
      for (const coupon of coupons) {
        try {
          let analysis = null;

          // Usar analisador específico da plataforma se disponível
          if (platform === 'shopee') {
            analysis = await shopeeAnalyzer.analyzeCoupon(coupon);
          } else {
            // Análise genérica
            analysis = await this.analyzeCouponGeneric(coupon);
          }

          // Análise de preço/valor
          const priceAnalysis = await priceAnalyzer.analyzePrice(
            {
              name: coupon.title || coupon.code,
              current_price: coupon.min_purchase || '0',
              original_price: coupon.min_purchase || '0',
              discount_percentage: coupon.discount_type === 'percentage' ? coupon.discount_value : 0,
              platform: coupon.platform || platform,
              category: coupon.category_id
            },
            []
          );

          // Decisão de aprovação
          const decision = this.makeDecision(analysis, priceAnalysis, {
            minQualityScore,
            minRelevanceScore,
            minPriceScore,
            requireGoodDeal
          });

          const result = {
            coupon,
            analysis: {
              coupon: analysis,
              price: priceAnalysis
            },
            decision
          };

          // Classificar resultado
          if (decision.approved) {
            results.approved.push(result);
          } else if (decision.needsReview) {
            results.needsReview.push(result);
          } else {
            results.rejected.push(result);
          }

          // Atualizar estatísticas
          this.updateStats(results.stats, analysis, priceAnalysis);

          // Pequeno delay para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          logger.error(`Erro ao filtrar cupom ${coupon.code}: ${error.message}`);
          // Em caso de erro, usar filtro básico
          const basicDecision = this.basicFilterDecision(coupon, config);
          if (basicDecision.approved) {
            results.approved.push({ coupon, decision: basicDecision, error: error.message });
          } else {
            results.rejected.push({ coupon, decision: basicDecision, error: error.message });
          }
        }
      }

      logger.info(`✅ Filtragem concluída: ${results.approved.length} aprovados, ${results.rejected.length} rejeitados, ${results.needsReview.length} precisam revisão`);

      return results;

    } catch (error) {
      logger.error(`❌ Erro na filtragem inteligente: ${error.message}`);
      return this.basicFilter(coupons, config);
    }
  }

  /**
   * Análise genérica de cupom
   */
  async analyzeCouponGeneric(coupon) {
    try {
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return this.getDefaultAnalysis(coupon);
      }

      const prompt = `Analise o cupom abaixo e retorne APENAS um JSON válido:

{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "value_score": 0.0-1.0,
  "should_promote": true | false,
  "confidence": 0.0-1.0
}

Cupom: ${coupon.code || 'N/A'}
Desconto: ${coupon.discount_value || 0}${coupon.discount_type === 'percentage' ? '%' : ' R$'}
Plataforma: ${coupon.platform || 'N/A'}

Retorne SOMENTE o JSON.`;

      const response = await openrouterClient.enqueueRequest(prompt);

      return {
        quality_score: this.normalizeScore(response.quality_score),
        relevance_score: this.normalizeScore(response.relevance_score),
        value_score: this.normalizeScore(response.value_score),
        should_promote: response.should_promote === true || response.should_promote === 'true',
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

    } catch (error) {
      logger.error(`Erro na análise genérica: ${error.message}`);
      return this.getDefaultAnalysis(coupon);
    }
  }

  /**
   * Tomar decisão baseada nas análises
   */
  makeDecision(couponAnalysis, priceAnalysis, thresholds) {
    const {
      minQualityScore,
      minRelevanceScore,
      minPriceScore,
      requireGoodDeal
    } = thresholds;

    const qualityOK = couponAnalysis.quality_score >= minQualityScore;
    const relevanceOK = couponAnalysis.relevance_score >= minRelevanceScore;
    const priceOK = priceAnalysis.price_score >= minPriceScore;
    const goodDealOK = !requireGoodDeal || priceAnalysis.is_good_deal;

    const approved = qualityOK && relevanceOK && priceOK && goodDealOK && couponAnalysis.should_promote;

    const needsReview = !approved && (
      (couponAnalysis.quality_score >= minQualityScore - 0.1) ||
      (couponAnalysis.relevance_score >= minRelevanceScore - 0.1) ||
      (priceAnalysis.price_score >= minPriceScore - 0.1)
    );

    return {
      approved,
      needsReview,
      rejected: !approved && !needsReview,
      reasons: {
        quality: qualityOK ? null : `Qualidade baixa (${couponAnalysis.quality_score.toFixed(2)})`,
        relevance: relevanceOK ? null : `Relevância baixa (${couponAnalysis.relevance_score.toFixed(2)})`,
        price: priceOK ? null : `Valor não competitivo (${priceAnalysis.price_score.toFixed(2)})`,
        goodDeal: goodDealOK ? null : 'Não é uma boa oportunidade',
        shouldPromote: couponAnalysis.should_promote ? null : 'IA não recomenda promoção'
      }
    };
  }

  /**
   * Atualizar estatísticas
   */
  updateStats(stats, couponAnalysis, priceAnalysis) {
    if (couponAnalysis.quality_score >= 0.7) stats.byQuality.high++;
    else if (couponAnalysis.quality_score >= 0.4) stats.byQuality.medium++;
    else stats.byQuality.low++;

    if (couponAnalysis.relevance_score >= 0.7) stats.byRelevance.high++;
    else if (couponAnalysis.relevance_score >= 0.4) stats.byRelevance.medium++;
    else stats.byRelevance.low++;

    if (priceAnalysis.price_score >= 0.7) stats.byValue.high++;
    else if (priceAnalysis.price_score >= 0.4) stats.byValue.medium++;
    else stats.byValue.low++;
  }

  /**
   * Filtro básico sem IA
   */
  basicFilter(coupons, config) {
    const {
      min_discount_percentage = 10,
      require_code = true
    } = config;

    const results = {
      total: coupons.length,
      approved: [],
      rejected: [],
      needsReview: [],
      stats: {
        byQuality: { high: 0, medium: 0, low: 0 },
        byRelevance: { high: 0, medium: 0, low: 0 },
        byValue: { high: 0, medium: 0, low: 0 }
      }
    };

    for (const coupon of coupons) {
      const decision = this.basicFilterDecision(coupon, config);
      const result = { coupon, decision };

      if (decision.approved) {
        results.approved.push(result);
      } else {
        results.rejected.push(result);
      }
    }

    return results;
  }

  /**
   * Decisão básica de filtro
   */
  basicFilterDecision(coupon, config) {
    const {
      min_discount_percentage = 10,
      require_code = true
    } = config;

    const hasCode = require_code ? (coupon.code && coupon.code.trim().length > 0) : true;
    const discount = coupon.discount_type === 'percentage' ? coupon.discount_value : 0;
    const hasGoodDiscount = discount >= min_discount_percentage;

    const approved = hasCode && hasGoodDiscount;

    return {
      approved,
      needsReview: false,
      rejected: !approved,
      reasons: {
        code: hasCode ? null : 'Código ausente',
        discount: hasGoodDiscount ? null : `Desconto abaixo de ${min_discount_percentage}%`
      }
    };
  }

  /**
   * Análise padrão
   */
  getDefaultAnalysis(coupon) {
    const discount = coupon.discount_value || 0;
    const hasGoodDiscount = discount >= 10;
    const hasCode = coupon.code && coupon.code.trim().length > 0;

    return {
      quality_score: hasCode ? 0.7 : 0.3,
      relevance_score: 0.5,
      value_score: hasGoodDiscount ? 0.8 : 0.5,
      should_promote: hasGoodDiscount && hasCode,
      confidence: 0.5
    };
  }

  /**
   * Normalizar score
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
   * Calcular score composto ponderado
   * Diferentes aspectos têm pesos diferentes
   * @param {Object} analysis - Análise do cupom
   * @returns {Object} - Score composto e grade
   */
  calculateCompositeScore(analysis) {
    const weights = {
      quality: 0.35,    // 35% - Qualidade do cupom
      value: 0.40,      // 40% - Valor do desconto (mais importante)
      relevance: 0.25   // 25% - Relevância
    };

    const compositeScore =
      (analysis.quality_score * weights.quality) +
      (analysis.value_score * weights.value) +
      (analysis.relevance_score * weights.relevance);

    return {
      composite_score: compositeScore,
      grade: this.getGrade(compositeScore),
      auto_approve: compositeScore >= 0.75 && analysis.should_promote
    };
  }

  /**
   * Converter score em grade (A-F)
   * @param {number} score - Score de 0.0 a 1.0
   * @returns {string} - Grade
   */
  getGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.85) return 'A';
    if (score >= 0.8) return 'A-';
    if (score >= 0.75) return 'B+';
    if (score >= 0.7) return 'B';
    if (score >= 0.65) return 'B-';
    if (score >= 0.6) return 'C+';
    if (score >= 0.55) return 'C';
    if (score >= 0.5) return 'C-';
    if (score >= 0.4) return 'D';
    return 'F';
  }
}

export default new CouponIntelligentFilter();









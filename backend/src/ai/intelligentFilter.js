/**
 * Filtro Inteligente de Produtos com IA
 * Usa IA para decidir quais produtos são relevantes e devem ser publicados
 */
import logger from '../config/logger.js';
import productAnalyzer from './productAnalyzer.js';
import priceAnalyzer from './priceAnalyzer.js';

class IntelligentFilter {
  /**
   * Filtrar produtos usando IA
   * @param {Array} products - Array de produtos a filtrar
   * @param {Object} config - Configuração de filtragem
   * @returns {Promise<Object>} - Resultado da filtragem
   */
  async filterProducts(products, config = {}) {
    try {
      logger.info(`🤖 Filtrando ${products.length} produtos com IA...`);

      const {
        minQualityScore = 0.6,
        minRelevanceScore = 0.5,
        minPriceScore = 0.5,
        requireGoodDeal = false,
        useAI = true
      } = config;

      if (!useAI) {
        // Filtro básico sem IA
        return this.basicFilter(products, config);
      }

      const results = {
        total: products.length,
        approved: [],
        rejected: [],
        needsReview: [],
        stats: {
          byQuality: { high: 0, medium: 0, low: 0 },
          byRelevance: { high: 0, medium: 0, low: 0 },
          byPrice: { high: 0, medium: 0, low: 0 }
        }
      };

      // Analisar cada produto
      for (const product of products) {
        try {
          // Análise de qualidade e relevância
          const productAnalysis = await productAnalyzer.analyzeProduct(product);

          // Análise de preço
          const priceAnalysis = await priceAnalyzer.analyzePrice(product);

          // Decisão de aprovação
          const decision = this.makeDecision(productAnalysis, priceAnalysis, {
            minQualityScore,
            minRelevanceScore,
            minPriceScore,
            requireGoodDeal
          });

          const result = {
            product,
            analysis: {
              product: productAnalysis,
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
          this.updateStats(results.stats, productAnalysis, priceAnalysis);

          // Pequeno delay para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          logger.error(`Erro ao filtrar produto ${product.id}: ${error.message}`);
          // Em caso de erro, usar filtro básico
          const basicDecision = this.basicFilterDecision(product, config);
          if (basicDecision.approved) {
            results.approved.push({ product, decision: basicDecision, error: error.message });
          } else {
            results.rejected.push({ product, decision: basicDecision, error: error.message });
          }
        }
      }

      logger.info(`✅ Filtragem concluída: ${results.approved.length} aprovados, ${results.rejected.length} rejeitados, ${results.needsReview.length} precisam revisão`);

      return results;

    } catch (error) {
      logger.error(`❌ Erro na filtragem inteligente: ${error.message}`);
      // Fallback para filtro básico
      return this.basicFilter(products, config);
    }
  }

  /**
   * Tomar decisão baseada nas análises
   */
  makeDecision(productAnalysis, priceAnalysis, thresholds) {
    const {
      minQualityScore,
      minRelevanceScore,
      minPriceScore,
      requireGoodDeal
    } = thresholds;

    const qualityOK = productAnalysis.quality_score >= minQualityScore;
    const relevanceOK = productAnalysis.relevance_score >= minRelevanceScore;
    const priceOK = priceAnalysis.price_score >= minPriceScore;
    const goodDealOK = !requireGoodDeal || priceAnalysis.is_good_deal;

    // Aprovado se passar em todos os critérios
    const approved = qualityOK && relevanceOK && priceOK && goodDealOK && productAnalysis.should_publish;

    // Precisa revisão se estiver próximo dos thresholds
    const needsReview = !approved && (
      (productAnalysis.quality_score >= minQualityScore - 0.1) ||
      (productAnalysis.relevance_score >= minRelevanceScore - 0.1) ||
      (priceAnalysis.price_score >= minPriceScore - 0.1)
    );

    return {
      approved,
      needsReview,
      rejected: !approved && !needsReview,
      reasons: {
        quality: qualityOK ? null : `Qualidade baixa (${productAnalysis.quality_score.toFixed(2)})`,
        relevance: relevanceOK ? null : `Relevância baixa (${productAnalysis.relevance_score.toFixed(2)})`,
        price: priceOK ? null : `Preço não competitivo (${priceAnalysis.price_score.toFixed(2)})`,
        goodDeal: goodDealOK ? null : 'Não é uma boa oportunidade',
        shouldPublish: productAnalysis.should_publish ? null : 'IA não recomenda publicação'
      }
    };
  }

  /**
   * Atualizar estatísticas
   */
  updateStats(stats, productAnalysis, priceAnalysis) {
    // Qualidade
    if (productAnalysis.quality_score >= 0.7) stats.byQuality.high++;
    else if (productAnalysis.quality_score >= 0.4) stats.byQuality.medium++;
    else stats.byQuality.low++;

    // Relevância
    if (productAnalysis.relevance_score >= 0.7) stats.byRelevance.high++;
    else if (productAnalysis.relevance_score >= 0.4) stats.byRelevance.medium++;
    else stats.byRelevance.low++;

    // Preço
    if (priceAnalysis.price_score >= 0.7) stats.byPrice.high++;
    else if (priceAnalysis.price_score >= 0.4) stats.byPrice.medium++;
    else stats.byPrice.low++;
  }

  /**
   * Filtro básico sem IA
   */
  basicFilter(products, config) {
    const {
      min_discount_percentage = 10,
      require_name = true,
      require_price = true
    } = config;

    const results = {
      total: products.length,
      approved: [],
      rejected: [],
      needsReview: [],
      stats: {
        byQuality: { high: 0, medium: 0, low: 0 },
        byRelevance: { high: 0, medium: 0, low: 0 },
        byPrice: { high: 0, medium: 0, low: 0 }
      }
    };

    for (const product of products) {
      const decision = this.basicFilterDecision(product, config);
      const result = { product, decision };

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
  basicFilterDecision(product, config) {
    const {
      min_discount_percentage = 10,
      require_name = true,
      require_price = true
    } = config;

    const hasName = require_name ? (product.name && product.name.trim().length > 0) : true;
    const hasPrice = require_price ? (product.current_price && parseFloat(product.current_price) > 0) : true;
    const hasGoodDiscount = (product.discount_percentage || 0) >= min_discount_percentage;

    const approved = hasName && hasPrice && hasGoodDiscount;

    return {
      approved,
      needsReview: false,
      rejected: !approved,
      reasons: {
        name: hasName ? null : 'Nome do produto ausente',
        price: hasPrice ? null : 'Preço ausente',
        discount: hasGoodDiscount ? null : `Desconto abaixo de ${min_discount_percentage}%`
      }
    };
  }
}

export default new IntelligentFilter();









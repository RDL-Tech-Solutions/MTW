/**
 * Analisador em Lote de Cupons com IA
 * Analisa múltiplos cupons de forma eficiente
 */
import logger from '../config/logger.js';
import shopeeAnalyzer from './shopeeAnalyzer.js';
import couponIntelligentFilter from './couponIntelligentFilter.js';
import openrouterClient from './openrouterClient.js';

class CouponBatchAnalyzer {
  /**
   * Analisar múltiplos cupons em lote
   * @param {Array} coupons - Array de cupons
   * @param {Object} options - Opções de análise
   * @returns {Promise<Array>} - Array de análises
   */
  async analyzeBatch(coupons, options = {}) {
    try {
      logger.info(`🤖 Analisando ${coupons.length} cupons em lote...`);

      const {
        platform = null,
        includeSuggestions = true,
        maxConcurrent = 5
      } = options;

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando análises padrão.');
        return coupons.map(c => ({
          coupon: c,
          analysis: this.getDefaultAnalysis(c),
          error: 'IA não habilitada'
        }));
      }

      const analyses = [];
      const batches = this.chunkArray(coupons, maxConcurrent);

      for (const batch of batches) {
        const batchPromises = batch.map(coupon => 
          this.analyzeSingle(coupon, platform, includeSuggestions)
            .catch(error => ({
              coupon,
              analysis: this.getDefaultAnalysis(coupon),
              error: error.message
            }))
        );

        const batchResults = await Promise.all(batchPromises);
        analyses.push(...batchResults);

        // Delay entre batches para evitar rate limit
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`✅ Análise em lote concluída: ${analyses.length} cupons analisados`);

      return analyses;

    } catch (error) {
      logger.error(`❌ Erro na análise em lote: ${error.message}`);
      return coupons.map(c => ({
        coupon: c,
        analysis: this.getDefaultAnalysis(c),
        error: error.message
      }));
    }
  }

  /**
   * Analisar um único cupom
   */
  async analyzeSingle(coupon, platform, includeSuggestions) {
    try {
      let analysis = null;

      if (platform === 'shopee') {
        analysis = await shopeeAnalyzer.analyzeCoupon(coupon);
      } else {
        analysis = await couponIntelligentFilter.analyzeCouponGeneric(coupon);
      }

      return {
        coupon,
        analysis,
        error: null
      };

    } catch (error) {
      logger.error(`Erro ao analisar cupom ${coupon.code}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filtrar cupons baseado em análise em lote
   */
  async filterByAnalysis(coupons, minScore = 0.7) {
    try {
      const analyses = await this.analyzeBatch(coupons);

      const filtered = analyses
        .filter(result => {
          if (result.error) return false;
          const score = result.analysis.quality_score || 0;
          return score >= minScore && result.analysis.should_promote;
        })
        .map(result => result.coupon);

      logger.info(`✅ Filtragem por análise: ${filtered.length} de ${coupons.length} cupons aprovados`);

      return filtered;

    } catch (error) {
      logger.error(`❌ Erro na filtragem por análise: ${error.message}`);
      return coupons;
    }
  }

  /**
   * Gerar relatório de análise
   */
  async generateReport(coupons) {
    try {
      const analyses = await this.analyzeBatch(coupons);

      const report = {
        total: coupons.length,
        analyzed: analyses.filter(a => !a.error).length,
        errors: analyses.filter(a => a.error).length,
        stats: {
          high_quality: 0,
          medium_quality: 0,
          low_quality: 0,
          should_promote: 0,
          should_not_promote: 0
        },
        top_coupons: [],
        issues: []
      };

      for (const result of analyses) {
        if (result.error) continue;

        const score = result.analysis.quality_score || 0;
        if (score >= 0.7) report.stats.high_quality++;
        else if (score >= 0.4) report.stats.medium_quality++;
        else report.stats.low_quality++;

        if (result.analysis.should_promote) {
          report.stats.should_promote++;
          report.top_coupons.push({
            code: result.coupon.code,
            score: score,
            title: result.coupon.title
          });
        } else {
          report.stats.should_not_promote++;
        }

        if (result.analysis.issues && result.analysis.issues.length > 0) {
          report.issues.push({
            code: result.coupon.code,
            issues: result.analysis.issues
          });
        }
      }

      // Ordenar top cupons por score
      report.top_coupons.sort((a, b) => b.score - a.score);
      report.top_coupons = report.top_coupons.slice(0, 10);

      return report;

    } catch (error) {
      logger.error(`❌ Erro ao gerar relatório: ${error.message}`);
      return null;
    }
  }

  /**
   * Dividir array em chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
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
      confidence: 0.5,
      issues: !hasCode ? ['Código ausente'] : [],
      strengths: hasGoodDiscount ? ['Desconto atrativo'] : []
    };
  }
}

export default new CouponBatchAnalyzer();









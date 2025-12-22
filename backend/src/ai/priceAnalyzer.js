/**
 * Analisador de Preços com IA
 * Analisa se o preço é competitivo e sugere otimizações
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class PriceAnalyzer {
  /**
   * Gerar prompt para análise de preço
   * @param {Object} product - Dados do produto
   * @param {Array} similarProducts - Produtos similares (opcional)
   * @returns {string} - Prompt formatado
   */
  generatePriceAnalysisPrompt(product, similarProducts = []) {
    let similarProductsText = '';
    if (similarProducts.length > 0) {
      similarProductsText = '\n\nProdutos Similares para Comparação:\n';
      similarProducts.slice(0, 5).forEach((p, i) => {
        similarProductsText += `${i + 1}. ${p.name} - ${p.current_price} (${p.discount_percentage || 0}% OFF)\n`;
      });
    }

    return `Você é um especialista em análise de preços para e-commerce.

Analise o preço do produto abaixo e retorne APENAS um JSON válido.

Dados do Produto:
- Nome: ${product.name || 'N/A'}
- Preço Atual: ${product.current_price || 'N/A'}
- Preço Original: ${product.original_price || 'N/A'}
- Desconto: ${product.discount_percentage || 0}%
- Plataforma: ${product.platform || 'N/A'}
- Categoria: ${product.category || 'N/A'}${similarProductsText}

Formato obrigatório do JSON:
{
  "price_score": 0.0-1.0,
  "is_competitive": true | false,
  "is_good_deal": true | false,
  "suggested_price": "string | null",
  "price_trend": "increasing | decreasing | stable | unknown",
  "recommendation": "buy_now | wait | avoid",
  "reasoning": "string",
  "confidence": 0.0-1.0
}

Regras:
- price_score: Avalie qualidade do preço (0.0 = muito caro, 1.0 = excelente preço)
- is_competitive: Se o preço é competitivo comparado ao mercado
- is_good_deal: Se é uma boa oportunidade de compra
- suggested_price: Preço sugerido se houver (formato: "R$ X,XX" ou null)
- price_trend: Tendência do preço (aumentando, diminuindo, estável, desconhecido)
- recommendation: Recomendação (buy_now = comprar agora, wait = esperar, avoid = evitar)
- reasoning: Explicação breve da análise (máximo 100 caracteres)
- confidence: Confiança na análise (0.0-1.0)

Retorne SOMENTE o JSON, sem explicações ou markdown.`;
  }

  /**
   * Analisar preço do produto
   * @param {Object} product - Dados do produto
   * @param {Array} similarProducts - Produtos similares (opcional)
   * @returns {Promise<Object>} - Análise de preço
   */
  async analyzePrice(product, similarProducts = []) {
    try {
      logger.info(`🤖 Analisando preço via IA: ${product.name?.substring(0, 50)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando análise padrão.');
        return this.getDefaultAnalysis(product);
      }

      // Gerar prompt
      const prompt = this.generatePriceAnalysisPrompt(product, similarProducts);

      // Fazer requisição para OpenRouter
      const response = await openrouterClient.makeRequest(prompt);

      // Validar e normalizar resposta
      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      const analysis = {
        price_score: this.normalizeScore(response.price_score),
        is_competitive: response.is_competitive === true || response.is_competitive === 'true',
        is_good_deal: response.is_good_deal === true || response.is_good_deal === 'true',
        suggested_price: response.suggested_price || null,
        price_trend: this.normalizeTrend(response.price_trend),
        recommendation: this.normalizeRecommendation(response.recommendation),
        reasoning: response.reasoning || 'Análise de preço realizada',
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

      logger.info(`✅ Análise de preço concluída: ${analysis.recommendation}, score=${analysis.price_score.toFixed(2)}`);

      return analysis;

    } catch (error) {
      logger.error(`❌ Erro ao analisar preço: ${error.message}`);
      return this.getDefaultAnalysis(product);
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
   * Normalizar tendência de preço
   */
  normalizeTrend(trend) {
    const validTrends = ['increasing', 'decreasing', 'stable', 'unknown'];
    if (validTrends.includes(trend)) {
      return trend;
    }
    return 'unknown';
  }

  /**
   * Normalizar recomendação
   */
  normalizeRecommendation(rec) {
    const validRecs = ['buy_now', 'wait', 'avoid'];
    if (validRecs.includes(rec)) {
      return rec;
    }
    return 'buy_now'; // Default
  }

  /**
   * Análise padrão quando IA não está disponível
   */
  getDefaultAnalysis(product) {
    const discount = product.discount_percentage || 0;
    const hasGoodDiscount = discount >= 15;
    const hasPrice = product.current_price && parseFloat(product.current_price.replace(/[^\d,]/g, '').replace(',', '.')) > 0;

    return {
      price_score: hasGoodDiscount ? 0.8 : 0.5,
      is_competitive: hasGoodDiscount,
      is_good_deal: hasGoodDiscount && hasPrice,
      suggested_price: null,
      price_trend: 'unknown',
      recommendation: hasGoodDiscount ? 'buy_now' : 'wait',
      reasoning: hasGoodDiscount ? 'Desconto atrativo' : 'Avaliar melhor',
      confidence: 0.5
    };
  }
}

export default new PriceAnalyzer();







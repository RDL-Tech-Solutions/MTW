/**
 * Analisador de Cupons e Produtos Shopee com IA
 * Analisa qualidade, relevância e otimiza cupons/produtos da Shopee
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class ShopeeAnalyzer {
  /**
   * Analisar cupom Shopee usando IA
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<Object>} - Análise do cupom
   */
  async analyzeCoupon(coupon) {
    try {
      logger.info(`🤖 Analisando cupom Shopee via IA: ${coupon.code || 'N/A'}...`);

      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return this.getDefaultCouponAnalysis(coupon);
      }

      const prompt = `Você é um especialista em análise de cupons de desconto para e-commerce.

Analise o cupom da Shopee abaixo e retorne APENAS um JSON válido.

Dados do Cupom:
- Código: ${coupon.code || 'N/A'}
- Título: ${coupon.title || 'N/A'}
- Desconto: ${coupon.discount_value || 0}${coupon.discount_type === 'percentage' ? '%' : ' R$'}
- Compra Mínima: ${coupon.min_purchase || 0} R$
- Desconto Máximo: ${coupon.max_discount || 'N/A'} R$
- Válido até: ${coupon.valid_until || 'N/A'}
- Plataforma: Shopee

Formato obrigatório do JSON:
{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "value_score": 0.0-1.0,
  "is_attractive": true | false,
  "should_promote": true | false,
  "target_audience": "string",
  "suggested_title": "string | null",
  "suggested_description": "string | null",
  "issues": ["string"],
  "strengths": ["string"],
  "confidence": 0.0-1.0
}

Regras:
- quality_score: Qualidade geral do cupom (0.0-1.0)
- relevance_score: Relevância para o público (0.0-1.0)
- value_score: Valor do desconto (0.0-1.0)
- is_attractive: Se o cupom é atrativo
- should_promote: Se deve ser promovido
- target_audience: Público-alvo sugerido
- suggested_title: Título otimizado (ou null)
- suggested_description: Descrição otimizada (ou null)
- issues: Problemas encontrados
- strengths: Pontos fortes
- confidence: Confiança na análise (0.0-1.0)

Retorne SOMENTE o JSON, sem explicações ou markdown.`;

      const response = await openrouterClient.makeRequest(prompt);

      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      const analysis = {
        quality_score: this.normalizeScore(response.quality_score),
        relevance_score: this.normalizeScore(response.relevance_score),
        value_score: this.normalizeScore(response.value_score),
        is_attractive: response.is_attractive === true || response.is_attractive === 'true',
        should_promote: response.should_promote === true || response.should_promote === 'true',
        target_audience: response.target_audience || 'Geral',
        suggested_title: response.suggested_title || null,
        suggested_description: response.suggested_description || null,
        issues: Array.isArray(response.issues) ? response.issues : [],
        strengths: Array.isArray(response.strengths) ? response.strengths : [],
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

      logger.info(`✅ Análise concluída: should_promote=${analysis.should_promote}, confidence=${analysis.confidence.toFixed(2)}`);

      return analysis;

    } catch (error) {
      logger.error(`❌ Erro ao analisar cupom Shopee: ${error.message}`);
      return this.getDefaultCouponAnalysis(coupon);
    }
  }

  /**
   * Analisar produto Shopee usando IA
   * @param {Object} product - Dados do produto
   * @returns {Promise<Object>} - Análise do produto
   */
  async analyzeProduct(product) {
    try {
      logger.info(`🤖 Analisando produto Shopee via IA: ${product.title?.substring(0, 50)}...`);

      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return this.getDefaultProductAnalysis(product);
      }

      const prompt = `Você é um especialista em análise de produtos para e-commerce.

Analise o produto da Shopee abaixo e retorne APENAS um JSON válido.

Dados do Produto:
- Nome: ${product.title || product.name || 'N/A'}
- Preço: R$ ${product.price || product.current_price || 'N/A'}
- Preço Original: R$ ${product.original_price || product.old_price || 'N/A'}
- Desconto: ${product.discount_percentage || 0}%
- Categoria: ${product.category_id || 'N/A'}
- Estoque: ${product.available_quantity || product.stock || 'N/A'}

Formato obrigatório do JSON:
{
  "quality_score": 0.0-1.0,
  "price_score": 0.0-1.0,
  "discount_score": 0.0-1.0,
  "is_good_deal": true | false,
  "should_promote": true | false,
  "suggested_category": "string | null",
  "suggested_keywords": ["string"],
  "issues": ["string"],
  "strengths": ["string"],
  "confidence": 0.0-1.0
}

Retorne SOMENTE o JSON, sem explicações ou markdown.`;

      const response = await openrouterClient.makeRequest(prompt);

      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      const analysis = {
        quality_score: this.normalizeScore(response.quality_score),
        price_score: this.normalizeScore(response.price_score),
        discount_score: this.normalizeScore(response.discount_score),
        is_good_deal: response.is_good_deal === true || response.is_good_deal === 'true',
        should_promote: response.should_promote === true || response.should_promote === 'true',
        suggested_category: response.suggested_category || null,
        suggested_keywords: Array.isArray(response.suggested_keywords) ? response.suggested_keywords : [],
        issues: Array.isArray(response.issues) ? response.issues : [],
        strengths: Array.isArray(response.strengths) ? response.strengths : [],
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

      logger.info(`✅ Análise concluída: should_promote=${analysis.should_promote}`);

      return analysis;

    } catch (error) {
      logger.error(`❌ Erro ao analisar produto Shopee: ${error.message}`);
      return this.getDefaultProductAnalysis(product);
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
   * Análise padrão de cupom
   */
  getDefaultCouponAnalysis(coupon) {
    const discount = coupon.discount_value || 0;
    const hasGoodDiscount = discount >= 10;
    const hasCode = coupon.code && coupon.code.trim().length > 0;

    return {
      quality_score: hasCode ? 0.7 : 0.3,
      relevance_score: 0.5,
      value_score: hasGoodDiscount ? 0.8 : 0.5,
      is_attractive: hasGoodDiscount && hasCode,
      should_promote: hasGoodDiscount && hasCode,
      target_audience: 'Geral',
      suggested_title: null,
      suggested_description: null,
      issues: !hasCode ? ['Código ausente'] : !hasGoodDiscount ? ['Desconto baixo'] : [],
      strengths: hasGoodDiscount ? ['Desconto atrativo'] : [],
      confidence: 0.5
    };
  }

  /**
   * Análise padrão de produto
   */
  getDefaultProductAnalysis(product) {
    const discount = product.discount_percentage || 0;
    const hasGoodDiscount = discount >= 10;
    const hasPrice = product.price || product.current_price;

    return {
      quality_score: hasPrice ? 0.7 : 0.3,
      price_score: hasGoodDiscount ? 0.8 : 0.5,
      discount_score: hasGoodDiscount ? 0.8 : 0.5,
      is_good_deal: hasGoodDiscount && hasPrice,
      should_promote: hasGoodDiscount && hasPrice,
      suggested_category: null,
      suggested_keywords: [],
      issues: !hasPrice ? ['Preço ausente'] : !hasGoodDiscount ? ['Desconto baixo'] : [],
      strengths: hasGoodDiscount ? ['Desconto atrativo'] : [],
      confidence: 0.5
    };
  }
}

export default new ShopeeAnalyzer();







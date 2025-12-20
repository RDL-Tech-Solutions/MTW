/**
 * Analisador de Produtos com IA
 * Analisa qualidade, relevância, categorização e sugere melhorias
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class ProductAnalyzer {
  /**
   * Gerar prompt para análise de produto
   * @param {Object} product - Dados do produto
   * @returns {string} - Prompt formatado
   */
  generateAnalysisPrompt(product) {
    return `Você é um especialista em análise de produtos para e-commerce.

Analise o produto abaixo e retorne APENAS um JSON válido com a análise.

Dados do Produto:
- Nome: ${product.name || 'N/A'}
- Preço: ${product.current_price || 'N/A'}
- Preço Original: ${product.original_price || 'N/A'}
- Desconto: ${product.discount_percentage || 0}%
- Plataforma: ${product.platform || 'N/A'}
- Descrição: ${product.description || 'N/A'}
- Categoria: ${product.category || 'N/A'}

Formato obrigatório do JSON:
{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "price_score": 0.0-1.0,
  "is_relevant": true | false,
  "should_publish": true | false,
  "suggested_category": "string | null",
  "suggested_keywords": ["string"],
  "issues": ["string"],
  "strengths": ["string"],
  "confidence": 0.0-1.0
}

Regras:
- quality_score: Avalie qualidade geral (0.0 = ruim, 1.0 = excelente)
- relevance_score: Avalie relevância para o público (0.0 = irrelevante, 1.0 = muito relevante)
- price_score: Avalie se o preço é competitivo (0.0 = caro, 1.0 = excelente preço)
- is_relevant: Se o produto é relevante para o catálogo
- should_publish: Se deve ser publicado (considera qualidade, preço, relevância)
- suggested_category: Categoria sugerida se a atual estiver incorreta
- suggested_keywords: Array de keywords sugeridas para melhorar busca
- issues: Array de problemas encontrados (ex: ["preço alto", "descrição vazia"])
- strengths: Array de pontos fortes (ex: ["desconto alto", "produto popular"])
- confidence: Confiança na análise (0.0-1.0)

Retorne SOMENTE o JSON, sem explicações ou markdown.`;
  }

  /**
   * Analisar produto usando IA
   * @param {Object} product - Dados do produto
   * @returns {Promise<Object>} - Análise do produto
   */
  async analyzeProduct(product) {
    try {
      logger.info(`🤖 Analisando produto via IA: ${product.name?.substring(0, 50)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando análise padrão.');
        return this.getDefaultAnalysis(product);
      }

      // Gerar prompt
      const prompt = this.generateAnalysisPrompt(product);

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
        price_score: this.normalizeScore(response.price_score),
        is_relevant: response.is_relevant === true || response.is_relevant === 'true',
        should_publish: response.should_publish === true || response.should_publish === 'true',
        suggested_category: response.suggested_category || null,
        suggested_keywords: Array.isArray(response.suggested_keywords) 
          ? response.suggested_keywords 
          : [],
        issues: Array.isArray(response.issues) ? response.issues : [],
        strengths: Array.isArray(response.strengths) ? response.strengths : [],
        confidence: this.normalizeScore(response.confidence || 0.5)
      };

      logger.info(`✅ Análise concluída: should_publish=${analysis.should_publish}, confidence=${analysis.confidence.toFixed(2)}`);

      return analysis;

    } catch (error) {
      logger.error(`❌ Erro ao analisar produto: ${error.message}`);
      // Retornar análise padrão em caso de erro
      return this.getDefaultAnalysis(product);
    }
  }

  /**
   * Normalizar score para garantir que está entre 0 e 1
   * @param {any} score - Score a normalizar
   * @returns {number} - Score normalizado (0-1)
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
    return 0.5; // Default
  }

  /**
   * Análise padrão quando IA não está disponível
   * @param {Object} product - Dados do produto
   * @returns {Object} - Análise padrão
   */
  getDefaultAnalysis(product) {
    const discount = product.discount_percentage || 0;
    const hasGoodDiscount = discount >= 10;
    const hasName = product.name && product.name.trim().length > 0;
    const hasPrice = product.current_price && parseFloat(product.current_price) > 0;

    return {
      quality_score: hasName && hasPrice ? 0.7 : 0.3,
      relevance_score: 0.5,
      price_score: hasGoodDiscount ? 0.8 : 0.5,
      is_relevant: hasName && hasPrice,
      should_publish: hasName && hasPrice && hasGoodDiscount,
      suggested_category: null,
      suggested_keywords: [],
      issues: !hasName ? ['Nome do produto ausente'] : !hasPrice ? ['Preço ausente'] : [],
      strengths: hasGoodDiscount ? ['Desconto atrativo'] : [],
      confidence: 0.5
    };
  }

  /**
   * Analisar múltiplos produtos em lote
   * @param {Array} products - Array de produtos
   * @returns {Promise<Array>} - Array de análises
   */
  async analyzeBatch(products) {
    const analyses = [];
    for (const product of products) {
      try {
        const analysis = await this.analyzeProduct(product);
        analyses.push({
          product_id: product.id,
          product_name: product.name,
          analysis
        });
        // Pequeno delay para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error(`Erro ao analisar produto ${product.id}: ${error.message}`);
        analyses.push({
          product_id: product.id,
          product_name: product.name,
          analysis: this.getDefaultAnalysis(product),
          error: error.message
        });
      }
    }
    return analyses;
  }
}

export default new ProductAnalyzer();





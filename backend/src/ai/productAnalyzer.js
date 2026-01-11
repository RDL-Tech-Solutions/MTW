/**
 * Analisador de Produtos com IA
 * OTIMIZADO para compatibilidade com modelos gratuitos e pagos
 * 
 * Modelos testados:
 * - google/gemini-flash-1.5 (FREE) ⭐
 * - mistralai/mixtral-8x7b-instruct (FREE)
 * - openai/gpt-4o-mini (PAID)
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class ProductAnalyzer {
  /**
   * Gerar prompt OTIMIZADO para análise de produto
   * Formato simplificado para melhor compatibilidade
   */
  generateAnalysisPrompt(product) {
    // Limitar tamanho dos campos
    const name = (product.name || 'N/A').substring(0, 200);
    const description = (product.description || '').substring(0, 300);
    const discount = product.discount_percentage || 0;
    const price = product.current_price || 0;

    return `Analise este produto para e-commerce no Brasil e retorne APENAS JSON.

PRODUTO:
- Nome: ${name}
- Preço: R$ ${price}
- Desconto: ${discount}%
- Plataforma: ${product.platform || 'N/A'}
${description ? `- Descrição: ${description}` : ''}

CONTEXTO:
O objetivo é identificar produtos com alto potencial de engajamento para grupos de ofertas no Telegram e WhatsApp.

RETORNE APENAS ESTE JSON:
{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "price_score": 0.0-1.0,
  "viral_potential": 0.0-1.0,
  "trend_alignment": "Alta" | "Média" | "Baixa",
  "is_relevant": true ou false,
  "should_publish": true ou false,
  "suggested_category": "categoria",
  "issues": ["problema1"],
  "strengths": ["ponto forte1"],
  "confidence": 0.0-1.0
}

CRITÉRIOS:
- viral_potential: Alto se for produto curioso, inovador, preço bug (erro) ou desejo de consumo imediato.
- should_publish: true se quality >= 0.7 E (price_score >= 0.6 OU viral_potential >= 0.7).
- trend_alignment: Avalie se o produto conecta com tendências atuais ou sazonais.

EXEMPLO:
{"quality_score":0.8, "relevance_score":0.9, "price_score":0.9, "viral_potential":0.85, "trend_alignment":"Alta", "is_relevant":true, "should_publish":true, "suggested_category":"Eletrônicos", "issues":[], "strengths":["Preço histórico", "Produto tendência"], "confidence":0.9}

Retorne APENAS o JSON:`;
  }

  /**
   * Analisar produto usando IA
   */
  async analyzeProduct(product) {
    try {
      logger.info(`🤖 Analisando produto: ${product.name?.substring(0, 50)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não habilitada. Usando análise padrão.');
        return this.getDefaultAnalysis(product);
      }

      // Gerar prompt
      const prompt = this.generateAnalysisPrompt(product);

      // Fazer requisição
      const response = await openrouterClient.enqueueRequest(prompt);

      // Validar resposta
      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      // Normalizar resposta
      const analysis = this.normalizeAnalysis(response, product);

      logger.info(`✅ Análise: should_publish=${analysis.should_publish}, confidence=${analysis.confidence.toFixed(2)}`);

      return analysis;

    } catch (error) {
      // Erros críticos que devem parar o processamento
      const criticalErrors = [
        'OpenRouter API Key inválida',
        'Rate limit',
        'Créditos insuficientes',
        'OpenRouter está desabilitado'
      ];

      if (criticalErrors.some(msg => error.message?.includes(msg))) {
        throw error;
      }

      logger.error(`❌ Erro na análise: ${error.message}`);
      return this.getDefaultAnalysis(product);
    }
  }

  /**
   * Normalizar resposta da IA
   */
  normalizeAnalysis(response, product) {
    return {
      quality_score: this.normalizeScore(response.quality_score),
      relevance_score: this.normalizeScore(response.relevance_score),
      price_score: this.normalizeScore(response.price_score),
      viral_potential: this.normalizeScore(response.viral_potential),
      trend_alignment: response.trend_alignment || 'Baixa',
      is_relevant: this.normalizeBoolean(response.is_relevant),
      should_publish: this.normalizeBoolean(response.should_publish),
      suggested_category: response.suggested_category || null,
      suggested_keywords: Array.isArray(response.suggested_keywords)
        ? response.suggested_keywords
        : [],
      issues: Array.isArray(response.issues) ? response.issues : [],
      strengths: Array.isArray(response.strengths) ? response.strengths : [],
      confidence: this.normalizeScore(response.confidence || 0.5)
    };
  }

  /**
   * Normalizar score para 0-1
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
   * Normalizar boolean
   */
  normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return false;
  }

  /**
   * Análise padrão quando IA não está disponível
   */
  getDefaultAnalysis(product) {
    const discount = product.discount_percentage || 0;
    const hasGoodDiscount = discount >= 10;
    const hasName = product.name && product.name.trim().length > 0;
    const hasPrice = product.current_price && parseFloat(product.current_price) > 0;

    const qualityScore = hasName && hasPrice ? 0.7 : 0.3;
    const priceScore = hasGoodDiscount ? 0.8 : 0.5;
    const shouldPublish = hasName && hasPrice && hasGoodDiscount;

    return {
      quality_score: qualityScore,
      relevance_score: 0.5,
      price_score: priceScore,
      viral_potential: hasGoodDiscount ? 0.6 : 0.3,
      trend_alignment: 'Baixa',
      is_relevant: hasName && hasPrice,
      should_publish: shouldPublish,
      suggested_category: null,
      suggested_keywords: [],
      issues: this.detectIssues(product),
      strengths: this.detectStrengths(product),
      confidence: 0.5
    };
  }

  /**
   * Detectar problemas básicos
   */
  detectIssues(product) {
    const issues = [];
    if (!product.name || product.name.trim().length === 0) {
      issues.push('Nome ausente');
    }
    if (!product.current_price || parseFloat(product.current_price) <= 0) {
      issues.push('Preço inválido');
    }
    if (!product.image_url) {
      issues.push('Sem imagem');
    }
    return issues;
  }

  /**
   * Detectar pontos fortes básicos
   */
  detectStrengths(product) {
    const strengths = [];
    const discount = product.discount_percentage || 0;
    if (discount >= 30) {
      strengths.push('Desconto excelente');
    } else if (discount >= 20) {
      strengths.push('Bom desconto');
    } else if (discount >= 10) {
      strengths.push('Desconto atrativo');
    }
    return strengths;
  }

  /**
   * Analisar múltiplos produtos em lote
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

        // Delay para evitar rate limit (1 segundo entre requisições)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Erro no produto ${product.id}: ${error.message}`);
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

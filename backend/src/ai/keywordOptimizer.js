/**
 * Otimizador de Keywords com IA
 * Sugere keywords melhores baseado em tendências e análise semântica
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class KeywordOptimizer {
  /**
   * Gerar prompt para otimização de keywords
   * @param {string} currentKeywords - Keywords atuais
   * @param {string} productName - Nome do produto
   * @param {string} category - Categoria do produto
   * @returns {string} - Prompt formatado
   */
  generateOptimizationPrompt(currentKeywords, productName, category = '') {
    return `Você é um especialista em SEO e marketing digital para e-commerce.

Otimize as palavras-chave abaixo para melhorar a busca e descoberta de produtos.

Contexto:
- Produto: ${productName || 'N/A'}
- Categoria: ${category || 'N/A'}
- Keywords Atuais: ${currentKeywords || 'Nenhuma'}

Retorne APENAS um JSON válido com as keywords otimizadas:

{
  "optimized_keywords": ["string"],
  "suggested_keywords": ["string"],
  "trending_keywords": ["string"],
  "long_tail_keywords": ["string"],
  "reasoning": "string"
}

Regras:
- optimized_keywords: Array com as keywords principais otimizadas (5-10 keywords)
- suggested_keywords: Keywords adicionais sugeridas (5-10 keywords)
- trending_keywords: Keywords em tendência relacionadas (3-5 keywords)
- long_tail_keywords: Keywords de cauda longa para nicho (3-5 keywords)
- reasoning: Breve explicação das otimizações (máximo 150 caracteres)

As keywords devem:
- Ser relevantes para o produto
- Estar em português brasileiro
- Ser específicas mas não muito restritivas
- Incluir termos de busca comuns
- Considerar sinônimos e variações
- Ser adequadas para e-commerce brasileiro

Retorne SOMENTE o JSON, sem explicações ou markdown.`;
  }

  /**
   * Otimizar keywords
   * @param {string} currentKeywords - Keywords atuais (separadas por vírgula)
   * @param {string} productName - Nome do produto
   * @param {string} category - Categoria do produto
   * @returns {Promise<Object>} - Keywords otimizadas
   */
  async optimizeKeywords(currentKeywords, productName, category = '') {
    try {
      logger.info(`🤖 Otimizando keywords via IA para: ${productName?.substring(0, 50)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando keywords padrão.');
        return this.getDefaultKeywords(currentKeywords, productName);
      }

      // Gerar prompt
      const prompt = this.generateOptimizationPrompt(currentKeywords, productName, category);

      // Fazer requisição para OpenRouter
      const response = await openrouterClient.makeRequest(prompt);

      // Validar e normalizar resposta
      if (!response || typeof response !== 'object') {
        throw new Error('Resposta da IA não é um objeto válido');
      }

      const optimized = {
        optimized_keywords: Array.isArray(response.optimized_keywords)
          ? response.optimized_keywords.filter(k => k && typeof k === 'string').slice(0, 10)
          : [],
        suggested_keywords: Array.isArray(response.suggested_keywords)
          ? response.suggested_keywords.filter(k => k && typeof k === 'string').slice(0, 10)
          : [],
        trending_keywords: Array.isArray(response.trending_keywords)
          ? response.trending_keywords.filter(k => k && typeof k === 'string').slice(0, 5)
          : [],
        long_tail_keywords: Array.isArray(response.long_tail_keywords)
          ? response.long_tail_keywords.filter(k => k && typeof k === 'string').slice(0, 5)
          : [],
        reasoning: response.reasoning || 'Keywords otimizadas para melhor descoberta'
      };

      logger.info(`✅ Keywords otimizadas: ${optimized.optimized_keywords.length} principais`);

      return optimized;

    } catch (error) {
      logger.error(`❌ Erro ao otimizar keywords: ${error.message}`);
      return this.getDefaultKeywords(currentKeywords, productName);
    }
  }

  /**
   * Extrair keywords do nome do produto (fallback)
   */
  extractKeywordsFromName(productName) {
    if (!productName) return [];

    // Remover caracteres especiais e dividir em palavras
    const words = productName
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Remover palavras muito curtas
      .filter(word => !['de', 'da', 'do', 'em', 'para', 'com', 'sem'].includes(word)); // Remover stop words

    return words.slice(0, 10); // Limitar a 10 keywords
  }

  /**
   * Keywords padrão quando IA não está disponível
   */
  getDefaultKeywords(currentKeywords, productName) {
    const extracted = this.extractKeywordsFromName(productName);
    const current = currentKeywords 
      ? currentKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [];

    // Combinar e remover duplicatas
    const allKeywords = [...new Set([...current, ...extracted])];

    return {
      optimized_keywords: allKeywords.slice(0, 10),
      suggested_keywords: [],
      trending_keywords: [],
      long_tail_keywords: [],
      reasoning: 'Keywords extraídas do nome do produto'
    };
  }

  /**
   * Sugerir keywords baseado em múltiplos produtos similares
   * @param {Array} products - Array de produtos similares
   * @returns {Promise<Object>} - Keywords sugeridas
   */
  async suggestKeywordsFromSimilar(products) {
    if (!products || products.length === 0) {
      return this.getDefaultKeywords('', '');
    }

    // Extrair nomes dos produtos
    const productNames = products.map(p => p.name).filter(Boolean).join(', ');
    const category = products[0]?.category || '';

    return this.optimizeKeywords('', productNames, category);
  }
}

export default new KeywordOptimizer();

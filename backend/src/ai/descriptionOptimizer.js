/**
 * Otimizador de Descrições de Produtos com IA
 * Gera e otimiza descrições de produtos para melhor conversão
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class DescriptionOptimizer {
  /**
   * Gerar prompt para otimização de descrição
   * @param {Object} product - Dados do produto
   * @param {string} currentDescription - Descrição atual
   * @returns {string} - Prompt formatado
   */
  generateOptimizationPrompt(product, currentDescription = '') {
    return `Você é um especialista em copywriting para e-commerce.

Otimize a descrição do produto abaixo para aumentar conversões e vendas.

Dados do Produto:
- Nome: ${product.name || 'N/A'}
- Preço: ${product.current_price || 'N/A'}
- Desconto: ${product.discount_percentage || 0}%
- Plataforma: ${product.platform || 'N/A'}
- Categoria: ${product.category || 'N/A'}
${currentDescription ? `- Descrição Atual: ${currentDescription}` : ''}

Crie uma descrição otimizada que:
- Seja clara e objetiva
- Destaque os principais benefícios
- Use linguagem persuasiva mas honesta
- Inclua informações relevantes (se disponíveis)
- Seja adequada para o público brasileiro
- Tenha entre 100-300 caracteres (breve mas informativa)
- Use emojis relevantes (máximo 2-3)
- Destaque o desconto se for significativo

Retorne APENAS a descrição otimizada, sem explicações, sem markdown, sem JSON.`;
  }

  /**
   * Otimizar descrição de produto
   * @param {Object} product - Dados do produto
   * @param {string} currentDescription - Descrição atual (opcional)
   * @returns {Promise<string>} - Descrição otimizada
   */
  async optimizeDescription(product, currentDescription = '') {
    try {
      logger.info(`🤖 Otimizando descrição via IA: ${product.name?.substring(0, 50)}...`);

      // Verificar se IA está habilitada
      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        logger.warn('⚠️ IA não está habilitada. Retornando descrição padrão.');
        return this.getDefaultDescription(product);
      }

      // Gerar prompt
      const prompt = this.generateOptimizationPrompt(product, currentDescription);

      // Fazer requisição para OpenRouter (modo texto)
      const optimizedDescription = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

      // Limpar e validar descrição
      let description = typeof optimizedDescription === 'string' 
        ? optimizedDescription.trim() 
        : String(optimizedDescription).trim();

      // Remover prefixos comuns
      description = description
        .replace(/^Descrição:\s*/i, '')
        .replace(/^Descrição Otimizada:\s*/i, '')
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      // Validar tamanho
      if (description.length < 20) {
        logger.warn('⚠️ Descrição gerada muito curta. Usando descrição padrão.');
        return this.getDefaultDescription(product);
      }

      // Limitar tamanho máximo
      if (description.length > 500) {
        description = description.substring(0, 497) + '...';
      }

      logger.info(`✅ Descrição otimizada gerada (${description.length} caracteres)`);

      return description;

    } catch (error) {
      logger.error(`❌ Erro ao otimizar descrição: ${error.message}`);
      return this.getDefaultDescription(product);
    }
  }

  /**
   * Gerar descrição padrão quando IA não está disponível
   * @param {Object} product - Dados do produto
   * @returns {string} - Descrição padrão
   */
  getDefaultDescription(product) {
    const discount = product.discount_percentage || 0;
    const price = product.current_price || '';
    const name = product.name || 'Produto';

    let description = name;

    if (discount >= 20) {
      description += ` - ${discount}% OFF! 🎉`;
    } else if (discount >= 10) {
      description += ` - ${discount}% de desconto! 💰`;
    }

    if (price) {
      description += ` Por apenas ${price}`;
    }

    return description;
  }

  /**
   * Gerar descrição completa (longa) para produto
   * @param {Object} product - Dados do produto
   * @returns {Promise<string>} - Descrição completa
   */
  async generateFullDescription(product) {
    try {
      logger.info(`🤖 Gerando descrição completa via IA: ${product.name?.substring(0, 50)}...`);

      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return this.getDefaultDescription(product);
      }

      const prompt = `Você é um especialista em copywriting para e-commerce.

Crie uma descrição completa e detalhada para o produto abaixo.

Dados do Produto:
- Nome: ${product.name || 'N/A'}
- Preço: ${product.current_price || 'N/A'}
- Desconto: ${product.discount_percentage || 0}%
- Plataforma: ${product.platform || 'N/A'}
- Categoria: ${product.category || 'N/A'}

Crie uma descrição que:
- Seja informativa e completa (300-600 caracteres)
- Destaque características principais
- Mencione benefícios
- Use linguagem natural e persuasiva
- Seja adequada para o público brasileiro
- Use emojis moderadamente (3-5)

Retorne APENAS a descrição, sem explicações, sem markdown.`;

      const description = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

      let result = typeof description === 'string' 
        ? description.trim() 
        : String(description).trim();

      result = result
        .replace(/^Descrição:\s*/i, '')
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      if (result.length < 50) {
        return this.getDefaultDescription(product);
      }

      return result.substring(0, 800); // Limitar a 800 caracteres

    } catch (error) {
      logger.error(`❌ Erro ao gerar descrição completa: ${error.message}`);
      return this.getDefaultDescription(product);
    }
  }
}

export default new DescriptionOptimizer();






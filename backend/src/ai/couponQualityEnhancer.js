/**
 * Melhorador de Qualidade de Cupons com IA
 * Melhora títulos, descrições e sugere otimizações
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';
import descriptionOptimizer from './descriptionOptimizer.js';

class CouponQualityEnhancer {
  /**
   * Melhorar cupom completo (título, descrição, tags)
   * @param {Object} coupon - Cupom a melhorar
   * @returns {Promise<Object>} - Cupom melhorado
   */
  async enhanceCoupon(coupon) {
    try {
      logger.info(`🤖 Melhorando cupom: ${coupon.code || 'N/A'}...`);

      const aiConfig = await openrouterClient.getConfig();
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return coupon; // Retornar original se IA não estiver habilitada
      }

      const enhancements = {
        title: coupon.title,
        description: coupon.description,
        tags: [],
        improvements: []
      };

      // 1. Otimizar título
      if (coupon.title) {
        try {
          const optimizedTitle = await this.optimizeTitle(coupon);
          if (optimizedTitle && optimizedTitle.length > 0) {
            enhancements.title = optimizedTitle;
            enhancements.improvements.push('Título otimizado');
          }
        } catch (error) {
          logger.warn(`Erro ao otimizar título: ${error.message}`);
        }
      }

      // 2. Otimizar descrição
      if (coupon.description || coupon.title) {
        try {
          const optimizedDescription = await descriptionOptimizer.optimizeDescription(
            {
              name: coupon.title || coupon.code,
              current_price: coupon.min_purchase || '0',
              discount_percentage: coupon.discount_type === 'percentage' ? coupon.discount_value : 0,
              platform: coupon.platform || 'shopee',
              category: coupon.category_id
            },
            coupon.description || ''
          );
          if (optimizedDescription && optimizedDescription.length > 0) {
            enhancements.description = optimizedDescription;
            enhancements.improvements.push('Descrição otimizada');
          }
        } catch (error) {
          logger.warn(`Erro ao otimizar descrição: ${error.message}`);
        }
      }

      // 3. Gerar tags sugeridas
      try {
        const tags = await this.generateTags(coupon);
        if (tags && tags.length > 0) {
          enhancements.tags = tags;
          enhancements.improvements.push('Tags sugeridas');
        }
      } catch (error) {
        logger.warn(`Erro ao gerar tags: ${error.message}`);
      }

      return {
        ...coupon,
        ...enhancements
      };

    } catch (error) {
      logger.error(`❌ Erro ao melhorar cupom: ${error.message}`);
      return coupon; // Retornar original em caso de erro
    }
  }

  /**
   * Otimizar título do cupom
   */
  async optimizeTitle(coupon) {
    try {
      const prompt = `Você é um especialista em copywriting para e-commerce.

Otimize o título do cupom abaixo para ser mais atrativo e persuasivo.

Cupom:
- Código: ${coupon.code || 'N/A'}
- Título Atual: ${coupon.title || 'N/A'}
- Desconto: ${coupon.discount_value || 0}${coupon.discount_type === 'percentage' ? '%' : ' R$'}
- Plataforma: ${coupon.platform || 'N/A'}

Crie um título que:
- Seja claro e direto
- Destaque o desconto
- Use linguagem persuasiva mas honesta
- Tenha entre 30-60 caracteres
- Seja adequado para o público brasileiro
- Use emojis relevantes (máximo 1-2)

Retorne APENAS o título otimizado, sem explicações, sem markdown.`;

      const response = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

      let title = typeof response === 'string' ? response.trim() : String(response).trim();

      // Limpar título
      title = title
        .replace(/^Título:\s*/i, '')
        .replace(/^Título Otimizado:\s*/i, '')
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

      if (title.length < 10 || title.length > 100) {
        return coupon.title; // Retornar original se não for válido
      }

      return title;

    } catch (error) {
      logger.error(`Erro ao otimizar título: ${error.message}`);
      return coupon.title;
    }
  }

  /**
   * Gerar tags sugeridas
   */
  async generateTags(coupon) {
    try {
      const prompt = `Gere 3-5 tags relevantes para o cupom abaixo. Retorne APENAS um JSON:

{
  "tags": ["tag1", "tag2", "tag3"]
}

Cupom:
- Código: ${coupon.code || 'N/A'}
- Título: ${coupon.title || 'N/A'}
- Desconto: ${coupon.discount_value || 0}${coupon.discount_type === 'percentage' ? '%' : ' R$'}
- Plataforma: ${coupon.platform || 'N/A'}

Tags devem ser:
- Relevantes ao cupom
- Em português
- Curta (1-2 palavras)
- Úteis para busca e categorização

Retorne SOMENTE o JSON.`;

      const response = await openrouterClient.makeRequest(prompt);

      if (response && Array.isArray(response.tags)) {
        return response.tags.slice(0, 5);
      }

      return [];

    } catch (error) {
      logger.error(`Erro ao gerar tags: ${error.message}`);
      return [];
    }
  }

  /**
   * Melhorar múltiplos cupons em lote
   */
  async enhanceBatch(coupons, maxConcurrent = 3) {
    try {
      logger.info(`🤖 Melhorando ${coupons.length} cupons em lote...`);

      const enhanced = [];
      const batches = this.chunkArray(coupons, maxConcurrent);

      for (const batch of batches) {
        const batchPromises = batch.map(coupon =>
          this.enhanceCoupon(coupon).catch(error => {
            logger.warn(`Erro ao melhorar cupom ${coupon.code}: ${error.message}`);
            return coupon; // Retornar original em caso de erro
          })
        );

        const batchResults = await Promise.all(batchPromises);
        enhanced.push(...batchResults);

        // Delay entre batches
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      logger.info(`✅ ${enhanced.length} cupons melhorados`);

      return enhanced;

    } catch (error) {
      logger.error(`❌ Erro na melhoria em lote: ${error.message}`);
      return coupons;
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
}

export default new CouponQualityEnhancer();



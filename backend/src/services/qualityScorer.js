/**
 * Sistema de Score de Qualidade da Oferta
 * Calcula offer_score baseado em múltiplos fatores
 */
import logger from '../config/logger.js';
import ClickTracking from '../models/ClickTracking.js';
import Product from '../models/Product.js';

class QualityScorer {
  /**
   * Calcular score de qualidade da oferta
   * @param {Object} product - Produto
   * @param {Object} options - Opções adicionais
   * @returns {Promise<number>} - Score de 0 a 100
   */
  async calculateOfferScore(product, options = {}) {
    try {
      let score = 0;
      const factors = {
        discount: 0,
        price_history: 0,
        popularity: 0,
        ctr: 0,
        ai_confidence: 0
      };

      // 1. Fator: % de Desconto (0-40 pontos)
      if (product.discount_percentage) {
        const discount = product.discount_percentage;
        if (discount >= 50) {
          factors.discount = 40;
        } else if (discount >= 30) {
          factors.discount = 30;
        } else if (discount >= 20) {
          factors.discount = 20;
        } else if (discount >= 10) {
          factors.discount = 10;
        } else {
          factors.discount = 5;
        }
      }

      // 2. Fator: Histórico de Preço (0-20 pontos)
      // Se o preço atual é significativamente menor que o histórico, ganha pontos
      if (product.old_price && product.current_price) {
        const priceDrop = ((product.old_price - product.current_price) / product.old_price) * 100;
        if (priceDrop >= 30) {
          factors.price_history = 20;
        } else if (priceDrop >= 20) {
          factors.price_history = 15;
        } else if (priceDrop >= 10) {
          factors.price_history = 10;
        } else {
          factors.price_history = 5;
        }
      }

      // 3. Fator: Popularidade (0-15 pontos)
      // Baseado em vendas, avaliações, etc.
      if (product.sales_count) {
        if (product.sales_count >= 1000) {
          factors.popularity = 15;
        } else if (product.sales_count >= 500) {
          factors.popularity = 12;
        } else if (product.sales_count >= 100) {
          factors.popularity = 8;
        } else {
          factors.popularity = 5;
        }
      }

      if (product.rating_star) {
        const rating = parseFloat(product.rating_star);
        if (rating >= 4.5) {
          factors.popularity += 5;
        } else if (rating >= 4.0) {
          factors.popularity += 3;
        }
      }

      // Limitar popularidade a 15
      factors.popularity = Math.min(factors.popularity, 15);

      // 4. Fator: CTR (Click-Through Rate) (0-15 pontos)
      // Buscar histórico de cliques se produto já existe
      if (product.id) {
        try {
          const clicks = await ClickTracking.findByProduct(product.id);
          const totalClicks = clicks ? clicks.length : 0;
          
          // Se tem muitos cliques, é popular
          if (totalClicks >= 100) {
            factors.ctr = 15;
          } else if (totalClicks >= 50) {
            factors.ctr = 12;
          } else if (totalClicks >= 20) {
            factors.ctr = 8;
          } else if (totalClicks >= 10) {
            factors.ctr = 5;
          }

          // Calcular taxa de conversão se houver dados
          const conversions = clicks.filter(c => c.converted).length;
          if (totalClicks > 0) {
            const conversionRate = (conversions / totalClicks) * 100;
            if (conversionRate >= 10) {
              factors.ctr += 5;
            } else if (conversionRate >= 5) {
              factors.ctr += 3;
            }
          }
        } catch (error) {
          logger.debug(`   ⚠️ Erro ao buscar CTR: ${error.message}`);
        }
      }

      // Limitar CTR a 15
      factors.ctr = Math.min(factors.ctr, 15);

      // 5. Fator: Confiança da IA (0-10 pontos)
      if (product.confidence_score !== null && product.confidence_score !== undefined) {
        factors.ai_confidence = parseFloat(product.confidence_score) * 10;
      } else if (options.ai_confidence) {
        factors.ai_confidence = parseFloat(options.ai_confidence) * 10;
      }

      // Calcular score total
      score = factors.discount + factors.price_history + factors.popularity + factors.ctr + factors.ai_confidence;

      // Limitar entre 0 e 100
      score = Math.max(0, Math.min(100, score));

      logger.debug(`📊 Score calculado para ${product.name?.substring(0, 30)}: ${score.toFixed(1)}`);
      logger.debug(`   Fatores: Desconto(${factors.discount}), Histórico(${factors.price_history}), Popularidade(${factors.popularity}), CTR(${factors.ctr}), IA(${factors.ai_confidence})`);

      return {
        score: Math.round(score * 100) / 100, // Arredondar para 2 casas decimais
        factors
      };

    } catch (error) {
      logger.error(`❌ Erro ao calcular score: ${error.message}`);
      // Retornar score padrão em caso de erro
      return {
        score: 50.0,
        factors: {
          discount: 10,
          price_history: 10,
          popularity: 10,
          ctr: 10,
          ai_confidence: 10
        }
      };
    }
  }

  /**
   * Atualizar score de um produto no banco
   */
  async updateProductScore(productId, scoreData) {
    try {
      await Product.update(productId, {
        offer_score: scoreData.score
      });
      logger.debug(`✅ Score atualizado: ${scoreData.score.toFixed(1)}`);
    } catch (error) {
      logger.error(`❌ Erro ao atualizar score: ${error.message}`);
    }
  }
}

export default new QualityScorer();


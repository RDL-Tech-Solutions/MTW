import axios from 'axios';
import logger from '../../config/logger.js';
import meliAuth from './meliAuth.js';

class MeliSync {
  /**
   * Buscar produtos do Mercado Livre baseado em palavras-chave
   */
  async fetchMeliProducts(keywords, limit = 50) {
    try {
      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      // Verificar se autenticação está configurada
      if (!meliAuth.isConfigured()) {
        logger.warn('⚠️ Credenciais do Mercado Livre não configuradas, usando API pública limitada');
      }

      for (const term of searchTerms) {
        logger.info(`🔍 Buscando no Mercado Livre: "${term}"`);

        try {
          let data;

          // Para buscar produtos públicos, usar API sem autenticação
          // (OAuth Client Credentials não funciona para buscas públicas)
          const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
            params: {
              q: term,
              limit: Math.min(limit, 50),
              // Não usar sort para evitar 403
              // sort: 'price_asc',
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'pt-BR'
            },
            timeout: 20000
          });
          data = response.data;

          if (data && data.results) {
            allProducts.push(...data.results);
            logger.info(`   ✅ ${data.results.length} resultados para "${term}"`);
          }
        } catch (termError) {
          logger.error(`   ❌ Erro ao buscar "${term}": ${termError.message}`);
          // Continuar com próximo termo
          continue;
        }

        // Aguardar 500ms entre requisições para evitar rate limit
        if (searchTerms.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      logger.info(`✅ ${allProducts.length} produtos encontrados no Mercado Livre`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro geral ao buscar produtos no Mercado Livre: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  filterMeliPromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      // Verificar se tem preço original e desconto
      const currentPrice = product.price;
      const originalPrice = product.original_price;

      if (!originalPrice || originalPrice <= currentPrice) {
        continue; // Não é uma promoção real
      }

      // Calcular desconto
      const discount = ((originalPrice - currentPrice) / originalPrice) * 100;

      if (discount >= minDiscountPercentage) {
        promotions.push({
          external_id: `mercadolivre-${product.id}`,
          name: product.title,
          image_url: product.thumbnail,
          platform: 'mercadolivre',
          current_price: currentPrice,
          old_price: originalPrice,
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink,
          stock_available: product.available_quantity > 0,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado do Mercado Livre
   */
  generateMeliAffiliateLink(productPermalink) {
    // TODO: Integrar com API de afiliados do Mercado Livre se disponível
    // Por enquanto, retorna o link direto
    return productPermalink;
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveMeliToDatabase(product, Product) {
    try {
      // Verificar se já existe pelo external_id
      const existing = await Product.findByExternalId(product.external_id);

      if (existing) {
        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Gerar link de afiliado
      product.affiliate_link = this.generateMeliAffiliateLink(product.affiliate_link);

      // Criar novo produto
      const newProduct = await Product.create(product);
      logger.info(`✅ Novo produto salvo: ${product.name}`);

      return { product: newProduct, isNew: true };
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      throw error;
    }
  }
}

export default new MeliSync();

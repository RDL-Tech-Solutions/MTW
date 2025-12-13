import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../../config/logger.js';
import meliAuth from './meliAuth.js';
import linkAnalyzer from '../linkAnalyzer.js'; // Reaproveitar helper de parsePrice

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
        let products = [];

        try {
          // Configurar headers (com ou sem token)
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR'
          };

          // Se tiver credenciais, tentar usar token para aumentar limites/evitar 403
          if (meliAuth.isConfigured()) {
            try {
              const token = await meliAuth.getAccessToken();
              headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
              logger.warn('⚠️ Falha ao obter token para busca, seguindo sem auth');
            }
          }

          // Tentar API
          const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
            params: {
              q: term,
              limit: Math.min(limit, 50),
            },
            headers,
            timeout: 10000
          });


          if (response.data && response.data.results && response.data.results.length > 0) {
            products = response.data.results;
            logger.info(`   ✅ (API) ${products.length} resultados para "${term}"`);
          } else {
            // Se API retornar vazio (soft block), força erro para cair no catch ou trata aqui
            // Vamos tratar aqui para evitar throw desnecessário
            logger.warn(`   ⚠️ API retornou 0 resultados. Tentando scraping...`);
            products = await this.scrapeSearchPage(term);
          }
        } catch (apiError) {
          // Se for bloqueio (403), erro de servidor, ou qualquer outro erro na API
          logger.warn(`   ⚠️ Erro na API (${apiError.message}). Tentando scraping...`);
          products = await this.scrapeSearchPage(term);
        }

        if (products.length > 0) {
          allProducts.push(...products);
        }

        // Aguardar 1s entre requisições
        if (searchTerms.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
   * Scraping da página de busca (Fallback quando API falha)
   */
  async scrapeSearchPage(term) {
    try {
      // Formatar termo para URL (ex: "iphone 13" -> "iphone-13")
      const formattedTerm = term.replace(/\s+/g, '-');
      const url = `https://lista.mercadolivre.com.br/${formattedTerm}_NoIndex_True`;

      logger.info(`   🕷️ Scraping URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Tentar layout Clássico
      $('.ui-search-layout__item').each((i, el) => {
        if (results.length >= 50) return false;
        try {
          const container = $(el);
          const link = container.find('a.ui-search-link').attr('href');
          if (!link) return;

          let id = '';
          const matchId = link.match(/MLB-?(\d+)/i);
          if (matchId) id = 'MLB' + matchId[1];
          else return;

          const title = container.find('.ui-search-item__title').text().trim();

          // Imagem (Tentar múltiplos seletores e atributos lazy load)
          let thumbnail = container.find('img.ui-search-result-image__element').attr('src');
          if (!thumbnail) thumbnail = container.find('img.ui-search-result-image__element').data('src');
          if (!thumbnail) thumbnail = container.find('.ui-search-result-image__element').first().attr('src');
          if (!thumbnail) thumbnail = container.find('img[decoding="async"]').first().attr('src');

          // Se for imagem de placeholder transparente, tentar data-src
          if (thumbnail && thumbnail.includes('data:image')) {
            const realSrc = container.find('img.ui-search-result-image__element').data('src');
            if (realSrc) thumbnail = realSrc;
          }

          // Preço Atual
          const priceContainer = container.find('.ui-search-price__second-line');
          let priceText = priceContainer.find('.andes-money-amount__fraction').first().text();
          // Fallback se second-line falhar
          if (!priceText) {
            priceText = container.find('.ui-search-price__part--medium .andes-money-amount__fraction').first().text();
          }
          const price = linkAnalyzer.parsePrice(priceText);

          // Preço Original (Vários seletores possíveis)
          let originalPrice = 0;
          const originalSelectors = [
            '.ui-search-price__original-value .andes-money-amount__fraction',
            's .andes-money-amount__fraction',
            '.andes-money-amount--previous .andes-money-amount__fraction',
            '.ui-search-price__part--original .andes-money-amount__fraction'
          ];

          for (const sel of originalSelectors) {
            const val = container.find(sel).first().text();
            if (val) {
              originalPrice = linkAnalyzer.parsePrice(val);
              if (originalPrice > 0) break;
            }
          }

          if (price > 0) {
            results.push({
              id,
              title,
              permalink: link,
              thumbnail,
              price,
              original_price: originalPrice > price ? originalPrice : null,
              available_quantity: 1
            });
          }
        } catch (e) { }
      });

      // Se não achou nada, tentar layout Novo (Poly)
      if (results.length === 0) {
        $('.poly-card').each((i, el) => {
          if (results.length >= 50) return false;
          try {
            const container = $(el);
            const link = container.find('a.poly-component__title').attr('href') || container.find('a').attr('href');
            if (!link) return;

            let id = '';
            const matchId = link.match(/MLB-?(\d+)/i);
            if (matchId) id = 'MLB' + matchId[1];

            const title = container.find('.poly-component__title').text().trim();

            let thumbnail = container.find('img.poly-component__image').attr('src');
            if (!thumbnail) thumbnail = container.find('img.poly-card__img').attr('src'); // Outra classe comum
            if (!thumbnail) thumbnail = container.find('img.poly-component__image').data('src');
            if (!thumbnail) thumbnail = container.find('img').first().attr('src');

            if (thumbnail && thumbnail.includes('data:image')) {
              let realSrc = container.find('img.poly-component__image').data('src');
              if (!realSrc) realSrc = container.find('img.poly-card__img').data('src');
              if (realSrc) thumbnail = realSrc;
            }

            const priceText = container.find('.poly-price__current .andes-money-amount__fraction').first().text();
            const price = linkAnalyzer.parsePrice(priceText);

            let originalPrice = 0;
            // Seletores Poly para preço antigo
            const originalSelectors = [
              '.poly-price__original-value .andes-money-amount__fraction',
              '.andes-money-amount--previous .andes-money-amount__fraction',
              's .andes-money-amount__fraction'
            ];

            for (const sel of originalSelectors) {
              const val = container.find(sel).first().text();
              if (val) {
                originalPrice = linkAnalyzer.parsePrice(val);
                if (originalPrice > 0) break;
              }
            }

            if (price > 0 && id) {
              results.push({
                id,
                title,
                permalink: link,
                thumbnail,
                price,
                original_price: originalPrice > price ? originalPrice : null,
                available_quantity: 1
              });
            }
          } catch (e) { }
        });
      }

      logger.info(`   ✅ (Scraping) ${results.length} resultados encontrados.`);
      return results;

    } catch (error) {
      logger.error(`   ❌ Falha no scraping: ${error.message}`);
      return [];
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
   * Tenta obter o link trackeado via API se autenticado
   */
  async generateMeliAffiliateLink(product) {
    try {
      // Se não tiver autenticação, devolve o original
      if (!meliAuth.isConfigured()) return product.affiliate_link;

      // Extrair ID (ex: mercadolivre-MLB123 -> MLB123)
      const meliId = product.external_id.replace('mercadolivre-', '');

      // Buscar detalhes do item via API Autenticada
      // Se a conta for de afiliado/parceiro, o permalink retornado pode ser trackeado
      const itemData = await meliAuth.authenticatedRequest(`https://api.mercadolibre.com/items/${meliId}`);

      if (itemData && itemData.permalink) {
        return itemData.permalink;
      }

      return product.affiliate_link;
    } catch (error) {
      logger.warn(`⚠️ Falha ao gerar link afiliado ML para ${product.external_id}: ${error.message}`);
      return product.affiliate_link;
    }
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveMeliToDatabase(product, Product) {
    try {
      // Verificar se já existe pelo external_id
      const existing = await Product.findByExternalId(product.external_id);

      if (existing) {
        // Se o preço mudou, atualizar
        if (existing.current_price !== product.current_price) {
          await Product.updatePrice(existing.id, product.current_price);
          logger.info(`🔄 Produto atualizado (Preço): ${product.name}`);
          return { product: existing, isNew: true }; // Considerar como "novo" evento para logs
        }

        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Gerar link de afiliado (Async)
      product.affiliate_link = await this.generateMeliAffiliateLink(product);

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

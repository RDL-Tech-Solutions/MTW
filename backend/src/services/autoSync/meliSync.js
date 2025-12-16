import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../../config/logger.js';
import meliAuth from './meliAuth.js';
import linkAnalyzer from '../linkAnalyzer.js'; // Reaproveitar helper de parsePrice
import Coupon from '../../models/Coupon.js';
import categoryDetector from '../categoryDetector.js';
import AppSettings from '../../models/AppSettings.js';

class MeliSync {
  /**
   * Buscar produtos do Mercado Livre baseado em palavras-chave
   */
  async fetchMeliProducts(keywords, limit = 50, options = {}) {
    try {
      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      const { forceScraping = false } = options;

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

          // Tentar API (se não for forçado scraping)

          let usedApi = false;

          if (!forceScraping) {
            try {
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
                usedApi = true;
              }
            } catch (apiError) {
              logger.warn(`   ⚠️ Erro na API (${apiError.message}). Tentando scraping...`);
            }
          }

          if (!usedApi) {
            // Se API retornar vazio, falhar, ou scraping for forçado
            if (forceScraping) logger.info('   🕷️ Modo Scraping forçado para capturar cupons.');
            products = await this.scrapeSearchPage(term);
          }
        } catch (error) {
          // Catch geral do loop
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
          let thumbnail = null;
          const imgElement = container.find('img.ui-search-result-image__element').first();
          
          // Tentar atributos em ordem de preferência
          const imgAttrs = ['data-src', 'data-lazy', 'data-original', 'src'];
          for (const attr of imgAttrs) {
            const val = imgElement.attr(attr);
            if (val && !val.includes('data:image') && val.startsWith('http')) {
              thumbnail = val;
              break;
            }
          }
          
          // Fallback: tentar outros seletores de imagem
          if (!thumbnail) {
            const altImgSelectors = [
              'img[decoding="async"]',
              '.ui-search-result-image img',
              'img'
            ];
            for (const sel of altImgSelectors) {
              const img = container.find(sel).first();
              for (const attr of imgAttrs) {
                const val = img.attr(attr);
                if (val && !val.includes('data:image') && val.startsWith('http')) {
                  thumbnail = val;
                  break;
                }
              }
              if (thumbnail) break;
            }
          }
          
          // Último fallback: converter thumbnail pequeno para tamanho maior
          if (thumbnail && thumbnail.includes('-I.jpg')) {
            thumbnail = thumbnail.replace('-I.jpg', '-O.jpg');
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

          // Verificar Cupom na Busca (Classico)
          let coupon = null;
          const couponElement = container.find('.ui-search-item__coupon').first();

          if (couponElement.length > 0) {
            const couponText = couponElement.text().trim();
            const couponValue = linkAnalyzer.parsePrice(couponText);

            // Tentar extrair código
            const codeMatch = couponText.match(/CUPOM\s*:?\s*([A-Z0-9]{3,20})/i);

            if (couponValue > 0 && codeMatch) {
              coupon = {
                discount_value: couponValue,
                discount_type: 'fixed',
                code: codeMatch[1].toUpperCase(),
                platform: 'mercadolivre'
              };
            }
          } else {
            // Tentar texto solto de 'CUPOM' 
            const allText = container.text();
            // Regex mais estrita para pegar código: CUPOM [CODE]
            const codeMatch = allText.match(/CUPOM\s+([A-Z0-9]+)\s+R\$/i) || allText.match(/CUPOM\s*:?\s*([A-Z0-9]{4,15})/i);

            if (codeMatch) {
              const potentialCode = codeMatch[1];
              if (!['DE', 'DA', 'DO', 'OFF', 'R$', 'COM', 'PARA'].includes(potentialCode.toUpperCase())) {
                const couponMatch = allText.match(/R\$\s*([\d.,]+)/);
                const val = couponMatch ? linkAnalyzer.parsePrice(couponMatch[1]) : 0;

                if (val > 0) {
                  coupon = {
                    discount_value: val,
                    discount_type: 'fixed',
                    code: potentialCode.toUpperCase(),
                    platform: 'mercadolivre'
                  };
                }
              }
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
              available_quantity: 1,
              coupon: coupon
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

            // Imagem (Tentar múltiplos seletores e atributos lazy load para layout Poly)
            let thumbnail = null;
            const imgSelectors = [
              'img.poly-component__image',
              'img.poly-card__img',
              'img[data-src]',
              'img'
            ];
            const imgAttrs = ['data-src', 'data-lazy', 'data-original', 'src'];
            
            for (const sel of imgSelectors) {
              const img = container.find(sel).first();
              for (const attr of imgAttrs) {
                const val = img.attr(attr);
                if (val && !val.includes('data:image') && val.startsWith('http')) {
                  thumbnail = val;
                  break;
                }
              }
              if (thumbnail) break;
            }
            
            // Converter thumbnail pequeno para tamanho maior se possível
            if (thumbnail && thumbnail.includes('-I.jpg')) {
              thumbnail = thumbnail.replace('-I.jpg', '-O.jpg');
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

            // Verificar Cupom na Busca (Poly)
            let coupon = null;
            const polyCoupon = container.find('.poly-component__coupon').first();

            if (polyCoupon.length > 0) {
              const couponText = polyCoupon.text().trim();
              const couponValue = linkAnalyzer.parsePrice(couponText);

              // Tentar extrair um código real se houver (ex: "CUPOM: VALE20")
              // Na busca do ML geralmente não mostra o código, apenas "CUPOM R$ 20 OFF"
              // Se não tiver código explícito, não vamos inventar um código aleatório.
              // Vamos verificar se há algum padrão de código no título ou tag
              const codeMatch = couponText.match(/CUPOM\s*:?\s*([A-Z0-9]{3,20})/i);

              if (couponValue > 0 && codeMatch) {
                coupon = {
                  discount_value: couponValue,
                  discount_type: 'fixed',
                  code: codeMatch[1].toUpperCase(),
                  platform: 'mercadolivre'
                };
              } else if (couponValue > 0) {
                // Se achou valor mas não código, marcamos como cupom de clique (sem código)
                // Mas para o sistema funcionar precisava de código. 
                // Vamos ignorar por enquanto para não gerar lixo "MELI-RANDOM" que não funciona.
                // O usuário relatou que "não funcionam", então melhor não capturar do que capturar lixo.
                coupon = null;
              }
            } else {
              // Tentar texto solto de 'CUPOM' no container
              const allText = container.text();
              // Regex mais estrita para pegar código: CUPOM [CODE]
              const codeMatch = allText.match(/CUPOM\s+([A-Z0-9]+)\s+R\$/i) || allText.match(/CUPOM\s*:?\s*([A-Z0-9]{4,15})/i);

              if (codeMatch) {
                const potentialCode = codeMatch[1];
                // Verificar se o "código" não é uma palavra comum como "DE", "R$", "OFF"
                if (!['DE', 'DA', 'DO', 'OFF', 'R$', 'COM', 'PARA'].includes(potentialCode.toUpperCase())) {
                  const couponMatch = allText.match(/R\$\s*([\d.,]+)/); // Tentar achar valor perto
                  const val = couponMatch ? linkAnalyzer.parsePrice(couponMatch[1]) : 0;

                  if (val > 0) {
                    coupon = {
                      discount_value: val,
                      discount_type: 'fixed',
                      code: potentialCode.toUpperCase(),
                      platform: 'mercadolivre'
                    };
                  }
                }
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
                available_quantity: 1,
                coupon: coupon
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
   * Validar e melhorar URL da imagem
   */
  improveImageUrl(imageUrl) {
    if (!imageUrl) return null;
    
    // Se for placeholder (data:image), retornar null
    if (imageUrl.includes('data:image')) {
      return null;
    }
    
    // Se não começar com http, retornar null
    if (!imageUrl.startsWith('http')) {
      return null;
    }
    
    // Converter thumbnail do ML para tamanho maior
    // Padrão ML: -I.jpg (pequeno) -> -O.jpg (original/grande)
    let improvedUrl = imageUrl;
    if (improvedUrl.includes('-I.jpg')) {
      improvedUrl = improvedUrl.replace('-I.jpg', '-O.jpg');
    }
    
    // Garantir HTTPS
    if (improvedUrl.startsWith('http://')) {
      improvedUrl = improvedUrl.replace('http://', 'https://');
    }
    
    return improvedUrl;
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

      // Se tiver cupom, consideramos promoção mesmo se não tiver "original price" (riscado)
      const hasCoupon = !!product.coupon;

      if (!hasCoupon && (!originalPrice || originalPrice <= currentPrice)) {
        continue; // Não é uma promoção real (sem desconto nem cupom)
      }

      // Calcular desconto
      let discount = 0;
      if (originalPrice > currentPrice) {
        discount = ((originalPrice - currentPrice) / originalPrice) * 100;
      }

      // Melhorar URL da imagem
      let imageUrl = this.improveImageUrl(product.thumbnail);
      
      // Se não conseguiu imagem válida, tentar buscar via API do item
      if (!imageUrl && product.id) {
        logger.warn(`⚠️ Produto ${product.id} sem imagem válida, será necessário buscar via API`);
        // Usamos um placeholder temporário - será substituído quando buscar detalhes
        imageUrl = `https://http2.mlstatic.com/D_NQ_NP_${product.id}-O.jpg`;
      }

      if (discount >= minDiscountPercentage || hasCoupon) {
        promotions.push({
          external_id: `mercadolivre-${product.id}`,
          name: product.title,
          image_url: imageUrl || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
          platform: 'mercadolivre',
          current_price: currentPrice,
          old_price: originalPrice || 0, // Garantir 0 se null
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink,
          stock_available: product.available_quantity > 0,
          coupon: product.coupon,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado do Mercado Livre
   * Prioridade:
   * 1. Se tiver MELI_AFFILIATE_CODE configurado, usar formato de afiliado
   * 2. Se tiver autenticação, tentar obter link trackeado via API
   * 3. Caso contrário, retornar link original
   */
  async generateMeliAffiliateLink(product) {
    try {
      // Buscar affiliate code do banco de dados primeiro
      let affiliateCode = '';
      try {
        const AppSettings = (await import('../../models/AppSettings.js')).default;
        const config = await AppSettings.getMeliConfig();
        affiliateCode = config.affiliateCode || '';
      } catch (error) {
        logger.warn(`⚠️ Erro ao buscar affiliate code do banco: ${error.message}`);
        affiliateCode = process.env.MELI_AFFILIATE_CODE || '';
      }
      
      const originalLink = product.affiliate_link || '';

      // Se tiver código de afiliado configurado, gerar link de afiliado
      if (affiliateCode && originalLink) {
        try {
          // Formato do link de afiliado ML:
          // https://mercadolivre.com/jm/mlb?&meuid={CODIGO}&redirect={URL_ENCODED}
          const encodedUrl = encodeURIComponent(originalLink);
          const affiliateLink = `https://mercadolivre.com/jm/mlb?&meuid=${affiliateCode}&redirect=${encodedUrl}`;
          
          logger.info(`✅ Link de afiliado gerado para ${product.external_id || product.name}`);
          return affiliateLink;
        } catch (error) {
          logger.warn(`⚠️ Erro ao gerar link de afiliado com código: ${error.message}`);
        }
      }

      // Se não tiver código de afiliado, tentar via API autenticada (se configurado)
      if (meliAuth.isConfigured() && product.external_id) {
        try {
          // Extrair ID (ex: mercadolivre-MLB123 -> MLB123)
          const meliId = product.external_id.replace('mercadolivre-', '');

          // Buscar detalhes do item via API Autenticada
          // Se a conta for de afiliado/parceiro, o permalink retornado pode ser trackeado
          const itemData = await meliAuth.authenticatedRequest(`https://api.mercadolibre.com/items/${meliId}`);

          if (itemData && itemData.permalink) {
            logger.info(`✅ Link obtido via API autenticada para ${product.external_id}`);
            return itemData.permalink;
          }
        } catch (error) {
          logger.warn(`⚠️ Falha ao obter link via API autenticada: ${error.message}`);
        }
      }

      // Fallback: retornar link original
      if (originalLink) {
        logger.info(`ℹ️ Usando link original (sem código de afiliado) para ${product.external_id || product.name}`);
        return originalLink;
      }

      // Se não tiver link original, tentar construir a partir do external_id
      if (product.external_id) {
        const meliId = product.external_id.replace('mercadolivre-', '');
        const constructedLink = `https://produto.mercadolivre.com.br/MLB-${meliId}`;
        
        // Se tiver código de afiliado, aplicar mesmo no link construído
        if (affiliateCode) {
          const encodedUrl = encodeURIComponent(constructedLink);
          return `https://mercadolivre.com/jm/mlb?&meuid=${affiliateCode}&redirect=${encodedUrl}`;
        }
        
        return constructedLink;
      }

      logger.warn(`⚠️ Não foi possível gerar link de afiliado para produto: ${product.name || 'desconhecido'}`);
      return originalLink || '';
    } catch (error) {
      logger.error(`❌ Erro ao gerar link afiliado ML: ${error.message}`);
      return product.affiliate_link || '';
    }
  }

  /**
   * Buscar imagem de alta qualidade via API do ML
   */
  async fetchHighQualityImage(productId) {
    try {
      const meliId = productId.replace('mercadolivre-', '');
      const response = await axios.get(`https://api.mercadolibre.com/items/${meliId}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const item = response.data;
      
      // Prioridade: pictures[0].secure_url > pictures[0].url > thumbnail
      if (item.pictures && item.pictures.length > 0) {
        const pic = item.pictures[0];
        return pic.secure_url || pic.url || item.thumbnail;
      }
      
      return item.thumbnail;
    } catch (error) {
      logger.warn(`⚠️ Não foi possível buscar imagem de alta qualidade para ${productId}`);
      return null;
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

        // Se agora tem cupom e antes não tinha (ou mudou), atualizar/adicionar
        if (product.coupon) {
          try {
            const couponData = {
              ...product.coupon,
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            // Criar novo cupom
            const newCoupon = await Coupon.create(couponData);

            // Atualizar produto vinculando o cupom (mesmo se o preço não mudou, o cupom é novidade)
            // Nota: Se já tinha cupom, vai sobrescrever com o novo (o que é bom, pois é uma nova captura/atualização)
            await Product.update(existing.id, { coupon_id: newCoupon.id });
            logger.info(`   🎟️ Cupom atualizado/adicionado a produto existente: ${product.name}`);
          } catch (couponError) {
            logger.error(`   ❌ Erro ao atualizar cupom em produto existente: ${couponError.message}`);
          }
        }

        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Verificar se a imagem é válida, se não, buscar via API
      if (!product.image_url || 
          product.image_url.includes('data:image') || 
          product.image_url.includes('placeholder') ||
          !product.image_url.startsWith('http')) {
        logger.info(`🖼️ Buscando imagem de alta qualidade para: ${product.name}`);
        const highQualityImage = await this.fetchHighQualityImage(product.external_id);
        if (highQualityImage) {
          product.image_url = highQualityImage;
          logger.info(`✅ Imagem de alta qualidade obtida`);
        }
      }

      // Processar Cupom antes de criar
      if (product.coupon) {
        try {
          const couponData = {
            ...product.coupon,
            valid_from: new Date(),
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Validade 7 dias default
          };

          // Criar cupom
          const newCoupon = await Coupon.create(couponData);
          product.coupon_id = newCoupon.id;
          logger.info(`   🎟️ Cupom criado para produto: ${product.coupon.discount_value}`);
        } catch (couponError) {
          logger.error(`   ❌ Erro ao criar cupom: ${couponError.message}`);
          // Segue sem cupom
        }
      }

      // Detectar categoria automaticamente se não tiver
      if (!product.category_id) {
        try {
          const detectedCategory = await categoryDetector.detectCategory(product.name);
          if (detectedCategory) {
            product.category_id = detectedCategory.id;
            logger.info(`📂 Categoria detectada: ${detectedCategory.name} para ${product.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao detectar categoria: ${error.message}`);
        }
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

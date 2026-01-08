import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import AppSettings from '../../models/AppSettings.js';
import Coupon from '../../models/Coupon.js';
import categoryDetector from '../categoryDetector.js';

class AliExpressSync {
  constructor() {
    // baseUrl será obtido de AppSettings.getAliExpressConfig()
    this.defaultBaseUrl = 'https://api-sg.aliexpress.com/rest';
  }

  /**
   * Verificar se AliExpress está configurado
   */
  async isConfigured() {
    const config = await AppSettings.getAliExpressConfig();
    return !!(config.appKey && config.appSecret);
  }

  /**
   * Gerar assinatura para API AliExpress
   * Conforme documentação: https://openservice.aliexpress.com/doc/doc.htm
   * 
   * Algoritmo:
   * 1. Ordenar todos os parâmetros (exceto 'sign') por nome em ordem ASCII
   * 2. Concatenar: key1value1key2value2...
   * 3. Prepend o método da API à string concatenada
   * 4. Gerar HMAC-SHA256 com app_secret
   * 5. Converter para hexadecimal maiúsculo
   */
  generateSignature(method, params, appSecret) {
    // Remover 'sign' se existir
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;

    // Ordenar parâmetros por nome em ordem ASCII
    const sortedKeys = Object.keys(paramsWithoutSign).sort();

    // Concatenar: key1value1key2value2...
    const concatenatedParams = sortedKeys
      .map(key => `${key}${paramsWithoutSign[key]}`)
      .join('');

    // Prepend o método da API conforme documentação
    const stringToSign = `${method}${concatenatedParams}`;

    // Gerar HMAC-SHA256
    return crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Fazer requisição para API AliExpress
   */
  async makeRequest(method, params = {}) {
    try {
      const config = await AppSettings.getAliExpressConfig();

      if (!config.appKey || !config.appSecret) {
        throw new Error('AliExpress não configurado - configure App Key e App Secret em /settings');
      }

      // Timestamp no formato requerido pela API AliExpress: milissegundos desde epoch
      // A API espera timestamp em milissegundos, não em formato ISO 8601
      const timestamp = Date.now();

      const requestParams = {
        app_key: config.appKey,
        method,
        timestamp,
        sign_method: 'sha256',
        format: 'json',
        v: '2.0',
        ...params
      };

      // Gerar assinatura (passar o método como primeiro parâmetro)
      const sign = this.generateSignature(method, requestParams, config.appSecret);
      requestParams.sign = sign;

      const baseUrl = config.apiUrl || this.defaultBaseUrl;

      // Log para debug (sem mostrar secrets)
      const debugParams = { ...requestParams };
      if (debugParams.app_key) {
        debugParams.app_key = `${debugParams.app_key.substring(0, 4)}...`;
      }
      delete debugParams.sign;
      logger.debug(`📡 Requisição AliExpress: ${method} - ${JSON.stringify(debugParams).substring(0, 200)}`);

      const response = await axios.get(baseUrl, {
        params: requestParams,
        timeout: 30000
      });

      // Verificar erros na resposta
      if (response.data.error_response) {
        const errorMsg = response.data.error_response.msg || 'Erro na API AliExpress';
        const errorCode = response.data.error_response.code || 'UNKNOWN';
        logger.error(`❌ Erro na API AliExpress [${errorCode}]: ${errorMsg}`);
        throw new Error(`API AliExpress: ${errorMsg} (Código: ${errorCode})`);
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        // Erro HTTP
        logger.error(`❌ Erro HTTP na requisição AliExpress: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          logger.error(`   Resposta: ${JSON.stringify(error.response.data).substring(0, 500)}`);
        }
        throw new Error(`Erro HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // Timeout ou erro de rede
        logger.error(`❌ Timeout ou erro de rede na requisição AliExpress`);
        throw new Error('Timeout ou erro de conexão com a API AliExpress');
      } else {
        // Outro erro
        logger.error(`❌ Erro na requisição AliExpress: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Buscar produtos do AliExpress baseado em palavras-chave
   */
  async fetchAliExpressProducts(keywords, limit = 50, productOrigin = 'both') {
    try {
      if (!(await this.isConfigured())) {
        logger.warn('⚠️ AliExpress não configurado - ALIEXPRESS_APP_KEY e ALIEXPRESS_APP_SECRET necessários');
        return [];
      }

      // Validar productOrigin
      if (!['brazil', 'international', 'both'].includes(productOrigin)) {
        logger.warn(`⚠️ Origem de produto inválida: ${productOrigin}. Usando 'both' como padrão.`);
        productOrigin = 'both';
      }

      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      // Determinar quais buscas fazer baseado na origem
      const searches = [];
      if (productOrigin === 'brazil' || productOrigin === 'both') {
        searches.push({ ship_to_country: 'BR', label: 'Brasil' });
      }
      if (productOrigin === 'international' || productOrigin === 'both') {
        searches.push({ ship_to_country: null, label: 'Internacional' });
      }

      for (const term of searchTerms) {
        logger.info(`🔍 Buscando no AliExpress: "${term}" (Origem: ${productOrigin})`);

        for (const search of searches) {
          try {
            // Buscar produtos usando aliexpress.affiliate.product.query
            logger.info(`   📡 Chamando API AliExpress para: "${term}" (${search.label})`);

            // Preparar parâmetros base
            const requestParams = {
              keywords: term,
              page_size: Math.min(limit, 50),
              page_no: 1,
              sort: 'SALE_PRICE_ASC',
              target_currency: 'BRL',
              target_language: 'PT'
            };

            // Adicionar ship_to_country apenas se for Brasil
            if (search.ship_to_country) {
              requestParams.ship_to_country = search.ship_to_country;
            }

            const response = await this.makeRequest('aliexpress.affiliate.product.query', requestParams);

            logger.debug(`   📦 Resposta recebida (${search.label}). Chaves: ${JSON.stringify(Object.keys(response || {})).substring(0, 200)}`);

            // Tentar diferentes formatos de resposta
            let products = null;

            // Formato principal: aliexpress_affiliate_product_query_response.resp_result.result.products
            if (response && response.aliexpress_affiliate_product_query_response) {
              const respResult = response.aliexpress_affiliate_product_query_response.resp_result;
              if (respResult) {
                if (respResult.result && respResult.result.products) {
                  products = respResult.result.products;
                } else if (respResult.products) {
                  products = respResult.products;
                } else if (respResult.result && Array.isArray(respResult.result)) {
                  products = respResult.result;
                }
              }
            }
            // Formato alternativo: resp_result.result.products (sem wrapper)
            else if (response && response.resp_result) {
              if (response.resp_result.result && response.resp_result.result.products) {
                products = response.resp_result.result.products;
              } else if (response.resp_result.products) {
                products = response.resp_result.products;
              }
            }
            // Formato 3: resposta direta
            else if (response && response.result) {
              if (response.result.products) {
                products = response.result.products;
              } else if (Array.isArray(response.result)) {
                products = response.result;
              }
            } else if (response && response.products) {
              products = response.products;
            } else if (Array.isArray(response)) {
              products = response;
            }

            if (products && Array.isArray(products) && products.length > 0) {
              logger.info(`   ✅ ${products.length} produtos encontrados no AliExpress (${search.label})`);

              for (const item of products) {
                try {
                  const product = this.parseAliExpressItem(item);
                  if (product && product.price > 0) {
                    // Adicionar flag de origem ao produto
                    product.origin = search.label.toLowerCase();
                    allProducts.push(product);
                  } else {
                    logger.debug(`   ⚠️ Produto ignorado (sem preço válido): ${item.product_id || item.productId || 'N/A'}`);
                  }
                } catch (error) {
                  logger.warn(`   ⚠️ Erro ao processar item: ${error.message}`);
                  logger.debug(`   Item que falhou: ${JSON.stringify(item).substring(0, 200)}`);
                }
              }
            } else {
              logger.warn(`   ⚠️ Nenhum produto encontrado para "${term}" (${search.label})`);
              logger.debug(`   Estrutura da resposta: ${JSON.stringify(response).substring(0, 500)}`);
            }
          } catch (error) {
            logger.error(`   ❌ Erro ao buscar "${term}" (${search.label}): ${error.message}`);
            logger.error(`   Stack: ${error.stack}`);

            // Se for erro de API, logar mais detalhes
            if (error.response) {
              logger.error(`   Resposta HTTP: ${error.response.status} - ${JSON.stringify(error.response.data).substring(0, 500)}`);
            }
          }
        }
      }

      if (allProducts.length === 0) {
        logger.warn(`⚠️ Nenhum produto foi encontrado no AliExpress para as palavras-chave: ${keywords}`);
        logger.warn(`   Verifique se:`);
        logger.warn(`   1. As credenciais da API estão corretas (App Key e App Secret)`);
        logger.warn(`   2. As palavras-chave estão corretas`);
        logger.warn(`   3. A API está retornando dados (verifique logs anteriores)`);
      } else {
        logger.info(`✅ Total de ${allProducts.length} produtos AliExpress processados`);
      }

      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro ao buscar produtos no AliExpress: ${error.message}`);
      if (error.stack) {
        logger.error(`   Stack: ${error.stack}`);
      }
      return [];
    }
  }

  /**
   * Obter detalhes de um produto específico por ID usando a API
   */
  async getProductDetails(productId) {
    try {
      if (!(await this.isConfigured())) {
        logger.warn('⚠️ AliExpress não configurado - não é possível obter detalhes do produto');
        return null;
      }

      logger.info(`🔍 Buscando detalhes do produto AliExpress: ${productId}`);

      // Usar o método aliexpress.affiliate.productdetail.get conforme documentação
      // Parâmetro: product_ids (plural, pode aceitar múltiplos IDs separados por vírgula)
      // Campos disponíveis: product_id, product_title, product_main_image_url, product_small_image_url, 
      // product_price, original_price, sale_price, product_detail_url, product_status, stock, etc.
      const response = await this.makeRequest('aliexpress.affiliate.productdetail.get', {
        product_ids: productId.toString(), // Usar plural conforme documentação
        fields: 'product_id,product_title,product_main_image_url,product_small_image_url,product_price,original_price,sale_price,app_sale_price,app_original_price,product_detail_url,product_status,stock,product_min_price,product_max_price',
        language: 'PT',
        currency: 'BRL'
      });

      // A resposta pode vir em diferentes formatos conforme a documentação
      let productData = null;

      // Formato 1: aliexpress_affiliate_productdetail_get_response.resp_result.result
      if (response && response.aliexpress_affiliate_productdetail_get_response) {
        const respResult = response.aliexpress_affiliate_productdetail_get_response.resp_result;
        if (respResult) {
          if (respResult.result) {
            productData = respResult.result;
          } else if (respResult.product) {
            productData = respResult.product;
          } else if (respResult.product_detail) {
            productData = respResult.product_detail;
          } else if (respResult.data) {
            productData = respResult.data;
          }
        }
      }
      // Formato 2: resposta direta
      else if (response && response.result) {
        productData = response.result;
      } else if (response && response.product) {
        productData = response.product;
      } else if (response && response.product_detail) {
        productData = response.product_detail;
      } else if (response && response.data) {
        productData = response.data;
      }

      // Log para debug
      if (!productData) {
        logger.warn(`   ⚠️ Estrutura de resposta não reconhecida`);
        logger.warn(`   Chaves na resposta: ${JSON.stringify(Object.keys(response || {})).substring(0, 500)}`);
        logger.debug(`   Resposta completa: ${JSON.stringify(response).substring(0, 1000)}`);
      }

      if (productData) {
        logger.info(`   ✅ Detalhes do produto obtidos via API`);
        return this.parseAliExpressItem(productData);
      }

      logger.warn(`   ⚠️ Produto não encontrado ou não disponível via API`);
      return null;
    } catch (error) {
      logger.error(`❌ Erro ao obter detalhes do produto AliExpress: ${error.message}`);
      return null;
    }
  }

  /**
   * Parsear item do AliExpress para formato padrão
   */
  parseAliExpressItem(item) {
    try {
      if (!item) {
        logger.warn('   ⚠️ Item vazio recebido para parsing');
        return null;
      }

      const productId = item.product_id?.toString() || item.productId?.toString() || item.productId;
      const title = item.product_title || item.title || item.productTitle || item.product_name || 'Produto AliExpress';

      if (!productId) {
        logger.warn(`   ⚠️ Produto sem ID: ${title.substring(0, 50)}`);
        return null;
      }

      // Preços - A API retorna preços em diferentes moedas
      // Priorizar campos "target_*" que já estão na moeda de destino (BRL)
      let salePrice = 0;
      let originalPrice = 0;

      // Prioridade 1: target_app_sale_price (preço com desconto já em BRL)
      if (item.target_app_sale_price !== undefined && item.target_app_sale_price !== null) {
        salePrice = typeof item.target_app_sale_price === 'string'
          ? parseFloat(item.target_app_sale_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.target_app_sale_price);
      }
      // Prioridade 2: target_sale_price (preço de venda em BRL)
      else if (item.target_sale_price !== undefined && item.target_sale_price !== null) {
        salePrice = typeof item.target_sale_price === 'string'
          ? parseFloat(item.target_sale_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.target_sale_price);
      }
      // Prioridade 3: app_sale_price (pode estar em outra moeda, mas usar como fallback)
      else if (item.app_sale_price !== undefined && item.app_sale_price !== null) {
        const priceValue = typeof item.app_sale_price === 'string'
          ? parseFloat(item.app_sale_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.app_sale_price);
        salePrice = priceValue;
      }
      // Prioridade 4: sale_price
      else if (item.sale_price !== undefined && item.sale_price !== null) {
        const priceValue = typeof item.sale_price === 'string'
          ? parseFloat(item.sale_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.sale_price);
        salePrice = priceValue;
      }

      // Preço original - Priorizar target_original_price (já em BRL)
      if (item.target_original_price !== undefined && item.target_original_price !== null) {
        originalPrice = typeof item.target_original_price === 'string'
          ? parseFloat(item.target_original_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.target_original_price);
      }
      // Fallback: original_price
      else if (item.original_price !== undefined && item.original_price !== null) {
        const priceValue = typeof item.original_price === 'string'
          ? parseFloat(item.original_price.replace(/[^\d.,]/g, '').replace(',', '.'))
          : parseFloat(item.original_price);
        originalPrice = priceValue;
      }

      // Validar preços
      if (salePrice <= 0) {
        logger.debug(`   ⚠️ Produto sem preço válido: ${title.substring(0, 50)} (ID: ${productId})`);
        return null;
      }

      // Imagem - Priorizar product_main_image_url (imagem principal de alta qualidade)
      // A API retorna product_main_image_url que é a melhor qualidade
      let imageUrl = item.product_main_image_url ||
        item.productMainImageUrl ||
        item.product_main_image ||
        item.product_small_image_url ||
        item.productSmallImageUrl ||
        item.image_url ||
        item.imageUrl ||
        '';

      // Se tiver product_small_image_urls (array), pegar a primeira
      if (!imageUrl && item.product_small_image_urls && Array.isArray(item.product_small_image_urls) && item.product_small_image_urls.length > 0) {
        imageUrl = item.product_small_image_urls[0];
      }

      // Validar URL da imagem
      if (imageUrl && (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        // Se a URL não começa com http, pode ser um caminho relativo - tentar construir URL completa
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://ae-pic-a1.aliexpress-media.com${imageUrl}`;
        } else {
          // URL inválida, limpar
          imageUrl = '';
        }
      }

      // Link - Priorizar product_detail_url (link original) sobre promotion_link (já tem tracking)
      // Mas manter ambos disponíveis para uso posterior
      const originalProductUrl = item.product_detail_url ||
        item.productDetailUrl ||
        item.product_url ||
        (productId ? `https://pt.aliexpress.com/item/${productId}.html` : '');

      // promotion_link pode ter tracking, mas vamos usar como fallback se não tiver product_detail_url
      const promotionLink = item.promotion_link || originalProductUrl;

      // Usar promotion_link como permalink (pode ter tracking), mas salvar original separadamente
      const productUrl = promotionLink;

      // Verificar se tem desconto
      const hasDiscount = originalPrice > salePrice && originalPrice > 0 && salePrice > 0;

      logger.debug(`   ✅ Produto parseado: ${title.substring(0, 40)} - R$ ${salePrice.toFixed(2)}${hasDiscount ? ` (Original: R$ ${originalPrice.toFixed(2)})` : ''}`);
      logger.debug(`   📸 Imagem extraída: ${imageUrl ? imageUrl.substring(0, 80) + '...' : 'NÃO ENCONTRADA'}`);

      return {
        id: productId,
        title,
        permalink: productUrl, // Pode ter tracking (promotion_link) ou ser original
        original_url: originalProductUrl, // Link original limpo (sem tracking)
        thumbnail: imageUrl, // Será usado como image_url no filterAliExpressPromotions
        image_url: imageUrl, // Adicionar também como image_url para garantir
        price: salePrice,
        original_price: hasDiscount ? originalPrice : null,
        currency: 'BRL',
        available_quantity: item.stock || item.available_stock || (item.product_status === 'onShelf' ? 1 : 0),
        product_id: productId,
        raw_data: item
      };
    } catch (error) {
      logger.error(`Erro ao parsear item AliExpress: ${error.message}`);
      logger.error(`   Item que falhou: ${JSON.stringify(item).substring(0, 200)}`);
      return null;
    }
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  filterAliExpressPromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      const currentPrice = product.price;
      const originalPrice = product.original_price;

      // Se não tiver preço original, não é promoção
      if (!originalPrice || originalPrice <= currentPrice) {
        continue;
      }

      // Calcular desconto
      const discount = ((originalPrice - currentPrice) / originalPrice) * 100;

      if (discount >= minDiscountPercentage) {
        // Usar image_url ou thumbnail do produto (já vem do parseAliExpressItem com validação)
        // Priorizar image_url se existir, senão usar thumbnail
        let imageUrl = product.image_url || product.thumbnail || '';

        // Log para debug
        logger.debug(`   📸 Processando imagem para promoção: ${product.title}`);
        logger.debug(`      image_url: ${product.image_url || 'NÃO DEFINIDA'}`);
        logger.debug(`      thumbnail: ${product.thumbnail || 'NÃO DEFINIDA'}`);
        logger.debug(`      imageUrl final: ${imageUrl || 'NÃO DEFINIDA'}`);

        // Validar e melhorar URL da imagem
        if (!imageUrl || imageUrl.trim().length === 0) {
          logger.warn(`   ⚠️ Produto sem imagem: ${product.title}`);
          imageUrl = ''; // Deixar vazio ao invés de placeholder
        } else if (imageUrl.includes('placeholder') || !imageUrl.startsWith('http')) {
          logger.warn(`   ⚠️ Imagem inválida para produto: ${product.title} - ${imageUrl}`);
          imageUrl = ''; // Deixar vazio ao invés de placeholder
        } else {
          logger.debug(`   ✅ Imagem válida encontrada: ${imageUrl.substring(0, 80)}...`);
        }

        // Capturar link original (sem parâmetros de tracking)
        // Priorizar original_url se disponível (já é o link limpo)
        // Senão, tentar extrair do permalink removendo parâmetros de tracking
        let originalLink = product.original_url || product.permalink || '';

        // Se o link tiver parâmetros de tracking (aff_trace_key, etc), remover para ter o link original
        if (originalLink && !product.original_url) {
          try {
            const url = new URL(originalLink);
            // Remover parâmetros de tracking para obter link original limpo
            url.searchParams.delete('aff_trace_key');
            url.searchParams.delete('terminal_id');
            url.searchParams.delete('aff_platform');
            url.searchParams.delete('aff_short_key');
            originalLink = url.toString();
          } catch (e) {
            // Se não for URL válida, usar como está
            logger.debug(`   Link não é URL válida, usando como está: ${originalLink}`);
          }
        }

        // Se não tiver link original, tentar construir a partir do product_id
        if (!originalLink && product.id) {
          originalLink = `https://pt.aliexpress.com/item/${product.id}.html`;
        }

        logger.debug(`   🔗 Link original capturado: ${originalLink.substring(0, 80)}...`);
        logger.debug(`   🔗 Permalink (pode ter tracking): ${product.permalink ? product.permalink.substring(0, 80) + '...' : 'NÃO DEFINIDO'}`);

        promotions.push({
          external_id: `aliexpress-${product.id}`,
          name: product.title,
          image_url: imageUrl, // Campo obrigatório para publicação nos bots
          platform: 'aliexpress',
          current_price: currentPrice,
          old_price: originalPrice,
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink, // Link que pode ter tracking (será substituído depois)
          original_link: originalLink, // Link original limpo (sem tracking)
          stock_available: (product.available_quantity || 0) > 0,
          raw_data: product // Preservar raw_data para recuperar imagem se necessário
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas no AliExpress (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado do AliExpress
   */
  async generateAliExpressAffiliateLink(productUrl) {
    try {
      const config = await AppSettings.getAliExpressConfig();
      const trackingId = config.trackingId;

      if (!trackingId) {
        logger.warn('⚠️ AliExpress Tracking ID não configurado - retornando link original');
        return productUrl;
      }

      // Adicionar parâmetros de afiliado
      try {
        const url = new URL(productUrl);
        url.searchParams.set('aff_trace_key', trackingId);
        url.searchParams.set('terminal_id', 'MTWPromo');
        return url.toString();
      } catch (e) {
        // Se não for URL válida, construir
        const productId = productUrl.match(/\/(\d+)\.html/)?.[1] || productUrl;
        return `https://pt.aliexpress.com/item/${productId}.html?aff_trace_key=${trackingId}&terminal_id=MTWPromo`;
      }
    } catch (error) {
      logger.warn(`⚠️ Erro ao gerar link de afiliado AliExpress: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveAliExpressToDatabase(product, Product) {
    try {
      // Verificar se já existe pelo external_id
      const existing = await Product.findByExternalId(product.external_id);

      if (existing) {
        // Se o preço mudou, atualizar
        if (existing.current_price !== product.current_price) {
          await Product.updatePrice(existing.id, product.current_price);
          logger.info(`🔄 Produto atualizado (Preço): ${product.name}`);
          return { product: existing, isNew: true };
        }

        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Verificar se a imagem é válida
      // IMPORTANTE: A imagem é obrigatória para envio nos bots
      // Se não tiver imagem válida, tentar buscar do raw_data
      if (!product.image_url ||
        product.image_url.includes('data:image') ||
        product.image_url.includes('placeholder') ||
        !product.image_url.startsWith('http')) {

        logger.warn(`⚠️ Produto ${product.name} sem imagem válida, tentando buscar do raw_data...`);

        // Tentar buscar imagem do raw_data (dados brutos da API)
        if (product.raw_data) {
          const rawImage = product.raw_data.product_main_image_url ||
            product.raw_data.productMainImageUrl ||
            product.raw_data.product_small_image_url ||
            product.raw_data.productSmallImageUrl ||
            (product.raw_data.product_small_image_urls &&
              Array.isArray(product.raw_data.product_small_image_urls) &&
              product.raw_data.product_small_image_urls.length > 0
              ? product.raw_data.product_small_image_urls[0] : null);

          if (rawImage && rawImage.startsWith('http')) {
            product.image_url = rawImage;
            logger.info(`   ✅ Imagem recuperada do raw_data: ${rawImage.substring(0, 80)}...`);
          } else {
            logger.error(`   ❌ Produto ${product.name} SEM IMAGEM VÁLIDA - não será enviado aos bots`);
            // NÃO usar placeholder - deixar vazio para que o publishService detecte e não envie
            product.image_url = '';
          }
        } else {
          logger.error(`   ❌ Produto ${product.name} SEM IMAGEM e SEM raw_data - não será enviado aos bots`);
          product.image_url = '';
        }
      } else {
        logger.info(`   ✅ Imagem válida encontrada: ${product.image_url.substring(0, 80)}...`);
      }

      // Detectar categoria automaticamente se não tiver
      if (!product.category_id) {
        try {
          const detectedCategory = await categoryDetector.detectWithAI(product.name);
          if (detectedCategory) {
            product.category_id = detectedCategory.id;
            logger.info(`📂 Categoria detectada: ${detectedCategory.name} para ${product.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao detectar categoria: ${error.message}`);
        }
      }

      // Preservar link original antes de gerar link de afiliado
      // Priorizar original_link se já foi capturado, senão usar affiliate_link ou link
      const originalLink = product.original_link ||
        (product.affiliate_link ? (() => {
          // Se affiliate_link tiver parâmetros de tracking, remover para obter original
          try {
            const url = new URL(product.affiliate_link);
            url.searchParams.delete('aff_trace_key');
            url.searchParams.delete('terminal_id');
            url.searchParams.delete('aff_platform');
            url.searchParams.delete('aff_short_key');
            return url.toString();
          } catch (e) {
            return product.affiliate_link;
          }
        })() : '') ||
        product.link ||
        '';

      // Gerar link de afiliado a partir do link original limpo
      product.affiliate_link = await this.generateAliExpressAffiliateLink(originalLink);

      // Log dos links
      logger.info(`   🔗 Link original: ${originalLink || 'NÃO DEFINIDO'}`);
      logger.info(`   🔗 Link de afiliado: ${product.affiliate_link || 'NÃO DEFINIDO'}`);

      // Log final antes de salvar
      logger.info(`📦 Salvando produto no banco:`);
      logger.info(`   Nome: ${product.name}`);
      logger.info(`   image_url: ${product.image_url || 'NÃO DEFINIDA'}`);
      logger.info(`   image_url válida: ${product.image_url && product.image_url.startsWith('http') ? 'SIM' : 'NÃO'}`);
      logger.info(`   original_link: ${originalLink || 'NÃO DEFINIDO'}`);
      logger.info(`   affiliate_link: ${product.affiliate_link || 'NÃO DEFINIDO'}`);

      // Criar novo produto com status 'pending' e original_link
      const newProduct = await Product.create({
        ...product,
        status: 'pending',
        original_link: originalLink // Salvar link original limpo
      });

      logger.info(`✅ Novo produto salvo (pendente): ${product.name}`);
      logger.info(`   ID do produto: ${newProduct.id}`);
      logger.info(`   image_url salva: ${newProduct.image_url || 'NÃO DEFINIDA'}`);
      logger.info(`   original_link salvo: ${newProduct.original_link || 'NÃO DEFINIDO'}`);
      logger.info(`   affiliate_link salvo: ${newProduct.affiliate_link || 'NÃO DEFINIDO'}`);

      return { product: newProduct, isNew: true };
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      throw error;
    }
  }
}

export default new AliExpressSync();


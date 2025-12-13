import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import Coupon from '../../models/Coupon.js';
import categoryDetector from '../categoryDetector.js';

class AmazonSync {
  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY;
    this.secretKey = process.env.AMAZON_SECRET_KEY;
    this.partnerTag = process.env.AMAZON_PARTNER_TAG;
    this.marketplace = process.env.AMAZON_MARKETPLACE || 'www.amazon.com.br';
    this.baseUrl = 'https://webservices.amazon.com.br/paapi5';
    this.region = 'us-east-1';
  }

  /**
   * Verificar se Amazon está configurado
   */
  isConfigured() {
    return !!(this.accessKey && this.secretKey && this.partnerTag);
  }

  /**
   * Gerar assinatura AWS v4 para PA-API 5
   */
  generateSignature(method, uri, query, headers, payload) {
    // Implementação simplificada - em produção use biblioteca aws4
    const canonicalRequest = [
      method,
      uri,
      query,
      Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join('\n'),
      '',
      Object.keys(headers).sort().map(k => k.toLowerCase()).join(';'),
      crypto.createHash('sha256').update(payload).digest('hex')
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      headers['X-Amz-Date'],
      `${headers['X-Amz-Date'].substring(0, 8)}/${this.region}/product-advertising-api/aws4_request`,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${this.secretKey}`).update(headers['X-Amz-Date'].substring(0, 8)).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('product-advertising-api').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

    return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  }

  /**
   * Fazer requisição autenticada à PA-API 5
   */
  async makeRequest(operation, params = {}) {
    try {
      if (!this.isConfigured()) {
        logger.warn('⚠️ Amazon não configurado - AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY e AMAZON_PARTNER_TAG necessários');
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      const date = timestamp.substring(0, 8);

      const payload = JSON.stringify({
        PartnerTag: this.partnerTag,
        PartnerType: 'Associates',
        Marketplace: this.marketplace,
        ...params
      });

      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
        'X-Amz-Date': timestamp,
        'Host': 'webservices.amazon.com.br'
      };

      const signature = this.generateSignature('POST', '/paapi5/searchitems', '', headers, payload);

      headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${date}/${this.region}/product-advertising-api/aws4_request, SignedHeaders=${Object.keys(headers).map(k => k.toLowerCase()).sort().join(';')}, Signature=${signature}`;

      const response = await axios.post(`${this.baseUrl}/searchitems`, payload, {
        headers,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.warn(`⚠️ Erro de autenticação Amazon (${error.response.status}): Verifique credenciais`);
      } else {
        logger.error(`❌ Erro na requisição Amazon: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Buscar produtos da Amazon baseado em palavras-chave
   */
  async fetchAmazonProducts(keywords, limit = 50) {
    try {
      if (!this.isConfigured()) {
        logger.warn('⚠️ Amazon não configurado - retornando array vazio');
        return [];
      }

      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      for (const term of searchTerms) {
        logger.info(`🔍 Buscando na Amazon: "${term}"`);

        try {
          const response = await this.makeRequest('SearchItems', {
            Keywords: term,
            ItemCount: Math.min(limit, 10), // PA-API limita a 10 por requisição
            Resources: [
              'ItemInfo.Title',
              'ItemInfo.ByLineInfo',
              'ItemInfo.Classifications',
              'ItemInfo.ExternalIds',
              'ItemInfo.Images',
              'ItemInfo.ProductInfo',
              'Offers.Listings.Price',
              'Offers.Listings.Availability',
              'Offers.Summaries'
            ]
          });

          if (response && response.SearchResult && response.SearchResult.Items) {
            const items = response.SearchResult.Items;
            logger.info(`   ✅ ${items.length} produtos encontrados na Amazon`);

            for (const item of items) {
              try {
                const product = this.parseAmazonItem(item);
                if (product) {
                  allProducts.push(product);
                }
              } catch (error) {
                logger.warn(`   ⚠️ Erro ao processar item: ${error.message}`);
              }
            }
          }
        } catch (error) {
          logger.error(`   ❌ Erro ao buscar "${term}": ${error.message}`);
        }
      }

      logger.info(`✅ Total de ${allProducts.length} produtos Amazon processados`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro ao buscar produtos na Amazon: ${error.message}`);
      return [];
    }
  }

  /**
   * Parsear item da Amazon para formato padrão
   */
  parseAmazonItem(item) {
    try {
      const asin = item.ASIN;
      const title = item.ItemInfo?.Title?.DisplayValue || 'Produto Amazon';
      const images = item.ItemInfo?.Images;
      const primaryImage = images?.Primary?.Large?.URL || images?.Primary?.Medium?.URL || '';
      
      const offers = item.Offers?.Listings?.[0];
      const price = offers?.Price?.Amount || 0;
      const currency = offers?.Price?.Currency || 'BRL';
      const currentPrice = parseFloat(price) / 100; // Amazon retorna em centavos

      // Tentar obter preço original (se houver desconto)
      const savings = offers?.Price?.Savings;
      const originalPrice = savings ? (parseFloat(savings.Amount) / 100) + currentPrice : null;

      // Verificar disponibilidade
      const availability = offers?.Availability;
      const inStock = availability?.Message === 'In stock' || availability?.MinOrderQuantity > 0;

      return {
        id: asin,
        title,
        permalink: `https://www.amazon.com.br/dp/${asin}?tag=${this.partnerTag}`,
        thumbnail: primaryImage,
        price: currentPrice,
        original_price: originalPrice,
        currency,
        available_quantity: inStock ? 1 : 0,
        asin,
        raw_data: item
      };
    } catch (error) {
      logger.error(`Erro ao parsear item Amazon: ${error.message}`);
      return null;
    }
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  filterAmazonPromotions(products, minDiscountPercentage = 10) {
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
        // Melhorar URL da imagem
        let imageUrl = product.thumbnail;
        if (!imageUrl || imageUrl.includes('placeholder')) {
          imageUrl = 'https://via.placeholder.com/300x300?text=Sem+Imagem';
        }

        promotions.push({
          external_id: `amazon-${product.id}`,
          name: product.title,
          image_url: imageUrl,
          platform: 'amazon',
          current_price: currentPrice,
          old_price: originalPrice,
          discount_percentage: Math.round(discount),
          affiliate_link: product.permalink,
          stock_available: (product.available_quantity || 0) > 0,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas na Amazon (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Gerar link de afiliado da Amazon
   */
  async generateAmazonAffiliateLink(productUrl) {
    try {
      if (!this.partnerTag) {
        logger.warn('⚠️ Amazon Partner Tag não configurado - retornando link original');
        return productUrl;
      }

      // Se já tiver tag, retornar como está
      if (productUrl.includes('tag=')) {
        return productUrl;
      }

      // Adicionar partner tag
      try {
        const url = new URL(productUrl);
        url.searchParams.set('tag', this.partnerTag);
        return url.toString();
      } catch (e) {
        // Se não for URL válida, construir a partir do ASIN
        const asin = productUrl.match(/\/dp\/([A-Z0-9]{10})/)?.[1] || productUrl;
        return `https://www.amazon.com.br/dp/${asin}?tag=${this.partnerTag}`;
      }
    } catch (error) {
      logger.warn(`⚠️ Erro ao gerar link de afiliado Amazon: ${error.message}`);
      return productUrl;
    }
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveAmazonToDatabase(product, Product) {
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
      if (!product.image_url || 
          product.image_url.includes('data:image') || 
          product.image_url.includes('placeholder') ||
          !product.image_url.startsWith('http')) {
        logger.warn(`⚠️ Produto ${product.name} sem imagem válida`);
        product.image_url = product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem';
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

      // Gerar link de afiliado (async)
      product.affiliate_link = await this.generateAmazonAffiliateLink(product.affiliate_link);

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

export default new AmazonSync();


import logger from '../../config/logger.js';
import linkAnalyzer from '../linkAnalyzer.js';
import categoryDetector from '../categoryDetector.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

class MagaluSync {
    /**
     * Buscar produtos da Magazine Luiza via web scraping
     * Extrai URLs de produtos da página de ofertas
     */
    async fetchMagaluProducts(keywords, limit = 20) {
        try {
            logger.info(`🔍 Buscando produtos da Magazine Luiza (Web Scraping)...`);

            // URLs de páginas de ofertas da Magazine Luiza
            const offerPages = [
                'https://www.magazineluiza.com.br/ofertas/',
                'https://www.magazineluiza.com.br/selecao/ofertasdodia/'
            ];

            const allProductUrls = [];

            for (const pageUrl of offerPages) {
                if (allProductUrls.length >= limit) break;

                try {
                    logger.info(`   📄 Analisando página: ${pageUrl}`);

                    // Fazer requisição HTTP
                    const response = await axios.get(pageUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                        },
                        timeout: 15000
                    });

                    const $ = cheerio.load(response.data);
                    let pageProductCount = 0;

                    // Seletores para produtos na Magazine Luiza
                    const selectors = [
                        '[data-testid="product-card-container"] a',  // Card de produto
                        'a[href*="/p/"]',                             // Links de produtos (formato /p/)
                        '.sc-fKVqWL a[href*="/p/"]',                  // Container de produtos
                        'a[data-testid="link-product"]'               // Link direto do produto
                    ];

                    for (const selector of selectors) {
                        $(selector).each((i, elem) => {
                            if (allProductUrls.length >= limit) return false;

                            let href = $(elem).attr('href');
                            if (!href) return;

                            // Normalizar URL
                            if (href.startsWith('/')) {
                                href = 'https://www.magazineluiza.com.br' + href;
                            } else if (!href.startsWith('http')) {
                                href = 'https://www.magazineluiza.com.br/' + href;
                            }

                            // Verificar se é uma URL de produto válida
                            // Magazine Luiza usa formato: /produto-nome/p/codigo/
                            if (href.includes('/p/') && !allProductUrls.includes(href)) {
                                // Remover query params
                                const cleanUrl = href.split('?')[0];
                                allProductUrls.push(cleanUrl);
                                pageProductCount++;
                            }
                        });

                        // Se já encontrou produtos, não precisa testar outros seletores
                        if (pageProductCount > 0) break;
                    }

                    logger.info(`   ✅ ${pageProductCount} produtos encontrados nesta página`);

                    // Aguardar 1 segundo entre páginas para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    logger.warn(`   ⚠️ Erro ao processar página ${pageUrl}: ${error.message}`);
                }
            }

            // Remover duplicatas
            const uniqueUrls = [...new Set(allProductUrls)];

            // Limitar quantidade
            const limitedUrls = uniqueUrls.slice(0, limit);

            logger.info(`✅ Total de ${limitedUrls.length} URLs de produtos Magazine Luiza encontradas`);
            return limitedUrls;
        } catch (error) {
            logger.error(`❌ Erro ao buscar produtos na Magazine Luiza: ${error.message}`);
            return [];
        }
    }

    /**
     * Filtrar produtos que são válidas promoções
     */
    filterMagaluPromotions(products, minDiscountPercentage = 10) {
        const promotions = [];

        for (const product of products) {
            // Calcular porcentagem de desconto
            let discountPercentage = 0;
            if (product.old_price && product.old_price > product.current_price) {
                discountPercentage = ((product.old_price - product.current_price) / product.old_price) * 100;
            }

            // Filtrar por desconto mínimo
            if (discountPercentage < minDiscountPercentage) {
                continue;
            }

            promotions.push({
                external_id: `magazineluiza-${product.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: product.name,
                image_url: product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
                platform: 'magazineluiza',
                current_price: product.current_price || 0,
                old_price: product.old_price || null,
                discount_percentage: Math.round(discountPercentage),
                affiliate_link: product.link,
                stock_available: true,
                category_id: null
            });
        }

        logger.info(`🎯 ${promotions.length} ofertas válidas encontradas na Magazine Luiza (desconto ≥ ${minDiscountPercentage}%)`);
        return promotions;
    }

    /**
     * Analisar um link individual da Magazine Luiza
     */
    async analyzeMagaluLink(url) {
        try {
            logger.info(`🔗 Analisando link da Magazine Luiza: ${url}`);
            const productData = await linkAnalyzer.extractMagaluInfo(url);

            if (productData.error) {
                logger.error(`❌ Erro ao analisar link: ${productData.error}`);
                return null;
            }

            return {
                external_id: `magazineluiza-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: productData.name,
                image_url: productData.imageUrl,
                platform: 'magazineluiza',
                current_price: productData.currentPrice,
                old_price: productData.oldPrice,
                discount_percentage: productData.oldPrice > 0
                    ? Math.round(((productData.oldPrice - productData.currentPrice) / productData.oldPrice) * 100)
                    : 0,
                affiliate_link: url,
                stock_available: true,
                category_id: null
            };
        } catch (error) {
            logger.error(`❌ Erro ao analisar link da Magazine Luiza: ${error.message}`);
            return null;
        }
    }

    /**
     * Salvar produto no banco de dados
     */
    async saveMagaluToDatabase(product, Product) {
        try {
            // Verificar se já existe
            const existing = await Product.findByExternalId(product.external_id);
            if (existing) {
                logger.info(`📦 Produto já existe: ${product.name}`);
                return { product: existing, isNew: false };
            }

            // Detectar categoria automaticamente
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

            // Preparar dados
            const productData = {
                name: product.name,
                image_url: product.image_url,
                platform: 'magazineluiza',
                current_price: product.current_price,
                old_price: product.old_price,
                discount_percentage: product.discount_percentage,
                category_id: product.category_id || null,
                affiliate_link: product.affiliate_link,
                external_id: product.external_id,
                stock_available: true,
                status: 'pending'
            };

            // Criar novo produto
            const newProduct = await Product.create(productData);
            logger.info(`✅ Novo produto Magazine Luiza salvo: ${product.name}`);

            return { product: newProduct, isNew: true };
        } catch (error) {
            logger.error(`❌ Erro ao salvar produto Magazine Luiza: ${error.message}`);
            throw error;
        }
    }
}

export default new MagaluSync();

import logger from '../../config/logger.js';
import linkAnalyzer from '../linkAnalyzer.js';
import categoryDetector from '../categoryDetector.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import browserScraper from '../browserScraper.js';

class TerabyteSync {
    /**
     * Buscar produtos da Terabyteshop via web scraping
     * Extrai URLs de produtos da página de ofertas/promoções
     */
    async fetchTerabyteProducts(keywords, limit = 20) {
        try {
            logger.info(`🔍 Buscando produtos da Terabyteshop (Puppeteer - JavaScript Rendering)...`);

            // URLs de páginas de ofertas da Terabyteshop
            const offerPages = [
                'https://www.terabyteshop.com.br/hardware',
                'https://www.terabyteshop.com.br/computadores',
                'https://www.terabyteshop.com.br/perifericos'
            ];

            const allProductUrls = [];

            // Seletores corretos baseados em inspeção real do site
            const selectors = [
                '.pbox a.prod-name',                    // Seletor CORRETO (nome do produto)
                '.pbox a.commerce_columns_item_image',  // Link da imagem do produto
                'a.prod-name',                          // Nome do produto direto
                'a[href*="/produto/"]'                  // Fallback: qualquer link de produto
            ];

            for (const pageUrl of offerPages) {
                if (allProductUrls.length >= limit) break;

                try {
                    logger.info(`   📄 Analisando página com Puppeteer: ${pageUrl}`);

                    // Usar método com espera por seletor (bypass Cloudflare)
                    const links = await browserScraper.extractProductLinksWithWait(
                        pageUrl,
                        selectors,
                        '.pbox',  // Aguardar este elemento aparecer
                        20000     // Timeout de 20s para Cloudflare
                    );

                    // Adicionar links únicos
                    for (const link of links) {
                        if (!allProductUrls.includes(link) && allProductUrls.length < limit) {
                            allProductUrls.push(link);
                        }
                    }

                    logger.info(`   ✅ ${links.length} produtos encontrados nesta página`);
                    logger.info(`   📊 Total acumulado: ${allProductUrls.length} produtos`);

                    if (allProductUrls.length < limit) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                } catch (error) {
                    logger.warn(`   ⚠️ Erro ao processar página ${pageUrl}: ${error.message}`);
                }
            }

            // Remover duplicatas
            const uniqueUrls = [...new Set(allProductUrls)];

            // Limitar quantidade
            const limitedUrls = uniqueUrls.slice(0, limit);

            if (limitedUrls.length === 0) {
                logger.warn(`⚠️ Terabyteshop: Nenhum produto encontrado (possível bloqueio Cloudflare)`);
                logger.info(`💡 O site pode estar com proteção anti-bot ativa`);
            } else {
                logger.info(`✅ Total de ${limitedUrls.length} URLs de produtos Terabyteshop encontradas via Puppeteer`);
            }

            return limitedUrls;
        } catch (error) {
            logger.error(`❌ Erro ao buscar produtos na Terabyteshop com Puppeteer: ${error.message}`);
            return [];
        } finally {
            try {
                await browserScraper.close();
            } catch (e) {
                // Ignorar
            }
        }
    }

    /**
     * Filtrar produtos que são válidas promoções
     */
    filterTerabytePromotions(products, minDiscountPercentage = 10) {
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
                external_id: `terabyteshop-${product.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: product.name,
                image_url: product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
                platform: 'terabyteshop',
                current_price: product.current_price || 0,
                old_price: product.old_price || null,
                discount_percentage: Math.round(discountPercentage),
                affiliate_link: product.link,
                stock_available: true,
                category_id: null
            });
        }

        logger.info(`🎯 ${promotions.length} ofertas válidas encontradas na Terabyteshop (desconto ≥ ${minDiscountPercentage}%)`);
        return promotions;
    }

    /**
     * Analisar um link individual da Terabyteshop
     */
    async analyzeTerabyteLink(url) {
        try {
            logger.info(`🔗 Analisando link da Terabyteshop: ${url}`);
            const productData = await linkAnalyzer.extractTerabyteInfo(url);

            if (productData.error) {
                logger.error(`❌ Erro ao analisar link: ${productData.error}`);
                return null;
            }

            return {
                external_id: `terabyteshop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: productData.name,
                image_url: productData.imageUrl,
                platform: 'terabyteshop',
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
            logger.error(`❌ Erro ao analisar link da Terabyteshop: ${error.message}`);
            return null;
        }
    }

    /**
     * Salvar produto no banco de dados
     */
    async saveTerabyteToDatabase(product, Product) {
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
                platform: 'terabyteshop',
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
            logger.info(`✅ Novo produto Terabyteshop salvo: ${product.name}`);

            return { product: newProduct, isNew: true };
        } catch (error) {
            logger.error(`❌ Erro ao salvar produto Terabyteshop: ${error.message}`);
            throw error;
        }
    }
}

export default new TerabyteSync();

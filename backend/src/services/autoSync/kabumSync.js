import logger from '../../config/logger.js';
import linkAnalyzer from '../linkAnalyzer.js';
import categoryDetector from '../categoryDetector.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import browserScraper from '../browserScraper.js';

class KabumSync {
    /**
     * Buscar produtos da Kabum via web scraping
     * Extrai URLs de produtos da página de ofertas
     */
    async fetchKabumProducts(keywords, limit = 20) {
        try {
            logger.info(`🔍 Buscando produtos da Kabum (Puppeteer - JavaScript Rendering)...`);

            // URLs de páginas de ofertas da Kabum
            const offerPages = [
                'https://www.kabum.com.br/acabaramdechegar', // Produtos recentes
                'https://www.kabum.com.br/ofertas',
                'https://www.kabum.com.br/lancamentos',
                'https://www.kabum.com.br/promocao/maisvendidos',
                'https://www.kabum.com.br/promocao/COMPUTADORKABUM',
                'https://www.kabum.com.br/gamer',
                'https://www.kabum.com.br/computadores',
                'https://www.kabum.com.br/celular-smartphone',
                'https://www.kabum.com.br/tv',
                'https://www.kabum.com.br/hardware/placa-de-video-vga',
                'https://www.kabum.com.br/hardware/fontes',
                'https://www.kabum.com.br/hardware/placas-mae',
                'https://www.kabum.com.br/hardware/processadores',
                'https://www.kabum.com.br/hardware/ssd-2-5',
                'https://www.kabum.com.br/hardware/memoria-ram'
            ];

            const allProductUrls = [];

            // Seletores para testar (ordem de prioridade)
            const selectors = [
                'a.productLink',
                '.productCard a',
                'a[href*="/produto/"]',
                'article a[href*="/produto/"]'
            ];

            for (const pageUrl of offerPages) {
                if (allProductUrls.length >= limit) break;

                try {
                    logger.info(`   📄 Analisando página com Puppeteer: ${pageUrl}`);

                    // Usar Puppeteer com retry automático e validação robusta
                    const links = await browserScraper.extractProductLinksWithRetry(
                        pageUrl,
                        selectors,
                        '.pbox', // Seletor para aguardar
                        3, // 3 tentativas
                        30000 // 30s timeout
                    );

                    // Adicionar links únicos
                    for (const link of links) {
                        if (!allProductUrls.includes(link) && allProductUrls.length < limit) {
                            allProductUrls.push(link);
                        }
                    }

                    logger.info(`   ✅ ${links.length} produtos encontrados nesta página`);
                    logger.info(`   📊 Total acumulado: ${allProductUrls.length} produtos`);

                    // Aguardar entre páginas
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
                logger.warn(`⚠️ Kabum: Puppeteer não encontrou produtos`);
                logger.info(`💡 Verifique se o site está acessível`);
            } else {
                logger.info(`✅ Total de ${limitedUrls.length} URLs de produtos Kabum encontradas via Puppeteer`);
            }

            return limitedUrls;
        } catch (error) {
            logger.error(`❌ Erro ao buscar produtos na Kabum com Puppeteer: ${error.message}`);
            return [];
        } finally {
            // Fechar browser para liberar recursos
            try {
                await browserScraper.close();
            } catch (e) {
                // Ignorar erro ao fechar
            }
        }
    }

    /**
     * Filtrar produtos que são válidas promoções
     */
    filterKabumPromotions(products, minDiscountPercentage = 10) {
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
                external_id: `kabum-${product.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: product.name,
                image_url: product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
                platform: 'kabum',
                current_price: product.current_price || 0,
                old_price: product.old_price || null,
                discount_percentage: Math.round(discountPercentage),
                affiliate_link: product.link,
                stock_available: true,
                category_id: null
            });
        }

        logger.info(`🎯 ${promotions.length} ofertas válidas encontradas na Kabum (desconto ≥ ${minDiscountPercentage}%)`);
        return promotions;
    }

    /**
     * Analisar um link individual da Kabum
     */
    async analyzeKabumLink(url) {
        try {
            logger.info(`🔗 Analisando link da Kabum: ${url}`);

            // Usar Puppeteer para extrair informações (preços são renderizados via JS)
            const productData = await browserScraper.extractKabumProductInfo(url);

            if (productData.error) {
                logger.error(`❌ Erro ao analisar link: ${productData.error}`);
                return null;
            }

            return {
                external_id: `kabum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: productData.name,
                image_url: productData.imageUrl,
                platform: 'kabum',
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
            logger.error(`❌ Erro ao analisar link da Kabum: ${error.message}`);
            return null;
        }
    }

    /**
     * Salvar produto no banco de dados
     */
    async saveKabumToDatabase(product, Product) {
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
                platform: 'kabum',
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
            logger.info(`✅ Novo produto Kabum salvo: ${product.name}`);

            return { product: newProduct, isNew: true };
        } catch (error) {
            logger.error(`❌ Erro ao salvar produto Kabum: ${error.message}`);
            throw error;
        }
    }
}

export default new KabumSync();

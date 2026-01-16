import logger from '../../config/logger.js';
import linkAnalyzer from '../linkAnalyzer.js';
import categoryDetector from '../categoryDetector.js';
import browserScraper from '../browserScraper.js';

class PichauSync {
    /**
     * Buscar produtos da Pichau via web scraping avançado
     * Usa scroll e espera dinâmica para carregar produtos
     */
    async fetchPichauProducts(keywords, limit = 20) {
        try {
            logger.info(`🔍 Buscando produtos da Pichau (Puppeteer com scroll)...`);

            // URLs de páginas de ofertas/categorias populares da Pichau
            const categoryPages = [
                'https://www.pichau.com.br/hardware/placa-de-video',
                'https://www.pichau.com.br/hardware/processador',
                'https://www.pichau.com.br/perifericos/teclado',
                'https://www.pichau.com.br/perifericos/mouse'
            ];

            const allProductUrls = [];

            for (const pageUrl of categoryPages) {
                if (allProductUrls.length >= limit) break;

                try {
                    logger.info(`   📄 Analisando página: ${pageUrl}`);

                    // Usar método customizado com scroll
                    const links = await this.extractPichauLinksWithScroll(pageUrl);

                    // Filtrar apenas URLs válidas da Pichau
                    const validLinks = links.filter(link =>
                        link &&
                        link.includes('pichau.com.br') &&
                        (link.includes('/produto/') || link.match(/\/[a-z0-9-]+$/)) &&
                        !link.includes('#') &&
                        !link.includes('?page=') &&
                        !link.includes('/categoria/') &&
                        !link.includes('/marca/') &&
                        !link.includes('/monte-seu-pc') &&
                        !link.includes('/computadores/')
                    );

                    // Adicionar links únicos
                    for (const link of validLinks) {
                        if (!allProductUrls.includes(link) && allProductUrls.length < limit) {
                            allProductUrls.push(link);
                        }
                    }

                    logger.info(`   ✅ ${validLinks.length} produtos encontrados nesta página`);
                    logger.info(`   📊 Total acumulado: ${allProductUrls.length} produtos`);

                    // Aguardar entre páginas
                    if (allProductUrls.length < limit) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
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
                logger.warn(`⚠️ Pichau: Nenhum produto encontrado`);
                logger.info(`💡 Possíveis causas:`);
                logger.info(`   - Site pode estar bloqueando scraping`);
                logger.info(`   - Seletores podem ter mudado`);
                logger.info(`   - Conexão lenta ou timeout`);
            } else {
                logger.info(`✅ Total de ${limitedUrls.length} URLs de produtos Pichau encontradas`);
            }

            return limitedUrls;
        } catch (error) {
            logger.error(`❌ Erro ao buscar produtos na Pichau: ${error.message}`);
            return [];
        }
    }

    /**
     * Método customizado para extrair links com scroll
     */
    async extractPichauLinksWithScroll(url) {
        return await browserScraper.pool.withPage(async (page) => {
            try {
                logger.info(`   🌐 Navegando para: ${url}`);

                // Configurar user agent para evitar detecção
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                // Navegar para a página
                await page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });

                logger.info(`   ⏳ Aguardando conteúdo carregar...`);

                // Aguardar um pouco para o React renderizar
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Fazer scroll para carregar mais produtos (lazy loading)
                logger.info(`   📜 Fazendo scroll para carregar produtos...`);
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 300;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;

                            if (totalHeight >= scrollHeight || totalHeight >= 3000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 200);
                    });
                });

                // Aguardar mais um pouco após o scroll
                await new Promise(resolve => setTimeout(resolve, 3000));

                logger.info(`   🔍 Extraindo links de produtos...`);

                // Extrair todos os links da página
                const links = await page.evaluate(() => {
                    const allLinks = Array.from(document.querySelectorAll('a'));
                    const productLinks = [];

                    for (const link of allLinks) {
                        const href = link.href;

                        // Verificar se é um link de produto válido
                        if (href &&
                            href.includes('pichau.com.br') &&
                            !href.includes('/categoria/') &&
                            !href.includes('/marca/') &&
                            !href.includes('/busca') &&
                            !href.includes('?') &&
                            !href.includes('#')) {

                            // Verificar se o link parece ser de produto
                            // Produtos da Pichau geralmente têm URLs longas com descrição
                            const urlParts = href.split('/');
                            const lastPart = urlParts[urlParts.length - 1];

                            if (lastPart && lastPart.length > 10 && lastPart.includes('-')) {
                                productLinks.push(href);
                            }
                        }
                    }

                    return [...new Set(productLinks)]; // Remove duplicatas
                });

                // Filtragem adicional no lado do servidor para garantir
                const filteredLinks = links.filter(href =>
                    !href.includes('/monte-seu-pc') &&
                    !href.includes('/computadores/') &&
                    !href.includes('/banner') &&
                    !href.includes('/campanha') &&
                    !href.includes('/politica') &&
                    !href.includes('/termos')
                );

                logger.info(`   ✅ ${filteredLinks.length} links extraídos da página (após filtragem)`);
                return filteredLinks;

            } catch (error) {
                logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
                return [];
            }
        });
    }

    /**
     * Filtrar produtos que são válidas promoções
     */
    filterPichauPromotions(products, minDiscountPercentage = 10) {
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
                external_id: `pichau-${product.sku || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: product.name,
                image_url: product.image_url || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
                platform: 'pichau',
                current_price: product.current_price || 0,
                old_price: product.old_price || null,
                discount_percentage: Math.round(discountPercentage),
                affiliate_link: product.link,
                stock_available: product.stock_available !== false,
                category_id: null,
                sku: product.sku
            });
        }

        logger.info(`🎯 ${promotions.length} ofertas válidas encontradas na Pichau (desconto ≥ ${minDiscountPercentage}%)`);
        return promotions;
    }

    /**
     * Analisar um link individual da Pichau
     */
    async analyzePichauLink(url) {
        try {
            logger.info(`🔗 Analisando link da Pichau: ${url}`);

            // Usar linkAnalyzer que usa Puppeteer para extrair dados
            const productData = await linkAnalyzer.extractPichauInfo(url);

            if (productData.error) {
                logger.error(`❌ Erro ao analisar link: ${productData.error}`);
                return null;
            }

            return {
                external_id: `pichau-${productData.sku || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: productData.name,
                image_url: productData.imageUrl,
                platform: 'pichau',
                current_price: productData.currentPrice,
                old_price: productData.oldPrice,
                discount_percentage: productData.oldPrice > 0
                    ? Math.round(((productData.oldPrice - productData.currentPrice) / productData.oldPrice) * 100)
                    : 0,
                affiliate_link: url,
                stock_available: productData.inStock !== false,
                category_id: null,
                sku: productData.sku,
                brand: productData.brand
            };
        } catch (error) {
            logger.error(`❌ Erro ao analisar link da Pichau: ${error.message}`);
            return null;
        }
    }

    /**
     * Salvar produto no banco de dados
     */
    async savePichauToDatabase(product, Product) {
        try {
            // Verificar se já existe (por external_id ou SKU)
            let existing = await Product.findByExternalId(product.external_id, 'pichau');

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
                platform: 'pichau',
                current_price: product.current_price,
                old_price: product.old_price,
                discount_percentage: product.discount_percentage,
                category_id: product.category_id || null,
                affiliate_link: product.affiliate_link,
                external_id: product.external_id,
                stock_available: product.stock_available !== false,
                status: 'pending'
            };

            // Criar novo produto
            const newProduct = await Product.create(productData);
            logger.info(`✅ Novo produto Pichau salvo: ${product.name}`);

            return { product: newProduct, isNew: true };
        } catch (error) {
            logger.error(`❌ Erro ao salvar produto Pichau: ${error.message}`);
            throw error;
        }
    }
}

export default new PichauSync();


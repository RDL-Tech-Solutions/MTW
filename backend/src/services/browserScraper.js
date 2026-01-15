import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../config/logger.js';
import browserPool from '../utils/browserPool.js';

// Usar stealth plugin para bypass de Cloudflare e detecção de bots
puppeteer.use(StealthPlugin());

/**
 * Serviço de Web Scraping usando Puppeteer
 * Otimizado para VPS com pool de browsers
 * Para sites que requerem JavaScript para renderizar conteúdo
 */
class BrowserScraper {
    constructor() {
        // Usar browserPool ao invés de gerenciar browser diretamente
        this.pool = browserPool;
    }

    /**
     * Obter métricas do pool de browsers
     */
    getPoolMetrics() {
        return this.pool.getMetrics();
    }

    /**
     * Extrair links de produtos de uma página
     * @param {string} url - URL da página
     * @param {string} selector - Seletor CSS para os links
     * @param {number} waitTime - Tempo de espera para carregar (ms)
     * @returns {Promise<string[]>} Array de URLs de produtos
     */
    async extractProductLinks(url, selector = 'a.productLink', waitTime = 3000) {
        return this.pool.withPage(async (page) => {
            try {
                logger.info(`   🔍 Abrindo página: ${url}`);

                // Navegar para a página
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Aguardar um pouco para JavaScript renderizar
                await new Promise(resolve => setTimeout(resolve, waitTime));

                // Scroll para carregar lazy loading
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Extrair links de produtos
                const productLinks = await page.evaluate((sel) => {
                    const links = Array.from(document.querySelectorAll(sel));
                    return links
                        .map(link => link.href)
                        .filter(href => href && href.includes('/produto/'));
                }, selector);

                logger.info(`   ✅ ${productLinks.length} links encontrados`);
                return productLinks;

            } catch (error) {
                logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
                return [];
            }
        });
    }

    /**
     * Extrair links de produtos com múltiplos seletores (fallback)
     */
    async extractProductLinksMultiSelector(url, selectors = [], waitTime = 3000) {
        return this.pool.withPage(async (page) => {
            try {
                logger.info(`   🔍 Abrindo página: ${url}`);

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await new Promise(resolve => setTimeout(resolve, waitTime));

                // Scroll
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight * 2);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Tentar cada seletor até encontrar produtos
                let productLinks = [];

                for (const selector of selectors) {
                    productLinks = await page.evaluate((sel) => {
                        const links = Array.from(document.querySelectorAll(sel));
                        return links
                            .map(link => link.href)
                            .filter(href => href && href.includes('/produto/'));
                    }, selector);

                    if (productLinks.length > 0) {
                        logger.info(`   ✅ Seletor '${selector}' funcionou! ${productLinks.length} links encontrados`);
                        break;
                    }
                }

                return productLinks;

            } catch (error) {
                logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
                return [];
            }
        });
    }

    /**
     * Extrair links com espera por seletor especifico (para bypass de Cloudflare)
     * @param {string} url - URL da página
     * @param {Array} selectors - Array de seletores CSS
     * @param {string} waitForSelector - Seletor para aguardar aparecer
     * @param {number} timeout - Timeout máximo (ms)
     */
    async extractProductLinksWithWait(url, selectors = [], waitForSelector = '.pbox', timeout = 20000) {
        return this.pool.withPage(async (page) => {
            try {
                logger.info(`   🔍 Abrindo página: ${url}`);

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Aguardar seletor específico aparecer (Cloudflare pode levar até 20s)
                try {
                    logger.info(`   ⏳ Aguardando elementos carregar (bypass Cloudflare)...`);
                    await page.waitForSelector(waitForSelector, { timeout });
                    logger.info(`   ✅ Elementos carregados!`);
                } catch (waitError) {
                    logger.warn(`   ⚠️ Timeout aguardando ${waitForSelector}: ${waitError.message}`);
                    // Continua mesmo se timeout (pode ter carregado parcialmente)
                }

                // Scroll adicional
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight * 2);
                });
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Tentar cada seletor
                let productLinks = [];

                for (const selector of selectors) {
                    productLinks = await page.evaluate((sel) => {
                        const links = Array.from(document.querySelectorAll(sel));
                        return links
                            .map(link => link.href)
                            .filter(href => href && href.includes('/produto/'));
                    }, selector);

                    if (productLinks.length > 0) {
                        logger.info(`   ✅ Seletor '${selector}' funcionou! ${productLinks.length} links encontrados`);
                        break;
                    }
                }

                return productLinks;

            } catch (error) {
                logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
                return [];
            }
        });
    }

    /**
     * Extrair informações completas de produto Kabum usando Puppeteer
     * @param {string} url - URL do produto
     * @returns {Promise<Object>} Informações do produto
     */
    async extractKabumProductInfo(url) {
        return this.pool.withPage(async (page) => {
            try {
                logger.info(`   🔍 Extraindo dados do produto: ${url}`);

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // Aguardar página carregar
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Extrair informações usando JavaScript no contexto da página
                const productInfo = await page.evaluate(() => {
                    // Nome do produto
                    const nameEl = document.querySelector('h1[class*="title"], h1.product_title, .product-name h1, h1');
                    const name = nameEl ? nameEl.textContent.trim() : '';

                    // Preço atual - seletor CORRETO (descoberto por inspeção real)
                    let currentPrice = 0;
                    const priceSelectors = [
                        'h4.text-secondary-500',  // SELETOR CORRETO da Kabum
                        '[class*="finalPrice"]',
                        '[class*="priceCard"]'
                    ];

                    for (const selector of priceSelectors) {
                        const priceEl = document.querySelector(selector);
                        if (priceEl) {
                            const priceText = priceEl.textContent.trim();
                            const match = priceText.match(/[\d.,]+/);
                            if (match) {
                                currentPrice = parseFloat(match[0].replace('.', '').replace(',', '.'));
                                if (currentPrice > 0) break;
                            }
                        }
                    }

                    // Preço antigo - seletor CORRETO
                    let oldPrice = 0;
                    const oldPriceSelectors = [
                        'span.line-through',      // SELETOR CORRETO da Kabum
                        '[class*="oldPrice"]',
                        '[class*="old-price"]'
                    ];

                    for (const selector of oldPriceSelectors) {
                        const oldPriceEl = document.querySelector(selector);
                        if (oldPriceEl) {
                            const oldPriceText = oldPriceEl.textContent.trim();
                            const match = oldPriceText.match(/[\d.,]+/);
                            if (match) {
                                oldPrice = parseFloat(match[0].replace('.', '').replace(',', '.'));
                                if (oldPrice > currentPrice) break;
                            }
                        }
                    }

                    // Imagem
                    const imgEl = document.querySelector('meta[property="og:image"]') ||
                        document.querySelector('.product-image img, .productImage img');
                    const imageUrl = imgEl ? (imgEl.getAttribute('content') || imgEl.src) : '';

                    return {
                        name,
                        currentPrice,
                        oldPrice,
                        imageUrl
                    };
                });

                logger.info(`   ✅ Produto: ${productInfo.name?.substring(0, 50)}`);
                logger.info(`   💰 Preço atual: R$ ${productInfo.currentPrice}`);
                if (productInfo.oldPrice > 0) {
                    logger.info(`   💰 Preço antigo: R$ ${productInfo.oldPrice}`);
                }

                return {
                    name: productInfo.name || 'Produto Kabum',
                    description: '',
                    imageUrl: productInfo.imageUrl,
                    currentPrice: productInfo.currentPrice,
                    oldPrice: productInfo.oldPrice > productInfo.currentPrice ? productInfo.oldPrice : 0,
                    platform: 'kabum',
                    affiliateLink: url
                };

            } catch (error) {
                logger.error(`   ❌ Erro ao extrair info Kabum com Puppeteer: ${error.message}`);
                return {
                    error: `Erro ao extrair informações: ${error.message}`,
                    platform: 'kabum',
                    affiliateLink: url,
                    name: 'Produto Kabum',
                    currentPrice: 0,
                    oldPrice: 0,
                    imageUrl: ''
                };
            }
        });
    }

    /**
     * Screenshot de debug (útil para troubleshooting)
     */
    async takeScreenshot(url, filename = 'debug.png') {
        return this.pool.withPage(async (page) => {
            try {
                await page.goto(url, { waitUntil: 'networkidle2' });
                await page.screenshot({ path: filename, fullPage: true });
                logger.info(`📸 Screenshot salvo: ${filename}`);
            } catch (error) {
                logger.error(`❌ Erro ao tirar screenshot: ${error.message}`);
            }
        });
    }
}

// Singleton instance
const browserScraper = new BrowserScraper();

// Cleanup é gerenciado pelo browserPool

export default browserScraper;

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../config/logger.js';

// Usar stealth plugin para bypass de Cloudflare e detecção de bots
puppeteer.use(StealthPlugin());

/**
 * Serviço de Web Scraping usando Puppeteer
 * Para sites que requerem JavaScript para renderizar conteúdo
 */
class BrowserScraper {
    constructor() {
        this.browser = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar browser (reutilizável para múltiplas páginas)
     */
    async init() {
        if (this.isInitialized && this.browser) {
            return this.browser;
        }

        try {
            logger.info('🌐 Iniciando browser Puppeteer...');

            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920x1080',
                    '--disable-blink-features=AutomationControlled',  // Esconder automação
                    '--disable-features=IsolateOrigins,site-per-process'  // Bypass isolamento
                ],
                ignoreDefaultArgs: ['--enable-automation'],  // Remove flag de automação
                ignoreHTTPSErrors: true
            });

            this.isInitialized = true;
            logger.info('✅ Browser Puppeteer iniciado');

            return this.browser;
        } catch (error) {
            logger.error(`❌ Erro ao iniciar browser: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fechar browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
            logger.info('🔒 Browser Puppeteer fechado');
        }
    }

    /**
     * Extrair links de produtos de uma página
     * @param {string} url - URL da página
     * @param {string} selector - Seletor CSS para os links
     * @param {number} waitTime - Tempo de espera para carregar (ms)
     * @returns {Promise<string[]>} Array de URLs de produtos
     */
    async extractProductLinks(url, selector = 'a.productLink', waitTime = 3000) {
        const browser = await this.init();
        const page = await browser.newPage();

        try {
            // Configurar User Agent
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Configurar viewport
            await page.setViewport({ width: 1920, height: 1080 });

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

            await page.close();
            return productLinks;

        } catch (error) {
            logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
            await page.close();
            return [];
        }
    }

    /**
     * Extrair links de produtos com múltiplos seletores (fallback)
     */
    async extractProductLinksMultiSelector(url, selectors = [], waitTime = 3000) {
        const browser = await this.init();
        const page = await browser.newPage();

        try {
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            await page.setViewport({ width: 1920, height: 1080 });

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

            await page.close();
            return productLinks;

        } catch (error) {
            logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
            await page.close();
            return [];
        }
    }

    /**
     * Extrair links com espera por seletor especifico (para bypass de Cloudflare)
     * @param {string} url - URL da página
     * @param {Array} selectors - Array de seletores CSS
     * @param {string} waitForSelector - Seletor para aguardar aparecer
     * @param {number} timeout - Timeout máximo (ms)
     */
    async extractProductLinksWithWait(url, selectors = [], waitForSelector = '.pbox', timeout = 20000) {
        const browser = await this.init();
        const page = await browser.newPage();

        try {
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            await page.setViewport({ width: 1920, height: 1080 });

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

            await page.close();
            return productLinks;

        } catch (error) {
            logger.error(`   ❌ Erro ao extrair links: ${error.message}`);
            await page.close();
            return [];
        }
    }

    /**
     * Extrair informações completas de produto Kabum usando Puppeteer
     * @param {string} url - URL do produto
     * @returns {Promise<Object>} Informações do produto
     */
    async extractKabumProductInfo(url) {
        const browser = await this.init();
        const page = await browser.newPage();

        try {
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            await page.setViewport({ width: 1920, height: 1080 });

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

            await page.close();

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
            await page.close();
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
    }

    /**
     * Screenshot de debug (útil para troubleshooting)
     */
    async takeScreenshot(url, filename = 'debug.png') {
        const browser = await this.init();
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            await page.screenshot({ path: filename, fullPage: true });
            logger.info(`📸 Screenshot salvo: ${filename}`);
            await page.close();
        } catch (error) {
            logger.error(`❌ Erro ao tirar screenshot: ${error.message}`);
            await page.close();
        }
    }
}

// Singleton instance
const browserScraper = new BrowserScraper();

// Cleanup ao terminar processo
process.on('exit', async () => {
    await browserScraper.close();
});

process.on('SIGINT', async () => {
    await browserScraper.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await browserScraper.close();
    process.exit(0);
});

export default browserScraper;

import browserPool from '../utils/browserPool.js';

/**
 * Scraping de produtos da Shopee usando Puppeteer com stealth mode
 * Usado como fallback quando API e scraping HTTP falham
 */
class ShopeePuppeteerScraper {
    /**
     * Extrair dados do produto da Shopee
     */
    async scrapeProduct(url) {
        try {
            return await browserPool.withPage(async (page) => {

                // Configuração específica para links curtos (Mobile)
                const isShortLink = url.includes('s.shopee') || url.includes('shp.ee');

                if (isShortLink) {
                    console.log('   📱 Detectado link curto/móvel - Emulando iPhone...');
                    const iPhone = {
                        name: 'iPhone 13 Pro',
                        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                        viewport: {
                            width: 390,
                            height: 844,
                            deviceScaleFactor: 3,
                            isMobile: true,
                            hasTouch: true,
                            isLandscape: false
                        }
                    };
                    await page.emulate(iPhone);
                } else {
                    // Desktop para links normais
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    await page.setViewport({ width: 1366, height: 768 });
                }

                // Headers comuns
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                });

                // Navegar para a página
                console.log(`   🔄 Navegando para: ${url.substring(0, 80)}...`);

                try {
                    const response = await page.goto(url, {
                        waitUntil: 'networkidle2',
                        timeout: 60000
                    });
                } catch (e) {
                    console.log('   ⚠️ Timeout ou erro na navegação inicial (pode ser normal em redirecionamentos)');
                }

                // Aguardar redirecionamento explicitamente se for link curto
                if (isShortLink) {
                    console.log('   ⏳ Aguardando redirecionamento de link móvel...');
                    try {
                        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => { });
                    } catch (e) { }
                }

                // Verificar URL final
                const currentUrl = page.url();
                console.log('   📍 URL atual:', currentUrl);

                // Tentar esperar por um seletor de produto válido
                try {
                    await page.waitForSelector('.product-briefing, .qaNIZv, .attM6y, .pdp-product-title, [class*="product-title"]', { timeout: 10000 });
                    console.log('   ✅ Elemento de produto detectado!');
                } catch (e) {
                    console.log('   ⚠️ Nenhum elemento de produto detectado no timeout inicial.');
                }

                if (currentUrl.includes('shopee.com.br') && !currentUrl.includes('-i.') && currentUrl.length < 50) {
                    console.warn('   ⚠️ Possível redirecionamento para Home Page detectado.');
                }

                // Aguardar elementos carregarem
                await new Promise(r => setTimeout(r, 5000));

                // DEBUG: Salvar HTML para inspeção
                const html = await page.content();
                const fs = await import('fs');
                fs.writeFileSync('shopee_debug.html', html);
                console.log('   📸 HTML salvo em shopee_debug.html');

                // Extrair dados da página
                const data = await page.evaluate(() => {
                    const result = {
                        name: '',
                        description: '',
                        currentPrice: 0,
                        oldPrice: 0,
                        imageUrl: ''
                    };

                    // Função auxiliar para limpar texto
                    const cleanText = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';

                    // Helper para extrair preço de texto
                    const extractPrice = (text) => {
                        if (!text) return 0;
                        const match = text.match(/R\$\s?([\d.,]+)/);
                        if (match) {
                            return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                        }
                        return 0;
                    };

                    // 1. Nome do produto
                    const nameSelectors = [
                        '.attM6y span',
                        '.Vnont8',
                        '.product-briefing',
                        '.pdp-product-title',
                        '[data-testid="product-title"]',
                        'h1'
                    ];

                    for (const selector of nameSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            result.name = cleanText(el.innerText);
                            if (result.name) break;
                        }
                    }

                    // 2. Preços
                    const currentPriceSelectors = [
                        '.pq9664',
                        '.G27476',
                        '[data-testid="product-price"]',
                        '.product-price'
                    ];

                    const oldPriceSelectors = [
                        '.Y_9B94',
                        '.eb_SPS',
                        '.original-price'
                    ];

                    for (const selector of currentPriceSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            result.currentPrice = extractPrice(el.innerText);
                            if (result.currentPrice) break;
                        }
                    }

                    for (const selector of oldPriceSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            result.oldPrice = extractPrice(el.innerText);
                            if (result.oldPrice) break;
                        }
                    }

                    // 3. Descrição
                    const descriptionSelectors = [
                        '.product-detail',
                        '[data-testid="product-detail"]',
                        '.page-product__detail',
                        '.V-p-v'
                    ];

                    for (const selector of descriptionSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            result.description = cleanText(el.innerText);
                            if (result.description) break;
                        }
                    }

                    // 4. Imagem
                    const imageSelectors = [
                        '.product-carousel__item img',
                        '[data-testid="product-image"] img',
                        '.pdp-video-and-image-container img',
                        'meta[property="og:image"]'
                    ];

                    for (const selector of imageSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            result.imageUrl = el.src || el.content || '';
                            if (result.imageUrl) break;
                        }
                    }

                    return result;
                });

                console.log('   ✅ Dados extraídos via Puppeteer:');
                console.log('      Nome:', data.name?.substring(0, 50) || 'N/A');
                console.log('      Preço:', data.currentPrice || 'N/A');
                console.log('      Original:', data.oldPrice || 'N/A');

            });
        } catch (error) {
            console.error('   ❌ Erro no Puppeteer:', error.message);
            throw error;
        }
    }
}

// Singleton instance
const scraper = new ShopeePuppeteerScraper();

export default scraper;

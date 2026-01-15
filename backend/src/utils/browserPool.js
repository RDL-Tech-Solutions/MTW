import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../config/logger.js';

// Usar stealth plugin para bypass de Cloudflare e detecção de bots
puppeteer.use(StealthPlugin());

/**
 * Pool de browsers Puppeteer otimizado para VPS
 * Gerencia múltiplas instâncias de browser para reutilização
 * e evita sobrecarga de memória
 */
class BrowserPool {
    constructor(maxInstances = 2) {
        this.maxInstances = parseInt(process.env.MAX_BROWSER_INSTANCES) || maxInstances;
        this.browsers = [];
        this.availableBrowsers = [];
        this.queue = [];
        this.isVPSMode = process.env.VPS_MODE === 'true' || process.env.NODE_ENV === 'production';
        this.metrics = {
            totalCreated: 0,
            totalAcquired: 0,
            totalReleased: 0,
            totalClosed: 0,
            currentActive: 0,
            queueLength: 0
        };
    }

    /**
     * Obter configuração otimizada para VPS ou desenvolvimento
     */
    getBrowserConfig() {
        const baseConfig = {
            headless: this.isVPSMode ? 'new' : true,
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true,
            // Aumentar timeouts para VPS (Cloudflare pode levar até 30s)
            timeout: this.isVPSMode ? 60000 : 30000,
            protocolTimeout: this.isVPSMode ? 60000 : 30000,
        };

        // Configuração otimizada para VPS (menos recursos)
        if (this.isVPSMode) {
            baseConfig.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-web-security',
                '--single-process', // Importante para VPS com pouca RAM
                '--memory-pressure-off',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080',
            ];

            // Se tiver caminho customizado do Chromium (comum em VPS)
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                baseConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }
        } else {
            // Configuração para desenvolvimento (mais recursos)
            baseConfig.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process'
            ];
        }

        return baseConfig;
    }

    /**
     * Criar uma nova instância de browser
     */
    async createBrowser() {
        try {
            logger.info(`🌐 [BrowserPool] Criando nova instância de browser (${this.browsers.length + 1}/${this.maxInstances})...`);

            const config = this.getBrowserConfig();
            const browser = await puppeteer.launch(config);

            // Adicionar metadata
            browser._poolMetadata = {
                createdAt: Date.now(),
                lastUsed: Date.now(),
                usageCount: 0,
                id: this.metrics.totalCreated
            };

            this.browsers.push(browser);
            this.metrics.totalCreated++;
            this.metrics.currentActive++;

            logger.info(`✅ [BrowserPool] Browser #${browser._poolMetadata.id} criado com sucesso`);
            logger.debug(`   Modo: ${this.isVPSMode ? 'VPS (otimizado)' : 'Desenvolvimento'}`);
            logger.debug(`   Headless: ${config.headless}`);
            logger.debug(`   Instâncias ativas: ${this.browsers.length}/${this.maxInstances}`);

            return browser;
        } catch (error) {
            logger.error(`❌ [BrowserPool] Erro ao criar browser: ${error.message}`);
            throw error;
        }
    }

    /**
     * Adquirir um browser do pool (ou criar se necessário)
     */
    async acquire() {
        this.metrics.totalAcquired++;

        // Se tem browser disponível, reutilizar
        if (this.availableBrowsers.length > 0) {
            const browser = this.availableBrowsers.pop();
            browser._poolMetadata.lastUsed = Date.now();
            browser._poolMetadata.usageCount++;

            logger.debug(`♻️  [BrowserPool] Reutilizando browser #${browser._poolMetadata.id} (uso: ${browser._poolMetadata.usageCount})`);
            return browser;
        }

        // Se pode criar mais browsers, criar
        if (this.browsers.length < this.maxInstances) {
            return await this.createBrowser();
        }

        // Se não, adicionar à fila e aguardar
        logger.info(`⏳ [BrowserPool] Pool cheio (${this.browsers.length}/${this.maxInstances}). Aguardando browser disponível...`);
        this.metrics.queueLength = this.queue.length + 1;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.queue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                }
                reject(new Error('Timeout aguardando browser do pool'));
            }, 60000); // 1 minuto de timeout

            this.queue.push({ resolve, reject, timeout });
        });
    }

    /**
     * Liberar um browser de volta ao pool
     */
    async release(browser) {
        if (!browser) return;

        this.metrics.totalReleased++;

        try {
            // Fechar todas as páginas abertas para liberar memória
            const pages = await browser.pages();
            for (const page of pages) {
                if (!page.isClosed()) {
                    await page.close().catch(() => { });
                }
            }

            // Se tem alguém na fila, passar o browser
            if (this.queue.length > 0) {
                const { resolve, timeout } = this.queue.shift();
                clearTimeout(timeout);
                this.metrics.queueLength = this.queue.length;

                browser._poolMetadata.lastUsed = Date.now();
                browser._poolMetadata.usageCount++;

                logger.debug(`🔄 [BrowserPool] Browser #${browser._poolMetadata.id} passado para próximo da fila`);
                resolve(browser);
                return;
            }

            // Senão, marcar como disponível
            this.availableBrowsers.push(browser);
            logger.debug(`✅ [BrowserPool] Browser #${browser._poolMetadata.id} liberado (disponíveis: ${this.availableBrowsers.length})`);

        } catch (error) {
            logger.error(`❌ [BrowserPool] Erro ao liberar browser: ${error.message}`);
            // Se der erro, fechar o browser
            await this.closeBrowser(browser);
        }
    }

    /**
     * Fechar um browser específico
     */
    async closeBrowser(browser) {
        if (!browser) return;

        try {
            const browserId = browser._poolMetadata?.id || 'unknown';
            await browser.close();

            // Remover das listas
            this.browsers = this.browsers.filter(b => b !== browser);
            this.availableBrowsers = this.availableBrowsers.filter(b => b !== browser);

            this.metrics.totalClosed++;
            this.metrics.currentActive--;

            logger.debug(`🔒 [BrowserPool] Browser #${browserId} fechado`);
        } catch (error) {
            logger.error(`❌ [BrowserPool] Erro ao fechar browser: ${error.message}`);
        }
    }

    /**
     * Fechar todos os browsers do pool
     */
    async closeAll() {
        logger.info(`🔒 [BrowserPool] Fechando todos os browsers (${this.browsers.length})...`);

        // Rejeitar todos da fila
        for (const { reject, timeout } of this.queue) {
            clearTimeout(timeout);
            reject(new Error('Pool sendo fechado'));
        }
        this.queue = [];

        // Fechar todos os browsers
        const closePromises = this.browsers.map(browser => this.closeBrowser(browser));
        await Promise.allSettled(closePromises);

        this.browsers = [];
        this.availableBrowsers = [];

        logger.info(`✅ [BrowserPool] Todos os browsers fechados`);
    }

    /**
     * Cleanup de browsers antigos (não usados há muito tempo)
     */
    async cleanup(maxIdleTime = 300000) { // 5 minutos padrão
        const now = Date.now();
        const browsersToClose = [];

        for (const browser of this.availableBrowsers) {
            const idleTime = now - browser._poolMetadata.lastUsed;
            if (idleTime > maxIdleTime) {
                browsersToClose.push(browser);
            }
        }

        if (browsersToClose.length > 0) {
            logger.info(`🧹 [BrowserPool] Limpando ${browsersToClose.length} browser(s) ocioso(s)...`);

            for (const browser of browsersToClose) {
                await this.closeBrowser(browser);
            }
        }
    }

    /**
     * Obter métricas do pool
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalBrowsers: this.browsers.length,
            availableBrowsers: this.availableBrowsers.length,
            queueLength: this.queue.length,
            isVPSMode: this.isVPSMode
        };
    }

    /**
     * Executar uma função com um browser do pool (auto-release)
     */
    async withBrowser(fn) {
        const browser = await this.acquire();
        try {
            return await fn(browser);
        } finally {
            await this.release(browser);
        }
    }

    /**
     * Executar uma função com uma página do pool (auto-release)
     */
    async withPage(fn) {
        return this.withBrowser(async (browser) => {
            const page = await browser.newPage();
            try {
                // Configurar User Agent
                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                );

                // Configurar viewport
                await page.setViewport({ width: 1920, height: 1080 });

                return await fn(page);
            } finally {
                if (!page.isClosed()) {
                    await page.close().catch(() => { });
                }
            }
        });
    }
}

// Singleton instance
const browserPool = new BrowserPool();

// Cleanup periódico (a cada 5 minutos)
setInterval(() => {
    browserPool.cleanup().catch(err => {
        logger.error(`❌ [BrowserPool] Erro no cleanup periódico: ${err.message}`);
    });
}, 300000);

// Cleanup ao terminar processo
process.on('exit', async () => {
    await browserPool.closeAll();
});

process.on('SIGINT', async () => {
    await browserPool.closeAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await browserPool.closeAll();
    process.exit(0);
});

export default browserPool;

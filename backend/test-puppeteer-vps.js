import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

console.log('🔍 Iniciando teste do Puppeteer na VPS...\n');

const isVPS = process.env.VPS_MODE === 'true' || process.env.NODE_ENV === 'production';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

console.log(`📊 Configurações:`);
console.log(`   VPS Mode: ${isVPS}`);
console.log(`   Executable Path: ${executablePath}`);
console.log(`   Max Instances: ${process.env.MAX_BROWSER_INSTANCES || 2}`);
console.log(`   Timeout: ${process.env.BROWSER_TIMEOUT || 60000}ms\n`);

(async () => {
    let browser;

    try {
        console.log('🚀 Lançando browser...');

        const config = {
            headless: 'new',
            executablePath: executablePath,
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true,
            timeout: 60000,
            protocolTimeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ]
        };

        console.log('   Configuração aplicada ✓\n');

        browser = await puppeteer.launch(config);
        console.log('✅ Browser lançado com sucesso!\n');

        console.log('📄 Criando nova página...');
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.setViewport({ width: 1920, height: 1080 });
        console.log('✅ Página criada!\n');

        // Teste 1: Google
        console.log('🧪 Teste 1: Navegando para Google...');
        await page.goto('https://www.google.com', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const googleTitle = await page.title();
        console.log(`✅ Título: ${googleTitle}\n`);

        // Teste 2: Site com JavaScript
        console.log('🧪 Teste 2: Navegando para site com JavaScript...');
        await page.goto('https://www.kabum.com.br/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const kabumTitle = await page.title();
        console.log(`✅ Título: ${kabumTitle}\n`);

        // Teste 3: Extrair elementos
        console.log('🧪 Teste 3: Extraindo elementos da página...');
        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors.length;
        });
        console.log(`✅ Links encontrados: ${links}\n`);

        // Teste 4: Screenshot
        console.log('🧪 Teste 4: Tirando screenshot...');
        await page.screenshot({ path: '/tmp/test-screenshot.png' });
        console.log('✅ Screenshot salvo em /tmp/test-screenshot.png\n');

        await page.close();
        await browser.close();

        console.log('═══════════════════════════════════════');
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ Puppeteer está funcionando corretamente na VPS!');
        console.log('═══════════════════════════════════════\n');

        process.exit(0);

    } catch (error) {
        console.error('\n═══════════════════════════════════════');
        console.error('❌ ERRO:', error.message);
        console.error('═══════════════════════════════════════\n');
        console.error('📋 Stack trace:', error.stack);

        if (browser) {
            await browser.close().catch(() => { });
        }

        console.log('\n💡 Dicas de troubleshooting:');
        console.log('1. Verifique se Chromium está instalado:');
        console.log('   which chromium-browser');
        console.log('');
        console.log('2. Instale dependências:');
        console.log('   sudo apt install -y chromium-browser libgbm1 libnss3 libxss1');
        console.log('');
        console.log('3. Verifique variáveis de ambiente:');
        console.log('   cat .env.production | grep PUPPETEER');
        console.log('');
        console.log('4. Verifique memória disponível:');
        console.log('   free -h');
        console.log('');
        console.log('5. Consulte o guia completo:');
        console.log('   docs/FIX_PUPPETEER_VPS.md');
        console.log('');

        process.exit(1);
    }
})();

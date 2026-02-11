/**
 * Script de diagnóstico: o que Puppeteer vê na página do ML
 * Uso: node scripts/debug_meli_puppeteer.js
 */
import dotenv from 'dotenv';
dotenv.config();

import browserPool from '../src/utils/browserPool.js';
import fs from 'fs';

const url = 'https://lista.mercadolivre.com.br/smart-tv';

console.log(`\n🔍 Testando Puppeteer no ML: ${url}\n`);

try {
    const result = await browserPool.withPage(async (page) => {
        // Bloquear recursos pesados
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const type = req.resourceType();
            if (['font', 'media'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log('📄 Navegando...');
        const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 45000
        });

        console.log(`📡 Status HTTP: ${response.status()}`);
        console.log(`📡 URL final: ${page.url()}`);

        // Screenshot
        const screenshotPath = 'scripts/debug_ml_screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`📸 Screenshot salvo: ${screenshotPath}`);

        // Verificar se tem desafio de segurança / captcha
        const pageTitle = await page.title();
        console.log(`📌 Título da página: ${pageTitle}`);

        // Checar conteúdo HTML parcial
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log(`\n📃 Primeiros 500 chars do body:\n${bodyText}\n`);

        // Checar seletores
        const selectors = {
            '.ui-search-layout__item': 0,
            '.poly-card': 0,
            '.ui-search-results': 0,
            '.andes-card': 0,
            'section.ui-search-results': 0,
            'ol.ui-search-layout': 0,
            'a[href*="MLB"]': 0,
            '.shops__items-group': 0,
            'img': 0,
        };

        for (const sel of Object.keys(selectors)) {
            selectors[sel] = await page.$$eval(sel, els => els.length).catch(() => 0);
        }

        console.log('🔎 Contagem de seletores:');
        for (const [sel, count] of Object.entries(selectors)) {
            console.log(`   ${sel}: ${count}`);
        }

        // Salvar HTML para análise
        const html = await page.content();
        fs.writeFileSync('scripts/debug_ml_page.html', html);
        console.log(`\n💾 HTML completo salvo em: scripts/debug_ml_page.html (${html.length} bytes)`);

        return selectors;
    });

} catch (error) {
    console.error(`❌ Erro: ${error.message}`);
} finally {
    await browserPool.closeAll();
    process.exit(0);
}

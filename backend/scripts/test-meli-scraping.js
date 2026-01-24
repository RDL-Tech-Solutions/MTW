import axios from 'axios';
import cheerio from 'cheerio';

const url = 'https://produto.mercadolivre.com.br/MLB-4976699980-mega-dha-120-capsulas-omega-3-vitafor';

// Copiar a função parsePrice do linkAnalyzer
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const cleaned = String(priceStr)
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

async function testScrapeMeliPrices() {
    console.log('🔍 TESTE DIRETO DO SCRAPING DE PREÇOS\n');
    console.log('URL:', url, '\n');

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Helper para extrair preço completo
    const extractFullPrice = (container) => {
        const fraction = $(container).find('.andes-money-amount__fraction').text().trim();
        const cents = $(container).find('.andes-money-amount__cents').text().trim();
        if (fraction) {
            return parsePrice(`${fraction},${cents || '00'}`);
        }
        return 0;
    };

    console.log('=== TESTE DOS SELETORES DE PREÇO ORIGINAL ===\n');

    const oldPriceSelectors = [
        '.ui-pdp-price__old-value .andes-money-amount__fraction',
        '.ui-pdp-price__original-value .andes-money-amount__fraction',
        '.ui-pdp-price s .andes-money-amount__fraction',
        's.andes-money-amount .andes-money-amount__fraction',
        's .andes-money-amount__fraction',
        '[class*="old"] .andes-money-amount__fraction'
    ];

    for (const selector of oldPriceSelectors) {
        const el = $(selector).first();
        if (el.length > 0) {
            const price = extractFullPrice(el.closest('.andes-money-amount'));
            console.log(`✅ "${selector}"`);
            console.log(`   Preço: R$ ${price}`);
            console.log(`   Texto: "${el.text().trim()}"`);
            console.log('');
        } else {
            console.log(`❌ "${selector}" - NÃO ENCONTRADO`);
        }
    }

    console.log('\n=== BUSCA MANUAL POR TAGS <s> ===\n');

    const sTags = $('s');
    console.log(`Total de tags <s> encontradas: ${sTags.length}`);

    sTags.each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('R$') || /\d{2,}/.test(text)) {
            console.log(`[${i}] <s>: ${text.substring(0, 100)}`);

            // Tentar extrair preço
            const fraction = $(el).find('.andes-money-amount__fraction').text().trim();
            if (fraction) {
                const cents = $(el).find('.andes-money-amount__cents').text().trim();
                const price = parsePrice(`${fraction},${cents || '00'}`);
                console.log(`    Preço extraído: R$ ${price}`);
            }
        }
    });

    console.log('\n=== BUSCA POR CLASSE "old" ===\n');

    $('[class*="old"]').each((i, el) => {
        const classes = $(el).attr('class');
        const text = $(el).text().trim();
        if (text.includes('R$') || /\d{2,}/.test(text)) {
            console.log(`[${i}] Classes: ${classes}`);
            console.log(`    Texto: ${text.substring(0, 100)}`);
        }
    });

    console.log('\n=== TODOS OS PREÇOS NA PÁGINA ===\n');

    $('.andes-money-amount').each((i, el) => {
        const price = extractFullPrice(el);
        if (price > 0) {
            const parent = $(el).parent();
            const isStrikethrough = $(el).closest('s, del').length > 0;
            const classes = $(el).attr('class') || '';

            console.log(`[${i}] R$ ${price.toFixed(2)}`);
            console.log(`    Riscado: ${isStrikethrough ? 'SIM ✅' : 'NÃO'}`);
            console.log(`    Classes: ${classes.substring(0, 80)}`);
            console.log('');
        }
    });
}

testScrapeMeliPrices().catch(console.error);

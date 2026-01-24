import axios from 'axios';
import cheerio from 'cheerio';

const url = 'https://produto.mercadolivre.com.br/MLB-4976699980-mega-dha-120-capsulas-omega-3-vitafor';

async function debugMeliHTML() {
    console.log('🔍 DEBUG - ESTRUTURA HTML DO MERCADO LIVRE\n');

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const $ = cheerio.load(response.data);

    console.log('=== TODOS OS PREÇOS NA PÁGINA ===\n');

    // Buscar TODOS os elementos com classe andes-money-amount
    $('.andes-money-amount').each((i, el) => {
        const container = $(el);
        const fraction = container.find('.andes-money-amount__fraction').text().trim();
        const cents = container.find('.andes-money-amount__cents').text().trim();
        const fullPrice = fraction ? `${fraction},${cents || '00'}` : '';

        // Verificar contexto
        const parent = container.parent();
        const isStrikethrough = container.closest('s, del').length > 0;
        const parentClass = parent.attr('class') || '';
        const containerClass = container.attr('class') || '';

        if (fullPrice) {
            console.log(`[${i}] R$ ${fullPrice}`);
            console.log(`    Riscado: ${isStrikethrough ? 'SIM ✅' : 'NÃO'}`);
            console.log(`    Container class: ${containerClass.substring(0, 60)}`);
            console.log(`    Parent class: ${parentClass.substring(0, 60)}`);
            console.log('');
        }
    });

    console.log('\n=== BUSCA ESPECÍFICA POR PREÇO RISCADO ===\n');

    const strikethroughSelectors = [
        's .andes-money-amount__fraction',
        'del .andes-money-amount__fraction',
        '.ui-pdp-price__original-value .andes-money-amount__fraction',
        's.andes-money-amount .andes-money-amount__fraction',
        '[class*="strikethrough"] .andes-money-amount__fraction'
    ];

    strikethroughSelectors.forEach(sel => {
        const el = $(sel).first();
        if (el.length > 0) {
            const text = el.text().trim();
            console.log(`✅ Encontrado com "${sel}": ${text}`);
        } else {
            console.log(`❌ NÃO encontrado: "${sel}"`);
        }
    });

    console.log('\n=== BUSCA POR TAGS <s> E <del> ===\n');

    $('s, del').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('R$') || /\d{2,}/.test(text)) {
            console.log(`Tag <${el.name}>: ${text.substring(0, 50)}`);
        }
    });
}

debugMeliHTML().catch(console.error);

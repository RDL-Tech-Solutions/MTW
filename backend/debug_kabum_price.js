
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debugKabum(url) {
    console.log(`📡 Analisando KaBuM!: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        console.log(`✅ Final URL: ${response.request.res.responseUrl || url}`);

        const debugData = {
            jsonLd: [],
            nextData: null,
            meta: {}
        };

        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                debugData.jsonLd.push(JSON.parse($(el).html()));
            } catch (e) { }
        });

        try {
            debugData.nextData = JSON.parse($('#__NEXT_DATA__').html());
        } catch (e) { }

        $('meta').each((i, el) => {
            const name = $(el).attr('name') || $(el).attr('property');
            if (name) debugData.meta[name] = $(el).attr('content');
        });

        fs.writeFileSync('kabum_price_debug.json', JSON.stringify(debugData, null, 2));
        console.log("✅ Debug saved to kabum_price_debug.json");

    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

const url = "https://www.kabum.com.br/produto/515545/tablet-samsung-galaxy-tab-a9-64gb-5g-wi-fi-tela-de-11-android-14-4gb-ram-camera-traseira-8mp-bateria-de-7-040mah-grafite-sm-x216bzaazto";
debugKabum(url);

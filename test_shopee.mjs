import axios from 'axios';

const url = 'https://s.shopee.com.br/5AnHTGdLFq';

async function extractIds(finalUrl) {
    // Pattern: -i.SHOPID.ITEMID
    let m = finalUrl.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2], method: '-i pattern' };

    // Pattern: /shopname/shopid/itemid
    m = finalUrl.match(/shopee\.com(?:\.br)?\/[^/]+\/(\d+)\/(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2], method: 'path pattern' };

    // Params
    const urlObj = new URL(finalUrl);
    const shopId = urlObj.searchParams.get('shopid') || urlObj.searchParams.get('shop_id');
    const itemId = urlObj.searchParams.get('itemid') || urlObj.searchParams.get('item_id');
    if (shopId || itemId) return { shopId: shopId || '0', itemId, method: 'query params' };

    // Numeric path segments 8+ digits
    const segments = urlObj.pathname.split('/').filter(Boolean);
    const nums = segments.filter(s => /^\d{8,}$/.test(s));
    if (nums.length >= 2) return { shopId: nums[nums.length - 2], itemId: nums[nums.length - 1], method: 'numeric segments' };
    if (nums.length === 1) return { shopId: '0', itemId: nums[0], method: 'single numeric segment' };

    return null;
}

async function run() {
    console.log('=== STEP 1: Seguir redirecionamentos ===');
    const resp = await axios.get(url, {
        maxRedirects: 10,
        validateStatus: () => true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        timeout: 15000
    });
    const finalUrl = resp.request?.res?.responseUrl || resp.request?.responseURL || resp.config?.url || url;
    console.log('URL Final:', finalUrl);
    console.log('Status HTTP:', resp.status);

    // Show first 500 chars of HTML title
    const titleMatch = resp.data?.match ? resp.data.match(/<title[^>]*>(.*?)<\/title>/i) : null;
    if (titleMatch) console.log('Title da pagina:', titleMatch[1]);

    // OG tags
    const ogTitle = resp.data?.match(/<meta property="og:title"[^>]*content="([^"]+)"/i);
    const ogPrice = resp.data?.match(/<meta property="product:price:amount"[^>]*content="([^"]+)"/i);
    if (ogTitle) console.log('OG Title:', ogTitle[1]);
    if (ogPrice) console.log('OG Price:', ogPrice[1]);

    const ids = await extractIds(finalUrl);
    console.log('IDs extraidos:', ids);

    if (ids && ids.itemId) {
        console.log('\n=== STEP 2: API publica Shopee ===');
        const apiUrl = `https://shopee.com.br/api/v4/item/get?shopid=${ids.shopId}&itemid=${ids.itemId}`;
        console.log('API URL:', apiUrl);
        try {
            const apiResp = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://shopee.com.br/',
                    'Accept': 'application/json',
                    'X-API-SOURCE': 'pc',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                timeout: 10000,
                validateStatus: () => true
            });
            console.log('API Status:', apiResp.status);
            if (apiResp.data?.data?.name) {
                const item = apiResp.data.data;
                console.log('NOME:', item.name?.substring(0, 100));
                console.log('PRECO:', item.price ? item.price / 100000 : 'N/A');
                console.log('IMG:', item.image ? 'SIM - ' + item.image.substring(0, 40) : 'NAO');
            } else {
                console.log('API response (primeiros 300):', JSON.stringify(apiResp.data)?.substring(0, 300));
            }
        } catch (e2) {
            console.log('API falhou:', e2.message);
        }
    }
}

run().catch(e => console.error('ERRO:', e.message));

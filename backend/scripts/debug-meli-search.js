import axios from 'axios';

const TERM = 'smartphone';

async function debugSearch() {
    console.log(`🔍 Testando busca por: "${TERM}"...`);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.mercadolivre.com.br/',
        'Origin': 'https://www.mercadolivre.com.br'
    };

    try {
        const url = 'https://api.mercadolibre.com/sites/MLB/search';
        const response = await axios.get(url, {
            params: {
                q: TERM,
                limit: 5
            },
            headers
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Total de resultados (paging.total): ${response.data.paging?.total}`);
        console.log(`📦 Resultados retornados no array: ${response.data.results?.length}`);

        if (response.data.results && response.data.results.length > 0) {
            const first = response.data.results[0];
            console.log('\n🔎 ANÁLISE DO PRIMEIRO PRODUTO:');
            console.log(`   ID: ${first.id}`);
            console.log(`   Título: ${first.title}`);
            console.log(`   Preço Atual: ${first.price}`);
            console.log(`   Preço Original: ${first.original_price}`);
            console.log(`   Disponibilidade: ${first.available_quantity}`);
            console.log(`   Permalink: ${first.permalink}`);

            // Checar se tem desconto
            const hasDiscount = first.original_price && first.original_price > first.price;
            console.log(`   💡 Tem desconto detectável? ${hasDiscount ? 'SIM' : 'NÃO'}`);

            if (!hasDiscount) {
                console.log('\n⚠️  ALERTA: O produto não tem "original_price" ou é igual ao preço atual.');
                console.log('    Isso explica porque o sync filtra tudo e retorna 0 produtos.');
            }

            console.log('\n📄 RAW DATA (Primeiro item):');
            console.log(JSON.stringify(first, null, 2));
        } else {
            console.log('⚠️ Nenhum resultado encontrado no array "results".');
        }

    } catch (error) {
        console.error(`❌ Erro na requisição: ${error.message}`);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugSearch();

// Script de teste rápido da API do Mercado Livre
// Usando Client Credentials (não requer refresh token)

import dotenv from 'dotenv';
import axios from 'axios';
import chalk from 'chalk';

dotenv.config();

const CLIENT_ID = '1016544593231768';
const CLIENT_SECRET = '2VA7yCY4fEPX7PWEvwG0rrq6N0qKzxfG';

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTE RÁPIDO DA API DO MERCADO LIVRE');
console.log('='.repeat(80) + '\n');

async function testMeliAPI() {
    try {
        // 1. Obter Access Token via Client Credentials
        console.log('📋 [1/3] Obtendo Access Token via Client Credentials...');

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);

        const tokenResponse = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        const accessToken = tokenResponse.data.access_token;
        console.log(chalk.green('✅ Access Token obtido com sucesso!'));
        console.log(`   Token: ${accessToken.substring(0, 20)}...`);
        console.log(`   Expira em: ${tokenResponse.data.expires_in / 3600} horas\n`);

        // 2. Testar busca de categorias
        console.log('📋 [2/3] Testando busca de categorias...');

        const categoriesResponse = await axios.get('https://api.mercadolibre.com/sites/MLB/categories', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log(chalk.green(`✅ ${categoriesResponse.data.length} categorias encontradas!`));
        console.log(`   Exemplo: ${categoriesResponse.data[0].name} (${categoriesResponse.data[0].id})\n`);

        // 3. Testar busca de produtos
        console.log('📋 [3/3] Testando busca de produtos...');

        const searchResponse = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
            params: {
                q: 'notebook',
                limit: 5
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const products = searchResponse.data.results;
        console.log(chalk.green(`✅ ${products.length} produtos encontrados!`));

        if (products.length > 0) {
            const product = products[0];
            console.log(`   Exemplo: ${product.title.substring(0, 60)}...`);
            console.log(`   Preço: R$ ${product.price}`);
            console.log(`   ID: ${product.id}\n`);
        }

        // Resumo
        console.log('='.repeat(80));
        console.log(chalk.green.bold('🎉 TODOS OS TESTES PASSARAM!'));
        console.log('='.repeat(80) + '\n');

        console.log(chalk.blue('📊 RESUMO:'));
        console.log(`   ✅ Client ID: VÁLIDO`);
        console.log(`   ✅ Client Secret: VÁLIDO`);
        console.log(`   ✅ API do Mercado Livre: FUNCIONANDO`);
        console.log(`   ✅ Autenticação: OK`);
        console.log(`   ✅ Busca de Categorias: OK`);
        console.log(`   ✅ Busca de Produtos: OK\n`);

        console.log(chalk.yellow('⚠️  PRÓXIMO PASSO:'));
        console.log(`   Para funcionalidades avançadas (sync automático, etc), você precisa:`);
        console.log(`   1. Obter um REFRESH TOKEN via fluxo OAuth completo`);
        console.log(`   2. Isso requer autorização do usuário`);
        console.log(`   3. Use: node backend/scripts/get-meli-token.js\n`);

        console.log(chalk.cyan('💡 TESTANDO AGORA (Client Credentials):'));
        console.log(`   ✅ Busca de produtos públicos`);
        console.log(`   ✅ Busca de categorias`);
        console.log(`   ✅ Consulta de itens públicos`);
        console.log(`   ❌ Acesso a dados privados do seller (requer OAuth)`);
        console.log(`   ❌ Listagem de produtos do seller (requer OAuth)\n`);

        process.exit(0);

    } catch (error) {
        console.log('\n' + '='.repeat(80));
        console.log(chalk.red.bold('❌ ERRO NO TESTE'));
        console.log('='.repeat(80) + '\n');

        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            console.log(chalk.red(`Status: ${status}`));
            console.log(chalk.red(`Mensagem: ${errorData.message || errorData.error || 'Erro desconhecido'}`));
            console.log(chalk.red(`Detalhes:`), JSON.stringify(errorData, null, 2));

            if (status === 400) {
                console.log(chalk.yellow('\n💡 Possíveis causas:'));
                console.log('   - Client ID ou Client Secret incorretos');
                console.log('   - Credenciais com espaços extras');
            } else if (status === 401) {
                console.log(chalk.yellow('\n💡 Possíveis causas:'));
                console.log('   - Token inválido ou expirado');
                console.log('   - Client Secret incorreto');
            }
        } else {
            console.log(chalk.red(`Erro: ${error.message}`));
        }

        console.log('\n');
        process.exit(1);
    }
}

testMeliAPI();

// Script para testar toda a API do Mercado Livre
// Uso: node backend/scripts/test-meli-api.js

import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

dotenv.config();

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Estatísticas
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  startTime: Date.now()
};

// Configuração do Mercado Livre
let config = {
  clientId: null,
  clientSecret: null,
  accessToken: null,
  refreshToken: null,
  userId: null
};

/**
 * Cores para output
 */
const log = {
  title: (msg) => console.log(chalk.bold.cyan(`\n${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}`)),
  section: (msg) => console.log(chalk.bold.yellow(`\n━━━ ${msg} ━━━`)),
  success: (msg) => console.log(chalk.green(`✅ ${msg}`)),
  error: (msg) => console.log(chalk.red(`❌ ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`⚠️  ${msg}`)),
  info: (msg) => console.log(chalk.blue(`ℹ️  ${msg}`)),
  debug: (msg) => console.log(chalk.gray(`   ${msg}`)),
  test: (msg) => console.log(chalk.white(`📋 ${msg}`))
};

/**
 * Executar teste
 */
async function runTest(name, testFn) {
  stats.total++;
  log.test(name);

  try {
    const result = await testFn();
    if (result !== false) {
      stats.passed++;
      log.success('PASSOU');
    } else {
      stats.failed++;
      log.error('FALHOU');
    }
    return result;
  } catch (error) {
    stats.failed++;
    log.error(`ERRO: ${error.message}`);
    if (error.response?.data) {
      log.debug(`Detalhes: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

/**
 * Carregar configurações do banco ou .env
 */
async function loadConfig() {
  log.section('Carregando Configurações');

  try {
    // Tentar carregar do banco primeiro (se Supabase disponível)
    if (supabase) {
      log.debug('Tentando carregar do banco de dados...');

      const { data, error } = await supabase
        .from('app_settings')
        .select('meli_client_id, meli_client_secret, meli_access_token, meli_refresh_token, meli_user_id')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (!error && data) {
        config.clientId = data.meli_client_id || process.env.MELI_CLIENT_ID;
        config.clientSecret = data.meli_client_secret || process.env.MELI_CLIENT_SECRET;
        config.accessToken = data.meli_access_token || process.env.MELI_ACCESS_TOKEN;
        config.refreshToken = data.meli_refresh_token || process.env.MELI_REFRESH_TOKEN;
        config.userId = data.meli_user_id || process.env.MELI_USER_ID;

        log.info('Configurações carregadas do banco de dados');
      } else {
        log.warning('Erro ao carregar do banco, usando .env');
        throw new Error('Banco não disponível');
      }
    } else {
      throw new Error('Supabase não configurado');
    }
  } catch (error) {
    // Fallback para .env
    log.info('Usando configurações do arquivo .env');

    config.clientId = process.env.MELI_CLIENT_ID || process.env.MELI_APP_ID;
    config.clientSecret = process.env.MELI_CLIENT_SECRET || process.env.MELI_SECRET_KEY;
    config.accessToken = process.env.MELI_ACCESS_TOKEN;
    config.refreshToken = process.env.MELI_REFRESH_TOKEN;
    config.userId = process.env.MELI_USER_ID;
  }

  log.info('Configurações carregadas');
  log.debug(`Client ID: ${config.clientId ? config.clientId.substring(0, 10) + '...' : 'NÃO CONFIGURADO'}`);
  log.debug(`Client Secret: ${config.clientSecret ? '***' : 'NÃO CONFIGURADO'}`);
  log.debug(`Access Token: ${config.accessToken ? config.accessToken.substring(0, 20) + '...' : 'NÃO CONFIGURADO'}`);
  log.debug(`Refresh Token: ${config.refreshToken ? config.refreshToken.substring(0, 20) + '...' : 'NÃO CONFIGURADO'}`);
  log.debug(`User ID: ${config.userId || 'NÃO CONFIGURADO'}`);

  return true;
}

/**
 * TESTE 1: Validar credenciais
 */
async function testCredentials() {
  const hasClientId = !!config.clientId;
  const hasClientSecret = !!config.clientSecret;
  const hasAccessToken = !!config.accessToken;

  if (!hasClientId) log.error('Client ID não configurado');
  if (!hasClientSecret) log.error('Client Secret não configurado');
  if (!hasAccessToken) log.warning('Access Token não configurado (será gerado)');

  return hasClientId && hasClientSecret;
}

/**
 * TESTE 2: Renovar/Obter Access Token
 */
async function testGetAccessToken() {
  if (config.accessToken) {
    log.info('Access Token já configurado, pulando renovação');
    return true;
  }

  if (!config.refreshToken) {
    log.warning('Refresh Token não configurado, tentando Client Credentials');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    config.accessToken = response.data.access_token;
    log.debug(`Novo Access Token: ${config.accessToken.substring(0, 20)}...`);
    return true;
  }

  // Tentar renovar com refresh token
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  params.append('refresh_token', config.refreshToken);

  const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  });

  config.accessToken = response.data.access_token;
  if (response.data.refresh_token) {
    config.refreshToken = response.data.refresh_token;
    log.debug('Novo Refresh Token recebido');
  }
  log.debug(`Novo Access Token: ${config.accessToken.substring(0, 20)}...`);

  return true;
}

/**
 * TESTE 3: Validar Access Token
 */
async function testValidateToken() {
  const response = await axios.get('https://api.mercadolibre.com/users/me', {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  config.userId = response.data.id;
  log.debug(`User ID: ${config.userId}`);
  log.debug(`Nickname: ${response.data.nickname}`);
  log.debug(`Site: ${response.data.site_id}`);

  return true;
}

/**
 * TESTE 4: Buscar categorias
 */
async function testGetCategories() {
  const response = await axios.get('https://api.mercadolibre.com/sites/MLB/categories', {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  const categories = response.data;
  log.debug(`Total de categorias: ${categories.length}`);
  log.debug(`Exemplo: ${categories[0]?.name} (${categories[0]?.id})`);

  return categories.length > 0;
}

/**
 * TESTE 5: Buscar produtos (search)
 */
async function testSearchProducts() {
  const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: {
      q: 'notebook',
      limit: 5
    },
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  const results = response.data.results;
  log.debug(`Produtos encontrados: ${results.length}`);
  if (results.length > 0) {
    log.debug(`Exemplo: ${results[0].title}`);
    log.debug(`   Preço: R$ ${results[0].price}`);
    log.debug(`   ID: ${results[0].id}`);
  }

  return results.length > 0;
}

/**
 * TESTE 6: Obter detalhes de um produto
 */
async function testGetProductDetails() {
  // Primeiro buscar um produto
  const searchResponse = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: { q: 'mouse', limit: 1 },
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  const productId = searchResponse.data.results[0]?.id;
  if (!productId) {
    log.warning('Nenhum produto encontrado para testar');
    return false;
  }

  const response = await axios.get(`https://api.mercadolibre.com/items/${productId}`, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  log.debug(`Produto: ${response.data.title}`);
  log.debug(`   Preço: R$ ${response.data.price}`);
  log.debug(`   Condição: ${response.data.condition}`);
  log.debug(`   Vendidos: ${response.data.sold_quantity}`);

  return true;
}

/**
 * TESTE 7: Buscar ofertas/descontos
 */
async function testGetDeals() {
  const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: {
      q: '*',
      discount: '10-100', // Produtos com 10% a 100% de desconto
      limit: 10,
      sort: 'price_asc'
    },
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  const deals = response.data.results.filter(item => item.original_price && item.price < item.original_price);
  log.debug(`Ofertas encontradas: ${deals.length}`);

  if (deals.length > 0) {
    const deal = deals[0];
    const discount = Math.round((1 - deal.price / deal.original_price) * 100);
    log.debug(`Exemplo: ${deal.title.substring(0, 50)}...`);
    log.debug(`   De: R$ ${deal.original_price} → Por: R$ ${deal.price}`);
    log.debug(`   Desconto: ${discount}% OFF`);
  }

  return deals.length > 0;
}

/**
 * TESTE 8: Buscar trends/hot deals
 */
async function testGetTrends() {
  const response = await axios.get('https://api.mercadolibre.com/trends/MLB/search', {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  log.debug(`Trends encontrados: ${response.data.length || 0}`);
  if (response.data.length > 0) {
    log.debug(`Exemplo: ${response.data[0].keyword}`);
  }

  return true;
}

/**
 * TESTE 9: Verificar rate limits
 */
async function testRateLimits() {
  const response = await axios.get('https://api.mercadolibre.com/users/me', {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  const rateLimitHeader = response.headers['x-ratelimit-limit'];
  const rateLimitRemaining = response.headers['x-ratelimit-remaining'];

  if (rateLimitHeader) {
    log.debug(`Rate Limit: ${rateLimitRemaining}/${rateLimitHeader} requests restantes`);

    if (parseInt(rateLimitRemaining) < 100) {
      log.warning(`Atenção: Apenas ${rateLimitRemaining} requests restantes!`);
    }
  } else {
    log.debug('Rate limit headers não disponíveis');
  }

  return true;
}

/**
 * TESTE 10: Testar endpoints de seller (se houver)
 */
async function testSellerEndpoints() {
  if (!config.userId) {
    log.warning('User ID não disponível, pulando teste de seller');
    return true;
  }

  try {
    const response = await axios.get(`https://api.mercadolibre.com/users/${config.userId}/items/search`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    log.debug(`Produtos do seller: ${response.data.results?.length || 0}`);
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      log.warning('Acesso negado - usuário não é seller ou sem permissões');
      return true; // Não é erro crítico
    }
    throw error;
  }
}

/**
 * TESTE 11: Testar busca por categoria
 */
async function testSearchByCategory() {
  const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: {
      category: 'MLB1051', // Eletrônicos
      limit: 5
    },
    headers: {
      'Authorization': `Bearer ${config.accessToken}`
    }
  });

  log.debug(`Produtos da categoria: ${response.data.results.length}`);
  return response.data.results.length > 0;
}

/**
 * TESTE 12: Testar multiget (buscar múltiplos IDs)
 */
async function testMultiget() {
  // Primeiro buscar alguns produtos
  const searchResponse = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: { q: 'celular', limit: 3 },
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  const ids = searchResponse.data.results.map(item => item.id).slice(0, 3);

  if (ids.length === 0) {
    log.warning('Nenhum produto para testar multiget');
    return false;
  }

  const response = await axios.get(`https://api.mercadolibre.com/items`, {
    params: { ids: ids.join(',') },
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  log.debug(`Produtos retornados: ${response.data.length}`);
  return response.data.length === ids.length;
}

/**
 * Exibir resumo
 */
function showSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);

  log.title('RESUMO DOS TESTES');
  console.log(chalk.bold(`Total de Testes: ${stats.total}`));
  console.log(chalk.green(`✅ Passou: ${stats.passed}`));
  console.log(chalk.red(`❌ Falhou: ${stats.failed}`));
  console.log(chalk.yellow(`⚠️  Avisos: ${stats.warnings}`));
  console.log(chalk.blue(`⏱️  Duração: ${duration}s`));
  console.log(chalk.bold(`📊 Taxa de Sucesso: ${passRate}%`));

  console.log('\n');

  if (stats.failed === 0) {
    console.log(chalk.green.bold('🎉 TODOS OS TESTES PASSARAM!'));
  } else {
    console.log(chalk.red.bold('⚠️  ALGUNS TESTES FALHARAM. Verifique os erros acima.'));
  }

  console.log('\n');
}

/**
 * Main
 */
async function main() {
  log.title('🧪 TESTE COMPLETO DA API DO MERCADO LIVRE');

  // Carregar configurações
  const configLoaded = await loadConfig();
  if (!configLoaded) {
    log.error('Não foi possível carregar configurações. Abortando testes.');
    process.exit(1);
  }

  // Executar testes
  log.section('TESTES DE AUTENTICAÇÃO');
  await runTest('1. Validar Credenciais', testCredentials);
  await runTest('2. Obter/Renovar Access Token', testGetAccessToken);
  await runTest('3. Validar Access Token', testValidateToken);

  log.section('TESTES DE API PÚBLICA');
  await runTest('4. Buscar Categorias', testGetCategories);
  await runTest('5. Buscar Produtos (Search)', testSearchProducts);
  await runTest('6. Obter Detalhes de Produto', testGetProductDetails);
  await runTest('7. Buscar Ofertas/Descontos', testGetDeals);
  await runTest('8. Buscar Trends', testGetTrends);

  log.section('TESTES AVANÇADOS');
  await runTest('9. Verificar Rate Limits', testRateLimits);
  await runTest('10. Endpoints de Seller', testSellerEndpoints);
  await runTest('11. Buscar por Categoria', testSearchByCategory);
  await runTest('12. Multiget (Múltiplos IDs)', testMultiget);

  // Exibir resumo
  showSummary();

  // Exit code baseado em falhas
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Executar
main().catch((error) => {
  log.error(`Erro fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});

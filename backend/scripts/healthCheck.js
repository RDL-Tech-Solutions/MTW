#!/usr/bin/env node

/**
 * Script de Health Check
 * Verifica se o backend está funcionando corretamente
 */

import axios from 'axios';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function checkEndpoint(endpoint, name) {
  try {
    const response = await axios.get(`${API_URL}${endpoint}`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      log(`✅ ${name}: OK`, 'green');
      return true;
    } else {
      log(`⚠️  ${name}: Status ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(`❌ ${name}: Servidor não está rodando`, 'red');
    } else if (error.response) {
      log(`⚠️  ${name}: Status ${error.response.status}`, 'yellow');
    } else {
      log(`❌ ${name}: ${error.message}`, 'red');
    }
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('🏥 MTW PROMO - HEALTH CHECK', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  log(`🔍 Verificando API em: ${API_URL}\n`, 'cyan');

  const checks = [
    ['/', 'Rota raiz'],
    ['/api/health', 'Health check'],
  ];

  let allOk = true;
  for (const [endpoint, name] of checks) {
    const ok = await checkEndpoint(endpoint, name);
    if (!ok) allOk = false;
  }

  log('\n' + '='.repeat(60), 'blue');
  if (allOk) {
    log('✅ TODOS OS CHECKS PASSARAM!', 'green');
    log('\n🎉 Backend está funcionando corretamente!', 'green');
  } else {
    log('❌ ALGUNS CHECKS FALHARAM', 'red');
    log('\n💡 Verifique se:', 'yellow');
    log('   1. O servidor está rodando (npm run dev)', 'yellow');
    log('   2. As variáveis de ambiente estão configuradas', 'yellow');
    log('   3. O banco de dados está acessível', 'yellow');
  }
  log('='.repeat(60) + '\n', 'blue');

  process.exit(allOk ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Erro durante health check: ${error.message}`, 'red');
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Script de Setup do Backend
 * Verifica configurações e prepara ambiente para desenvolvimento
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function checkFile(filePath, name) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ ${name} encontrado`, 'green');
    return true;
  } else {
    log(`❌ ${name} não encontrado`, 'red');
    return false;
  }
}

function checkEnvVariables() {
  log('\n📋 Verificando variáveis de ambiente...', 'cyan');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ Arquivo .env não encontrado', 'red');
    log('💡 Copie .env.example para .env e configure as variáveis', 'yellow');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  let allPresent = true;
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      log(`✅ ${varName} configurado`, 'green');
    } else {
      log(`❌ ${varName} não configurado`, 'red');
      allPresent = false;
    }
  });

  // Verificar variáveis opcionais dos bots
  log('\n🤖 Verificando configuração dos bots (opcional)...', 'cyan');
  const botVars = ['TELEGRAM_BOT_TOKEN', 'WHATSAPP_API_TOKEN'];
  botVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      log(`✅ ${varName} configurado`, 'green');
    } else {
      log(`⚠️  ${varName} não configurado (opcional)`, 'yellow');
    }
  });

  return allPresent;
}

function createDirectories() {
  log('\n📁 Criando diretórios necessários...', 'cyan');
  
  const dirs = [
    path.join(__dirname, '..', 'logs'),
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✅ Diretório criado: ${path.basename(dir)}`, 'green');
    } else {
      log(`✅ Diretório já existe: ${path.basename(dir)}`, 'green');
    }
  });
}

function checkNodeVersion() {
  log('\n🔍 Verificando versão do Node.js...', 'cyan');
  
  const version = process.version;
  const major = parseInt(version.split('.')[0].substring(1));
  
  if (major >= 18) {
    log(`✅ Node.js ${version} (compatível)`, 'green');
    return true;
  } else {
    log(`❌ Node.js ${version} (requer >= 18.0.0)`, 'red');
    return false;
  }
}

function displayNextSteps() {
  log('\n' + '='.repeat(60), 'blue');
  log('🎯 PRÓXIMOS PASSOS', 'blue');
  log('='.repeat(60), 'blue');
  
  log('\n1️⃣  Configure o arquivo .env com suas credenciais', 'cyan');
  log('   - Supabase URL e Keys', 'yellow');
  log('   - JWT Secret', 'yellow');
  log('   - Tokens dos bots (opcional)', 'yellow');
  
  log('\n2️⃣  Execute as migrations no Supabase:', 'cyan');
  log('   - database/schema.sql', 'yellow');
  log('   - database/migrations/001_add_bot_tables.sql', 'yellow');
  
  log('\n3️⃣  Instale as dependências:', 'cyan');
  log('   npm install', 'yellow');
  
  log('\n4️⃣  Inicie o servidor:', 'cyan');
  log('   npm run dev', 'yellow');
  
  log('\n5️⃣  Teste a API:', 'cyan');
  log('   npm run check', 'yellow');
  
  log('\n📚 Documentação:', 'cyan');
  log('   - README.md - Visão geral', 'yellow');
  log('   - BOTS_QUICK_START.md - Setup dos bots', 'yellow');
  log('   - BOTS_DOCUMENTATION.md - Referência completa', 'yellow');
  
  log('\n' + '='.repeat(60) + '\n', 'blue');
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 MTW PROMO - SETUP DO BACKEND', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  // Verificar Node.js
  const nodeOk = checkNodeVersion();
  if (!nodeOk) {
    log('\n❌ Setup falhou: Node.js incompatível', 'red');
    process.exit(1);
  }

  // Verificar arquivos essenciais
  log('\n📦 Verificando arquivos essenciais...', 'cyan');
  const files = [
    [path.join(__dirname, '..', 'src', 'server.js'), 'server.js'],
    [path.join(__dirname, '..', '.env.example'), '.env.example'],
    [path.join(__dirname, '..', 'package.json'), 'package.json']
  ];

  let allFilesOk = true;
  files.forEach(([filePath, name]) => {
    if (!checkFile(filePath, name)) {
      allFilesOk = false;
    }
  });

  if (!allFilesOk) {
    log('\n❌ Setup falhou: Arquivos essenciais faltando', 'red');
    process.exit(1);
  }

  // Verificar variáveis de ambiente
  const envOk = checkEnvVariables();

  // Criar diretórios
  createDirectories();

  // Resultado final
  log('\n' + '='.repeat(60), 'blue');
  if (envOk) {
    log('✅ SETUP CONCLUÍDO COM SUCESSO!', 'green');
  } else {
    log('⚠️  SETUP PARCIALMENTE CONCLUÍDO', 'yellow');
    log('Configure o arquivo .env antes de iniciar o servidor', 'yellow');
  }
  log('='.repeat(60) + '\n', 'blue');

  // Exibir próximos passos
  displayNextSteps();
}

main().catch(error => {
  log(`\n❌ Erro durante setup: ${error.message}`, 'red');
  process.exit(1);
});

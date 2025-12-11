#!/usr/bin/env node

/**
 * Script para executar migrations
 * Facilita a execução das migrations do banco de dados
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

function listMigrations() {
  log('\n' + '='.repeat(60), 'blue');
  log('📋 MIGRATIONS DISPONÍVEIS', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  const databaseDir = path.join(__dirname, '..', '..', 'database');
  
  // Schema principal
  const schemaPath = path.join(databaseDir, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    log('1️⃣  Schema Principal', 'cyan');
    log('   Arquivo: database/schema.sql', 'yellow');
    log('   Descrição: Cria todas as tabelas base do sistema', 'yellow');
    log('   Status: ⚠️  Deve ser executado primeiro\n', 'yellow');
  }

  // Migrations
  const migrationsDir = path.join(databaseDir, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length > 0) {
      log('📦 Migrations:', 'cyan');
      files.forEach((file, index) => {
        log(`   ${index + 2}️⃣  ${file}`, 'yellow');
      });
      log('');
    }
  }

  log('='.repeat(60), 'blue');
  log('\n📝 INSTRUÇÕES:', 'cyan');
  log('\n1. Acesse o Supabase Dashboard', 'yellow');
  log('   https://app.supabase.com/project/SEU_PROJETO\n', 'yellow');
  
  log('2. Vá em "SQL Editor"\n', 'yellow');
  
  log('3. Execute os arquivos na ordem:', 'yellow');
  log('   a) database/schema.sql (primeiro)', 'yellow');
  log('   b) database/migrations/*.sql (depois)\n', 'yellow');
  
  log('4. Verifique se não há erros\n', 'yellow');
  
  log('💡 Dica: Copie e cole o conteúdo de cada arquivo no SQL Editor', 'cyan');
  log('='.repeat(60) + '\n', 'blue');
}

function displayMigrationContent(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`❌ Arquivo não encontrado: ${filePath}`, 'red');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  log('\n' + '='.repeat(60), 'blue');
  log(`📄 CONTEÚDO: ${path.basename(filePath)}`, 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  log(content, 'cyan');
  
  log('\n' + '='.repeat(60), 'blue');
  log(`Total de linhas: ${lines.length}`, 'yellow');
  log('='.repeat(60) + '\n', 'blue');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    listMigrations();
    return;
  }

  const command = args[0];
  
  if (command === 'list') {
    listMigrations();
  } else if (command === 'show') {
    const fileName = args[1];
    if (!fileName) {
      log('❌ Especifique o nome do arquivo', 'red');
      log('Exemplo: npm run db:migrate show schema.sql', 'yellow');
      return;
    }

    const databaseDir = path.join(__dirname, '..', '..', 'database');
    let filePath = path.join(databaseDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(databaseDir, 'migrations', fileName);
    }

    displayMigrationContent(filePath);
  } else {
    log('❌ Comando inválido', 'red');
    log('\nComandos disponíveis:', 'yellow');
    log('  npm run db:migrate          - Lista migrations', 'cyan');
    log('  npm run db:migrate list     - Lista migrations', 'cyan');
    log('  npm run db:migrate show <arquivo> - Mostra conteúdo', 'cyan');
  }
}

main();

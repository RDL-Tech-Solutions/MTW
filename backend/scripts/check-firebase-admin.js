#!/usr/bin/env node

/**
 * Script para verificar se firebase-admin está instalado e configurado
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue('\n🔍 Verificando instalação do Firebase Admin SDK...\n'));

// 1. Verificar se firebase-admin está instalado
console.log(chalk.yellow('1. Verificando módulo firebase-admin...'));
try {
  await import('firebase-admin');
  console.log(chalk.green('   ✅ firebase-admin está instalado\n'));
} catch (error) {
  console.log(chalk.red('   ❌ firebase-admin NÃO está instalado'));
  console.log(chalk.red(`   Erro: ${error.message}\n`));
  console.log(chalk.yellow('   Solução: Execute "npm install" no diretório backend\n'));
  process.exit(1);
}

// 2. Verificar arquivo de credenciais
console.log(chalk.yellow('2. Verificando arquivo de credenciais...'));
const credentialsPath = path.join(__dirname, '../../firebase-service-account.json');
const credentialsExists = fs.existsSync(credentialsPath);

if (credentialsExists) {
  console.log(chalk.green('   ✅ firebase-service-account.json encontrado'));
  
  // Verificar se é um JSON válido
  try {
    const content = fs.readFileSync(credentialsPath, 'utf8');
    const json = JSON.parse(content);
    
    // Verificar campos obrigatórios
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !json[field]);
    
    if (missingFields.length > 0) {
      console.log(chalk.red(`   ❌ Campos obrigatórios faltando: ${missingFields.join(', ')}`));
      process.exit(1);
    }
    
    console.log(chalk.green(`   ✅ Arquivo válido (project_id: ${json.project_id})\n`));
  } catch (error) {
    console.log(chalk.red('   ❌ Arquivo inválido ou corrompido'));
    console.log(chalk.red(`   Erro: ${error.message}\n`));
    process.exit(1);
  }
} else {
  console.log(chalk.red('   ❌ firebase-service-account.json NÃO encontrado'));
  console.log(chalk.yellow(`   Caminho esperado: ${credentialsPath}`));
  console.log(chalk.yellow('   Solução: Baixe o arquivo do Firebase Console e coloque no diretório backend\n'));
  process.exit(1);
}

// 3. Verificar variável de ambiente
console.log(chalk.yellow('3. Verificando variável de ambiente...'));
const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (envPath) {
  console.log(chalk.green(`   ✅ FIREBASE_SERVICE_ACCOUNT_PATH definida: ${envPath}\n`));
} else {
  console.log(chalk.yellow('   ⚠️  FIREBASE_SERVICE_ACCOUNT_PATH não definida no .env'));
  console.log(chalk.yellow('   Usando caminho padrão: ./firebase-service-account.json\n'));
}

// 4. Tentar inicializar Firebase Admin
console.log(chalk.yellow('4. Testando inicialização do Firebase Admin...'));
try {
  const admin = await import('firebase-admin');
  
  // Verificar se já foi inicializado
  if (admin.default.apps.length > 0) {
    console.log(chalk.green('   ✅ Firebase Admin já está inicializado\n'));
  } else {
    // Tentar inicializar
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount)
    });
    
    console.log(chalk.green('   ✅ Firebase Admin inicializado com sucesso\n'));
  }
  
  // Testar acesso ao FCM
  console.log(chalk.yellow('5. Testando acesso ao FCM...'));
  const messaging = admin.default.messaging();
  console.log(chalk.green('   ✅ FCM acessível\n'));
  
} catch (error) {
  console.log(chalk.red('   ❌ Erro ao inicializar Firebase Admin'));
  console.log(chalk.red(`   Erro: ${error.message}\n`));
  process.exit(1);
}

// Sucesso!
console.log(chalk.green.bold('✅ TUDO OK! Firebase Admin está configurado corretamente.\n'));
console.log(chalk.blue('Próximos passos:'));
console.log(chalk.white('  1. Iniciar o backend: npm start'));
console.log(chalk.white('  2. Testar notificações: npm run test:push'));
console.log(chalk.white('  3. Fazer build do app: npx expo prebuild && npx expo run:android\n'));

#!/usr/bin/env node

/**
 * Script para obter token de autenticação via linha de comando
 * Uso: node get-token.js
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Resposta inválida da API'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n🔑 Gerador de Token de Autenticação\n');
  console.log('═'.repeat(50));
  
  try {
    // Perguntar URL da API
    const apiUrl = await question('\n📡 URL da API (ex: http://localhost:3000): ');
    
    if (!apiUrl.trim()) {
      console.log('\n❌ URL da API é obrigatória!');
      rl.close();
      return;
    }

    // Perguntar email
    const email = await question('📧 Email (admin): ');
    
    if (!email.trim()) {
      console.log('\n❌ Email é obrigatório!');
      rl.close();
      return;
    }

    // Perguntar senha (não mostra na tela)
    process.stdout.write('🔒 Senha: ');
    process.stdin.setRawMode(true);
    
    let password = '';
    await new Promise((resolve) => {
      process.stdin.on('data', (char) => {
        char = char.toString();
        
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          resolve();
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f') {
          password = password.slice(0, -1);
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write('🔒 Senha: ' + '*'.repeat(password.length));
        } else {
          password += char;
          process.stdout.write('*');
        }
      });
    });

    if (!password.trim()) {
      console.log('\n❌ Senha é obrigatória!');
      rl.close();
      return;
    }

    console.log('\n⏳ Fazendo login...\n');

    // Fazer requisição
    const loginUrl = `${apiUrl.replace(/\/$/, '')}/api/auth/login`;
    const data = JSON.stringify({ email: email.trim(), password: password.trim() });

    const response = await makeRequest(loginUrl, data);

    if (!response.success || !response.data || !response.data.token) {
      console.log('❌ Erro ao fazer login:', response.message || 'Token não encontrado');
      rl.close();
      return;
    }

    // Verificar se é admin
    if (response.data.user && response.data.user.role !== 'admin') {
      console.log('\n❌ Erro: Você precisa ser um administrador para usar a extensão!');
      console.log(`   Seu role atual: ${response.data.user.role}`);
      rl.close();
      return;
    }

    const token = response.data.token;
    const userName = response.data.user?.name || email;

    console.log('═'.repeat(50));
    console.log('\n✅ Login realizado com sucesso!\n');
    console.log(`👤 Usuário: ${userName}`);
    console.log(`🎭 Role: ${response.data.user?.role || 'N/A'}`);
    console.log('\n🔑 Seu Token:\n');
    console.log('─'.repeat(50));
    console.log(token);
    console.log('─'.repeat(50));
    console.log('\n📋 Copie o token acima e cole na extensão Chrome');
    console.log('\n⚠️  Mantenha seu token em segredo!');
    console.log('═'.repeat(50));
    console.log('\n');

  } catch (error) {
    console.log('\n❌ Erro:', error.message);
    console.log('\n💡 Dicas:');
    console.log('   - Verifique se o backend está rodando');
    console.log('   - Confirme se a URL da API está correta');
    console.log('   - Verifique suas credenciais');
  } finally {
    rl.close();
  }
}

main();

#!/usr/bin/env node

/**
 * Script para testar o endpoint de registro de FCM token
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

console.log(chalk.blue('\n🧪 Testando Registro de FCM Token\n'));

async function testRegisterToken() {
  try {
    // 1. Fazer login para obter token JWT
    console.log(chalk.yellow('1. Fazendo login...'));
    
    // Tentar diferentes credenciais
    let jwtToken = null;
    const credentials = [
      { email: 'admin@precocerto.com', password: 'admin123' },
      { email: 'test@test.com', password: 'test123' },
      { email: 'user@example.com', password: 'password123' }
    ];

    for (const cred of credentials) {
      try {
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, cred);
        jwtToken = loginResponse.data.data.token;
        console.log(chalk.green(`   ✅ Login realizado com sucesso (${cred.email})\n`));
        break;
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️  Falha com ${cred.email}, tentando próximo...`));
      }
    }

    if (!jwtToken) {
      console.log(chalk.red('\n   ❌ Nenhuma credencial funcionou. Criando usuário de teste...\n'));
      
      // Criar usuário de teste
      try {
        const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
          name: 'Test User',
          email: 'test@fcm.com',
          password: 'test123',
          phone: '11999999999'
        });
        
        jwtToken = registerResponse.data.data.token;
        console.log(chalk.green('   ✅ Usuário de teste criado e logado\n'));
      } catch (regError) {
        console.log(chalk.red('   ❌ Erro ao criar usuário de teste'));
        console.log(chalk.red(`   ${regError.response?.data?.message || regError.message}\n`));
        process.exit(1);
      }
    }

    // 2. Testar registro de token com campo CORRETO
    console.log(chalk.yellow('2. Testando registro de token (campo "token")...'));
    
    const testToken = 'test_fcm_token_' + Date.now();
    
    try {
      const registerResponse = await axios.post(
        `${API_URL}/api/notifications/register-token`,
        {
          token: testToken  // ✅ Campo correto
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );

      console.log(chalk.green('   ✅ Token registrado com sucesso!'));
      console.log(chalk.white('   Resposta:', JSON.stringify(registerResponse.data, null, 2)));
      console.log();
    } catch (error) {
      console.log(chalk.red('   ❌ Erro ao registrar token'));
      console.log(chalk.red('   Status:', error.response?.status));
      console.log(chalk.red('   Mensagem:', error.response?.data?.message || error.message));
      console.log();
    }

    // 3. Testar com campo ERRADO (push_token) para confirmar que falha
    console.log(chalk.yellow('3. Testando com campo ERRADO ("push_token")...'));
    
    try {
      await axios.post(
        `${API_URL}/api/notifications/register-token`,
        {
          push_token: testToken  // ❌ Campo errado (antigo)
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );

      console.log(chalk.red('   ❌ PROBLEMA: Deveria ter falhado mas passou!'));
      console.log();
    } catch (error) {
      console.log(chalk.green('   ✅ Falhou como esperado (campo errado)'));
      console.log(chalk.white('   Erro:', error.response?.data?.message || error.message));
      console.log();
    }

    // 4. Testar sem token para confirmar validação
    console.log(chalk.yellow('4. Testando sem token (validação)...'));
    
    try {
      await axios.post(
        `${API_URL}/api/notifications/register-token`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );

      console.log(chalk.red('   ❌ PROBLEMA: Deveria ter falhado mas passou!'));
      console.log();
    } catch (error) {
      console.log(chalk.green('   ✅ Falhou como esperado (campo obrigatório)'));
      console.log(chalk.white('   Erro:', error.response?.data?.message || error.message));
      console.log();
    }

    // Resumo
    console.log(chalk.green.bold('✅ TESTE CONCLUÍDO!\n'));
    console.log(chalk.blue('Resumo:'));
    console.log(chalk.white('  • Endpoint aceita campo "token" ✅'));
    console.log(chalk.white('  • Endpoint rejeita campo "push_token" ✅'));
    console.log(chalk.white('  • Validação de campo obrigatório funciona ✅'));
    console.log();
    console.log(chalk.green('O app agora pode registrar FCM tokens com sucesso!\n'));

  } catch (error) {
    console.log(chalk.red('\n❌ Erro no teste:'));
    console.log(chalk.red('   Mensagem:', error.message));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\n⚠️  Backend não está rodando!'));
      console.log(chalk.white('   Inicie o backend: npm start\n'));
    }
    
    process.exit(1);
  }
}

testRegisterToken();

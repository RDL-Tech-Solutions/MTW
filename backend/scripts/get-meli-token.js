// Script para obter Access Token do Mercado Livre
// Uso: node scripts/get-meli-token.js

import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import open from 'open';

dotenv.config();

const CLIENT_ID = process.env.MELI_CLIENT_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;
const REDIRECT_URI = 'https://localhost:3000/auth/meli/callback';

console.log('🔐 Obtendo Access Token do Mercado Livre\n');

// Criar servidor temporário para receber callback
const app = express();
let server;

app.get('/auth/meli/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('❌ Erro na autorização:', error);
    res.send(`
      <h1>❌ Erro na Autorização</h1>
      <p>${error}</p>
      <p>Feche esta janela e tente novamente.</p>
    `);
    setTimeout(() => process.exit(1), 2000);
    return;
  }

  if (!code) {
    console.error('❌ Code não recebido');
    res.send(`
      <h1>❌ Erro</h1>
      <p>Code não recebido. Tente novamente.</p>
    `);
    setTimeout(() => process.exit(1), 2000);
    return;
  }

  console.log('✅ Code recebido:', code.substring(0, 20) + '...\n');
  console.log('🔄 Trocando code por access token...\n');

  try {
    // Trocar code por access token
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in, user_id } = response.data;

    console.log('✅ Tokens obtidos com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 COPIE ESTES VALORES PARA O .env:\n');
    console.log(`MELI_ACCESS_TOKEN=${access_token}`);
    console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ℹ️  Informações adicionais:');
    console.log(`   User ID: ${user_id}`);
    console.log(`   Expira em: ${expires_in} segundos (${expires_in / 3600} horas)`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Copie os tokens acima para backend/.env');
    console.log('   - O access_token expira em 6 horas');
    console.log('   - Use o refresh_token para renovar\n');

    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .success {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .code-block {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              padding: 15px;
              border-radius: 5px;
              font-family: monospace;
              font-size: 12px;
              overflow-x: auto;
            }
            h1 { color: #155724; }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeeba;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Tokens Obtidos com Sucesso!</h1>
            <p>Copie os valores abaixo para o arquivo <code>backend/.env</code></p>
          </div>
          
          <div class="code-block">
            <strong>MELI_ACCESS_TOKEN</strong>=${access_token}<br><br>
            <strong>MELI_REFRESH_TOKEN</strong>=${refresh_token}
          </div>

          <div class="warning">
            <strong>⚠️ IMPORTANTE:</strong>
            <ul>
              <li>O access_token expira em <strong>6 horas</strong></li>
              <li>Use o refresh_token para renovar</li>
              <li>Guarde estes tokens em local seguro</li>
            </ul>
          </div>

          <p><strong>Você pode fechar esta janela agora.</strong></p>
        </body>
      </html>
    `);

    // Fechar servidor após 5 segundos
    setTimeout(() => {
      console.log('🔚 Encerrando servidor...\n');
      server.close();
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Erro ao obter tokens:', error.response?.data || error.message);
    res.send(`
      <h1>❌ Erro ao Obter Tokens</h1>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
    `);
    setTimeout(() => process.exit(1), 2000);
  }
});

// Iniciar servidor
server = app.listen(3000, async () => {
  console.log('🌐 Servidor iniciado em http://localhost:3000\n');
  
  // Gerar URL de autorização
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  
  console.log('📋 URL de Autorização:');
  console.log(authUrl);
  console.log('\n🔄 Abrindo navegador...\n');
  console.log('ℹ️  Instruções:');
  console.log('   1. Faça login no Mercado Livre');
  console.log('   2. Autorize a aplicação');
  console.log('   3. Aguarde o redirecionamento');
  console.log('   4. Os tokens serão exibidos aqui\n');

  // Abrir navegador automaticamente
  try {
    await open(authUrl);
  } catch (error) {
    console.log('⚠️  Não foi possível abrir o navegador automaticamente.');
    console.log('   Copie a URL acima e cole no navegador.\n');
  }
});

// Timeout de 5 minutos
setTimeout(() => {
  console.log('\n⏱️  Timeout: Nenhuma resposta recebida em 5 minutos.');
  console.log('   Execute o script novamente.\n');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);

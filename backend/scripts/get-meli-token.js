// Script para obter Access Token do Mercado Livre
// Uso: node scripts/get-meli-token.js
// 
// O script pode usar:
// 1. Backend existente na porta 3000 (se estiver rodando)
// 2. Servidor temporário na porta 3001 (padrão)
// Você pode definir MELI_TOKEN_PORT no .env para usar outra porta.

import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import open from 'open';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PORT = process.env.MELI_TOKEN_PORT || 3001; // Porta diferente para evitar conflito

console.log('🔐 Obtendo Access Token do Mercado Livre\n');

// Função para ler input do usuário
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Função para buscar credenciais do banco ou .env
async function getMeliCredentials() {
  let CLIENT_ID = process.env.MELI_CLIENT_ID;
  let CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;

  // Tentar buscar do banco de dados (Admin Panel)
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('meli_client_id, meli_client_secret')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (!error && data) {
        if (data.meli_client_id) CLIENT_ID = data.meli_client_id;
        if (data.meli_client_secret) CLIENT_SECRET = data.meli_client_secret;
        
        if (CLIENT_ID && CLIENT_SECRET) {
          console.log('✅ Credenciais encontradas no banco de dados (Admin Panel)\n');
          return { CLIENT_ID, CLIENT_SECRET };
        }
      }
    }
  } catch (error) {
    // Ignorar erro e tentar .env
    console.log('ℹ️  Tentando buscar credenciais do .env...\n');
  }

  // Verificar se credenciais estão no .env
  if (CLIENT_ID && CLIENT_SECRET) {
    console.log('✅ Credenciais encontradas no .env\n');
    return { CLIENT_ID, CLIENT_SECRET };
  }

  // Se não encontrou em nenhum lugar
  console.error('❌ Erro: MELI_CLIENT_ID e MELI_CLIENT_SECRET não encontrados\n');
  console.error('Configure no Painel Admin (/settings > Aba "Mercado Livre") ou no arquivo .env:\n');
  console.error('MELI_CLIENT_ID=seu_client_id');
  console.error('MELI_CLIENT_SECRET=seu_client_secret\n');
  console.error('💡 Recomendação: Configure no Painel Admin para melhor gerenciamento.\n');
  process.exit(1);
}

// Função principal assíncrona
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 CONFIGURAÇÃO DO MERCADO LIVRE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Você precisa das seguintes informações do portal do Mercado Livre:');
  console.log('   1. Client ID (App ID)');
  console.log('   2. Client Secret (Secret Key)');
  console.log('   3. Redirect URI (configurado no portal)\n');
  console.log('💡 Onde obter: https://developers.mercadolivre.com.br\n');

  // Tentar buscar credenciais do banco ou .env primeiro
  let CLIENT_ID, CLIENT_SECRET;
  try {
    const credentials = await getMeliCredentials();
    CLIENT_ID = credentials.CLIENT_ID;
    CLIENT_SECRET = credentials.CLIENT_SECRET;
    console.log('✅ Credenciais encontradas automaticamente!\n');
    console.log('💡 Se quiser usar outras credenciais, você pode informá-las abaixo.\n');
  } catch (error) {
    // Se não encontrou, vai perguntar
    console.log('ℹ️  Credenciais não encontradas automaticamente. Vamos configurar agora.\n');
  }

  // Perguntar Client ID
  const clientIdInput = await askQuestion('📝 Cole seu Client ID (App ID): ');
  CLIENT_ID = clientIdInput.trim();
  
  if (!CLIENT_ID) {
    console.error('\n❌ Erro: Client ID não pode estar vazio.\n');
    process.exit(1);
  }

  // Perguntar Client Secret
  const clientSecretInput = await askQuestion('📝 Cole seu Client Secret (Secret Key): ');
  CLIENT_SECRET = clientSecretInput.trim();
  
  if (!CLIENT_SECRET) {
    console.error('\n❌ Erro: Client Secret não pode estar vazio.\n');
    process.exit(1);
  }

  // Perguntar Redirect URI
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 CONFIGURAÇÃO DO REDIRECT URI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  IMPORTANTE: O Redirect URI deve estar configurado no portal do Mercado Livre');
  console.log('   e deve corresponder EXATAMENTE ao que você vai informar abaixo.\n');
  console.log('💡 Exemplos de Redirect URI CORRETOS:');
  console.log('   - https://localhost:3001/auth/meli/callback  (HTTPS - se portal pedir)');
  console.log('   - http://localhost:3001/auth/meli/callback  (HTTP - geralmente funciona mesmo se pedir HTTPS)');
  console.log('   - https://seu-tunnel.ngrok.io/auth/meli/callback (ngrok - MELHOR para HTTPS)');
  console.log('   - https://seu-dominio.com/api/auth/meli/callback (produção)\n');
  console.log('❌ NÃO use sites externos como:');
  console.log('   - https://www.google.com');
  console.log('   - https://www.facebook.com');
  console.log('   - Qualquer site que você não controla\n');
  console.log('💡 DICA: Se o portal pedir HTTPS:');
  console.log('   1. Tente primeiro: http://localhost:3001/auth/meli/callback (muitas vezes funciona)');
  console.log('   2. Se não funcionar, use ngrok (recomendado):');
  console.log('      - Instale: npm install -g ngrok');
  console.log('      - Execute este script PRIMEIRO (vai iniciar servidor na porta 3001)');
  console.log('      - Em OUTRO terminal, execute: ngrok http 3001');
  console.log('      - Copie a URL HTTPS do ngrok (ex: https://abc123.ngrok.io)');
  console.log('      - Use como Redirect URI: https://abc123.ngrok.io/auth/meli/callback');
  console.log('      - Configure no portal do Mercado Livre');
  console.log('      - Mantenha AMBOS rodando (script + ngrok)\n');
  
  const redirectUriInput = await askQuestion('📝 Cole o Redirect URI configurado no portal do Mercado Livre: ');
  
  const REDIRECT_URI = redirectUriInput.trim();
  
  if (!REDIRECT_URI) {
    console.error('\n❌ Erro: Redirect URI não pode estar vazio.\n');
    process.exit(1);
  }

  // Validar formato básico de URL
  try {
    const redirectUrl = new URL(REDIRECT_URI);
    
    // Validar que não é um site externo (deve ser localhost ou seu próprio domínio)
    const isExternalSite = redirectUrl.hostname === 'www.google.com' || 
                          redirectUrl.hostname === 'google.com' ||
                          redirectUrl.hostname.includes('google') ||
                          redirectUrl.hostname.includes('facebook') ||
                          redirectUrl.hostname.includes('github');
    
    const isLocalhost = redirectUrl.hostname.includes('localhost') || 
                       redirectUrl.hostname.includes('127.0.0.1') ||
                       redirectUrl.hostname.includes('ngrok') ||
                       redirectUrl.hostname.includes('localtest.me');
    
    if (isExternalSite && !isLocalhost) {
      console.error('\n❌ ERRO: Redirect URI inválido!\n');
      console.error('⚠️  O Redirect URI NÃO pode ser um site externo como Google, Facebook, etc.');
      console.error('   Ele deve apontar para um servidor que VOCÊ controla.\n');
      console.error('✅ Exemplos CORRETOS de Redirect URI:');
      console.error('   - https://localhost:3001/auth/meli/callback (HTTPS local)');
      console.error('   - http://localhost:3001/auth/meli/callback (HTTP local)');
      console.error('   - https://seu-dominio.ngrok.io/auth/meli/callback (ngrok)');
      console.error('   - https://seu-dominio.com/api/auth/meli/callback (produção)\n');
      console.error('💡 IMPORTANTE:');
      console.error('   1. O Redirect URI deve estar configurado no portal do Mercado Livre');
      console.error('   2. O script vai iniciar um servidor local para receber o callback');
      console.error('   3. Se o portal pedir HTTPS, você pode usar:');
      console.error('      - https://localhost:3001 (pode dar aviso de certificado)');
      console.error('      - ngrok para criar um túnel HTTPS (recomendado)\n');
      process.exit(1);
    }

    // Avisar sobre HTTPS local
    if (redirectUrl.protocol === 'https:' && isLocalhost) {
      console.log('\n⚠️  AVISO: Você está usando HTTPS com localhost.');
      console.log('   Isso pode funcionar, mas o navegador pode mostrar aviso de certificado.');
      console.log('   Alternativa: Use ngrok para criar um túnel HTTPS seguro.\n');
    }
  } catch (error) {
    console.error('\n❌ Erro: Redirect URI inválido. Deve ser uma URL válida.\n');
    process.exit(1);
  }

  console.log('\n✅ Configurações recebidas:');
  console.log(`   Client ID: ${CLIENT_ID.substring(0, 10)}...`);
  console.log(`   Client Secret: ${CLIENT_SECRET.substring(0, 10)}...`);
  console.log(`   Redirect URI: ${REDIRECT_URI}\n`);

  // Verificar se o Redirect URI aponta para servidor externo (produção)
  let isExternalServer = false;
  try {
    const redirectUrl = new URL(REDIRECT_URI);
    const isLocalhost = redirectUrl.hostname === 'localhost' || 
                       redirectUrl.hostname === '127.0.0.1' ||
                       redirectUrl.hostname.includes('ngrok') ||
                       redirectUrl.hostname.includes('localtest.me');
    
    if (!isLocalhost) {
      isExternalServer = true;
      console.log('⚠️  AVISO: Redirect URI aponta para servidor externo (produção/staging)');
      console.log(`   Servidor: ${redirectUrl.hostname}`);
      console.log('   O callback será recebido pelo servidor externo, não pelo script local.\n');
      
      const useManual = await askQuestion('📝 Deseja processar o código manualmente? (s/n): ');
      if (useManual.toLowerCase() === 's' || useManual.toLowerCase() === 'sim') {
        console.log('\n📋 Instruções:');
        console.log('   1. Complete a autorização no navegador');
        console.log('   2. Após o redirecionamento, copie o código da URL');
        console.log('   3. O código está após "?code=" na URL\n');
        console.log('   Exemplo: jurus.vercel.app/auth/meli/callback?code=TG-693e0c5ad385730001553780-260114746');
        console.log('   Código: TG-693e0c5ad385730001553780-260114746\n');
        
        const codeInput = await askQuestion('📝 Cole o código de autorização: ');
        const code = codeInput.trim();
        
        if (!code) {
          console.error('\n❌ Código não pode estar vazio.\n');
          process.exit(1);
        }
        
        console.log('\n🔄 Trocando code por access token...\n');
        
        try {
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
          console.log('📋 COPIE ESTES VALORES:\n');
          console.log(`MELI_ACCESS_TOKEN=${access_token}`);
          console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('ℹ️  Informações:');
          console.log(`   User ID: ${user_id}`);
          console.log(`   Expira em: ${expires_in} segundos (${expires_in / 3600} horas)`);
          console.log('\n⚠️  IMPORTANTE:');
          console.log('   - Configure estes tokens no Painel Admin (/settings > Aba "Mercado Livre")');
          console.log('   - Ou copie para backend/.env como fallback\n');
          
          process.exit(0);
        } catch (error) {
          console.error('❌ Erro ao obter tokens:', error.response?.data || error.message);
          if (error.response?.data) {
            console.error('   Detalhes:', JSON.stringify(error.response.data, null, 2));
          }
          process.exit(1);
        }
      } else {
        console.log('\n⚠️  Você precisará processar o código manualmente no servidor de produção.');
        console.log('   Ou configure o Redirect URI para apontar para localhost/ngrok.\n');
        process.exit(0);
      }
    }
  } catch (e) {
    // Ignorar erro de parsing
  }

  // Extrair porta e path do redirect URI
  let serverPort = PORT;
  let callbackPath = '/auth/meli/callback';
  
  try {
    const redirectUrl = new URL(REDIRECT_URI);
    callbackPath = redirectUrl.pathname || '/auth/meli/callback';
    
    // Extrair porta do redirect URI
    if (redirectUrl.port) {
      serverPort = parseInt(redirectUrl.port);
    } else if (redirectUrl.protocol === 'http:') {
      serverPort = 80;
    } else if (redirectUrl.protocol === 'https:') {
      serverPort = 443;
    }
    
    // Se for localhost sem porta explícita, usar porta padrão
    if (redirectUrl.hostname === 'localhost' && !redirectUrl.port) {
      // Tentar extrair da URL ou usar padrão
      if (REDIRECT_URI.includes(':3000')) {
        serverPort = 3000;
      } else if (REDIRECT_URI.includes(':3001')) {
        serverPort = 3001;
      } else {
        serverPort = PORT;
      }
    }
  } catch (e) {
    console.log('⚠️  Não foi possível extrair porta do Redirect URI, usando porta padrão.\n');
  }

  console.log(`📡 Porta detectada: ${serverPort}`);
  console.log(`📡 Path do callback: ${callbackPath}\n`);

  // Verificar se backend está rodando na porta 3000
  let useBackend = false;
  if (serverPort === 3000) {
    try {
      const response = await axios.get(`http://localhost:3000/api/health`, { timeout: 2000 });
      if (response.data && response.data.success) {
        console.log('✅ Backend detectado na porta 3000!');
        console.log('   Usando backend existente (não será criado servidor temporário)\n');
        useBackend = true;
      }
    } catch (error) {
      console.log('⚠️  Backend não encontrado na porta 3000');
      console.log('   Criando servidor temporário...\n');
    }
  }

  // Se não usar backend, criar servidor temporário
  let app, server;
  if (!useBackend) {
    app = express();
    console.log(`📡 Servidor temporário será iniciado na porta: ${serverPort}\n`);
  }

  // Se usar servidor temporário, configurar middleware e rota
  if (!useBackend) {
    // Middleware para pular aviso do ngrok (se estiver usando)
    app.use((req, res, next) => {
      // Adicionar header para pular aviso do ngrok
      res.setHeader('ngrok-skip-browser-warning', 'true');
      next();
    });

    app.get(callbackPath, async (req, res) => {
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
        console.log('   - Configure estes tokens no Painel Admin (/settings > Aba "Mercado Livre")');
        console.log('   - Ou copie para backend/.env como fallback');
        console.log('   - O access_token expira em 6 horas');
        console.log('   - Use o refresh_token para renovar');
        console.log('   - O sistema renova automaticamente os tokens quando necessário\n');

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
                <p>Configure estes valores no <strong>Painel Admin</strong> em <code>/settings</code> > Aba "Mercado Livre"</p>
                <p>Ou copie para o arquivo <code>backend/.env</code> como fallback</p>
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

    // Iniciar servidor temporário na porta do redirect URI
    server = app.listen(serverPort, async (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Erro: Porta ${serverPort} já está em uso.`);
          console.error(`   Verifique se o Redirect URI está correto ou use outra porta.\n`);
          process.exit(1);
        }
        throw err;
      }

      console.log(`🌐 Servidor temporário iniciado na porta ${serverPort}`);
      console.log(`✅ Aguardando callback em: ${REDIRECT_URI}\n`);
    
      // Gerar URL de autorização
      const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      
      console.log('📋 URL de Autorização:');
      console.log(authUrl);
      console.log('\n🔄 Abrindo navegador...\n');
      console.log('ℹ️  Instruções:');
      console.log('   1. Faça login no Mercado Livre');
      console.log('   2. Autorize a aplicação');
      console.log('   3. Se aparecer página de aviso do ngrok, clique em "Visit Site"');
      console.log('   4. Aguarde o redirecionamento');
      console.log('   5. Os tokens serão exibidos aqui\n');

      // Abrir navegador automaticamente
      try {
        await open(authUrl);
      } catch (error) {
        console.log('⚠️  Não foi possível abrir o navegador automaticamente.');
        console.log('   Copie a URL acima e cole no navegador.\n');
      }

      // Timeout de 5 minutos
      setTimeout(() => {
        console.log('\n⏱️  Timeout: Nenhuma resposta recebida em 5 minutos.');
        console.log('   Execute o script novamente.\n');
        if (server) server.close();
        process.exit(1);
      }, 5 * 60 * 1000);
    });
  }
}

// Executar função principal
main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

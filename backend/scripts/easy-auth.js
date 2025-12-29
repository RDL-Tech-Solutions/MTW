// Script de Autenticação Fácil para Mercado Livre
// Usa credenciais fornecidas para facilitar o processo

import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import open from 'open';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config();

// SUAS CREDENCIAIS FIXAS
const CONFIG = {
    CLIENT_ID: '1016544593231768',
    CLIENT_SECRET: '2VA7yCY4fEPX7PWEvwG0rrq6N0qKzxfG',
    REDIRECT_URI: 'http://localhost:3001/auth/meli/callback', // Usando porta 3001 para não conflitar com backend
    PORT: 3001
};

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function startAuthServer() {
    console.log('\n' + '━'.repeat(60));
    console.log('🔐 AUTENTICAÇÃO FÁCIL DO MERCADO LIVRE');
    console.log('━'.repeat(60) + '\n');

    const app = express();

    // Rota de callback
    app.get('/auth/meli/callback', async (req, res) => {
        const { code, error } = req.query;

        if (error) {
            console.error(`❌ Erro recebido do ML: ${error}`);
            res.send(`<h1>Erro: ${error}</h1>`);
            setTimeout(() => process.exit(1), 2000);
            return;
        }

        if (!code) {
            res.send('<h1>Erro: Código não recebido</h1>');
            return;
        }

        console.log(`✅ Código recebido: ${code.substring(0, 10)}...`);
        console.log('🔄 Trocando por tokens...');

        res.write('<h1>Processando...</h1><p>Obtendo tokens...</p>');

        try {
            // Trocar código por token
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('client_id', CONFIG.CLIENT_ID);
            params.append('client_secret', CONFIG.CLIENT_SECRET);
            params.append('code', code);
            params.append('redirect_uri', CONFIG.REDIRECT_URI);

            const tokenResponse = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token, refresh_token, user_id, expires_in } = tokenResponse.data;

            console.log('✅ Tokens obtidos com sucesso!');

            // Salvar no banco
            if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
                console.log('💾 Salvando no banco de dados...');
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

                await supabase
                    .from('app_settings')
                    .update({
                        meli_client_id: CONFIG.CLIENT_ID,
                        meli_client_secret: CONFIG.CLIENT_SECRET,
                        meli_access_token: access_token,
                        meli_refresh_token: refresh_token,
                        meli_redirect_uri: CONFIG.REDIRECT_URI,
                        meli_user_id: user_id
                    })
                    .eq('id', '00000000-0000-0000-0000-000000000001');

                console.log('✅ Salvo no banco com sucesso!');
                res.write('<p>✅ Salvo no banco de dados!</p>');
            } else {
                console.log('⚠️ Supabase não configurado. Tokens exibidos abaixo.');
            }

            console.log('\n' + '━'.repeat(60));
            console.log('🎉 TUDO PRONTO! AUTENTICAÇÃO CONCLUÍDA');
            console.log('━'.repeat(60) + '\n');
            console.log(`Access Token: ${access_token.substring(0, 20)}...`);
            console.log(`Refresh Token: ${refresh_token.substring(0, 20)}...`);
            console.log('\nO sistema backend agora funcionará corretamente.');

            res.write(`
        <h1 style="color:green">✅ SUCESSO!</h1>
        <p>Autenticação concluída e salva no banco de dados.</p>
        <p>Você pode fechar esta janela.</p>
        <script>setTimeout(() => window.close(), 5000)</script>
      `);
            res.end();

            setTimeout(() => process.exit(0), 3000);

        } catch (err) {
            console.error('❌ Erro ao trocar token:', err.response?.data || err.message);
            res.write(`<h1 style="color:red">Erro</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
            res.end();
            // Não sair imediatamente para permitir leitura do erro
        }
    });

    // Iniciar servidor
    app.listen(CONFIG.PORT, async () => {
        console.log(`🌐 Servidor iniciado em http://localhost:${CONFIG.PORT}`);

        // Gerar URL de autorização
        const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}`;

        console.log('\n🚀 ABRINDO NAVEGADOR PARA AUTORIZAÇÃO...');
        console.log(`👉 ${authUrl}\n`);
        console.log('⚠️  IMPORTANTE: Se o navegador não abrir, copie o link acima.');
        console.log('⚠️  Certifique-se que o Redirect URI está configurado no portal do Mercado Livre:');
        console.log(`   ${CONFIG.REDIRECT_URI}\n`);

        try {
            await open(authUrl);
        } catch (e) {
            console.log('⚠️  Não foi possível abrir o navegador automaticamente.');
        }
    });
}

startAuthServer();

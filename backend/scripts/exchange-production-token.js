// Script para trocar código de autorização por tokens (PRODUÇÃO) - Á PROVA DE FALHAS
// Configurado para redirect_uri: https://api.precocerto.app/

import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import path from 'path';

// Carregar .env explicitamente
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const CONFIG = {
    CLIENT_ID: '1016544593231768',
    CLIENT_SECRET: '2VA7yCY4fEPX7PWEvwG0rrq6N0qKzxfG',
    REDIRECT_URI: 'https://api.precocerto.app/'
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function exchangeToken(code) {
    if (!code) {
        console.log(chalk.red('❌ Erro: Nenhum código fornecido.'));
        process.exit(1);
    }

    if (code.includes('code=')) {
        code = code.split('code=')[1].split('&')[0];
    }
    code = code.trim();

    console.log(chalk.blue('\n🔐 Trocando código por tokens...'));

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', CONFIG.CLIENT_ID);
        params.append('client_secret', CONFIG.CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', CONFIG.REDIRECT_URI);

        const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, user_id } = response.data;

        console.log(chalk.green('\n✅ SUCESSO! TOKENS OBTIDOS:'));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`MELI_ACCESS_TOKEN=${access_token}`);
        console.log(`MELI_REFRESH_TOKEN=${refresh_token}`);
        console.log(`MELI_USER_ID=${user_id}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Tentar salvar no banco
        if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
            console.log(chalk.blue('💾 Tentando salvar no banco...'));
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

            const { error } = await supabase
                .from('app_settings')
                .update({
                    meli_client_id: CONFIG.CLIENT_ID,
                    meli_client_secret: CONFIG.CLIENT_SECRET,
                    meli_access_token: access_token,
                    meli_refresh_token: refresh_token,
                    meli_redirect_uri: CONFIG.REDIRECT_URI,
                    meli_user_id: user_id.toString()
                })
                .eq('id', '00000000-0000-0000-0000-000000000001');

            if (error) {
                console.log(chalk.red(`❌ Erro ao salvar no banco: ${error.message}`));
                console.log(chalk.yellow('⚠️  COPIE OS TOKENS ACIMA E SALVE NO SEU ARQUIVO .ENV'));
            } else {
                console.log(chalk.green('✅ Salvo no banco com sucesso!'));
            }
        } else {
            console.log(chalk.yellow('⚠️ Supabase não configurado. COPIE OS TOKENS ACIMA.'));
        }

    } catch (error) {
        console.log(chalk.red('\n❌ Erro ao trocar token:'));
        console.log(error.response?.data || error.message);
    }
}

const codeArg = process.argv[2];
exchangeToken(codeArg);

import meliAuth from '../src/services/autoSync/meliAuth.js';
import AppSettings from '../src/models/AppSettings.js';
import logger from '../src/config/logger.js';

/**
 * Script para diagnosticar problema de autenticação do Mercado Livre
 */

async function diagnoseMeliAuth() {
    logger.info('🔍 Diagnóstico de Autenticação Mercado Livre\n');

    try {
        // 1. Verificar configurações no banco
        logger.info('📊 1. Verificando configurações no banco de dados...');
        const config = await AppSettings.getMeliConfig();

        logger.info('   Configurações encontradas:');
        logger.info(`   - Client ID: ${config.clientId ? '✅ PRESENTE (' + config.clientId.substring(0, 15) + '...)' : '❌ AUSENTE'}`);
        logger.info(`   - Client Secret: ${config.clientSecret ? '✅ PRESENTE (' + config.clientSecret.substring(0, 10) + '...)' : '❌ AUSENTE'}`);
        logger.info(`   - Access Token: ${config.accessToken ? '✅ PRESENTE (' + config.accessToken.substring(0, 20) + '...)' : '❌ AUSENTE'}`);
        logger.info(`   - Refresh Token: ${config.refreshToken ? '✅ PRESENTE (' + config.refreshToken.substring(0, 20) + '...)' : '❌ AUSENTE'}`);
        logger.info(`   - Redirect URI: ${config.redirectUri || '❌ AUSENTE'}`);
        logger.info(`   - Affiliate Code: ${config.affiliateCode || '❌ AUSENTE'}\n`);

        // 2. Verificar se meliAuth está configurado
        logger.info('🔑 2. Verificando meliAuth...');
        const isConfigured = meliAuth.isConfigured();
        logger.info(`   Status: ${isConfigured ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}\n`);

        // 3. Tentar obter access token
        logger.info('🎫 3. Tentando obter access token...');
        try {
            const token = await meliAuth.getAccessToken();
            logger.info(`   ✅ Token obtido com sucesso!`);
            logger.info(`   Token: ${token.substring(0, 30)}...\n`);

            // 4. Testar token fazendo uma requisição à API
            logger.info('🧪 4. Testando token com requisição à API...');
            const axios = (await import('axios')).default;

            try {
                const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
                    params: {
                        q: 'notebook',
                        limit: 5
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });

                logger.info(`   ✅ API respondeu com sucesso!`);
                logger.info(`   Produtos encontrados: ${response.data.results?.length || 0}\n`);

            } catch (apiError) {
                const status = apiError.response?.status;
                const errorData = apiError.response?.data;

                logger.error(`   ❌ Erro na API: ${status}`);
                logger.error(`   Mensagem: ${errorData?.message || apiError.message}`);
                logger.error(`   Detalhes:`, JSON.stringify(errorData, null, 2));

                if (status === 403) {
                    logger.error('\n   💡 Possíveis causas do erro 403:');
                    logger.error('      1. Token não tem os scopes necessários');
                    logger.error('      2. IP não está na lista permitida da aplicação');
                    logger.error('      3. Aplicação está bloqueada ou desabilitada');
                    logger.error('      4. Token pertence a outro usuário/seller');
                }
            }

        } catch (tokenError) {
            logger.error(`   ❌ Erro ao obter token: ${tokenError.message}\n`);

            if (tokenError.message.includes('Refresh token')) {
                logger.error('   💡 O refresh token pode estar expirado ou inválido.');
                logger.error('   💡 Refresh tokens do ML expiram após 6 meses de inatividade.');
                logger.error('   💡 Cada refresh token só pode ser usado UMA vez.\n');
            }
        }

        // 5. Resumo
        logger.info('📋 RESUMO DO DIAGNÓSTICO:');
        logger.info('═══════════════════════════════════════════════════════════');

        const hasClientId = !!config.clientId;
        const hasClientSecret = !!config.clientSecret;
        const hasRefreshToken = !!config.refreshToken;

        if (!hasClientId || !hasClientSecret) {
            logger.error('❌ PROBLEMA: Credenciais básicas (Client ID/Secret) ausentes');
            logger.info('   SOLUÇÃO: Configure as credenciais em /settings > Mercado Livre');
        } else if (!hasRefreshToken) {
            logger.warn('⚠️ AVISO: Refresh token ausente');
            logger.info('   IMPACTO: Sistema usará Client Credentials (acesso limitado)');
            logger.info('   SOLUÇÃO: Faça autenticação OAuth em /settings > Mercado Livre');
        } else {
            logger.info('✅ Credenciais presentes no banco de dados');
            logger.info('   Se ainda há erro 403, verifique:');
            logger.info('   - Scopes da aplicação no DevCenter do Mercado Livre');
            logger.info('   - Lista de IPs permitidos');
            logger.info('   - Status da aplicação (ativa/bloqueada)');
        }

    } catch (error) {
        logger.error(`\n❌ ERRO CRÍTICO: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
    }
}

// Executar diagnóstico
diagnoseMeliAuth().then(() => {
    logger.info('\n🏁 Diagnóstico concluído\n');
    process.exit(0);
}).catch(error => {
    logger.error(`\n❌ Erro fatal: ${error.message}`);
    process.exit(1);
});

import BotConfig from './src/models/BotConfig.js';

async function checkConfig() {
    try {
        const config = await BotConfig.get();
        console.log('--- CONFIGURAÇÃO ATUAL NO BANCO ---');
        console.log(`URL: ${config.whatsapp_api_url}`);
        console.log(`Phone ID: ${config.whatsapp_phone_number_id}`);
        console.log(`Token: ${config.whatsapp_api_token ? (config.whatsapp_api_token.substring(0, 10) + '...') : 'NULO'}`);
        console.log('-----------------------------------');
    } catch (error) {
        console.error('Erro ao buscar config:', error.message);
    }
}

checkConfig();

import 'dotenv/config';
import mongoose from 'mongoose';
import BotConfig from './src/models/BotConfig.js';
import BotChannel from './src/models/BotChannel.js';
import whatsappService from './src/services/bots/whatsappService.js';
import logger from './src/config/logger.js';

// Conectar ao MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error);
        process.exit(1);
    }
};

const runTest = async () => {
    await connectDB();

    try {
        console.log('🔍 Carregando configurações...');
        const config = await BotConfig.get();
        console.log('📱 Configurações WhatsApp:', {
            url: config.whatsapp_api_url,
            phoneId: config.whatsapp_phone_number_id,
            hasToken: !!config.whatsapp_api_token
        });

        console.log('🔍 Buscando canais WhatsApp ativos...');
        const channels = await BotChannel.find({ platform: 'whatsapp', is_active: true });
        console.log(`📋 Encontrados ${channels.length} canais ativos.`);

        if (channels.length === 0) {
            console.error('❌ Nenhum canal WhatsApp ativo encontrado!');
            process.exit(1);
        }

        const channel = channels[0];
        console.log(`🧪 Testando envio para canal: ${channel.name} (${channel.identifier})`);

        // Teste de texto simples
        console.log('📨 Enviando mensagem de teste...');
        const result = await whatsappService.sendMessage(channel.identifier, '*Teste de Diagnóstico* - Sistema de Publicação');

        console.log('✅ Resultado:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ FALHA NO TESTE:');
        console.error(error);
        if (error.response) {
            console.error('📦 Dados da resposta:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runTest();

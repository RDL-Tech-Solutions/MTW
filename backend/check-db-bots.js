import 'dotenv/config';
import mongoose from 'mongoose';
import BotChannel from './src/models/BotChannel.js';
import BotConfig from './src/models/BotConfig.js';

const checkChannels = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');

        const botConfig = await BotConfig.get();
        console.log('\n📱 Configuração Global WhatsApp:', {
            enabled: botConfig.whatsapp_enabled,
            has_token: !!botConfig.whatsapp_api_token,
            has_phone: !!botConfig.whatsapp_phone_number_id
        });

        const channels = await BotChannel.findAll({ platform: 'whatsapp' });
        console.log('\n📋 Canais WhatsApp:');
        channels.forEach(c => {
            console.log(`- [${c.is_active ? 'ATIVO ' : 'INATIVO'}] ${c.name} (${c.identifier})`);
            console.log(`  Filters: no_coupons=${c.no_coupons}, only_coupons=${c.only_coupons}, cats=${JSON.stringify(c.category_filter)}`);
        });

        const telegramChannels = await BotChannel.findAll({ platform: 'telegram' });
        console.log('\n📋 Canais Telegram:');
        telegramChannels.forEach(c => {
            console.log(`- [${c.is_active ? 'ATIVO ' : 'INATIVO'}] ${c.name} (${c.identifier})`);
        });

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

checkChannels();

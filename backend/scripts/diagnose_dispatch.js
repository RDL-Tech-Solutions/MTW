
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import BotChannel from '../src/models/BotChannel.js';
import notificationDispatcher from '../src/services/bots/notificationDispatcher.js';
import logger from '../src/config/logger.js';

async function runDiagnosis() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DE DISPATCHER (WHATSAPP WEB)');
    console.log('====================================================');

    try {
        // 0. Verificar Configuração Global
        console.log('\n⚙️ 0. Verificando Configuração Global (BotConfig)...');
        const BotConfig = (await import('../src/models/BotConfig.js')).default;
        const botConfig = await BotConfig.get();
        // console.log(`   WhatsApp Enabled: ${botConfig.whatsapp_enabled}`); // Deprecated
        console.log(`   WhatsApp Web Enabled: ${botConfig.whatsapp_web_enabled}`);
        console.log(`   Telegram Enabled: ${botConfig.telegram_enabled}`);

        // 1. Verificar Canais Ativos
        console.log('\n📊 1. Verificando Canais Ativos no Banco de Dados...');
        const channels = await BotChannel.findActive();
        console.log(`   Encontrados ${channels.length} canais ativos.`);

        const whatsappChannels = channels.filter(c => c.platform === 'whatsapp' || c.platform === 'whatsapp_web');
        console.log(`   WhatsApp (Cloud/Web): ${whatsappChannels.length} canais.`);

        whatsappChannels.forEach(c => {
            console.log(`   - [${c.id}] ${c.name} (${c.platform}) -> Identifier: ${c.identifier}`);
            console.log(`     Config: OnlyCoupons=${c.only_coupons}, NoCoupons=${c.no_coupons}, Active=${c.is_active}`);
            console.log(`     PlatformFilter: ${JSON.stringify(c.platform_filter)}`);
            console.log(`     CategoryFilter: ${JSON.stringify(c.category_filter)}`);
            if (c.content_filter) console.log(`     ContentFilter: ${JSON.stringify(c.content_filter)}`);
        });

        if (whatsappChannels.length === 0) {
            console.error('❌ ERRO CRÍTICO: Nenhum canal WhatsApp ativo encontrado!');
            console.log('   Solução: Adicione um registro na tabela `bot_channels` com platform="whatsapp_web" ou "whatsapp".');
            // process.exit(1);
        }

        // 2. Simular Dispatch de Cupom
        console.log('\n📨 2. Simulando Dispatch de Cupom (Teste Seco)...');

        const mockCoupon = {
            id: 'diag-coupon-' + Date.now(),
            code: 'TESTE-DIAG',
            discount_value: 10,
            discount_type: 'percentage',
            platform: 'amazon',
            category_id: 'b478b692-84df-4281-b20f-2722d8f1d356', // ID fixo para passar no filtro
            is_general: true,
            valid_until: new Date(Date.now() + 86400000).toISOString(), // +1 dia
            affiliate_link: 'https://amzn.to/teste',
            image_url: null // Forçar uso de logo
        };

        console.log('   Enviando cupom para dispatcher...');

        try {
            const result = await notificationDispatcher.dispatch('coupon_new', mockCoupon, { manual: true });
            console.log('   Resultado do Dispatch:', JSON.stringify(result, null, 2));

            if (result.success && result.results.total > 0) {
                const wbResults = result.results.details.filter(d => d.platform === 'whatsapp' || d.platform === 'whatsapp_web');
                if (wbResults.length > 0) {
                    console.log('   ✅ Dispatcher tentou enviar para WhatsApp!');
                    wbResults.forEach(r => {
                        console.log(`     - Canal ${r.channelId}: Sucesso=${r.success} ${r.error ? '(Erro: ' + r.error + ')' : ''}`);
                    });
                } else {
                    console.log('   ⚠️ Dispatcher rodou, mas nenhum canal WhatsApp foi selecionado (Filtrado?).');
                }
            } else {
                console.log('   ❌ Dispatch falhou ou nenhum canal selecionado.');
                console.log('   Motivo:', result.message || result);
            }

        } catch (err) {
            console.error('   ❌ Erro ao chamar dispatch:', err);
        }

    } catch (error) {
        console.error('❌ Erro geral no diagnóstico:', error);
    } finally {
        console.log('\n====================================================');
        console.log('🏁 Diagnóstico concluído.');
        process.exit(0);
    }
}

runDiagnosis();

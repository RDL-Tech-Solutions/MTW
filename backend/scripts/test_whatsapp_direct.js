import client from '../src/services/whatsappWeb/client.js';
import whatsappWebService from '../src/services/whatsappWeb/whatsappWebService.js';
import { supabase } from '../src/config/database.js';

// ID do canal WhatsApp Web encontrado no diagnóstico
// [whatsapp_web] PrecoCerto Gamer (ID: 4a2d4790...) | Recipient: 120363405400556600@newsletter
// [whatsapp_web] PrecoCerto (ID: 20d23b2b...) | Recipient: 120363423394638237@newsletter

const TARGET_CHANNEL_ID = '120363423394638237@newsletter'; // Usando o PrecoCerto principal para teste

async function testDispatch() {
    console.log('🚀 Iniciando Teste de Disparo Direto WhatsApp Web...');

    try {
        console.log('🔄 Inicializando Cliente WhatsApp...');
        await client.initialize();

        // Aguardar evento 'ready' via polling simples de estado, já que initialize é async mas pode demorar
        // Na verdade client.initialize() do wwebjs resolve quando o navegador abre, mas o QR/Auth pode demorar.
        // O client.js tem listeners. Vamos monitorar logs ou esperar um pouco.

        console.log('⏳ Aguardando 15 segundos para conexão...');
        await new Promise(resolve => setTimeout(resolve, 15000));

        const info = client.client.info;
        if (!info) {
            console.warn('⚠️ Cliente parece não estar conectado (client.info indefinido). Tentando enviar mesmo assim...');
        } else {
            console.log(`✅ Cliente Conectado: ${info.pushname} (${info.wid.user})`);
        }

        const message = `🤖 *Teste de Diagnóstico*\n\nVerificando conectividade do agendador.\nHorário: ${new Date().toLocaleString()}`;

        console.log(`📤 Enviando mensagem para: ${TARGET_CHANNEL_ID}`);
        console.log(`📝 Conteúdo: "${message}"`);

        // Tentar enviar Texto
        const textResult = await whatsappWebService.sendMessage(TARGET_CHANNEL_ID, message);
        console.log('👉 Resultado Texto:', textResult);

        // Tentar enviar Imagem (Placeholder)
        // const imgResult = await whatsappWebService.sendImage(TARGET_CHANNEL_ID, 'https://via.placeholder.com/300', 'Teste Imagem');
        // console.log('👉 Resultado Imagem:', imgResult);

        console.log('✅ Teste concluído.');

        // Não fechar imediatamente para garantir envio
        setTimeout(() => process.exit(0), 5000);

    } catch (error) {
        console.error('❌ Erro Fatal no Teste:', error);
        process.exit(1);
    }
}

testDispatch();

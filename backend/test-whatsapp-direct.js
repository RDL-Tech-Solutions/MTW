/**
 * Teste direto da API do WhatsApp para enviar imagem
 * Busca configurações do banco de dados
 */

import axios from 'axios';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Conectar ao banco
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function testDirectWhatsAppImage() {
    try {
        console.log('🧪 Teste Direto da API do WhatsApp\n');

        // Buscar configurações do banco
        const [config] = await sequelize.query(`
      SELECT whatsapp_api_url, whatsapp_api_token, whatsapp_phone_number_id
      FROM bot_configs
      LIMIT 1
    `);

        if (!config || config.length === 0) {
            console.error('❌ Configurações do WhatsApp não encontradas no banco de dados');
            return;
        }

        const WHATSAPP_API_URL = config[0].whatsapp_api_url;
        const WHATSAPP_PHONE_NUMBER_ID = config[0].whatsapp_phone_number_id;
        const WHATSAPP_API_TOKEN = config[0].whatsapp_api_token;

        // Buscar um canal WhatsApp ativo
        const [channels] = await sequelize.query(`
      SELECT identifier
      FROM bot_channels
      WHERE platform = 'whatsapp' AND active = true
      LIMIT 1
    `);

        if (!channels || channels.length === 0) {
            console.error('❌ Nenhum canal WhatsApp ativo encontrado');
            return;
        }

        const TEST_NUMBER = channels[0].identifier;

        console.log(`📱 Número de teste: ${TEST_NUMBER}`);
        console.log(`🔗 API URL: ${WHATSAPP_API_URL}`);
        console.log(`📞 Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}\n`);

        // Imagem de teste do Mercado Livre (WebP)
        const testImageUrl = 'https://http2.mlstatic.com/D_Q_NP_2X_913663-MLA99951896463_112025-E.webp';

        console.log(`📸 Enviando imagem de teste...`);
        console.log(`   URL: ${testImageUrl}\n`);

        // Payload para enviar imagem
        const imagePayload = {
            messaging_product: 'whatsapp',
            to: TEST_NUMBER,
            type: 'image',
            image: {
                link: testImageUrl
            }
        };

        console.log('📋 Payload da imagem:');
        console.log(JSON.stringify(imagePayload, null, 2));
        console.log('');

        // Enviar imagem
        const imageResponse = await axios.post(
            `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            imagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log('✅ Resposta da API (Imagem):');
        console.log(JSON.stringify(imageResponse.data, null, 2));
        console.log('');

        const imageMessageId = imageResponse.data.messages?.[0]?.id;
        console.log(`📬 Message ID da imagem: ${imageMessageId}\n`);

        // Aguardar 2 segundos
        console.log('⏳ Aguardando 2 segundos...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Enviar mensagem de texto
        console.log('📤 Enviando mensagem de texto...\n');

        const textPayload = {
            messaging_product: 'whatsapp',
            to: TEST_NUMBER,
            type: 'text',
            text: {
                body: '🧪 *TESTE DE IMAGEM*\n\nSe você recebeu a imagem acima, o sistema está funcionando corretamente! ✅'
            }
        };

        const textResponse = await axios.post(
            `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            textPayload,
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log('✅ Resposta da API (Texto):');
        console.log(JSON.stringify(textResponse.data, null, 2));
        console.log('');

        const textMessageId = textResponse.data.messages?.[0]?.id;
        console.log(`📬 Message ID do texto: ${textMessageId}\n`);

        console.log('='.repeat(70));
        console.log('\n✅ TESTE CONCLUÍDO!\n');
        console.log('📱 Verifique seu WhatsApp agora:');
        console.log('   1. Você deve ter recebido UMA IMAGEM');
        console.log('   2. Seguida de UMA MENSAGEM DE TEXTO');
        console.log('');
        console.log('Se você recebeu ambos:');
        console.log('   ✅ A API do WhatsApp está funcionando corretamente');
        console.log('   ❌ O problema está no código do nosso sistema');
        console.log('');
        console.log('Se você NÃO recebeu a imagem:');
        console.log('   ❌ O problema está na configuração do WhatsApp ou na URL da imagem');
        console.log('   💡 Possíveis causas:');
        console.log('      - Número não está salvo nos contatos');
        console.log('      - Janela de 24h fechada');
        console.log('      - WhatsApp bloqueou o número');
        console.log('      - URL da imagem não é acessível pelo WhatsApp');
        console.log('      - Meta precisa aprovar o número para enviar imagens');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE:');
        console.error(`   Mensagem: ${error.message}`);

        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        if (error.stack) {
            console.error(`\n   Stack: ${error.stack}`);
        }
    } finally {
        await sequelize.close();
    }
}

// Executar
testDirectWhatsAppImage();

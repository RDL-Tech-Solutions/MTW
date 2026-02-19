
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Mock do Contexto e Telegraf
const mockCtx = {
    session: {
        ai_context: {}
    },
    message: {
        text: 'Teste unitário',
        photo: []
    },
    reply: async (msg) => console.log('🤖 BOT REPLY:', msg),
    replyWithPhoto: async (url, opts) => console.log('🤖 BOT REPLY PHOTO:', url, opts),
    replyWithChatAction: async (action) => console.log('🤖 BOT ACTION:', action),
    answerCallbackQuery: async (msg) => console.log('🤖 BOT ANSWER CALLBACK:', msg),
    editMessageReplyMarkup: async (markup) => console.log('🤖 BOT EDIT MARKUP:', markup),
    api: {
        getFileLink: async () => ({ href: 'http://mock.url/image.jpg' })
    }
};

// Importar serviço real (mas vamos mockar dependências se preciso)
// Como é difícil mockar tudo em ESM sem framework de teste, 
// vamos instanciar o serviço e chamar o executor de ação diretamente.

import { fileURLToPath as urlToPath } from 'url';
const AiServiceClass = (await import('../src/services/adminBot/services/aiService.js')).default;

// Criar instância (o default export é uma classe não instanciada no arquivo original? 
// Não, o arquivo original exporta a CLASSE? Não, ele exporta "new AiService()" no final?
// Vamos checar o arquivo original.
// O arquivo original termina com `class AiService ...` mas não vi o export default new.
// Ah, não vi o final do arquivo. Assumindo que exporta a classe ou instância.
// Se for classe: const aiService = new AiServiceClass();
// Se for instância: const aiService = AiServiceClass;

async function runTest() {
    console.log('🧪 INICIANDO TESTES DO IA ADVANCED (SIMULAÇÃO)');

    // Hack: Precisamos saber como o arquivo exporta.
    // Olhando o código anterior: `class AiService { ... }` 
    // Usually it exports `export default new AiService();` or `export default AiService;`
    // Vamos assumir instância para facilitar. Se falhar, ajustamos.

    let aiService;
    try {
        const module = await import('../src/services/adminBot/services/aiService.js');
        if (typeof module.default === 'function') {
            aiService = new module.default();
        } else {
            aiService = module.default;
        }
    } catch (e) {
        console.error('Erro ao importar serviço:', e);
        return;
    }

    // TESTE 1: capture_product
    console.log('\n--- TESTE 1: capture_product ---');
    // Usar uma URL real que o linkAnalyzer suporte? Ou mock LinkAnalyzer?
    // LinkAnalyzer faz request HTTP real. Vamos tentar uma URL Amazon real ou uma que falhe mas teste o fluxo.
    // Usar um link da Amazon genérico.
    try {
        await aiService.executeAction(mockCtx, {
            action: 'capture_product',
            parameters: { url: 'https://www.amazon.com.br/dp/B07589D5TP' },
            message: 'Capturando produto...'
        });
    } catch (e) {
        console.log('Erro esperado se linkAnalyzer falhar (normal em teste sem rede/mock):', e.message);
    }

    // TESTE 2: create_coupon
    console.log('\n--- TESTE 2: create_coupon ---');
    await aiService.executeAction(mockCtx, {
        action: 'create_coupon',
        parameters: {
            code: 'TESTE-AI-ADVANCED-PROD',
            discount_value: 15,
            discount_type: 'percentage',
            platform: 'amazon',
            valid_until: new Date(Date.now() + 86400000).toISOString()
        },
        message: 'Criando cupom teste de produção...'
    });
}
runTest();

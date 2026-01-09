import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class TrendHunter {
    /**
     * Buscar palavras-chave de tendência para uma plataforma
     * @param {string} platform - 'mercadolivre', 'shopee', 'amazon', 'aliexpress'
     * @returns {Promise<string>} - String com keywords separadas por vírgula
     */
    async generateTrendingKeywords(platform) {
        try {
            logger.info(`🤖 TrendHunter: Buscando tendências atuais para ${platform}...`);

            // Verificar se IA está habilitada
            const aiConfig = await openrouterClient.getConfig();
            if (!aiConfig.enabled || !aiConfig.apiKey) {
                logger.warn('⚠️ IA não habilitada. TrendHunter indisponível.');
                return '';
            }

            // Ajustar contexto por plataforma
            let platformContext = '';
            switch (platform) {
                case 'mercadolivre':
                    platformContext = 'Foque em eletrônicos, celulares, ferramentas e autopeças.';
                    break;
                case 'shopee':
                    platformContext = 'Foque em moda, acessórios, beleza, casa e decoração e produtos virais do TikTok.';
                    break;
                case 'amazon':
                    platformContext = 'Foque em livros, dispositivos Amazon (Kindle/Echo), eletrônicos premium e casa inteligente.';
                    break;
                case 'aliexpress':
                    platformContext = 'Foque em tecnologia chinesa, gadgets inovadores, componentes de PC e produtos "choice".';
                    break;
                default:
                    platformContext = 'Foque em produtos gerais de alta demanda no Brasil.';
            }

            const prompt = `
Você é um especialista em e-commerce e tendências de consumo no Brasil.
Sua missão é gerar uma lista de TERMOS DE BUSCA (Keywords) para encontrar produtos "quentes", promoções e erros de preço na plataforma ${platform}.

CONTEXTO DA PLATAFORMA:
${platformContext}

OBJETIVO:
Encontrar produtos com alto potencial viral, descontos agressivos ("bugs de preço") ou lançamentos muito procurados HOJE.

TAREFA:
Retorne APENAS um JSON com um array de 10 strings.
As strings devem ser termos de busca específicos (ex: "iPhone 15 Pro Max", "Air Fryer Mondial", "Vestido Festa Longo").
Evite termos muito genéricos como "celular" ou "roupa". Seja específico.

EXEMPLO DE RESPOSTA VALIDA:
{
  "keywords": ["Redmi Note 13", "Fone Bluetooth Lenovo", "Cadeira Gamer", "Microfone Lapela Sem Fio", "Projetor Hy300", "Bolsa Viagem Impermeável", "Smartwatch W29 Pro", "Kit Ferramentas 150 Peças", "Tênis Esportivo", "Drone 4k Profissional"]
}

Retorne APENAS o JSON:
`;

            // Fazer requisição
            const response = await openrouterClient.makeRequest(prompt);

            if (!response || !Array.isArray(response.keywords)) {
                throw new Error('Resposta inválida do TrendHunter');
            }

            const keywords = response.keywords.join(', ');
            logger.info(`🔥 TrendHunter encontrou: ${keywords}`);

            return keywords;

        } catch (error) {
            logger.error(`❌ Erro no TrendHunter: ${error.message}`);
            return '';
        }
    }
}

export default new TrendHunter();

import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class SchedulerAI {
    /**
     * Determinar o horário ótimo de publicação
     * @param {Object} product - Produto a ser agendado
     * @returns {Promise<{scheduled_at: Date, reason: string}>}
     */
    async determineOptimalTime(product) {
        try {
            const now = new Date();

            // Verificar se IA está habilitada
            const aiConfig = await openrouterClient.getConfig();
            if (!aiConfig.enabled || !aiConfig.apiKey) {
                logger.warn('⚠️ IA não habilitada. Usando fallback de horário.');
                return null;
            }

            // Preparar contexto para o prompt
            const productName = (product.name || '').substring(0, 100);
            const category = (product.category || product.ai_detected_category_id || 'Ofertas Gerais');
            const currentTime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            const prompt = `
Você é um estrategista de mídia social especializado em e-commerce no Brasil.
Sua missão é determinar o MELHOR HORÁRIO nas próximas 24 horas para postar uma oferta no Telegram e WhatsApp para maximizar cliques e vendas.

PRODUTO:
- Nome: ${productName}
- Categoria: ${category}
- Preço: R$ ${product.current_price || 'N/A'}

CONTEXTO ATUAL:
- Hora Agora (Brasil): ${currentTime}
- Dia da Semana: ${now.toLocaleDateString('pt-BR', { weekday: 'long' })}

COMPORTAMENTO DO CONSUMIDOR BRASILEIRO:
- Eletrônicos/Games: Alta conversão à noite (19h-22h) e almoço (12h-13h).
- Casa/Moda: Bom desempenho pela manhã (09h-11h) e finais de semana.
- Ofertas Relâmpago/Alimentos: Horários de pico de fome ou impulso (11h, 17h).
- Evitar madrugada (00h-06h) exceto bugs de preço.

TAREFA:
Retorne um JSON com o horário sugerido (formato ISO 8601) e a razão.
O horário deve ser NO FUTURO, entre ${now.toISOString()} e 24h depois.
Adicione pelo menos 10 minutos de margem do horário atual.

FORMATO RESPOSTA (APENAS JSON):
{
  "scheduled_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "reason": "Explicação estratégica curta (max 1 frase)"
}
`;

            // Fazer requisição
            const response = await openrouterClient.makeRequest(prompt);

            if (!response || !response.scheduled_at) {
                throw new Error('Resposta inválida da IA para agendamento');
            }

            // Validar data
            const scheduledDate = new Date(response.scheduled_at);
            if (isNaN(scheduledDate.getTime())) {
                throw new Error('Data inválida retornada pela IA');
            }

            // Garantir que é no futuro (mínimo 5 min)
            const minTime = new Date(now.getTime() + 5 * 60000);
            if (scheduledDate < minTime) {
                logger.warn(`⚠️ IA sugeriu horário no passado/muito próximo (${scheduledDate}). Ajustando para +15 min.`);
                scheduledDate.setTime(now.getTime() + 15 * 60000);
            }

            logger.info(`🤖 IA agendou para: ${scheduledDate.toLocaleString()} | Motivo: ${response.reason}`);

            return {
                scheduled_at: scheduledDate,
                reason: response.reason
            };

        } catch (error) {
            logger.error(`❌ Erro no SchedulerAI: ${error.message}`);
            return null; // Retorna null para usar fallback determinístico
        }
    }
}

export default new SchedulerAI();

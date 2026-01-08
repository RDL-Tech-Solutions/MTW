import logger from '../config/logger.js';
import axios from 'axios';
import AppSettings from '../models/AppSettings.js';
import AIModelStatus from '../models/AIModelStatus.js';
import { OPENROUTER_MODELS } from '../config/openrouterModels.js';

class AIController {
    /**
     * Obter status atual dos modelos
     */
    async getModelStatus(req, res) {
        try {
            const statusList = await AIModelStatus.getAll();
            const lastTest = await AIModelStatus.getLastTestDate();

            return res.json({
                success: true,
                lastTest,
                models: statusList,
                canTest: this.checkCanTest(lastTest)
            });
        } catch (error) {
            logger.error(`Erro ao obter status dos modelos: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Executar teste de disponibilidade dos modelos
     */
    async testModels(req, res) {
        try {
            const lastTest = await AIModelStatus.getLastTestDate();

            // Restrição de 1x ao dia
            if (!this.checkCanTest(lastTest) && !req.body.force) {
                return res.status(429).json({
                    success: false,
                    error: 'O teste de modelos só pode ser realizado uma vez a cada 24 horas.'
                });
            }

            const settings = await AppSettings.get();
            const apiKey = settings.openrouter_api_key || process.env.OPENROUTER_API_KEY;

            if (!apiKey) {
                return res.status(400).json({
                    success: false,
                    error: 'API Key do OpenRouter não configurada.'
                });
            }

            logger.info('🚀 Iniciando teste diário de disponibilidade dos modelos de IA...');

            const results = [];
            const testPromises = OPENROUTER_MODELS.map(async (model) => {
                const start = Date.now();
                let status = 'offline';
                let errorMessage = null;
                let latency = null;

                try {
                    const response = await axios.post(
                        'https://openrouter.ai/api/v1/chat/completions',
                        {
                            model: model.id,
                            messages: [{ role: 'user', content: 'respond with OK' }],
                            max_tokens: 5,
                            temperature: 0
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000 // 10 segundos por modelo
                        }
                    );

                    if (response.data && response.data.choices) {
                        status = 'online';
                        latency = Date.now() - start;
                    } else {
                        status = 'error';
                        errorMessage = 'Resposta inválida da API';
                    }
                } catch (error) {
                    status = 'offline';
                    errorMessage = error.response?.data?.error?.message || error.message;
                    latency = Date.now() - start;
                    logger.warn(`⚠️ Modelo ${model.id} está OFFLINE: ${errorMessage}`);
                }

                const data = {
                    status,
                    error_message: errorMessage,
                    latency_ms: latency
                };

                await AIModelStatus.updateStatus(model.id, data);
                return { model_id: model.id, ...data };
            });

            // Executar testes (em grupos de 3 para não estourar rate limit)
            const testResults = await this.runInChunks(testPromises, 3);

            logger.info('✅ Teste de disponibilidade concluído.');

            return res.json({
                success: true,
                results: testResults,
                lastTest: new Date()
            });
        } catch (error) {
            logger.error(`❌ Erro no teste de modelos: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Verifica se pode testar novamente (24h de intervalo)
     */
    checkCanTest(lastTestDate) {
        if (!lastTestDate) return true;
        const now = new Date();
        const diff = now - lastTestDate;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        return diff >= twentyFourHours;
    }

    /**
     * Auxiliar para rodar promises em chunks
     */
    async runInChunks(promises, hunkSize) {
        const results = [];
        for (let i = 0; i < promises.length; i += hunkSize) {
            const chunk = promises.slice(i, i + hunkSize);
            const chunkResults = await Promise.all(chunk);
            results.push(...chunkResults);
            // Pequeno delay entre chunks
            if (i + hunkSize < promises.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }
}

export default new AIController();

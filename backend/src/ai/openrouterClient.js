/**
 * Cliente OpenRouter para comunicação com API de IA
 */
import axios from 'axios';
import logger from '../config/logger.js';
import AppSettings from '../models/AppSettings.js';

class OpenRouterClient {
  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.rateLimitCache = new Map(); // Cache para rate limiting
    this.processedMessages = new Set(); // Cache de mensagens processadas
  }

  /**
   * Obter configurações do OpenRouter do banco de dados
   */
  async getConfig() {
    try {
      const settings = await AppSettings.get();
      return {
        apiKey: settings.openrouter_api_key || process.env.OPENROUTER_API_KEY,
        model: settings.openrouter_model || process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct',
        enabled: settings.openrouter_enabled !== undefined 
          ? settings.openrouter_enabled 
          : (process.env.OPENROUTER_ENABLED === 'true' || false)
      };
    } catch (error) {
      logger.error(`Erro ao obter configurações OpenRouter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar rate limit (máximo de requisições por minuto)
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Limpar entradas antigas
    for (const [timestamp] of this.rateLimitCache.entries()) {
      if (timestamp < oneMinuteAgo) {
        this.rateLimitCache.delete(timestamp);
      }
    }

    // Contar requisições no último minuto
    const requestsInLastMinute = Array.from(this.rateLimitCache.keys())
      .filter(timestamp => timestamp >= oneMinuteAgo).length;

    // Limite padrão: 20 requisições por minuto
    const maxRequestsPerMinute = 20;

    if (requestsInLastMinute >= maxRequestsPerMinute) {
      const oldestRequest = Math.min(...Array.from(this.rateLimitCache.keys()));
      const waitTime = Math.ceil((oldestRequest + 60000 - now) / 1000);
      throw new Error(`Rate limit atingido. Aguarde ${waitTime} segundos.`);
    }

    // Registrar requisição atual
    this.rateLimitCache.set(now, true);
  }

  /**
   * Verificar se mensagem já foi processada (anti-duplicação)
   */
  isMessageProcessed(messageHash) {
    return this.processedMessages.has(messageHash);
  }

  /**
   * Marcar mensagem como processada
   */
  markMessageProcessed(messageHash) {
    // Manter apenas últimas 1000 mensagens no cache
    if (this.processedMessages.size > 1000) {
      const firstEntry = this.processedMessages.values().next().value;
      this.processedMessages.delete(firstEntry);
    }
    this.processedMessages.add(messageHash);
  }

  /**
   * Fazer requisição para OpenRouter API
   * @param {string} prompt - Prompt formatado
   * @param {Object} options - Opções adicionais
   * @param {boolean} options.forceTextMode - Forçar modo texto (não usar JSON mode)
   * @returns {Promise<Object|string>} - Resposta da IA (objeto JSON ou string)
   */
  async makeRequest(prompt, options = {}) {
    try {
      // Verificar rate limit
      this.checkRateLimit();

      // Obter configurações
      const config = await this.getConfig();

      // Verificar se está habilitado
      if (!config.enabled) {
        throw new Error('OpenRouter está desabilitado. Ative nas configurações.');
      }

      // Verificar se tem API key
      if (!config.apiKey) {
        throw new Error('OpenRouter API Key não configurada. Configure no painel admin.');
      }

      logger.debug(`🤖 Enviando requisição para OpenRouter (modelo: ${config.model})...`);

      // Preparar payload da requisição
      const requestPayload = {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Baixa temperatura para respostas mais determinísticas
        max_tokens: options.forceTextMode ? 1000 : 500 // Mais tokens para templates (texto), menos para JSON
      };

      // Adicionar response_format apenas se o modelo suportar e não estiver em modo texto
      // Modelos gratuitos podem não suportar, então vamos tentar sem primeiro
      if (!options.forceTextMode) {
        const modelsWithJsonSupport = [
          'mistralai/mixtral-8x7b-instruct',
          'anthropic/claude-3-haiku',
          'openai/gpt-3.5-turbo',
          'openai/gpt-4'
        ];
        
        if (modelsWithJsonSupport.some(m => config.model.includes(m))) {
          requestPayload.response_format = { type: 'json_object' };
        }
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://precocerto.app', // Opcional: identificar origem
            'X-Title': 'PrecoCerto AI Coupon Extractor' // Opcional: nome da aplicação
          },
          timeout: 30000 // 30 segundos de timeout
        }
      );

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Resposta inválida da API OpenRouter');
      }

      const content = response.data.choices[0].message.content;
      
      logger.debug(`✅ Resposta recebida da OpenRouter (${content.length} caracteres)`);

      // Se está em modo texto, retornar string diretamente
      if (options.forceTextMode) {
        // Limpar prefixos comuns mas manter como texto
        let cleanedContent = content
          .replace(/^<s>\s*/g, '')
          .replace(/^\[OUT\]\s*/g, '')
          .replace(/<\|.*?\|>/g, '')
          .replace(/```[\w]*\n?/g, '')
          .replace(/```/g, '')
          .trim();
        
        return cleanedContent;
      }

      // Modo JSON: tentar parsear JSON
      let parsedResponse;
      try {
        // Primeiro, tentar extrair JSON diretamente (mais robusto)
        // Procurar por padrão { ... } no conteúdo (incluindo quebras de linha)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        let cleanedContent = jsonMatch ? jsonMatch[0] : content;

        // Limpar conteúdo: remover prefixos comuns de modelos de IA
        cleanedContent = cleanedContent
          // Remover tokens especiais (em qualquer posição)
          .replace(/<s>/g, '')  // Remover <s>
          .replace(/\[OUT\]/g, '')  // Remover [OUT]
          .replace(/<\|.*?\|>/g, '')  // Remover tokens de sistema
          // Remover markdown code blocks
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          // Remover espaços e quebras de linha no início e fim
          .trim();

        parsedResponse = JSON.parse(cleanedContent);
      } catch (parseError) {
        logger.error(`Erro ao parsear JSON da resposta: ${parseError.message}`);
        logger.error(`Conteúdo recebido: ${content.substring(0, 200)}...`);
        
        // Tentar uma última vez com uma limpeza mais agressiva
        try {
          // Remover tudo antes do primeiro { e depois do último }
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const extractedJson = content.substring(firstBrace, lastBrace + 1);
            parsedResponse = JSON.parse(extractedJson);
            logger.debug(`✅ JSON extraído com sucesso após limpeza agressiva`);
          } else {
            throw parseError;
          }
        } catch (secondParseError) {
          throw new Error(`Resposta da IA não é um JSON válido: ${parseError.message}`);
        }
      }

      return parsedResponse;

    } catch (error) {
      if (error.response) {
        // Erro da API
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new Error('OpenRouter API Key inválida. Verifique as configurações.');
        } else if (status === 429) {
          throw new Error('Rate limit da OpenRouter atingido. Aguarde alguns minutos.');
        } else if (status === 402) {
          throw new Error('Créditos insuficientes na conta OpenRouter.');
        } else {
          throw new Error(`Erro da API OpenRouter (${status}): ${data?.error?.message || 'Erro desconhecido'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Timeout ao aguardar resposta da OpenRouter.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error(`Erro desconhecido ao comunicar com OpenRouter: ${error.message}`);
      }
    }
  }

  /**
   * Limpar cache de mensagens processadas (útil para testes)
   */
  clearCache() {
    this.processedMessages.clear();
    this.rateLimitCache.clear();
    logger.debug('Cache do OpenRouter limpo');
  }
}

export default new OpenRouterClient();

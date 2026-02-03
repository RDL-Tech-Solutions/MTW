/**
 * Cliente OpenRouter para comunicação com API de IA
 */
import axios from 'axios';
import logger from '../config/logger.js';
import AppSettings from '../models/AppSettings.js';
import { getModelById } from '../config/openrouterModels.js';

class OpenRouterClient {
  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.rateLimitCache = new Map(); // Cache para rate limiting
    this.processedMessages = new Set(); // Cache de mensagens processadas
    this.requestQueue = []; // Fila de requisições
    this.processingQueue = false; // Flag de processamento

    // Circuit breaker para proteger contra falhas em cascata
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000, // 1 min
      lastFailureTime: null
    };
  }

  /**
   * Obter configurações do OpenRouter do banco de dados
   */
  async getConfig() {
    try {
      const settings = await AppSettings.get();
      // Modelo padrão fallback (GRATUITO e confiável)
      let model = settings.openrouter_model ||
        process.env.OPENROUTER_MODEL ||
        'mistralai/mixtral-8x7b-instruct';

      // Verificar se o modelo está na lista de modelos suportados
      // Se não estiver, avisar mas permitir usar (pode ser um modelo novo ou customizado)
      const { getModelById } = await import('../config/openrouterModels.js');
      const modelInfo = getModelById(model);

      if (!modelInfo) {
        logger.warn(`⚠️ Modelo "${model}" não está na lista de modelos suportados.`);
        logger.warn(`   Permitindo uso do modelo customizado, mas verifique se o ID está correto.`);
        // Forçar modelo padrão se não estiver na lista - DESATIVADO para permitir novos modelos
        // model = 'mistralai/mistral-7b-instruct';
      } else {
        logger.debug(`✅ Modelo "${model}" encontrado na lista de modelos suportados (${modelInfo.name}).`);
      }

      return {
        apiKey: settings.openrouter_api_key || process.env.OPENROUTER_API_KEY,
        model: model,
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
    const rateLimitWindow = parseInt(process.env.OPENROUTER_RATE_LIMIT_WINDOW) || 60000;
    const windowStart = now - rateLimitWindow;

    // Limpar entradas antigas
    for (const [timestamp] of this.rateLimitCache.entries()) {
      if (timestamp < windowStart) {
        this.rateLimitCache.delete(timestamp);
      }
    }

    // Contar requisições na janela atual
    const requestsInWindow = Array.from(this.rateLimitCache.keys())
      .filter(timestamp => timestamp >= windowStart).length;

    // Limite configurável via env
    const maxRequestsPerMinute = parseInt(process.env.OPENROUTER_MAX_REQUESTS_PER_MINUTE) || 60;

    if (requestsInWindow >= maxRequestsPerMinute) {
      const oldestRequest = Math.min(...Array.from(this.rateLimitCache.keys()));
      // Adicionar margem de segurança
      const waitTime = Math.ceil((oldestRequest + rateLimitWindow - now) / 1000) + 3;
      throw new Error(`Rate limit atingido. Aguarde ${waitTime} segundos.`);
    }

    // Registrar requisição atual
    this.rateLimitCache.set(now, true);
  }

  /**
   * Analisar erro da API e determinar se deve fazer retry
   */
  analyzeError(error) {
    const status = error.response?.status;

    // Erros que PODEM ser retried
    const retryableErrors = [429, 503, 504]; // Rate limit, Service unavailable, Gateway timeout

    // Erros que NÃO devem ser retried
    const nonRetryableErrors = [401, 402, 404]; // Unauthorized, Payment, Not found

    if (retryableErrors.includes(status)) {
      return { shouldRetry: true, isRateLimit: status === 429 };
    }

    if (nonRetryableErrors.includes(status)) {
      return { shouldRetry: false };
    }

    // Timeout e erros de rede: retry
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { shouldRetry: true, isRateLimit: false };
    }

    // Rate limit interno
    if (error.message?.includes('Rate limit atingido')) {
      return { shouldRetry: true, isRateLimit: true };
    }

    return { shouldRetry: false };
  }

  /**
   * Fazer requisição com retry automático e backoff exponencial
   */
  async makeRequestWithRetry(prompt, options = {}, retryCount = 0) {
    const maxRetries = parseInt(process.env.OPENROUTER_RETRY_MAX_ATTEMPTS) || 3;
    const baseDelay = parseInt(process.env.OPENROUTER_RETRY_BASE_DELAY) || 2000;

    try {
      return await this.makeRequest(prompt, options);
    } catch (error) {
      const errorAnalysis = this.analyzeError(error);

      // Se pode retry e ainda tem tentativas
      if (errorAnalysis.shouldRetry && retryCount < maxRetries) {
        // Backoff exponencial: 2s, 4s, 8s, 16s...
        const delay = baseDelay * Math.pow(2, retryCount);

        if (errorAnalysis.isRateLimit) {
          logger.warn(`⏳ Rate limit atingido. Retry ${retryCount + 1}/${maxRetries} em ${delay}ms`);
        } else {
          logger.warn(`⏳ Erro temporário: ${error.message}. Retry ${retryCount + 1}/${maxRetries} em ${delay}ms`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(prompt, options, retryCount + 1);
      }

      // Não pode retry ou esgotou tentativas
      throw error;
    }
  }

  /**
   * Enfileirar requisição para processamento controlado
   */
  async enqueueRequest(prompt, options = {}) {
    const queueMaxSize = parseInt(process.env.OPENROUTER_QUEUE_MAX_SIZE) || 100;

    if (this.requestQueue.length >= queueMaxSize) {
      throw new Error(`Fila de requisições cheia (${queueMaxSize}). Sistema sobrecarregado, tente novamente mais tarde.`);
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ prompt, options, resolve, reject, timestamp: Date.now() });
      this.processQueue();
    });
  }

  /**
   * Processar fila de requisições
   */
  async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const { prompt, options, resolve, reject, timestamp } = this.requestQueue.shift();

      // Verificar se a requisição não está muito antiga (timeout de fila)
      const queueTimeout = parseInt(process.env.OPENROUTER_QUEUE_TIMEOUT) || 300000; // 5 min
      const age = Date.now() - timestamp;

      if (age > queueTimeout) {
        logger.warn(`⚠️ Requisição descartada por timeout na fila (${Math.ceil(age / 1000)}s)`);
        reject(new Error('Requisição expirou na fila. Tempo de espera muito longo.'));
        continue;
      }

      try {
        const result = await this.makeRequestWithRetry(prompt, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Delay entre requisições para distribuir carga
      const delayBetweenRequests = parseInt(process.env.OPENROUTER_QUEUE_DELAY) || 500;
      if (this.requestQueue.length > 0) {
        await new Promise(r => setTimeout(r, delayBetweenRequests));
      }
    }

    this.processingQueue = false;
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
   * Verificar estado do circuit breaker antes de fazer requisição
   */
  checkCircuitBreaker() {
    const { state, resetTimeout, lastFailureTime } = this.circuitBreaker;

    // Se está aberto, verificar se pode tentar novamente
    if (state === 'OPEN') {
      const timeSinceFailure = Date.now() - lastFailureTime;

      if (timeSinceFailure > resetTimeout) {
        logger.info('🔓 Circuit breaker: Tentando reabrir (HALF_OPEN)');
        this.circuitBreaker.state = 'HALF_OPEN';
        return;
      }

      throw new Error(`Circuit breaker está ABERTO. Serviço OpenRouter temporariamente indisponível. Tente novamente em ${Math.ceil((resetTimeout - timeSinceFailure) / 1000)}s.`);
    }
  }

  /**
   * Registrar sucesso - resetar circuit breaker se estava em HALF_OPEN
   */
  recordSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      logger.info('✅ Circuit breaker: Serviço recuperado (CLOSED)');
      this.circuitBreaker.state = 'CLOSED';
      this.circuitBreaker.failures = 0;
    }
  }

  /**
   * Registrar falha - incrementar contador e possivelmente abrir circuito
   */
  recordFailure(error) {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      logger.error(`🚨 Circuit breaker: ABERTO após ${this.circuitBreaker.failures} falhas consecutivas`);
      this.circuitBreaker.state = 'OPEN';
    }
  }

  /**
   * Determinar se erro deve acionar circuit breaker
   */
  shouldTriggerCircuitBreaker(error) {
    // Apenas erros de serviço devem abrir o circuito
    const serverErrors = [500, 502, 503, 504];
    const status = error.response?.status;
    return serverErrors.includes(status) || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
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
      // Verificar circuit breaker ANTES de tudo
      this.checkCircuitBreaker();

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

      // Validar tamanho do prompt
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new Error('Prompt vazio ou inválido');
      }

      // Log do tamanho do prompt para debug
      logger.debug(`🤖 Enviando requisição para OpenRouter (modelo: ${config.model})...`);
      logger.debug(`   Tamanho do prompt: ${prompt.length} caracteres`);

      // Se o prompt for muito longo, avisar (mas não bloquear)
      if (prompt.length > 10000) {
        logger.warn(`⚠️ Prompt muito longo (${prompt.length} caracteres). Pode causar problemas.`);
      }

      // Preparar payload da requisição
      // Usar system message SIMPLIFICADA para melhor compatibilidade
      const messages = [];
      if (!options.forceTextMode) {
        // System message curta e direta
        messages.push({
          role: 'system',
          content: 'Responda APENAS com JSON válido. Sem explicações, sem markdown, sem comentários.'
        });
      }
      messages.push({
        role: 'user',
        content: prompt
      });

      const requestPayload = {
        model: options.model || config.model,
        messages: messages,
        temperature: 0.2, // Temperatura baixa para respostas mais consistentes
        max_tokens: options.forceTextMode ? 1500 : 1000 // Reduzido para evitar timeout em modelos gratuitos
      };

      // Adicionar response_format apenas se o modelo suportar e não estiver em modo texto
      // Verificar na lista de modelos se o modelo atual suporta JSON
      if (!options.forceTextMode) {
        const modelInfo = getModelById(config.model);
        if (modelInfo && modelInfo.supportsJson) {
          logger.debug(`   ✅ Modelo ${config.model} suporta JSON mode, ativando response_format`);
          requestPayload.response_format = { type: 'json_object' };
        } else if (modelInfo) {
          logger.debug(`   ⚠️ Modelo ${config.model} não suporta JSON mode, tentando sem response_format`);
        } else {
          // Modelo não está na lista - tentar com JSON mode primeiro, se falhar, tentar sem
          logger.debug(`   ⚠️ Modelo ${config.model} não está na lista, tentando com JSON mode`);
          // Tentar com JSON mode - se falhar, será tratado no catch
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
        logger.error(`❌ Resposta inválida da API OpenRouter`);
        logger.error(`   Response data: ${JSON.stringify(response.data)}`);
        throw new Error('Resposta inválida da API OpenRouter');
      }

      const choice = response.data.choices[0];
      const content = choice.message?.content;
      const finishReason = choice.finish_reason;

      // Verificar se a resposta foi truncada
      if (finishReason === 'length') {
        logger.warn(`⚠️ Resposta da IA foi truncada (finish_reason: length). Aumente max_tokens se necessário.`);
      }

      // Verificar se o conteúdo está vazio
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        logger.error(`❌ Resposta da IA está vazia`);
        logger.error(`   Finish reason: ${finishReason}`);
        logger.error(`   Choice completo: ${JSON.stringify(choice)}`);
        throw new Error('Resposta da IA está vazia ou inválida');
      }

      logger.debug(`✅ Resposta recebida da OpenRouter (${content.length} caracteres, finish_reason: ${finishReason})`);

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
        // Verificar se o conteúdo parece ser texto livre ao invés de JSON
        const trimmedContent = content.trim();
        if (!trimmedContent.startsWith('{') && !trimmedContent.startsWith('[')) {
          // Se não começa com { ou [, provavelmente é texto livre
          // Tentar remover tokens especiais e verificar novamente
          const cleanedForCheck = trimmedContent
            .replace(/^<s>\s*/g, '')
            .replace(/^\[OUT\]\s*/g, '')
            .replace(/<\|.*?\|>/g, '')
            .trim();

          if (!cleanedForCheck.startsWith('{') && !cleanedForCheck.startsWith('[')) {
            logger.error(`❌ Resposta da IA não é JSON - parece ser texto livre`);
            logger.error(`   Conteúdo: ${cleanedForCheck.substring(0, 200)}`);
            logger.error(`   💡 O modelo não seguiu as instruções de retornar apenas JSON.`);
            logger.error(`   💡 Tente usar um modelo diferente ou verificar as configurações do prompt.`);
            throw new Error(`Resposta da IA não é JSON válido. O modelo retornou texto livre ao invés de JSON. Conteúdo: ${cleanedForCheck.substring(0, 100)}...`);
          }
        }

        // Primeiro, tentar extrair JSON diretamente (mais robusto)
        // IMPORTANTE: Muitos modelos retornam JSON dentro de blocos markdown (```json ... ```)
        // Precisamos remover o markdown ANTES de extrair o JSON

        // Passo 1: Remover markdown code blocks primeiro
        let contentWithoutMarkdown = content
          .replace(/```json\s*\n?/gi, '')  // ```json com ou sem quebra de linha
          .replace(/```JSON\s*\n?/gi, '')  // ```JSON (maiúsculo)
          .replace(/```\s*json\s*\n?/gi, '')  // ``` json (com espaço)
          .replace(/```\s*\n?/g, '')  // ``` genérico (deve vir depois dos específicos)
          .replace(/^```/gm, '')  // ``` no início de linha
          .replace(/```$/gm, '')  // ``` no final de linha
          .trim();

        // Passo 2: Procurar por padrão { ... } ou [ ... ] no conteúdo limpo
        const jsonMatch = contentWithoutMarkdown.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        let cleanedContent = jsonMatch ? jsonMatch[0] : contentWithoutMarkdown;

        // Passo 3: Limpar conteúdo: remover prefixos comuns de modelos de IA
        cleanedContent = cleanedContent
          // Remover tokens especiais (em qualquer posição)
          .replace(/<s>/g, '')  // Remover <s>
          .replace(/\[OUT\]/g, '')  // Remover [OUT]
          .replace(/<\|.*?\|>/g, '')  // Remover tokens de sistema
          // Remover espaços e quebras de linha no início e fim
          .trim();

        parsedResponse = JSON.parse(cleanedContent);
      } catch (parseError) {
        logger.error(`❌ Erro ao parsear JSON da resposta: ${parseError.message}`);
        logger.error(`   Conteúdo recebido (primeiros 500 chars): ${content.substring(0, 500)}`);
        logger.error(`   Conteúdo recebido (últimos 200 chars): ${content.substring(Math.max(0, content.length - 200))}`);
        logger.error(`   Tamanho total: ${content.length} caracteres`);

        // Verificar se o conteúdo está muito curto (possível truncamento)
        if (content.length < 50) {
          logger.error(`   ⚠️ Conteúdo muito curto, possível truncamento ou resposta incompleta`);
        }

        // Tentar uma última vez com uma limpeza mais agressiva
        try {
          // Passo 1: Remover markdown primeiro
          let contentForExtraction = content
            .replace(/```json\s*\n?/gi, '')
            .replace(/```JSON\s*\n?/gi, '')
            .replace(/```\s*json\s*\n?/gi, '')
            .replace(/```\s*\n?/g, '')
            .replace(/^```/gm, '')
            .replace(/```$/gm, '')
            .trim();

          // Passo 2: Remover tudo antes do primeiro { ou [ e depois do último } ou ]
          const firstBrace = contentForExtraction.indexOf('{');
          const firstBracket = contentForExtraction.indexOf('[');
          const lastBrace = contentForExtraction.lastIndexOf('}');
          const lastBracket = contentForExtraction.lastIndexOf(']');

          // Determinar início (o que vier primeiro)
          let start = -1;
          if (firstBrace !== -1 && firstBracket !== -1) {
            start = Math.min(firstBrace, firstBracket);
          } else if (firstBrace !== -1) {
            start = firstBrace;
          } else {
            start = firstBracket;
          }

          // Determinar fim (o que vier por último)
          let end = -1;
          if (lastBrace !== -1 && lastBracket !== -1) {
            end = Math.max(lastBrace, lastBracket);
          } else if (lastBrace !== -1) {
            end = lastBrace;
          } else {
            end = lastBracket;
          }

          if (start === -1) {
            logger.error(`   ❌ Nenhum caractere '{' ou '[' encontrado no conteúdo`);

            // Limpar tokens especiais para verificar melhor
            const contentTrimmed = contentForExtraction
              .replace(/^<s>\s*/g, '')
              .replace(/^\[OUT\]\s*/g, '')
              .replace(/<\|.*?\|>/g, '')
              .trim();

            // Se o conteúdo é apenas markdown vazio, é um erro de truncamento
            if (contentTrimmed === '```' || (contentTrimmed.startsWith('```') && contentTrimmed.length < 20)) {
              throw new Error(`Resposta da IA está incompleta (apenas início de markdown). A resposta foi truncada antes de completar. Tente aumentar max_tokens ou usar um modelo diferente.`);
            }

            // Se não começa com { ou [, é texto livre (modelo não seguiu instruções)
            if (!contentTrimmed.startsWith('{') && !contentTrimmed.startsWith('[')) {
              logger.error(`   ⚠️ Resposta parece ser texto livre ao invés de JSON`);
              logger.error(`   💡 O modelo não seguiu as instruções de retornar apenas JSON.`);
              logger.error(`   💡 Tente usar um modelo diferente ou verificar as configurações do prompt.`);
              throw new Error(`Resposta da IA não é JSON válido. O modelo retornou texto livre ao invés de JSON. Conteúdo: ${contentTrimmed.substring(0, 100)}...`);
            }

            throw new Error(`Resposta da IA não contém JSON válido. Conteúdo: ${contentForExtraction.substring(0, 100)}...`);
          }

          if (end === -1 || end <= start) {
            logger.error(`   ❌ JSON incompleto ou malformado (start: ${start}, end: ${end})`);

            // Se encontrou { mas não }, a resposta foi truncada
            if (finishReason === 'length') {
              throw new Error(`Resposta da IA foi truncada (finish_reason: length). JSON incompleto. Aumente max_tokens na configuração.`);
            }

            throw new Error(`Resposta da IA contém JSON incompleto ou malformado. Possível truncamento.`);
          }

          const extractedJson = contentForExtraction.substring(start, end + 1);
          logger.debug(`   🔍 Tentando extrair JSON: ${extractedJson.substring(0, 200)}...`);

          // Limpar markdown do JSON extraído antes de parsear (limpeza final)
          const finalJson = extractedJson
            .replace(/```json\s*\n?/gi, '')
            .replace(/```JSON\s*\n?/gi, '')
            .replace(/```\s*json\s*\n?/gi, '')
            .replace(/```\s*\n?/g, '')
            .replace(/^```/gm, '')
            .replace(/```$/gm, '')
            .trim();

          parsedResponse = JSON.parse(finalJson);
          logger.debug(`✅ JSON extraído com sucesso após limpeza agressiva`);
        } catch (secondParseError) {
          logger.error(`❌ Falha na segunda tentativa de parsing: ${secondParseError.message}`);
          logger.error(`   Conteúdo completo (para debug): ${content}`);
          logger.error(`   Finish reason: ${finishReason}`);

          // Se o conteúdo está vazio ou muito curto, pode ser que a resposta foi truncada
          // ou o modelo não retornou nada útil
          if (content.length < 10) {
            logger.error(`   ⚠️ Conteúdo extremamente curto (${content.length} chars). Possível erro na API ou modelo.`);
            logger.error(`   💡 Dica: Verifique se o modelo está funcionando corretamente ou se há problemas de conectividade.`);
          }

          // Se finish_reason é 'length', a resposta foi truncada
          if (finishReason === 'length') {
            throw new Error(`Resposta da IA foi truncada (finish_reason: length). Aumente max_tokens na configuração do OpenRouter. Conteúdo recebido: ${content.substring(0, 200)}...`);
          }

          throw new Error(`Resposta da IA não é um JSON válido: ${parseError.message}. Conteúdo recebido: ${content.substring(0, 200)}...`);
        }
      }

      // Validar que o JSON parseado tem a estrutura esperada
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        logger.error(`❌ JSON parseado não é um objeto válido`);
        throw new Error('Resposta da IA não retornou um objeto JSON válido');
      }

      // Sucesso - registrar no circuit breaker
      this.recordSuccess();

      return parsedResponse;

    } catch (error) {
      // Obter config novamente se não estiver definido (pode ter falhado antes)
      let configForError = null;
      try {
        configForError = await this.getConfig();
      } catch (configError) {
        // Se não conseguir obter config, usar valores padrão
        configForError = { model: 'modelo desconhecido' };
      }

      // Registrar falha no circuit breaker se for erro de serviço
      if (this.shouldTriggerCircuitBreaker(error)) {
        this.recordFailure(error);
      }

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
        } else if (status === 404) {
          // Modelo não encontrado - sugerir modelos válidos
          const errorMsg = data?.error?.message || 'Modelo não encontrado';
          const modelName = configForError?.model || 'modelo desconhecido';
          logger.error(`❌ Modelo não encontrado: ${modelName}`);
          logger.error(`   Erro: ${errorMsg}`);

          // Sugerir modelos alternativos (gratuitos)
          const { getModelsByType } = await import('../config/openrouterModels.js');
          const freeModels = getModelsByType('free');
          if (freeModels && freeModels.length > 0) {
            const suggestedModels = freeModels.slice(0, 3).map(m => `${m.name} (${m.id})`).join(', ');
            throw new Error(`Modelo "${modelName}" não encontrado na OpenRouter. Erro: ${errorMsg}. Modelos sugeridos: ${suggestedModels}. Configure um modelo válido em Configurações → IA / OpenRouter.`);
          } else {
            throw new Error(`Modelo "${modelName}" não encontrado na OpenRouter. Erro: ${errorMsg}. Configure um modelo válido em Configurações → IA / OpenRouter.`);
          }
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








/**
 * Wrapper para operações do Supabase com retry automático
 * Lida com erros temporários como 502 Bad Gateway
 */

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'Bad gateway',
    '502',
    '503',
    '504',
    'Network error',
    'fetch failed'
  ]
};

/**
 * Verifica se o erro é retryable
 */
function isRetryableError(error, config = DEFAULT_RETRY_CONFIG) {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  const errorCode = error.code || error.status || '';

  return config.retryableErrors.some(retryableError => {
    return (
      errorMessage.toLowerCase().includes(retryableError.toLowerCase()) ||
      errorCode.toString().includes(retryableError)
    );
  });
}

/**
 * Calcula o delay para o próximo retry com exponential backoff
 */
function calculateDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );
  
  // Adiciona jitter (variação aleatória) para evitar thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

/**
 * Aguarda um período de tempo
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executa uma operação do Supabase com retry automático
 * 
 * @param {Function} operation - Função que retorna uma Promise com a operação do Supabase
 * @param {Object} options - Opções de configuração
 * @param {number} options.maxAttempts - Número máximo de tentativas
 * @param {number} options.baseDelay - Delay base em ms
 * @param {string} options.operationName - Nome da operação para logs
 * @returns {Promise} Resultado da operação
 */
export async function withRetry(operation, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const operationName = options.operationName || 'Supabase operation';
  
  let lastError;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      // Se chegou aqui, a operação foi bem-sucedida
      if (attempt > 1) {
        console.log(`✅ ${operationName} bem-sucedida na tentativa ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Verifica se é um erro retryable
      if (!isRetryableError(error, config)) {
        console.error(`❌ ${operationName} falhou com erro não-retryable:`, error.message);
        throw error;
      }
      
      // Se foi a última tentativa, lança o erro
      if (attempt === config.maxAttempts) {
        console.error(
          `❌ ${operationName} falhou após ${config.maxAttempts} tentativas:`,
          error.message
        );
        throw error;
      }
      
      // Calcula o delay e aguarda
      const delay = calculateDelay(attempt, config);
      console.warn(
        `⚠️ ${operationName} falhou (tentativa ${attempt}/${config.maxAttempts}): ${error.message}. ` +
        `Tentando novamente em ${Math.round(delay)}ms...`
      );
      
      await sleep(delay);
    }
  }
  
  // Nunca deve chegar aqui, mas por segurança
  throw lastError;
}

/**
 * Wrapper para operações de SELECT do Supabase
 */
export async function selectWithRetry(query, operationName = 'SELECT') {
  return withRetry(
    async () => {
      const result = await query;
      
      if (result.error) {
        throw new Error(result.error.message || 'Database error');
      }
      
      return result;
    },
    { operationName }
  );
}

/**
 * Wrapper para operações de INSERT do Supabase
 */
export async function insertWithRetry(query, operationName = 'INSERT') {
  return withRetry(
    async () => {
      const result = await query;
      
      if (result.error) {
        throw new Error(result.error.message || 'Database error');
      }
      
      return result;
    },
    { operationName }
  );
}

/**
 * Wrapper para operações de UPDATE do Supabase
 */
export async function updateWithRetry(query, operationName = 'UPDATE') {
  return withRetry(
    async () => {
      const result = await query;
      
      if (result.error) {
        throw new Error(result.error.message || 'Database error');
      }
      
      return result;
    },
    { operationName }
  );
}

/**
 * Wrapper para operações de DELETE do Supabase
 */
export async function deleteWithRetry(query, operationName = 'DELETE') {
  return withRetry(
    async () => {
      const result = await query;
      
      if (result.error) {
        throw new Error(result.error.message || 'Database error');
      }
      
      return result;
    },
    { operationName }
  );
}

/**
 * Wrapper para operações de RPC do Supabase
 */
export async function rpcWithRetry(query, operationName = 'RPC') {
  return withRetry(
    async () => {
      const result = await query;
      
      if (result.error) {
        throw new Error(result.error.message || 'Database error');
      }
      
      return result;
    },
    { operationName }
  );
}

export default {
  withRetry,
  selectWithRetry,
  insertWithRetry,
  updateWithRetry,
  deleteWithRetry,
  rpcWithRetry,
  isRetryableError
};

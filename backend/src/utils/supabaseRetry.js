/**
 * Utilitário para retry de requisições Supabase com backoff exponencial
 */
import logger from '../config/logger.js';

/**
 * Executar função com retry automático
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {Object} options - Opções de retry
 * @param {number} options.maxRetries - Número máximo de tentativas (padrão: 3)
 * @param {number} options.initialDelay - Delay inicial em ms (padrão: 1000)
 * @param {number} options.maxDelay - Delay máximo em ms (padrão: 10000)
 * @param {Function} options.shouldRetry - Função para determinar se deve tentar novamente (padrão: retry em 502, 503, 504, timeout)
 * @returns {Promise<any>} - Resultado da função
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      // Retry em erros de gateway, timeout e erros de rede
      if (error?.code === 'PGRST301' || error?.code === 'PGRST302') {
        return true; // Timeout
      }
      if (error?.message?.includes('502') || 
          error?.message?.includes('503') || 
          error?.message?.includes('504') ||
          error?.message?.includes('Bad Gateway') ||
          error?.message?.includes('Service Unavailable') ||
          error?.message?.includes('Gateway Timeout')) {
        return true;
      }
      if (error?.message?.includes('ECONNRESET') || 
          error?.message?.includes('ETIMEDOUT') ||
          error?.message?.includes('ENOTFOUND')) {
        return true; // Erros de rede
      }
      return false;
    }
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // Se foi uma tentativa de retry, logar sucesso
      if (attempt > 0) {
        logger.info(`✅ Requisição Supabase bem-sucedida após ${attempt} tentativa(s)`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Verificar se deve tentar novamente
      if (attempt < maxRetries && shouldRetry(error)) {
        const errorMsg = error?.message || String(error);
        const isHtmlError = errorMsg.includes('<html>') || errorMsg.includes('Bad Gateway');
        
        logger.warn(`⚠️ Erro na requisição Supabase (tentativa ${attempt + 1}/${maxRetries + 1}): ${isHtmlError ? '502 Bad Gateway' : errorMsg.substring(0, 100)}`);
        logger.warn(`   Aguardando ${delay}ms antes de tentar novamente...`);
        
        // Aguardar antes de tentar novamente (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Aumentar delay para próxima tentativa (backoff exponencial)
        delay = Math.min(delay * 2, maxDelay);
      } else {
        // Não deve tentar novamente ou esgotou tentativas
        break;
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  const errorMsg = lastError?.message || String(lastError);
  const isHtmlError = errorMsg.includes('<html>') || errorMsg.includes('Bad Gateway');
  
  if (isHtmlError) {
    logger.error(`❌ Erro 502 Bad Gateway do Supabase após ${maxRetries + 1} tentativa(s)`);
    logger.error(`   Isso geralmente indica problemas temporários no Supabase/Cloudflare`);
    logger.error(`   Verifique: 1) Status do Supabase, 2) Conexão de internet, 3) Firewall/proxy`);
  } else {
    logger.error(`❌ Erro na requisição Supabase após ${maxRetries + 1} tentativa(s): ${errorMsg.substring(0, 200)}`);
  }
  
  throw lastError;
}

/**
 * Wrapper para operações Supabase com retry automático
 * @param {Function} supabaseOperationFn - Função que retorna a operação do Supabase
 * @param {Object} retryOptions - Opções de retry
 * @returns {Promise<{data: any, error: any}>} - Resultado da operação
 */
export async function supabaseWithRetry(supabaseOperationFn, retryOptions = {}) {
  return await withRetry(async () => {
    const result = await supabaseOperationFn();
    
    // Se houver erro na resposta, lançar para que o retry funcione
    if (result.error) {
      const error = new Error(result.error.message || 'Erro do Supabase');
      error.code = result.error.code;
      error.details = result.error;
      error.originalError = result.error;
      throw error;
    }
    
    return result;
  }, retryOptions);
}

export default { withRetry, supabaseWithRetry };







/**
 * Logger simples para o app
 * Facilita debug e pode ser desabilitado em produção
 */

const isDevelopment = __DEV__;

const logger = {
  info: (...args) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  }
};

export default logger;

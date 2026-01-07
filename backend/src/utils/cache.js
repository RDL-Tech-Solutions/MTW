import logger from '../config/logger.js';

// Simple in-memory cache
const cacheStore = new Map();

/**
 * Define um valor no cache
 * @param {string} key - Chave do cache
 * @param {any} value - Valor a ser armazenado
 * @param {number} ttlSeconds - Tempo de vida em segundos (default: 300)
 */
export const cacheSet = async (key, value, ttlSeconds = 300) => {
    try {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        cacheStore.set(key, {
            value,
            expiresAt
        });
        // logger.debug(`💾 Cache set: ${key} (TTL: ${ttlSeconds}s)`);
        return true;
    } catch (error) {
        logger.warn(`⚠️ Erro ao definir cache (${key}): ${error.message}`);
        return false;
    }
};

/**
 * Obtém um valor do cache
 * @param {string} key - Chave do cache
 */
export const cacheGet = async (key) => {
    try {
        const item = cacheStore.get(key);

        if (!item) {
            return null;
        }

        if (Date.now() > item.expiresAt) {
            cacheStore.delete(key);
            return null;
        }

        // logger.debug(`💾 Cache hit: ${key}`);
        return item.value;
    } catch (error) {
        logger.warn(`⚠️ Erro ao obter cache (${key}): ${error.message}`);
        return null;
    }
};

/**
 * Remove um valor do cache
 * @param {string} key - Chave do cache
 */
export const cacheDel = async (key) => {
    try {
        const existed = cacheStore.delete(key);
        if (existed) {
            // logger.debug(`🗑️ Cache deleted: ${key}`);
        }
        return true;
    } catch (error) {
        logger.warn(`⚠️ Erro ao deletar cache (${key}): ${error.message}`);
        return false;
    }
};

/**
 * Remove valores do cache por padrão (regex ou prefixo)
 * @param {string} pattern - Padrão para deletar (ex: "users:*")
 */
export const cacheDelByPattern = async (pattern) => {
    try {
        let count = 0;
        // Converter padrão estilo Redis (users:*) para Regex (users:.*)
        const regexPattern = new RegExp('^' + pattern.replace('*', '.*') + '$');

        for (const key of cacheStore.keys()) {
            if (regexPattern.test(key)) {
                cacheStore.delete(key);
                count++;
            }
        }

        if (count > 0) {
            logger.debug(`🗑️ Cache pattern deleted: ${pattern} (${count} keys)`);
        }
        return count;
    } catch (error) {
        logger.warn(`⚠️ Erro ao deletar cache por padrão (${pattern}): ${error.message}`);
        return 0;
    }
};

/**
 * Limpa todo o cache
 */
export const cacheFlush = async () => {
    const size = cacheStore.size;
    cacheStore.clear();
    logger.info(`🧹 Cache limpo (${size} itens removidos)`);
    return true;
};

// Limpeza periódica de itens expirados (GC)
setInterval(() => {
    const now = Date.now();
    let count = 0;
    for (const [key, item] of cacheStore.entries()) {
        if (now > item.expiresAt) {
            cacheStore.delete(key);
            count++;
        }
    }
    if (count > 0) {
        // logger.debug(`🧹 Cache GC: ${count} itens expirados removidos`);
    }
}, 60000); // Rodar a cada 1 minuto

export default {
    cacheSet,
    cacheGet,
    cacheDel,
    cacheDelByPattern,
    cacheFlush
};

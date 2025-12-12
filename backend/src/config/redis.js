import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Variável para controlar se o Redis está disponível
let isRedisAvailable = false;

// Configuração do Redis (suporta Upstash e Redis local)
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    // Habilitar TLS se for Upstash (detecta pelo host)
    tls: process.env.REDIS_HOST?.includes('upstash.io') ? true : undefined
  },
  password: process.env.REDIS_PASSWORD || undefined
};

const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => {
  // Silenciar erros se Redis não estiver disponível
  if (err.code === 'ECONNREFUSED' || err.message.includes('Socket closed')) {
    isRedisAvailable = false;
  } else {
    console.error('❌ Redis Error:', err.message);
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
  isRedisAvailable = true;
});

redisClient.on('ready', () => {
  console.log('✅ Redis pronto para uso');
  isRedisAvailable = true;
});

// Conectar ao Redis (opcional)
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    isRedisAvailable = true;
    return true;
  } catch (error) {
    console.log('⚠️  Redis não disponível - Sistema funcionará sem cache');
    isRedisAvailable = false;
    return false;
  }
};

// Helper functions para cache (retornam null/false se Redis não disponível)
export const cacheGet = async (key) => {
  if (!isRedisAvailable) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

export const cacheSet = async (key, value, expireSeconds = 3600) => {
  if (!isRedisAvailable) return false;
  try {
    await redisClient.setEx(key, expireSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

export const cacheDel = async (key) => {
  if (!isRedisAvailable) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    return false;
  }
};

export const cacheFlush = async () => {
  if (!isRedisAvailable) return false;
  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    return false;
  }
};

export default redisClient;

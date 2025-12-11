import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
});

// Conectar ao Redis
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Redis:', error.message);
    return false;
  }
};

// Helper functions para cache
export const cacheGet = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    return null;
  }
};

export const cacheSet = async (key, value, expireSeconds = 3600) => {
  try {
    await redisClient.setEx(key, expireSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
    return false;
  }
};

export const cacheDel = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Erro ao deletar cache:', error);
    return false;
  }
};

export const cacheFlush = async () => {
  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return false;
  }
};

export default redisClient;

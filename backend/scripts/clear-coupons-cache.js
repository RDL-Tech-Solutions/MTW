import { cacheDelByPattern } from '../src/utils/cache.js';
import logger from '../src/config/logger.js';

async function clearCouponsCache() {
  try {
    console.log('🗑️ Limpando cache de cupons...');
    
    // Limpar todos os caches relacionados a cupons
    await cacheDelByPattern('coupons:*');
    
    console.log('✅ Cache de cupons limpo com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    process.exit(1);
  }
}

clearCouponsCache();

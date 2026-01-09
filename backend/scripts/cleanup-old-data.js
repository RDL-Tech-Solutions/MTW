import Product from '../src/models/Product.js';
import Coupon from '../src/models/Coupon.js';
import logger from '../src/config/logger.js';

/**
 * Script para executar limpeza manual de produtos e cupons pendentes
 * Deleta:
 * - Produtos pendentes > 24h
 * - Produtos processados > 7 dias
 * - Cupons pendentes > 24h
 * - Cupons processados > 7 dias
 */
async function runCleanup() {
    console.log('\n🧹 ===== LIMPEZA MANUAL DE DADOS ANTIGOS =====\n');

    try {
        // 1. Verificar produtos pendentes > 24h
        console.log('📋 1. Verificando produtos pendentes antigos...');
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`   Limite: ${twentyFourHoursAgo.toLocaleString('pt-BR')}`);

        // 2. Executar limpeza de produtos
        console.log('\n📋 2. Executando limpeza de produtos...');
        const productResult = await Product.cleanupOldItems();
        console.log(`   ✅ Produtos pendentes removidos: ${productResult.pendingCount}`);
        console.log(`   ✅ Produtos antigos removidos: ${productResult.processedCount}`);

        // 3. Executar limpeza de cupons
        console.log('\n📋 3. Executando limpeza de cupons...');
        const couponResult = await Coupon.cleanupOldItems();
        console.log(`   ✅ Cupons pendentes removidos: ${couponResult.pendingCount}`);
        console.log(`   ✅ Cupons antigos removidos: ${couponResult.processedCount}`);

        // Resumo
        console.log('\n✅ ===== LIMPEZA CONCLUÍDA =====');
        console.log(`   Total de produtos removidos: ${productResult.pendingCount + productResult.processedCount}`);
        console.log(`   Total de cupons removidos: ${couponResult.pendingCount + couponResult.processedCount}`);

    } catch (error) {
        console.error('\n❌ ERRO na limpeza:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar
runCleanup()
    .then(() => {
        console.log('\nScript finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });

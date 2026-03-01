/**
 * Script para verificar TODOS os cupons e seus valores de is_general
 */

import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function checkAllCoupons() {
  try {
    logger.info('🔍 Verificando TODOS os cupons...\n');

    // Buscar todos os cupons
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('id, code, is_general, applicable_products, platform, is_active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error(`❌ Erro ao buscar cupons: ${error.message}`);
      return;
    }

    if (!coupons || coupons.length === 0) {
      logger.info('❌ Nenhum cupom encontrado');
      return;
    }

    logger.info(`📊 Encontrados ${coupons.length} cupons\n`);
    logger.info('═'.repeat(80));

    let stats = {
      true: 0,
      false: 0,
      null: 0,
      inconsistent: 0
    };

    for (const coupon of coupons) {
      const hasProducts = coupon.applicable_products && 
                         Array.isArray(coupon.applicable_products) && 
                         coupon.applicable_products.length > 0;

      const productsCount = coupon.applicable_products?.length || 0;
      
      // Verificar inconsistência
      const isInconsistent = (coupon.is_general === false && productsCount === 0) ||
                            (coupon.is_general === true && productsCount > 0);

      logger.info(`\n📝 ${coupon.code} (${coupon.platform})`);
      logger.info(`   ID: ${coupon.id}`);
      logger.info(`   is_general: ${coupon.is_general} (tipo: ${typeof coupon.is_general})`);
      logger.info(`   applicable_products: ${productsCount} produtos`);
      logger.info(`   Ativo: ${coupon.is_active ? 'Sim' : 'Não'}`);
      
      if (isInconsistent) {
        logger.warn(`   ⚠️  INCONSISTENTE! is_general=${coupon.is_general} mas tem ${productsCount} produtos`);
        stats.inconsistent++;
      } else {
        logger.info(`   ✅ Consistente`);
      }

      // Contar estatísticas
      if (coupon.is_general === true) stats.true++;
      else if (coupon.is_general === false) stats.false++;
      else if (coupon.is_general === null) stats.null++;
    }

    logger.info('\n' + '═'.repeat(80));
    logger.info('\n📊 ESTATÍSTICAS:');
    logger.info(`   is_general = true:  ${stats.true} cupons (GERAL)`);
    logger.info(`   is_general = false: ${stats.false} cupons (ESPECÍFICO)`);
    logger.info(`   is_general = null:  ${stats.null} cupons (NÃO DEFINIDO)`);
    logger.info(`   ⚠️  Inconsistentes:  ${stats.inconsistent} cupons`);
    logger.info(`   📦 Total:           ${coupons.length} cupons`);

    if (stats.inconsistent > 0) {
      logger.warn('\n⚠️  ATENÇÃO: Há cupons inconsistentes que precisam ser corrigidos!');
    }

  } catch (error) {
    logger.error(`❌ Erro fatal: ${error.message}`);
    logger.error(error.stack);
  }
}

// Executar
checkAllCoupons()
  .then(() => {
    logger.info('\n✅ Verificação finalizada');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`❌ Erro fatal: ${error.message}`);
    process.exit(1);
  });

/**
 * Script para corrigir cupons inconsistentes
 * 
 * Problema: Cupons com is_general=false mas applicable_products vazio
 * Solução: Mudar para is_general=true (geral) já que não tem produtos específicos
 */

import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function fixInconsistentCoupons() {
  try {
    logger.info('🔧 Corrigindo cupons inconsistentes...\n');

    // Buscar cupons com is_general=false mas sem produtos
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_general', false);

    if (error) {
      logger.error(`❌ Erro ao buscar cupons: ${error.message}`);
      return;
    }

    if (!coupons || coupons.length === 0) {
      logger.info('✅ Nenhum cupom com is_general=false encontrado');
      return;
    }

    logger.info(`📊 Encontrados ${coupons.length} cupons com is_general=false\n`);

    let fixed = 0;
    let skipped = 0;

    for (const coupon of coupons) {
      const hasProducts = coupon.applicable_products && 
                         Array.isArray(coupon.applicable_products) && 
                         coupon.applicable_products.length > 0;

      const productsCount = coupon.applicable_products?.length || 0;

      logger.info(`📝 Cupom: ${coupon.code} (${coupon.platform})`);
      logger.info(`   ID: ${coupon.id}`);
      logger.info(`   is_general: false`);
      logger.info(`   applicable_products: ${productsCount} produtos`);

      if (!hasProducts) {
        // INCONSISTENTE: is_general=false mas sem produtos
        logger.warn(`   ⚠️  INCONSISTENTE! Corrigindo para is_general=true (geral)...`);

        const { error: updateError } = await supabase
          .from('coupons')
          .update({ is_general: true })
          .eq('id', coupon.id);

        if (updateError) {
          logger.error(`   ❌ Erro ao atualizar: ${updateError.message}`);
          skipped++;
        } else {
          logger.info(`   ✅ Corrigido! Agora é cupom GERAL`);
          fixed++;
        }
      } else {
        logger.info(`   ✅ Consistente (tem ${productsCount} produtos)`);
        skipped++;
      }

      logger.info('');
    }

    logger.info('═'.repeat(80));
    logger.info(`\n📊 Resumo:`);
    logger.info(`   ✅ Corrigidos: ${fixed} cupons`);
    logger.info(`   ⏭️  Ignorados: ${skipped} cupons (já consistentes)`);
    logger.info(`   📦 Total: ${coupons.length} cupons`);

  } catch (error) {
    logger.error(`❌ Erro fatal: ${error.message}`);
    logger.error(error.stack);
  }
}

// Executar
fixInconsistentCoupons()
  .then(() => {
    logger.info('\n✅ Correção finalizada');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`❌ Erro fatal: ${error.message}`);
    process.exit(1);
  });

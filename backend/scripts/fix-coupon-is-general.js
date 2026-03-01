/**
 * Script para corrigir cupons com is_general = null
 * 
 * Problema: Cupons criados como "produtos selecionados" podem ter is_general = null
 * Solução: Atualizar para is_general = false quando applicable_products não está vazio
 */

import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function fixCouponIsGeneral() {
  try {
    logger.info('🔧 Iniciando correção de cupons com is_general = null...');

    // Buscar todos os cupons com is_general = null
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .is('is_general', null);

    if (error) {
      logger.error(`❌ Erro ao buscar cupons: ${error.message}`);
      return;
    }

    if (!coupons || coupons.length === 0) {
      logger.info('✅ Nenhum cupom com is_general = null encontrado');
      return;
    }

    logger.info(`📊 Encontrados ${coupons.length} cupons com is_general = null`);

    let updated = 0;
    let skipped = 0;

    for (const coupon of coupons) {
      // Se tem applicable_products preenchido, é específico (false)
      // Se não tem, é geral (true)
      const hasProducts = coupon.applicable_products && 
                         Array.isArray(coupon.applicable_products) && 
                         coupon.applicable_products.length > 0;

      const newIsGeneral = !hasProducts; // true se não tem produtos, false se tem

      logger.info(`\n📝 Cupom: ${coupon.code}`);
      logger.info(`   is_general atual: null`);
      logger.info(`   applicable_products: ${coupon.applicable_products?.length || 0} produtos`);
      logger.info(`   Novo is_general: ${newIsGeneral} (${newIsGeneral ? 'GERAL' : 'ESPECÍFICO'})`);

      // Atualizar cupom
      const { error: updateError } = await supabase
        .from('coupons')
        .update({ is_general: newIsGeneral })
        .eq('id', coupon.id);

      if (updateError) {
        logger.error(`   ❌ Erro ao atualizar: ${updateError.message}`);
        skipped++;
      } else {
        logger.info(`   ✅ Atualizado com sucesso`);
        updated++;
      }
    }

    logger.info(`\n📊 Resumo:`);
    logger.info(`   ✅ Atualizados: ${updated}`);
    logger.info(`   ❌ Falhas: ${skipped}`);
    logger.info(`   📦 Total: ${coupons.length}`);

  } catch (error) {
    logger.error(`❌ Erro fatal: ${error.message}`);
    logger.error(error.stack);
  }
}

// Executar
fixCouponIsGeneral()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`❌ Erro fatal: ${error.message}`);
    process.exit(1);
  });

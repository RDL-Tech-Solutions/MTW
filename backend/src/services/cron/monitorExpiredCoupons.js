import Coupon from '../../models/Coupon.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import logger from '../../config/logger.js';

/**
 * Monitorar e processar cupons expirados
 * Executa a cada 1 minuto
 */
export const monitorExpiredCoupons = async () => {
  try {
    logger.info('🔄 Verificando cupons expirados...');

    // Buscar cupons que expiraram
    const expiredCoupons = await Coupon.findExpired();

    if (!expiredCoupons || expiredCoupons.length === 0) {
      logger.info('✅ Nenhum cupom expirado encontrado');
      return;
    }

    logger.info(`📋 ${expiredCoupons.length} cupom(ns) expirado(s) encontrado(s)`);

    // Processar cada cupom expirado
    for (const coupon of expiredCoupons) {
      try {
        logger.info(`⏰ Processando cupom expirado: ${coupon.code}`);

        // Enviar notificação de cupom expirado
        await notificationDispatcher.notifyCouponExpired(coupon);

        // Desativar o cupom
        await Coupon.deactivate(coupon.id);

        logger.info(`✅ Cupom ${coupon.code} processado e desativado`);
      } catch (error) {
        logger.error(`❌ Erro ao processar cupom ${coupon.id}: ${error.message}`);
      }
    }

    logger.info('✅ Verificação de cupons expirados concluída');
  } catch (error) {
    logger.error(`❌ Erro no monitoramento de cupons expirados: ${error.message}`);
  }
};

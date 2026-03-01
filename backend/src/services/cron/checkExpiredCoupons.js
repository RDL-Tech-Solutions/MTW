import Coupon from '../../models/Coupon.js';
import Notification from '../../models/Notification.js';
import logger from '../../config/logger.js';
import { daysUntilExpiration } from '../../utils/helpers.js';
import supabase from '../../config/database.js';
import oneSignalService from '../oneSignalService.js';

export const checkExpiredCoupons = async () => {
  try {
    logger.info('🔄 Verificando cupons expirados...');

    // Desativar cupons expirados
    const expiredCount = await Coupon.deactivateExpired();
    logger.info(`${expiredCount} cupons expirados desativados`);

    // Notificar sobre cupons expirando em breve (3 dias)
    const expiringSoon = await Coupon.findExpiringSoon(3);

    for (const coupon of expiringSoon) {
      try {
        const daysLeft = daysUntilExpiration(coupon.valid_until);
        
        // Buscar usuários para notificar
        // Pode ser todos os usuários ou apenas VIPs dependendo do cupom
        const { data: users } = await supabase
          .from('users')
          .select('id, push_token')
          .not('push_token', 'is', null);

        if (users && users.length > 0) {
          // Criar notificações no banco
          const notifications = users.map(user => ({
            user_id: user.id,
            title: '⏰ Cupom Expirando!',
            message: `O cupom ${coupon.code} expira em ${daysLeft} dia(s)`,
            type: 'expiring_coupon',
            related_coupon_id: coupon.id
          }));

          const createdNotifications = await Notification.createBulk(notifications);
          logger.info(`${createdNotifications.length} notificações criadas para cupom ${coupon.code}`);

          // Enviar imediatamente via OneSignal
          try {
            const result = await oneSignalService.sendToMultiple(
              users.map(u => u.id.toString()),
              {
                title: '⏰ Cupom Expirando!',
                message: `O cupom ${coupon.code} expira em ${daysLeft} dia(s)`,
                data: {
                  type: 'expiring_coupon',
                  couponId: coupon.id,
                  screen: 'CouponDetails'
                },
                priority: daysLeft === 1 ? 'high' : 'normal'
              }
            );

            // Marcar como enviadas
            if (result.success > 0) {
              await Promise.all(
                createdNotifications.slice(0, result.success).map(n => 
                  Notification.markAsSent(n.id)
                )
              );
              logger.info(`✅ ${result.success} notificações enviadas para cupom ${coupon.code}`);
            }
          } catch (error) {
            logger.error(`❌ Erro ao enviar notificações via OneSignal: ${error.message}`);
            // Notificações ficam no banco para retry pelo cron job
          }
        }
      } catch (error) {
        logger.error(`Erro ao processar cupom ${coupon.id}: ${error.message}`);
      }
    }

    logger.info('✅ Verificação de cupons concluída');
  } catch (error) {
    logger.error(`Erro na verificação de cupons: ${error.message}`);
  }
};

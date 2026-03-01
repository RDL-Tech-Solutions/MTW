import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import oneSignalService from '../oneSignalService.js';
import logger from '../../config/logger.js';

export const sendNotifications = async () => {
  try {
    logger.info('🔄 Enviando notificações pendentes via OneSignal...');

    // Buscar notificações não enviadas
    const pendingNotifications = await Notification.findUnsent(50);

    if (pendingNotifications.length === 0) {
      logger.info('Nenhuma notificação pendente');
      return;
    }

    let sentCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Buscar usuário
        const user = await User.findById(notification.user_id);

        if (!user) {
          // Marcar como enviada mesmo sem usuário para não tentar novamente
          await Notification.markAsSent(notification.id);
          continue;
        }

        // Enviar push notification via OneSignal usando external_id (user.id)
        const result = await oneSignalService.sendToUser({
          external_id: user.id.toString(),
          title: notification.title,
          message: notification.message,
          data: {
            type: notification.type,
            productId: notification.related_product_id,
            couponId: notification.related_coupon_id,
            screen: notification.type === 'new_product' ? 'ProductDetails' : 
                    notification.type === 'new_coupon' ? 'CouponDetails' : 'Home'
          },
          priority: 'normal'
        });

        if (result.success) {
          await Notification.markAsSent(notification.id);
          sentCount++;
        }
      } catch (error) {
        logger.error(`Erro ao enviar notificação ${notification.id}: ${error.message}`);
      }
    }

    logger.info(`✅ ${sentCount} notificações enviadas via OneSignal`);
  } catch (error) {
    logger.error(`Erro no envio de notificações: ${error.message}`);
  }
};

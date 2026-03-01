import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import oneSignalService from '../oneSignalService.js';
import logger from '../../config/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 segundos

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
    let failedCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Buscar usuário
        const user = await User.findById(notification.user_id);

        if (!user) {
          logger.warn(`Usuário não encontrado para notificação ${notification.id}`);
          // Marcar como enviada mesmo sem usuário para não tentar novamente
          await Notification.markAsSent(notification.id);
          continue;
        }

        // Tentar enviar com retry
        const result = await sendWithRetry(notification, user);

        if (result.success) {
          await Notification.markAsSent(notification.id);
          sentCount++;
          logger.info(`✅ Notificação ${notification.id} enviada para usuário ${user.id}`);
        } else {
          failedCount++;
          logger.error(`❌ Falha ao enviar notificação ${notification.id} após ${MAX_RETRIES} tentativas`);
        }
      } catch (error) {
        failedCount++;
        logger.error(`Erro ao processar notificação ${notification.id}: ${error.message}`);
      }
    }

    logger.info(`✅ ${sentCount} notificações enviadas, ${failedCount} falharam`);
  } catch (error) {
    logger.error(`Erro no envio de notificações: ${error.message}`);
  }
};

// Função auxiliar para enviar com retry
async function sendWithRetry(notification, user, attempt = 1) {
  try {
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
                notification.type === 'new_coupon' ? 'CouponDetails' : 
                notification.type === 'price_drop' ? 'ProductDetails' :
                notification.type === 'expiring_coupon' ? 'CouponDetails' : 'Home'
      },
      priority: notification.type === 'price_drop' ? 'high' : 'normal'
    });

    if (result.success) {
      return { success: true };
    }

    // Se falhou e ainda tem tentativas, retry
    if (attempt < MAX_RETRIES) {
      logger.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendWithRetry(notification, user, attempt + 1);
    }

    return { success: false, error: result.error };
  } catch (error) {
    // Se falhou e ainda tem tentativas, retry
    if (attempt < MAX_RETRIES) {
      logger.warn(`⚠️ Tentativa ${attempt} falhou com erro: ${error.message}, tentando novamente...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendWithRetry(notification, user, attempt + 1);
    }

    return { success: false, error: error.message };
  }
}

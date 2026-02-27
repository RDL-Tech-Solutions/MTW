import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import pushNotificationService from '../pushNotificationWrapper.js';
import logger from '../../config/logger.js';

export const sendNotifications = async () => {
  try {
    logger.info('🔄 Enviando notificações pendentes...');

    // Buscar notificações não enviadas
    const pendingNotifications = await Notification.findUnsent(50);

    if (pendingNotifications.length === 0) {
      logger.info('Nenhuma notificação pendente');
      return;
    }

    let sentCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Buscar usuário com push token
        const user = await User.findById(notification.user_id);

        if (!user || !user.push_token) {
          // Marcar como enviada mesmo sem token para não tentar novamente
          await Notification.markAsSent(notification.id);
          continue;
        }

        // Enviar push notification
        const sent = await pushNotificationService.sendToUser(
          user.push_token,
          notification
        );

        if (sent) {
          await Notification.markAsSent(notification.id);
          sentCount++;
        }
      } catch (error) {
        logger.error(`Erro ao enviar notificação ${notification.id}: ${error.message}`);
      }
    }

    logger.info(`✅ ${sentCount} notificações enviadas`);
  } catch (error) {
    logger.error(`Erro no envio de notificações: ${error.message}`);
  }
};

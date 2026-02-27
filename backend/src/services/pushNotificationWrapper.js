import logger from '../config/logger.js';
import oneSignalService from './oneSignalService.js';
import expoPushService from './pushNotification.js';

/**
 * Wrapper para gerenciar a transição entre Expo Notifications e OneSignal
 * 
 * Este serviço permite usar ambos os sistemas simultaneamente durante
 * a migração, com fallback automático e feature flags.
 * 
 * Após a migração completa, este wrapper pode ser removido e substituído
 * diretamente pelo oneSignalService.
 */
class PushNotificationWrapper {
  constructor() {
    this.useOneSignal = process.env.ONESIGNAL_ENABLED === 'true';
    this.useExpoFallback = process.env.EXPO_NOTIFICATIONS_FALLBACK === 'true';
    
    logger.info('📱 Push Notification Wrapper inicializado');
    logger.info(`   OneSignal: ${this.useOneSignal ? 'ATIVADO' : 'DESATIVADO'}`);
    logger.info(`   Expo Fallback: ${this.useExpoFallback ? 'ATIVADO' : 'DESATIVADO'}`);
  }

  /**
   * Determinar qual serviço usar
   */
  getService() {
    if (this.useOneSignal && oneSignalService.isEnabled()) {
      return 'onesignal';
    }
    
    if (this.useExpoFallback) {
      return 'expo';
    }

    // Default: OneSignal
    return 'onesignal';
  }

  /**
   * Enviar notificação para um usuário
   * 
   * @param {string} userIdOrToken - ID do usuário (OneSignal) ou push token (Expo)
   * @param {Object} notification - Dados da notificação
   * @returns {Promise<boolean>} Sucesso do envio
   */
  async sendToUser(userIdOrToken, notification) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        // OneSignal espera external_id
        const result = await oneSignalService.sendToUser({
          external_id: userIdOrToken.toString(),
          title: notification.title || 'Nova Notificação',
          message: notification.message || notification.body || '',
          data: {
            type: notification.type || 'general',
            productId: notification.related_product_id || notification.productId,
            couponId: notification.related_coupon_id || notification.couponId,
            screen: notification.screen,
            ...notification.data
          },
          priority: notification.priority || 'normal',
          badge: notification.badge,
          subtitle: notification.subtitle
        });

        return result.success;
      } else {
        // Expo espera push token
        return await expoPushService.sendToUser(userIdOrToken, notification);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificação (${service}): ${error.message}`);
      
      // Tentar fallback se configurado
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.sendToUser(userIdOrToken, notification);
        } catch (fallbackError) {
          logger.error(`❌ Fallback também falhou: ${fallbackError.message}`);
          return false;
        }
      }

      return false;
    }
  }

  /**
   * Enviar notificação para múltiplos usuários
   * 
   * @param {Array} usersOrMessages - Array de usuários ou mensagens
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendToMultiple(usersOrMessages) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        // Converter formato Expo para OneSignal se necessário
        if (Array.isArray(usersOrMessages) && usersOrMessages[0]?.to) {
          // Formato Expo: array de mensagens com 'to' (push token)
          // Não podemos usar diretamente, precisamos de external_ids
          logger.warn('⚠️ Formato Expo detectado, mas OneSignal está ativo. Use sendToMultiple com external_ids.');
          return { success: 0, failed: usersOrMessages.length };
        }

        // Assumir que são external_ids
        // Este método será chamado pelos métodos específicos (notifyNewCoupon, etc)
        // que já passam os dados corretos
        return { success: 0, failed: 0 };
      } else {
        return await expoPushService.sendToMultiple(usersOrMessages);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificações em massa (${service}): ${error.message}`);
      return { success: 0, failed: usersOrMessages.length };
    }
  }

  /**
   * Notificação de novo cupom
   */
  async notifyNewCoupon(users, coupon) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalService.notifyNewCoupon(users, coupon);
      } else {
        return await expoPushService.notifyNewCoupon(users, coupon);
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar novo cupom (${service}): ${error.message}`);
      
      // Tentar fallback
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.notifyNewCoupon(users, coupon);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: 0, failed: users.length };
        }
      }

      return { success: 0, failed: users.length };
    }
  }

  /**
   * Notificação de queda de preço
   */
  async notifyPriceDrop(users, product, oldPrice, newPrice) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalService.notifyPriceDrop(users, product, oldPrice, newPrice);
      } else {
        return await expoPushService.notifyPriceDrop(users, product, oldPrice, newPrice);
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar queda de preço (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.notifyPriceDrop(users, product, oldPrice, newPrice);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: 0, failed: users.length };
        }
      }

      return { success: 0, failed: users.length };
    }
  }

  /**
   * Notificação de cupom expirando
   */
  async notifyExpiringCoupon(users, coupon, daysLeft) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalService.notifyExpiringCoupon(users, coupon, daysLeft);
      } else {
        return await expoPushService.notifyExpiringCoupon(users, coupon, daysLeft);
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar cupom expirando (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.notifyExpiringCoupon(users, coupon, daysLeft);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: 0, failed: users.length };
        }
      }

      return { success: 0, failed: users.length };
    }
  }

  /**
   * Notificação de nova promoção
   */
  async notifyNewPromo(users, product) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalService.notifyNewPromo(users, product);
      } else {
        return await expoPushService.notifyNewPromo(users, product);
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar nova promoção (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.notifyNewPromo(users, product);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: 0, failed: users.length };
        }
      }

      return { success: 0, failed: users.length };
    }
  }

  /**
   * Notificação personalizada
   */
  async sendCustomNotification(users, title, body, data = {}, options = {}) {
    const service = this.getService();

    try {
      if (service === 'onesignal') {
        return await oneSignalService.sendCustomNotification(users, title, body, data, options);
      } else {
        return await expoPushService.sendCustomNotification(users, title, body, data, options);
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificação personalizada (${service}): ${error.message}`);
      
      if (service === 'onesignal' && this.useExpoFallback) {
        logger.info('🔄 Tentando fallback para Expo...');
        try {
          return await expoPushService.sendCustomNotification(users, title, body, data, options);
        } catch (fallbackError) {
          logger.error(`❌ Fallback falhou: ${fallbackError.message}`);
          return { success: 0, failed: users.length };
        }
      }

      return { success: 0, failed: users.length };
    }
  }

  /**
   * Criar mensagem formatada (compatibilidade com Expo)
   */
  createMessage(pushToken, title, body, data = {}, options = {}) {
    const service = this.getService();

    if (service === 'onesignal') {
      // OneSignal não usa este formato, mas mantemos para compatibilidade
      return {
        external_id: pushToken,
        title,
        message: body,
        data,
        ...options
      };
    } else {
      return expoPushService.createMessage(pushToken, title, body, data, options);
    }
  }

  /**
   * Validar push token (compatibilidade com Expo)
   */
  isValidPushToken(token) {
    const service = this.getService();

    if (service === 'onesignal') {
      // OneSignal usa external_id, não push token
      // Validar se é um ID válido
      return token && (typeof token === 'string' || typeof token === 'number');
    } else {
      return expoPushService.isValidPushToken(token);
    }
  }
}

export default new PushNotificationWrapper();

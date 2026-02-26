import axios from 'axios';
import logger from '../config/logger.js';
import { EXTERNAL_APIS } from '../config/constants.js';
import AppSettings from '../models/AppSettings.js';

class PushNotificationService {
  constructor() {
    this.expoApiUrl = EXTERNAL_APIS.EXPO_PUSH;
    this.accessToken = process.env.EXPO_ACCESS_TOKEN;
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getExpoConfig();
      this.accessToken = config.accessToken || this.accessToken;
      this.settingsLoaded = true;
      logger.info('✅ Configurações do Expo carregadas');
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações do Expo: ${error.message}`);
    }
  }

  /**
   * Validar token do Expo Push
   */
  isValidPushToken(token) {
    if (!token || typeof token !== 'string') return false;
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Enviar notificação para um usuário
   */
  async sendToUser(pushToken, notification) {
    try {
      if (!this.isValidPushToken(pushToken)) {
        logger.warn(`⚠️ Token inválido: ${pushToken}`);
        return false;
      }

      const message = {
        to: pushToken,
        sound: 'default',
        title: notification.title || 'Nova Notificação',
        body: notification.message || notification.body || '',
        data: {
          type: notification.type || 'general',
          productId: notification.related_product_id || notification.productId,
          couponId: notification.related_coupon_id || notification.couponId,
          screen: notification.screen,
          ...notification.data
        },
        priority: 'high',
        channelId: 'default',
        badge: notification.badge || 1,
        ttl: notification.ttl || 3600, // 1 hora
      };

      const response = await axios.post(this.expoApiUrl, message, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
        },
        timeout: 10000
      });

      const result = response.data.data?.[0];
      
      if (result?.status === 'error') {
        logger.error(`❌ Erro ao enviar push: ${result.message} (${result.details?.error})`);
        return false;
      }

      if (result?.status === 'ok') {
        logger.info(`✅ Push enviada com sucesso: ${pushToken.substring(0, 30)}...`);
        return true;
      }

      return false;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        logger.error('❌ Timeout ao enviar push notification');
      } else {
        logger.error(`❌ Erro ao enviar push: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Enviar notificação para múltiplos usuários (batch)
   */
  async sendToMultiple(messages) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        logger.warn('⚠️ Nenhuma mensagem para enviar');
        return { success: 0, failed: 0 };
      }

      // Filtrar tokens válidos
      const validMessages = messages.filter(msg => this.isValidPushToken(msg.to));
      
      if (validMessages.length === 0) {
        logger.warn('⚠️ Nenhum token válido encontrado');
        return { success: 0, failed: messages.length };
      }

      // Enviar em lotes de 100 (limite do Expo)
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < validMessages.length; i += batchSize) {
        batches.push(validMessages.slice(i, i + batchSize));
      }

      let successCount = 0;
      let failedCount = 0;

      for (const batch of batches) {
        try {
          const response = await axios.post(this.expoApiUrl, batch, {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
              ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
            },
            timeout: 15000
          });

          const results = response.data.data || [];
          results.forEach(result => {
            if (result.status === 'ok') {
              successCount++;
            } else {
              failedCount++;
              logger.warn(`⚠️ Falha ao enviar: ${result.message}`);
            }
          });
        } catch (error) {
          logger.error(`❌ Erro no batch: ${error.message}`);
          failedCount += batch.length;
        }
      }

      logger.info(`📊 Push notifications: ${successCount} enviadas, ${failedCount} falharam`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      logger.error(`❌ Erro ao enviar push em massa: ${error.message}`);
      return { success: 0, failed: messages.length };
    }
  }

  /**
   * Criar mensagem formatada
   */
  createMessage(pushToken, title, body, data = {}, options = {}) {
    return {
      to: pushToken,
      sound: options.sound || 'default',
      title,
      body,
      data,
      priority: options.priority || 'high',
      channelId: options.channelId || 'default',
      badge: options.badge || 1,
      ttl: options.ttl || 3600,
      ...(options.subtitle && { subtitle: options.subtitle }),
      ...(options.categoryId && { categoryId: options.categoryId }),
    };
  }

  /**
   * Notificação de novo cupom
   */
  async notifyNewCoupon(users, coupon) {
    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '🎉 Novo Cupom Disponível!',
        `${coupon.code} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'} OFF`,
        { 
          type: 'new_coupon', 
          couponId: coupon.id,
          screen: 'CouponDetails',
          code: coupon.code
        },
        { categoryId: 'coupon' }
      )
    );

    return await this.sendToMultiple(messages);
  }

  /**
   * Notificação de queda de preço
   */
  async notifyPriceDrop(users, product, oldPrice, newPrice) {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '💰 Preço Caiu!',
        `${product.name} - De R$ ${oldPrice.toFixed(2)} por R$ ${newPrice.toFixed(2)} (-${discount}%)`,
        { 
          type: 'price_drop', 
          productId: product.id,
          screen: 'ProductDetails',
          oldPrice,
          newPrice,
          discount
        },
        { categoryId: 'price_alert' }
      )
    );

    return await this.sendToMultiple(messages);
  }

  /**
   * Notificação de cupom expirando
   */
  async notifyExpiringCoupon(users, coupon, daysLeft) {
    const urgency = daysLeft === 1 ? '⚠️' : '⏰';
    const dayText = daysLeft === 1 ? 'amanhã' : `em ${daysLeft} dias`;

    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        `${urgency} Cupom Expirando!`,
        `${coupon.code} expira ${dayText}. Use agora!`,
        { 
          type: 'expiring_coupon', 
          couponId: coupon.id,
          screen: 'CouponDetails',
          daysLeft
        },
        { 
          categoryId: 'coupon',
          priority: daysLeft === 1 ? 'high' : 'default'
        }
      )
    );

    return await this.sendToMultiple(messages);
  }

  /**
   * Notificação de nova promoção
   */
  async notifyNewPromo(users, product) {
    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '🔥 Nova Promoção!',
        `${product.name} com ${product.discount_percentage}% OFF - R$ ${product.current_price.toFixed(2)}`,
        { 
          type: 'new_promo', 
          productId: product.id,
          screen: 'ProductDetails',
          discount: product.discount_percentage
        },
        { categoryId: 'promo' }
      )
    );

    return await this.sendToMultiple(messages);
  }

  /**
   * Notificação personalizada
   */
  async sendCustomNotification(users, title, body, data = {}, options = {}) {
    const messages = users.map(user =>
      this.createMessage(user.push_token, title, body, data, options)
    );

    return await this.sendToMultiple(messages);
  }
}

export default new PushNotificationService();

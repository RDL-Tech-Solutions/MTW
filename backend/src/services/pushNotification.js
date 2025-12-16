import axios from 'axios';
import logger from '../config/logger.js';
import { EXTERNAL_APIS } from '../config/constants.js';
import AppSettings from '../models/AppSettings.js';

class PushNotificationService {
  constructor() {
    this.expoApiUrl = EXTERNAL_APIS.EXPO_PUSH;
    // Inicializar com valores do .env (fallback)
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
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações do Expo do banco: ${error.message}`);
    }
  }

  // Enviar notificação para um usuário
  async sendToUser(pushToken, notification) {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.message,
        data: {
          type: notification.type,
          productId: notification.related_product_id,
          couponId: notification.related_coupon_id
        },
        priority: 'high',
        channelId: 'default'
      };

      const response = await axios.post(this.expoApiUrl, message, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
        }
      });

      if (response.data.data && response.data.data[0].status === 'error') {
        logger.error(`Erro ao enviar push: ${response.data.data[0].message}`);
        return false;
      }

      logger.info(`Push notification enviada: ${pushToken}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao enviar push notification: ${error.message}`);
      return false;
    }
  }

  // Enviar notificação para múltiplos usuários
  async sendToMultiple(messages) {
    try {
      const response = await axios.post(this.expoApiUrl, messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
        }
      });

      logger.info(`${messages.length} push notifications enviadas`);
      return response.data;
    } catch (error) {
      logger.error(`Erro ao enviar push notifications em massa: ${error.message}`);
      return null;
    }
  }

  // Criar mensagem formatada
  createMessage(pushToken, title, body, data = {}) {
    return {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default'
    };
  }

  // Notificação de novo cupom
  async notifyNewCoupon(users, coupon) {
    const messages = users.map(user => 
      this.createMessage(
        user.push_token,
        '🎉 Novo Cupom Disponível!',
        `Cupom ${coupon.code} com ${coupon.discount_value}% de desconto`,
        { type: 'new_coupon', couponId: coupon.id }
      )
    );

    return await this.sendToMultiple(messages);
  }

  // Notificação de queda de preço
  async notifyPriceDrop(users, product, oldPrice, newPrice) {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    
    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '💰 Preço Caiu!',
        `${product.name} agora por R$ ${newPrice.toFixed(2)} (-${discount}%)`,
        { type: 'price_drop', productId: product.id }
      )
    );

    return await this.sendToMultiple(messages);
  }

  // Notificação de cupom expirando
  async notifyExpiringCoupon(users, coupon, daysLeft) {
    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '⏰ Cupom Expirando!',
        `O cupom ${coupon.code} expira em ${daysLeft} dia(s)`,
        { type: 'expiring_coupon', couponId: coupon.id }
      )
    );

    return await this.sendToMultiple(messages);
  }

  // Notificação de nova promoção
  async notifyNewPromo(users, product) {
    const messages = users.map(user =>
      this.createMessage(
        user.push_token,
        '🔥 Nova Promoção!',
        `${product.name} com ${product.discount_percentage}% OFF`,
        { type: 'new_promo', productId: product.id }
      )
    );

    return await this.sendToMultiple(messages);
  }
}

export default new PushNotificationService();

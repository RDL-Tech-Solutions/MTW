import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';

class PublishService {
  /**
   * Publicar produto no app mobile
   * (O produto já está no banco, o app consome via API /products)
   */
  async publishToApp(product) {
    try {
      logger.info(`📱 Produto ${product.id} já disponível no app via API /products`);
      return true;
    } catch (error) {
      logger.error(`❌ Erro ao publicar no app: ${error.message}`);
      return false;
    }
  }

  /**
   * Enviar notificação push (se implementado)
   */
  async notifyPush(product) {
    try {
      // TODO: Implementar push notifications
      // Exemplo com Firebase Cloud Messaging:
      // await admin.messaging().send({
      //   notification: {
      //     title: '🔥 Nova Promoção!',
      //     body: `${product.name} - ${product.discount_percentage}% OFF`
      //   },
      //   topic: 'new-promotions'
      // });

      logger.info(`🔔 Push notification: ${product.name}`);
      return true;
    } catch (error) {
      logger.error(`❌ Erro ao enviar push: ${error.message}`);
      return false;
    }
  }

  /**
   * Enviar para Telegram Bot
   */
  async notifyTelegramBot(product) {
    try {
      const message = this.formatBotMessage(product);
      await notificationDispatcher.sendToTelegram(message, product);
      logger.info(`📨 Telegram notificado: ${product.name}`);
      return true;
    } catch (error) {
      logger.error(`❌ Erro ao enviar para Telegram: ${error.message}`);
      return false;
    }
  }

  /**
   * Enviar para WhatsApp Bot
   */
  async notifyWhatsAppBot(product) {
    try {
      const message = this.formatBotMessage(product);
      await notificationDispatcher.sendToWhatsApp(message, product);
      logger.info(`📨 WhatsApp notificado: ${product.name}`);
      return true;
    } catch (error) {
      logger.error(`❌ Erro ao enviar para WhatsApp: ${error.message}`);
      return false;
    }
  }

  /**
   * Formatar mensagem para bots
   */
  formatBotMessage(product) {
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.current_price);

    const oldPriceFormatted = product.old_price ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.old_price) : null;

    return `🔥 *NOVA PROMOÇÃO AUTOMÁTICA*\n\n` +
      `📦 ${product.name}\n\n` +
      `💰 *${priceFormatted}*${oldPriceFormatted ? ` ~${oldPriceFormatted}~` : ''}\n` +
      `🏷️ *${product.discount_percentage}% OFF*\n\n` +
      `🛒 Plataforma: ${product.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}\n\n` +
      `🔗 ${product.affiliate_link}`;
  }

  /**
   * Publicar e notificar tudo
   */
  async publishAll(product) {
    const results = {
      app: false,
      push: false,
      telegram: false,
      whatsapp: false
    };

    try {
      // Publicar no app (já está no banco)
      results.app = await this.publishToApp(product);

      // Push notification
      results.push = await this.notifyPush(product);

      // Telegram
      results.telegram = await this.notifyTelegramBot(product);

      // WhatsApp
      results.whatsapp = await this.notifyWhatsAppBot(product);

      const success = results.telegram || results.whatsapp;
      
      logger.info(`✅ Publicação completa: ${product.name}`, results);
      
      return {
        success,
        results
      };
    } catch (error) {
      logger.error(`❌ Erro na publicação completa: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }
}

export default new PublishService();

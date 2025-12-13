import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import templateRenderer from '../bots/templateRenderer.js';

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
      const message = await this.formatBotMessage(product, 'telegram');
      const result = await notificationDispatcher.sendToTelegram(message, product);
      
      if (result.success && result.sent > 0) {
        logger.info(`📨 Telegram notificado: ${product.name} (${result.sent} canal(is))`);
        return true;
      } else {
        logger.warn(`⚠️ Telegram: nenhuma mensagem enviada para ${product.name}. Canais: ${result.total || 0}, Enviados: ${result.sent || 0}`);
        return false;
      }
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
      const message = await this.formatBotMessage(product, 'whatsapp');
      const result = await notificationDispatcher.sendToWhatsApp(message, product);
      
      if (result.success && result.sent > 0) {
        logger.info(`📨 WhatsApp notificado: ${product.name} (${result.sent} canal(is))`);
        return true;
      } else {
        logger.warn(`⚠️ WhatsApp: nenhuma mensagem enviada para ${product.name}. Canais: ${result.total || 0}, Enviados: ${result.sent || 0}`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar para WhatsApp: ${error.message}`);
      return false;
    }
  }

  /**
   * Escapar caracteres especiais do Markdown
   * @param {string} text - Texto para escapar
   * @returns {string}
   */
  escapeMarkdown(text) {
    if (!text) return '';
    return String(text)
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }

  /**
   * Formatar mensagem para bots usando templates
   * @param {Object} product - Dados do produto
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @returns {Promise<string>}
   */
  async formatBotMessage(product, platform = 'telegram') {
    try {
      // Preparar variáveis do template
      const variables = await templateRenderer.preparePromotionVariables(product);
      
      // Renderizar template
      const message = await templateRenderer.render('new_promotion', platform, variables);
      
      return message;
    } catch (error) {
      logger.error(`Erro ao formatar mensagem com template: ${error.message}`);
      // Fallback para formato antigo
      return this.formatBotMessageFallback(product);
    }
  }

  /**
   * Formato de fallback caso template falhe
   * @param {Object} product - Dados do produto
   * @returns {string}
   */
  formatBotMessageFallback(product) {
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.current_price);

    const oldPriceFormatted = product.old_price ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.old_price) : null;

    const productName = this.escapeMarkdown(product.name);
    const platformName = product.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee';
    
    let message = `🔥 *NOVA PROMOÇÃO AUTOMÁTICA*\n\n`;
    message += `📦 ${productName}\n\n`;
    message += `💰 *${priceFormatted}*`;
    if (oldPriceFormatted) {
      message += ` ~${oldPriceFormatted}~`;
    }
    message += `\n`;
    message += `🏷️ *${product.discount_percentage || 0}% OFF*\n\n`;
    message += `🛒 Plataforma: ${platformName}\n\n`;
    message += `🔗 ${product.affiliate_link || 'Link não disponível'}`;

    return message;
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

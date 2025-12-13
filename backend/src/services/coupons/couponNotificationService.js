import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import templateRenderer from '../bots/templateRenderer.js';
import Notification from '../../models/Notification.js';
import supabase from '../../config/database.js';

class CouponNotificationService {
  /**
   * Formatar mensagem de novo cupom
   */
  formatNewCouponMessage(coupon) {
    const emoji = this.getPlatformEmoji(coupon.platform);
    const discount = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    return `
🔥 *CUPOM NOVO DISPONÍVEL* 🔥

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
💰 *Desconto:* ${discount} OFF
📅 *Válido até:* ${this.formatDate(coupon.valid_until)}
${coupon.min_purchase > 0 ? `💳 *Compra mínima:* R$ ${coupon.min_purchase.toFixed(2)}` : ''}

📝 *${coupon.title}*
${coupon.description ? `\n${coupon.description}` : ''}

👉 *Link com desconto:*
${coupon.affiliate_link || 'Link não disponível'}

⚡ Aproveite antes que expire!
    `.trim();
  }

  /**
   * Formatar mensagem de cupom expirado
   */
  formatExpiredCouponMessage(coupon) {
    const emoji = this.getPlatformEmoji(coupon.platform);

    return `
⚠️ *CUPOM EXPIROU* ⚠️

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
📅 *Expirado em:* ${this.formatDate(coupon.valid_until)}

😢 Infelizmente este cupom não está mais disponível.
Fique de olho para novos cupons!
    `.trim();
  }

  /**
   * Formatar mensagem de cupom expirando
   */
  formatExpiringCouponMessage(coupon, daysLeft) {
    const emoji = this.getPlatformEmoji(coupon.platform);
    const discount = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    return `
⏰ *CUPOM EXPIRANDO EM ${daysLeft} DIA(S)* ⏰

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
💰 *Desconto:* ${discount} OFF
📅 *Expira em:* ${this.formatDate(coupon.valid_until)}

👉 *Link:*
${coupon.affiliate_link || 'Link não disponível'}

⚡ Última chance! Não perca!
    `.trim();
  }

  /**
   * Notificar novo cupom
   */
  async notifyNewCoupon(coupon) {
    try {
      logger.info(`📢 Enviando notificação de novo cupom: ${coupon.code}`);

      // Preparar variáveis do template
      const variables = templateRenderer.prepareCouponVariables(coupon);

      // Renderizar templates para cada plataforma
      const whatsappMessage = await templateRenderer.render('new_coupon', 'whatsapp', variables);
      const telegramMessage = await templateRenderer.render('new_coupon', 'telegram', variables);

      // Enviar para WhatsApp
      try {
        await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_update');
        logger.info('✅ Notificação WhatsApp enviada');
      } catch (error) {
        logger.error(`Erro ao enviar WhatsApp: ${error.message}`);
      }

      // Enviar para Telegram
      try {
        await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_update');
        logger.info('✅ Notificação Telegram enviada');
      } catch (error) {
        logger.error(`Erro ao enviar Telegram: ${error.message}`);
      }

      // Criar notificações push para usuários
      await this.createPushNotifications(coupon, 'new_coupon');

      return {
        success: true,
        message: 'Notificações enviadas'
      };

    } catch (error) {
      logger.error(`Erro ao notificar novo cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notificar cupom expirado
   */
  async notifyExpiredCoupon(coupon) {
    try {
      logger.info(`📢 Enviando notificação de cupom expirado: ${coupon.code}`);

      // Preparar variáveis do template
      const variables = templateRenderer.prepareExpiredCouponVariables(coupon);

      // Renderizar templates para cada plataforma
      const whatsappMessage = await templateRenderer.render('expired_coupon', 'whatsapp', variables);
      const telegramMessage = await templateRenderer.render('expired_coupon', 'telegram', variables);

      // Enviar para WhatsApp
      try {
        await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_expired');
        logger.info('✅ Notificação WhatsApp enviada');
      } catch (error) {
        logger.error(`Erro ao enviar WhatsApp: ${error.message}`);
      }

      // Enviar para Telegram
      try {
        await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_expired');
        logger.info('✅ Notificação Telegram enviada');
      } catch (error) {
        logger.error(`Erro ao enviar Telegram: ${error.message}`);
      }

      return {
        success: true,
        message: 'Notificações enviadas'
      };

    } catch (error) {
      logger.error(`Erro ao notificar cupom expirado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notificar cupom expirando
   */
  async notifyExpiringCoupon(coupon, daysLeft) {
    try {
      logger.info(`📢 Enviando notificação de cupom expirando: ${coupon.code}`);

      const message = this.formatExpiringCouponMessage(coupon, daysLeft);

      // Enviar para bots
      await notificationDispatcher.sendToWhatsApp(message, 'coupon_expiring');
      await notificationDispatcher.sendToTelegram(message, 'coupon_expiring');

      // Criar notificações push
      await this.createPushNotifications(coupon, 'expiring_coupon');

      return {
        success: true,
        message: 'Notificações enviadas'
      };

    } catch (error) {
      logger.error(`Erro ao notificar cupom expirando: ${error.message}`);
      throw error;
    }
  }

  /**
   * Criar notificações push para usuários
   */
  async createPushNotifications(coupon, type) {
    try {
      // Buscar usuários com push token
      const { data: users, error } = await supabase
        .from('users')
        .select('id, push_token')
        .not('push_token', 'is', null);

      if (error) throw error;

      if (!users || users.length === 0) {
        logger.info('Nenhum usuário com push token encontrado');
        return;
      }

      // Criar notificações em lote
      const notifications = users.map(user => ({
        user_id: user.id,
        title: type === 'new_coupon' ? '🔥 Novo Cupom Disponível!' : '⏰ Cupom Expirando!',
        message: `${coupon.code} - ${coupon.discount_value}% OFF em ${this.getPlatformName(coupon.platform)}`,
        type,
        related_coupon_id: coupon.id
      }));

      await Notification.createBulk(notifications);
      logger.info(`✅ ${notifications.length} notificações push criadas`);

    } catch (error) {
      logger.error(`Erro ao criar notificações push: ${error.message}`);
    }
  }

  /**
   * Obter emoji da plataforma
   */
  getPlatformEmoji(platform) {
    const emojis = {
      shopee: '🛍️',
      mercadolivre: '🛒',
      amazon: '📦',
      aliexpress: '🌐',
      general: '🎁'
    };
    return emojis[platform] || '🎟️';
  }

  /**
   * Obter nome formatado da plataforma
   */
  getPlatformName(platform) {
    const names = {
      shopee: 'Shopee',
      mercadolivre: 'Mercado Livre',
      amazon: 'Amazon',
      aliexpress: 'AliExpress',
      general: 'Geral'
    };
    return names[platform] || platform;
  }

  /**
   * Formatar data
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new CouponNotificationService();

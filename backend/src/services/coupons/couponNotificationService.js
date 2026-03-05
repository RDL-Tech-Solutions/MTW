import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import templateRenderer from '../bots/templateRenderer.js';
import imageGenerator from '../bots/imageGenerator.js';
import Notification from '../../models/Notification.js';
import supabase from '../../config/database.js';
import AppSettings from '../../models/AppSettings.js';
import fcmService from '../fcmService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
   * Notificar novo cupom (com imagem)
   */
  async notifyNewCoupon(coupon, options = {}) {
    try {
      logger.info(`📢 Notificando cupom: ${coupon.code} (${coupon.platform})`);

      // Verificar duplicação (exceto se manual)
      if (!options.manual) {
        const Coupon = (await import('../../models/Coupon.js')).default;
        const hasPublished = await Coupon.hasPublishedCouponWithCode(coupon.code, coupon.id);

        if (hasPublished) {
          logger.warn(`⚠️ Cupom ${coupon.code} já publicado - bloqueado`);
          return {
            success: false,
            message: 'Cupom já publicado anteriormente',
            code: coupon.code,
            duplicate: true
          };
        }
      }

      // Preparar variáveis e renderizar templates
      const variables = templateRenderer.prepareCouponVariables(coupon);
      const contextData = { coupon };

      let whatsappMessage = await templateRenderer.render('new_coupon', 'whatsapp', variables, contextData);
      let telegramMessage = await templateRenderer.render('new_coupon', 'telegram', variables, contextData);

      // Formatar código do cupom para Telegram
      const couponCode = variables.coupon_code || coupon.code || '';
      if (couponCode && couponCode !== 'N/A') {
        const hasCodeFormat = telegramMessage.includes(`\`${couponCode}\``) ||
          telegramMessage.includes(`<code>${couponCode}</code>`) ||
          telegramMessage.match(new RegExp(`[<\\\`]${couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[>\\\`]`));

        if (!hasCodeFormat) {
          const escapedCode = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'g');
          telegramMessage = telegramMessage.replace(codeRegex, `<code>${couponCode}</code>`);
        }
      }

      // IMPORTANTE: Sempre usar logo da plataforma quando disponível (similar ao produto)
      let imageToSend = null;
      let imageUrlForWhatsApp = null;
      let usePlatformLogo = false;

      // Verificar se a plataforma tem logo padrão
      const platformLogos = {
        mercadolivre: 'mercadolivre-logo.png',
        shopee: 'shopee-logo.png',
        aliexpress: 'aliexpress-logo.png',
        amazon: 'amazon-logo.png'
      };

      const logoFileName = platformLogos[coupon.platform];

      if (logoFileName) {
        const logoPath = path.join(__dirname, '../../../assets/logos', logoFileName);
        const absoluteLogoPath = path.resolve(logoPath);

        try {
          await fs.access(absoluteLogoPath);
          const stats = await fs.stat(absoluteLogoPath);
          
          if (stats.isFile() && stats.size > 0) {
            imageToSend = absoluteLogoPath;
            usePlatformLogo = true;

            // Para WhatsApp, usar arquivo local (mais confiável e rápido)
            // Arquivo local evita timeouts e problemas de URL inacessível
            imageUrlForWhatsApp = null;
          }
        } catch (logoError) {
          // Tentar caminhos alternativos
          const alternativePaths = [
            path.resolve(process.cwd(), 'assets/logos', logoFileName),
            path.resolve(process.cwd(), 'backend/assets/logos', logoFileName),
            path.resolve(__dirname, '../../../assets/logos', logoFileName),
            path.resolve(__dirname, '../../../../assets/logos', logoFileName)
          ];

          for (const altPath of alternativePaths) {
            try {
              await fs.access(altPath);
              const altStats = await fs.stat(altPath);
              if (altStats.isFile() && altStats.size > 0) {
                imageToSend = path.resolve(altPath);
                usePlatformLogo = true;
                break;
              }
            } catch (altError) {
              // Continuar tentando
            }
          }

          if (!imageToSend) {
            logger.warn(`⚠️ Logo ${logoFileName} não encontrado`);
          }
        }
      } else {
        // Para outras plataformas sem logo padrão, NÃO gerar imagem
        logger.info(`⚠️ Plataforma ${coupon.platform} não tem logo padrão em backend/assets`);
        imageToSend = null;
      }

      // Enviar para WhatsApp
      let whatsappResult = null;
      try {
        if (imageToSend) {
          if (usePlatformLogo && imageUrlForWhatsApp) {
            whatsappResult = await notificationDispatcher.sendToWhatsAppWithImage(
              whatsappMessage,
              imageUrlForWhatsApp,
              'coupon_new',
              null,
              { bypassDuplicates: !!options.manual }
            );
          } else {
            whatsappResult = await notificationDispatcher.sendToWhatsAppWithImage(
              whatsappMessage,
              imageToSend,
              'coupon_new',
              null,
              { bypassDuplicates: !!options.manual }
            );
          }
          
          if (!whatsappResult || !whatsappResult.success) {
            // Fallback: enviar apenas mensagem
            whatsappResult = await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_new', { bypassDuplicates: !!options.manual });
          }
        } else {
          whatsappResult = await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_new', { bypassDuplicates: !!options.manual });
        }
      } catch (error) {
        logger.error(`❌ Erro WhatsApp: ${error.message}`);
      }

      // Enviar para Telegram
      let telegramResult = null;
      try {
        if (imageToSend) {
          telegramResult = await notificationDispatcher.sendToTelegramWithImage(
            telegramMessage,
            imageToSend,
            'coupon_new',
            coupon,
            { bypassDuplicates: !!options.manual }
          );
          
          if (!telegramResult || !telegramResult.success) {
            // Fallback: enviar apenas mensagem
            telegramResult = await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_new', { bypassDuplicates: !!options.manual });
          }
        } else {
          telegramResult = await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_new', { bypassDuplicates: !!options.manual });
        }
      } catch (error) {
        logger.error(`❌ Erro Telegram: ${error.message}`);
      }

      // Limpar imagem temporária (se não for logo permanente)
      if (imageToSend && !usePlatformLogo) {
        try {
          await fs.unlink(imageToSend);
        } catch (cleanupError) {
          // Ignorar erro de limpeza
        }
      }

      // Criar notificações push
      await this.createPushNotifications(coupon, 'new_coupon');

      logger.info(`✅ Cupom ${coupon.code} publicado com sucesso`);

      return {
        success: true,
        message: 'Notificações enviadas',
        whatsapp: whatsappResult,
        telegram: telegramResult
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
      // Preparar variáveis do template
      const variables = templateRenderer.prepareExpiredCouponVariables(coupon);

      // Preparar contextData para IA ADVANCED
      const contextData = { coupon };

      // Renderizar templates para cada plataforma
      const whatsappMessage = await templateRenderer.render('expired_coupon', 'whatsapp', variables, contextData);
      const telegramMessage = await templateRenderer.render('expired_coupon', 'telegram', variables, contextData);

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
   * Formatar mensagem de cupom esgotado
   */
  formatOutOfStockCouponMessage(coupon) {
    const emoji = this.getPlatformEmoji(coupon.platform);

    return `
⚠️ *CUPOM ESGOTADO* ⚠️

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`

😢 Este cupom esgotou! Mas não se preocupe, novos cupons estão chegando.
Fique de olho para não perder as próximas ofertas!
    `.trim();
  }

  /**
   * Notificar cupom esgotado
   */
  async notifyOutOfStockCoupon(coupon) {
    try {
      logger.info(`⚠️ Cupom esgotado: ${coupon.code}`);

      // Usar dispatcher unificado para garantir que templates sejam usados corretamente
      const result = await notificationDispatcher.dispatch('coupon_out_of_stock', coupon, {
        manual: false,
        bypassDuplicates: false
      });

      // Criar notificações push para usuários
      await this.createPushNotifications(coupon, 'out_of_stock_coupon');

      logger.info(`✅ Notificação de cupom esgotado enviada`);

      return result;

    } catch (error) {
      logger.error(`❌ Erro ao notificar cupom esgotado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Criar notificações push para usuários via FCM
   */
  async createPushNotifications(coupon, type) {
    try {
      const notificationSegmentationService = (await import('../notificationSegmentationService.js')).default;
      const users = await notificationSegmentationService.getUsersForCoupon(coupon);

      if (!users || users.length === 0) {
        return;
      }

      // Preparar dados da notificação
      let title, message;
      
      switch (type) {
        case 'new_coupon':
          title = '🔥 Novo Cupão Disponível!';
          message = `${coupon.code} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'} OFF em ${this.getPlatformName(coupon.platform)}`;
          break;
        
        case 'expiring_coupon':
          title = '⏰ Cupão Expirando!';
          message = `${coupon.code} expira em breve! Use agora em ${this.getPlatformName(coupon.platform)}`;
          break;
        
        case 'out_of_stock_coupon':
          title = '⚠️ Cupão Esgotado';
          message = `${coupon.code} esgotou! Mas novos cupons estão chegando.`;
          break;
        
        default:
          title = '🎟️ Atualização de Cupão';
          message = `${coupon.code} - ${this.getPlatformName(coupon.platform)}`;
      }

      // Enviar notificações usando FCM
      const result = await fcmService.sendCustomNotification(
        users,
        title,
        message,
        {
          type,
          couponId: String(coupon.id),
          screen: 'CouponDetails'
        },
        {
          priority: type === 'out_of_stock_coupon' ? 'normal' : 'high'
        }
      );

      // Criar registros de notificações no banco
      const notifications = users.map(user => ({
        user_id: user.id,
        title,
        message,
        type,
        related_coupon_id: coupon.id
      }));

      await Notification.createBulk(notifications);

      logger.info(`📱 Push: ${result.total_sent || 0} enviadas, ${result.total_failed || 0} falhas`);

    } catch (error) {
      logger.error(`❌ Erro push: ${error.message}`);
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

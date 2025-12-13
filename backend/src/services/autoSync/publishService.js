import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import templateRenderer from '../bots/templateRenderer.js';
import telegramService from '../bots/telegramService.js';
import whatsappService from '../bots/whatsappService.js';

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
   * Enviar notificação push usando preferências do usuário
   */
  async notifyPush(product) {
    try {
      const Notification = (await import('../../models/Notification.js')).default;
      const NotificationPreference = (await import('../../models/NotificationPreference.js')).default;
      const User = (await import('../../models/User.js')).default;
      const pushNotificationService = (await import('../pushNotification.js')).default;

      // Buscar usuários que devem receber notificação
      const usersToNotify = [];

      // 1. Usuários que têm a categoria nas preferências
      if (product.category_id) {
        const usersByCategory = await NotificationPreference.findUsersByCategory(product.category_id);
        usersToNotify.push(...usersByCategory.map(u => u.user_id));
      }

      // 2. Usuários que têm palavra-chave nas preferências
      const productNameLower = product.name.toLowerCase();
      const words = productNameLower.split(/\s+/);
      for (const word of words) {
        if (word.length > 3) { // Ignorar palavras muito curtas
          const usersByKeyword = await NotificationPreference.findUsersByKeyword(word);
          usersToNotify.push(...usersByKeyword.map(u => u.user_id));
        }
      }

      // 3. Usuários que têm o nome do produto nas preferências
      const usersByProductName = await NotificationPreference.findUsersByProductName(product.name);
      usersToNotify.push(...usersByProductName.map(u => u.user_id));

      // Remover duplicatas
      const uniqueUserIds = [...new Set(usersToNotify)];

      if (uniqueUserIds.length === 0) {
        logger.info(`🔔 Nenhum usuário para notificar sobre: ${product.name}`);
        return true;
      }

      // Criar notificações para cada usuário
      const notifications = [];
      for (const userId of uniqueUserIds) {
        try {
          const user = await User.findById(userId);
          if (user && user.push_token) {
            notifications.push({
              user_id: userId,
              title: '🔥 Nova Promoção!',
              message: `${product.name} - ${product.discount_percentage || 0}% OFF`,
              type: 'new_product',
              related_product_id: product.id,
            });
          }
        } catch (error) {
          logger.error(`Erro ao processar usuário ${userId}: ${error.message}`);
        }
      }

      if (notifications.length === 0) {
        logger.info(`🔔 Nenhuma notificação criada para: ${product.name}`);
        return true;
      }

      // Criar notificações no banco
      const createdNotifications = await Notification.createBulk(notifications);

      // Enviar push notifications
      let sentCount = 0;
      for (const createdNotification of createdNotifications) {
        try {
          const user = await User.findById(createdNotification.user_id);
          if (user && user.push_token) {
            const sent = await pushNotificationService.sendToUser(user.push_token, createdNotification);
            if (sent) {
              await Notification.markAsSent(createdNotification.id);
              sentCount++;
            }
          }
        } catch (error) {
          logger.error(`Erro ao enviar push para usuário ${createdNotification.user_id}: ${error.message}`);
        }
      }

      logger.info(`🔔 Push notifications: ${sentCount}/${notifications.length} enviadas para: ${product.name}`);
      return sentCount > 0;
    } catch (error) {
      logger.error(`❌ Erro ao enviar push: ${error.message}`);
      return false;
    }
  }

  /**
   * Enviar para Telegram Bot (com imagem se disponível)
   */
  async notifyTelegramBot(product) {
    try {
      const message = await this.formatBotMessage(product, 'telegram');
      
      // Log detalhado sobre a imagem
      logger.info(`📸 Verificando imagem do produto: ${product.name}`);
      logger.info(`   image_url: ${product.image_url || 'NÃO DEFINIDA'}`);
      logger.info(`   image_url type: ${typeof product.image_url}`);
      logger.info(`   image_url length: ${product.image_url?.length || 0}`);
      
      // Se tiver imagem válida, enviar com foto
      const hasValidImage = product.image_url && 
          typeof product.image_url === 'string' &&
          product.image_url.trim().length > 0 &&
          (product.image_url.startsWith('http://') || product.image_url.startsWith('https://')) && 
          !product.image_url.includes('placeholder') &&
          !product.image_url.includes('data:image');
      
      logger.info(`   Imagem válida: ${hasValidImage ? 'SIM' : 'NÃO'}`);
      if (!hasValidImage) {
        logger.warn(`   Motivo: ${!product.image_url ? 'image_url não existe' : 
                              !product.image_url.startsWith('http') ? 'não começa com http' :
                              product.image_url.includes('placeholder') ? 'contém placeholder' :
                              product.image_url.includes('data:image') ? 'é data URI' : 'desconhecido'}`);
      }
      
      if (hasValidImage) {
        try {
          logger.info(`📤 Enviando imagem para Telegram: ${product.image_url.substring(0, 100)}...`);
          const result = await notificationDispatcher.sendToTelegramWithImage(
            message,
            product.image_url,
            'promotion_new'
          );
          
          logger.info(`   Resultado: ${JSON.stringify({ success: result?.success, sent: result?.sent, total: result?.total })}`);
          
          if (result && result.success && result.sent > 0) {
            logger.info(`✅ Notificação Telegram com imagem enviada para produto: ${product.name} (${result.sent} canal(is))`);
            return true;
          } else {
            logger.error(`❌ Telegram com imagem: falha no envio. Result: ${JSON.stringify(result)}`);
            // NÃO fazer fallback - se a imagem falhou, não enviar apenas mensagem
            return false;
          }
        } catch (imageError) {
          logger.error(`❌ Erro ao enviar imagem Telegram: ${imageError.message}`);
          logger.error(`   Stack: ${imageError.stack}`);
          // NÃO fazer fallback - se a imagem falhou, não enviar apenas mensagem
          return false;
        }
      } else {
        logger.error(`❌ Produto sem imagem válida. Produto: ${product.name}`);
        logger.error(`   image_url recebida: ${JSON.stringify(product.image_url)}`);
        logger.error(`   Tipo: ${typeof product.image_url}`);
        logger.error(`   Produto completo: ${JSON.stringify({ id: product.id, name: product.name, image_url: product.image_url })}`);
        // NÃO enviar mensagem sem imagem - a imagem é obrigatória
        return false;
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar Telegram: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return false;
    }
  }

  /**
   * Enviar para WhatsApp Bot (com imagem se disponível)
   */
  async notifyWhatsAppBot(product) {
    try {
      const message = await this.formatBotMessage(product, 'whatsapp');
      
      // Log detalhado sobre a imagem
      logger.info(`📸 Verificando imagem do produto (WhatsApp): ${product.name}`);
      logger.info(`   image_url: ${product.image_url || 'NÃO DEFINIDA'}`);
      
      // Se tiver imagem válida, enviar com foto
      const hasValidImage = product.image_url && 
          product.image_url.startsWith('http') && 
          !product.image_url.includes('placeholder');
      
      logger.info(`   Imagem válida: ${hasValidImage ? 'SIM' : 'NÃO'}`);
      
      if (hasValidImage) {
        try {
          logger.info(`📤 Enviando imagem para WhatsApp: ${product.image_url.substring(0, 80)}...`);
          const result = await notificationDispatcher.sendToWhatsAppWithImage(
            message,
            product.image_url,
            'promotion_new'
          );
          
          logger.info(`   Resultado: ${JSON.stringify({ success: result?.success, sent: result?.sent, total: result?.total })}`);
          
          if (result && result.success && result.sent > 0) {
            logger.info(`✅ Notificação WhatsApp com imagem enviada para produto: ${product.name} (${result.sent} canal(is))`);
            return true;
          } else {
            logger.warn(`⚠️ WhatsApp com imagem: nenhuma mensagem enviada. Tentando sem imagem...`);
          }
        } catch (imageError) {
          logger.error(`❌ Erro ao enviar imagem WhatsApp: ${imageError.message}`);
          logger.error(`   Stack: ${imageError.stack}`);
          logger.warn(`⚠️ Tentando enviar apenas mensagem sem imagem...`);
        }
      } else {
        logger.warn(`⚠️ Produto sem imagem válida, enviando apenas mensagem`);
      }
      
      // Fallback: enviar apenas mensagem
      logger.info(`📤 Enviando mensagem para WhatsApp (sem imagem)`);
      const result = await notificationDispatcher.sendToWhatsApp(message, 'promotion_new');
      
      if (result && result.success && result.sent > 0) {
        logger.info(`✅ Notificação WhatsApp enviada para produto: ${product.name} (${result.sent} canal(is))`);
        return true;
      } else {
        logger.warn(`⚠️ WhatsApp: nenhuma mensagem enviada para ${product.name}. Canais: ${result?.total || 0}, Enviados: ${result?.sent || 0}`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Erro ao notificar WhatsApp: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
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
  async formatBotMessageFallback(product) {
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.current_price);

    const oldPriceFormatted = product.old_price ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.old_price) : null;

    const productName = this.escapeMarkdown(product.name);
    const platformName = product.platform === 'mercadolivre' ? 'Mercado Livre' : 
                        product.platform === 'shopee' ? 'Shopee' :
                        product.platform === 'amazon' ? 'Amazon' :
                        product.platform === 'aliexpress' ? 'AliExpress' : 'Geral';
    
    let message = `🔥 *NOVA PROMOÇÃO!*\n\n`;
    message += `🛍 *${productName}*\n\n`;
    if (oldPriceFormatted) {
      message += `~${oldPriceFormatted}~ `;
    }
    message += `💰 *Por: ${priceFormatted}* ${product.discount_percentage || 0}% OFF\n\n`;
    message += `🛒 *Loja:* ${platformName}\n`;
    
    // Adicionar categoria se disponível
    if (product.category_id) {
      try {
        const Category = (await import('../../models/Category.js')).default;
        const category = await Category.findById(product.category_id);
        if (category) {
          message += `📦 *Categoria:* ${category.name}\n`;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar categoria no fallback: ${error.message}`);
      }
    }

    // Adicionar informações de cupom se houver
    if (product.coupon_id) {
      try {
        const Coupon = (await import('../../models/Coupon.js')).default;
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountText = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : `R$ ${coupon.discount_value.toFixed(2)}`;
          
          message += `\n🎟️ *CUPOM DISPONÍVEL*\n\n`;
          message += `💬 *Código:* \`${coupon.code}\`\n`;
          message += `💰 *Desconto:* ${discountText} OFF\n`;
          
          if (coupon.min_purchase > 0) {
            message += `💳 *Compra mínima:* R$ ${coupon.min_purchase.toFixed(2)}\n`;
          }
          
          // Aplicabilidade
          if (coupon.is_general) {
            message += `✅ *Válido para todos os produtos*\n`;
          } else {
            const productCount = coupon.applicable_products?.length || 0;
            if (productCount > 0) {
              message += `📦 *Em produtos selecionados* (${productCount} produto${productCount > 1 ? 's' : ''})\n`;
            } else {
              message += `📦 *Em produtos selecionados*\n`;
            }
          }
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom no fallback: ${error.message}`);
      }
    }

    message += `\n🔗 *Link:* ${product.affiliate_link || 'Link não disponível'}\n\n`;
    message += `⚡ Aproveite antes que acabe!`;

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

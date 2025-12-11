import axios from 'axios';
import logger from '../../config/logger.js';

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Enviar mensagem para um chat/grupo do Telegram
   * @param {string} chatId - ID do chat/grupo
   * @param {string} message - Mensagem formatada
   * @returns {Promise<Object>}
   */
  async sendMessage(chatId, message) {
    try {
      if (!this.botToken) {
        throw new Error('Telegram Bot Token não configurado. Verifique as variáveis de ambiente.');
      }

      const response = await axios.post(
        `${this.apiUrl}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        },
        {
          timeout: 10000
        }
      );

      logger.info(`✅ Mensagem Telegram enviada para chat ${chatId}`);
      return {
        success: true,
        messageId: response.data.result.message_id,
        data: response.data
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Formatar mensagem de nova promoção
   * @param {Object} promotion - Dados da promoção
   * @returns {string}
   */
  formatPromotionMessage(promotion) {
    const discount = promotion.discount_percentage 
      ? `${promotion.discount_percentage}% OFF` 
      : '';
    
    const oldPrice = promotion.old_price 
      ? `~~R$ ${promotion.old_price.toFixed(2)}~~ ` 
      : '';

    return `🔥 *Nova Promoção!*

🛍 *${promotion.name}*

${oldPrice}💰 *R$ ${promotion.current_price.toFixed(2)}* ${discount}

🏪 Loja: ${this.getPlatformName(promotion.platform)}
📦 Categoria: ${promotion.category_name || 'Geral'}

[🔗 Ver Oferta](${promotion.affiliate_link})

⚡ Aproveite antes que acabe!`;
  }

  /**
   * Formatar mensagem de novo cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {string}
   */
  formatCouponMessage(coupon) {
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% de desconto`
      : `R$ ${coupon.discount_value.toFixed(2)} de desconto`;

    const minPurchase = coupon.min_purchase > 0
      ? `\n💵 Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}`
      : '';

    const expirationDate = new Date(coupon.valid_until).toLocaleDateString('pt-BR');

    return `🎟 *Novo Cupom Disponível!*

🏪 Loja: ${this.getPlatformName(coupon.platform)}
💬 Código: \`${coupon.code}\`
💰 Benefício: ${discountText}${minPurchase}
⏳ Expira em: ${expirationDate}

${coupon.restrictions ? `⚠️ ${coupon.restrictions}\n` : ''}
🔥 Use agora e economize!`;
  }

  /**
   * Formatar mensagem de cupom expirado
   * @param {Object} coupon - Dados do cupom
   * @returns {string}
   */
  formatExpiredCouponMessage(coupon) {
    const expirationDate = new Date(coupon.valid_until).toLocaleDateString('pt-BR');

    return `❌ *Cupom Expirado*

🏪 Loja: ${this.getPlatformName(coupon.platform)}
💬 Código: \`${coupon.code}\`
⏱ Expirou em: ${expirationDate}

😔 Infelizmente este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!`;
  }

  /**
   * Obter nome amigável da plataforma
   * @param {string} platform
   * @returns {string}
   */
  getPlatformName(platform) {
    const platforms = {
      'shopee': 'Shopee',
      'mercadolivre': 'Mercado Livre',
      'general': 'Geral'
    };
    return platforms[platform] || platform;
  }

  /**
   * Enviar mensagem de teste
   * @param {string} chatId - ID do chat
   * @returns {Promise<Object>}
   */
  async sendTestMessage(chatId) {
    const message = `🤖 *Teste de Bot Telegram*

✅ Bot configurado e funcionando!
📱 Sistema MTW Promo
⏰ ${new Date().toLocaleString('pt-BR')}

Você receberá notificações automáticas sobre:
🔥 Novas promoções
🎟 Novos cupons
⏰ Cupons expirando`;

    return await this.sendMessage(chatId, message);
  }

  /**
   * Broadcast para múltiplos chats
   * @param {Array<string>} chatIds - IDs dos chats
   * @param {string} message - Mensagem
   * @returns {Promise<Array>}
   */
  async broadcastToGroups(chatIds, message) {
    const results = [];

    for (const chatId of chatIds) {
      try {
        const result = await this.sendMessage(chatId, message);
        results.push({ chatId, success: true, result });
        
        // Delay entre mensagens para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({ chatId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Obter informações do bot
   * @returns {Promise<Object>}
   */
  async getBotInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      logger.error(`❌ Erro ao obter informações do bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar se o bot está configurado corretamente
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    try {
      await this.getBotInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new TelegramService();

import axios from 'axios';
import logger from '../../config/logger.js';
import Category from '../../models/Category.js';
import BotConfig from '../../models/BotConfig.js';

class WhatsAppService {
  constructor() {
    // Configurações serão buscadas dinamicamente do banco de dados
    this.apiUrl = null;
    this.apiToken = null;
    this.phoneNumberId = null;
  }

  /**
   * Buscar configurações do banco de dados e atualizar
   */
  async loadConfig() {
    try {
      const config = await BotConfig.get();
      // Usar APENAS configurações do banco de dados
      this.apiUrl = config.whatsapp_api_url;
      this.apiToken = config.whatsapp_api_token;
      this.phoneNumberId = config.whatsapp_phone_number_id;
      
      if (!this.apiUrl || !this.apiToken) {
        throw new Error('WhatsApp API não configurada no banco de dados. Configure no painel admin.');
      }
      
      logger.info(`✅ Configurações do WhatsApp carregadas do banco de dados`);
      return {
        apiUrl: this.apiUrl,
        apiToken: this.apiToken,
        phoneNumberId: this.phoneNumberId
      };
    } catch (error) {
      logger.error(`Erro ao carregar configurações do WhatsApp: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpar cache das configurações (forçar recarregar do banco)
   */
  clearConfigCache() {
    this.apiUrl = null;
    this.apiToken = null;
    this.phoneNumberId = null;
    logger.info('🔄 Cache das configurações do WhatsApp limpo');
  }

  /**
   * Enviar imagem para um grupo do WhatsApp
   * @param {string} groupId - ID do grupo
   * @param {string} imageUrl - URL da imagem
   * @param {string} caption - Legenda da imagem
   * @returns {Promise<Object>}
   */
  async sendImage(groupId, imageUrl, caption = '') {
    try {
      // Carregar configurações do banco de dados se não estiverem carregadas
      if (!this.apiUrl || !this.apiToken) {
        await this.loadConfig();
      }
      
      if (!this.apiUrl || !this.apiToken) {
        throw new Error('WhatsApp API não configurada. Configure no painel admin.');
      }

      // Preparar payload da imagem
      const payload = {
        messaging_product: 'whatsapp',
        to: groupId,
        type: 'image',
        image: {
          link: imageUrl
        }
      };

      // Adicionar caption apenas se não estiver vazio
      if (caption && caption.trim().length > 0) {
        payload.caption = caption.substring(0, 1024); // WhatsApp limita caption a 1024 caracteres
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      logger.info(`✅ Imagem WhatsApp enviada para grupo ${groupId}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar imagem WhatsApp: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensagem com imagem (imagem primeiro, depois mensagem)
   * @param {string} groupId - ID do grupo
   * @param {string} imageUrl - URL da imagem
   * @param {string} message - Mensagem formatada
   * @returns {Promise<Object>}
   */
  async sendMessageWithImage(groupId, imageUrl, message) {
    try {
      // Remover links da mensagem para evitar preview automático
      const messageWithoutPreview = message.replace(
        /(https?:\/\/[^\s]+)/g, 
        () => '🔗 [Link disponível - consulte a descrição]'
      );
      
      // Enviar imagem COM a mensagem como caption (juntos)
      logger.info(`📸 Enviando imagem com mensagem como caption para grupo ${groupId}`);
      logger.info(`   Caption length: ${messageWithoutPreview.length}`);
      const imageResult = await this.sendImage(groupId, imageUrl, messageWithoutPreview);

      logger.info(`✅ Imagem com mensagem enviada com sucesso para grupo ${groupId}`);
      return {
        success: true,
        imageMessageId: imageResult.messageId,
        data: imageResult.data
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem com imagem: ${error.message}`);
      // Fallback: tentar enviar apenas mensagem
      try {
        return await this.sendMessage(groupId, message);
      } catch (fallbackError) {
        logger.error(`❌ Erro no fallback: ${fallbackError.message}`);
        throw error;
      }
    }
  }

  /**
   * Enviar mensagem para um grupo do WhatsApp
   * @param {string} groupId - ID do grupo
   * @param {string} message - Mensagem formatada
   * @returns {Promise<Object>}
   */
  async sendMessage(groupId, message) {
    try {
      // Carregar configurações do banco de dados se não estiverem carregadas
      if (!this.apiUrl || !this.apiToken) {
        await this.loadConfig();
      }
      
      if (!this.apiUrl || !this.apiToken) {
        throw new Error('WhatsApp API não configurada. Configure no painel admin.');
      }
      
      // Log para debug: verificar quebras de linha
      const lineBreaks = (message.match(/\n/g) || []).length;
      logger.debug(`📤 Enviando mensagem WhatsApp com ${lineBreaks} quebras de linha`);
      logger.debug(`📤 Primeiros 300 chars da mensagem:\n${message.substring(0, 300).replace(/\n/g, '\\n')}`);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: groupId,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`✅ Mensagem WhatsApp enviada para grupo ${groupId}`);
      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem WhatsApp: ${error.message}`);
      throw error;
    }
  }

  /**
   * Formatar mensagem de nova promoção
   * @param {Object} promotion - Dados da promoção
   * @returns {Promise<string>}
   */
  async formatPromotionMessage(promotion) {
    const discount = promotion.discount_percentage 
      ? `${promotion.discount_percentage}% OFF` 
      : '';
    
    const oldPrice = promotion.old_price 
      ? `De: R$ ${promotion.old_price.toFixed(2)}\n` 
      : '';

    // Buscar categoria se não estiver no objeto
    let categoryName = promotion.category_name || 'Geral';
    if (!categoryName && promotion.category_id) {
      try {
        const category = await Category.findById(promotion.category_id);
        if (category) {
          categoryName = category.name;
        }
      } catch (error) {
        // Ignorar erro
      }
    }

    return `🔥 *Nova Promoção!*

🛍 ${promotion.name}

${oldPrice}💰 *Por: R$ ${promotion.current_price.toFixed(2)}* ${discount}

🏪 Loja: ${this.getPlatformName(promotion.platform)}
📦 Categoria: ${categoryName}

🔗 Link: ${promotion.affiliate_link}

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
💬 *Código: ${coupon.code}*
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
💬 Código: ${coupon.code}
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
   * @param {string} groupId - ID do grupo
   * @returns {Promise<Object>}
   */
  async sendTestMessage(groupId) {
    const message = `🤖 *Teste de Bot WhatsApp*

✅ Bot configurado e funcionando!
📱 Sistema PreçoCerto
⏰ ${new Date().toLocaleString('pt-BR')}

Você receberá notificações automáticas sobre:
🔥 Novas promoções
🎟 Novos cupons
⏰ Cupons expirando`;

    return await this.sendMessage(groupId, message);
  }

  /**
   * Broadcast para múltiplos grupos
   * @param {Array<string>} groupIds - IDs dos grupos
   * @param {string} message - Mensagem
   * @returns {Promise<Array>}
   */
  async broadcastToGroups(groupIds, message) {
    const results = [];

    for (const groupId of groupIds) {
      try {
        const result = await this.sendMessage(groupId, message);
        results.push({ groupId, success: true, result });
      } catch (error) {
        results.push({ groupId, success: false, error: error.message });
      }
    }

    return results;
  }
}

export default new WhatsAppService();

import axios from 'axios';
import logger from '../../config/logger.js';
import Category from '../../models/Category.js';
import BotConfig from '../../models/BotConfig.js';
import imageConverterService from './imageConverterService.js';

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
   * Enviar imagem por ID (upload prévio) com caption
   * @param {string} groupId - ID do grupo
   * @param {string} mediaId - ID da mídia no WhatsApp
   * @param {string} caption - Legenda
   */
  async sendImageById(groupId, mediaId, caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      to: groupId,
      type: 'image',
      image: {
        id: mediaId
      }
    };

    if (caption && caption.trim().length > 0) {
      payload.image.caption = caption.substring(0, 1024);
    }

    return await this._sendApiRequest(groupId, payload, 'imagem_id');
  }

  /**
   * Upload de mídia para WhatsApp
   * @param {string} filePath - Caminho local do arquivo
   * @param {string} mimeType - Tipo MIME (image/jpeg, etc)
   */
  async uploadMedia(filePath, mimeType = 'image/jpeg') {
    try {
      if (!this.apiUrl || !this.apiToken) {
        await this.loadConfig();
      }

      const fs = (await import('fs'));
      const FormData = (await import('form-data')).default;

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado para upload: ${filePath}`);
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('type', mimeType);
      form.append('messaging_product', 'whatsapp');

      logger.info(`📤 Uploading media to WhatsApp: ${filePath}`);

      // URL base para upload é diferente (graph.facebook.com/vXX.X/PHONE_ID/media)
      // Extrair versão e base da URL configurada
      // Geralmente apiUrl é https://graph.facebook.com/v18.0
      
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/media`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            ...form.getHeaders()
          },
          timeout: 30000
        }
      );

      logger.info(`✅ Media uploaded. ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      logger.error(`❌ Erro ao fazer upload de mídia WhatsApp: ${msg}`);
      throw error;
    }
  }

  /**
   * Enviar imagem para um grupo do WhatsApp
   * @param {string} groupId - ID do grupo
   * @param {string} imageUrl - URL da imagem
   * @param {string} caption - Legenda da imagem (opcional)
   * @returns {Promise<Object>}
   */
  async sendImage(groupId, imageUrl, caption = '') {
    // Normalizar URL protocol-relative (//exemplo.com -> https://exemplo.com)
    let finalImageUrl = imageUrl;
    if (typeof finalImageUrl === 'string' && finalImageUrl.startsWith('//')) {
      finalImageUrl = 'https:' + finalImageUrl;
    }

    // Preparar payload da imagem
    const payload = {
      messaging_product: 'whatsapp',
      to: groupId,
      type: 'image',
      image: {
        link: finalImageUrl
      }
    };

    // IMPORTANTE: Só adicionar caption se não estiver vazio
    // Caption vazio pode causar problemas com a API
    if (caption && caption.trim().length > 0) {
      payload.image.caption = caption.substring(0, 1024); // WhatsApp limita caption a 1024 caracteres
    }

    return await this._sendApiRequest(groupId, payload, 'imagem');
  }


  /**
   * Enviar mensagem com imagem (imagem com caption)
   * @param {string} groupId - ID do grupo
   * @param {string} imageUrl - URL da imagem
   * @param {string} message - Mensagem formatada (será usada como caption)
   * @returns {Promise<Object>}
   */
  async sendMessageWithImage(groupId, imageUrl, message) {
    try {
      logger.info(`📸 Enviando imagem COM caption para grupo ${groupId}`);
      logger.info(`   URL da imagem: ${imageUrl.substring(0, 80)}...`);

      // Normalizar URL protocol-relative
      let finalImageUrl = imageUrl;
      if (typeof finalImageUrl === 'string' && finalImageUrl.startsWith('//')) {
        finalImageUrl = 'https:' + finalImageUrl;
      }

      // Enviar imagem com caption (tudo junto)
      // WhatsApp limita caption a 1024 caracteres
      const caption = message.substring(0, 1024);

      const result = await this.sendImage(groupId, finalImageUrl, caption);

      logger.info(`✅ Imagem com caption enviada para grupo ${groupId}`);

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar imagem com caption: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }


  /**
   * Enviar mensagem para um grupo do WhatsApp
   * @param {string} groupId - ID do grupo
   * @param {string} message - Mensagem formatada
   * @returns {Promise<Object>}
   */
  async sendMessage(groupId, message) {
    // Log para debug: verificar quebras de linha
    const lineBreaks = (message.match(/\n/g) || []).length;
    logger.debug(`📤 Preparando envio WhatsApp com ${lineBreaks} quebras de linha`);

    const payload = {
      messaging_product: 'whatsapp',
      to: groupId,
      type: 'text',
      text: {
        body: message
      }
    };

    return await this._sendApiRequest(groupId, payload, 'texto');
  }

  /**
   * Método interno centralizado para chamadas à API da Meta com Lógica de Fallback
   * @private
   */
  async _sendApiRequest(groupId, payload, typeLabel = 'mensagem') {
    try {
      if (!this.apiUrl || !this.apiToken) {
        await this.loadConfig();
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

      logger.info(`✅ WhatsApp (${typeLabel}) enviado para ${groupId}`);
      logger.info(`   📋 Payload enviado: ${JSON.stringify(payload, null, 2)}`);
      logger.info(`   📨 Resposta da API: ${JSON.stringify(response.data, null, 2)}`);
      logger.info(`   📬 Message ID: ${response.data.messages?.[0]?.id || 'N/A'}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error) {
      const fbError = error.response?.data?.error;
      const errorCode = fbError?.code;
      const errorMessage = fbError?.message || error.message;

      // ERRO 131055: Janela de 24h fechada
      if (errorCode === 131055 || errorMessage.includes('outside the allowed window')) {
        logger.warn(`⚠️ Janela de 24h fechada para ${groupId}. Tentando FALLBACK para Template...`);

        try {
          const fallbackResponse = await axios.post(
            `${this.apiUrl}/${this.phoneNumberId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: groupId,
              type: 'template',
              template: {
                name: 'hello_world',
                language: { code: 'en_US' }
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

          logger.info(`✅ FALLBACK SUCESSO: Template enviado para ${groupId} para abrir janela.`);

          // AGORA: Tentar reenviar a mensagem original (o payload inicial)
          // AGUARDAR 1.5s para Meta sincronizar o estado da conversa
          logger.info(`⏳ Aguardando 1.5s antes de re-tentar envio original...`);
          await new Promise(resolve => setTimeout(resolve, 1500));

          logger.info(`🔄 Re-tentando envio original (${payload.type})...`);
          const retryResponse = await axios.post(
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

          logger.info(`✅ SUCESSO APÓS FALLBACK: Mensagem original (${payload.type}) entregue.`);
          return {
            success: true,
            fallback: true,
            retried: true,
            messageId: retryResponse.data.messages?.[0]?.id,
            data: retryResponse.data
          };
        } catch (fallbackError) {
          const detail = fallbackError.response?.data?.error?.message || fallbackError.message;
          logger.error(`❌ FALHA NO FALLBACK/RETRY: ${detail}`);
          throw new Error(`Erro no fluxo de recuperação de janela: ${detail}`);
        }
      }

      logger.error(`❌ Erro API WhatsApp (${typeLabel}): ${errorMessage}`);
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

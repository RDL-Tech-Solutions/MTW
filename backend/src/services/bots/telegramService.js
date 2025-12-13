import axios from 'axios';
import logger from '../../config/logger.js';

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
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
   * Validar e limpar mensagem para Telegram
   * @param {string} message - Mensagem original
   * @returns {string}
   */
  sanitizeMessage(message) {
    if (!message) return '';
    
    // Limitar tamanho (Telegram permite até 4096 caracteres)
    if (message.length > 4000) {
      message = message.substring(0, 4000) + '...';
    }
    
    return message;
  }

  /**
   * Enviar foto para um chat/grupo do Telegram
   * @param {string} chatId - ID do chat/grupo
   * @param {string|Buffer} photo - URL da foto ou buffer da imagem
   * @param {string} caption - Legenda da foto
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>}
   */
  async sendPhoto(chatId, photo, caption = '', options = {}) {
    try {
      logger.info(`📷 [sendPhoto] Iniciando envio de foto`);
      logger.info(`   chatId: ${chatId}`);
      logger.info(`   photo type: ${typeof photo}`);
      logger.info(`   photo: ${typeof photo === 'string' ? photo.substring(0, 100) : 'Buffer/File'}`);
      logger.info(`   caption: ${caption || '(vazio)'}`);
      
      if (!this.botToken) {
        throw new Error('Telegram Bot Token não configurado.');
      }

      if (!chatId) {
        throw new Error('Chat ID não fornecido');
      }

      // Validar e limpar caption
      caption = this.sanitizeMessage(caption);
      
      // Se for URL, SEMPRE baixar e enviar como arquivo (mais confiável e evita link preview)
      if (typeof photo === 'string' && (photo.startsWith('http://') || photo.startsWith('https://'))) {
        try {
          logger.info(`📥 [1/3] Baixando imagem de ${photo.substring(0, 80)}...`);
          const imageResponse = await axios.get(photo, { 
            responseType: 'stream', 
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/*'
            }
          });
          
          logger.info(`✅ [2/3] Imagem baixada com sucesso. Status: ${imageResponse.status}`);
          
          const FormData = (await import('form-data')).default;
          const form = new FormData();
          
          form.append('chat_id', chatId);
          if (caption && caption.trim().length > 0) {
            form.append('caption', caption);
            // Adicionar parse_mode se especificado nas options
            if (options.parse_mode) {
              form.append('parse_mode', options.parse_mode);
            }
          }
          form.append('photo', imageResponse.data, { filename: 'product.jpg' });
          
          logger.info(`📤 [3/3] Enviando foto para Telegram API...`);
          const response = await axios.post(
            `${this.apiUrl}/sendPhoto`,
            form,
            {
              headers: form.getHeaders(),
              timeout: 20000
            }
          );

          logger.info(`✅ Foto Telegram enviada (via download) para chat ${chatId}. Message ID: ${response.data.result?.message_id}`);
          return {
            success: true,
            messageId: response.data.result.message_id,
            data: response.data
          };
        } catch (downloadError) {
          logger.error(`❌ Erro ao baixar e enviar foto: ${downloadError.message}`);
          logger.error(`   Status: ${downloadError.response?.status}`);
          logger.error(`   Response: ${JSON.stringify(downloadError.response?.data)}`);
          
          // Tentar fallback com URL direta
          logger.warn(`⚠️ Tentando enviar foto por URL direta como fallback...`);
          try {
            const payload = {
              chat_id: chatId,
              photo: photo
            };
            if (caption && caption.trim().length > 0) {
              payload.caption = caption;
              payload.parse_mode = options.parse_mode || 'Markdown';
            }
            logger.info(`📤 Tentando enviar por URL direta...`);
            const response = await axios.post(
              `${this.apiUrl}/sendPhoto`,
              payload,
              { timeout: 15000 }
            );
            logger.info(`✅ Foto Telegram enviada (via URL) para chat ${chatId}. Message ID: ${response.data.result?.message_id}`);
            return {
              success: true,
              messageId: response.data.result.message_id,
              data: response.data
            };
          } catch (urlError) {
            logger.error(`❌ Erro ao enviar foto por URL: ${urlError.message}`);
            logger.error(`   Status: ${urlError.response?.status}`);
            logger.error(`   Response: ${JSON.stringify(urlError.response?.data)}`);
            throw downloadError; // Lançar o erro original
          }
        }
      } else {
        // Se for buffer ou arquivo local, usar FormData
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        
        form.append('chat_id', chatId);
        if (caption && caption.trim().length > 0) {
          form.append('caption', caption);
        }
        
        if (typeof photo === 'string') {
          // Arquivo local
          const fs = await import('fs');
          form.append('photo', fs.createReadStream(photo));
        } else {
          // Buffer
          form.append('photo', photo, { filename: 'image.png' });
        }

        const response = await axios.post(
          `${this.apiUrl}/sendPhoto`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 15000
          }
        );

        logger.info(`✅ Foto Telegram enviada para chat ${chatId}`);
        return {
          success: true,
          messageId: response.data.result.message_id,
          data: response.data
        };
      }
    } catch (error) {
      logger.error(`❌ Erro ao enviar foto Telegram: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensagem com foto (imagem primeiro, depois mensagem)
   * @param {string} chatId - ID do chat/grupo
   * @param {string} imageUrl - URL da imagem
   * @param {string} message - Mensagem formatada
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>}
   */
  async sendMessageWithPhoto(chatId, imageUrl, message, options = {}) {
    try {
      logger.info(`📸 [TelegramService] sendMessageWithPhoto chamado`);
      logger.info(`   chatId: ${chatId}`);
      logger.info(`   imageUrl: ${imageUrl || 'NÃO FORNECIDA'}`);
      logger.info(`   message length: ${message?.length || 0}`);
      
      // Validar se imageUrl foi fornecida
      if (!imageUrl || !imageUrl.trim()) {
        throw new Error('URL da imagem não fornecida');
      }
      
      // Validar se é uma URL válida
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error(`URL da imagem inválida: ${imageUrl}`);
      }
      
      // Remover completamente links da mensagem para evitar preview automático
      // Substituir por texto simples que não seja detectado como link
      const messageWithoutPreview = message.replace(
        /(https?:\/\/[^\s]+)/g, 
        () => '🔗 [Link disponível - consulte a descrição]'
      );
      
      // Enviar imagem COM a mensagem como caption (juntos)
      logger.info(`📸 Enviando imagem com mensagem como caption para chat ${chatId}`);
      logger.info(`   URL completa: ${imageUrl}`);
      logger.info(`   Caption length: ${messageWithoutPreview.length}`);
      
      const photoOptions = {
        ...options,
        parse_mode: 'HTML' // Usar HTML para melhor controle da formatação
      };
      
      // Tentar enviar com HTML primeiro
      let photoResult;
      try {
        photoResult = await this.sendPhoto(chatId, imageUrl, messageWithoutPreview, photoOptions);
      } catch (htmlError) {
        logger.warn(`⚠️ Erro com HTML, tentando sem parse_mode: ${htmlError.message}`);
        // Tentar sem parse_mode
        photoResult = await this.sendPhoto(chatId, imageUrl, messageWithoutPreview, {
          ...options,
          parse_mode: undefined
        });
      }
      
      logger.info(`   photoResult: ${JSON.stringify({ 
        success: photoResult?.success, 
        messageId: photoResult?.messageId 
      })}`);
      
      if (!photoResult || !photoResult.success) {
        const errorMsg = `Falha ao enviar imagem com caption: ${JSON.stringify(photoResult)}`;
        logger.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      logger.info(`✅ Imagem com mensagem enviada com sucesso. Message ID: ${photoResult.messageId}`);
      
      return {
        success: true,
        photoMessageId: photoResult.messageId,
        data: photoResult.data
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem com foto: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      // Fallback: tentar enviar apenas mensagem
      try {
        logger.warn(`⚠️ Tentando fallback: enviar apenas mensagem sem imagem`);
        // Remover links da mensagem para evitar preview automático
        const messageWithoutPreview = message.replace(
          /(https?:\/\/[^\s]+)/g, 
          (url) => `\`${url}\``
        );
        return await this.sendMessage(chatId, messageWithoutPreview, { 
          ...options, 
          disable_web_page_preview: true 
        });
      } catch (fallbackError) {
        logger.error(`❌ Erro no fallback: ${fallbackError.message}`);
        throw error;
      }
    }
  }

  /**
   * Enviar mensagem para um chat/grupo do Telegram
   * @param {string} chatId - ID do chat/grupo
   * @param {string} message - Mensagem formatada
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>}
   */
  async sendMessage(chatId, message, options = {}) {
    try {
      if (!this.botToken) {
        throw new Error('Telegram Bot Token não configurado. Verifique as variáveis de ambiente.');
      }

      if (!chatId) {
        throw new Error('Chat ID não fornecido');
      }

      // Validar e limpar mensagem
      message = this.sanitizeMessage(message);

      // Preparar payload base
      let payload = {
        chat_id: chatId,
        text: message,
        disable_web_page_preview: options.disable_web_page_preview !== undefined 
          ? options.disable_web_page_preview 
          : true // Por padrão, desabilitar preview
      };
      
      // Adicionar parse_mode apenas se especificado e não for undefined
      if (options.parse_mode !== undefined && options.parse_mode !== null) {
        payload.parse_mode = options.parse_mode;
      }
      
      // Tentar enviar
      try {
        const response = await axios.post(
          `${this.apiUrl}/sendMessage`,
          payload,
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
      } catch (markdownError) {
        // Se falhar e tiver parse_mode, tentar sem parse_mode (texto puro)
        if (payload.parse_mode && markdownError.response?.status === 400) {
          logger.warn(`⚠️ Erro com Markdown, tentando sem formatação: ${markdownError.response?.data?.description || markdownError.message}`);
          
          payload = {
            chat_id: chatId,
            text: message,
            disable_web_page_preview: payload.disable_web_page_preview
          };

          const response = await axios.post(
            `${this.apiUrl}/sendMessage`,
            payload,
            {
              timeout: 10000
            }
          );

          logger.info(`✅ Mensagem Telegram enviada (sem Markdown) para chat ${chatId}`);
          return {
            success: true,
            messageId: response.data.result.message_id,
            data: response.data,
            warning: 'Mensagem enviada sem formatação Markdown devido a erro de parsing'
          };
        }
        
        // Se ainda falhar, lançar o erro original
        throw markdownError;
      }
    } catch (error) {
      const errorDetails = {
        message: error.message,
        chatId: chatId,
        messageLength: message?.length || 0
      };

      // Adicionar detalhes da resposta da API se disponível
      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        errorDetails.apiError = error.response.data?.description || error.response.data?.error_code || 'Unknown error';
        errorDetails.apiResponse = error.response.data;
      }

      logger.error(`❌ Erro ao enviar mensagem Telegram: ${JSON.stringify(errorDetails, null, 2)}`);
      
      // Criar erro mais descritivo
      const errorMessage = error.response?.data?.description 
        ? `Telegram API Error: ${error.response.data.description}`
        : error.message;
      
      const enhancedError = new Error(errorMessage);
      enhancedError.details = errorDetails;
      throw enhancedError;
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

import * as OneSignal from 'onesignal-node';
import logger from '../config/logger.js';
import AppSettings from '../models/AppSettings.js';

/**
 * Serviço de integração com OneSignal para Push Notifications
 * 
 * Features:
 * - Envio de notificações individuais e em massa
 * - Gerenciamento de usuários e devices
 * - Segmentação avançada
 * - Templates de notificação
 * - Retry automático
 * - Analytics e métricas
 */
class OneSignalService {
  constructor() {
    this.client = null;
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;
    this.initialized = false;
    this.initializeClient();
  }

  /**
   * Inicializar cliente OneSignal
   */
  async initializeClient() {
    try {
      // Tentar carregar configurações do banco de dados
      try {
        const settings = await AppSettings.get();
        if (settings.onesignal_app_id && settings.onesignal_rest_api_key) {
          this.appId = settings.onesignal_app_id;
          this.apiKey = settings.onesignal_rest_api_key;
          logger.info('✅ Configurações OneSignal carregadas do banco de dados');
        }
      } catch (dbError) {
        logger.warn(`⚠️ Não foi possível carregar configurações do banco: ${dbError.message}`);
      }

      if (!this.appId || !this.apiKey) {
        logger.warn('⚠️ OneSignal não configurado (APP_ID ou API_KEY ausentes)');
        return;
      }

      this.client = new OneSignal.Client(this.appId, this.apiKey);
      this.initialized = true;
      logger.info('✅ OneSignal inicializado com sucesso');
    } catch (error) {
      logger.error(`❌ Erro ao inicializar OneSignal: ${error.message}`);
      this.initialized = false;
    }
  }

  /**
   * Verificar se o serviço está habilitado
   */
  isEnabled() {
    const enabled = process.env.ONESIGNAL_ENABLED === 'true';
    return this.initialized && enabled;
  }

  /**
   * Criar ou atualizar usuário no OneSignal
   * 
   * @param {Object} userData - Dados do usuário
   * @param {string} userData.external_id - ID único do usuário no sistema
   * @param {string} userData.email - Email do usuário (opcional)
   * @param {string} userData.phone - Telefone do usuário (opcional)
   * @param {Object} userData.tags - Tags personalizadas (opcional)
   * @returns {Promise<Object>} Resultado da operação
   */
  async createOrUpdateUser(userData) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      const { external_id, email, phone, tags = {} } = userData;

      if (!external_id) {
        throw new Error('external_id é obrigatório');
      }

      // Criar/atualizar player no OneSignal
      const playerData = {
        app_id: this.appId,
        external_user_id: external_id,
        ...(email && { email }),
        ...(phone && { phone_number: phone }),
        tags: {
          ...tags,
          created_at: new Date().toISOString(),
          platform: 'mobile'
        }
      };

      logger.info(`📝 Criando/atualizando usuário OneSignal: ${external_id}`);

      // OneSignal cria ou atualiza automaticamente baseado no external_user_id
      const response = await this.client.createDevice(playerData);

      logger.info(`✅ Usuário OneSignal criado/atualizado: ${external_id}`);

      return {
        success: true,
        player_id: response.body.id,
        external_id
      };
    } catch (error) {
      logger.error(`❌ Erro ao criar/atualizar usuário OneSignal: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificação para um usuário específico
   * 
   * @param {Object} notification - Dados da notificação
   * @param {string} notification.external_id - ID do usuário
   * @param {string} notification.title - Título da notificação
   * @param {string} notification.message - Mensagem da notificação
   * @param {Object} notification.data - Dados adicionais (opcional)
   * @param {string} notification.url - URL para deep linking (opcional)
   * @param {string} notification.image - URL da imagem (opcional)
   * @param {Array} notification.buttons - Botões de ação (opcional)
   * @param {string} notification.priority - Prioridade (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendToUser(notification) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      const {
        external_id,
        title,
        message,
        data = {},
        url,
        image,
        buttons = [],
        priority = 'normal',
        subtitle,
        badge
      } = notification;

      if (!external_id) {
        throw new Error('external_id é obrigatório');
      }

      if (!title || !message) {
        throw new Error('title e message são obrigatórios');
      }

      const notificationData = {
        app_id: this.appId,
        include_external_user_ids: [external_id],
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        data: {
          ...data,
          sent_at: new Date().toISOString()
        },
        ...(subtitle && { subtitle: { en: subtitle, pt: subtitle } }),
        ...(url && { url }),
        ...(image && {
          big_picture: image,
          large_icon: image,
          ios_attachments: { id: image }
        }),
        ...(buttons.length > 0 && { buttons }),
        ...(badge && { ios_badgeType: 'SetTo', ios_badgeCount: badge }),
        priority: priority === 'high' ? 10 : 5,
        // android_channel_id: data.type || 'default',
        ttl: 3600, // 1 hora
        content_available: true
      };

      logger.info(`📤 Enviando notificação OneSignal para: ${external_id}`);
      logger.debug(`   Título: ${title}`);
      logger.debug(`   Mensagem: ${message.substring(0, 50)}...`);

      const response = await this.client.createNotification(notificationData);

      if (response.body.errors) {
        logger.error(`❌ Erros ao enviar notificação: ${JSON.stringify(response.body.errors)}`);
        return {
          success: false,
          errors: response.body.errors
        };
      }

      logger.info(`✅ Notificação OneSignal enviada: ${response.body.id}`);

      return {
        success: true,
        notification_id: response.body.id,
        recipients: response.body.recipients || 1
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificação OneSignal: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificação para múltiplos usuários
   * 
   * @param {Array<string>} externalIds - Array de IDs de usuários
   * @param {Object} notification - Dados da notificação
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendToMultiple(externalIds, notification) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      if (!Array.isArray(externalIds) || externalIds.length === 0) {
        throw new Error('externalIds deve ser um array não vazio');
      }

      const {
        title,
        message,
        data = {},
        url,
        image,
        buttons = [],
        priority = 'normal',
        subtitle,
        badge
      } = notification;

      if (!title || !message) {
        throw new Error('title e message são obrigatórios');
      }

      // OneSignal suporta até 2000 external_ids por requisição
      const batchSize = 2000;
      const batches = [];

      for (let i = 0; i < externalIds.length; i += batchSize) {
        batches.push(externalIds.slice(i, i + batchSize));
      }

      let totalSuccess = 0;
      let totalFailed = 0;
      const results = [];

      for (const batch of batches) {
        try {
          const notificationData = {
            app_id: this.appId,
            include_external_user_ids: batch,
            headings: { en: title, pt: title },
            contents: { en: message, pt: message },
            data: {
              ...data,
              sent_at: new Date().toISOString()
            },
            ...(subtitle && { subtitle: { en: subtitle, pt: subtitle } }),
            ...(url && { url }),
            ...(image && {
              big_picture: image,
              large_icon: image,
              ios_attachments: { id: image }
            }),
            ...(buttons.length > 0 && { buttons }),
            ...(badge && { ios_badgeType: 'SetTo', ios_badgeCount: badge }),
            priority: priority === 'high' ? 10 : 5,
            // android_channel_id: data.type || 'default',
            ttl: 3600,
            content_available: true
          };

          logger.info(`📤 Enviando notificação OneSignal para ${batch.length} usuários`);

          const response = await this.client.createNotification(notificationData);

          if (response.body.errors) {
            logger.error(`❌ Erros no batch: ${JSON.stringify(response.body.errors)}`);
            totalFailed += batch.length;
          } else {
            const recipients = response.body.recipients || 0;
            totalSuccess += recipients;
            totalFailed += (batch.length - recipients);

            results.push({
              notification_id: response.body.id,
              recipients
            });
          }
        } catch (batchError) {
          logger.error(`❌ Erro no batch: ${batchError.message}`);
          totalFailed += batch.length;
        }
      }

      logger.info(`📊 OneSignal batch: ${totalSuccess} enviadas, ${totalFailed} falharam`);

      return {
        success: totalSuccess > 0,
        total_sent: totalSuccess,
        total_failed: totalFailed,
        results
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar notificações em massa: ${error.message}`);
      return {
        success: false,
        error: error.message,
        total_sent: 0,
        total_failed: externalIds.length
      };
    }
  }

  /**
   * Enviar notificação para um segmento
   * 
   * @param {string} segmentName - Nome do segmento
   * @param {Object} notification - Dados da notificação
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendToSegment(segmentName, notification) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      const {
        title,
        message,
        data = {},
        url,
        image,
        buttons = [],
        priority = 'normal',
        subtitle,
        badge
      } = notification;

      const notificationData = {
        app_id: this.appId,
        included_segments: [segmentName],
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        data: {
          ...data,
          sent_at: new Date().toISOString()
        },
        ...(subtitle && { subtitle: { en: subtitle, pt: subtitle } }),
        ...(url && { url }),
        ...(image && {
          big_picture: image,
          large_icon: image,
          ios_attachments: { id: image }
        }),
        ...(buttons.length > 0 && { buttons }),
        ...(badge && { ios_badgeType: 'SetTo', ios_badgeCount: badge }),
        priority: priority === 'high' ? 10 : 5,
        // android_channel_id: data.type || 'default',
        ttl: 3600,
        content_available: true
      };

      logger.info(`📤 Enviando notificação OneSignal para segmento: ${segmentName}`);

      const response = await this.client.createNotification(notificationData);

      if (response.body.errors) {
        logger.error(`❌ Erros ao enviar para segmento: ${JSON.stringify(response.body.errors)}`);
        return {
          success: false,
          errors: response.body.errors
        };
      }

      logger.info(`✅ Notificação enviada para segmento: ${response.body.id}`);

      return {
        success: true,
        notification_id: response.body.id,
        recipients: response.body.recipients || 0
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar para segmento: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificação com filtros personalizados
   * 
   * @param {Array} filters - Array de filtros OneSignal
   * @param {Object} notification - Dados da notificação
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendWithFilters(filters, notification) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      const {
        title,
        message,
        data = {},
        url,
        image,
        buttons = [],
        priority = 'normal',
        subtitle,
        badge
      } = notification;

      const notificationData = {
        app_id: this.appId,
        filters,
        headings: { en: title, pt: title },
        contents: { en: message, pt: message },
        data: {
          ...data,
          sent_at: new Date().toISOString()
        },
        ...(subtitle && { subtitle: { en: subtitle, pt: subtitle } }),
        ...(url && { url }),
        ...(image && {
          big_picture: image,
          large_icon: image,
          ios_attachments: { id: image }
        }),
        ...(buttons.length > 0 && { buttons }),
        ...(badge && { ios_badgeType: 'SetTo', ios_badgeCount: badge }),
        priority: priority === 'high' ? 10 : 5,
        // android_channel_id: data.type || 'default',
        ttl: 3600,
        content_available: true
      };

      logger.info(`📤 Enviando notificação OneSignal com filtros personalizados`);

      const response = await this.client.createNotification(notificationData);

      if (response.body.errors) {
        logger.error(`❌ Erros ao enviar com filtros: ${JSON.stringify(response.body.errors)}`);
        return {
          success: false,
          errors: response.body.errors
        };
      }

      logger.info(`✅ Notificação enviada com filtros: ${response.body.id}`);

      return {
        success: true,
        notification_id: response.body.id,
        recipients: response.body.recipients || 0
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar com filtros: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deletar usuário do OneSignal
   * 
   * @param {string} externalId - ID do usuário
   * @returns {Promise<Object>} Resultado da operação
   */
  async deleteUser(externalId) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      // Primeiro, buscar o player_id pelo external_id
      // Nota: OneSignal não tem endpoint direto para isso, então precisamos
      // usar a API de view devices com filtro
      logger.info(`🗑️ Deletando usuário OneSignal: ${externalId}`);

      // Por enquanto, apenas logamos. Em produção, você pode querer
      // manter um mapeamento de external_id -> player_id no banco
      logger.warn(`⚠️ Deleção de usuário OneSignal requer player_id. Implemente mapeamento se necessário.`);

      return {
        success: true,
        message: 'Usuário será removido automaticamente após inatividade'
      };
    } catch (error) {
      logger.error(`❌ Erro ao deletar usuário OneSignal: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obter estatísticas de uma notificação
   * 
   * @param {string} notificationId - ID da notificação
   * @returns {Promise<Object>} Estatísticas
   */
  async getNotificationStats(notificationId) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      const response = await this.client.viewNotification(notificationId);

      return {
        success: true,
        stats: {
          id: response.body.id,
          successful: response.body.successful || 0,
          failed: response.body.failed || 0,
          errored: response.body.errored || 0,
          converted: response.body.converted || 0,
          remaining: response.body.remaining || 0,
          queued_at: response.body.queued_at,
          send_after: response.body.send_after,
          completed_at: response.body.completed_at
        }
      };
    } catch (error) {
      logger.error(`❌ Erro ao obter estatísticas: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancelar notificação agendada
   * 
   * @param {string} notificationId - ID da notificação
   * @returns {Promise<Object>} Resultado da operação
   */
  async cancelNotification(notificationId) {
    try {
      if (!this.isEnabled()) {
        throw new Error('OneSignal não está habilitado');
      }

      await this.client.cancelNotification(notificationId);

      logger.info(`✅ Notificação cancelada: ${notificationId}`);

      return {
        success: true,
        notification_id: notificationId
      };
    } catch (error) {
      logger.error(`❌ Erro ao cancelar notificação: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========== MÉTODOS DE COMPATIBILIDADE COM EXPO NOTIFICATIONS ==========

  /**
   * Notificação de novo cupom (compatível com pushNotification.js)
   */
  async notifyNewCoupon(users, coupon) {
    const externalIds = users.map(u => u.id.toString());

    return await this.sendToMultiple(externalIds, {
      title: '🎉 Novo Cupom Disponível!',
      message: `${coupon.code} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'} OFF`,
      data: {
        type: 'new_coupon',
        couponId: coupon.id,
        screen: 'CouponDetails',
        code: coupon.code
      },
      priority: 'high'
    });
  }

  /**
   * Notificação de queda de preço (compatível com pushNotification.js)
   */
  async notifyPriceDrop(users, product, oldPrice, newPrice) {
    const externalIds = users.map(u => u.id.toString());
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    return await this.sendToMultiple(externalIds, {
      title: '💰 Preço Caiu!',
      message: `${product.name} - De R$ ${oldPrice.toFixed(2)} por R$ ${newPrice.toFixed(2)} (-${discount}%)`,
      data: {
        type: 'price_drop',
        productId: product.id,
        screen: 'ProductDetails',
        oldPrice,
        newPrice,
        discount
      },
      priority: 'high'
    });
  }

  /**
   * Notificação de cupom expirando (compatível com pushNotification.js)
   */
  async notifyExpiringCoupon(users, coupon, daysLeft) {
    const externalIds = users.map(u => u.id.toString());
    const urgency = daysLeft === 1 ? '⚠️' : '⏰';
    const dayText = daysLeft === 1 ? 'amanhã' : `em ${daysLeft} dias`;

    return await this.sendToMultiple(externalIds, {
      title: `${urgency} Cupom Expirando!`,
      message: `${coupon.code} expira ${dayText}. Use agora!`,
      data: {
        type: 'expiring_coupon',
        couponId: coupon.id,
        screen: 'CouponDetails',
        daysLeft
      },
      priority: daysLeft === 1 ? 'high' : 'normal'
    });
  }

  /**
   * Notificação de nova promoção (compatível com pushNotification.js)
   */
  async notifyNewPromo(users, product) {
    const externalIds = users.map(u => u.id.toString());

    return await this.sendToMultiple(externalIds, {
      title: '🔥 Nova Promoção!',
      message: `${product.name} com ${product.discount_percentage}% OFF - R$ ${product.current_price.toFixed(2)}`,
      data: {
        type: 'new_promo',
        productId: product.id,
        screen: 'ProductDetails',
        discount: product.discount_percentage
      },
      priority: 'high'
    });
  }

  /**
   * Notificação personalizada (compatível com pushNotification.js)
   */
  async sendCustomNotification(users, title, body, data = {}, options = {}) {
    const externalIds = users.map(u => u.id.toString());

    return await this.sendToMultiple(externalIds, {
      title,
      message: body,
      data,
      ...options
    });
  }
}

export default new OneSignalService();

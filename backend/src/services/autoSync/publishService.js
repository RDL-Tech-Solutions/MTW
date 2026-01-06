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
          // IMPORTANTE: Usar imagem do produto diretamente (como estava antes)
          // A combinação com logo da plataforma pode ser feita opcionalmente no futuro
          logger.info(`📤 Enviando imagem do produto para Telegram: ${product.image_url.substring(0, 100)}...`);
          const result = await notificationDispatcher.sendToTelegramWithImage(
            message,
            product.image_url,
            'promotion_new',
            product // Passar dados do produto para segmentação
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
            'promotion_new',
            product // Passar dados do produto para segmentação
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
      const result = await notificationDispatcher.sendToWhatsApp(message, {
        eventType: 'promotion_new',
        ...product // Passar dados do produto para segmentação
      });

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
      // IMPORTANTE: Sempre usar template do painel admin
      // Escolher template baseado se produto tem cupom ou não
      // Se produto tem cupom vinculado, usar template 'promotion_with_coupon'
      // Se não tem cupom, usar template 'new_promotion' (sem cupom)
      let templateType = 'new_promotion';

      if (product.coupon_id) {
        templateType = 'promotion_with_coupon';
        logger.info(`📋 Produto tem cupom vinculado (${product.coupon_id}), usando template 'promotion_with_coupon'`);
      } else {
        logger.info(`📋 Produto sem cupom, usando template 'new_promotion'`);
      }

      // Preparar contextData para IA ADVANCED (antes de preparar variáveis)
      // A IA ADVANCED pode otimizar o título do produto, então precisamos passar o produto
      const contextData = { product };

      // Preparar variáveis do template
      // NOTA: Se IA ADVANCED for usada, o título será otimizado e as variáveis serão atualizadas depois
      const variables = await templateRenderer.preparePromotionVariables(product);

      // Renderizar template - pode usar template do banco ou IA ADVANCED
      // Se IA ADVANCED for usada, o título será otimizado e as variáveis serão atualizadas
      logger.info(`📝 Renderizando template '${templateType}' para plataforma '${platform}'...`);
      const message = await templateRenderer.render(templateType, platform, variables, contextData);

      if (!message || message.trim().length === 0) {
        logger.error(`❌ Template renderizado está vazio para produto: ${product.name}`);
        throw new Error('Template renderizado está vazio');
      }

      logger.info(`✅ Mensagem formatada usando template '${templateType}' (${message.length} chars)`);
      logger.debug(`📝 Primeiros 300 chars da mensagem:\n${message.substring(0, 300).replace(/\n/g, '\\n')}`);
      logger.debug(`📝 Mensagem completa tem ${(message.match(/\n/g) || []).length} quebras de linha`);

      return message;
    } catch (error) {
      logger.error(`❌ ERRO CRÍTICO ao formatar mensagem com template: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      // NÃO usar fallback - template é obrigatório
      throw new Error(`Falha ao renderizar template do painel admin: ${error.message}. Configure um template ativo no painel admin.`);
    }
  }

  /**
   * Formato de fallback caso template falhe
   * @deprecated NÃO USAR - Template do painel admin é obrigatório
   * @param {Object} product - Dados do produto
   * @returns {string}
   */
  async formatBotMessageFallback(product) {
    // MÉTODO DESCONTINUADO - Template do painel admin é obrigatório
    // Este método não deve ser usado. Sempre use templateRenderer.render()
    throw new Error('Fallback desabilitado. Template do painel admin é obrigatório.');
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
   * Agora com edição de IA e score de qualidade
   */
  async publishAll(product, options = {}) {
    const results = {
      app: false,
      push: false,
      telegram: false,
      whatsapp: false
    };

    try {
      logger.info(`🔄 Iniciando publishAll para produto ${product.id}`);
      logger.info(`   Options: ${JSON.stringify(options)}`);
      logger.info(`   Category ID inicial: ${product.category_id}`);

      // 1. Editar produto com IA (antes de publicar)
      try {
        const productEditor = (await import('../ai/productEditor.js')).default;
        const Product = (await import('../../models/Product.js')).default; // Importar Model Product

        if (await productEditor.isEnabled()) {
          logger.info(`🤖 Editando produto com IA antes da publicação...`);
          const editedProduct = await productEditor.editProduct(product);

          // Log do resultado da IA
          logger.info(`🤖 IA sugeriu categoria: ${editedProduct.ai_detected_category_id || 'Nenhuma'}`);
          logger.info(`   Categoria atual (manual): ${product.category_id}`);
          logger.info(`   Skip AI: ${options.skipAiCategory}, Manual ID Option: ${options.manualCategoryId}`);

          // Aplicar edições ao produto
          if (editedProduct.ai_optimized_title) {
            product.ai_optimized_title = editedProduct.ai_optimized_title;
          }
          if (editedProduct.ai_generated_description) {
            product.ai_generated_description = editedProduct.ai_generated_description;
          }
          if (editedProduct.ai_detected_category_id) {
            product.ai_detected_category_id = editedProduct.ai_detected_category_id;

            // Só atualizar a categoria principal se NÃO foi solicitado pular (ex: alteração manual)
            // E se não houver uma categoria manual explícita nas opções
            if (!options.skipAiCategory && !options.manualCategoryId) {
              product.category_id = editedProduct.ai_detected_category_id; // Usar categoria detectada
            } else {
              logger.info(`🛡️ Mantendo categoria manual: ${options.manualCategoryId || product.category_id} (ignorando sugestão IA: ${editedProduct.ai_detected_category_id})`);

              // Se tiver manualCategoryId explícito, garantir que está aplicado
              if (options.manualCategoryId) {
                product.category_id = options.manualCategoryId;
              }
            }
          }
          if (editedProduct.offer_priority) {
            product.offer_priority = editedProduct.offer_priority;
          }
          if (editedProduct.should_send_push !== undefined) {
            product.should_send_push = editedProduct.should_send_push;
          }
          if (editedProduct.should_send_to_bots !== undefined) {
            product.should_send_to_bots = editedProduct.should_send_to_bots;
          }
          if (editedProduct.is_featured_offer !== undefined) {
            product.is_featured_offer = editedProduct.is_featured_offer;
          }
          if (editedProduct.ai_decision_reason) {
            product.ai_decision_reason = editedProduct.ai_decision_reason;
          }
          if (editedProduct.ai_edit_history) {
            product.ai_edit_history = editedProduct.ai_edit_history;
          }

          // Atualizar no banco
          if (product.id) {
            logger.info(`💾 Salvando atualizações de IA no banco. Categoria final: ${product.category_id}`);
            await Product.update(product.id, {
              ai_optimized_title: product.ai_optimized_title,
              ai_generated_description: product.ai_generated_description,
              ai_detected_category_id: product.ai_detected_category_id,
              offer_priority: product.offer_priority,
              should_send_push: product.should_send_push,
              should_send_to_bots: product.should_send_to_bots,
              is_featured_offer: product.is_featured_offer,
              ai_decision_reason: product.ai_decision_reason,
              ai_edit_history: product.ai_edit_history,
              category_id: product.category_id // Usar a categoria final decidida (pode ser manual ou IA)
            });
          }
        }
      } catch (editError) {
        logger.warn(`⚠️ Erro ao editar produto com IA: ${editError.message}`);
        // Continuar publicação mesmo se edição falhar
      }

      // 2. Calcular score de qualidade
      try {
        const qualityScorer = (await import('../services/qualityScorer.js')).default;
        const scoreData = await qualityScorer.calculateOfferScore(product);
        product.offer_score = scoreData.score;

        // Atualizar score no banco
        if (product.id) {
          await qualityScorer.updateProductScore(product.id, scoreData);
        }

        logger.info(`📊 Score de qualidade: ${scoreData.score.toFixed(1)}/100`);
      } catch (scoreError) {
        logger.warn(`⚠️ Erro ao calcular score: ${scoreError.message}`);
        // Continuar publicação mesmo se cálculo de score falhar
      }

      // 3. Detectar duplicados (antes de publicar)
      try {
        const duplicateDetector = (await import('../services/duplicateDetector.js')).default;
        const duplicate = await duplicateDetector.detectDuplicate(product);

        if (duplicate && duplicate.canonical_id) {
          logger.info(`🔄 Produto duplicado detectado. Usando produto canônico: ${duplicate.canonical_id}`);

          // Atualizar produto para apontar para o canônico
          if (product.id) {
            await Product.update(product.id, {
              canonical_product_id: duplicate.canonical_id
            });
            product.canonical_product_id = duplicate.canonical_id;
          }

          // Criar relação de duplicado
          await duplicateDetector.createDuplicateRelation(
            duplicate.canonical_id,
            product.id,
            duplicate.similarity_score
          );

          // Se é duplicado, não publicar (evitar spam)
          logger.info(`⏸️ Produto duplicado não será publicado para evitar spam`);
          return {
            success: false,
            results,
            reason: 'Produto duplicado detectado',
            canonical_id: duplicate.canonical_id
          };
        }
      } catch (dupError) {
        logger.warn(`⚠️ Erro ao detectar duplicados: ${dupError.message}`);
        // Continuar publicação mesmo se detecção falhar
      }

      // Log detalhado do produto recebido
      logger.info(`📦 Publicando produto: ${product.name || product.id}`);
      logger.info(`   Platform: ${product.platform}`);
      logger.info(`   Score: ${product.offer_score || 'N/A'}`);
      logger.info(`   Prioridade: ${product.offer_priority || 'medium'}`);
      logger.info(`   image_url presente: ${product.image_url ? 'SIM' : 'NÃO'}`);
      logger.info(`   image_url valor: ${product.image_url || 'NÃO DEFINIDA'}`);
      logger.info(`   image_url tipo: ${typeof product.image_url}`);

      // Verificar se image_url está presente e válida
      if (!product.image_url || !product.image_url.startsWith('http')) {
        logger.error(`❌ Produto ${product.name || product.id} SEM IMAGEM VÁLIDA para publicação!`);
        logger.error(`   Campos do produto: ${JSON.stringify(Object.keys(product))}`);
        logger.error(`   image_url: ${JSON.stringify(product.image_url)}`);

        // Tentar buscar do banco se não tiver
        if (product.id) {
          try {
            const Product = (await import('../../models/Product.js')).default;
            const dbProduct = await Product.findById(product.id);
            if (dbProduct && dbProduct.image_url) {
              product.image_url = dbProduct.image_url;
              logger.info(`   ✅ Imagem recuperada do banco: ${dbProduct.image_url.substring(0, 80)}...`);
            }
          } catch (dbError) {
            logger.error(`   ❌ Erro ao buscar produto do banco: ${dbError.message}`);
          }
        }
      }

      // Publicar no app (já está no banco)
      results.app = await this.publishToApp(product);

      // Push notification (apenas se should_send_push = true)
      if (product.should_send_push !== false) {
        results.push = await this.notifyPush(product);
      } else {
        logger.info(`⏸️ Push notification desabilitado pela IA para este produto`);
      }

      // Telegram (apenas se should_send_to_bots = true)
      if (product.should_send_to_bots !== false) {
        results.telegram = await this.notifyTelegramBot(product);
      } else {
        logger.info(`⏸️ Telegram desabilitado pela IA para este produto`);
      }

      // WhatsApp (apenas se should_send_to_bots = true)
      if (product.should_send_to_bots !== false) {
        results.whatsapp = await this.notifyWhatsAppBot(product);
      } else {
        logger.info(`⏸️ WhatsApp desabilitado pela IA para este produto`);
      }

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

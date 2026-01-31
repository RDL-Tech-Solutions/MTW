import BotMessageTemplate from '../../models/BotMessageTemplate.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';
import baseRenderer from './renderers/baseRenderer.js';

/**
 * TemplateRenderer - Renderizador principal de templates
 * 
 * ORGANIZAÇÃO:
 * - render() - Método principal que coordena a renderização
 * - prepare*Variables() - Métodos para preparar variáveis específicas
 * - getDefaultTemplate() - Templates padrão do sistema
 * - Funções auxiliares delegadas ao baseRenderer:
 *   ├── removeDuplicateCouponCode()
 *   ├── convertBoldFormatting()
 *   ├── formatDate()
 *   ├── getPlatformName()
 *   └── getTemplateMode()
 * 
 * TIPOS DE TEMPLATE SUPORTADOS:
 * 1. new_promotion - Nova Promoção (Sem Cupom)
 * 2. promotion_with_coupon - Promoção + Cupom
 * 3. new_coupon - Novo Cupom
 * 4. expired_coupon - Cupom Expirado
 * 
 * MODOS DE RENDERIZAÇÃO:
 * - default: Template padrão do sistema
 * - custom: Template customizado do admin panel
 * - ai_advanced: Template gerado dinamicamente pela IA
 */
class TemplateRenderer {
  /**
   * Remover código de cupom duplicado da mensagem
   * @param {string} message - Mensagem a ser processada
   * @param {string} couponCode - Código do cupom
   * @returns {string} - Mensagem sem duplicatas
   */
  removeDuplicateCouponCode(message, couponCode) {
    return baseRenderer.removeDuplicateCouponCode(message, couponCode);
  }

  /**
   * Renderizar template com variáveis
   * @param {string} templateType - Tipo do template
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @param {Object} variables - Variáveis para substituir
   * @returns {Promise<string>}
   */
  async render(templateType, platform, variables = {}, contextData = {}) {
    try {
      logger.info(`🎨 Renderizando template: ${templateType} para ${platform}`);

      const templateMode = await this.getTemplateMode(templateType);
      logger.info(`📋 Modo de template: ${templateMode} para ${templateType}`);

      let message = '';

      if (templateMode === 'ai_advanced') {
        const advancedTemplateGenerator = (await import('../../ai/advancedTemplateGenerator.js')).default;

        // Verifica se é Mixtral (Gratuito) para forçar fallback se necessário
        if (advancedTemplateGenerator.modelProvider === 'mixtral' ||
          advancedTemplateGenerator.modelProvider === 'huggingface') {
          // Apenas log informativo
          logger.info(`ℹ️ Provedor Mixtral detectado em render()`);
        }

        message = await this._renderWithAiAdvanced(templateType, platform, variables, contextData);
      }
      else if (templateMode === 'default') {
        message = this._renderWithDefault(templateType, platform, variables);
      }
      else if (templateMode === 'custom') {
        message = await this._renderWithCustom(templateType, platform, variables);
      }
      else {
        logger.warn(`⚠️ Modo desconhecido: ${templateMode}, fallback para custom`);
        message = await this._renderWithCustom(templateType, platform, variables);
      }

      logger.debug(`📋 Template gerado (${message.length} chars) antes da finalização`);

      // 1. Substituição de variáveis
      message = this._replaceVariables(message, variables, templateMode, platform, contextData);

      // 2. Limpeza e finalização
      // 2. Limpeza e finalização
      message = this._finalizeMessage(message, templateMode, templateType, variables, contextData, platform);

      return message;

    } catch (error) {
      logger.error(`❌ Erro fatal no render(): ${error.message}`);
      logger.error(error.stack);
      // Fallback final de emergência
      return this.getDefaultTemplate(templateType, variables, platform);
    }
  }

  async preparePromotionVariables(product) {
    // Log do affiliate_link que será usado
    logger.info(`🔗 Preparando variáveis de template. affiliate_link: ${product.affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);

    // IMPORTANTE: Definir preços corretamente
    // current_price = preço atual do produto (SEM cupom)
    // final_price = preço COM cupom aplicado (se houver)
    // old_price = preço antigo (antes de qualquer desconto)

    const productCurrentPrice = product.current_price || 0;
    let priceWithCoupon = null;

    if (product.coupon_id) {
      try {
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountVal = Number(coupon.discount_value) || 0;
          if (coupon.discount_type === 'percentage') {
            // Desconto percentual
            priceWithCoupon = productCurrentPrice - (productCurrentPrice * (discountVal / 100));
          } else {
            // Desconto fixo
            priceWithCoupon = Math.max(0, productCurrentPrice - discountVal);
          }

          // Aplicar limite máximo de desconto se existir
          const maxDiscount = Number(coupon.max_discount_value) || 0;
          if (maxDiscount > 0) {
            const discountAmount = productCurrentPrice - priceWithCoupon;
            if (discountAmount > maxDiscount) {
              priceWithCoupon = productCurrentPrice - maxDiscount;
            }
          }

          logger.debug(`💰 Preço atual: R$ ${productCurrentPrice} → Preço com cupom: R$ ${priceWithCoupon?.toFixed?.(2) || 'N/A'}`);
        }
      } catch (error) {
        logger.warn(`Erro ao calcular preço com cupom: ${error.message}`);
      }
    }

    // Formatar preço atual (SEM cupom)
    const currentPriceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(productCurrentPrice);

    // Formatar preço antigo (old_price) - preço ANTES de qualquer desconto
    const oldPriceFormatted = product.old_price
      ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(product.old_price)
      : null;

    // Formatar preço final (COM cupom, se houver)
    const finalPriceFormatted = priceWithCoupon
      ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(priceWithCoupon)
      : currentPriceFormatted;

    const platformName = product.platform === 'mercadolivre' ? 'Mercado Livre' :
      product.platform === 'shopee' ? 'Shopee' :
        product.platform === 'amazon' ? 'Amazon' :
          product.platform === 'aliexpress' ? 'AliExpress' : 'Geral';

    // Buscar categoria se tiver category_id
    let categoryName = 'Geral';
    if (product.category_id) {
      try {
        const Category = (await import('../../models/Category.js')).default;
        const category = await Category.findById(product.category_id);
        if (category) {
          categoryName = category.name;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar categoria: ${error.message}`);
      }
    }

    // Nome do produto será escapado depois baseado na plataforma
    const productName = product.name || 'Produto sem nome';

    // IMPORTANTE: Não gerar coupon_section para templates novos de "Promoção + Cupom"
    // O novo template usa variáveis individuais: {coupon_code}, {final_price}, etc
    // Manter coupon_section vazio para compatibilidade com templates antigos
    const couponSection = '';

    // Informações específicas para Shopee (ofertas/coleções)
    let shopeeOfferInfo = '';
    if (product.platform === 'shopee') {
      const commissionRate = product.commission_rate || 0;
      const offerType = product.offer_type;
      const periodEnd = product.period_end;

      if (commissionRate > 0) {
        shopeeOfferInfo = `\n💰 **Comissão:** ${(commissionRate * 100).toFixed(2)}%\n`;
      }

      if (offerType === 1) {
        shopeeOfferInfo += `📦 **Tipo:** Coleção de Produtos\n`;
      } else if (offerType === 2) {
        shopeeOfferInfo += `🏷️ **Tipo:** Oferta por Categoria\n`;
      }

      if (periodEnd) {
        try {
          // Garantir que periodEnd seja um Date válido
          const endDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
          if (!isNaN(endDate.getTime())) {
            shopeeOfferInfo += `⏰ **Válido até:** ${this.formatDate(endDate)}\n`;
          }
        } catch (error) {
          logger.warn(`Erro ao formatar data de validade da oferta Shopee: ${error.message}`);
        }
      }

      shopeeOfferInfo += `\n🔍 **Esta é uma oferta especial da Shopee com múltiplos produtos!**\n`;
      shopeeOfferInfo += `Clique no link para ver todos os produtos disponíveis.\n`;
    }

    // Preparar variáveis adicionais para cupom se houver
    let couponCode = '';
    let couponDiscount = '';

    // Buscar cupom se houver coupon_id
    let coupon = null;
    if (product.coupon_id) {
      try {
        coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountVal = Number(coupon.discount_value) || 0;
          const discountText = coupon.discount_type === 'percentage'
            ? `${discountVal}% OFF`
            : `R$ ${discountVal.toFixed(2)} OFF`;
          couponDiscount = discountText;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom para variáveis: ${error.message}`);
      }
    }

    // Log das variáveis preparadas
    logger.info(`📊 Variáveis de preço preparadas:`);
    logger.info(`   current_price: ${currentPriceFormatted} (preço atual SEM cupom)`);
    logger.info(`   original_price: ${currentPriceFormatted} (preço SEM cupom - novo template)`);
    logger.info(`   final_price: ${finalPriceFormatted} (preço COM cupom - novo template)`);
    logger.info(`   old_price: ${oldPriceFormatted || 'N/A'} (preço antigo riscado)`);
    logger.info(`   discount_percentage: ${product.discount_percentage || 0}%`);
    logger.info(`   coupon_code: ${couponCode || 'N/A'}`);

    return {
      product_name: productName,
      current_price: currentPriceFormatted, // Preço atual do produto (SEM cupom)
      original_price: currentPriceFormatted, // NOVO: Preço SEM cupom (para template Promoção + Cupom)
      final_price: finalPriceFormatted, // NOVO: Preço COM cupom aplicado (para template Promoção + Cupom)
      old_price: oldPriceFormatted ? ` ~~${oldPriceFormatted}~~` : '', // Preço antigo riscado (opcional)
      discount_percentage: product.discount_percentage || 0,
      platform_name: platformName,
      category_name: categoryName,
      affiliate_link: product.affiliate_link || 'Link não disponível',
      coupon_section: couponSection,
      shopee_offer_info: shopeeOfferInfo,
      is_shopee_offer: product.platform === 'shopee' ? 'true' : 'false',
      price_with_coupon: priceWithCoupon ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(priceWithCoupon) : null,
      coupon_code: couponCode, // Código do cupom (se houver)
      coupon_discount: couponDiscount
    };
  }

  /**
   * Preparar variáveis para template de cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {Object}
   */
  prepareCouponVariables(coupon) {
    const discountVal = Number(coupon.discount_value) || 0;
    const discountText = coupon.discount_type === 'percentage'
      ? `${discountVal}%`
      : `R$ ${discountVal.toFixed(2)}`;

    const platformName = this.getPlatformName(coupon.platform);

    // Verificar se é cupom capturado do Telegram
    const isTelegramCaptured = coupon.capture_source === 'telegram' || coupon.auto_captured === true;

    // Compra mínima - IMPORTANTE: retornar apenas o valor formatado, sem emoji e texto
    // A IA vai adicionar o emoji e texto "Compra mínima:" no template
    const minPurchaseVal = Number(coupon.min_purchase) || 0;
    const minPurchase = minPurchaseVal > 0
      ? `R$ ${minPurchaseVal.toFixed(2)}`
      : '';

    // Limite máximo de desconto
    const maxDiscVal = Number(coupon.max_discount_value) || 0;
    const maxDiscount = maxDiscVal > 0
      ? `💰 **Limite de desconto:** R$ ${maxDiscVal.toFixed(2)}\n`
      : '';

    // Limite de usos (não incluir para cupons do Telegram)
    const usageLimit = (!isTelegramCaptured && coupon.max_uses)
      ? `📊 **Limite de usos:** ${coupon.current_uses || 0} / ${coupon.max_uses}\n`
      : '';

    // Aplicabilidade - SEMPRE incluir quando houver informação (geral ou produtos selecionados)
    // Se is_general for null, não incluir (deixar vazio)
    let applicability = '';

    // DEBUG: Log detalhado para investigar problema
    logger.debug(`🔍 [applicability] Preparando variável applicability:`);
    logger.debug(`   is_general: ${coupon.is_general}`);
    logger.debug(`   applicable_products: ${JSON.stringify(coupon.applicable_products)}`);
    logger.debug(`   applicable_products length: ${coupon.applicable_products?.length || 0}`);

    if (coupon.is_general === true) {
      // Cupom válido para todos os produtos
      applicability = '✅ **Válido para todos os produtos**';
      logger.debug(`   ✅ Aplicabilidade definida: TODOS OS PRODUTOS`);
    } else if (coupon.is_general === false && coupon.applicable_products?.length > 0) {
      // Cupom para produtos selecionados
      const productCount = coupon.applicable_products.length;
      applicability = `📦 **Em produtos selecionados** (${productCount} produto${productCount > 1 ? 's' : ''})`;
      logger.debug(`   ✅ Aplicabilidade definida: PRODUTOS SELECIONADOS (${productCount})`);
    } else {
      // is_general é null ou false sem produtos - não mencionar nada
      applicability = '';
      logger.debug(`   ⚠️ Aplicabilidade VAZIA (is_general=${coupon.is_general}, produtos=${coupon.applicable_products?.length || 0})`);
    }

    logger.debug(`   📝 Valor final de applicability: "${applicability}"`);

    // IMPORTANTE: NÃO incluir data de validade (valid_until) na mensagem do bot
    // Sempre retornar vazio, independente de ter ou não data de expiração
    const validUntil = '';

    // Para cupons capturados do Telegram: NÃO incluir descrição, link de afiliado e data de validade
    // Incluir: plataforma, código, desconto, compra mínima, limite desconto, aplicabilidade
    if (isTelegramCaptured) {
      return {
        platform_name: platformName,
        coupon_code: coupon.code || 'N/A',
        discount_value: discountText,
        valid_until: validUntil, // NÃO incluir data de validade - sempre vazio
        min_purchase: minPurchase,
        max_discount: maxDiscount,
        usage_limit: '', // NÃO incluir limite de usos
        applicability: applicability, // Incluir aplicabilidade mesmo para cupons do Telegram
        coupon_title: '', // NÃO incluir título
        coupon_description: '', // NÃO incluir descrição
        affiliate_link: '' // NÃO incluir link de afiliado
      };
    }

    // Para cupons normais: incluir tudo, mas SEM data de validade
    return {
      platform_name: platformName,
      coupon_code: coupon.code || 'N/A',
      discount_value: discountText,
      valid_until: validUntil, // IMPORTANTE: NÃO incluir data de validade na mensagem do bot (sempre vazio)
      min_purchase: minPurchase,
      max_discount: maxDiscount,
      usage_limit: usageLimit,
      applicability: applicability,
      coupon_title: coupon.title || coupon.description || 'Cupom de Desconto',
      coupon_description: coupon.description ? `\n${coupon.description}\n` : '',
      affiliate_link: coupon.affiliate_link || 'Link não disponível'
    };
  }

  /**
   * Preparar variáveis para template de cupom expirado
   * @param {Object} coupon - Dados do cupom
   * @returns {Object}
   */
  prepareExpiredCouponVariables(coupon) {
    const platformName = this.getPlatformName(coupon.platform);

    return {
      platform_name: platformName,
      coupon_code: coupon.code || 'N/A',
      expired_date: this.formatDate(coupon.valid_until)
    };
  }


  /**
   * Converter formatação de texto baseado na plataforma e parse_mode
   * @delegated baseRenderer.convertBoldFormatting()
   */
  convertBoldFormatting(message, platform, parseMode = 'MarkdownV2') {
    return baseRenderer.convertBoldFormatting(message, platform, parseMode);
  }

  /**
  * Garantir que HTML está válido para Telegram
  * Escapa apenas caracteres especiais no conteúdo, mantendo tags HTML intactas
  * IMPORTANTE: Preservar o template exatamente como configurado, apenas fazer escape mínimo necessário
  * @param {string} message - Mensagem com HTML
  * @returns {string}
  */
  ensureValidHtml(message) {
    if (!message) return '';

    // IMPORTANTE: Se a mensagem já contém tags HTML válidas e não tem entidades escapadas,
    // retornar como está (não fazer escape desnecessário)

    // Verificar se já tem tags HTML válidas (sem entidades escapadas)
    const hasValidHtmlTags = /<[bisu]>(.*?)<\/[bisu]>/gi.test(message) ||
      /<code>(.*?)<\/code>/gi.test(message) ||
      /<pre>(.*?)<\/pre>/gi.test(message);

    // Verificar se já tem entidades escapadas (indica que já foi processado)
    const hasEscapedEntities = /&lt;|&gt;|&amp;/.test(message);

    // Se tem HTML válido e não tem entidades escapadas, retornar como está
    if (hasValidHtmlTags && !hasEscapedEntities) {
      logger.debug(`📋 HTML já está válido e não escapado, preservando template original`);
      return message;
    }

    // Se já tem entidades escapadas, pode ser que esteja duplamente escapado
    // Tentar decodificar primeiro
    if (hasEscapedEntities && /&lt;[bisu]&gt;|&lt;\/[bisu]&gt;/.test(message)) {
      logger.warn(`⚠️ Detectado HTML escapado incorretamente, tentando decodificar...`);
      let decoded = message
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>')
        .replace(/&lt;s&gt;/g, '<s>')
        .replace(/&lt;\/s&gt;/g, '</s>')
        .replace(/&lt;i&gt;/g, '<i>')
        .replace(/&lt;\/i&gt;/g, '</i>')
        .replace(/&lt;u&gt;/g, '<u>')
        .replace(/&lt;\/u&gt;/g, '</u>')
        .replace(/&lt;code&gt;/g, '<code>')
        .replace(/&lt;\/code&gt;/g, '</code>');

      // Se conseguiu decodificar, retornar
      if (decoded !== message) {
        logger.info(`✅ HTML decodificado com sucesso`);
        return decoded;
      }
    }

    // Para HTML do Telegram, precisamos escapar apenas &, <, > no conteúdo
    // Mas manter as tags HTML intactas
    // Estratégia: proteger tags HTML, escapar conteúdo, restaurar tags

    const tagPlaceholders = [];
    let placeholderIndex = 0;

    // Proteger todas as tags HTML (abertas e fechadas)
    let protectedMessage = message.replace(/<[^>]+>/g, (match) => {
      const placeholder = `__HTML_TAG_${placeholderIndex}__`;
      tagPlaceholders.push({ placeholder, tag: match });
      placeholderIndex++;
      return placeholder;
    });

    // Escapar apenas caracteres & que não são entidades HTML já válidas
    // Não escapar < e > pois já estão protegidos nas tags
    protectedMessage = protectedMessage.replace(/&(?!(amp|lt|gt|quot|#39|#x[0-9a-fA-F]+);)/g, '&amp;');

    // Restaurar tags HTML
    tagPlaceholders.forEach(({ placeholder, tag }) => {
      protectedMessage = protectedMessage.replace(placeholder, tag);
    });

    // Se a mensagem não mudou (exceto por & escapados), significa que já estava bem formatada
    if (protectedMessage === message || protectedMessage.replace(/&amp;/g, '&') === message) {
      logger.debug(`📋 HTML já está válido, preservando template original`);
      return message;
    }

    return protectedMessage;
  }

  /**
   * Converter HTML para formato específico (Markdown/MarkdownV2)
   * @delegated baseRenderer.convertHtmlToFormat()
   */
  convertHtmlToFormat(message, targetFormat) {
    return baseRenderer.convertHtmlToFormat(message, targetFormat);
  }

  /**
   * Escapar caracteres especiais do MarkdownV2
   * @delegated baseRenderer.escapeMarkdownV2()
   */
  escapeMarkdownV2(message) {
    return baseRenderer.escapeMarkdownV2(message);
  }

  /**
   * Escapar caracteres Markdown
   * @delegated baseRenderer.escapeMarkdown()
   */
  escapeMarkdown(text, platform = 'telegram') {
    return baseRenderer.escapeMarkdown(text, platform);
  }

  /**
   * Formatar data
   * @delegated baseRenderer.formatDate()
   * @param {string|Date} date - Data para formatar
   * @returns {string}
   */
  formatDate(date) {
    return baseRenderer.formatDate(date);
  }

  /**
   * Obter nome da plataforma
   * @delegated baseRenderer.getPlatformName()
   * @param {string} platform - Código da plataforma
   * @returns {string}
   */
  getPlatformName(platform) {
    return baseRenderer.getPlatformName(platform);
  }

  /**
   * Obter modo de template configurado
   * @delegated baseRenderer.getTemplateMode()
   * @param {string} templateType - Tipo do template
   * @returns {Promise<string>} - 'default', 'custom', ou 'ai_advanced'
   */
  async getTemplateMode(templateType) {
    return baseRenderer.getTemplateMode(templateType);
  }

  /**
   * Template padrão caso não encontre template customizado
   * IMPORTANTE: Estes templates devem ser IDÊNTICOS aos templates do banco de dados (03_templates.sql)
   * Isso garante consistência entre modo 'default' e fallback da IA
   * @param {string} templateType - Tipo do template
   * @param {Object} variables - Variáveis
   * @returns {string}
   */
  getDefaultTemplate(templateType, variables, platform = 'telegram') {
    // NOTA: Templates sincronizados com 03_templates.sql (Modelo Padrão 1: Simples e Direto)
    // Usar ** para negrito (será convertido para HTML/Markdown conforme plataforma)
    switch (templateType) {
      case 'new_promotion':
        // Template padrão do banco: "Modelo Padrão 1: Simples e Direto" (ATIVO)
        // Variáveis: product_name, current_price, old_price, discount_percentage, platform_name, coupon_section, affiliate_link
        return `🔥 **PROMOÇÃO IMPERDÍVEL!**

📦 ${variables.product_name || '{product_name}'}

💰 **${variables.current_price || '{current_price}'}**${variables.old_price || ''}
🏷️ **${variables.discount_percentage || 0}% OFF**

🛒 ${variables.platform_name || '{platform_name}'}
${variables.coupon_section || ''}
🔗 ${variables.affiliate_link || '{affiliate_link}'}

⚡ Corre que está acabando!`;

      case 'promotion_with_coupon':
        // Template padrão do banco: "Modelo Padrão 1: Promoção com Cupom - Simples e Direto (Atualizado)"
        // Variáveis: product_name, original_price, final_price, discount_percentage, coupon_code, platform_name, affiliate_link
        logger.info(`📋 [TEMPLATE PADRÃO] Gerando template para promotion_with_coupon`);
        logger.debug(`   Variables: ${JSON.stringify({
          product_name: variables.product_name?.substring(0, 50) || 'N/A',
          original_price: variables.original_price || 'N/A',
          current_price: variables.current_price || 'N/A',
          final_price: variables.final_price || 'N/A',
          coupon_code: variables.coupon_code || 'N/A'
        })}`);

        return `📦 ${variables.product_name || '{product_name}'}

💰 Preço: ${variables.original_price || variables.current_price || '{original_price}'}
🎟️ Com Cupom: ${variables.final_price || variables.price_with_coupon || '{final_price}'}
🏷️ ${variables.discount_percentage || 0}% OFF

🎟️ CUPOM: \`${variables.coupon_code || '{coupon_code}'}\`

🛒 Plataforma: ${variables.platform_name || '{platform_name}'}

🔗 ${variables.affiliate_link || '{affiliate_link}'}

⚡ Economia dupla! Aproveite agora!`;

      case 'new_coupon':
        // Template padrão do banco: "Modelo Padrão 1: Simples e Direto" (ATIVO)
        // Variáveis: platform_name, coupon_code, discount_value, min_purchase, applicability, coupon_title, coupon_description, affiliate_link

        // Construir mensagem linha por linha para evitar linhas vazias desnecessárias
        let couponMsg = `🎟️ **NOVO CUPOM DISPONÍVEL!**

🏪 ${variables.platform_name || '{platform_name}'}

💬 **CÓDIGO:** \`${variables.coupon_code || '{coupon_code}'}\`

💰 **DESCONTO:** ${variables.discount_value || '{discount_value}'} OFF`;

        // Adicionar compra mínima apenas se existir
        if (variables.min_purchase && variables.min_purchase.trim()) {
          couponMsg += `\n💳 **Compra mínima:** ${variables.min_purchase}`;
        }

        // Adicionar limite de desconto apenas se existir
        if (variables.max_discount && variables.max_discount.trim()) {
          couponMsg += `\n${variables.max_discount}`;
        }

        // Adicionar aplicabilidade apenas se existir
        if (variables.applicability && variables.applicability.trim()) {
          couponMsg += `\n${variables.applicability}`;
        }

        // Adicionar título e descrição se existirem
        if (variables.coupon_title && variables.coupon_title.trim()) {
          couponMsg += `\n\n📝 ${variables.coupon_title}`;
        }
        if (variables.coupon_description && variables.coupon_description.trim()) {
          couponMsg += `\n${variables.coupon_description}`;
        }

        // Adicionar link se existir
        if (variables.affiliate_link && variables.affiliate_link !== 'Link não disponível' && variables.affiliate_link.trim()) {
          couponMsg += `\n\n🔗 ${variables.affiliate_link}`;
        }

        couponMsg += `\n\n⚡ Use agora e economize!`;

        return couponMsg;

      case 'expired_coupon':
        // Template padrão do banco: "Modelo Padrão 1: Simples e Direto" (ATIVO)
        // Variáveis: platform_name, coupon_code, expired_date
        return `⚠️ **CUPOM EXPIROU**

🏪 ${variables.platform_name || '{platform_name}'}
💬 Código: \`${variables.coupon_code || '{coupon_code}'}\`
📅 Expirado em: ${variables.expired_date || '{expired_date}'}

😔 Este cupom não está mais disponível.
🔔 Fique atento às próximas promoções!`;

      default:
        return 'Mensagem não configurada';
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - PROCESSAMENTO DE TEMPLATES
  // ============================================================================

  /**
   * Remover menções à data de validade do template de cupom gerado por IA
   * @private
   */
  _removeCouponValidityFromAiTemplate(message) {
    return message
      // Padrões com emojis e formatação
      .replace(/\n?📅\s*\*\*?Válido até:\*\*?\s*\{?valid_until\}?[^\n]*\n?/gi, '')
      .replace(/\n?📅\s*\*\*?Válido até\*\*?:\s*[^\n]*\n?/gi, '')
      .replace(/\n?📅\s*Válido até:\s*[^\n]*\n?/gi, '')
      .replace(/\n?⏳\s*Expira em:\s*[^\n]*\n?/gi, '')
      .replace(/\n?⏰\s*Válido por tempo limitado[^\n]*\n?/gi, '')
      // Padrões de texto simples
      .replace(/Válido até \d{2}\/\d{2}\/\d{4}/gi, '')
      .replace(/Oferta válida até [^\n]*/gi, '')
      // Remover linhas vazias extras criadas
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Remover menções à plataforma do template
   * @private
   */
  _removePlatformMentions(message, platform) {
    const platformName = this.getPlatformName(platform);
    if (!platformName) return message;

    // Remover "no [Plataforma]" ou "na [Plataforma]"
    const regex = new RegExp(`\\s+(no|na|em)\\s+${platformName}`, 'gi');
    return message.replace(regex, '');
  }

  /**
   * Garantir que o código do cupom esteja presente
   * @private
   */
  _ensureCouponCodePresent(message, couponCode) {
    if (!couponCode) return message;

    // Se o código já está na mensagem, retornar
    if (message.includes(couponCode)) return message;

    // Tentar encontrar onde inserir
    if (message.includes('CUPOM:')) {
      return message.replace(/CUPOM:/i, `CUPOM: \`${couponCode}\``);
    }

    // Inserir no final antes do link
    if (message.includes('🔗') || message.includes('http')) {
      const parts = message.split(/(?=🔗|http)/);
      return `${parts[0]}\n🎟️ Cupom: \`${couponCode}\`\n\n${parts.slice(1).join('')}`;
    }

    return `${message}\n\n🎟️ Cupom: \`${couponCode}\``;
  }

  /**
   * Processar template de cupom gerado por IA
   * @private
   */
  _processCouponAiTemplate(message, contextData) {
    let processedMessage = message;

    // 1. Remover data de validade (cupons são atemporais no sistema até expirarem)
    processedMessage = this._removeCouponValidityFromAiTemplate(processedMessage);

    // 2. Remover menção à plataforma (será injetada via variável se necessário)
    if (contextData.platform) {
      processedMessage = this._removePlatformMentions(processedMessage, contextData.platform);
    }

    // 3. Garantir que o código do cupom esteja presente
    if (contextData.coupon && contextData.coupon.code) {
      processedMessage = this._ensureCouponCodePresent(processedMessage, contextData.coupon.code);
    }

    return processedMessage;
  }

  /**
   * Pós-processamento de cleanup para templates de IA
   * @private
   */
  _postProcessAiTemplate(message, templateType, variables, contextData) {
    let processedMessage = message;

    // 1. Limpeza de artefatos da IA
    processedMessage = processedMessage
      .replace(/\(de\s+~~\s*([^~]+?)~~\)/g, ' ~~$1~~')
      .replace(/\(de\s+~~\s+([^~]+?)~~\)/g, ' ~~$1~~')
      .replace(/(~~\s*)+~~/g, '~~')
      .replace(/~{3,}/g, '~~')
      .replace(/R\$\s*~~\s*~*R\$/gi, '~~R$')
      .replace(/~~.*?~~\s*R\$/gi, '~~R$')
      .replace(/\s*\.\.\.\s*\(mensagem\s+truncada\)/gi, '')
      .replace(/\s*\(mensagem\s+truncada\)/gi, '')
      .replace(/\s*\[continua\s+na\s+próxima\s+mensagem\]/gi, '')
      .replace(/\s*\/\/.*$/gm, '')
      .replace(/\n\s*Nota:.*$/gmi, '')
      .replace(/<[^>]+>/g, '') // Remover HTML residual
      .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`'); // Restaurar código

    // 2. Garantir product_name para promoções
    if ((templateType === 'new_promotion' || templateType === 'promotion_with_coupon') &&
      contextData.product && contextData.product.name) {

      const productName = variables.product_name || contextData.product.name;
      // Lógica simplificada de verificação de título
      if (!processedMessage.includes('{product_name}') &&
        !processedMessage.toLowerCase().includes(productName.toLowerCase().substring(0, 20))) {

        // Adicionar título no topo se não encontrado
        processedMessage = `📦 **{product_name}**\n\n${processedMessage}`;
        logger.info(`✅ [IA CLEANUP] Título do produto adicionado ao topo`);
      }
    }

    // 3. Formatação segura de código de cupom
    if (contextData.coupon && contextData.coupon.code && variables.coupon_code) {
      const code = variables.coupon_code;
      // Evitar duplicidade de formatação (ex: ` `CODE` `)
      const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Se não estiver formatado com backticks ou code, formatar
      if (!processedMessage.match(new RegExp(`\`${escapedCode}\``)) &&
        !processedMessage.match(new RegExp(`<code>${escapedCode}</code>`))) {
        processedMessage = processedMessage.replace(new RegExp(`\\b${escapedCode}\\b`, 'g'), `\`${code}\``);
      }
    }

    return processedMessage;
  }

  /**
   * Renderizar usando IA Advanced
   * @private
   */
  async _renderWithAiAdvanced(templateType, platform, variables, contextData) {
    logger.info(`🤖 [IA ADVANCED] Gerando template dinamicamente para ${templateType}`);
    const advancedTemplateGenerator = (await import('../../ai/advancedTemplateGenerator.js')).default;
    let message = '';

    try {
      if (templateType === 'new_promotion' || templateType === 'promotion_with_coupon') {
        message = await advancedTemplateGenerator.generatePromotionTemplate(contextData.product || contextData, platform);
      } else if (templateType === 'new_coupon') {
        message = await advancedTemplateGenerator.generateCouponTemplate(contextData.coupon || contextData, platform);
        message = this._processCouponAiTemplate(message, contextData);
      } else if (templateType === 'expired_coupon') {
        message = await advancedTemplateGenerator.generateExpiredCouponTemplate(contextData.coupon || contextData, platform);
      } else {
        throw new Error(`Tipo de template não suportado para IA ADVANCED: ${templateType}`);
      }

      message = this._postProcessAiTemplate(message, templateType, variables, contextData);
      return message;

    } catch (aiError) {
      logger.error(`❌ [IA ADVANCED] Erro: ${aiError.message}. Usando Fallback.`);

      try {
        return this._renderWithDefault(templateType, platform, variables);
      } catch (fallbackError) {
        const template = await BotMessageTemplate.findByType(templateType, platform);
        if (template && template.is_active) return template.template;
        throw new Error(`Falha total na renderização IA + Fallback: ${aiError.message}`);
      }
    }
  }

  /**
   * Renderizar usando template padrão
   * @private
   */
  _renderWithDefault(templateType, platform, variables) {
    return this.getDefaultTemplate(templateType, variables, platform);
  }

  /**
   * Renderizar usando template customizado
   * @private
   */
  async _renderWithCustom(templateType, platform, variables) {
    const template = await BotMessageTemplate.findByType(templateType, platform);
    if (template && template.is_active) {
      return template.template;
    }
    logger.warn(`⚠️ Template customizado não encontrado/ativo para ${templateType}, usando default`);
    return this._renderWithDefault(templateType, platform, variables);
  }

  /**
   * Substituir variáveis no template
   * @private
   */
  _replaceVariables(message, variables, templateMode, platform, contextData) {
    let finalMessage = message;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      let replacement = value !== null && value !== undefined ? String(value) : '';

      // Trazendo a lógica de limpeza de variáveis do render() original
      if (key === 'valid_until') replacement = '';

      // Remover menção à plataforma em AI Advanced (logo já diz tudo)
      if (key === 'platform_name' && templateMode === 'ai_advanced') {
        replacement = '';
        // Também limpar linhas que só tinham a plataforma
        finalMessage = finalMessage.replace(new RegExp(`.*\\{${key}\\}.*\\n?`, 'gi'), '');
        finalMessage = finalMessage.replace(/.*(Mercado Livre|Shopee|Amazon|AliExpress).*$/gmi, '');
      }

      if (key === 'coupon_code' && replacement && replacement !== 'N/A') {
        // Lógica de formatação de cupom simplificada se não estiver formatado
        if (!finalMessage.includes(`\`${replacement}\``) && !finalMessage.includes(replacement)) {
          replacement = `\`${replacement}\``;
        }
      }

      if (key === 'min_purchase' && replacement) {
        // Limpar "Compra mínima:" duplicado na variável
        replacement = replacement.replace(/.*Compra\s+mínima:\s*/gi, '').trim();
        if (!replacement.startsWith('R$')) replacement = `R$ ${replacement}`;
      }

      if (key === 'affiliate_link') {
        if (!replacement || replacement === 'Link não disponível' || !replacement.trim()) {
          if (contextData?.product?.affiliate_link) replacement = contextData.product.affiliate_link;
        }
      }

      if (key === 'applicability') {
        if (!replacement || !replacement.trim()) {
          // Remover linha vazia
          finalMessage = finalMessage.replace(new RegExp(`.*\\{applicability\\}.*\\n?`, 'gi'), '');
          continue;
        }
      }

      finalMessage = finalMessage.replace(regex, replacement);
    }
    return finalMessage;
  }

  /**
   * Finalizar mensagem (limpeza final e formatação)
   * @private
   */
  _finalizeMessage(message, templateMode, templateType, variables, contextData, platform) {
    let final = message;

    // Limpeza de formatação de preços quebrados
    if (templateMode === 'ai_advanced') {
      final = final
        .replace(/(R\$\s*[\d.,]+)(💰|💵|🏷️|🎟️)/g, '$1\n$2')
        .replace(/([^\n\s])(🔗|👉|⚡|🔥)/g, '$1\n$2')
        .replace(/\n{3,}/g, '\n\n');
    }

    // Se for cupom, remover linhas de validade residuais
    if (templateType === 'new_coupon') {
      final = this._removeCouponValidityFromAiTemplate(final);
    }

    // Validação final de código de cupom
    if (variables.coupon_code && variables.coupon_code !== 'N/A') {
      final = this._ensureCouponCodePresent(final, variables.coupon_code);
    }



    // Converter formatação para o padrão da plataforma
    // Telegram: Forçamos HTML pois o NotificationDispatcher força HTML
    if (platform === 'telegram') {
      final = baseRenderer.convertBoldFormatting(final, platform, 'HTML');
      logger.debug(`🔍 Output Telegram (HTML): ${final.substring(final.indexOf('CUPOM:'), final.indexOf('CUPOM:') + 50)}`);
    } else if (platform === 'whatsapp') {
      final = baseRenderer.convertBoldFormatting(final, platform, 'Markdown');
    }

    return final.trim();
  }

}

export default new TemplateRenderer();
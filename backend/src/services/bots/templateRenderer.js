import BotMessageTemplate from '../../models/BotMessageTemplate.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';

class TemplateRenderer {
  /**
   * Renderizar template com variáveis
   * @param {string} templateType - Tipo do template
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @param {Object} variables - Variáveis para substituir
   * @returns {Promise<string>}
   */
  async render(templateType, platform, variables = {}) {
    try {
      logger.info(`🎨 Renderizando template: ${templateType} para ${platform}`);
      
      // Buscar template ativo
      const template = await BotMessageTemplate.findByType(templateType, platform);
      
      if (!template) {
        logger.warn(`⚠️ Template não encontrado: ${templateType} para ${platform}, usando template padrão`);
        const defaultMsg = this.getDefaultTemplate(templateType, variables, platform);
        // Buscar parse_mode para Telegram
        let parseMode = 'HTML';
        if (platform === 'telegram') {
          try {
            const BotConfig = (await import('../../models/BotConfig.js')).default;
            const botConfig = await BotConfig.get();
            const configuredMode = botConfig.telegram_parse_mode || 'HTML';
            // Usar HTML que é mais confiável
            parseMode = (configuredMode === 'Markdown' || configuredMode === 'MarkdownV2') ? 'HTML' : configuredMode;
          } catch (error) {
            // Usar HTML como padrão
            parseMode = 'HTML';
          }
        }
        return this.convertBoldFormatting(defaultMsg, platform, parseMode);
      }

      if (!template.is_active) {
        logger.warn(`⚠️ Template encontrado mas está inativo: ${templateType} para ${platform}, usando template padrão`);
        const defaultMsg = this.getDefaultTemplate(templateType, variables, platform);
        // Buscar parse_mode para Telegram
        let parseMode = 'HTML';
        if (platform === 'telegram') {
          try {
            const BotConfig = (await import('../../models/BotConfig.js')).default;
            const botConfig = await BotConfig.get();
            const configuredMode = botConfig.telegram_parse_mode || 'HTML';
            // Usar HTML que é mais confiável
            parseMode = (configuredMode === 'Markdown' || configuredMode === 'MarkdownV2') ? 'HTML' : configuredMode;
          } catch (error) {
            // Usar HTML como padrão
            parseMode = 'HTML';
          }
        }
        return this.convertBoldFormatting(defaultMsg, platform, parseMode);
      }

      logger.info(`✅ Template encontrado e ativo: ${template.id} - ${template.template_type} para ${template.platform}`);
      logger.debug(`📋 Template original: ${template.template.substring(0, 200)}...`);

      // Substituir variáveis no template
      let message = template.template;
      
      // Primeiro, substituir todas as variáveis (mesmo as vazias)
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        const replacement = value !== null && value !== undefined ? String(value) : '';
        message = message.replace(regex, replacement);
      }

      // Agora, remover linhas que ficaram vazias após substituição
      // Remover linhas que contêm apenas espaços, tags HTML vazias, ou que são completamente vazias
      const lines = message.split('\n');
      const cleanedLines = lines.map((line) => {
        const trimmed = line.trim();
        
        // Se a linha está completamente vazia, remover
        if (!trimmed) {
          return null;
        }
        
        // Se a linha contém apenas tags HTML vazias ou espaços, remover
        if (trimmed.match(/^[\s<>\/]*$/)) {
          return null;
        }
        
        // Se a linha contém apenas tags HTML sem conteúdo (ex: <b></b>, <code></code>)
        if (trimmed.match(/^<[^>]+><\/[^>]+>$/)) {
          return null;
        }
        
        // Remover conteúdo HTML para verificar se há texto real
        const withoutHtml = trimmed.replace(/<[^>]+>/g, '').trim();
        
        // Se após remover HTML não há conteúdo, remover linha
        if (!withoutHtml || withoutHtml.match(/^[\s\p{Emoji}:]*$/u)) {
          return null;
        }
        
        // Remover linhas que têm apenas label sem valor após substituição
        // Exemplo: "📅 <b>VÁLIDO ATÉ:</b>" ou "📅 <b>VÁLIDO ATÉ:</b> " (sem valor)
        // Padrão: emoji + tags HTML + texto + ":" + apenas espaços no final
        if (trimmed.match(/^[\s\p{Emoji}<>\/]*<[^>]+>[^<]*<\/[^>]+>[\s:]*\s*$/u)) {
          return null;
        }
        
        // Verificar se a linha tem apenas label e dois pontos, sem valor real
        // Exemplo: "📅 <b>VÁLIDO ATÉ:</b>" ou "<b>CÓDIGO:</b>" sem valor após
        if (trimmed.match(/^[\s\p{Emoji}<>\/]*<[^>]+>[^<]*<\/[^>]+>[\s:]*$/u)) {
          return null;
        }
        
        return line;
      }).filter(line => line !== null);
      
      message = cleanedLines.join('\n');

      // Verificar se o template já está em HTML ou Markdown
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(message);
      const hasMarkdownBold = /\*\*[^*]+\*\*/.test(message);
      
      // Determinar parse_mode para Telegram
      let parseMode = 'HTML'; // Padrão HTML para melhor compatibilidade
      if (platform === 'telegram') {
        try {
          const BotConfig = (await import('../../models/BotConfig.js')).default;
          const botConfig = await BotConfig.get();
          const configuredMode = botConfig.telegram_parse_mode || 'HTML';
          
          // HTML é mais confiável e suporta tudo (negrito, riscado, itálico, etc)
          if (configuredMode === 'Markdown' || configuredMode === 'MarkdownV2') {
            parseMode = 'HTML';
          } else {
            parseMode = configuredMode;
          }
        } catch (error) {
          logger.warn(`Erro ao buscar parse_mode, usando HTML: ${error.message}`);
          parseMode = 'HTML';
        }
      }
      
      // Se o template já está em HTML (salvo no painel admin), garantir que está correto
      if (hasHtmlTags) {
        logger.debug(`📋 Template já contém HTML, validando formatação`);
        // Se o parse_mode é HTML, manter HTML mas garantir formatação correta
        if (platform === 'telegram' && parseMode === 'HTML') {
          // Para HTML do Telegram, apenas garantir que caracteres especiais no conteúdo estejam escapados
          // Mas manter as tags HTML intactas
          // O Telegram processa HTML automaticamente se parse_mode='HTML' for passado
          // Não fazer escape excessivo que possa quebrar as tags
          message = this.ensureValidHtml(message);
        } else if (platform === 'telegram' && parseMode !== 'HTML') {
          // Converter HTML para Markdown/MarkdownV2
          message = this.convertHtmlToFormat(message, parseMode);
        }
      } else if (hasMarkdownBold) {
        // Se tem Markdown, converter para o formato da plataforma
        message = this.convertBoldFormatting(message, platform, parseMode);
      }

      // Limpar linhas vazias extras (máximo 2 quebras de linha consecutivas)
      message = message.replace(/\n{3,}/g, '\n\n').trim();
      
      // Remover espaços em branco no início/fim de cada linha (mas manter estrutura)
      message = message.split('\n').map(line => {
        // Se a linha contém HTML, não remover espaços dentro das tags
        if (line.includes('<')) {
          // Remover espaços no início e fim, mas manter dentro das tags
          return line.trim();
        }
        return line.trim();
      }).join('\n');

      // Verificar se a mensagem final está muito vazia ou mal formatada
      // Se tiver muitas tags HTML sem conteúdo, usar template padrão
      const htmlTagCount = (message.match(/<[^>]+>/g) || []).length;
      const textContent = message.replace(/<[^>]+>/g, '').trim();
      
      // Se há muitas tags HTML mas pouco conteúdo, pode ser template mal formatado
      if (htmlTagCount > 0 && textContent.length < 50 && htmlTagCount > textContent.length / 10) {
        logger.warn(`⚠️ Template pode estar mal formatado (muitas tags HTML, pouco conteúdo). Usando template padrão.`);
        const defaultMsg = this.getDefaultTemplate(templateType, variables, platform);
        let parseMode = 'HTML';
        if (platform === 'telegram') {
          try {
            const BotConfig = (await import('../../models/BotConfig.js')).default;
            const botConfig = await BotConfig.get();
            parseMode = botConfig.telegram_parse_mode || 'HTML';
            if (parseMode === 'Markdown' || parseMode === 'MarkdownV2') {
              parseMode = 'HTML';
            }
          } catch (error) {
            parseMode = 'HTML';
          }
        }
        return this.convertBoldFormatting(defaultMsg, platform, parseMode);
      }

      logger.debug(`📝 Mensagem renderizada (${message.length} caracteres)`);

      return message;
    } catch (error) {
      logger.error(`❌ Erro ao renderizar template: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      const defaultMsg = this.getDefaultTemplate(templateType, variables, platform);
      // Buscar parse_mode para Telegram
      let parseMode = 'MarkdownV2';
      if (platform === 'telegram') {
        try {
          const BotConfig = (await import('../../models/BotConfig.js')).default;
          const botConfig = await BotConfig.get();
          parseMode = botConfig.telegram_parse_mode || 'MarkdownV2';
        } catch (error) {
          // Usar padrão
        }
      }
      return this.convertBoldFormatting(defaultMsg, platform, parseMode);
    }
  }

  /**
   * Preparar variáveis para template de promoção
   * @param {Object} product - Dados do produto
   * @returns {Promise<Object>}
   */
  async preparePromotionVariables(product) {
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(product.current_price);

    const oldPriceFormatted = product.old_price 
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(product.old_price)
      : null;

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

    // Preparar seção de cupom se houver
    let couponSection = '';
    if (product.coupon_id) {
      try {
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountText = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : `R$ ${coupon.discount_value.toFixed(2)}`;
          
          couponSection = `\n🎟️ **CUPOM DISPONÍVEL**\n\n`;
          couponSection += `💬 **Código:** \`${coupon.code}\`\n`;
          couponSection += `💰 **Desconto:** ${discountText} OFF\n`;
          
          if (coupon.min_purchase > 0) {
            couponSection += `💳 **Compra mínima:** R$ ${coupon.min_purchase.toFixed(2)}\n`;
          }
          
          // Limite máximo de desconto
          if (coupon.max_discount_value > 0) {
            couponSection += `💰 **Limite de desconto:** R$ ${coupon.max_discount_value.toFixed(2)}\n`;
          }
          
          // Limite de usos
          if (coupon.max_uses) {
            couponSection += `📊 **Limite de usos:** ${coupon.current_uses || 0} / ${coupon.max_uses}\n`;
          }
          
          // Aplicabilidade
          if (coupon.is_general) {
            couponSection += `✅ **Válido para todos os produtos**\n`;
          } else {
            const productCount = coupon.applicable_products?.length || 0;
            if (productCount > 0) {
              couponSection += `📦 **Em produtos selecionados** (${productCount} produto${productCount > 1 ? 's' : ''})\n`;
            } else {
              couponSection += `📦 **Em produtos selecionados**\n`;
            }
          }
          
          couponSection += `📅 **Válido até:** ${this.formatDate(coupon.valid_until)}\n`;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom ${product.coupon_id}: ${error.message}`);
      }
    }

    return {
      product_name: productName,
      current_price: priceFormatted,
      old_price: oldPriceFormatted ? ` ~~${oldPriceFormatted}~~` : '',
      discount_percentage: product.discount_percentage || 0,
      platform_name: platformName,
      category_name: categoryName,
      affiliate_link: product.affiliate_link || 'Link não disponível',
      coupon_section: couponSection
    };
  }

  /**
   * Preparar variáveis para template de cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {Object}
   */
  prepareCouponVariables(coupon) {
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    const platformName = this.getPlatformName(coupon.platform);
    
    // Verificar se é cupom capturado do Telegram
    const isTelegramCaptured = coupon.capture_source === 'telegram' || coupon.auto_captured === true;
    
    // Compra mínima
    const minPurchase = coupon.min_purchase > 0
      ? `💳 **Compra mínima:** R$ ${coupon.min_purchase.toFixed(2)}\n`
      : '';

    // Limite máximo de desconto
    const maxDiscount = coupon.max_discount_value > 0
      ? `💰 **Limite de desconto:** R$ ${coupon.max_discount_value.toFixed(2)}\n`
      : '';

    // Limite de usos (não incluir para cupons do Telegram)
    const usageLimit = (!isTelegramCaptured && coupon.max_uses)
      ? `📊 **Limite de usos:** ${coupon.current_uses || 0} / ${coupon.max_uses}\n`
      : '';

    // Aplicabilidade (não incluir para cupons do Telegram)
    let applicability = '';
    if (!isTelegramCaptured) {
      if (coupon.is_general) {
        applicability = '✅ **Válido para todos os produtos**';
      } else {
        const productCount = coupon.applicable_products?.length || 0;
        if (productCount > 0) {
          applicability = `📦 **Em produtos selecionados** (${productCount} produto${productCount > 1 ? 's' : ''})`;
        } else {
          applicability = '📦 **Em produtos selecionados**';
        }
      }
    }

    // Para cupons capturados do Telegram: NÃO incluir descrição e link de afiliado
    // Incluir: plataforma, código, desconto, compra mínima, limite desconto, aviso de expiração
    if (isTelegramCaptured) {
      // Se não tem data de validade ou é muito genérica, usar aviso padrão
      let validUntilText = '⚠️ Sujeito à expiração';
      if (coupon.valid_until) {
        try {
          const validDate = new Date(coupon.valid_until);
          if (!isNaN(validDate.getTime()) && validDate > new Date()) {
            // Data válida no futuro, formatar
            validUntilText = this.formatDate(coupon.valid_until);
          }
        } catch (error) {
          // Manter aviso padrão se erro ao parsear data
        }
      }

      return {
        platform_name: platformName,
        coupon_code: coupon.code || 'N/A',
        discount_value: discountText,
        valid_until: validUntilText,
        min_purchase: minPurchase,
        max_discount: maxDiscount,
        usage_limit: '', // NÃO incluir limite de usos
        applicability: '', // NÃO incluir aplicabilidade
        coupon_title: '', // NÃO incluir título
        coupon_description: '', // NÃO incluir descrição
        affiliate_link: '' // NÃO incluir link de afiliado
      };
    }

    // Para cupons normais: incluir tudo
    return {
      platform_name: platformName,
      coupon_code: coupon.code || 'N/A',
      discount_value: discountText,
      valid_until: this.formatDate(coupon.valid_until),
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
   * Telegram MarkdownV2: *texto* = negrito, ~texto~ = riscado
   * Telegram HTML: <b>texto</b> = negrito, <s>texto</s> = riscado
   * Telegram Markdown (legado): *texto* = negrito, _texto_ = itálico (não suporta riscado)
   * WhatsApp: *texto* = negrito, ~texto~ = riscado
   * @param {string} message - Mensagem com formatação
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @param {string} parseMode - Parse mode do Telegram (Markdown, MarkdownV2, HTML) - opcional
   * @returns {string}
   */
  convertBoldFormatting(message, platform, parseMode = 'MarkdownV2') {
    if (!message) return '';
    
    // Proteger código dentro de backticks
    const codeBlocks = [];
    let codeIndex = 0;
    
    // Substituir código por placeholders temporários
    message = message.replace(/`([^`]+)`/g, (match, content) => {
      const placeholder = `__CODE_BLOCK_${codeIndex}__`;
      // Armazenar o conteúdo e o formato original
      codeBlocks[codeIndex] = {
        original: match,
        content: content
      };
      codeIndex++;
      return placeholder;
    });
    
    if (platform === 'whatsapp') {
      // Converter **texto** para *texto* - negrito
      message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      
      // Converter ~~texto~~ para ~texto~ - riscado
      message = message.replace(/~~([^~]+?)~~/g, '~$1~');
      
    } else if (platform === 'telegram') {
      // Converter negrito: **texto** para formato correto
      if (parseMode === 'HTML') {
        // HTML: <b>texto</b> para negrito
        // Escapar HTML dentro do conteúdo antes de converter
        message = message.replace(/\*\*([^*]+?)\*\*/g, (match, content) => {
          const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<b>${escaped}</b>`;
        });
        message = message.replace(/\*([^*\n]+?)\*/g, (match, content) => {
          const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<b>${escaped}</b>`;
        });
      } else if (parseMode === 'MarkdownV2') {
        // MarkdownV2: *texto* para negrito
        message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      } else {
        // Markdown (legado): *texto* para negrito
        message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      }
      
      // Converter riscado: ~~texto~~ para formato correto
      if (parseMode === 'HTML') {
        // HTML: <s>texto</s> para riscado
        // Escapar HTML dentro do conteúdo antes de converter
        message = message.replace(/~~([^~]+?)~~/g, (match, content) => {
          const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<s>${escaped}</s>`;
        });
        message = message.replace(/~([^~\n]+?)~/g, (match, content) => {
          const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<s>${escaped}</s>`;
        });
      } else if (parseMode === 'MarkdownV2') {
        // MarkdownV2: ~texto~ para riscado (não ~~texto~~)
        // Converter ~~texto~~ para ~texto~
        message = message.replace(/~~([^~]+?)~~/g, '~$1~');
      } else {
        // Markdown (legado): não suporta riscado, remover formatação mas manter texto
        message = message.replace(/~~([^~]+?)~~/g, '$1');
        message = message.replace(/~([^~\n]+?)~/g, '$1');
      }
    }
    // Se platform for 'all', manter como está (será convertido quando usado)
    
    // Restaurar código com formatação correta baseada no parse_mode
    codeBlocks.forEach((codeBlock, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      let restoredCode;
      
      if (platform === 'telegram' && parseMode === 'HTML') {
        // HTML: converter backticks para <code>texto</code>
        const escapedContent = codeBlock.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        restoredCode = `<code>${escapedContent}</code>`;
      } else if (platform === 'telegram' && parseMode === 'MarkdownV2') {
        // MarkdownV2: manter backticks mas escapar caracteres especiais dentro
        const escapedContent = codeBlock.content
          .replace(/_/g, '\\_')
          .replace(/\*/g, '\\*')
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
        restoredCode = `\`${escapedContent}\``;
      } else {
        // Markdown (legado) ou WhatsApp: manter backticks originais
        restoredCode = codeBlock.original;
      }
      
      message = message.replace(placeholder, restoredCode);
    });
    
    return message;
  }

  /**
   * Garantir que HTML está válido para Telegram
   * Escapa apenas caracteres especiais no conteúdo, mantendo tags HTML intactas
   * @param {string} message - Mensagem com HTML
   * @returns {string}
   */
  ensureValidHtml(message) {
    if (!message) return '';
    
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
    
    // Escapar caracteres especiais no conteúdo (fora das tags)
    protectedMessage = protectedMessage
      .replace(/&(?!(amp|lt|gt|quot|#39|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Restaurar tags HTML
    tagPlaceholders.forEach(({ placeholder, tag }) => {
      protectedMessage = protectedMessage.replace(placeholder, tag);
    });
    
    return protectedMessage;
  }

  /**
   * Converter HTML para formato específico (Markdown/MarkdownV2)
   * @param {string} message - Mensagem com HTML
   * @param {string} targetFormat - Formato alvo (Markdown, MarkdownV2)
   * @returns {string}
   */
  convertHtmlToFormat(message, targetFormat) {
    if (!message) return '';
    
    // Converter <b>texto</b> para **texto** ou *texto*
    if (targetFormat === 'MarkdownV2' || targetFormat === 'Markdown') {
      message = message.replace(/<b>(.*?)<\/b>/gi, '*$1*');
      message = message.replace(/<strong>(.*?)<\/strong>/gi, '*$1*');
      message = message.replace(/<i>(.*?)<\/i>/gi, '_$1_');
      message = message.replace(/<em>(.*?)<\/em>/gi, '_$1_');
      message = message.replace(/<s>(.*?)<\/s>/gi, '~$1~');
      message = message.replace(/<strike>(.*?)<\/strike>/gi, '~$1~');
      message = message.replace(/<code>(.*?)<\/code>/gi, '`$1`');
      message = message.replace(/<pre>(.*?)<\/pre>/gi, '```$1```');
    }
    
    // Remover outras tags HTML não suportadas
    message = message.replace(/<[^>]+>/g, '');
    
    // Decodificar entidades HTML
    message = message
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return message;
  }

  /**
   * Escapar caracteres especiais do MarkdownV2
   * MarkdownV2 requer escape de: _ * [ ] ( ) ~ ` > # + - = | { } . !
   * Mas não dentro de entidades de formatação (*texto*, ~texto~, etc)
   * @param {string} message - Mensagem para escapar
   * @returns {string}
   */
  escapeMarkdownV2(message) {
    if (!message) return '';
    
    // Caracteres que precisam ser escapados no MarkdownV2
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    
    // Proteger entidades de formatação (negrito, riscado, código, links)
    const entities = [];
    let entityIndex = 0;
    
    // Proteger código: `texto`
    message = message.replace(/`([^`]+)`/g, (match) => {
      const placeholder = `__ENTITY_${entityIndex}__`;
      entities[entityIndex] = match;
      entityIndex++;
      return placeholder;
    });
    
    // Proteger negrito: *texto*
    message = message.replace(/\*([^*\n]+?)\*/g, (match) => {
      const placeholder = `__ENTITY_${entityIndex}__`;
      entities[entityIndex] = match;
      entityIndex++;
      return placeholder;
    });
    
    // Proteger riscado: ~texto~
    message = message.replace(/~([^~\n]+?)~/g, (match) => {
      const placeholder = `__ENTITY_${entityIndex}__`;
      entities[entityIndex] = match;
      entityIndex++;
      return placeholder;
    });
    
    // Proteger links: [texto](url)
    message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
      const placeholder = `__ENTITY_${entityIndex}__`;
      entities[entityIndex] = match;
      entityIndex++;
      return placeholder;
    });
    
    // Escapar caracteres especiais no resto do texto
    for (const char of specialChars) {
      const regex = new RegExp(`\\${char}`, 'g');
      message = message.replace(regex, `\\${char}`);
    }
    
    // Restaurar entidades
    entities.forEach((entity, index) => {
      message = message.replace(`__ENTITY_${index}__`, entity);
    });
    
    return message;
  }

  /**
   * Escapar caracteres Markdown
   * @param {string} text - Texto para escapar
   * @param {string} platform - Plataforma (telegram, whatsapp) - opcional
   * @returns {string}
   */
  escapeMarkdown(text, platform = 'telegram') {
    if (!text) return '';
    
    // Para WhatsApp, não escapar asteriscos simples (usados para negrito)
    // Para Telegram, não escapar asteriscos duplos (usados para negrito)
    let escaped = String(text);
    
    if (platform === 'whatsapp') {
      // Escapar apenas asteriscos duplos e outros caracteres especiais
      // Manter asteriscos simples para negrito
      escaped = escaped
        .replace(/\*\*/g, '\\*\\*') // Escapar **
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
    } else {
      // Telegram: escapar todos os asteriscos simples, mas não duplos (usados para negrito)
      // Isso é mais complexo, então vamos escapar tudo e depois restaurar **
      escaped = escaped
        .replace(/\*\*/g, '___DOUBLE_ASTERISK___') // Temporariamente substituir **
        .replace(/\*/g, '\\*') // Escapar todos os *
        .replace(/___DOUBLE_ASTERISK___/g, '**') // Restaurar **
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
    
    return escaped;
  }

  /**
   * Formatar data
   * @param {string|Date} date - Data para formatar
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obter nome da plataforma
   * @param {string} platform - Código da plataforma
   * @returns {string}
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
   * Template padrão caso não encontre template customizado
   * @param {string} templateType - Tipo do template
   * @param {Object} variables - Variáveis
   * @returns {string}
   */
  getDefaultTemplate(templateType, variables, platform = 'telegram') {
    // Usar ** para negrito (será convertido automaticamente para WhatsApp)
    switch (templateType) {
      case 'new_promotion':
        return `🔥 **NOVA PROMOÇÃO AUTOMÁTICA**\n\n📦 ${variables.product_name || 'Produto'}\n\n💰 **${variables.current_price || 'R$ 0,00'}**${variables.old_price || ''}\n🏷️ **${variables.discount_percentage || 0}% OFF**\n\n🛒 Plataforma: ${variables.platform_name || 'N/A'}\n\n${variables.coupon_section || ''}\n🔗 ${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Aproveite antes que acabe!`;
      
      case 'new_coupon':
        // Se não tem descrição nem data de validade, é cupom capturado do Telegram
        // Usar template simplificado apenas com: plataforma, código, compra mínima, limite desconto
        // SEM link de afiliado
        if (!variables.coupon_description && !variables.valid_until) {
          // Template simplificado e limpo para cupons do Telegram (formato padronizado)
        // Seguindo o formato especificado: 🎟️ CUPOM DISPONÍVEL
        let message = `🎟️ **CUPOM DISPONÍVEL**\n\n`;
        message += `**Código:** ${variables.coupon_code || 'N/A'}\n`;
        message += `**Plataforma:** ${variables.platform_name || 'N/A'}\n`;
        message += `**Desconto:** ${variables.discount_value || 'N/A'}\n`;
        if (variables.min_purchase) {
          // Remover formatação markdown da variável min_purchase (já vem formatada)
          const minPurchaseText = variables.min_purchase.replace(/\*\*/g, '').replace(/💳\s*/g, '').replace(/Compra mínima:\s*/gi, '').trim();
          if (minPurchaseText) {
            message += `**Compra mínima:** ${minPurchaseText}\n`;
          }
        }
        // Sempre incluir aviso de expiração (formato padronizado)
        message += `\n⚠️ **Sujeito à expiração**\n`;
        return message;
        }
        // Template completo para cupons normais
        let fullMessage = `🎟️ **NOVO CUPOM DISPONÍVEL!**\n\n`;
        fullMessage += `🏪 **Plataforma:** ${variables.platform_name || 'N/A'}\n`;
        fullMessage += `💬 **Código:** \`${variables.coupon_code || 'N/A'}\`\n`;
        fullMessage += `💰 **Desconto:** ${variables.discount_value || 'N/A'} OFF\n`;
        if (variables.min_purchase) fullMessage += `${variables.min_purchase}`;
        if (variables.max_discount) fullMessage += `${variables.max_discount}`;
        if (variables.applicability) fullMessage += `\n${variables.applicability}\n`;
        if (variables.coupon_title) fullMessage += `\n📝 **${variables.coupon_title}**\n`;
        if (variables.coupon_description) fullMessage += `${variables.coupon_description}\n`;
        if (variables.valid_until) fullMessage += `\n📅 **Válido até:** ${variables.valid_until}\n`;
        if (variables.affiliate_link) fullMessage += `\n🔗 ${variables.affiliate_link}\n`;
        fullMessage += `\n⚡ Use agora e economize!`;
        return fullMessage;
      
      case 'expired_coupon':
        return `⚠️ **CUPOM EXPIROU**\n\n🏪 Plataforma: ${variables.platform_name || 'N/A'}\n💬 Código: \`${variables.coupon_code || 'N/A'}\`\n📅 Expirado em: ${variables.expired_date || 'N/A'}\n\n😔 Infelizmente este cupom não está mais disponível.\n🔔 Fique atento às próximas promoções!`;
      
      default:
        return 'Mensagem não configurada';
    }
  }
}

export default new TemplateRenderer();


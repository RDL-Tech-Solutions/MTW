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
      // Buscar template
      const template = await BotMessageTemplate.findByType(templateType, platform);
      
      if (!template) {
        logger.warn(`Template não encontrado: ${templateType} para ${platform}, usando template padrão`);
        return this.getDefaultTemplate(templateType, variables);
      }

      // Substituir variáveis no template
      let message = template.template;
      
      // Substituir todas as variáveis
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        message = message.replace(regex, value || '');
      }

      // Remover linhas vazias extras
      message = message.replace(/\n{3,}/g, '\n\n').trim();

      return message;
    } catch (error) {
      logger.error(`Erro ao renderizar template: ${error.message}`);
      return this.getDefaultTemplate(templateType, variables);
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
    
    // Escapar nome do produto para Markdown
    const productName = this.escapeMarkdown(product.name || 'Produto sem nome');

    // Preparar seção de cupom se houver
    let couponSection = '';
    if (product.coupon_id) {
      try {
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountText = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : `R$ ${coupon.discount_value.toFixed(2)}`;
          
          couponSection = `\n🎟️ *CUPOM DISPONÍVEL*\n\n`;
          couponSection += `💬 *Código:* \`${coupon.code}\`\n`;
          couponSection += `💰 *Desconto:* ${discountText} OFF\n`;
          
          if (coupon.min_purchase > 0) {
            couponSection += `💳 *Compra mínima:* R$ ${coupon.min_purchase.toFixed(2)}\n`;
          }
          
          // Limite máximo de desconto
          if (coupon.max_discount_value > 0) {
            couponSection += `💰 *Limite de desconto:* R$ ${coupon.max_discount_value.toFixed(2)}\n`;
          }
          
          // Limite de usos
          if (coupon.max_uses) {
            couponSection += `📊 *Limite de usos:* ${coupon.current_uses || 0} / ${coupon.max_uses}\n`;
          }
          
          // Aplicabilidade
          if (coupon.is_general) {
            couponSection += `✅ *Válido para todos os produtos*\n`;
          } else {
            const productCount = coupon.applicable_products?.length || 0;
            if (productCount > 0) {
              couponSection += `📦 *Em produtos selecionados* (${productCount} produto${productCount > 1 ? 's' : ''})\n`;
            } else {
              couponSection += `📦 *Em produtos selecionados*\n`;
            }
          }
          
          couponSection += `📅 *Válido até:* ${this.formatDate(coupon.valid_until)}\n`;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom ${product.coupon_id}: ${error.message}`);
      }
    }

    return {
      product_name: productName,
      current_price: priceFormatted,
      old_price: oldPriceFormatted ? ` ~${oldPriceFormatted}~` : '',
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
    
    // Compra mínima
    const minPurchase = coupon.min_purchase > 0
      ? `💳 *Compra mínima:* R$ ${coupon.min_purchase.toFixed(2)}\n`
      : '';

    // Limite máximo de desconto
    const maxDiscount = coupon.max_discount_value > 0
      ? `💰 *Limite de desconto:* R$ ${coupon.max_discount_value.toFixed(2)}\n`
      : '';

    // Limite de usos
    const usageLimit = coupon.max_uses
      ? `📊 *Limite de usos:* ${coupon.current_uses || 0} / ${coupon.max_uses}\n`
      : '';

    // Aplicabilidade (todos os produtos ou produtos selecionados)
    let applicability = '';
    if (coupon.is_general) {
      applicability = '✅ *Válido para todos os produtos*';
    } else {
      const productCount = coupon.applicable_products?.length || 0;
      if (productCount > 0) {
        applicability = `📦 *Em produtos selecionados* (${productCount} produto${productCount > 1 ? 's' : ''})`;
      } else {
        applicability = '📦 *Em produtos selecionados*';
      }
    }

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
      coupon_description: coupon.description ? `\n${this.escapeMarkdown(coupon.description)}\n` : '',
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
   * Escapar caracteres Markdown
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
  getDefaultTemplate(templateType, variables) {
    switch (templateType) {
      case 'new_promotion':
        return `🔥 *NOVA PROMOÇÃO AUTOMÁTICA*\n\n📦 ${variables.product_name || 'Produto'}\n\n💰 *${variables.current_price || 'R$ 0,00'}*${variables.old_price || ''}\n🏷️ *${variables.discount_percentage || 0}% OFF*\n\n🛒 Plataforma: ${variables.platform_name || 'N/A'}\n\n${variables.coupon_section || ''}\n🔗 ${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Aproveite antes que acabe!`;
      
      case 'new_coupon':
        return `🎟️ *NOVO CUPOM DISPONÍVEL!*\n\n🏪 *Plataforma:* ${variables.platform_name || 'N/A'}\n💬 *Código:* \`${variables.coupon_code || 'N/A'}\`\n💰 *Desconto:* ${variables.discount_value || 'N/A'} OFF\n${variables.min_purchase || ''}${variables.applicability ? `\n${variables.applicability}\n` : ''}\n📝 *${variables.coupon_title || 'Cupom de Desconto'}*\n${variables.coupon_description || ''}\n📅 *Válido até:* ${variables.valid_until || 'N/A'}\n\n🔗 ${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Use agora e economize!`;
      
      case 'expired_coupon':
        return `⚠️ *CUPOM EXPIROU*\n\n🏪 Plataforma: ${variables.platform_name || 'N/A'}\n💬 Código: \`${variables.coupon_code || 'N/A'}\`\n📅 Expirado em: ${variables.expired_date || 'N/A'}\n\n😔 Infelizmente este cupom não está mais disponível.\n🔔 Fique atento às próximas promoções!`;
      
      default:
        return 'Mensagem não configurada';
    }
  }
}

export default new TemplateRenderer();


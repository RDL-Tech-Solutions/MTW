/**
 * IA ADVANCED - Gerador Inteligente de Templates
 * OTIMIZADO para compatibilidade com modelos gratuitos e pagos
 * 
 * Modelos testados e compatíveis:
 * - google/gemini-flash-1.5 (FREE) ⭐ RECOMENDADO
 * - mistralai/mixtral-8x7b-instruct (FREE)
 * - openai/gpt-4o-mini (PAID)
 * - anthropic/claude-3-haiku (PAID)
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class AdvancedTemplateGenerator {
  /**
   * Gerar template inteligente para promoção
   * @param {Object} product - Dados do produto
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @returns {Promise<string>} - Template gerado
   */
  async generatePromotionTemplate(product, platform = 'telegram') {
    try {
      logger.info(`🤖 [IA ADVANCED] Gerando template de promoção para: ${product.name?.substring(0, 50)}...`);

      // Analisar contexto do produto
      const discount = product.discount_percentage || 0;
      const hasOldPrice = product.old_price && product.old_price > product.current_price;
      const hasCoupon = product.coupon_id ? true : false;
      const finalPrice = product.final_price || product.current_price;

      // Determinar urgência baseado no desconto
      let urgencyLevel = 'normal';
      if (discount >= 50) urgencyLevel = 'muito_urgente';
      else if (discount >= 30) urgencyLevel = 'urgente';
      else if (discount >= 20) urgencyLevel = 'moderado';

      // Construir prompt otimizado para modelos gratuitos
      const prompt = this.buildPromotionPrompt(product, platform, {
        discount,
        hasOldPrice,
        hasCoupon,
        finalPrice,
        urgencyLevel
      });

      // Gerar template via IA
      const template = await this.callAI(prompt);

      logger.info(`✅ [IA ADVANCED] Template de promoção gerado (${template.length} chars)`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro ao gerar template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gerar template inteligente para cupom
   * @param {Object} coupon - Dados do cupom
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @returns {Promise<string>} - Template gerado
   */
  async generateCouponTemplate(coupon, platform = 'telegram') {
    try {
      logger.info(`🤖 [IA ADVANCED] Gerando template de cupom: ${coupon.code}`);

      // Analisar contexto do cupom
      const discountValue = coupon.discount_value || 0;
      const discountType = coupon.discount_type || 'percentage';
      const hasMinPurchase = coupon.min_purchase > 0;
      const hasMaxDiscount = coupon.max_discount_value > 0;
      const isGeneral = coupon.is_general;
      const daysUntilExpiry = this.calculateDaysUntilExpiry(coupon.valid_until);

      // Determinar urgência baseado na validade
      let urgencyLevel = 'normal';
      if (daysUntilExpiry <= 1) urgencyLevel = 'muito_urgente';
      else if (daysUntilExpiry <= 3) urgencyLevel = 'urgente';
      else if (daysUntilExpiry <= 7) urgencyLevel = 'moderado';

      // Construir prompt otimizado
      const prompt = this.buildCouponPrompt(coupon, platform, {
        discountValue,
        discountType,
        hasMinPurchase,
        hasMaxDiscount,
        isGeneral,
        daysUntilExpiry,
        urgencyLevel
      });

      // Gerar template via IA
      const template = await this.callAI(prompt);

      logger.info(`✅ [IA ADVANCED] Template de cupom gerado (${template.length} chars)`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro ao gerar template de cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gerar template para cupom expirado
   */
  async generateExpiredCouponTemplate(coupon, platform = 'telegram') {
    try {
      logger.info(`🤖 [IA ADVANCED] Gerando template de cupom expirado: ${coupon.code}`);

      const prompt = this.buildExpiredCouponPrompt(coupon, platform);
      const template = await this.callAI(prompt);

      logger.info(`✅ [IA ADVANCED] Template de cupom expirado gerado`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro: ${error.message}`);
      throw error;
    }
  }

  /**
   * Construir prompt OTIMIZADO para promoção
   * Formato simplificado para melhor compatibilidade com modelos gratuitos
   */
  buildPromotionPrompt(product, platform, context) {
    // Template base que a IA vai preencher
    // Para produtos COM CUPOM: current_price = preço atual, final_price = preço com cupom
    // Para produtos SEM CUPOM: current_price = preço atual
    const templateBase = context.hasCoupon ? `
🔥 **OFERTA ESPECIAL + CUPOM!** 🔥

📦 **{product_name}**

[DESCRIÇÃO CRIATIVA AQUI - 2-3 linhas sobre o produto]

💰 **Preço:** {current_price} ~~{old_price}~~
🎟️ **Com Cupom:** {final_price}
🏷️ **{discount_percentage}% OFF!**

🎟️ **CUPOM:** \`{coupon_code}\`
💵 **Desconto extra:** {coupon_discount}

👉 {affiliate_link}

⚡ **Economia dupla! Corra!**
` : `
🔥 **OFERTA IMPERDÍVEL!** 🔥

📦 **{product_name}**

[DESCRIÇÃO CRIATIVA AQUI - 2-3 linhas sobre o produto]

💰 **Preço:** {current_price} ~~{old_price}~~
🏷️ **{discount_percentage}% OFF!**

👉 {affiliate_link}

⚡ **Aproveite antes que acabe!**
`;

    return `Crie uma mensagem promocional para o Telegram.

PRODUTO:
- Nome: ${product.name || 'Produto'}
- Preço atual: R$ ${product.current_price}
${context.hasOldPrice ? `- Preço antigo: R$ ${product.old_price}` : ''}
${context.hasCoupon && context.finalPrice ? `- Preço com cupom: R$ ${context.finalPrice}` : ''}
- Desconto: ${context.discount}%
${context.hasCoupon ? '- TEM CUPOM DE DESCONTO EXTRA!' : ''}

INSTRUÇÕES SIMPLES:
1. Use este formato EXATO como base:
${templateBase}

2. Substitua [DESCRIÇÃO CRIATIVA AQUI...] por 2-3 linhas vendedoras sobre o produto
3. MANTENHA todas as variáveis entre chaves: {product_name}, {current_price}, {old_price}, {discount_percentage}, {affiliate_link}${context.hasCoupon ? ', {final_price}, {coupon_code}, {coupon_discount}' : ''}
4. Use ** para negrito, \` para código e ~~ para riscar (strikethrough) o preço antigo
5. MANTENHA o riscado (~~) ao redor do preço antigo se ele existir
6. Use emojis estratégicos (4-6 no total)
7. NÃO adicione explicações, apenas retorne a mensagem

Retorne APENAS a mensagem promocional:`;
  }

  /**
   * Construir prompt OTIMIZADO para cupom
   */
  buildCouponPrompt(coupon, platform, context) {
    const discountText = context.discountType === 'percentage'
      ? `${context.discountValue}%`
      : `R$ ${context.discountValue}`;

    return `Crie uma mensagem curta sobre um cupom de desconto para o Telegram.

CUPOM:
- Código: ${coupon.code}
- Desconto: ${discountText} OFF
${context.hasMinPurchase ? `- Compra mínima: R$ ${coupon.min_purchase}` : '- Sem compra mínima'}
${context.hasMaxDiscount ? `- Limite: R$ ${coupon.max_discount_value}` : ''}
${context.isGeneral ? '- Válido para TODOS os produtos' : ''}

FORMATO OBRIGATÓRIO:
🎟️ **NOVO CUPOM!**

💰 **{discount_value} OFF**

🔑 **Código:** \`{coupon_code}\`
${context.hasMinPurchase ? '💳 **Mínimo:** {min_purchase}' : ''}
${context.isGeneral ? '✅ Válido para todos produtos!' : ''}

👉 {affiliate_link}

⚡ Use agora e economize!

REGRAS:
1. Siga o formato acima EXATAMENTE
2. Mantenha as variáveis: {discount_value}, {coupon_code}, {min_purchase}, {affiliate_link}
3. Use ** para negrito e \` para código do cupom
4. NUNCA pule a linha de desconto (💰 **{discount_value} OFF**)
5. NÃO mencione data de validade
6. NÃO adicione explicações

Retorne APENAS a mensagem:`;
  }

  /**
   * Construir prompt para cupom expirado
   */
  buildExpiredCouponPrompt(coupon, platform) {
    return `Crie uma mensagem curta informando que um cupom expirou.

INFORMAÇÕES:
- Código expirado: ${coupon.code}
- Data: ${this.formatDate(coupon.valid_until)}

FORMATO:
⚠️ **Cupom Expirado** ⚠️

O cupom \`{coupon_code}\` não está mais válido.

🔔 Fique atento às próximas ofertas!

REGRAS:
1. Seja breve e educado
2. Use a variável {coupon_code}
3. Motive a ficar atento
4. NÃO adicione explicações

Retorne APENAS a mensagem:`;
  }

  /**
   * Chamar IA para gerar template
   */
  async callAI(prompt) {
    // Verificar se IA está habilitada
    const aiConfig = await openrouterClient.getConfig();
    if (!aiConfig.enabled || !aiConfig.apiKey) {
      throw new Error('IA não está habilitada. Configure nas Configurações → IA.');
    }

    // Fazer requisição para OpenRouter
    const response = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

    // Processar resposta
    let template = '';
    if (typeof response === 'string') {
      template = response.trim();
    } else {
      template = String(response).trim();
    }

    // Limpar template
    template = this.cleanTemplate(template);

    // Validar template
    if (!template || template.trim().length < 20) {
      throw new Error('Template gerado muito curto ou vazio');
    }

    return template;
  }

  /**
   * Limpar template removendo prefixos e convertendo HTML para Markdown
   */
  cleanTemplate(template) {
    if (!template) return '';

    // 1. Remover prefixos comuns da IA
    template = template
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/```$/gm, '')
      .replace(/^Template:\s*/i, '')
      .replace(/^Mensagem:\s*/i, '')
      .replace(/^Resposta:\s*/i, '')
      .replace(/^Aqui está[^:]*:\s*/i, '')
      .replace(/^<s>\s*/g, '')
      .replace(/^\[OUT\]\s*/g, '')
      .trim();

    // 2. Converter HTML para Markdown
    template = template
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // 3. Remover tags HTML restantes
    template = template.replace(/<[^>]+>/g, '');

    // 4. Corrigir tildes múltiplos
    template = template.replace(/~{3,}/g, '~~');

    // 5. Corrigir padrões de preço antigo mal formatados
    template = template
      .replace(/\(de\s+~~([^~]+)~~\)/gi, ' ~~$1~~')
      .replace(/\bde\s+~~([^~]+)~~/gi, ' ~~$1~~')
      // Detectar dois preços reais juntos (R$ 10 R$ 20) e aplicar riscado no segundo
      .replace(/(R\$\s*[\d,.]+)\s+(R\$\s*[\d,.]+)(?![^~]*~~)/gi, '$1 ~~$2~~');

    // 6. Remover texto de truncamento
    template = template
      .replace(/\s*\.\.\.\s*\(mensagem\s+truncada\)/gi, '')
      .replace(/\s*\(continua\)/gi, '')
      .replace(/\s*\[\.\.\.\]/gi, '');

    // 7. Normalizar variáveis
    template = template
      .replace(/\{\s*product_name\s*\}/g, '{product_name}')
      .replace(/\{\s*affiliate_link\s*\}/g, '{affiliate_link}')
      .replace(/\{\s*coupon_code\s*\}/g, '{coupon_code}')
      .replace(/\{\s*current_price\s*\}/g, '{current_price}')
      .replace(/\{\s*old_price\s*\}/g, '{old_price}')
      .replace(/\{\s*discount_percentage\s*\}/g, '{discount_percentage}')
      .replace(/\{\s*discount_value\s*\}/g, '{discount_value}')
      .replace(/\{\s*min_purchase\s*\}/g, '{min_purchase}')
      .replace(/\{\s*coupon_discount\s*\}/g, '{coupon_discount}');

    // 8. Limpar espaços excessivos
    template = template
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]{3,}/g, ' ')
      .trim();

    return template;
  }

  /**
   * Obter texto de urgência
   */
  getUrgencyText(level) {
    const texts = {
      'muito_urgente': 'MUITO URGENTE - Última chance!',
      'urgente': 'URGENTE - Tempo limitado!',
      'moderado': 'Boa oportunidade!',
      'normal': 'Oferta disponível'
    };
    return texts[level] || texts['normal'];
  }

  /**
   * Calcular dias até expiração
   */
  calculateDaysUntilExpiry(validUntil) {
    if (!validUntil) return 999;
    try {
      const expiry = new Date(validUntil);
      const now = new Date();
      const diff = expiry - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    } catch (error) {
      return 999;
    }
  }

  /**
   * Formatar data
   */
  formatDate(date) {
    if (!date) return 'Data não disponível';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  }
}

export default new AdvancedTemplateGenerator();

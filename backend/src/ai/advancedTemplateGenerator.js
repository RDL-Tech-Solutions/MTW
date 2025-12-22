/**
 * IA ADVANCED - Gerador Inteligente de Templates
 * Gera templates dinamicamente baseado no produto/cupom e contexto
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
      logger.info(`🤖 [IA ADVANCED] Gerando template de promoção para produto: ${product.name}`);

      // OTIMIZAR TÍTULO DO PRODUTO
      let optimizedTitle = product.name;
      const originalTitle = product.name || 'Produto';
      try {
        logger.info(`📝 [IA ADVANCED] Otimizando título do produto...`);
        logger.info(`   Título original: "${originalTitle}"`);
        optimizedTitle = await this.optimizeProductTitle(originalTitle, product.platform);
        logger.info(`✅ [IA ADVANCED] Título otimizado: "${optimizedTitle}"`);
        
        // Validar se a otimização funcionou
        if (!optimizedTitle || optimizedTitle.trim().length < 5 || optimizedTitle === originalTitle) {
          logger.warn(`⚠️ [IA ADVANCED] Título não foi otimizado adequadamente, usando original`);
          optimizedTitle = originalTitle;
        }
      } catch (titleError) {
        logger.error(`❌ [IA ADVANCED] Erro ao otimizar título: ${titleError.message}`);
        logger.error(`   Stack: ${titleError.stack}`);
        logger.warn(`⚠️ Usando título original devido ao erro`);
        optimizedTitle = originalTitle;
      }

      // Analisar contexto do produto
      const discount = product.discount_percentage || 0;
      const hasOldPrice = product.old_price && product.old_price > product.current_price;
      const hasCoupon = product.coupon_id ? true : false;
      const finalPrice = product.final_price || product.current_price;
      const originalPrice = hasCoupon ? product.current_price : null;
      
      // Determinar urgência baseado no desconto
      let urgencyLevel = 'normal';
      if (discount >= 50) urgencyLevel = 'muito_urgente';
      else if (discount >= 30) urgencyLevel = 'urgente';
      else if (discount >= 20) urgencyLevel = 'moderado';

      // Determinar tipo de template
      const templateType = hasCoupon ? 'promotion_with_coupon' : 'new_promotion';

      // Criar cópia do produto com título otimizado para usar no prompt
      // IMPORTANTE: Atualizar o objeto product original para que as variáveis também usem o título otimizado
      const productWithOptimizedTitle = { ...product, name: optimizedTitle };
      
      // Atualizar o produto original no contexto (se existir) para que as variáveis usem o título otimizado
      if (product && typeof product === 'object') {
        product.name = optimizedTitle;
      }

      // Construir prompt contextual
      // IMPORTANTE: Preservar título original para contexto, mas usar otimizado na mensagem
      // Garantir que o título otimizado seja usado
      const prompt = this.buildPromotionPrompt(productWithOptimizedTitle, platform, {
        discount,
        hasOldPrice,
        hasCoupon,
        finalPrice,
        originalPrice,
        urgencyLevel,
        templateType,
        originalTitle: originalTitle,
        optimizedTitle: optimizedTitle
      });
      
      // Log para debug
      logger.debug(`📋 [IA ADVANCED] Título que será usado no prompt: "${optimizedTitle}"`);
      logger.debug(`📋 [IA ADVANCED] Título original (contexto): "${originalTitle}"`);

      // Gerar template via IA
      const template = await this.callAI(prompt);

      logger.info(`✅ [IA ADVANCED] Template de promoção gerado (${template.length} chars)`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro ao gerar template de promoção: ${error.message}`);
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
      const hasApplicableProducts = coupon.applicable_products && coupon.applicable_products.length > 0;
      const daysUntilExpiry = this.calculateDaysUntilExpiry(coupon.valid_until);
      
      // Determinar urgência baseado na validade
      let urgencyLevel = 'normal';
      if (daysUntilExpiry <= 1) urgencyLevel = 'muito_urgente';
      else if (daysUntilExpiry <= 3) urgencyLevel = 'urgente';
      else if (daysUntilExpiry <= 7) urgencyLevel = 'moderado';

      // Construir prompt contextual
      const prompt = this.buildCouponPrompt(coupon, platform, {
        discountValue,
        discountType,
        hasMinPurchase,
        hasMaxDiscount,
        isGeneral,
        hasApplicableProducts,
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
   * Gerar template inteligente para cupom expirado
   * @param {Object} coupon - Dados do cupom expirado
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @returns {Promise<string>} - Template gerado
   */
  async generateExpiredCouponTemplate(coupon, platform = 'telegram') {
    try {
      logger.info(`🤖 [IA ADVANCED] Gerando template de cupom expirado: ${coupon.code}`);

      const prompt = this.buildExpiredCouponPrompt(coupon, platform);

      const template = await this.callAI(prompt);

      logger.info(`✅ [IA ADVANCED] Template de cupom expirado gerado (${template.length} chars)`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro ao gerar template de cupom expirado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Construir prompt para promoção
   */
  buildPromotionPrompt(product, platform, context) {
    const platformName = platform === 'telegram' ? 'Telegram' : 'WhatsApp';
    const formatGuide = platform === 'telegram' 
      ? 'Use **texto** para negrito (será convertido automaticamente para <b>texto</b>), `código` para código, ~~texto~~ para riscado'
      : 'Use *texto* para negrito, `código` para código, ~texto~ para riscado';

    let prompt = `Você é um especialista em marketing digital e criação de mensagens promocionais para e-commerce.

CONTEXTO DO PRODUTO:
- Nome do produto: ${context.optimizedTitle || product.name || 'Produto'}
- Preço atual: R$ ${product.current_price || '0,00'}
${context.hasOldPrice ? `- Preço antigo: R$ ${product.old_price}` : ''}
- Desconto: ${context.discount}% OFF
${context.hasCoupon ? `- TEM CUPOM: Preço original R$ ${context.originalPrice}, Preço final R$ ${context.finalPrice}` : ''}
- Plataforma: ${product.platform === 'mercadolivre' ? 'Mercado Livre' : product.platform === 'shopee' ? 'Shopee' : product.platform}
- Urgência: ${this.getUrgencyText(context.urgencyLevel)}

VARIÁVEIS DISPONÍVEIS (use {nome_variavel} - serão substituídas automaticamente):
${context.hasCoupon ? `
- {product_name} - Nome do produto (OBRIGATÓRIO)
- {original_price} - Preço antes do cupom
- {final_price} - Preço final com cupom
- {current_price} - Preço final com cupom
- {old_price} - Preço antigo já formatado com ~~ (use diretamente)
- {discount_percentage} - Percentual de desconto
- {affiliate_link} - Link de afiliado (OBRIGATÓRIO)
- {coupon_code} - Código do cupom (OBRIGATÓRIO - formatar com backticks: \`{coupon_code}\`)
- {coupon_discount} - Desconto do cupom
` : `
- {product_name} - Nome do produto (OBRIGATÓRIO)
- {current_price} - Preço atual formatado
- {old_price} - Preço antigo já formatado com ~~ (use diretamente)
- {discount_percentage} - Percentual de desconto
- {affiliate_link} - Link de afiliado (OBRIGATÓRIO)
`}

REQUISITOS OBRIGATÓRIOS (CRÍTICO - SEGUIR EXATAMENTE):
1. Use EXATAMENTE {product_name} para o título - NÃO modifique, NÃO crie descrição longa, NÃO substitua por texto próprio
2. Use {affiliate_link} para o link - NÃO escreva "[Link de afiliado]", "[Link]", "link aqui" ou qualquer texto literal
${context.hasCoupon ? '3. Use \`{coupon_code}\` para o código do cupom (OBRIGATÓRIO - sempre formatar com backticks)' : '3. Destaque o desconto e a oportunidade'}
4. Use {old_price} diretamente - já vem formatado com ~~, NÃO adicione "(de", "De", "DE" ou tildes extras
5. Use **texto** para negrito (dois asteriscos), NUNCA use <b>, <strong> ou tags HTML
6. Use \`código\` para código (backticks), NUNCA use <code> ou tags HTML
7. Use ~~texto~~ para riscado (dois tildes), NUNCA use <s>, <strike>, <del> ou tags HTML
8. Crie mensagem completa (10-15 linhas) com: cabeçalho, título, descrição, preço, desconto${context.hasCoupon ? ', código do cupom' : ''}, link, urgência
9. Use 4-6 emojis estratégicos
10. ${formatGuide}
11. Seja persuasivo e crie senso de urgência
12. NÃO invente variáveis não listadas acima
13. NÃO adicione explicações, comentários ou notas após o template
14. NÃO adicione texto como "Template:", "Mensagem:", "Aqui está:", etc.
15. Retorne APENAS o template limpo, sem prefixos ou sufixos
16. NÃO use tags HTML em nenhuma circunstância - apenas Markdown
17. NÃO adicione texto "mensagem truncada", "continua", "[...]" ou similar

EXEMPLO DE ESTRUTURA (para produtos - SEGUIR ESTE FORMATO EXATO):
🔥 **Oferta Imperdível!** 🔥

📦 **{product_name}**

💡 [Descrição persuasiva do produto destacando características e benefícios - 3-5 linhas]

💰 **Preço:** {current_price}${context.hasOldPrice ? ' {old_price}' : ''}
🏷️ **{discount_percentage}% OFF**

${context.hasCoupon ? `🎟️ **CUPOM INCLUSO!**

🔑 **Código:** \`{coupon_code}\`
💰 **Desconto:** {coupon_discount}

` : ''}🔗 {affiliate_link}

⏳ **Aproveite antes que acabe!** ⏳

FORMATAÇÃO CRÍTICA:
- SEMPRE coloque cada informação em uma linha separada
- SEMPRE use quebras de linha (\n) entre seções
- NÃO coloque preço, desconto e emoji na mesma linha sem quebra
- Formato correto: "💰 **Preço:** {current_price}" (emoji, texto, variável em linhas separadas ou bem formatadas)
- Formato ERRADO: "R$ 78,00💰 Por: R$ 48,00 38% OFF" (tudo junto)

REGRAS IMPORTANTES:
- {product_name} = título exato do produto (NÃO modificar)
- {old_price} = já vem com ~~, usar diretamente
- {affiliate_link} = link real (NÃO escrever "[Link de afiliado]")
${context.hasCoupon ? '- {coupon_code} = sempre formatar com backticks: \\`{coupon_code}\\`' : ''}
- Use **texto** para negrito, \`código\` para código, ~~texto~~ para riscado
- NUNCA use tags HTML (<b>, <code>, etc)
- Mínimo 10-15 linhas, seja persuasivo

Template:`;

    return prompt;
  }

  /**
   * Construir prompt para cupom
   */
  buildCouponPrompt(coupon, platform, context) {
    const platformName = platform === 'telegram' ? 'Telegram' : 'WhatsApp';
    const formatGuide = platform === 'telegram' 
      ? 'Use **texto** para negrito (será convertido automaticamente para <b>texto</b>), `código` para código, ~~texto~~ para riscado'
      : 'Use *texto* para negrito, `código` para código, ~texto~ para riscado';

    let prompt = `Você é um especialista em marketing digital e criação de mensagens promocionais.

CONTEXTO DO CUPOM:
- Código: ${coupon.code}
- Desconto: ${context.discountValue}${context.discountType === 'percentage' ? '%' : ' R$'} OFF
${context.hasMinPurchase ? `- Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}` : ''}
${context.hasMaxDiscount ? `- Limite de desconto: R$ ${coupon.max_discount_value.toFixed(2)}` : ''}
- Urgência: ${this.getUrgencyText(context.urgencyLevel)}
${context.isGeneral ? '- Válido para TODOS os produtos' : context.hasApplicableProducts ? `- Válido para produtos selecionados (${coupon.applicable_products?.length || 0} produto(s))` : '- Aplicabilidade não especificada (não mostrar)'}

**IMPORTANTE**: A mensagem será enviada com uma imagem do logo da plataforma. NÃO mencione o nome da plataforma no texto.

VARIÁVEIS DISPONÍVEIS (use {nome_variavel} - serão substituídas automaticamente):
- {coupon_code} - Código do cupom (OBRIGATÓRIO - formatar com backticks: \`{coupon_code}\`)
- {discount_value} - Valor do desconto formatado
- {min_purchase} - Valor da compra mínima (ex: "R$ 199.00") - apenas o valor, você adiciona emoji e texto
- {applicability} - Aplicabilidade (só usar se não estiver vazia)
- {coupon_title} - Título do cupom (se disponível)
- {coupon_description} - Descrição do cupom (se disponível)
- {affiliate_link} - Link de afiliado (OBRIGATÓRIO)

**IMPORTANTE**: 
- NÃO inclua data de validade ({valid_until}) na mensagem
- NÃO mencione o nome da plataforma no texto

REQUISITOS OBRIGATÓRIOS (CRÍTICO - SEGUIR EXATAMENTE):
1. Use \`{coupon_code}\` para o código (OBRIGATÓRIO - sempre formatar com backticks)
2. Use {affiliate_link} para o link (OBRIGATÓRIO) - NÃO escreva "[Link de afiliado]", "[Link]" ou texto literal
3. Use {min_purchase} e adicione emoji/texto: "💳 **Compra mínima:** {min_purchase}"
4. Use {applicability} apenas se não estiver vazia (será removida automaticamente se vazia)
5. Use **texto** para negrito, \`código\` para código, ~~texto~~ para riscado
6. NUNCA use tags HTML (<b>, <code>, <strong>, <s>, etc) - apenas Markdown
7. NÃO mencione nome da plataforma (a imagem já identifica)
8. NÃO inclua data de validade ({valid_until} será removida automaticamente)
9. Seja conciso (8-10 linhas), use 4-5 emojis estratégicos
10. ${formatGuide}
11. NÃO adicione explicações, comentários ou notas após o template
12. NÃO adicione texto como "Template:", "Mensagem:", "Aqui está:", etc.
13. Retorne APENAS o template limpo, sem prefixos ou sufixos
14. NÃO adicione texto "mensagem truncada", "continua", "[...]" ou similar

EXEMPLO DE ESTRUTURA (para cupons):
🎟️ **NOVO CUPOM DISPONÍVEL!** 🎟️

💰 **{discount_value} OFF**

🔑 **Código:** \`{coupon_code}\`
${context.hasMinPurchase ? '💳 **Compra mínima:** {min_purchase}\n' : ''}${context.isGeneral || context.hasApplicableProducts ? '{applicability}\n' : ''}👉 {affiliate_link}

⚡ Use agora e economize!

REGRAS IMPORTANTES:
- {coupon_code} = sempre formatar com backticks: \`{coupon_code}\`
- {min_purchase} = apenas valor, você adiciona: "💳 **Compra mínima:** {min_purchase}"
- {applicability} = usar apenas se não estiver vazia
- {affiliate_link} = link real (NÃO escrever "[Link de afiliado]")
- Use **texto** para negrito, \`código\` para código
- NUNCA use tags HTML
- NÃO mencione nome da plataforma
- NÃO inclua data de validade
- Máximo 8-10 linhas

Template:`;

    return prompt;
  }

  /**
   * Construir prompt para cupom expirado
   */
  buildExpiredCouponPrompt(coupon, platform) {
    const formatGuide = platform === 'telegram' 
      ? 'Use **texto** para negrito (será convertido automaticamente para <b>texto</b>), `código` para código, ~~texto~~ para riscado'
      : 'Use *texto* para negrito, `código` para código, ~texto~ para riscado';

    return `Você é um especialista em comunicação e relacionamento com clientes.

CONTEXTO:
- Cupom expirado: ${coupon.code}
- Plataforma: ${coupon.platform === 'mercadolivre' ? 'Mercado Livre' : coupon.platform === 'shopee' ? 'Shopee' : coupon.platform}
- Data de expiração: ${this.formatDate(coupon.valid_until)}

VARIÁVEIS DISPONÍVEIS (use {nome_variavel}):
- {platform_name} - Nome da plataforma
- {coupon_code} - Código do cupom expirado
- {expired_date} - Data de expiração formatada

REQUISITOS:
1. Seja educado e empático
2. Informe claramente que o cupom expirou
3. Motive o usuário a ficar atento às próximas ofertas
4. Use emojis apropriados (⚠️, 😔, 🔔, etc.)
5. ${formatGuide}
6. Seja breve mas acolhedor
7. NÃO invente variáveis que não foram listadas
8. Retorne APENAS o template, sem explicações

Template:`;
  }

  /**
   * Otimizar título do produto usando IA
   * @param {string} originalTitle - Título original do produto
   * @param {string} platform - Plataforma do produto
   * @returns {Promise<string>} - Título otimizado
   */
  async optimizeProductTitle(originalTitle, platform = 'general') {
    try {
      if (!originalTitle || originalTitle.trim().length === 0) {
        return originalTitle;
      }

      const platformName = platform === 'mercadolivre' ? 'Mercado Livre' : 
                          platform === 'shopee' ? 'Shopee' : 
                          platform === 'aliexpress' ? 'AliExpress' : 
                          platform === 'amazon' ? 'Amazon' : 'Geral';

      const optimizationPrompt = `Você é um especialista em marketing digital e copywriting para e-commerce.

TAREFA: Otimize o título do produto abaixo, tornando-o mais atrativo, claro e persuasivo para promoções.

TÍTULO ORIGINAL:
"${originalTitle}"

PLATAFORMA: ${platformName}

REGRAS DE OTIMIZAÇÃO:
1. Mantenha as informações essenciais do produto
2. Torne o título mais atrativo e persuasivo
3. Remova informações redundantes ou desnecessárias
4. Destaque características importantes (se relevante)
5. Torne o título mais claro e fácil de ler
6. Mantenha entre 30-80 caracteres (ideal para promoções)
7. Use linguagem natural e envolvente
8. Não invente informações que não estão no título original
9. Mantenha o foco no produto e suas características principais

IMPORTANTE:
- Retorne APENAS o título otimizado, sem aspas, sem explicações
- O título deve ser direto e impactante
- Se o título original já estiver bom, faça apenas pequenos ajustes

Título otimizado:`;

      const optimizedTitle = await this.callAI(optimizationPrompt);
      
      // Limpar o título otimizado
      const cleanedTitle = optimizedTitle
        .replace(/^["']|["']$/g, '') // Remover aspas no início/fim
        .replace(/^Título otimizado:\s*/i, '')
        .replace(/^Título:\s*/i, '')
        .trim();

      // Validar: se o título otimizado estiver muito diferente ou vazio, usar o original
      if (!cleanedTitle || cleanedTitle.length < 10) {
        logger.warn(`⚠️ Título otimizado muito curto ou vazio, usando original`);
        return originalTitle;
      }

      // Se o título otimizado for muito longo, pode ser que a IA retornou explicação
      if (cleanedTitle.length > originalTitle.length * 2) {
        logger.warn(`⚠️ Título otimizado muito longo, pode conter explicação, usando original`);
        return originalTitle;
      }

      return cleanedTitle;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro ao otimizar título: ${error.message}`);
      // Em caso de erro, retornar título original
      return originalTitle;
    }
  }

  /**
   * Chamar IA para gerar template
   */
  async callAI(prompt) {
    // Verificar se IA está habilitada
    const aiConfig = await openrouterClient.getConfig();
    if (!aiConfig.enabled || !aiConfig.apiKey) {
      throw new Error('IA não está habilitada. Configure o OpenRouter em Configurações → IA / OpenRouter');
    }
    
    // IMPORTANTE: Capturar erros de créditos insuficientes e outros erros da API
    // Esses erros serão tratados no templateRenderer para usar template padrão

    // Fazer requisição para OpenRouter
    const response = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

    // Processar resposta
    let template = '';
    if (typeof response === 'string') {
      template = response.trim();
    } else {
      template = String(response).trim();
    }

    // Limpar template - remover prefixos comuns que a IA pode adicionar
    template = template
      .replace(/^<s>\s*/g, '')
      .replace(/^\[OUT\]\s*/g, '')
      .replace(/^```[\w]*\n?/g, '')  // Remover início de code block
      .replace(/```$/g, '')  // Remover fim de code block
      .replace(/```[\w]*\n?/g, '')  // Remover code blocks no meio
      .replace(/```/g, '')
      .replace(/^Template:\s*/i, '')
      .replace(/^Template da Mensagem:\s*/i, '')
      .replace(/^Mensagem:\s*/i, '')
      .replace(/^Resposta:\s*/i, '')
      .replace(/^Aqui está o template:\s*/i, '')
      .replace(/^Aqui está:\s*/i, '')
      .replace(/^Segue o template:\s*/i, '')
      .replace(/^Template gerado:\s*/i, '')
      .replace(/^Aqui está o template gerado:\s*/i, '')
      .replace(/^Template de mensagem:\s*/i, '')
      .replace(/^Mensagem promocional:\s*/i, '')
      .replace(/^Mensagem de promoção:\s*/i, '')
      .replace(/^Aqui está a mensagem:\s*/i, '')
      .replace(/^Mensagem:\s*/i, '')
      .replace(/^Resposta da IA:\s*/i, '')
      .replace(/^Output:\s*/i, '')
      .replace(/^Saída:\s*/i, '')
      .trim();

    // IMPORTANTE: Converter HTML literal para Markdown se a IA gerou HTML
    // A IA às vezes gera <b>texto</b> em vez de **texto**
    // IMPORTANTE: Processar na ordem correta para evitar conflitos
    
    // 1. Proteger código já formatado com backticks
    const codePlaceholders = [];
    let codePlaceholderIndex = 0;
    template = template.replace(/`([^`]+)`/g, (match, content) => {
      const placeholder = `__CODE_PLACEHOLDER_${codePlaceholderIndex}__`;
      codePlaceholders[codePlaceholderIndex] = { placeholder, content: match };
      codePlaceholderIndex++;
      return placeholder;
    });
    
    // 2. Converter HTML para Markdown
    template = template
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')  // <code> primeiro (antes de outros)
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')  // <b>texto</b> → **texto**
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')  // <strong>texto</strong> → **texto**
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')  // <i>texto</i> → _texto_
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')  // <em>texto</em> → _texto_
      .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')  // <s>texto</s> → ~~texto~~
      .replace(/<br\s*\/?>/gi, '\n')  // <br> → quebra de linha
      .replace(/&nbsp;/g, ' ')  // &nbsp; → espaço
      .replace(/&lt;/g, '<')  // &lt; → <
      .replace(/&gt;/g, '>')  // &gt; → >
      .replace(/&amp;/g, '&');  // &amp; → &
    
    // 3. Corrigir tildes múltiplos incorretos (~~~~ → ~~, ~~~~~ → ~~)
    // IMPORTANTE: Não afetar ~~texto~~ válido
    // Usar abordagem mais segura que funciona em todos os contextos
    template = template
      // Corrigir 3 ou mais tildes consecutivos (exceto se já for parte de ~~texto~~)
      .replace(/(?<!~)~{3,}(?!~)/g, '~~')
      // Corrigir padrões como "R$ 165,00~~~~" para "R$ 165,00~~"
      .replace(/([^~\s])~{3,}(?!~)/g, '$1~~')
      // Corrigir padrões no início de linha
      .replace(/^~{3,}(?!~)/gm, '~~');
    
    // 3.5. Corrigir padrões mal formatados de preço antigo
    // A variável {old_price} já vem formatada como " ~~R$ 44,88~~"
    template = template
      // Remover "(de" antes de preço formatado
      .replace(/\(de\s+~~\s*([^~]+?)~~\)/g, ' ~~$1~~')
      .replace(/\(de\s+~~\s+([^~]+?)~~\)/g, ' ~~$1~~')
      // Remover "(De" ou "(DE" também
      .replace(/\([Dd][Ee]\s+~~\s*([^~]+?)~~\)/g, ' ~~$1~~')
      // Corrigir padrões como "de ~~R$ 44,88~~" (sem parênteses)
      .replace(/\bde\s+~~\s*([^~]+?)~~/g, ' ~~$1~~')
      // Corrigir múltiplos espaços antes de ~~
      .replace(/\s{2,}~~/g, ' ~~');
    
    // 4. Remover texto "mensagem truncada" ou variações que a IA pode adicionar
    template = template
      .replace(/\s*\.\.\.\s*\(mensagem\s+truncada\)/gi, '')
      .replace(/\s*\(mensagem\s+truncada\)/gi, '')
      .replace(/\s*\.\.\.\s*\(truncada\)/gi, '')
      .replace(/\s*\(truncada\)/gi, '')
      .replace(/\s*\.\.\.\s*\(continua\)/gi, '')
      .replace(/\s*\(continua\)/gi, '')
      .replace(/\s*\[\.\.\.\]/gi, '')
      .replace(/\s*\.\.\.\s*$/g, '')
      .replace(/\s*\[continua\s+na\s+próxima\s+mensagem\]/gi, '')
      .replace(/\s*\(continua\s+na\s+próxima\s+mensagem\)/gi, '')
      .replace(/\s*\[\.\.\.\s+continua\]/gi, '')
      .replace(/\s*\(ver\s+mais\)/gi, '')
      .replace(/\s*\[ver\s+mais\]/gi, '');
    
    // 4.5. Remover explicações ou comentários que a IA pode adicionar
    template = template
      .replace(/\n\s*\/\/.*$/gm, '')  // Remover comentários de linha
      .replace(/\n\s*<!--.*?-->/g, '')  // Remover comentários HTML
      .replace(/\n\s*\/\*.*?\*\//g, '')  // Remover comentários de bloco
      .replace(/\n\s*Nota:.*$/gmi, '')  // Remover notas
      .replace(/\n\s*Observação:.*$/gmi, '')  // Remover observações
      .replace(/\n\s*Importante:.*$/gmi, '')  // Remover importâncias
      .replace(/\n\s*Lembre-se:.*$/gmi, '');  // Remover lembretes
    
    // 5. Restaurar código protegido
    codePlaceholders.forEach(({ placeholder, content }) => {
      template = template.replace(placeholder, content);
    });

    // 9. Validar template
    if (!template || template.trim().length < 10) {
      logger.error(`❌ Template gerado está muito curto ou vazio: "${template}"`);
      throw new Error('Template gerado está muito curto ou vazio. A IA não gerou um template válido.');
    }
    
    // 10. Validar e corrigir variáveis mal formatadas
    // Corrigir variáveis com espaços ou caracteres extras
    template = template
      .replace(/\{\s*product_name\s*\}/g, '{product_name}')
      .replace(/\{\s*affiliate_link\s*\}/g, '{affiliate_link}')
      .replace(/\{\s*coupon_code\s*\}/g, '{coupon_code}')
      .replace(/\{\s*original_price\s*\}/g, '{original_price}')
      .replace(/\{\s*final_price\s*\}/g, '{final_price}')
      .replace(/\{\s*current_price\s*\}/g, '{current_price}')
      .replace(/\{\s*discount_percentage\s*\}/g, '{discount_percentage}')
      .replace(/\{\s*platform_name\s*\}/g, '{platform_name}')
      .replace(/\{\s*applicability\s*\}/g, '{applicability}');

    // 11. Validar variáveis obrigatórias baseado no tipo de template
    const hasProductName = template.includes('{product_name}');
    const hasAffiliateLink = template.includes('{affiliate_link}');
    const hasCouponCode = template.includes('{coupon_code}');
    
    // Para templates de promoção, product_name e affiliate_link são obrigatórios
    if (!hasProductName) {
      logger.warn(`⚠️ Template não contém {product_name}, mas continuando...`);
    }
    
    if (!hasAffiliateLink) {
      logger.warn(`⚠️ Template não contém {affiliate_link}, mas continuando...`);
    }
    
    // Para templates de cupom, coupon_code é obrigatório
    // (será validado no templateRenderer)
    
    // 12. Validar formatação Markdown básica
    // Verificar se há backticks mal formatados (apenas um backtick)
    const singleBackticks = template.match(/(?<!`)`(?!`)/g);
    if (singleBackticks && singleBackticks.length % 2 !== 0) {
      logger.warn(`⚠️ Número ímpar de backticks detectado, pode haver formatação incorreta`);
    }
    
    // Verificar se há asteriscos mal formatados (apenas um asterisco)
    const singleAsterisks = template.match(/(?<!\*)\*(?!\*)/g);
    if (singleAsterisks && singleAsterisks.length % 2 !== 0) {
      logger.warn(`⚠️ Número ímpar de asteriscos detectado, pode haver formatação incorreta`);
    }
    
    // 6. Validar e converter tags HTML não convertidas (múltiplas passadas para garantir)
    let htmlTags = template.match(/<[^>]+>/g);
    let conversionAttempts = 0;
    const maxAttempts = 3;
    
    while (htmlTags && htmlTags.length > 0 && conversionAttempts < maxAttempts) {
      logger.warn(`⚠️ Template ainda contém ${htmlTags.length} tag(s) HTML não convertida(s) (tentativa ${conversionAttempts + 1}/${maxAttempts}): ${htmlTags.slice(0, 5).join(', ')}`);
      
      // Converter todas as tags HTML para Markdown
      template = template
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')  // <code> primeiro
        .replace(/<pre>(.*?)<\/pre>/gi, '```$1```')  // <pre> para code block
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<i>(.*?)<\/i>/gi, '_$1_')
        .replace(/<em>(.*?)<\/em>/gi, '_$1_')
        .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
        .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
        .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
        .replace(/<u>(.*?)<\/u>/gi, '$1')  // Sublinhado não suportado, remover
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n')  // Parágrafos para quebras de linha
        .replace(/<div>(.*?)<\/div>/gi, '$1\n')
        .replace(/<span>(.*?)<\/span>/gi, '$1')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      
      // Remover tags HTML não reconhecidas (deixar apenas o conteúdo)
      template = template.replace(/<[^>]+>/g, '');
      
      conversionAttempts++;
      htmlTags = template.match(/<[^>]+>/g);
    }
    
    if (htmlTags && htmlTags.length > 0) {
      logger.error(`❌ Ainda há ${htmlTags.length} tag(s) HTML após ${maxAttempts} tentativas de conversão`);
      // Remover todas as tags HTML restantes (última tentativa)
      template = template.replace(/<[^>]+>/g, '');
    }
    
    // 7. Corrigir formatação de preços e valores mal formatados
    // Corrigir padrões como "R$ 78,00💰 Por: R$ 48,00 38% OFF" (tudo junto)
    template = template
      // Separar preço e emoji que estão juntos
      .replace(/(R\$\s*[\d.,]+)(💰|💵|💴|💶|💷|💸|💳|🏷️|🎟️)/g, '$1\n$2')
      // Separar "Por:" que está junto com preço
      .replace(/(R\$\s*[\d.,]+)\s*(Por:|por:|POR:)\s*(R\$\s*[\d.,]+)/g, '$1\n$2 $3')
      // Separar desconto que está junto com preço
      .replace(/(R\$\s*[\d.,]+)\s*(\d+%?\s*OFF)/gi, '$1\n🏷️ **$2**')
      // Corrigir padrões como "R$ 78,00💰 Por: R$ 48,00 38% OFF"
      .replace(/(R\$\s*[\d.,]+)(💰|💵|💴|💶|💷|💸|💳)\s*(Por:|por:|POR:)\s*(R\$\s*[\d.,]+)\s*(\d+%?\s*OFF)/gi, 
        '💰 **Preço:** $1\n🎟️ **Com Cupom:** $4\n🏷️ **$5**')
      // Garantir que emojis de preço tenham espaço antes
      .replace(/(💰|💵|💴|💶|💷|💸|💳|🏷️|🎟️)(R\$\s*[\d.,]+)/g, '$1 $2')
      // Garantir que emojis de preço tenham espaço depois se não tiver quebra de linha
      .replace(/(R\$\s*[\d.,]+)(💰|💵|💴|💶|💷|💸|💳|🏷️|🎟️)(?!\s|\n)/g, '$1 $2');
    
    // 8. Limpar espaços e quebras de linha excessivas
    template = template
      .replace(/\n{4,}/g, '\n\n\n')  // Máximo 3 quebras consecutivas
      .replace(/[ \t]{3,}/g, ' ')  // Múltiplos espaços para um espaço
      .replace(/^\s+/gm, '')  // Remover espaços no início de linha
      .replace(/\s+$/gm, '')  // Remover espaços no fim de linha
      .trim();

    logger.info(`✅ Template limpo e convertido (${template.length} chars)`);
    logger.debug(`📋 Template completo:\n${template}`);
    return template;
  }

  /**
   * Obter texto de urgência
   */
  getUrgencyText(level) {
    const texts = {
      'muito_urgente': 'MUITO URGENTE - Oferta imperdível, última chance!',
      'urgente': 'URGENTE - Oferta por tempo limitado!',
      'moderado': 'Oportunidade boa, aproveite!',
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






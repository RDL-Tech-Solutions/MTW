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
- Nome original: ${context.originalTitle || product.name || 'Produto'}
- Nome otimizado: ${context.optimizedTitle || product.name || 'Produto'} ${context.optimizedTitle ? '(USE ESTE TÍTULO EXATAMENTE na mensagem, sem modificações)' : ''}
- **CRÍTICO**: O título otimizado acima já está curto e pronto para uso. Use EXATAMENTE a variável {product_name} sem criar um novo título ou descrição longa.
- Preço atual: R$ ${product.current_price || '0,00'}
${context.hasOldPrice ? `- Preço antigo: R$ ${product.old_price} (use ~~R$ ${product.old_price}~~ para riscar)` : ''}
- Desconto: ${context.discount}% OFF
${context.hasCoupon ? `- TEM CUPOM VINCULADO: Preço original R$ ${context.originalPrice}, Preço final com cupom R$ ${context.finalPrice}` : ''}
- Plataforma: ${product.platform === 'mercadolivre' ? 'Mercado Livre' : product.platform === 'shopee' ? 'Shopee' : product.platform}
- Urgência: ${this.getUrgencyText(context.urgencyLevel)}

VARIÁVEIS DISPONÍVEIS (use {nome_variavel}):
${context.hasCoupon ? `
- {product_name} - Nome do produto
- {original_price} - Preço antes do cupom
- {final_price} - Preço final com cupom
- {current_price} - Preço final com cupom
- {old_price} - Preço antigo formatado (se houver)
- {discount_percentage} - Percentual de desconto
- {platform_name} - Nome da plataforma
- {affiliate_link} - Link de afiliado
- {coupon_section} - Seção completa do cupom
- {coupon_code} - Código do cupom
- {coupon_discount} - Desconto do cupom
- {price_with_coupon} - Preço final formatado
` : `
- {product_name} - Nome do produto
- {current_price} - Preço atual formatado
- {old_price} - Preço antigo formatado (se houver)
- {discount_percentage} - Percentual de desconto
- {platform_name} - Nome da plataforma
- {affiliate_link} - Link de afiliado
`}

REQUISITOS:
1. **CRÍTICO**: O título do produto DEVE aparecer na mensagem usando EXATAMENTE a variável {product_name} SEM MODIFICAR. ${context.optimizedTitle ? 'USE O TÍTULO OTIMIZADO fornecido no contexto' : 'Use o nome do produto fornecido'} O título já está otimizado e curto, NÃO crie um novo título ou descrição longa no lugar do título.
2. **CRÍTICO**: Crie uma mensagem COMPLETA e ELABORADA, não apenas um template básico
3. **CRÍTICO**: O título do produto ({product_name}) DEVE aparecer logo após o cabeçalho da oferta, em uma linha separada e destacada, usando EXATAMENTE a variável {product_name} sem alterações
4. **CRÍTICO**: Após o título, crie uma seção SEPARADA de descrição persuasiva destacando benefícios e características principais baseadas no título fornecido
5. **CRÍTICO**: Use a variável {affiliate_link} para o link, NÃO escreva "[Link de afiliado]" ou texto literal. O link será substituído automaticamente.
6. **CRÍTICO**: A mensagem DEVE ser enviada como caption de uma imagem, então seja direto e impactante
${context.hasCoupon ? `7. **CRÍTICO**: O código do cupom DEVE aparecer na mensagem usando a variável {coupon_code} formatada com backticks: \`{coupon_code}\`. Isso permite cópia fácil no Telegram. O código do cupom é OBRIGATÓRIO quando há cupom vinculado.` : '7. Crie uma mensagem ' + (context.urgencyLevel === 'muito_urgente' ? 'MUITO URGENTE e impactante' : context.urgencyLevel === 'urgente' ? 'urgente e persuasiva' : 'atrativa e clara')}
${context.hasCoupon ? '' : '8. Crie uma mensagem ' + (context.urgencyLevel === 'muito_urgente' ? 'MUITO URGENTE e impactante' : context.urgencyLevel === 'urgente' ? 'urgente e persuasiva' : 'atrativa e clara')}
${context.hasCoupon ? '8. **CRÍTICO**: Destaque a ECONOMIA DUPLA (desconto do produto + cupom) e SEMPRE inclua o código do cupom formatado' : '9. Destaque o desconto e a oportunidade'}
9. Use emojis relevantes e estratégicos (4-6 por mensagem para melhor visualização)
10. ${formatGuide}
11. Seja detalhado e persuasivo (mínimo 10-15 linhas para criar uma mensagem completa e atrativa)
12. **IMPORTANTE**: Inclua uma seção descrevendo o produto baseado no título, destacando características, benefícios e por que vale a pena comprar
13. Crie senso de urgência se o desconto for alto (${context.discount}%)
${context.hasCoupon ? '14. **CRÍTICO**: Enfatize o valor final com cupom aplicado e SEMPRE mostre o código do cupom formatado com backticks' : '14. Enfatize o preço com desconto'}
15. Use quebras de linha para organizar (uma linha em branco entre seções principais)
16. ${context.hasOldPrice ? '**CRÍTICO**: A variável {old_price} JÁ VEM FORMATADA com os tildes (ex: " ~~R$ 44,88~~"). Use APENAS {old_price} diretamente, SEM adicionar "(de" antes ou tildes extras. Exemplo correto: "💰 **Preço especial: {current_price}** {old_price}"' : ''}
17. **CRÍTICO**: NUNCA use tags HTML (<b>, <strong>, <code>, <s>) - use apenas Markdown (**texto** para negrito, ~~texto~~ para riscado, \`código\` para código)
18. **CRÍTICO**: Para preço antigo, use APENAS a variável {old_price} que já vem formatada corretamente. NÃO adicione "(de" antes ou tildes extras.
19. **CRÍTICO**: Use **texto** (dois asteriscos) para negrito, NÃO use <b>texto</b>
20. **CRÍTICO**: Para código do cupom, use \`{coupon_code}\` (backticks), NÃO use <code> ou tags HTML
21. **CRÍTICO**: NUNCA escreva "[Link de afiliado]" ou qualquer texto literal para o link - use APENAS {affiliate_link}
22. **CRÍTICO**: A mensagem DEVE incluir TODAS as seções: cabeçalho, título do produto, descrição, preço, desconto${context.hasCoupon ? ', código do cupom' : ''}, link e urgência
23. NÃO invente variáveis que não foram listadas
24. Retorne APENAS o template completo, sem explicações

EXEMPLO DE ESTRUTURA BOM (para produtos - MENSAGEM COMPLETA E ELABORADA):
🔥 **Oferta Imperdível!** 🔥

📦 **{product_name}**
[CRÍTICO: O título do produto DEVE aparecer aqui EXATAMENTE como fornecido, usando a variável {product_name}. NÃO modifique o título, NÃO crie uma descrição longa no lugar do título. O título já está otimizado e curto (exemplo: "🔥 Fonte Gigabyte GP-P650G PG5, 650W, 80 Plus Gold, PFC Ativo, PCIe 5.1, ATX 3.1, Preta"). Use EXATAMENTE a variável {product_name} sem alterações.]

💡 [AQUI: Crie uma descrição persuasiva do produto baseada no título fornecido, destacando características principais, benefícios e por que vale a pena comprar. Seja específico e convincente, usando 3-5 linhas. Esta é uma seção SEPARADA do título - o título já foi mostrado acima usando {product_name}.]

💰 **Preço especial: {current_price}**${context.hasOldPrice ? ' {old_price}' : ''}
🏷️ **${context.discount}% OFF - Economize R$ ${Math.round((product.old_price || product.current_price) - (product.current_price || 0))}!** 🏷️

${context.hasCoupon ? `🎟️ **CUPOM INCLUSO!** Aproveite ainda mais desconto!

🔑 **Código do Cupom:** \`{coupon_code}\`
💰 **Desconto do Cupom:** {coupon_discount}

` : ''}🛒 Disponível no {platform_name}

👉 {affiliate_link}
[CRÍTICO: Use {affiliate_link} aqui, NÃO escreva "[Link de afiliado]" ou qualquer texto literal. A variável será substituída pelo link real automaticamente.]

⏳ **Aproveite antes que acabe!** ⏳

IMPORTANTE SOBRE VARIÁVEIS:
- **CRÍTICO**: Use {product_name} para o título - será substituído pelo título otimizado que já está curto e pronto. NÃO modifique, NÃO crie um novo título, NÃO substitua por uma descrição longa. Use EXATAMENTE a variável {product_name} sem alterações.
- Use {affiliate_link} para o link (será substituído pelo link real)
- Use {current_price} para o preço atual
- Use {old_price} para o preço antigo (se houver)
- Use {discount_percentage} para o desconto
- Use {platform_name} para o nome da plataforma
${context.hasCoupon ? `- **CRÍTICO**: Use {coupon_code} para o código do cupom - SEMPRE formatado com backticks: \`{coupon_code}\`\n- Use {coupon_discount} para o desconto do cupom\n- Use {coupon_section} para a seção completa do cupom (opcional, pode usar {coupon_code} diretamente)` : ''}
- NUNCA escreva texto literal como "[Link de afiliado]" - use sempre as variáveis

IMPORTANTE SOBRE FORMATAÇÃO:
- Use **texto** para negrito (dois asteriscos)
- **IMPORTANTE**: A variável {old_price} JÁ VEM FORMATADA com os tildes. Use APENAS {old_price} diretamente, SEM adicionar "(de" ou tildes extras. Exemplo: "💰 **Preço especial: {current_price}** {old_price}"
- Use \`código\` para código (backticks)
- NUNCA use <b>, <strong>, <s>, <code> ou outras tags HTML
- Seja detalhado, persuasivo e completo (mínimo 10-15 linhas)
- **CRÍTICO**: Substitua [AQUI: ...] por uma descrição real e elaborada do produto
- **CRÍTICO**: A mensagem DEVE incluir TODAS as seções obrigatórias: cabeçalho, título do produto, descrição, preço, desconto, link e urgência
- **CRÍTICO**: NUNCA retorne uma mensagem vazia ou incompleta

ESTRUTURA OBRIGATÓRIA (todas as seções devem estar presentes):
1. Cabeçalho com emojis e chamada de atenção
2. **CRÍTICO**: Título do produto usando EXATAMENTE {product_name} - NÃO modifique, NÃO crie descrição longa no lugar. O título já está otimizado e curto.
3. Descrição persuasiva do produto (3-5 linhas) - Esta é uma seção SEPARADA, após o título
4. Preço e desconto formatados
${context.hasCoupon ? '5. **OBRIGATÓRIO**: Código do cupom formatado com backticks: \\`{coupon_code}\\`\n6. Link de afiliado usando {affiliate_link}\n7. Mensagem de urgência final' : '5. Link de afiliado usando {affiliate_link}\n6. Mensagem de urgência final'}

**ATENÇÃO ESPECIAL SOBRE O TÍTULO:**
- O título do produto ({product_name}) já está otimizado e curto (exemplo: "🔥 Fonte Gigabyte GP-P650G PG5, 650W, 80 Plus Gold, PFC Ativo, PCIe 5.1, ATX 3.1, Preta")
- Use EXATAMENTE a variável {product_name} sem modificações
- NÃO substitua o título por uma descrição longa
- NÃO crie um novo título baseado no título fornecido
- O título deve aparecer curto e direto, exatamente como fornecido

**EXEMPLO DO QUE NÃO FAZER (ERRADO):**
❌ "💡 Transforme sua experiência de digitação com este teclado RGB de 69 teclas! Com 18 modos de luz de fundo personalizáveis..."
   (Isso é uma descrição longa, NÃO é o título)

**EXEMPLO DO QUE FAZER (CORRETO):**
✅ 📦 **{product_name}**
   (O título aparece curto e direto, usando a variável {product_name})

💡 Transforme sua experiência de digitação com este teclado RGB de 69 teclas! Com 18 modos de luz de fundo personalizáveis...
   (A descrição vem DEPOIS do título, em uma seção separada)

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
- Plataforma: ${coupon.platform === 'mercadolivre' ? 'Mercado Livre' : coupon.platform === 'shopee' ? 'Shopee' : coupon.platform}
${context.hasMinPurchase ? `- Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}` : ''}
${context.hasMaxDiscount ? `- Limite de desconto: R$ ${coupon.max_discount_value.toFixed(2)}` : ''}
- Urgência: ${this.getUrgencyText(context.urgencyLevel)}
${context.isGeneral ? '- Válido para TODOS os produtos' : context.hasApplicableProducts ? `- Válido para produtos selecionados (${coupon.applicable_products?.length || 0} produto(s))` : '- Não há produtos selecionados (aplicabilidade não será mostrada)'}

**IMPORTANTE**: A mensagem será enviada com uma imagem do logo da plataforma. NÃO mencione o nome da plataforma no texto, pois a imagem já identifica a plataforma.

VARIÁVEIS DISPONÍVEIS (use {nome_variavel}):
- {coupon_code} - Código do cupom (OBRIGATÓRIO - DEVE aparecer na mensagem)
- {discount_value} - Valor do desconto formatado
- {min_purchase} - Valor da compra mínima formatado (ex: "R$ 199.00") - Apenas o valor, sem emoji ou texto adicional
- {applicability} - Aplicabilidade do cupom (ex: "✅ **Válido para todos os produtos**" ou "📦 **Em produtos selecionados** (X produtos)") - APENAS incluir se a variável não estiver vazia
- {coupon_title} - Título do cupom (se disponível)
- {coupon_description} - Descrição do cupom (se disponível)
- {affiliate_link} - Link de afiliado

**CRÍTICO**: NÃO inclua data de validade ({valid_until}) na mensagem. A data de validade não deve aparecer no template do bot.
**CRÍTICO**: NÃO mencione o nome da plataforma no texto, pois a imagem do logo já identifica a plataforma.

REQUISITOS:
1. **CRÍTICO**: O código do cupom ({coupon_code}) DEVE aparecer OBRIGATORIAMENTE na mensagem, formatado com backticks: \`{coupon_code}\` (exemplo: \`ADMLAYS\`). Isso permite cópia fácil no Telegram. SEMPRE inclua o código do cupom.
2. **CRÍTICO**: NÃO mencione o nome da plataforma no texto. A imagem do logo da plataforma será enviada junto com a mensagem, então não é necessário mencionar a plataforma.
3. Crie uma mensagem ${context.urgencyLevel === 'muito_urgente' ? 'MUITO URGENTE e impactante' : context.urgencyLevel === 'urgente' ? 'urgente e persuasiva' : 'atrativa e clara'}
4. **IMPORTANTE**: Use **texto** (dois asteriscos) para negrito, NÃO use <b>texto</b> ou <strong>texto</strong>
5. **CRÍTICO**: A variável {min_purchase} contém APENAS o valor formatado (ex: "R$ 199.00"). Você DEVE adicionar o emoji e texto completo: "💳 **Compra mínima:** {min_purchase}". NUNCA duplique "Compra mínima" ou adicione emoji dentro da variável.
6. Enfatize o valor do desconto de forma clara e destacada
7. **CRÍTICO**: NÃO inclua data de validade ou informações sobre quando o cupom expira. Apenas crie senso de urgência genérico se necessário.
8. Use emojis relevantes (máximo 4-5 por mensagem, não exagere): 🎟️, 💰, 🔥, ⚡
9. ${formatGuide}
10. Seja conciso mas informativo (máximo 8-10 linhas)
11. Use quebras de linha para organizar (uma linha em branco entre seções)
12. **CRÍTICO**: NUNCA use tags HTML (<b>, <strong>, <code>, <s>) - use apenas Markdown
13. **CRÍTICO**: Para riscar texto, use ~~texto~~ (dois tildes), NÃO use ~~~~ ou <s>
14. **CRÍTICO**: NÃO use a variável {valid_until} e NÃO mencione data de validade na mensagem
15. **CRÍTICO**: NÃO mencione o nome da plataforma (Mercado Livre, Shopee, Amazon, AliExpress) no texto
16. NÃO invente variáveis que não foram listadas
17. Retorne APENAS o template, sem explicações

EXEMPLO DE ESTRUTURA BOM (para cupons):
🎟️ **NOVO CUPOM DISPONÍVEL!** 🎟️

💰 **{discount_value} OFF**

${context.hasMinPurchase ? '💳 **Compra mínima:** {min_purchase}\n' : ''}🔑 **Código:** \`{coupon_code}\`

${context.isGeneral ? '{applicability}\n' : '{applicability}\n'}${coupon.title ? `📝 ${coupon.title}\n` : ''}${coupon.description ? `${coupon.description}\n` : ''}🔗 {affiliate_link}

⚡ Use agora e economize!

**IMPORTANTE SOBRE {applicability}:**
- Se o cupom for válido para TODOS os produtos: use {applicability} que mostrará "✅ **Válido para todos os produtos**"
- Se o cupom for para produtos SELECIONADOS: use {applicability} que mostrará "📦 **Em produtos selecionados** (X produtos)"
- Se {applicability} estiver VAZIO (não houver produtos selecionados e não for geral): NÃO inclua esta seção na mensagem

**ESTRUTURA OBRIGATÓRIA:**
1. Cabeçalho com emojis e chamada de atenção
2. **OBRIGATÓRIO**: Valor do desconto destacado
3. **OBRIGATÓRIO**: Código do cupom formatado com backticks: \`{coupon_code}\`
4. Compra mínima (se houver)
5. **IMPORTANTE**: Aplicabilidade do cupom usando {applicability} - APENAS incluir se a variável não estiver vazia. Se {applicability} estiver vazia, NÃO incluir esta seção.
6. Título/Descrição do cupom (se disponível)
7. Link de afiliado usando {affiliate_link}
8. Mensagem de urgência final

IMPORTANTE SOBRE FORMATAÇÃO:
- **CRÍTICO**: O código DEVE estar entre backticks: \`{coupon_code}\` - SEMPRE inclua o código
- Use **texto** para negrito (dois asteriscos)
- NUNCA use <b>, <strong>, <code> ou outras tags HTML
- NUNCA duplique texto como "Compra mínima: Compra mínima:"
- A variável {min_purchase} contém APENAS o valor (ex: "R$ 199.00"), você deve adicionar o emoji e texto: "💳 **Compra mínima:** {min_purchase}"
- **CRÍTICO**: NÃO mencione o nome da plataforma no texto
- Seja direto e impactante
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
    template = template
      .replace(/^<s>\s*/g, '')
      .replace(/^\[OUT\]\s*/g, '')
      .replace(/```[\w]*\n?/g, '')
      .replace(/```/g, '')
      .replace(/^Template:\s*/i, '')
      .replace(/^Template da Mensagem:\s*/i, '')
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
    template = template.replace(/(?<!~)~{3,}(?!~)/g, '~~');
    
    // 3.5. Corrigir padrões mal formatados de preço antigo como "(de ~~ R$ 44,88)" ou "(de ~~R$ 44,88)"
    // A variável {old_price} já vem formatada como " ~~R$ 44,88~~", então quando a IA adiciona "(de" antes, fica errado
    template = template.replace(/\(de\s+~~\s*([^~]+?)~~\)/g, (match, price) => {
      // Remover o "(de" e manter apenas o preço formatado
      return ` ~~${price.trim()}~~`;
    });
    
    // Corrigir também casos onde há espaço entre ~~ e o preço: "(de ~~ R$ 44,88)"
    template = template.replace(/\(de\s+~~\s+([^~]+?)~~\)/g, (match, price) => {
      return ` ~~${price.trim()}~~`;
    });
    
    // 4. Remover texto "mensagem truncada" ou "... (mensagem truncada)" que a IA pode adicionar
    template = template.replace(/\s*\.\.\.\s*\(mensagem\s+truncada\)/gi, '');
    template = template.replace(/\s*\(mensagem\s+truncada\)/gi, '');
    template = template.replace(/\s*\.\.\.\s*\(truncada\)/gi, '');
    template = template.replace(/\s*\(truncada\)/gi, '');
    
    // 5. Restaurar código protegido
    codePlaceholders.forEach(({ placeholder, content }) => {
      template = template.replace(placeholder, content);
    });

    // Validar template
    if (!template || template.trim().length < 10) {
      logger.error(`❌ Template gerado está muito curto ou vazio: "${template}"`);
      throw new Error('Template gerado está muito curto ou vazio. A IA não gerou um template válido.');
    }

    // Validar que o template contém pelo menos o título do produto ou variável {product_name}
    if (!template.includes('{product_name}') && !template.includes('product_name')) {
      logger.warn(`⚠️ Template não contém {product_name}, mas continuando...`);
    }

    // Validar que o template contém pelo menos o link de afiliado ou variável {affiliate_link}
    if (!template.includes('{affiliate_link}') && !template.includes('affiliate_link')) {
      logger.warn(`⚠️ Template não contém {affiliate_link}, mas continuando...`);
    }

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






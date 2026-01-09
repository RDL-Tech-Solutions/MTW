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

      // Gerar template via IA (texto puro)
      let template = await this.callAI(prompt);

      // PÓS-PROCESSAMENTO: Aplicar formatação Markdown aos placeholders
      template = template
        // Remover NBSP e chars invisíveis primeiro
        .replace(/\u00A0/g, ' ')

        .replace(/PRODUTO_NOME/gi, '**{product_name}**')
        .replace(/PRECO_ATUAL/gi, '**{current_price}**')

        // SUBSTITUIÇÃO "HOOVER" (Aspirador) DE PRECO_ANTIGO
        // A variável {old_price} JÁ VEM COM TILDES do sistema padrão (~~R$ XX~~)
        // Portanto, substituímos APENAS pela variável, removendo qualquer decoração extra da IA
        .replace(/(?:[~R$\-\s])*(?:PRE[cCçÇ][oO0][_\-\s]*ANTIGO)(?:[~R$\-\s])*/gi, '{old_price}')

        .replace(/DESCONTO_PERCENTUAL/gi, '**{discount_percentage}%**')
        .replace(/CODIGO_CUPOM/gi, '`{coupon_code}`')
        .replace(/PRECO_FINAL/gi, '**{final_price}**')
        .replace(/DESCONTO_CUPOM/gi, '**{coupon_discount}**')
        .replace(/LINK_PRODUTO/gi, '👉 {affiliate_link}')
        // LIMPEZA FINAL DE SEGURANÇA
        .replace(/~~\s*~~/g, '~~') // Remove ~~ ~~ duplicado
        .replace(/~{3,}/g, '~~')   // Remove ~~~ ou ~~~~
        .replace(/R\$\s*~~/gi, '~~') // Remove R$ ~~ ficando apenas ~~R$ (do valor)
        // Garantir que não fique ~~R$ ~~R$ 
        .replace(/~~R\$\s*~~R\$/gi, '~~R$')
        // Remover tags HTML
        .replace(/<[^>]+>/g, '')
        // Remover entidades HTML
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        // Limpar linhas vazias excessivas
        .replace(/\n{3,}/g, '\n\n')
        .trim();

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

      // Gerar template via IA (texto puro)
      let template = await this.callAI(prompt);

      // PÓS-PROCESSAMENTO: Aplicar formatação Markdown aos placeholders
      // A IA retorna texto puro com CODIGO_CUPOM, VALOR_DESCONTO, etc.
      // Nós aplicamos a formatação aqui para garantir consistência
      template = template
        // Remover NBSP e chars invisíveis primeiro (CRÍTICO para evitar texto aglutinado)
        .replace(/\u00A0/g, ' ')

        // Substituir placeholders por variáveis formatadas em Markdown
        .replace(/CODIGO_CUPOM/gi, '`{coupon_code}`')
        .replace(/VALOR_DESCONTO/gi, '**{discount_value}**')
        .replace(/VALOR_MINIMO/gi, '**{min_purchase}**');

      // Substituir APLICABILIDADE conforme configuração
      if (isGeneral === true) {
        template = template.replace(/APLICABILIDADE/gi, '✅ Válido para **todos os produtos**!');
      } else if (isGeneral === false) {
        template = template.replace(/APLICABILIDADE/gi, '🎯 Válido apenas para **produtos selecionados**');
      }

      // Limpeza final
      template = template
        // Remover qualquer tag HTML que a IA possa ter adicionado
        .replace(/<[^>]+>/g, '')
        // Remover entidades HTML
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        // Garantir quebras de linha DUPLAS para visualização correta no Telegram
        // Se houver apenas uma quebra de linha entre caracteres não vazio, transforma em duas
        .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
        // Limpar excessos (3 ou mais viram 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

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

      // Gerar via IA (texto puro)
      let template = await this.callAI(prompt);

      // PÓS-PROCESSAMENTO
      template = template
        .replace(/CODIGO_CUPOM/gi, '`{coupon_code}`')
        // Remover tags HTML remanescentes
        .replace(/<[^>]+>/g, '')
        .trim();

      logger.info(`✅ [IA ADVANCED] Template de cupom expirado gerado`);
      return template;

    } catch (error) {
      logger.error(`❌ [IA ADVANCED] Erro: ${error.message}`);
      throw error;
    }
  }

  /**
   * Construir prompt CRIATIVO para promoção
   * Texto puro com placeholders - formatação aplicada depois
   */
  buildPromotionPrompt(product, platform, context) {
    const hasDiscount = context.discount && context.discount > 0;
    const hasCoupon = context.hasCoupon;

    // Personas de vendas variadas (15 variações)
    const personas = [
      {
        role: "O Caçador de Bug",
        instruction: "Aja como se fosse um erro de preço. 'Gente, corre que o estagiário errou!', 'Preço bugado!'. Use emojis de 🐛 e 🚨."
      },
      {
        role: "O Analista de Custo-Benefício",
        instruction: "Foque na lógica matemática. 'Fiz as contas e esse é o menor preço histórico'. Use emojis de 📉 e 🧮."
      },
      {
        role: "O Influencer Hype",
        instruction: "Fale como se fosse o produto do momento. 'Todo mundo tá querendo...', 'O queridinho da internet'. Use emojis de ✨ e trends."
      },
      {
        role: "O Alerta Vermelho",
        instruction: "Urgência máxima. 'ÚLTIMAS UNIDADES', 'Vai acabar em minutos'. Use emojis de 🔴 e ⏰."
      },
      {
        role: "O Comparador Sincero",
        instruction: "Compare com o preço normal. 'Geralmente custa X, mas hoje tá Y'. Mostre a vantagem clara."
      },
      {
        role: "O Amigo Íntimo",
        instruction: "Tom de conversa privada. 'Só tô mandando pra você que é VIP...', 'Não espalha muito'. Use emojis de 🤫."
      },
      {
        role: "O Minimalista Premium",
        instruction: "Poucas palavras, foco na elegância e qualidade. 'Simplesmente o melhor.', 'Qualidade indiscutível.'. Estilo clean."
      },
      {
        role: "O Detetive de Preços",
        instruction: "Diga que estava monitorando. 'Tava de olho nesse preço há meses e finalmente caiu!'. Use emojis de 🕵️‍♂️."
      },
      {
        role: "O Resolve-Problemas",
        instruction: "Foque na dor que o produto resolve. 'Cansado de X? A solução tá aqui.'. Seja prático."
      },
      {
        role: "O Humorista",
        instruction: "Faça uma piada leve sobre precisar do produto. 'Pra você parar de passar vergonha...', 'Chega de improviso'. 😂"
      },
      {
        role: "O Futurista/Tech",
        instruction: "Foque na inovação e specs. 'Tecnologia de ponta', 'O futuro chegou'. Use emojis de 🚀 e 🤖."
      },
      {
        role: "O Crítico Gastronômico/Experiente",
        instruction: "Fale como quem testou e aprovou. 'Qualidade testada', 'Selo de aprovação'. (Adapte se não for comida)."
      },
      {
        role: "O Desconfiado Convertido",
        instruction: "Diga que duvidava mas se surpreendeu. 'Eu não acreditava que era tão bom...', 'Me surpreendeu'."
      },
      {
        role: "O VIP 'Backstage'",
        instruction: "Fale como se tivesse acesso privilegiado. 'Consegui esse lote exclusivo', 'Direto da fábrica pra vocês'."
      },
      {
        role: "O Presenteador",
        instruction: "Sugira como presente. 'Já pensou no presente de...?'. 'Aquele mimo que você merece'. 🎁"
      }
    ];

    const randomPersona = personas[Math.floor(Math.random() * personas.length)];

    return `Você vai assumir a seguinte persona: ${randomPersona.role}.
${randomPersona.instruction}

📋 DADOS DO PRODUTO:
Nome: ${product.name || 'Produto'}
Preço atual: R$ ${product.current_price}
${context.hasOldPrice ? `Preço original: R$ ${product.old_price}` : ''}
${hasDiscount ? `Desconto: ${context.discount}%` : ''}
${hasCoupon ? `TEM CUPOM EXTRA! Preço final: R$ ${context.finalPrice}` : ''}

🎯 SUA MISSÃO:
Crie uma mensagem que faça o leitor QUERER comprar AGORA seguindo o estilo da sua persona (${randomPersona.role})!
Use gatilhos de urgência, exclusividade e benefícios.

✍️ REGRAS OBRIGATÓRIAS:
1. NÃO use HTML ou Markdown (escreva APENAS texto puro)
2. Use APENAS texto simples + 4-7 emojis condizentes com a persona
3. 7-10 linhas com boa respiração (use quebras de linha DUPLAS)
4. Use PRODUTO_NOME para o nome do produto
5. Use PRECO_ATUAL para o preço (NÃO escreva "R$" antes)
6. Use PRECO_ANTIGO para o preço original (NÃO escreva "R$" ou "~~" antes)
7. Use DESCONTO_PERCENTUAL para o desconto
${hasCoupon ? '8. Use CODIGO_CUPOM para o cupom extra\n9. Use PRECO_FINAL para preço com cupom\n10. Use DESCONTO_CUPOM para valor do cupom' : ''}
${hasDiscount ? '11. DESTAQUE a economia!' : ''}
12. Termine OBRIGATORIAMENTE a mensagem com a palavra LINK_PRODUTO
13. NUNCA mencione datas ou prazos

💡 EXEMPLOS DE ABERTURA VENDEDORA (inspire-se):

"🔥 OFERTA IMPERDÍVEL! Olha só esse preço!"
"💥 PROMOÇÃO ARRASADORA! Você precisa ver isso!"
"⚡ ATENÇÃO! Produto TOP com desconto ABSURDO!"
"🎯 OPORTUNIDADE ÚNICA! Não vai ter igual!"
"🚀 CORRE! Essa oferta é MUITO BOA!"
"✨ MARAVILHOSO! Olha o que eu trouxe pra vocês!"

Agora crie SUA mensagem de venda única (texto puro com quebras de linha):`;
  }

  /**
   * Construir prompt CRIATIVO para cupom
   * A IA gera APENAS o texto criativo - formatação é aplicada pelo código
   */
  buildCouponPrompt(coupon, platform, context) {
    const discountText = context.discountType === 'percentage'
      ? `${context.discountValue}% `
      : `R$ ${context.discountValue} `;

    // 10 Personas Criativas Variadas
    const personas = [
      {
        role: "O Entusiasta Exagerado",
        instruction: "Use exclamações, emojis de fogo e demonstre choque com o preço baixo. Comece com algo como 'Gente do céu!' ou 'Inacreditável!'."
      },
      {
        role: "O Especialista Analítico",
        instruction: "Seja direto e foque no valor matemático da economia. Use emojis de gráfico e dinheiro. Comece com 'Analisando as ofertas de hoje...' ou 'Oportunidade calculada:'."
      },
      {
        role: "O Amigo Confidencial",
        instruction: "Fale como se estivesse contando um segredo para um amigo próximo. Use 'psiu', 'olha isso aqui' e emojis de segredo. Tom de cumplicidade."
      },
      {
        role: "O Alertador de Urgência",
        instruction: "Foque na escassez e rapidez. Use emojis de sirene e relógio. Frases curtas e de impacto tipo 'CORRE!', 'VAI ACABAR!'."
      },
      {
        role: "O Caçador de Tesouros",
        instruction: "Aja como quem encontrou uma joia rara. Use emojis de diamante e estrela. 'Olha o que eu garimpei...', 'Achado do dia!'."
      },
      {
        role: "O Minimalista Impactante",
        instruction: "Seja extremamente breve. Poucas palavras, muito impacto. Foco total nos números e no código. Estilo 'Curto e grosso'."
      },
      {
        role: "O Questionador",
        instruction: "Comece com uma pergunta que engaje. 'Quem aí quer economizar?', 'Cansado de pagar caro?'. Faça o leitor responder mentalmente sim."
      },
      {
        role: "O VIP Exclusivo",
        instruction: "Faça o leitor se sentir especial. 'Só para quem está no grupo...', 'Oferta vip liberada...'. Use emojis de troféu ou medalha."
      },
      {
        role: "O Irônico Divertido",
        instruction: "Use um humor leve sobre gastar dinheiro vs economizar. 'O estagiário ficou maluco', 'Patrão liberou o desconto'."
      },
      {
        role: "O Tecnológico/Gamer",
        instruction: "Use termos como 'Desbloqueado', 'Level Up', 'Cheat Code'. Emojis de controle de game, robô ou raio."
      }
    ];

    const randomPersona = personas[Math.floor(Math.random() * personas.length)];

    return `Você vai assumir a seguinte persona: ${randomPersona.role}.
${randomPersona.instruction}

📋 DADOS DO CUPOM:
    Código: ${coupon.code}
    Desconto: ${discountText}
${context.hasMinPurchase ? `Mínimo: R$ ${coupon.min_purchase}` : 'Sem mínimo!'}
${context.isGeneral === true ? 'TODOS OS PRODUTOS (destaque isso!)' : ''}
${context.isGeneral === false ? 'Produtos selecionados (mencione!)' : ''}

🎯 SUA MISSÃO:
Crie uma mensagem curta e PERFEITA para vender este cupom no Telegram/WhatsApp seguindo exatamente o estilo da sua persona (${randomPersona.role}).

✍️ REGRAS OBRIGATÓRIAS:
    1. NÃO use HTML ou Markdown (escreva APENAS texto puro)
    2. Use APENAS texto simples + 4-6 emojis condizentes com a persona
    3. 5-7 linhas no máximo
    4. Use CODIGO_CUPOM para o código
    5. Use VALOR_DESCONTO para o desconto
    6. Use VALOR_MINIMO se tiver mínimo
    7. Use APLICABILIDADE se tiver is_general definido
    8. NUNCA mencione datas, validades ou links
    9. Use QUEBRA DE LINHA DUPLA entre frases/parágrafos para não ficar tudo junto

    Agora escreva SUA mensagem única (texto puro com quebras de linha DUPLAS):`;
  }

  /**
   * Construir prompt para cupom expirado
   */
  buildExpiredCouponPrompt(coupon, platform) {
    return `Você é um porta-voz de uma comunidade de ofertas. Informe que um cupom infelizmente expirou.

      INFORMAÇÕES:
      - Código que expirou: ${coupon.code}

      🎯 SUA MISSÃO:
      Seja amigável, mas deixe claro que a oportunidade passou. Incentive os usuários a ficarem atentos para não perderem as próximas!

      ✍️ REGRAS:
      1. NÃO use <b>, </b>, <code> ou Markdown
        2. Use APENAS texto simples + 2-3 emojis
        3. Use CODIGO_CUPOM para o código do cupom
        4. NUNCA mencione datas específicas
        5. Máximo 4 linhas curtas

        💡 EXEMPLOS (inspire-se):
        "😔 Poxa, esse cupom CODIGO_CUPOM acabou de expirar!"
        "⏰ O tempo voou e o cupom CODIGO_CUPOM não está mais ativo."

        Agora escreva sua mensagem curta (apenas texto puro):`;
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

    // 2. Desescapar entidades HTML PRIMEIRO (antes de converter tags)
    template = template
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 3. Converter HTML para Markdown
    template = template
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
      .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
      .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<br\s*\/?>/gi, '\n');

    // 3.1 Limpeza adicional: remover tags literais que não foram convertidas
    // Isso captura casos onde as tags aparecem quebradas ou mal formatadas
    template = template
      .replace(/<\/?code>/gi, '')
      .replace(/<\/?b>/gi, '')
      .replace(/<\/?strong>/gi, '')
      .replace(/<\/?i>/gi, '')
      .replace(/<\/?em>/gi, '')
      .replace(/<\/?s>/gi, '')
      .replace(/<\/?del>/gi, '')
      .replace(/<\/?strike>/gi, '');

    // 4. Remover tags HTML restantes
    template = template.replace(/<[^>]+>/g, '');

    // 5. Corrigir tildes múltiplos
    template = template.replace(/~{3,}/g, '~~');

    // 6. Corrigir padrões de preço antigo mal formatados
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

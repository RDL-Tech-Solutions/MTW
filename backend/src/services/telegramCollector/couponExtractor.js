/**
 * Extrator de cupons de mensagens do Telegram
 * Versão JavaScript do coupon_extractor.py
 */
import logger from '../../config/logger.js';

class CouponExtractor {
  constructor() {
    // Palavras-chave que indicam cupom
    this.COUPON_KEYWORDS = [
      'cupom', 'cupão', 'coupon', 'desconto', 'promo', 'promoção', 'promocao',
      'off', 'cashback', 'cash back', 'voucher', 'código', 'codigo',
      'oferta', 'mega', 'super', 'frete', 'grátis', 'gratis', 'economia',
      'economize', 'ganhe', 'presente', 'brinde', 'bonus', 'bônus',
      'aproveite', 'imperdível', 'imperdivel', 'queima', 'black',
      'cyber', 'sale', 'liquidação', 'liquidacao'
    ];

    // Regex para código de cupom (4-15 caracteres alfanuméricos)
    // PRIORIDADE: Código dentro de backticks `codigo` (mais confiável)
    this.COUPON_CODE_IN_BACKTICKS = /`([A-Z0-9]{4,15})`/g;
    // Melhorado para capturar códigos após ":" ou emojis 🎟
    this.COUPON_CODE_PATTERN = /\b([A-Z0-9]{4,15})\b/g;
    this.COUPON_CODE_AFTER_COLON = /[:：]\s*([A-Z0-9]{4,15})\b/g;
    this.COUPON_CODE_AFTER_EMOJI = /🎟[️]?\s*([A-Z0-9]{4,15})\b/g;

    // Regex para desconto percentual (melhorado)
    this.DISCOUNT_PERCENT_PATTERN = /(\d+)\s*%\s*(?:OFF|off|de\s*desconto)?|(\d+)\s*por\s*cento|(\d+)\s*percent|(\d+)\s*OFF|desconto\s*de\s*(\d+)\s*%/i;

    // Regex para desconto em reais (melhorado)
    // Padrões: "R$100 OFF", "100 OFF em R$999", "180 OFF acima R$1999", "R$250 OFF em R$1499"
    this.DISCOUNT_VALUE_PATTERN = /R\$\s*(\d+(?:[.,]\d{2})?)\s*(?:OFF|off)?|(\d+)\s*OFF\s*(?:em|acima|acima\s*de)\s*R\$\s*\d+/i;

    // Regex para OFF (melhorado)
    this.OFF_PATTERN = /(\d+)\s*(?:%|por\s*cento)?\s*(?:OFF|off|de\s*desconto)/i;

    // Regex para limite de desconto (máx R$200, limite R$200 OFF)
    this.MAX_DISCOUNT_PATTERN = /(?:máx|max|limite|lim)\s*(?:de\s*)?R\$\s*(\d+(?:[.,]\d{2})?)|(?:máx|max|limite|lim)\s*R\$\s*(\d+)\s*OFF/i;

    // Regex para compra mínima (melhorado)
    this.MIN_PURCHASE_PATTERN = /(?:em|acima\s*de|acima|a\s*partir\s*de|mínimo|min|compra\s*mínima|valor\s*mínimo)\s*R\$\s*(\d+(?:[.,]\d{2})?)|R\$\s*(\d+(?:[.,]\d{2})?)\s*(?:em|acima|mínimo)/i;
  }

  /**
   * Verifica se o texto contém palavras-chave de cupom
   */
  hasCouponKeywords(text) {
    if (!text) return false;
    const textLower = text.toLowerCase();
    return this.COUPON_KEYWORDS.some(keyword => textLower.includes(keyword));
  }

  /**
   * Extrai código de cupom do texto (melhorado para múltiplos formatos)
   * PRIORIDADE: Código dentro de backticks `codigo` (mais confiável)
   */
  extractCouponCode(text) {
    if (!text) {
      logger.debug(`   ⚠️ Texto vazio, ignorando mensagem`);
      return null;
    }

    // Filtrar códigos muito comuns que não são cupons
    const invalidCodes = new Set([
      'HTTP', 'HTTPS', 'WWW', 'COM', 'BR', 'ORG', 'NET', 'HTML', 'JPEG', 'PNG',
      'AMZN', 'AMAZON', 'SHOPEE', 'MELI', 'MERCADO', 'LIVRE', 'ALIEXPRESS',
      'MAGAZINE', 'LUIZA', 'AMERICANAS', 'SUBMARINO', 'CASAS', 'BAHIA',
      'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'WHATSAPP',
      'TELEGRAM', 'DISCORD', 'SLACK', 'GMAIL', 'OUTLOOK', 'YAHOO'
    ]);

    // MÉTODO 1 (PRIORIDADE MÁXIMA): Código dentro de backticks `codigo`
    const backtickMatches = [...text.matchAll(this.COUPON_CODE_IN_BACKTICKS)];
    for (const match of backtickMatches) {
      const code = match[1];
      if (!invalidCodes.has(code) && code.length >= 4) {
        logger.debug(`   ✅ Código encontrado em backticks: ${code}`);
        return code;
      }
    }

    // MÉTODO 2: Código após ":" ou "Código:" (formato comum: "🎟 18% OFF: MELICUPOM" ou "Código: MELICUPOM")
    const colonPatterns = [
      /[:：]\s*([A-Z0-9]{4,15})\b/g,
      /código[:\s]+([A-Z0-9]{4,15})\b/gi,
      /code[:\s]+([A-Z0-9]{4,15})\b/gi,
      /cupom[:\s]+([A-Z0-9]{4,15})\b/gi
    ];

    for (const pattern of colonPatterns) {
      const colonMatches = [...text.matchAll(pattern)];
      for (const match of colonMatches) {
        const code = match[1];
        if (!invalidCodes.has(code) && code.length >= 4) {
          logger.debug(`   ✅ Código encontrado após dois pontos/palavra-chave: ${code}`);
          return code;
        }
      }
    }

    // MÉTODO 3: Código após emoji 🎟 (melhorado)
    const emojiPatterns = [
      /🎟[️]?\s*([A-Z0-9]{4,15})\b/g,
      /🎫[️]?\s*([A-Z0-9]{4,15})\b/g,
      /💰[️]?\s*([A-Z0-9]{4,15})\b/g,
      /💳[️]?\s*([A-Z0-9]{4,15})\b/g
    ];

    for (const pattern of emojiPatterns) {
      const emojiMatches = [...text.matchAll(pattern)];
      for (const match of emojiMatches) {
        const code = match[1];
        if (!invalidCodes.has(code) && code.length >= 4) {
          logger.debug(`   ✅ Código encontrado após emoji: ${code}`);
          return code;
        }
      }
    }

    // MÉTODO 4: Código próximo a palavras-chave de cupom (método original melhorado)
    const matches = [...text.matchAll(this.COUPON_CODE_PATTERN)];
    for (const match of matches) {
      const code = match[1];
      if (!invalidCodes.has(code) && code.length >= 4) {
        const textLower = text.toLowerCase();
        const codeLower = code.toLowerCase();
        const matchIndex = textLower.indexOf(codeLower);

        if (matchIndex !== -1) {
          // Verificar contexto ao redor (200 caracteres antes e depois)
          const start = Math.max(0, matchIndex - 200);
          const end = Math.min(text.length, matchIndex + code.length + 200);
          const context = textLower.substring(start, end);

          // Se há palavras-chave próximas, é provavelmente um cupom
          if (this.COUPON_KEYWORDS.some(keyword => context.includes(keyword))) {
            logger.debug(`   ✅ Código encontrado próximo a palavra-chave: ${code}`);
            return code;
          }

          // Se há padrões de desconto próximos (OFF, %, R$)
          if (context.includes('off') || context.includes('%') || context.includes('r$') || context.includes('desconto')) {
            logger.debug(`   ✅ Código encontrado próximo a padrão de desconto: ${code}`);
            return code;
          }
        }
      }
    }

    // MÉTODO 5: Se o texto tem palavras-chave, tentar qualquer código alfanumérico maior que 5 caracteres
    if (this.hasCouponKeywords(text)) {
      for (const match of matches) {
        const code = match[1];
        if (!invalidCodes.has(code) && code.length >= 5) {
          logger.debug(`   ✅ Código encontrado em texto com palavras-chave: ${code}`);
          return code;
        }
      }
    }

    logger.debug(`   ⚠️ Nenhum código válido encontrado na mensagem`);
    return null;
  }

  /**
   * Extrai valor de desconto do texto (melhorado)
   */
  extractDiscount(text) {
    const result = {
      type: null,
      value: null
    };

    if (!text) return result;

    // Tentar encontrar desconto percentual (melhorado)
    const percentMatch = text.match(this.DISCOUNT_PERCENT_PATTERN);
    if (percentMatch) {
      const value = percentMatch[1] || percentMatch[2] || percentMatch[3] || percentMatch[4] || percentMatch[5];
      if (value) {
        try {
          const discountValue = parseFloat(value);
          // Validar que é um desconto percentual razoável (entre 1% e 100%)
          if (discountValue >= 1 && discountValue <= 100) {
            result.type = 'percentage';
            result.value = discountValue;
            logger.debug(`   ✅ Desconto percentual encontrado: ${result.value}%`);
            return result;
          }
        } catch (error) {
          // Continuar
        }
      }
    }

    // Tentar encontrar desconto em reais (melhorado)
    // Padrões: "R$100 OFF", "100 OFF em R$999", "180 OFF acima R$1999", "R$250 OFF em R$1499"
    const valueMatch = text.match(this.DISCOUNT_VALUE_PATTERN);
    if (valueMatch) {
      try {
        // Tentar primeiro grupo (R$100)
        if (valueMatch[1]) {
          const valueStr = valueMatch[1].replace(/[.,]/g, '');
          if (valueStr) {
            result.type = 'fixed';
            result.value = parseFloat(valueStr);
            logger.debug(`   Desconto fixo encontrado: R$ ${result.value}`);
            return result;
          }
        }
        // Tentar segundo grupo (100 OFF)
        if (valueMatch[2]) {
          const valueStr = valueMatch[2].replace(/[.,]/g, '');
          if (valueStr) {
            result.type = 'fixed';
            result.value = parseFloat(valueStr);
            logger.debug(`   Desconto fixo encontrado via OFF: R$ ${result.value}`);
            return result;
          }
        }
      } catch (error) {
        // Continuar
      }
    }

    // Padrão adicional: "180 OFF" (sem R$)
    const simpleOffMatch = text.match(/(\d+)\s*OFF/i);
    if (simpleOffMatch && !result.value) {
      try {
        const offValue = parseFloat(simpleOffMatch[1]);
        // Se o valor é maior que 100, provavelmente é um valor fixo em reais
        if (offValue > 100) {
          result.type = 'fixed';
          result.value = offValue;
          logger.debug(`   Desconto fixo encontrado (padrão simples): R$ ${result.value}`);
          return result;
        }
      } catch (error) {
        // Continuar
      }
    }

    // Tentar encontrar OFF genérico
    const offMatch = text.match(this.OFF_PATTERN);
    if (offMatch) {
      try {
        const offValue = parseFloat(offMatch[1]);
        // Se o valor é maior que 100, provavelmente é um valor fixo em reais
        if (offValue > 100) {
          result.type = 'fixed';
          result.value = offValue;
          logger.debug(`   Desconto fixo encontrado via OFF: R$ ${result.value}`);
        } else {
          result.type = 'percentage';
          result.value = offValue;
          logger.debug(`   Desconto percentual encontrado via OFF: ${result.value}%`);
        }
        return result;
      } catch (error) {
        // Continuar
      }
    }

    return result;
  }

  /**
   * Extrai compra mínima do texto (melhorado)
   */
  extractMinPurchase(text) {
    if (!text) return null;

    const patterns = [
      // "em R$999", "acima de R$79", "acima R$1999"
      /(?:em|acima\s*de|acima|a\s*partir\s*de|mínimo|min)\s*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      // "compra mínima R$100"
      /compra\s*mínima[:\s]*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      // "válido para compras acima de R$100"
      /válido\s*para\s*compras\s*(?:acima\s*de|de|a\s*partir\s*de)[:\s]*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      // "mínimo de R$100"
      /mínimo\s*de\s*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      // "R$100 em compras" ou "R$100 mínimo"
      /R\$\s*(\d+(?:[.,]\d{2})?)\s*(?:em|mínimo|acima)/i,
      // "valor mínimo R$100"
      /valor\s*mínimo[:\s]*R\$\s*(\d+(?:[.,]\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const valueStr = (match[1] || match[2] || '').replace(/[.,]/g, '');
          if (valueStr) {
            const value = parseFloat(valueStr);
            // Validar que é um valor razoável (entre R$1 e R$100.000)
            if (value > 0 && value <= 100000) {
              logger.debug(`   ✅ Compra mínima encontrada: R$ ${value.toFixed(2)}`);
              return value;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extrai limite máximo de desconto (máx R$200, limite R$200 OFF)
   */
  extractMaxDiscount(text) {
    if (!text) return null;

    const match = text.match(this.MAX_DISCOUNT_PATTERN);
    if (match) {
      try {
        const valueStr = (match[1] || match[2] || '').replace(/[.,]/g, '');
        if (valueStr) {
          const value = parseFloat(valueStr);
          if (value > 0) {
            logger.debug(`   Limite máximo de desconto encontrado: R$ ${value}`);
            return value;
          }
        }
      } catch (error) {
        // Continuar
      }
    }

    return null;
  }

  /**
   * Tenta identificar a plataforma do cupom (melhorado com detecção de links)
   * IMPORTANTE: Retorna apenas plataformas válidas no banco de dados:
   * 'shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general'
   */
  extractPlatform(text) {
    if (!text) return null;

    const textLower = text.toLowerCase();

    // Plataformas suportadas no banco de dados
    const validPlatforms = {
      'mercadolivre': [
        'mercado livre', 'meli', 'mercadolivre', 'mercadolivre.com',
        'mercadolivre.com.br', 'mercadolivre.com/sec'
      ],
      'shopee': [
        'shopee', 'shopee.com', 'shopee.com.br', 's.shopee.com.br'
      ],
      'amazon': [
        'amazon', 'amazon.com', 'amazon.com.br', 'amzn.to', 'amzlink.to'
      ],
      'aliexpress': [
        'aliexpress', 'ali express', 'aliexpress.com'
      ]
    };

    // Plataformas não suportadas que serão mapeadas para 'general'
    const unsupportedPlatforms = {
      'magazine luiza': [
        'magazine', 'magalu', 'magazine luiza', 'magazineluiza.com.br'
      ],
      'americanas': [
        'americanas', 'americanas.com.br'
      ],
      'submarino': [
        'submarino', 'submarino.com.br'
      ],
      'casas bahia': [
        'casas bahia', 'casasbahia', 'casasbahia.com.br'
      ]
    };

    // Verificar por palavras-chave de plataformas válidas
    for (const [platform, keywords] of Object.entries(validPlatforms)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        logger.debug(`   Plataforma identificada por palavra-chave: ${platform}`);
        return platform;
      }
    }

    // Verificar por URLs/links de plataformas válidas
    const urlPatterns = {
      'mercadolivre': /mercadolivre\.com/i,
      'shopee': /shopee\.com/i,
      'amazon': /(amzn\.to|amzlink\.to|amazon\.com)/i,
      'aliexpress': /aliexpress\.com/i
    };

    for (const [platform, pattern] of Object.entries(urlPatterns)) {
      if (pattern.test(text)) {
        logger.debug(`   Plataforma identificada por URL: ${platform}`);
        return platform;
      }
    }

    // Verificar plataformas não suportadas e retornar 'general'
    for (const [platform, keywords] of Object.entries(unsupportedPlatforms)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        logger.debug(`   Plataforma ${platform} detectada, mas não é suportada. Usando 'general'.`);
        return 'general';
      }
    }

    // Verificar URLs de plataformas não suportadas
    const unsupportedUrlPatterns = {
      'magazine luiza': /magazineluiza\.com/i,
      'americanas': /americanas\.com/i,
      'submarino': /submarino\.com/i,
      'casas bahia': /casasbahia\.com/i
    };

    for (const [platform, pattern] of Object.entries(unsupportedUrlPatterns)) {
      if (pattern.test(text)) {
        logger.debug(`   Plataforma ${platform} detectada por URL, mas não é suportada. Usando 'general'.`);
        return 'general';
      }
    }

    return null;
  }

  /**
   * Extrai data de validade do texto
   */
  extractValidUntil(text) {
    if (!text) return null;

    const textLower = text.toLowerCase();

    // Padrões para datas de validade
    const patterns = [
      // "válido até 31/12/2024"
      /válido\s+até\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      // "válido até 31-12-2024"
      /válido\s+até\s+(\d{1,2})-(\d{1,2})-(\d{4})/i,
      // "expira em 31/12/2024"
      /expira\s+em\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      // "válido por X dias"
      /válido\s+por\s+(\d+)\s+dias?/i,
      // "válido até dia X"
      /válido\s+até\s+dia\s+(\d{1,2})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Se encontrou padrão de dias
          if (pattern.toString().includes('dias')) {
            const days = parseInt(match[1]);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);
            return expiryDate.toISOString();
          }

          // Se encontrou data completa
          if (match.length >= 4) {
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // Mês é 0-indexed
            const year = parseInt(match[3]);
            const expiryDate = new Date(year, month, day);
            // Se a data é válida e no futuro
            if (!isNaN(expiryDate.getTime()) && expiryDate > new Date()) {
              return expiryDate.toISOString();
            }
          }
        } catch (error) {
          // Continuar tentando outros padrões
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Calcula data de validade padrão (7 dias a partir de agora)
   */
  calculateDefaultExpiry() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 dias
    return expiryDate.toISOString();
  }

  /**
   * Extrai múltiplos cupons de uma mensagem
   * Retorna array de cupons encontrados
   */
  extractMultipleCoupons(text, messageId, channelUsername) {
    if (!text || text.trim().length < 5) {
      return [];
    }

    const coupons = [];

    // Primeiro, buscar todos os códigos possíveis da mensagem
    const allCodes = this.extractAllCouponCodes(text);

    if (allCodes.length === 0) {
      logger.debug(`   ⚠️ Nenhum código encontrado na mensagem`);
      return [];
    }

    logger.debug(`   📋 Encontrados ${allCodes.length} código(s) possível(is): ${allCodes.join(', ')}`);

    // Dividir mensagem por linhas ou padrões de separação
    const lines = text.split(/\n+/).filter(line => line.trim().length > 0);

    // Tentar extrair cupom de cada linha que contenha código
    for (const line of lines) {
      // Verificar se a linha contém algum dos códigos encontrados
      const hasCodeInLine = allCodes.some(code => {
        // Verificar se o código está na linha (pode estar em backticks ou não)
        return line.includes(`\`${code}\``) || line.includes(code);
      });

      if (hasCodeInLine) {
        const coupon = this.extractCouponInfo(line, messageId, channelUsername);
        if (coupon) {
          // Verificar se já não adicionamos este cupom (evitar duplicatas)
          const isDuplicate = coupons.some(c => c.code === coupon.code);
          if (!isDuplicate) {
            coupons.push(coupon);
            logger.debug(`   ✅ Cupom extraído da linha: ${coupon.code}`);
          }
        }
      }
    }

    // Se não encontrou em linhas separadas, tentar extrair da mensagem completa
    if (coupons.length === 0) {
      const coupon = this.extractCouponInfo(text, messageId, channelUsername);
      if (coupon) {
        coupons.push(coupon);
        logger.debug(`   ✅ Cupom extraído da mensagem completa: ${coupon.code}`);
      }
    }

    // Se ainda não encontrou ou encontrou menos cupons que códigos, tentar extrair múltiplos códigos da mesma mensagem
    // IMPORTANTE: Se há múltiplos códigos, garantir que todos sejam extraídos
    if (allCodes.length > coupons.length) {
      logger.debug(`   🔍 Encontrados ${allCodes.length} código(s) mas apenas ${coupons.length} cupom(ns) extraído(s). Tentando extrair os restantes...`);

      for (const code of allCodes) {
        // Verificar se já extraímos este código
        const alreadyExtracted = coupons.some(c => c.code === code);
        if (alreadyExtracted) {
          continue; // Pular se já foi extraído
        }

        // Criar contexto ao redor do código
        const codePattern = new RegExp(`\`${code}\``);
        let codeMatch = text.match(codePattern);

        // Se não encontrou em backticks, procurar sem backticks
        if (!codeMatch) {
          codeMatch = text.match(new RegExp(`\\b${code}\\b`));
        }

        if (codeMatch && codeMatch.index !== undefined) {
          // Aumentar contexto para capturar mais informações (300 caracteres antes e depois)
          const start = Math.max(0, codeMatch.index - 300);
          const end = Math.min(text.length, codeMatch.index + codeMatch[0].length + 300);
          const context = text.substring(start, end);

          // Tentar extrair cupom do contexto
          const coupon = this.extractCouponInfo(context, messageId, channelUsername);
          if (coupon && coupon.code === code) {
            // Verificar se já não adicionamos este cupom
            const isDuplicate = coupons.some(c => c.code === coupon.code);
            if (!isDuplicate) {
              coupons.push(coupon);
              logger.debug(`   ✅ Cupom extraído do contexto: ${coupon.code}`);
            }
          } else {
            // Se não conseguiu extrair informações completas, criar cupom básico com o código
            logger.debug(`   ⚠️ Não foi possível extrair informações completas para código ${code}, criando cupom básico...`);
            const basicCoupon = this.extractCouponInfo(text, messageId, channelUsername);
            if (basicCoupon && basicCoupon.code === code) {
              const isDuplicate = coupons.some(c => c.code === basicCoupon.code);
              if (!isDuplicate) {
                coupons.push(basicCoupon);
                logger.debug(`   ✅ Cupom básico criado: ${basicCoupon.code}`);
              }
            } else {
              // Criar cupom mínimo com o código encontrado
              const minCoupon = {
                code: code,
                platform: this.extractPlatform(text) || 'general',
                discount_type: 'percentage',
                discount_value: 10.0, // Valor padrão
                min_purchase: this.extractMinPurchase(text) || 0,
                max_discount_value: this.extractMaxDiscount(text) || null,
                valid_from: new Date().toISOString(),
                valid_until: this.extractValidUntil(text) || this.calculateDefaultExpiry(),
                title: `Cupom ${code}`,
                description: text.substring(0, 500),
                source: 'telegram',
                origem: 'telegram',
                channel_origin: channelUsername,
                message_id: messageId,
                is_pending_approval: true,
                capture_source: 'telegram',
                auto_captured: true
              };

              // Aplicar desconto se encontrado
              const discount = this.extractDiscount(text);
              if (discount && discount.value) {
                minCoupon.discount_type = discount.type;
                minCoupon.discount_value = discount.value;
              }

              const isDuplicate = coupons.some(c => c.code === minCoupon.code);
              if (!isDuplicate) {
                coupons.push(minCoupon);
                logger.debug(`   ✅ Cupom mínimo criado para código: ${code}`);
              }
            }
          }
        }
      }
    }

    logger.info(`   📊 Total de ${coupons.length} cupom(ns) extraído(s) da mensagem`);
    return coupons;
  }

  /**
   * Extrai todos os códigos de cupom possíveis de um texto
   * PRIORIDADE: Códigos dentro de backticks são mais confiáveis
   */
  extractAllCouponCodes(text) {
    if (!text) return [];

    const codes = new Set();
    const invalidCodes = new Set([
      'HTTP', 'HTTPS', 'WWW', 'COM', 'BR', 'ORG', 'NET', 'HTML', 'JPEG', 'PNG',
      'AMZN', 'AMAZON', 'SHOPEE', 'MELI', 'MERCADO', 'LIVRE', 'ALIEXPRESS',
      'MAGAZINE', 'LUIZA', 'AMERICANAS', 'SUBMARINO', 'CASAS', 'BAHIA'
    ]);

    // PRIORIDADE 1: Buscar códigos dentro de backticks `codigo`
    const backtickMatches = [...text.matchAll(this.COUPON_CODE_IN_BACKTICKS)];
    for (const match of backtickMatches) {
      const code = match[1];
      if (!invalidCodes.has(code) && code.length >= 4) {
        codes.add(code);
      }
    }

    // Se encontrou códigos em backticks, retornar apenas esses (mais confiáveis)
    if (codes.size > 0) {
      return Array.from(codes);
    }

    // PRIORIDADE 2: Buscar códigos após ":" ou palavras-chave
    const colonPatterns = [
      /[:：]\s*([A-Z0-9]{4,15})\b/g,
      /código[:\s]+([A-Z0-9]{4,15})\b/gi,
      /code[:\s]+([A-Z0-9]{4,15})\b/gi,
      /cupom[:\s]+([A-Z0-9]{4,15})\b/gi
    ];

    for (const pattern of colonPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const code = match[1];
        if (!invalidCodes.has(code) && code.length >= 4) {
          codes.add(code);
        }
      }
    }

    // PRIORIDADE 3: Buscar códigos após emoji
    const emojiPatterns = [
      /🎟[️]?\s*([A-Z0-9]{4,15})\b/g,
      /🎫[️]?\s*([A-Z0-9]{4,15})\b/g,
      /💰[️]?\s*([A-Z0-9]{4,15})\b/g,
      /💳[️]?\s*([A-Z0-9]{4,15})\b/g
    ];

    for (const pattern of emojiPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const code = match[1];
        if (!invalidCodes.has(code) && code.length >= 4) {
          codes.add(code);
        }
      }
    }

    return Array.from(codes);
  }

  /**
   * Extrai todas as informações de cupom de uma mensagem
   */
  extractCouponInfo(text, messageId, channelUsername) {
    if (!text || text.trim().length < 5) {
      logger.debug(`   ⚠️ Texto muito curto ou vazio, ignorando mensagem`);
      return null;
    }

    // Verificar se tem palavras-chave de cupom (recomendado, mas não obrigatório)
    const hasKeywords = this.hasCouponKeywords(text);
    if (!hasKeywords) {
      logger.debug(`   ⚠️ Texto não contém palavras-chave de cupom, mas continuando busca...`);
    }

    // Extrair código (tenta múltiplos métodos)
    const code = this.extractCouponCode(text);
    if (!code) {
      logger.debug(`   ⚠️ Não foi possível extrair código de cupom do texto`);
      return null;
    }

    logger.debug(`   ✅ Código de cupom encontrado: ${code}`);

    // Extrair desconto
    let discount = this.extractDiscount(text);
    if (!discount.value) {
      // Se não encontrou desconto, usar valor padrão
      discount = { type: 'percentage', value: 10.0 };
      logger.debug(`   Desconto não encontrado, usando valor padrão: 10%`);
    } else {
      logger.debug(`   Desconto encontrado: ${discount.value} (tipo: ${discount.type})`);
    }

    // Extrair compra mínima
    const minPurchase = this.extractMinPurchase(text);
    if (minPurchase) {
      logger.debug(`   Compra mínima encontrada: R$ ${minPurchase}`);
    }

    // Extrair plataforma
    let platform = this.extractPlatform(text);
    if (!platform) {
      platform = 'general';
      logger.debug(`   Plataforma não identificada, usando 'general'`);
    } else {
      logger.debug(`   Plataforma identificada: ${platform}`);
    }

    // Extrair data de validade
    let validUntil = this.extractValidUntil(text);
    if (!validUntil) {
      // Se não encontrou data, usar padrão (7 dias)
      validUntil = this.calculateDefaultExpiry();
      logger.debug(`   Data de validade não encontrada, usando padrão: 7 dias`);
    } else {
      logger.debug(`   Data de validade encontrada: ${validUntil}`);
    }

    // Data de início (hoje)
    const validFrom = new Date().toISOString();

    // Extrair limite máximo de desconto
    const maxDiscount = this.extractMaxDiscount(text);
    if (maxDiscount) {
      logger.debug(`   Limite máximo de desconto: R$ ${maxDiscount}`);
    }

    // Preparar dados do cupom
    const couponData = {
      code: code,
      platform: platform,
      discount_type: discount.type || 'percentage',
      discount_value: discount.value || 0,
      min_purchase: minPurchase || 0,
      max_discount_value: maxDiscount || null, // Limite máximo de desconto
      valid_from: validFrom,
      valid_until: validUntil, // OBRIGATÓRIO - sempre preenchido
      title: `Cupom ${code} - ${platform}`,
      description: text.substring(0, 500), // Limitar descrição
      source: 'telegram',
      origem: 'telegram',
      channel_origin: channelUsername,
      message_id: messageId,
      is_pending_approval: true, // Sempre pendente de aprovação inicialmente
      capture_source: 'telegram',
      auto_captured: true
    };

    logger.info(`✅ Cupom extraído: ${code} - ${discount.value}${discount.type === 'percentage' ? '%' : ' R$'} (${platform})`);

    return couponData;
  }
}

export default new CouponExtractor();






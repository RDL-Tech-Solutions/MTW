/**
 * Extrator de cupons de mensagens do Telegram
 * Versão JavaScript do coupon_extractor.py
 */
import logger from '../../config/logger.js';

class CouponExtractor {
  constructor() {
    // Palavras-chave que indicam cupom
    this.COUPON_KEYWORDS = [
      'cupom', 'cupão', 'coupon', 'desconto', 'promo', 'promoção',
      'off', 'cashback', 'cash back', 'voucher', 'código'
    ];

    // Regex para código de cupom (4-15 caracteres alfanuméricos)
    this.COUPON_CODE_PATTERN = /\b([A-Z0-9]{4,15})\b/g;

    // Regex para desconto percentual
    this.DISCOUNT_PERCENT_PATTERN = /(\d+)\s*%|(\d+)\s*por\s*cento|(\d+)\s*percent/i;

    // Regex para desconto em reais
    this.DISCOUNT_VALUE_PATTERN = /R\$\s*(\d+(?:[.,]\d{2})?)/;

    // Regex para OFF
    this.OFF_PATTERN = /(\d+)\s*(?:%|por\s*cento)?\s*(?:OFF|off|de\s*desconto)/i;
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
   * Extrai código de cupom do texto
   */
  extractCouponCode(text) {
    if (!text) return null;

    const matches = [...text.matchAll(this.COUPON_CODE_PATTERN)];
    
    // Filtrar códigos muito comuns que não são cupons
    const invalidCodes = new Set(['HTTP', 'HTTPS', 'WWW', 'COM', 'BR', 'ORG', 'NET']);
    
    for (const match of matches) {
      const code = match[1];
      if (!invalidCodes.has(code) && code.length >= 4) {
        // Verificar se está próximo de palavras-chave de cupom
        const textLower = text.toLowerCase();
        const codeLower = code.toLowerCase();
        const matchIndex = textLower.indexOf(codeLower);
        
        if (matchIndex !== -1) {
          // Verificar contexto ao redor (50 caracteres antes e depois)
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(text.length, matchIndex + code.length + 50);
          const context = textLower.substring(start, end);
          
          // Se há palavras-chave próximas, é provavelmente um cupom
          if (this.COUPON_KEYWORDS.some(keyword => context.includes(keyword))) {
            return code;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extrai valor de desconto do texto
   */
  extractDiscount(text) {
    const result = {
      type: null,
      value: null
    };

    if (!text) return result;

    // Tentar encontrar desconto percentual
    const percentMatch = text.match(this.DISCOUNT_PERCENT_PATTERN);
    if (percentMatch) {
      const value = percentMatch[1] || percentMatch[2] || percentMatch[3];
      if (value) {
        try {
          result.type = 'percentage';
          result.value = parseFloat(value);
          return result;
        } catch (error) {
          // Continuar
        }
      }
    }

    // Tentar encontrar OFF
    const offMatch = text.match(this.OFF_PATTERN);
    if (offMatch) {
      try {
        result.type = 'percentage';
        result.value = parseFloat(offMatch[1]);
        return result;
      } catch (error) {
        // Continuar
      }
    }

    // Tentar encontrar desconto em reais
    const valueMatch = text.match(this.DISCOUNT_VALUE_PATTERN);
    if (valueMatch) {
      try {
        const valueStr = valueMatch[1].replace(',', '.');
        result.type = 'fixed';
        result.value = parseFloat(valueStr);
        return result;
      } catch (error) {
        // Continuar
      }
    }

    return result;
  }

  /**
   * Extrai compra mínima do texto
   */
  extractMinPurchase(text) {
    if (!text) return null;

    const patterns = [
      /compra\s*mínima[:\s]*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      /válido\s*para\s*compras\s*(?:acima\s*de|de|a\s*partir\s*de)[:\s]*R\$\s*(\d+(?:[.,]\d{2})?)/i,
      /mínimo\s*de\s*R\$\s*(\d+(?:[.,]\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const valueStr = match[1].replace(',', '.');
          return parseFloat(valueStr);
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Tenta identificar a plataforma do cupom
   */
  extractPlatform(text) {
    if (!text) return null;

    const textLower = text.toLowerCase();

    const platforms = {
      'mercadolivre': ['mercado livre', 'meli', 'mercadolivre'],
      'shopee': ['shopee'],
      'amazon': ['amazon'],
      'aliexpress': ['aliexpress', 'ali express'],
      'magazine luiza': ['magazine', 'magalu', 'magazine luiza'],
      'americanas': ['americanas'],
      'submarino': ['submarino'],
      'casas bahia': ['casas bahia', 'casasbahia'],
    };

    for (const [platform, keywords] of Object.entries(platforms)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        return platform;
      }
    }

    return null;
  }

  /**
   * Extrai todas as informações de cupom de uma mensagem
   */
  extractCouponInfo(text, messageId, channelUsername) {
    if (!text || text.trim().length < 10) {
      return null;
    }

    // Verificar se tem palavras-chave de cupom
    if (!this.hasCouponKeywords(text)) {
      return null;
    }

    // Extrair código
    const code = this.extractCouponCode(text);
    if (!code) {
      return null;
    }

    // Extrair desconto
    let discount = this.extractDiscount(text);
    if (!discount.value) {
      // Se não encontrou desconto, usar valor padrão
      discount = { type: 'percentage', value: 10.0 };
    }

    // Extrair compra mínima
    const minPurchase = this.extractMinPurchase(text);

    // Extrair plataforma
    let platform = this.extractPlatform(text);
    if (!platform) {
      platform = 'general';
    }

    // Preparar dados do cupom
    const couponData = {
      code: code,
      platform: platform,
      discount_type: discount.type,
      discount_value: discount.value,
      min_purchase: minPurchase || 0,
      title: `Cupom ${code}`,
      description: text.substring(0, 500), // Limitar descrição
      source: 'telegram',
      channel_origin: channelUsername,
      message_id: messageId,
      is_pending_approval: true, // Sempre pendente de aprovação inicialmente
      capture_source: 'telegram'
    };

    logger.info(`✅ Cupom extraído: ${code} - ${discount.value}${discount.type === 'percentage' ? '%' : ' R$'}`);

    return couponData;
  }
}

export default new CouponExtractor();




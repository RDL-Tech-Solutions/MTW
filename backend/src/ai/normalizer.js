/**
 * Normalizador de dados extraídos pela IA
 * Padroniza formatos, limpa emojis, garante tipos corretos
 */
import logger from '../config/logger.js';

class Normalizer {
  /**
   * Normalizar dados extraídos pela IA
   * @param {Object} extraction - Dados brutos da IA
   * @returns {Object} - Dados normalizados
   */
  normalize(extraction) {
    try {
      const normalized = {
        platform: this.normalizePlatform(extraction.platform),
        code: this.normalizeCode(extraction.coupon_code),
        discount_type: null,
        discount_value: null,
        min_purchase: this.normalizeMinPurchase(extraction.min_purchase),
        max_discount_value: null,
        valid_from: new Date().toISOString(),
        valid_until: this.normalizeExpirationDate(extraction.expiration_date),
        usage_limit: this.normalizeUsageLimit(extraction.usage_limit),
        is_valid_coupon: extraction.is_valid_coupon === true,
        confidence: extraction.confidence || 0.0
      };

      // Normalizar desconto
      const discount = this.normalizeDiscount(extraction.discount);
      if (discount) {
        normalized.discount_type = discount.type;
        normalized.discount_value = discount.value;
      }

      // Garantir que campos ausentes sejam null
      Object.keys(normalized).forEach(key => {
        if (normalized[key] === undefined) {
          normalized[key] = null;
        }
      });

      logger.debug(`✅ Dados normalizados: ${normalized.code} - ${normalized.platform}`);

      return normalized;

    } catch (error) {
      logger.error(`Erro ao normalizar dados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalizar plataforma
   */
  normalizePlatform(platform) {
    if (!platform || typeof platform !== 'string') {
      return 'general';
    }

    const platformLower = platform.toLowerCase().trim();
    
    const platformMap = {
      'mercadolivre': 'mercadolivre',
      'mercado livre': 'mercadolivre',
      'meli': 'mercadolivre',
      'shopee': 'shopee',
      'amazon': 'amazon',
      'aliexpress': 'aliexpress',
      'ali express': 'aliexpress',
      'outro': 'general',
      'desconhecido': 'general',
      'general': 'general'
    };

    return platformMap[platformLower] || 'general';
  }

  /**
   * Normalizar código de cupom
   */
  normalizeCode(code) {
    if (!code || typeof code !== 'string') {
      return null;
    }

    // Remover emojis e caracteres especiais
    let normalized = code
      .replace(/[🎟🎫💰💳]/g, '') // Remover emojis comuns
      .replace(/[`'"]/g, '') // Remover backticks e aspas
      .trim()
      .toUpperCase();

    // Remover espaços
    normalized = normalized.replace(/\s+/g, '');

    // Validar que é alfanumérico
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      logger.warn(`⚠️ Código contém caracteres inválidos: ${code} → ${normalized}`);
    }

    return normalized.length > 0 ? normalized : null;
  }

  /**
   * Normalizar desconto
   */
  normalizeDiscount(discount) {
    if (!discount || typeof discount !== 'string') {
      return null;
    }

    // Remover emojis e espaços extras
    const cleaned = discount
      .replace(/[🎟🎫💰💳]/g, '')
      .trim();

    // Tentar extrair percentual
    const percentMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentMatch) {
      const value = parseFloat(percentMatch[1].replace(',', '.'));
      if (value > 0 && value <= 100) {
        return {
          type: 'percentage',
          value: value
        };
      }
    }

    // Tentar extrair valor fixo em reais
    const fixedMatch = cleaned.match(/R\$\s*(\d+(?:[.,]\d+)?)/i);
    if (fixedMatch) {
      const value = parseFloat(fixedMatch[1].replace(',', '.').replace(/\./g, ''));
      if (value > 0) {
        return {
          type: 'fixed',
          value: value
        };
      }
    }

    // Tentar apenas número (assumir percentual se < 100, fixo se >= 100)
    const numberMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1].replace(',', '.'));
      if (value > 0) {
        if (value <= 100) {
          return {
            type: 'percentage',
            value: value
          };
        } else {
          return {
            type: 'fixed',
            value: value
          };
        }
      }
    }

    logger.warn(`⚠️ Não foi possível normalizar desconto: ${discount}`);
    return null;
  }

  /**
   * Normalizar compra mínima
   */
  normalizeMinPurchase(minPurchase) {
    if (!minPurchase || typeof minPurchase !== 'string') {
      return 0;
    }

    // Remover emojis e espaços
    const cleaned = minPurchase
      .replace(/[🎟🎫💰💳]/g, '')
      .trim();

    // Tentar extrair valor em reais
    const match = cleaned.match(/R\$\s*(\d+(?:[.,]\d+)?)/i);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.').replace(/\./g, ''));
      if (value > 0) {
        return value;
      }
    }

    // Tentar apenas número
    const numberMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (numberMatch) {
      const value = parseFloat(numberMatch[1].replace(',', '.').replace(/\./g, ''));
      if (value > 0) {
        return value;
      }
    }

    return 0;
  }

  /**
   * Normalizar data de expiração
   */
  normalizeExpirationDate(expirationDate) {
    if (!expirationDate || typeof expirationDate !== 'string') {
      // Se não tem data, usar padrão de 7 dias
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      return defaultDate.toISOString();
    }

    const cleaned = expirationDate.trim();

    // Tentar parsear ISO date
    try {
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        // Se a data é no passado, usar padrão de 7 dias
        if (date < new Date()) {
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() + 7);
          return defaultDate.toISOString();
        }
        return date.toISOString();
      }
    } catch (error) {
      // Continuar tentando outros formatos
    }

    // Tentar formatos brasileiros (DD/MM/YYYY)
    const brDateMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brDateMatch) {
      const day = parseInt(brDateMatch[1]);
      const month = parseInt(brDateMatch[2]) - 1; // Mês é 0-indexed
      const year = parseInt(brDateMatch[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date >= new Date()) {
        return date.toISOString();
      }
    }

    // Se não conseguiu parsear, usar padrão de 7 dias
    logger.warn(`⚠️ Não foi possível parsear data de expiração: ${expirationDate}`);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString();
  }

  /**
   * Normalizar limite de uso
   */
  normalizeUsageLimit(usageLimit) {
    if (!usageLimit || typeof usageLimit !== 'string') {
      return null;
    }

    // Remover emojis e espaços
    const cleaned = usageLimit
      .replace(/[🎟🎫💰💳]/g, '')
      .trim();

    // Tentar extrair número
    const match = cleaned.match(/(\d+)/);
    if (match) {
      const value = parseInt(match[1]);
      if (value > 0) {
        return value;
      }
    }

    return null;
  }
}

export default new Normalizer();

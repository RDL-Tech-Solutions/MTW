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
        confidence: extraction.confidence || 0.0,
        confidence_score: extraction.confidence || 0.0 // Alias para compatibilidade
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
      .replace(/[🎟🎫💰💳🔑]/g, '') // Remover emojis comuns
      .replace(/[`'"]/g, '') // Remover backticks e aspas
      .replace(/[:\-–—]/g, '') // Remover dois pontos e traços
      .trim()
      .toUpperCase();

    // Remover espaços
    normalized = normalized.replace(/\s+/g, '');

    // Validar comprimento (4-15 caracteres)
    if (normalized.length < 4 || normalized.length > 15) {
      logger.warn(`⚠️ Código com comprimento inválido: ${code} → ${normalized} (${normalized.length} chars)`);
      return null;
    }

    // Validar que é alfanumérico
    if (!/^[A-Z0-9]+$/.test(normalized)) {
      logger.warn(`⚠️ Código contém caracteres inválidos: ${code} → ${normalized}`);
      // Tentar limpar caracteres inválidos
      normalized = normalized.replace(/[^A-Z0-9]/g, '');
      if (normalized.length < 4) {
        return null;
      }
    }

    // Filtrar códigos muito comuns que não são cupons
    const invalidCodes = [
      'HTTP', 'HTTPS', 'WWW', 'COM', 'BR', 'ORG', 'NET', 'HTML', 'JPEG', 'PNG',
      'AMZN', 'AMAZON', 'SHOPEE', 'MELI', 'MERCADO', 'LIVRE', 'ALIEXPRESS',
      'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'YOUTUBE', 'TELEGRAM'
    ];
    
    if (invalidCodes.includes(normalized)) {
      logger.warn(`⚠️ Código é uma palavra comum, não um cupom: ${normalized}`);
      return null;
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
    let cleaned = discount
      .replace(/[🎟🎫💰💳]/g, '')
      .trim();

    // Remover palavras comuns que não afetam o valor
    cleaned = cleaned.replace(/\b(off|de\s*desconto|por\s*cento|percent)\b/gi, '').trim();

    // Tentar extrair percentual (prioridade)
    const percentMatch = cleaned.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentMatch) {
      const value = parseFloat(percentMatch[1].replace(',', '.'));
      if (value > 0 && value <= 100) {
        logger.debug(`   ✅ Desconto percentual normalizado: ${value}%`);
        return {
          type: 'percentage',
          value: value
        };
      }
    }

    // Tentar extrair valor fixo em reais
    const fixedMatch = cleaned.match(/R\$\s*(\d+(?:[.,]\d+)?)/i);
    if (fixedMatch) {
      // Remover pontos de milhar e converter vírgula para ponto
      const valueStr = fixedMatch[1].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      if (value > 0 && value <= 10000) { // Limite razoável de R$ 10.000
        logger.debug(`   ✅ Desconto fixo normalizado: R$ ${value}`);
        return {
          type: 'fixed',
          value: value
        };
      }
    }

    // Tentar apenas número (assumir percentual se < 100, fixo se >= 100)
    const numberMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (numberMatch) {
      const valueStr = numberMatch[1].replace(',', '.');
      const value = parseFloat(valueStr);
      if (value > 0) {
        if (value <= 100) {
          logger.debug(`   ✅ Desconto percentual inferido: ${value}%`);
          return {
            type: 'percentage',
            value: value
          };
        } else if (value <= 10000) {
          logger.debug(`   ✅ Desconto fixo inferido: R$ ${value}`);
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
    let cleaned = minPurchase
      .replace(/[🎟🎫💰💳]/g, '')
      .trim();

    // Remover palavras comuns
    cleaned = cleaned.replace(/\b(em|acima\s*de|acima|a\s*partir\s*de|mínimo|min|compra\s*mínima)\b/gi, '').trim();

    // Tentar extrair valor em reais
    const match = cleaned.match(/R\$\s*(\d+(?:[.,]\d+)?)/i);
    if (match) {
      // Remover pontos de milhar e converter vírgula para ponto
      const valueStr = match[1].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      if (value > 0 && value <= 100000) { // Limite razoável de R$ 100.000
        logger.debug(`   ✅ Compra mínima normalizada: R$ ${value}`);
        return value;
      }
    }

    // Tentar apenas número
    const numberMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
    if (numberMatch) {
      // Remover pontos de milhar e converter vírgula para ponto
      const valueStr = numberMatch[1].replace(/\./g, '').replace(',', '.');
      const value = parseFloat(valueStr);
      if (value > 0 && value <= 100000) {
        logger.debug(`   ✅ Compra mínima normalizada (sem R$): R$ ${value}`);
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








/**
 * Validador de códigos de cupom
 * Filtra códigos inválidos como PADR, SORTEIO, etc.
 */

class CouponValidator {
  /**
   * Lista de códigos inválidos conhecidos
   */
  static INVALID_CODES = [
    'PADR',      // Padrão
    'SORTEIO',   // Sorteio
    'SORTE',     // Sorte
    'TESTE',     // Teste
    'TEST',      // Test
    'EXEMPLO',   // Exemplo
    'EXAMPLE',   // Example
    'DEMO',      // Demo
    'INVALID',   // Inválido
    'NULL',      // Null
    'NONE',      // None
    'N/A',       // Not Available
    'NA',        // Not Available
    'TBD',       // To Be Determined
    'XXX',       // Placeholder
    'ABC',       // Placeholder genérico
    '123',       // Placeholder numérico
    '000',       // Placeholder zero
    'AAAA',      // Placeholder repetido
    'ZZZZ',      // Placeholder final
  ];

  /**
   * Padrões de códigos inválidos (regex)
   */
  static INVALID_PATTERNS = [
    /^PADR/i,           // Começa com PADR
    /^SORTE/i,          // Começa com SORTE
    /^TEST/i,           // Começa com TEST
    /^DEMO/i,           // Começa com DEMO
    /^EXEMPLO/i,        // Começa com EXEMPLO
    /^EXAMPLE/i,        // Começa com EXAMPLE
    /^NULL/i,           // Começa com NULL
    /^NONE/i,           // Começa com NONE
    /^N\/A/i,           // Começa com N/A
    /^XXX/i,            // Começa com XXX
    /^[A-Z]{1,3}$/i,    // Apenas 1-3 letras (muito curto)
    /^[0-9]{1,3}$/i,    // Apenas 1-3 números (muito curto)
    /^[A-Z]{4,}$/i,     // Apenas letras repetidas (AAAA, BBBB, etc)
    /^[0-9]{4,}$/i,     // Apenas números repetidos (0000, 1111, etc)
    /^[A-Z]+[0-9]+$/i,  // Padrão genérico tipo ABC123 (sem contexto)
  ];

  /**
   * Validar código de cupom
   * @param {string} code - Código do cupom
   * @returns {Object} - { valid: boolean, reason: string }
   */
  static validateCode(code) {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        reason: 'Código vazio ou inválido'
      };
    }

    const upperCode = code.toUpperCase().trim();

    // Verificar se está vazio após trim
    if (upperCode.length === 0) {
      return {
        valid: false,
        reason: 'Código vazio'
      };
    }

    // Verificar se é muito curto (menos de 4 caracteres, exceto códigos numéricos válidos)
    if (upperCode.length < 4 && !/^[0-9]{4,}$/.test(upperCode)) {
      return {
        valid: false,
        reason: 'Código muito curto'
      };
    }

    // Verificar se está na lista de códigos inválidos
    if (this.INVALID_CODES.includes(upperCode)) {
      return {
        valid: false,
        reason: `Código inválido conhecido: ${upperCode}`
      };
    }

    // Verificar padrões inválidos
    for (const pattern of this.INVALID_PATTERNS) {
      if (pattern.test(upperCode)) {
        return {
          valid: false,
          reason: `Código corresponde a padrão inválido: ${pattern}`
        };
      }
    }

    // Verificar se contém apenas caracteres alfanuméricos e hífen/underscore
    if (!/^[A-Z0-9\-_]+$/i.test(upperCode)) {
      return {
        valid: false,
        reason: 'Código contém caracteres inválidos'
      };
    }

    // Verificar se é um código de fallback genérico (MELI-XXXX, DEAL-XXX, etc)
    if (/^(MELI|DEAL|CAMP|PROMO|PROD|ALI|AMAZON|SHOPEE)-\d+$/i.test(upperCode)) {
      // Códigos de fallback são aceitos, mas vamos logar
      return {
        valid: true,
        reason: 'Código de fallback (aceito)',
        isFallback: true
      };
    }

    return {
      valid: true,
      reason: 'Código válido'
    };
  }

  /**
   * Validar cupom completo
   * @param {Object} coupon - Objeto do cupom
   * @returns {Object} - { valid: boolean, reason: string }
   */
  static validateCoupon(coupon) {
    if (!coupon) {
      return {
        valid: false,
        reason: 'Cupom vazio'
      };
    }

    // Validar código
    const codeValidation = this.validateCode(coupon.code);
    if (!codeValidation.valid) {
      return {
        valid: false,
        reason: `Código inválido: ${codeValidation.reason}`
      };
    }

    // Validar valor de desconto
    if (!coupon.discount_value || coupon.discount_value <= 0) {
      return {
        valid: false,
        reason: 'Valor de desconto inválido ou zero'
      };
    }

    // Validar tipo de desconto
    if (!coupon.discount_type || !['percentage', 'fixed'].includes(coupon.discount_type)) {
      return {
        valid: false,
        reason: 'Tipo de desconto inválido'
      };
    }

    // Validar data de expiração
    if (coupon.valid_until) {
      const expiryDate = new Date(coupon.valid_until);
      if (isNaN(expiryDate.getTime())) {
        return {
          valid: false,
          reason: 'Data de expiração inválida'
        };
      }
      if (expiryDate < new Date()) {
        return {
          valid: false,
          reason: 'Cupom já expirado'
        };
      }
    }

    return {
      valid: true,
      reason: 'Cupom válido'
    };
  }

  /**
   * Filtrar cupons inválidos de uma lista
   * @param {Array} coupons - Lista de cupons
   * @returns {Array} - Lista de cupons válidos
   */
  static filterValidCoupons(coupons) {
    if (!Array.isArray(coupons)) {
      return [];
    }

    const validCoupons = [];
    const invalidCoupons = [];

    for (const coupon of coupons) {
      const validation = this.validateCoupon(coupon);
      if (validation.valid) {
        validCoupons.push(coupon);
      } else {
        invalidCoupons.push({
          code: coupon.code,
          reason: validation.reason
        });
      }
    }

    if (invalidCoupons.length > 0) {
      const logger = require('../config/logger.js').default;
      logger.warn(`⚠️ ${invalidCoupons.length} cupons inválidos filtrados:`, invalidCoupons);
    }

    return validCoupons;
  }
}

export default CouponValidator;



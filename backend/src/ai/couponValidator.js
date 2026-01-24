/**
 * Validador Avançado de Cupons
 * Verifica padrões suspeitos e valida formato
 */
import logger from '../config/logger.js';

class CouponValidator {
    /**
     * Validar código do cupom
     * @param {string} code - Código do cupom
     * @returns {Object} - Resultado da validação
     */
    validateCode(code) {
        const issues = [];

        if (!code || typeof code !== 'string') {
            return {
                valid: false,
                issues: ['Código ausente ou inválido'],
                confidence: 0
            };
        }

        const trimmedCode = code.trim();

        // Código muito curto
        if (trimmedCode.length < 4) {
            issues.push('Código muito curto');
        }

        // Código muito longo (provavelmente não é cupom)
        if (trimmedCode.length > 30) {
            issues.push('Código suspeito (muito longo)');
        }

        // Padrões suspeitos
        const suspiciousPatterns = [
            { pattern: /^(TESTE|TEST|EXAMPLE|DEMO|SAMPLE)/i, message: 'Código de teste' },
            { pattern: /^(XXXX|AAAA|1111|0000|9999)/, message: 'Código placeholder' },
            { pattern: /[^\w\d-]/, message: 'Caracteres especiais inválidos' }, // Exceto hífen
            { pattern: /^(.)\1{5,}/, message: 'Muitos caracteres repetidos' } // Ex: AAAAAA
        ];

        for (const { pattern, message } of suspiciousPatterns) {
            if (pattern.test(trimmedCode)) {
                issues.push(message);
            }
        }

        // Padrões positivos (indicam código válido)
        const hasLetters = /[A-Z]/i.test(trimmedCode);
        const hasNumbers = /[0-9]/.test(trimmedCode);
        const wellFormatted = /^[A-Z0-9]{6,20}$/.test(trimmedCode);

        // Calcular confiança
        let confidence = 0.5;
        if (wellFormatted) confidence += 0.3;
        if (hasLetters && hasNumbers) confidence += 0.2;
        if (issues.length === 0) confidence = Math.min(1.0, confidence + 0.2);
        else confidence = Math.max(0.1, confidence - (issues.length * 0.2));

        return {
            valid: issues.length === 0,
            issues,
            confidence: Math.max(0, Math.min(1, confidence)),
            wellFormatted,
            hasLetters,
            hasNumbers
        };
    }

    /**
     * Validar desconto
     * @param {number} discount_value - Valor do desconto
     * @param {string} discount_type - Tipo do desconto (percentage/fixed)
     * @param {number} min_purchase - Compra mínima
     * @returns {Object} - Resultado da validação
     */
    validateDiscount(discount_value, discount_type, min_purchase) {
        const issues = [];
        const value = parseFloat(discount_value) || 0;
        const minPurch = parseFloat(min_purchase) || 0;

        // Desconto zero ou negativo
        if (value <= 0) {
            issues.push('Desconto inválido ou zero');
        }

        // Desconto percentual > 100%
        if (discount_type === 'percentage' && value > 100) {
            issues.push('Desconto percentual impossível (>100%)');
        }

        // Desconto muito baixo
        if (discount_type === 'percentage' && value < 3) {
            issues.push('Desconto muito baixo (<3%)');
        }

        // Desconto fixo muito baixo
        if (discount_type === 'fixed' && value < 5) {
            issues.push('Desconto muito baixo (<R$ 5)');
        }

        // Compra mínima desproporcional
        let value_ratio = null;
        if (minPurch > 0 && value > 0) {
            if (discount_type === 'fixed') {
                value_ratio = value / minPurch;
                if (value_ratio < 0.05) {
                    issues.push('Compra mínima muito alta para o desconto (<5%)');
                }
            } else if (discount_type === 'percentage') {
                // Para percentual, verificar se mínimo é muito alto
                if (minPurch > 1000) {
                    issues.push('Compra mínima muito alta (>R$ 1000)');
                }
            }
        }

        // Calcular score de valor
        let value_score = 0.5;
        if (discount_type === 'percentage') {
            if (value >= 30) value_score = 0.9;
            else if (value >= 20) value_score = 0.8;
            else if (value >= 15) value_score = 0.7;
            else if (value >= 10) value_score = 0.6;
            else if (value >= 5) value_score = 0.5;
            else value_score = 0.3;
        } else {
            if (value_ratio !== null) {
                if (value_ratio >= 0.3) value_score = 0.9;
                else if (value_ratio >= 0.2) value_score = 0.8;
                else if (value_ratio >= 0.15) value_score = 0.7;
                else if (value_ratio >= 0.10) value_score = 0.6;
                else value_score = 0.4;
            } else {
                // Sem mínimo - avaliar valor absoluto
                if (value >= 100) value_score = 0.9;
                else if (value >= 50) value_score = 0.8;
                else if (value >= 30) value_score = 0.7;
                else if (value >= 20) value_score = 0.6;
                else if (value >= 10) value_score = 0.5;
                else value_score = 0.4;
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            value_ratio,
            value_score,
            is_good_value: value_score >= 0.7
        };
    }

    /**
     * Validar cupom completo
     * @param {Object} coupon - Objeto do cupom
     * @returns {Object} - Resultado da validação completa
     */
    validateCoupon(coupon) {
        const codeValidation = this.validateCode(coupon.code);
        const discountValidation = this.validateDiscount(
            coupon.discount_value,
            coupon.discount_type,
            coupon.min_purchase
        );

        const allIssues = [
            ...codeValidation.issues,
            ...discountValidation.issues
        ];

        const overallValid = codeValidation.valid && discountValidation.valid;
        const overallConfidence = (codeValidation.confidence + discountValidation.value_score) / 2;

        return {
            valid: overallValid,
            issues: allIssues,
            confidence: overallConfidence,
            code_validation: codeValidation,
            discount_validation: discountValidation,
            recommendation: overallValid ? 'approve' : allIssues.length > 2 ? 'reject' : 'review'
        };
    }
}

export default new CouponValidator();

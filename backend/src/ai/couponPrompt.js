/**
 * Prompt interno da IA para extração de cupons
 * Define o formato exato que a IA deve retornar
 */

class CouponPrompt {
  /**
   * Gerar prompt completo para a IA
   * @param {string} message - Mensagem bruta capturada do Telegram
   * @returns {string} - Prompt formatado para a IA
   */
  generatePrompt(message) {
    return `Você é um sistema profissional de extração de cupons.

Analise a mensagem abaixo e retorne APENAS um JSON válido.

Mensagem:
${message}

Formato obrigatório do JSON:

{
  "platform": "Shopee | MercadoLivre | Amazon | AliExpress | Outro | Desconhecido",
  "coupon_code": "string | null",
  "discount": "string | null",
  "min_purchase": "string | null",
  "usage_limit": "string | null",
  "expiration_date": "string | null",
  "is_valid_coupon": true | false,
  "confidence": 0.0
}

Regras obrigatórias:
- Não invente dados
- Se não tiver certeza, use null
- Se não for cupom, marque is_valid_coupon como false
- Retorne SOMENTE o JSON
- Não inclua comentários, explicações ou markdown
- confidence deve ser um número entre 0.0 e 1.0
- Se is_valid_coupon for false, confidence deve ser baixo (< 0.5)
- discount pode ser percentual (ex: "20%") ou valor fixo (ex: "R$ 50")
- min_purchase deve ser em formato "R$ XXX" ou null
- expiration_date deve ser em formato ISO (YYYY-MM-DD) ou null
- usage_limit deve ser número ou null`;
  }

  /**
   * Validar formato do JSON retornado pela IA
   * @param {any} response - Resposta da IA
   * @returns {boolean} - Se o formato é válido
   */
  isValidFormat(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const requiredFields = [
      'platform',
      'coupon_code',
      'discount',
      'min_purchase',
      'usage_limit',
      'expiration_date',
      'is_valid_coupon',
      'confidence'
    ];

    // Verificar se todos os campos obrigatórios existem
    for (const field of requiredFields) {
      if (!(field in response)) {
        return false;
      }
    }

    // Validar tipos
    if (typeof response.is_valid_coupon !== 'boolean') {
      return false;
    }

    if (typeof response.confidence !== 'number' || 
        response.confidence < 0 || 
        response.confidence > 1) {
      return false;
    }

    // Validar platform
    const validPlatforms = [
      'Shopee',
      'MercadoLivre',
      'Amazon',
      'AliExpress',
      'Outro',
      'Desconhecido'
    ];
    if (!validPlatforms.includes(response.platform)) {
      return false;
    }

    return true;
  }
}

export default new CouponPrompt();

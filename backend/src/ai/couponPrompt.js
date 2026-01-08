/**
 * Prompt para Extração de Cupons via IA
 * OTIMIZADO para compatibilidade com modelos gratuitos e pagos
 * 
 * Modelos testados:
 * - google/gemini-flash-1.5 (FREE) ⭐
 * - mistralai/mixtral-8x7b-instruct (FREE)
 * - openai/gpt-4o-mini (PAID)
 */

class CouponPrompt {
  /**
   * Gerar prompt OTIMIZADO para extração de cupom
   * Formato simplificado para melhor compatibilidade
   */
  generatePrompt(message, exampleMessages = []) {
    // Limitar tamanho da mensagem para evitar problemas
    const truncatedMessage = message.length > 1000
      ? message.substring(0, 1000) + '...'
      : message;

    // Exemplos opcionais (limitar para não sobrecarregar)
    let examplesSection = '';
    if (Array.isArray(exampleMessages) && exampleMessages.length > 0) {
      const validExamples = exampleMessages
        .filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0)
        .slice(0, 2); // Máximo 2 exemplos

      if (validExamples.length > 0) {
        examplesSection = `
EXEMPLOS DO CANAL:
${validExamples.map((ex, i) => `${i + 1}. ${ex.substring(0, 200)}`).join('\n')}
---
`;
      }
    }

    // Prompt SIMPLIFICADO para melhor compatibilidade
    return `Extraia informações de cupom da mensagem abaixo.

${examplesSection}MENSAGEM:
${truncatedMessage}

RETORNE APENAS JSON NO FORMATO:
{
  "platform": "Shopee|MercadoLivre|Amazon|AliExpress|Outro|Desconhecido",
  "coupon_code": "CODIGO" ou null,
  "discount": "20%" ou "R$ 50" ou null,
  "min_purchase": "R$ 100" ou null,
  "usage_limit": null,
  "expiration_date": "2024-12-31" ou null,
  "is_valid_coupon": true ou false,
  "confidence": 0.0 a 1.0
}

REGRAS:
- platform: Shopee, MercadoLivre, Amazon, AliExpress, Outro ou Desconhecido
- coupon_code: código alfanumérico 4-15 caracteres (ex: MELI20, SHOPEE50)
- discount: percentual (20%) ou valor fixo (R$ 50)
- confidence: 0.9+ se código claro, 0.5-0.8 se incerto, 0.3 se duvidoso
- is_valid_coupon: true se encontrou código válido

EXEMPLOS:
Entrada: "🎟️ Cupom Shopee SAVE20 - 20% OFF acima R$50"
Saída: {"platform":"Shopee","coupon_code":"SAVE20","discount":"20%","min_purchase":"R$ 50","usage_limit":null,"expiration_date":null,"is_valid_coupon":true,"confidence":0.95}

Entrada: "Promoção incrível! Corre lá!"
Saída: {"platform":"Desconhecido","coupon_code":null,"discount":null,"min_purchase":null,"usage_limit":null,"expiration_date":null,"is_valid_coupon":false,"confidence":0.1}

IMPORTANTE: Retorne APENAS o JSON, sem explicações.`;
  }

  /**
   * Validar formato do JSON retornado
   */
  isValidFormat(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Campos obrigatórios
    const requiredFields = [
      'platform',
      'coupon_code',
      'discount',
      'min_purchase',
      'is_valid_coupon',
      'confidence'
    ];

    // Verificar campos obrigatórios
    for (const field of requiredFields) {
      if (!(field in response)) {
        return false;
      }
    }

    // Validar is_valid_coupon
    if (typeof response.is_valid_coupon !== 'boolean') {
      // Tentar converter
      if (response.is_valid_coupon === 'true') {
        response.is_valid_coupon = true;
      } else if (response.is_valid_coupon === 'false') {
        response.is_valid_coupon = false;
      } else {
        return false;
      }
    }

    // Validar confidence
    if (typeof response.confidence !== 'number') {
      // Tentar converter
      const parsed = parseFloat(response.confidence);
      if (isNaN(parsed)) {
        return false;
      }
      response.confidence = parsed;
    }

    if (response.confidence < 0 || response.confidence > 1) {
      // Normalizar
      response.confidence = Math.max(0, Math.min(1, response.confidence));
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

    // Normalizar platform
    if (response.platform) {
      const platformLower = response.platform.toLowerCase();
      if (platformLower.includes('shopee')) {
        response.platform = 'Shopee';
      } else if (platformLower.includes('mercado') || platformLower.includes('meli')) {
        response.platform = 'MercadoLivre';
      } else if (platformLower.includes('amazon') || platformLower.includes('amzn')) {
        response.platform = 'Amazon';
      } else if (platformLower.includes('ali')) {
        response.platform = 'AliExpress';
      } else if (!validPlatforms.includes(response.platform)) {
        response.platform = 'Desconhecido';
      }
    } else {
      response.platform = 'Desconhecido';
    }

    // Adicionar campos opcionais se não existirem
    if (!('usage_limit' in response)) {
      response.usage_limit = null;
    }
    if (!('expiration_date' in response)) {
      response.expiration_date = null;
    }

    return true;
  }
}

export default new CouponPrompt();

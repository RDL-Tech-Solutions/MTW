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
    const truncatedMessage = message.length > 2000
      ? message.substring(0, 2000) + '...'
      : message;

    // Exemplos opcionais (limitar para não sobrecarregar)
    let examplesSection = '';
    if (Array.isArray(exampleMessages) && exampleMessages.length > 0) {
      const validExamples = exampleMessages
        .filter(msg => msg && typeof msg === 'string' && msg.trim().length > 0)
        .slice(0, 10); // ✅ AUMENTADO: 10 exemplos para melhor aprendizado da IA

      if (validExamples.length > 0) {
        examplesSection = `
ESTUDE OS PADRÕES DE MENSAGEM DESTE CANAL:
As mensagens abaixo são exemplos reais de como este canal envia promoções. 
Analise como eles costumam escrever o código do cupom, onde colocam o link e como descrevem o desconto.

EXEMPLOS ATUAIS:
${validExamples.map((ex, i) => `${i + 1}. ${ex.substring(0, 600)}`).join('\n\n')}
---
`;
      }
    }

    // Prompt SIMPLIFICADO para melhor compatibilidade
    return `Você é um especialista em extração de dados de e-commerce. Extraia as informações de cupom da mensagem abaixo.

${examplesSection}MENSAGEM PARA ANALISAR:
${truncatedMessage}

REGRAS DE EXTRAÇÃO:
- Verifique se a MENSAGEM PARA ANALISAR segue algum dos padrões dos EXEMPLOS ATUAIS acima.
- O código do cupom (coupon_code) geralmente está em negrito, entre crases ou em destaque.
- Se houver múltiplos códigos, tente identificar o principal.

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

IMPORTANTE: Retorne APENAS o JSON, sem textos explicativos.`;
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

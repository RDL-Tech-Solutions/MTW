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
    return `Você é um sistema profissional de extração de cupons de desconto de e-commerce.

Analise a mensagem abaixo e extraia TODAS as informações disponíveis sobre o cupom.

Mensagem:
${message}

INSTRUÇÕES DETALHADAS:

1. **CÓDIGO DO CUPOM (coupon_code)**:
   - Procure por códigos alfanuméricos de 4-15 caracteres
   - Priorize códigos dentro de backticks (formato: código entre crases)
   - Procure após palavras como "código:", "code:", "cupom:", "voucher:"
   - Procure após emojis: 🎟️, 🎫, 💰, 💳
   - Códigos comuns: letras maiúsculas e números (ex: MELICUPOM, SHOPEE20, AMZ2024)
   - Se encontrar múltiplos códigos, use o PRIMEIRO que aparecer após palavras-chave de cupom
   - NÃO use códigos que são claramente URLs, domínios ou nomes de plataformas

2. **PLATAFORMA (platform)**:
   - Identifique pela presença de:
     * "Mercado Livre", "MercadoLivre", "MELI", "mercadolivre.com" → "MercadoLivre"
     * "Shopee", "shopee.com" → "Shopee"
     * "Amazon", "amazon.com", "amzn.to" → "Amazon"
     * "AliExpress", "aliexpress.com" → "AliExpress"
   - Se não identificar claramente, use "Desconhecido"
   - Se identificar outra plataforma brasileira (Magazine Luiza, Americanas, etc), use "Outro"

3. **DESCONTO (discount)**:
   - Procure por padrões:
     * Percentual: "20% OFF", "20% de desconto", "20 por cento"
     * Valor fixo: "R$ 50 OFF", "R$ 50 de desconto", "50 reais OFF"
   - Se encontrar "180 OFF" ou valores > 100 sem %, provavelmente é valor fixo em reais
   - Se encontrar valores < 100 com "OFF", pode ser percentual ou fixo (use contexto)
   - Formato: "20%" para percentual ou "R$ 50" para valor fixo
   - Se não encontrar, use null

4. **COMPRA MÍNIMA (min_purchase)**:
   - Procure por padrões:
     * "em R$ 100", "acima de R$ 100", "a partir de R$ 100"
     * "compra mínima R$ 100", "mínimo R$ 100"
     * "válido para compras acima de R$ 100"
   - Formato: "R$ 100" (com R$ e espaço)
   - Se não encontrar, use null

5. **LIMITE DE USO (usage_limit)**:
   - Procure por: "limite de X usos", "válido para X pessoas", "X cupons disponíveis"
   - Se não encontrar, use null

6. **DATA DE EXPIRAÇÃO (expiration_date)**:
   - Procure por padrões:
     * "válido até 31/12/2024", "expira em 31/12/2024"
     * "válido por 7 dias" (calcular data futura)
     * "válido até dia 31"
   - Formato ISO: YYYY-MM-DD (ex: "2024-12-31")
   - Se encontrar "válido por X dias", calcular a data futura
   - Se não encontrar, use null

7. **VALIDAÇÃO (is_valid_coupon)**:
   - true: Se encontrar código de cupom válido (4-15 caracteres alfanuméricos)
   - false: Se não for uma mensagem sobre cupom ou não tiver código válido

8. **CONFIANÇA (confidence)**:
   - 0.9-1.0: Código claro + desconto + plataforma identificada
   - 0.7-0.9: Código claro + desconto OU plataforma
   - 0.5-0.7: Código encontrado mas informações incompletas
   - 0.3-0.5: Possível cupom mas informações muito vagas
   - 0.0-0.3: Não é cupom ou informações insuficientes

Formato obrigatório do JSON (retorne APENAS o JSON, sem markdown, sem comentários):

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

EXEMPLOS:

Mensagem: "🎟️ Cupom Shopee: SHOPEE20 - 20% OFF em compras acima de R$ 50. Válido até 31/12/2024"
Resposta: {"platform": "Shopee", "coupon_code": "SHOPEE20", "discount": "20%", "min_purchase": "R$ 50", "usage_limit": null, "expiration_date": "2024-12-31", "is_valid_coupon": true, "confidence": 0.95}

Mensagem: "🔥 Oferta imperdível! Produto em promoção"
Resposta: {"platform": "Desconhecido", "coupon_code": null, "discount": null, "min_purchase": null, "usage_limit": null, "expiration_date": null, "is_valid_coupon": false, "confidence": 0.1}

IMPORTANTE:
- Retorne SOMENTE o JSON válido
- Não inclua markdown (três backticks ou blocos de código)
- Não inclua comentários ou explicações
- Se não tiver certeza sobre algum campo, use null
- Seja preciso e detalhado na extração`;
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



/**
 * Analisador de cupons usando IA
 * Módulo principal que orquestra a análise completa
 */
import logger from '../config/logger.js';
import couponPrompt from './couponPrompt.js';
import openrouterClient from './openrouterClient.js';
import confidenceValidator from './confidenceValidator.js';
import normalizer from './normalizer.js';
import crypto from 'crypto';

class CouponAnalyzer {
  /**
   * Analisar mensagem e extrair dados do cupom
   * @param {string} message - Mensagem bruta capturada do Telegram
   * @param {Array<string>} exampleMessages - Mensagens de exemplo do canal (opcional)
   * @returns {Promise<Object|null>} - Dados do cupom normalizados ou null se inválido
   */
  async analyze(message, exampleMessages = []) {
    try {
      if (!message || typeof message !== 'string' || message.trim().length < 3) {
        logger.debug(`⚠️ Mensagem muito curta ou vazia para análise`);
        return null;
      }

      // Gerar hash da mensagem para cache
      const messageHash = this.generateMessageHash(message);

      // Verificar se já foi processada
      if (openrouterClient.isMessageProcessed(messageHash)) {
        logger.debug(`⚠️ Mensagem já foi processada (hash: ${messageHash.substring(0, 8)}...)`);
        return null;
      }

      logger.info(`🤖 Iniciando análise de cupom via IA...`);
      logger.debug(`   Mensagem: ${message.substring(0, 100)}...`);
      if (exampleMessages && exampleMessages.length > 0) {
        logger.debug(`   Usando ${exampleMessages.length} mensagem(ns) de exemplo do canal`);
      }

      // Gerar prompt com mensagens de exemplo se fornecidas
      const prompt = couponPrompt.generatePrompt(message, exampleMessages);

      // Fazer requisição para OpenRouter
      const rawExtraction = await openrouterClient.makeRequest(prompt);

      logger.debug(`✅ Resposta recebida da IA`);
      logger.debug(`   Código: ${rawExtraction.coupon_code || 'N/A'}`);
      logger.debug(`   Plataforma: ${rawExtraction.platform || 'N/A'}`);
      logger.debug(`   Confiança: ${rawExtraction.confidence?.toFixed(2) || 'N/A'}`);
      logger.debug(`   Válido: ${rawExtraction.is_valid_coupon || false}`);

      // Validar formato
      if (!couponPrompt.isValidFormat(rawExtraction)) {
        logger.error(`❌ Formato inválido da resposta da IA`);
        logger.error(`   Resposta: ${JSON.stringify(rawExtraction)}`);
        return null;
      }

      // Validar confiança
      const validation = confidenceValidator.validate(rawExtraction);
      if (!validation.valid) {
        confidenceValidator.logInvalidAttempt(message, rawExtraction, validation.reason);
        return null;
      }

      // Normalizar dados
      const normalized = normalizer.normalize(rawExtraction);

      // Marcar mensagem como processada
      openrouterClient.markMessageProcessed(messageHash);

      logger.info(`✅ Análise concluída: ${normalized.code} - ${normalized.platform} (confiança: ${normalized.confidence.toFixed(2)})`);

      return normalized;

    } catch (error) {
      logger.error(`❌ Erro ao analisar cupom: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      
      // Se o erro for relacionado a JSON inválido ou resposta vazia, logar mais detalhes
      if (error.message.includes('JSON') || error.message.includes('vazia') || error.message.includes('truncado')) {
        logger.error(`   ⚠️ Erro crítico na resposta da IA. Verifique se o modelo está funcionando corretamente.`);
        logger.error(`   💡 Dica: Tente aumentar max_tokens ou verificar se o modelo suporta JSON mode.`);
      }
      
      // Não lançar erro - retornar null para que o sistema continue funcionando
      // mesmo se a IA falhar
      return null;
    }
  }

  /**
   * Gerar hash único para uma mensagem
   */
  generateMessageHash(message) {
    return crypto.createHash('sha256')
      .update(message.trim().toLowerCase(), 'utf8')
      .digest('hex');
  }

  /**
   * Verificar se a IA está habilitada
   */
  async isEnabled() {
    try {
      const config = await openrouterClient.getConfig();
      return config.enabled === true && !!config.apiKey;
    } catch (error) {
      logger.error(`Erro ao verificar se IA está habilitada: ${error.message}`);
      return false;
    }
  }
}

export default new CouponAnalyzer();





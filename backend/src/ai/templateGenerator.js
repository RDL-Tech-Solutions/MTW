/**
 * Gerador de templates usando IA
 * Gera templates de mensagens para bots usando OpenRouter
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';

class TemplateGenerator {
  /**
   * Gerar prompt para criação de template
   * @param {string} templateType - Tipo do template (new_promotion, new_coupon, expired_coupon)
   * @param {string} platform - Plataforma (telegram, whatsapp, all)
   * @param {Array} availableVariables - Variáveis disponíveis
   * @param {string} description - Descrição do que o template deve fazer
   * @returns {string} - Prompt formatado
   */
  generatePrompt(templateType, platform, availableVariables, description = '') {
    const templateTypeNames = {
      'new_promotion': 'Nova Promoção',
      'new_coupon': 'Novo Cupom',
      'expired_coupon': 'Cupom Expirado'
    };

    const platformNames = {
      'telegram': 'Telegram',
      'whatsapp': 'WhatsApp',
      'all': 'Telegram e WhatsApp'
    };

    const typeName = templateTypeNames[templateType] || templateType;
    const platformName = platformNames[platform] || platform;

    let prompt = `Você é um especialista em criação de templates de mensagens para bots.

Crie um template de mensagem para: ${typeName}
Plataforma: ${platformName}

${description ? `Descrição/Requisitos: ${description}\n` : ''}

Variáveis disponíveis (use {nome_variavel}):
${availableVariables.map(v => `- {${v.name}}: ${v.description || v.name}`).join('\n')}

Formato do template:
- Use as variáveis disponíveis entre chaves: {nome_variavel}
- Para Telegram: Use **texto** para negrito, \`código\` para código
- Para WhatsApp: Use *texto* para negrito, \`código\` para código
- Use emojis relevantes (🎟️, 💰, 🏪, etc.)
- Seja claro, conciso e atrativo
- Não invente variáveis que não foram listadas
- Retorne APENAS o template, sem explicações ou comentários
- Use quebras de linha (\\n) para separar seções
- Mantenha o template organizado e fácil de ler

Template:`;

    return prompt;
  }

  /**
   * Gerar template usando IA
   * @param {string} templateType - Tipo do template
   * @param {string} platform - Plataforma
   * @param {Array} availableVariables - Variáveis disponíveis
   * @param {string} description - Descrição opcional
   * @returns {Promise<string>} - Template gerado
   */
  async generateTemplate(templateType, platform, availableVariables, description = '') {
    try {
      logger.info(`🤖 Gerando template via IA: ${templateType} para ${platform}`);

      // Verificar se IA está habilitada
      const aiEnabled = await openrouterClient.getConfig();
      if (!aiEnabled.enabled || !aiEnabled.apiKey) {
        throw new Error('IA não está habilitada. Configure o OpenRouter em Configurações → IA / OpenRouter');
      }

      // Gerar prompt
      const prompt = this.generatePrompt(templateType, platform, availableVariables, description);

      // Fazer requisição para OpenRouter
      // Usar modo texto (não JSON) para obter template como texto puro
      const response = await openrouterClient.makeRequest(prompt, { forceTextMode: true });

      // A resposta deve ser o template diretamente como string
      // No modo texto, a resposta vem como string direta
      let template = '';
      
      if (typeof response === 'string') {
        template = response.trim();
      } else {
        // Se por algum motivo veio como objeto, converter para string
        template = String(response).trim();
      }

      // Limpar template (remover markdown code blocks, prefixos, etc)
      template = template
        .replace(/^<s>\s*/g, '')  // Remover prefixo <s>
        .replace(/^\[OUT\]\s*/g, '')  // Remover prefixo [OUT]
        .replace(/```[\w]*\n?/g, '')  // Remover markdown code blocks
        .replace(/```/g, '')
        .replace(/^Template:\s*/i, '')  // Remover label "Template:"
        .replace(/^Template da Mensagem:\s*/i, '')
        .trim();

      // Validar que o template tem variáveis
      if (!template.includes('{')) {
        logger.warn(`⚠️ Template gerado não contém variáveis`);
        throw new Error('Template gerado não contém variáveis. Tente novamente com uma descrição mais detalhada ou verifique se a IA está configurada corretamente.');
      }

      // Validar que o template não está vazio
      if (template.length < 10) {
        throw new Error('Template gerado está muito curto. Tente novamente.');
      }

      logger.info(`✅ Template gerado com sucesso (${template.length} caracteres)`);
      logger.debug(`Template: ${template.substring(0, 200)}...`);

      return template;

    } catch (error) {
      logger.error(`❌ Erro ao gerar template: ${error.message}`);
      throw error;
    }
  }
}

export default new TemplateGenerator();

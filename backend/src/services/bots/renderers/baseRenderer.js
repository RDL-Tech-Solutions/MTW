import logger from '../../../config/logger.js';
import BotMessageTemplate from '../../../models/BotMessageTemplate.js';

/**
 * BaseRenderer - Funcionalidades compartilhadas entre todos os renderers
 */
class BaseRenderer {
    /**
     * Remover código de cupom duplicado da mensagem
     */
    removeDuplicateCouponCode(message, couponCode) {
        if (!couponCode) return message;

        const escapedCode = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const codePattern = new RegExp(`\\b${escapedCode}\\b`, 'gi');
        const codeMatches = message.match(codePattern);
        const codeCount = codeMatches ? codeMatches.length : 0;

        if (codeCount > 1) {
            logger.warn(`⚠️ Código do cupom duplicado detectado (${codeCount} vezes), removendo duplicatas...`);
            message = message.replace(codePattern, '');
            const codeSection = `\n\n🔑 **Código:** \`${couponCode}\`\n\n`;
            if (message.includes('{affiliate_link}') || message.includes('affiliate_link') || message.match(/(🔗|👉)/i)) {
                message = message.replace(/(🔗|👉|{affiliate_link})/i, `${codeSection}$1`);
            } else {
                message += codeSection;
            }
            logger.info(`   ✅ Código duplicado removido, mantendo apenas uma ocorrência: \`${couponCode}\``);
        }

        return message;
    }

    /**
     * Converter formatação de texto baseado na plataforma e parse_mode
     */
    convertBoldFormatting(message, platform, parseMode = 'MarkdownV2') {
        if (!message) return '';

        // Proteger código dentro de backticks
        const codeBlocks = [];
        let codeIndex = 0;

        // Proteger código dentro de backticks (suporta `, ``, ```)
        message = message.replace(/(`+)([\s\S]*?)\1/g, (match, ticks, content) => {
            const placeholder = `__CODE_BLOCK_${codeIndex}__`;
            codeBlocks[codeIndex] = { original: match, content: content };
            codeIndex++;
            return placeholder;
        });

        if (platform === 'whatsapp') {
            message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
            message = message.replace(/~~([^~]+?)~~/g, '~$1~');
        } else if (platform === 'telegram') {
            if (parseMode === 'HTML') {
                // Converter **texto** para <b>texto</b>
                let previousMessage = '';
                let iterations = 0;
                const maxIterations = 10;

                while (message !== previousMessage && iterations < maxIterations) {
                    previousMessage = message;
                    message = message.replace(/\*\*([\s\S]+?)\*\*/g, (match, content) => {
                        const escaped = content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        return `<b>${escaped}</b>`;
                    });
                    iterations++;
                }

                message = message.replace(/\*([^*\n<]+?)\*/g, (match, content) => {
                    if (!match.includes('<') && !match.includes('>') && !match.includes('&lt;') && !match.includes('&gt;')) {
                        const escaped = content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        return `<b>${escaped}</b>`;
                    }
                    return match;
                });

                // Converter ~~texto~~ para <s>texto</s>
                previousMessage = '';
                iterations = 0;

                while (message !== previousMessage && iterations < maxIterations) {
                    previousMessage = message;
                    message = message.replace(/~~([\s\S]*?)~~/g, (match, content) => {
                        if (content.includes('<') || content.includes('>') || content.includes('&lt;') || content.includes('&gt;')) {
                            return match;
                        }
                        if (!content || content.trim().length === 0) {
                            return match;
                        }
                        if (message.includes(`<s>${content}</s>`)) {
                            return match;
                        }
                        const escaped = content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        return `<s>${escaped}</s>`;
                    });
                    iterations++;
                }

                logger.debug(`📋 Conversão strikethrough ~~texto~~ → <s>texto</s> concluída (${iterations} iterações)`);
            } else if (parseMode === 'MarkdownV2') {
                message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
                message = message.replace(/~~([^~]+?)~~/g, '~$1~');
            } else {
                message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
                message = message.replace(/~~([^~]+?)~~/g, '$1');
                message = message.replace(/~([^~\n]+?)~/g, '$1');
            }
        }

        // Restaurar código com formatação correta
        codeBlocks.forEach((codeBlock, index) => {
            const placeholder = `__CODE_BLOCK_${index}__`;
            let restoredCode;

            if (platform === 'telegram' && parseMode === 'HTML') {
                const escapedContent = codeBlock.content
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                restoredCode = `<code>${escapedContent}</code>`;
            } else if (platform === 'telegram' && parseMode === 'MarkdownV2') {
                const escapedContent = codeBlock.content
                    .replace(/_/g, '\\_')
                    .replace(/\*/g, '\\*')
                    .replace(/\[/g, '\\[')
                    .replace(/\]/g, '\\]')
                    .replace(/\(/g, '\\(')
                    .replace(/\)/g, '\\)')
                    .replace(/~/g, '\\~')
                    .replace(/`/g, '\\`')
                    .replace(/>/g, '\\>')
                    .replace(/#/g, '\\#')
                    .replace(/\+/g, '\\+')
                    .replace(/-/g, '\\-')
                    .replace(/=/g, '\\=')
                    .replace(/\|/g, '\\|')
                    .replace(/\{/g, '\\{')
                    .replace(/\}/g, '\\}')
                    .replace(/\./g, '\\.')
                    .replace(/!/g, '\\!');
                restoredCode = `\`${escapedContent}\``;
            } else {
                restoredCode = codeBlock.original;
            }

            message = message.replace(placeholder, restoredCode);
        });

        return message;
    }

    /**
     * Formatar data
     */
    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Obter nome da plataforma
     */
    getPlatformName(platform) {
        const names = {
            shopee: 'Shopee',
            mercadolivre: 'Mercado Livre',
            amazon: 'Amazon',
            aliexpress: 'AliExpress',
            general: 'Geral'
        };
        return names[platform] || platform;
    }

    /**
     * Obter modo de template configurado
     */
    async getTemplateMode(templateType) {
        try {
            const AppSettings = (await import('../../../models/AppSettings.js')).default;
            const settings = await AppSettings.get();

            const modeMap = {
                'new_promotion': settings.template_mode_promotion,
                'promotion_with_coupon': settings.template_mode_promotion_coupon,
                'new_coupon': settings.template_mode_coupon,
                'expired_coupon': settings.template_mode_expired_coupon
            };

            const mode = modeMap[templateType];

            // Bloqueio para modelo Mixtral (Gratuito)
            if (settings.openrouter_model === 'mistralai/mixtral-8x7b-instruct' && mode === 'ai_advanced') {
                logger.warn('⚠️ IA ADVANCED desabilitada para o modelo Mixtral (Gratuito) - Usando template padrão');
                return 'default';
            }

            const validModes = ['default', 'custom', 'ai_advanced'];
            if (mode && validModes.includes(mode)) {
                logger.debug(`📋 Modo de template para ${templateType}: ${mode}`);
                return mode;
            }

            logger.warn(`⚠️ Modo inválido para ${templateType}: "${mode}", usando 'custom'`);
            return 'custom';
        } catch (error) {
            logger.error(`❌ Erro ao buscar modo de template: ${error.message}`);
            return 'custom';
        }
    }

    /**
     * Buscar template customizado do banco de dados
     */
    async getCustomTemplate(templateType, platform) {
        const template = await BotMessageTemplate.findByType(templateType, platform);

        if (!template || !template.is_active || !template.template || template.template.trim().length === 0) {
            logger.warn(`⚠️ Template customizado não encontrado ou inválido: ${templateType} (${platform})`);
            return null;
        }

        logger.info(`✅ Template customizado encontrado: ${template.id} - ${template.template_type}`);
        return template.template;
    }

    /**
     * Garantir que HTML está válido para Telegram
     * Escapa apenas caracteres especiais no conteúdo, mantendo tags HTML intactas
     */
    ensureValidHtml(message) {
        if (!message) return '';

        // Verificar se já tem tags HTML válidas (sem entidades escapadas)
        const hasValidHtmlTags = /<[bisu]>(.*?)<\/[bisu]>/gi.test(message) ||
            /<code>(.*?)<\/code>/gi.test(message) ||
            /<pre>(.*?)<\/pre>/gi.test(message);

        // Verificar se já tem entidades escapadas
        const hasEscapedEntities = /&lt;|&gt;|&amp;/.test(message);

        // Se tem HTML válido e não tem entidades escapadas, retornar como está
        if (hasValidHtmlTags && !hasEscapedEntities) {
            logger.debug(`📋 HTML já está válido e não escapado, preservando template original`);
            return message;
        }

        // Se já tem entidades escapadas, tentar decodificar
        if (hasEscapedEntities && /&lt;[bisu]&gt;|&lt;\/[bisu]&gt;/.test(message)) {
            logger.warn(`⚠️ Detectado HTML escapado incorretamente, tentando decodificar...`);
            let decoded = message
                .replace(/&lt;b&gt;/g, '<b>')
                .replace(/&lt;\/b&gt;/g, '</b>')
                .replace(/&lt;s&gt;/g, '<s>')
                .replace(/&lt;\/s&gt;/g, '</s>')
                .replace(/&lt;i&gt;/g, '<i>')
                .replace(/&lt;\/i&gt;/g, '</i>')
                .replace(/&lt;u&gt;/g, '<u>')
                .replace(/&lt;\/u&gt;/g, '</u>')
                .replace(/&lt;code&gt;/g, '<code>')
                .replace(/&lt;\/code&gt;/g, '</code>');

            if (decoded !== message) {
                logger.info(`✅ HTML decodificado com sucesso`);
                return decoded;
            }
        }

        // Proteger tags HTML e escapar conteúdo
        const tagPlaceholders = [];
        let placeholderIndex = 0;

        let protectedMessage = message.replace(/<[^>]+>/g, (match) => {
            const placeholder = `__HTML_TAG_${placeholderIndex}__`;
            tagPlaceholders.push({ placeholder, tag: match });
            placeholderIndex++;
            return placeholder;
        });

        // Escapar apenas & que não são entidades HTML já válidas
        protectedMessage = protectedMessage.replace(/&(?!(amp|lt|gt|quot|#39|#x[0-9a-fA-F]+);)/g, '&amp;');

        // Restaurar tags HTML
        tagPlaceholders.forEach(({ placeholder, tag }) => {
            protectedMessage = protectedMessage.replace(placeholder, tag);
        });

        if (protectedMessage === message || protectedMessage.replace(/&amp;/g, '&') === message) {
            logger.debug(`📋 HTML já está válido, preservando template original`);
            return message;
        }

        return protectedMessage;
    }

    /**
     * Converter HTML para formato específico (Markdown/MarkdownV2)
     */
    convertHtmlToFormat(message, targetFormat) {
        if (!message) return '';

        // Converter tags HTML para Markdown
        if (targetFormat === 'MarkdownV2' || targetFormat === 'Markdown') {
            message = message.replace(/<b>(.*?)<\/b>/gi, '*$1*');
            message = message.replace(/<strong>(.*?)<\/strong>/gi, '*$1*');
            message = message.replace(/<i>(.*?)<\/i>/gi, '_$1_');
            message = message.replace(/<em>(.*?)<\/em>/gi, '_$1_');
            message = message.replace(/<s>(.*?)<\/s>/gi, '~$1~');
            message = message.replace(/<strike>(.*?)<\/strike>/gi, '~$1~');
            message = message.replace(/<code>(.*?)<\/code>/gi, '`$1`');
            message = message.replace(/<pre>(.*?)<\/pre>/gi, '```$1```');
        }

        // Remover outras tags HTML não suportadas
        message = message.replace(/<[^>]+>/g, '');

        // Decodificar entidades HTML
        message = message
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        return message;
    }

    /**
     * Escapar caracteres especiais do MarkdownV2
     * MarkdownV2 requer escape de: _ * [ ] ( ) ~ ` > # + - = | { } . !
     */
    escapeMarkdownV2(message) {
        if (!message) return '';

        const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

        // Proteger entidades de formatação
        const entities = [];
        let entityIndex = 0;

        // Proteger código: `texto`
        message = message.replace(/`([^`]+)`/g, (match) => {
            const placeholder = `__ENTITY_${entityIndex}__`;
            entities[entityIndex] = match;
            entityIndex++;
            return placeholder;
        });

        // Proteger negrito: *texto*
        message = message.replace(/\*([^*\n]+?)\*/g, (match) => {
            const placeholder = `__ENTITY_${entityIndex}__`;
            entities[entityIndex] = match;
            entityIndex++;
            return placeholder;
        });

        // Proteger riscado: ~texto~
        message = message.replace(/~([^~\n]+?)~/g, (match) => {
            const placeholder = `__ENTITY_${entityIndex}__`;
            entities[entityIndex] = match;
            entityIndex++;
            return placeholder;
        });

        // Proteger links: [texto](url)
        message = message.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
            const placeholder = `__ENTITY_${entityIndex}__`;
            entities[entityIndex] = match;
            entityIndex++;
            return placeholder;
        });

        // Escapar caracteres especiais
        for (const char of specialChars) {
            const regex = new RegExp(`\\${char}`, 'g');
            message = message.replace(regex, `\\${char}`);
        }

        // Restaurar entidades
        entities.forEach((entity, index) => {
            message = message.replace(`__ENTITY_${index}__`, entity);
        });

        return message;
    }

    /**
     * Escapar caracteres Markdown
     */
    escapeMarkdown(text, platform = 'telegram') {
        if (!text) return '';

        let escaped = String(text);

        if (platform === 'whatsapp') {
            // Escapar apenas asteriscos duplos e outros caracteres especiais
            escaped = escaped
                .replace(/\*\*/g, '\\*\\*')
                .replace(/_/g, '\\_')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/~/g, '\\~')
                .replace(/`/g, '\\`')
                .replace(/>/g, '\\>')
                .replace(/#/g, '\\#')
                .replace(/\+/g, '\\+')
                .replace(/-/g, '\\-')
                .replace(/=/g, '\\=')
                .replace(/\|/g, '\\|')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}')
                .replace(/\./g, '\\.')
                .replace(/!/g, '\\!');
        } else {
            // Telegram: escapar todos os asteriscos simples, mas não duplos
            escaped = escaped
                .replace(/\*\*/g, '___DOUBLE_ASTERISK___')
                .replace(/\*/g, '\\*')
                .replace(/___DOUBLE_ASTERISK___/g, '**')
                .replace(/_/g, '\\_')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/~/g, '\\~')
                .replace(/`/g, '\\`')
                .replace(/>/g, '\\>')
                .replace(/#/g, '\\#')
                .replace(/\+/g, '\\+')
                .replace(/-/g, '\\-')
                .replace(/=/g, '\\=')
                .replace(/\|/g, '\\|')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}')
                .replace(/\./g, '\\.')
                .replace(/!/g, '\\!');
        }

        return escaped;
    }
}

export default new BaseRenderer();

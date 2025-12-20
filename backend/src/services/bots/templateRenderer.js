import BotMessageTemplate from '../../models/BotMessageTemplate.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';

class TemplateRenderer {
  /**
   * Renderizar template com variáveis
   * @param {string} templateType - Tipo do template
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @param {Object} variables - Variáveis para substituir
   * @returns {Promise<string>}
   */
  async render(templateType, platform, variables = {}, contextData = {}) {
    try {
      logger.info(`🎨 Renderizando template: ${templateType} para ${platform}`);
      
      // Verificar modo de template configurado
      const templateMode = await this.getTemplateMode(templateType);
      logger.info(`📋 Modo de template: ${templateMode} para ${templateType}`);
      
      let message = '';
      
      // Modo IA ADVANCED: Gerar template dinamicamente
      if (templateMode === 'ai_advanced') {
        logger.info(`🤖 [IA ADVANCED] Gerando template dinamicamente para ${templateType}`);
        const advancedTemplateGenerator = (await import('../../ai/advancedTemplateGenerator.js')).default;
        
        try {
          if (templateType === 'new_promotion' || templateType === 'promotion_with_coupon') {
            // Gerar template de promoção
            message = await advancedTemplateGenerator.generatePromotionTemplate(contextData.product || contextData, platform);
          } else if (templateType === 'new_coupon') {
            // Gerar template de cupom
            message = await advancedTemplateGenerator.generateCouponTemplate(contextData.coupon || contextData, platform);
            
            // IMPORTANTE: Remover qualquer menção à data de validade que a IA possa ter incluído
            // Remover padrões comuns de data de validade
            message = message
              .replace(/\n?📅\s*\*\*?Válido até:\*\*?\s*\{?valid_until\}?[^\n]*\n?/gi, '')
              .replace(/\n?📅\s*\*\*?Válido até\*\*?:\s*[^\n]*\n?/gi, '')
              .replace(/\n?📅\s*Válido até:\s*[^\n]*\n?/gi, '')
              .replace(/\n?⏰\s*\*\*?Válido até:\*\*?\s*\{?valid_until\}?[^\n]*\n?/gi, '')
              .replace(/\n?📅\s*\{valid_until\}[^\n]*\n?/gi, '')
              .replace(/\n?.*válido até.*\n?/gi, '')
              .replace(/\n?.*Válido até.*\n?/gi, '')
              .replace(/\n?.*valid_until.*\n?/gi, '');
            
            logger.debug(`📝 Template de cupom após remoção de data de validade: ${message.length} chars`);
          } else if (templateType === 'expired_coupon') {
            // Gerar template de cupom expirado
            message = await advancedTemplateGenerator.generateExpiredCouponTemplate(contextData.coupon || contextData, platform);
          } else {
            throw new Error(`Tipo de template não suportado para IA ADVANCED: ${templateType}`);
          }
          
          logger.info(`✅ [IA ADVANCED] Template gerado com sucesso (${message.length} chars)`);
          
          // IMPORTANTE: Processar template gerado pela IA para garantir formatação correta
          // 1. Converter qualquer HTML literal que a IA possa ter gerado para Markdown
          // IMPORTANTE: Processar na ordem correta para evitar conflitos
          message = message
            // Primeiro, proteger código já formatado
            .replace(/`([^`]+)`/g, '__CODE_PROTECTED_$1__')
            // Converter HTML para Markdown
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')  // <code> primeiro
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<i>(.*?)<\/i>/gi, '_$1_')
            .replace(/<em>(.*?)<\/em>/gi, '_$1_')
            .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')  // Strikethrough
            .replace(/<br\s*\/?>/gi, '\n')
            // Corrigir tildes múltiplos incorretos (~~~~ → ~~)
            .replace(/~{3,}/g, '~~')
            // Restaurar código protegido
            .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`');
          
          // 2. Se a IA ADVANCED otimizou o título, atualizar nas variáveis também
          if (contextData.product && contextData.product.name) {
            // O título já foi otimizado dentro do generatePromotionTemplate
            // IMPORTANTE: O título otimizado está em contextData.product.name
            const optimizedTitle = contextData.product.name;
            if (variables.product_name && optimizedTitle !== variables.product_name) {
              logger.info(`📝 Atualizando product_name de "${variables.product_name}" para título otimizado: "${optimizedTitle}"`);
              variables.product_name = optimizedTitle;
            } else if (!variables.product_name) {
              variables.product_name = optimizedTitle;
              logger.info(`📝 Definindo product_name com título otimizado: "${optimizedTitle}"`);
            } else {
              logger.debug(`📝 product_name já está atualizado: "${variables.product_name}"`);
            }
          }
          
          // 2.1. IMPORTANTE: Garantir que {product_name} esteja presente na mensagem
          // Se a IA não incluiu o título, adicionar no início
          const productName = variables.product_name || contextData.product?.name || 'Produto';
          
          // Verificar se a IA gerou uma descrição longa no lugar do título
          // Se a primeira linha após o cabeçalho é muito longa (> 100 chars) e não contém o título, pode ser uma descrição
          const lines = message.split('\n');
          const headerLineIndex = lines.findIndex(line => line.includes('🔥') && line.includes('**'));
          if (headerLineIndex >= 0 && headerLineIndex + 1 < lines.length) {
            const lineAfterHeader = lines[headerLineIndex + 1].trim();
            // Se a linha após o cabeçalho é muito longa e não contém o título, pode ser uma descrição no lugar do título
            if (lineAfterHeader.length > 100 && !lineAfterHeader.includes(productName) && !lineAfterHeader.includes('{product_name}')) {
              logger.warn(`⚠️ Detectada possível descrição longa no lugar do título, corrigindo...`);
              // Adicionar o título antes dessa linha longa
              lines[headerLineIndex + 1] = `📦 **${productName}**\n\n${lineAfterHeader}`;
              message = lines.join('\n');
              logger.info(`✅ Título do produto adicionado antes da descrição: "${productName}"`);
            }
          }
          
          if (!message.includes('{product_name}') && !message.includes(productName)) {
            logger.warn(`⚠️ Título do produto não encontrado na mensagem da IA, adicionando...`);
            // Adicionar título após o cabeçalho da oferta
            message = message.replace(
              /(🔥\s*\*\*[^*]+\*\*\s*🔥)/,
              `$1\n\n📦 **${productName}**`
            );
            // Se não encontrou o padrão, adicionar no início
            if (!message.includes(`📦 **${productName}**`)) {
              message = `📦 **${productName}**\n\n${message}`;
            }
            logger.info(`✅ Título do produto adicionado: "${productName}"`);
          } else {
            logger.debug(`✅ Título do produto encontrado na mensagem: "${productName}"`);
          }
          
          // 3. IMPORTANTE: Garantir que coupon_code seja formatado com backticks para facilitar cópia no Telegram
          if (contextData.coupon && contextData.coupon.code && variables.coupon_code) {
            const couponCode = variables.coupon_code;
            // Verificar se já está formatado
            const codeInMessage = message.includes(`\`${couponCode}\``) || 
                                  message.includes(`<code>${couponCode}</code>`) ||
                                  message.match(new RegExp(`[<\\\`]${couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[>\\\`]`));
            
            if (!codeInMessage) {
              logger.info(`📝 Garantindo que código do cupom seja formatado para cópia fácil`);
              // Substituir código sem formatação por código formatado
              const escapedCode = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'g');
              
              if (platform === 'telegram') {
                // Para Telegram, usar backticks (será convertido para <code> depois se HTML)
                message = message.replace(codeRegex, `\`${couponCode}\``);
              } else {
                message = message.replace(codeRegex, `\`${couponCode}\``);
              }
              logger.info(`   ✅ Código formatado: \`${couponCode}\``);
            } else {
              logger.debug(`   ✅ Código do cupom já está formatado corretamente`);
            }
          }
        } catch (aiError) {
          logger.error(`❌ [IA ADVANCED] Erro ao gerar template: ${aiError.message}`);
          logger.warn(`⚠️ Fallback para template customizado...`);
          // Fallback para template customizado se IA falhar
          const template = await BotMessageTemplate.findByType(templateType, platform);
          if (!template || !template.is_active) {
            throw new Error(`IA ADVANCED falhou e não há template customizado disponível: ${aiError.message}`);
          }
          message = template.template;
        }
      } 
      // Modo DEFAULT: Usar template padrão do sistema
      else if (templateMode === 'default') {
        logger.info(`📋 Usando template padrão do sistema para ${templateType}`);
        message = this.getDefaultTemplate(templateType, variables, platform);
      }
      // Modo CUSTOM: Usar template salvo no painel admin
      else {
        logger.info(`📋 Usando template customizado do painel admin para ${templateType}`);
        const template = await BotMessageTemplate.findByType(templateType, platform);
        
        if (!template) {
          const errorMsg = `Template não encontrado: ${templateType} para ${platform}. Configure um template ativo no painel admin.`;
          logger.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (!template.is_active) {
          const errorMsg = `Template encontrado mas está inativo: ${templateType} para ${platform}. Ative o template no painel admin.`;
          logger.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (!template.template || template.template.trim().length === 0) {
          const errorMsg = `Template está vazio: ${templateType} para ${platform}. Configure o conteúdo do template no painel admin.`;
          logger.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }

        logger.info(`✅ Template encontrado e ativo: ${template.id} - ${template.template_type} para ${template.platform}`);
        message = template.template;
      }
      
      logger.debug(`📋 Template original (primeiros 200 chars): ${message.substring(0, 200)}...`);
      logger.debug(`📋 Template original tem ${(message.match(/\n/g) || []).length} quebras de linha`);
      
      // Primeiro, substituir todas as variáveis (mesmo as vazias)
      // IMPORTANTE: Preservar quebras de linha durante substituição
      // NOTA: Para IA ADVANCED, o template já vem completo, mas pode ter variáveis que precisam ser substituídas
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        let replacement = value !== null && value !== undefined ? String(value) : '';
        
        // IMPORTANTE: Se for valid_until, SEMPRE remover (não incluir data de validade no bot)
        if (key === 'valid_until') {
          replacement = ''; // Sempre vazio para não incluir data de validade
          logger.debug(`📝 Removendo data de validade ({valid_until}) do template`);
        }
        
        // IMPORTANTE: Se for coupon_code, SEMPRE formatar para facilitar cópia
        if (key === 'coupon_code' && replacement && replacement !== 'N/A') {
          // Verificar se o template já tem backticks ao redor da variável
          const hasBackticks = message.includes(`\`{${key}}\``);
          if (!hasBackticks) {
            // Se não tiver backticks no template, adicionar na substituição
            // Para Telegram HTML, usar <code>, caso contrário usar backticks
            if (platform === 'telegram') {
              // Será convertido para <code> depois se parseMode for HTML
              replacement = `\`${replacement}\``;
            } else {
              replacement = `\`${replacement}\``;
            }
            logger.debug(`📝 Formatando coupon_code: ${replacement}`);
          }
        }
        
        // IMPORTANTE: Se for min_purchase, garantir que seja apenas o valor (sem emoji/texto duplicado)
        if (key === 'min_purchase' && replacement) {
          // Remover qualquer emoji e texto "Compra mínima:" que possa estar na variável
          // A variável deve conter apenas "R$ X.XX"
          replacement = replacement
            .replace(/💳\s*/g, '')
            .replace(/\*\*/g, '')
            .replace(/Compra\s+mínima:\s*/gi, '')
            .replace(/<b>.*?<\/b>/gi, '')
            .trim();
          
          // Se ainda não começa com R$, adicionar
          if (replacement && !replacement.startsWith('R$')) {
            // Tentar extrair apenas o número
            const numberMatch = replacement.match(/[\d,]+\.?\d*/);
            if (numberMatch) {
              replacement = `R$ ${numberMatch[0]}`;
            }
          }
          
          logger.debug(`📝 min_purchase limpo: ${replacement}`);
        }
        
        // IMPORTANTE: Se for affiliate_link, garantir que seja um link válido
        if (key === 'affiliate_link') {
          if (!replacement || replacement === 'Link não disponível' || replacement.trim().length === 0) {
            logger.warn(`⚠️ affiliate_link está vazio ou inválido: "${replacement}"`);
            // Tentar obter do produto se disponível
            if (contextData.product && contextData.product.affiliate_link) {
              replacement = contextData.product.affiliate_link;
              logger.info(`✅ Usando affiliate_link do produto: ${replacement.substring(0, 50)}...`);
            }
          } else {
            logger.debug(`📝 Substituindo {affiliate_link} com: ${replacement.substring(0, 50)}...`);
          }
        }
        
        message = message.replace(regex, replacement);
      }
      
      // IMPORTANTE: Remover qualquer texto literal "[Link de afiliado]" que a IA possa ter gerado
      // e substituir pelo link real se ainda não foi substituído
      if (message.includes('[Link de afiliado]') || message.includes('\\[Link de afiliado\\]')) {
        logger.warn(`⚠️ Detectado texto literal "[Link de afiliado]" na mensagem, substituindo...`);
        const realLink = variables.affiliate_link || contextData.product?.affiliate_link || 'Link não disponível';
        message = message.replace(/\[Link de afiliado\]|\\\[Link de afiliado\\\]/g, realLink);
        logger.info(`✅ Texto literal substituído por link real`);
      }
      
      // IMPORTANTE: Remover qualquer linha que contenha apenas data de validade ou variável {valid_until}
      // Isso garante que mesmo se a IA incluir, será removido
      if (templateType === 'new_coupon') {
        message = message
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            // Remover linhas que contenham apenas data de validade ou padrões relacionados
            return !trimmed.match(/^📅.*[Vv]álido.*$/i) &&
                   !trimmed.match(/^⏰.*[Vv]álido.*$/i) &&
                   !trimmed.match(/.*\{valid_until\}.*/) &&
                   !trimmed.match(/^.*válido até.*$/i) &&
                   !trimmed.match(/^.*Válido até.*$/i) &&
                   trimmed.length > 0;
          })
          .join('\n');
        logger.debug(`📝 Template após remoção de linhas com data de validade`);
      }
      
      // IMPORTANTE: Corrigir duplicações de "Compra mínima" e tags HTML não renderizadas
      // Isso deve acontecer APÓS a substituição de variáveis
      if (templateType === 'new_coupon') {
        // PRIMEIRO: Converter qualquer HTML restante para Markdown
        // (caso a IA tenha gerado HTML após a conversão inicial)
        if (message.includes('<b>') || message.includes('<code>') || message.includes('<strong>')) {
          logger.warn(`⚠️ Detectadas tags HTML na mensagem após substituição, convertendo para Markdown...`);
          message = message
            // Proteger código dentro de backticks antes de converter
            .replace(/`([^`]+)`/g, '__CODE_PROTECTED_$1__')
            // Converter HTML para Markdown
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')
            .replace(/<i>(.*?)<\/i>/gi, '_$1_')
            .replace(/<em>(.*?)<\/em>/gi, '_$1_')
            // Restaurar código protegido
            .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`');
        }
        
        // SEGUNDO: Remover padrões duplicados de "Compra mínima" (múltiplas tentativas)
        message = message
          // Padrão 1: HTML com duplicação completa
          .replace(/💳\s*Compra\s+mínima:\s*<b>💳\s*<\/b>Compra\s+mínima:<b>\s*/gi, '💳 **Compra mínima:** ')
          // Padrão 2: Markdown com duplicação
          .replace(/💳\s*Compra\s+mínima:\s*\*\*💳\s*\*\*\s*Compra\s+mínima:\s*\*\*\s*/gi, '💳 **Compra mínima:** ')
          // Padrão 3: Duplicação simples sem tags
          .replace(/💳\s*Compra\s+mínima:\s*💳\s*Compra\s+mínima:\s*/gi, '💳 **Compra mínima:** ')
          // Padrão 4: Com espaços e tags misturadas
          .replace(/💳\s*Compra\s+mínima:\s*<b>\s*💳\s*<\/b>\s*Compra\s+mínima:\s*<b>\s*/gi, '💳 **Compra mínima:** ')
          // Padrão 5: Com texto "Compra mínima:" duplicado dentro de tags
          .replace(/💳\s*Compra\s+mínima:\s*<b>\s*💳\s*Compra\s+mínima:\s*<\/b>\s*<b>\s*/gi, '💳 **Compra mínima:** ')
          // Padrão 6: Com Markdown já convertido mas ainda duplicado
          .replace(/(💳\s*\*\*Compra\s+mínima:\*\*\s*R\$\s*[\d,]+\.?\d*)\s*\n?\s*\1/gi, '$1');
        
        // TERCEIRO: Limpeza final - remover qualquer duplicação restante de "Compra mínima"
        // Procurar por múltiplas ocorrências da linha completa
        const minPurchaseLines = message.match(/💳\s*\*\*Compra\s+mínima:\*\*\s*R\$\s*[\d,]+\.?\d*/gi);
        if (minPurchaseLines && minPurchaseLines.length > 1) {
          logger.warn(`⚠️ Detectada ${minPurchaseLines.length} ocorrência(s) de "Compra mínima", removendo duplicatas...`);
          // Manter apenas a primeira ocorrência
          const firstOccurrence = minPurchaseLines[0];
          let foundFirst = false;
          message = message.replace(/💳\s*\*\*Compra\s+mínima:\*\*\s*R\$\s*[\d,]+\.?\d*/gi, (match) => {
            if (!foundFirst && match === firstOccurrence) {
              foundFirst = true;
              return match;
            }
            return ''; // Remover duplicatas
          });
          // Limpar linhas vazias resultantes e espaços extras
          message = message.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '');
        }
      }
      
      // IMPORTANTE: Após substituir variáveis, garantir que código do cupom esteja formatado
      // Mesmo que a IA não tenha formatado, garantir formatação agora
      if (variables.coupon_code && variables.coupon_code !== 'N/A') {
        const couponCode = variables.coupon_code;
        // Verificar se já está formatado
        const codeFormatted = message.includes(`\`${couponCode}\``) || 
                             message.includes(`<code>${couponCode}</code>`);
        
        if (!codeFormatted) {
          logger.info(`📝 Garantindo formatação do código do cupom após substituição de variáveis`);
          const escapedCode = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'g');
          message = message.replace(codeRegex, `\`${couponCode}\``);
          logger.info(`   ✅ Código formatado: \`${couponCode}\``);
        }
        
        // IMPORTANTE: Se o código do cupom não está na mensagem, adicionar
        // Isso garante que mesmo se a IA não incluir, o código será adicionado
        if (!message.includes(couponCode) && !message.includes(`{coupon_code}`)) {
          logger.warn(`⚠️ Código do cupom não encontrado na mensagem, adicionando...`);
          // Adicionar código do cupom após a seção de preço ou antes do link
          const priceSectionPattern = /(🏷️.*?🏷️)/;
          const linkPattern = /(👉.*?affiliate_link)/;
          
          const couponSection = `\n\n🎟️ **CUPOM DISPONÍVEL!**\n\n🔑 **Código:** \`${couponCode}\`\n`;
          
          if (priceSectionPattern.test(message)) {
            message = message.replace(priceSectionPattern, `$1${couponSection}`);
          } else if (linkPattern.test(message)) {
            message = message.replace(linkPattern, `${couponSection}$1`);
          } else {
            // Adicionar antes do link de afiliado
            message = message.replace(/(👉.*?\{affiliate_link\})/, `${couponSection}$1`);
          }
          
          logger.info(`   ✅ Código do cupom adicionado: \`${couponCode}\``);
        }
      }
      
      // IMPORTANTE: Verificar se o título do produto está presente na mensagem após substituição
      // Se não estiver, adicionar (especialmente importante para IA ADVANCED)
      if (templateMode === 'ai_advanced' && variables.product_name && variables.product_name !== 'N/A') {
        const productName = variables.product_name;
        // Verificar se o título está na mensagem (pode estar formatado ou não)
        const hasProductName = message.includes(productName) || 
                              message.includes(`{product_name}`) ||
                              message.match(new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        
        if (!hasProductName) {
          logger.warn(`⚠️ Título do produto não encontrado na mensagem após substituição, adicionando...`);
          // Adicionar título após o primeiro cabeçalho (se houver) ou no início
          const headerPattern = /(🔥\s*\*\*[^*]+\*\*\s*🔥)/;
          if (headerPattern.test(message)) {
            message = message.replace(headerPattern, `$1\n\n📦 **${productName}**`);
          } else {
            // Se não houver cabeçalho, adicionar no início
            message = `📦 **${productName}**\n\n${message}`;
          }
          logger.info(`✅ Título do produto adicionado: "${productName}"`);
        } else {
          logger.debug(`✅ Título do produto encontrado na mensagem: "${productName}"`);
        }
      }
      
      logger.debug(`📋 Mensagem após substituição tem ${(message.match(/\n/g) || []).length} quebras de linha`);

      // Determinar parse_mode para Telegram
      let parseMode = 'HTML'; // Padrão HTML para melhor compatibilidade
      if (platform === 'telegram') {
        try {
          const BotConfig = (await import('../../models/BotConfig.js')).default;
          const botConfig = await BotConfig.get();
          const configuredMode = botConfig.telegram_parse_mode || 'HTML';
          
          // HTML é mais confiável e suporta tudo (negrito, riscado, itálico, etc)
          if (configuredMode === 'Markdown' || configuredMode === 'MarkdownV2') {
            parseMode = 'HTML';
          } else {
            parseMode = configuredMode;
          }
        } catch (error) {
          logger.warn(`Erro ao buscar parse_mode, usando HTML: ${error.message}`);
          parseMode = 'HTML';
        }
      }
      
      // IMPORTANTE: Preservar o template exatamente como configurado no painel admin
      // O template já deve estar no formato correto quando salvo no painel
      // Apenas fazer validação mínima necessária, sem alterar a estrutura
      
      // IMPORTANTE: Limpar tildes múltiplos incorretos antes de processar
      // Corrigir ~~~~ ou mais tildes para ~~ (strikethrough correto)
      // Mas preservar ~~texto~~ válido
      // Processar em múltiplas passadas para garantir correção completa
      let previousMessage = '';
      let iterations = 0;
      while (message !== previousMessage && iterations < 5) {
        previousMessage = message;
        // Corrigir 3 ou mais tildes consecutivos (exceto se já for parte de ~~texto~~)
        message = message.replace(/(?<!~)~{3,}(?!~)/g, '~~');
        // Corrigir padrões como -R$ 165,00~~~~ para -R$ 165,00~~
        message = message.replace(/([^~])~{3,}(?!~)/g, '$1~~');
        iterations++;
      }
      if (iterations > 1) {
        logger.debug(`📝 Corrigidos tildes múltiplos (${iterations} iterações)`);
      }
      
      // IMPORTANTE: Se ainda houver tags HTML literais após processamento da IA, converter para Markdown primeiro
      // Isso garante que mesmo se a IA gerar HTML por engano, será convertido corretamente
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(message);
      if (hasHtmlTags && templateMode === 'ai_advanced') {
        logger.warn(`⚠️ Detectadas tags HTML literais no template da IA, convertendo para Markdown...`);
        // Converter HTML para Markdown antes de processar
        message = message
          .replace(/<b>(.*?)<\/b>/gi, '**$1**')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<i>(.*?)<\/i>/gi, '_$1_')
          .replace(/<em>(.*?)<\/em>/gi, '_$1_')
          .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
          .replace(/<code>(.*?)<\/code>/gi, '`$1`')
          .replace(/<br\s*\/?>/gi, '\n');
        logger.info(`✅ Tags HTML convertidas para Markdown`);
      }
      
      // Verificar se o template já está em HTML ou Markdown (após conversão)
      const hasHtmlTagsAfter = /<[a-z][\s\S]*>/i.test(message);
      // Detectar Markdown: **texto** ou *texto* (mas não dentro de tags HTML)
      const hasMarkdownBold = (/\*\*[^*]+\*\*/.test(message) || /\*[^*\n<]+\*/.test(message)) && !hasHtmlTagsAfter;
      
      logger.debug(`📋 Template análise: HTML=${hasHtmlTagsAfter}, Markdown=${hasMarkdownBold}, parseMode=${parseMode}, platform=${platform}`);
      
      // IMPORTANTE: Verificação final ANTES da conversão - garantir que não há tags HTML não renderizadas
      // Se ainda houver tags HTML, converter para Markdown primeiro
      if (message.includes('<b>') || message.includes('<code>') || message.includes('<strong>')) {
        logger.warn(`⚠️ Detectadas tags HTML não renderizadas na mensagem final, convertendo para Markdown...`);
        message = message
          // Proteger código dentro de backticks
          .replace(/`([^`]+)`/g, '__CODE_PROTECTED_$1__')
          // Converter HTML para Markdown
          .replace(/<b>(.*?)<\/b>/gi, '**$1**')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<code>(.*?)<\/code>/gi, '`$1`')
          .replace(/<i>(.*?)<\/i>/gi, '_$1_')
          .replace(/<em>(.*?)<\/em>/gi, '_$1_')
          // Restaurar código protegido
          .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`');
      }
      
      // IMPORTANTE: Para Telegram com parse_mode HTML, SEMPRE converter Markdown para HTML
      if (platform === 'telegram' && parseMode === 'HTML') {
        if (hasMarkdownBold || message.includes('**')) {
          // Template tem Markdown - converter OBRIGATORIAMENTE para HTML
          logger.info(`🔄 Convertendo Markdown (**texto**) para HTML (<b>texto</b>) para Telegram`);
          message = this.convertBoldFormatting(message, platform, parseMode);
          logger.debug(`📋 Mensagem após conversão (primeiros 200 chars): ${message.substring(0, 200)}`);
        } else if (hasHtmlTagsAfter) {
          // Template ainda tem HTML - converter para Markdown primeiro, depois para HTML
          logger.warn(`⚠️ Template ainda contém HTML após processamento, convertendo...`);
          message = message
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
            .replace(/<code>(.*?)<\/code>/gi, '`$1`');
          // Agora converter Markdown para HTML
          message = this.convertBoldFormatting(message, platform, parseMode);
        }
        
        // IMPORTANTE: Verificação final - garantir que não há tags HTML não renderizadas
        // Se ainda houver tags HTML após todas as conversões, converter para Markdown e depois para HTML
        if (message.includes('<b>') || message.includes('<code>') || message.includes('<strong>')) {
          logger.warn(`⚠️ Tags HTML ainda presentes após conversão, fazendo limpeza final...`);
          message = message
            .replace(/`([^`]+)`/g, '__CODE_PROTECTED_$1__')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')
            .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`');
          // Converter novamente para HTML
          message = this.convertBoldFormatting(message, platform, parseMode);
        }
        
        // IMPORTANTE: Verificação final para garantir que padrões como "(de  ~~R$ 252,00~~)" sejam convertidos
        // Isso pode acontecer quando a variável old_price é substituída e tem espaços
        if (message.includes('~~') && !message.match(/<s>[^<]+<\/s>/)) {
          logger.debug(`📝 Verificação final: corrigindo padrões de strikethrough não convertidos...`);
          // Tentar converter padrões restantes que não foram capturados
          message = message.replace(/(\s+)(~~)([^~]+?)(~~\))/g, (match, spaces, openTildes, content, suffix) => {
            if (content.includes('<') || content.includes('>')) {
              return match;
            }
            const escaped = content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `${spaces}<s>${escaped}</s>)`;
          });
        }
      } else if (platform === 'telegram' && (parseMode === 'Markdown' || parseMode === 'MarkdownV2')) {
        // Para Markdown/MarkdownV2, converter ** para *
        if (hasMarkdownBold) {
          logger.debug(`📋 Convertendo **texto** para *texto* para Markdown/MarkdownV2`);
          message = this.convertBoldFormatting(message, platform, parseMode);
        }
      } else if (hasHtmlTags && platform === 'telegram' && parseMode !== 'HTML') {
        // Se parse_mode não é HTML mas template tem HTML, converter
        logger.warn(`⚠️ Template tem HTML mas parse_mode é ${parseMode}, convertendo...`);
        message = this.convertHtmlToFormat(message, parseMode);
      }
      // Para WhatsApp, manter formatação original (WhatsApp processa automaticamente)

      // IMPORTANTE: Verificação final absoluta - garantir que não há tags HTML não renderizadas
      // Esta é a última chance antes de retornar a mensagem
      if (platform === 'telegram' && parseMode === 'HTML') {
        if (message.includes('<b>') || message.includes('<code>') || message.includes('<strong>')) {
          // Se ainda há tags HTML, pode ser que a conversão não funcionou
          // Tentar converter uma última vez
          logger.warn(`⚠️ Verificação final: tags HTML ainda presentes, convertendo...`);
          message = message
            .replace(/`([^`]+)`/g, '__CODE_PROTECTED_$1__')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')
            .replace(/__CODE_PROTECTED_(.+?)__/g, '`$1`');
          // Converter para HTML novamente
          message = this.convertBoldFormatting(message, platform, parseMode);
        }
      }
      
      // IMPORTANTE: Preservar quebras de linha do template original
      // Não remover quebras de linha, apenas limpar linhas completamente vazias
      const lines = message.split('\n');
      const cleanedLines = lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Se a linha está completamente vazia, manter apenas se não for a primeira ou última
        // Isso preserva quebras de linha intencionais no template
        if (!trimmed) {
          // Manter quebra de linha vazia se não for no início ou fim
          return (index > 0 && index < lines.length - 1) ? '' : null;
        }
        
        // Se a linha contém apenas tags HTML vazias ou espaços, remover
        if (trimmed.match(/^[\s<>\/]*$/)) {
          return null;
        }
        
        // Se a linha contém apenas tags HTML sem conteúdo (ex: <b></b>, <code></code>)
        if (trimmed.match(/^<[^>]+><\/[^>]+>$/)) {
          return null;
        }
        
        // Remover conteúdo HTML para verificar se há texto real
        const withoutHtml = trimmed.replace(/<[^>]+>/g, '').trim();
        
        // Se após remover HTML não há conteúdo, remover linha
        if (!withoutHtml || withoutHtml.match(/^[\s\p{Emoji}:]*$/u)) {
          return null;
        }
        
        // Verificar se a linha tem apenas label e dois pontos, sem valor real
        if (trimmed.match(/^[\s\p{Emoji}<>\/]*<[^>]+>[^<]*<\/[^>]+>[\s:]*$/u)) {
          return null;
        }
        
        // Preservar a linha original (com espaços se necessário)
        return line;
      }).filter(line => line !== null);
      
      // Juntar linhas preservando quebras de linha
      message = cleanedLines.join('\n');
      
      // Limitar apenas quebras de linha excessivas (mais de 2 consecutivas)
      message = message.replace(/\n{3,}/g, '\n\n');
      
      // Remover espaços em branco apenas no início e fim da mensagem completa
      // IMPORTANTE: Não usar trim() se isso remover quebras de linha importantes
      message = message.replace(/^\s+/, '').replace(/\s+$/, '');
      
      logger.debug(`📋 Mensagem final tem ${(message.match(/\n/g) || []).length} quebras de linha`);
      logger.debug(`📋 Mensagem final (primeiros 500 chars):\n${message.substring(0, 500).replace(/\n/g, '\\n')}`);

      // VALIDAÇÃO: Garantir que a mensagem não está vazia
      if (!message || message.trim().length === 0) {
        logger.error(`❌ Template renderizado está vazio para ${templateType} (${platform})`);
        throw new Error(`Template renderizado está vazio. Verifique se o template no painel admin tem conteúdo válido.`);
      }

      // VALIDAÇÃO: Verificar se todas as variáveis foram substituídas
      const remainingVariables = message.match(/\{[^}]+\}/g);
      if (remainingVariables && remainingVariables.length > 0) {
        logger.warn(`⚠️ Variáveis não substituídas encontradas: ${remainingVariables.join(', ')}`);
        // Não falhar - pode ser intencional no template
      }

      // VALIDAÇÃO: Verificar quebra de linha preservada (apenas se não for IA ADVANCED)
      // Para IA ADVANCED, não temos template original para comparar
      if (templateMode !== 'ai_advanced') {
        // Tentar obter template original para comparação (se disponível)
        try {
          const originalTemplate = await BotMessageTemplate.findByType(templateType, platform);
          if (originalTemplate && originalTemplate.template) {
            const originalLineBreaks = (originalTemplate.template.match(/\n/g) || []).length;
            const finalLineBreaks = (message.match(/\n/g) || []).length;
            if (finalLineBreaks < originalLineBreaks * 0.5) {
              logger.warn(`⚠️ Muitas quebras de linha foram removidas (original: ${originalLineBreaks}, final: ${finalLineBreaks})`);
            }
          }
        } catch (e) {
          // Ignorar erro se não conseguir buscar template original
          logger.debug(`Não foi possível comparar quebras de linha: ${e.message}`);
        }
      }
      
      const finalLineBreaks = (message.match(/\n/g) || []).length;

      logger.info(`✅ Template renderizado com sucesso: ${message.length} caracteres, ${finalLineBreaks} quebras de linha`);
      logger.debug(`📋 Mensagem final completa:\n${message}`);

      // Retornar mensagem EXATAMENTE como configurado no painel admin
      return message;
    } catch (error) {
      logger.error(`❌ ERRO CRÍTICO ao renderizar template: ${error.message}`);
      logger.error(`   Tipo: ${templateType}, Plataforma: ${platform}`);
      logger.error(`   Stack: ${error.stack}`);
      
      // NÃO usar fallback - template do painel admin é obrigatório
      // Re-lançar o erro para que o chamador saiba que falhou
      throw new Error(`Falha ao renderizar template do painel admin para ${templateType} (${platform}): ${error.message}. Verifique se o template está configurado corretamente no painel admin.`);
    }
  }

  /**
   * Preparar variáveis para template de promoção
   * @param {Object} product - Dados do produto
   * @returns {Promise<Object>}
   */
  async preparePromotionVariables(product) {
    // Log do affiliate_link que será usado
    logger.info(`🔗 Preparando variáveis de template. affiliate_link: ${product.affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
    
    // Calcular preço final (com cupom se houver)
    let finalPrice = product.current_price;
    let priceWithCoupon = null;
    
    if (product.coupon_id) {
      try {
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const currentPrice = product.current_price || 0;
          
          if (coupon.discount_type === 'percentage') {
            // Desconto percentual
            priceWithCoupon = currentPrice - (currentPrice * (coupon.discount_value / 100));
          } else {
            // Desconto fixo
            priceWithCoupon = Math.max(0, currentPrice - coupon.discount_value);
          }

          // Aplicar limite máximo de desconto se existir
          if (coupon.max_discount_value && coupon.max_discount_value > 0) {
            const discountAmount = currentPrice - priceWithCoupon;
            if (discountAmount > coupon.max_discount_value) {
              priceWithCoupon = currentPrice - coupon.max_discount_value;
            }
          }

          finalPrice = priceWithCoupon;
          logger.debug(`💰 Preço final com cupom: R$ ${currentPrice} → R$ ${finalPrice.toFixed(2)}`);
        }
      } catch (error) {
        logger.warn(`Erro ao calcular preço com cupom: ${error.message}`);
      }
    }

    // Usar preço final (com cupom) ou preço atual
    const priceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(finalPrice);

    const oldPriceFormatted = product.old_price 
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(product.old_price)
      : null;
    
    // Preço original (antes do cupom) se houver cupom
    const originalPriceFormatted = (product.coupon_id && priceWithCoupon) 
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(product.current_price)
      : null;

    const platformName = product.platform === 'mercadolivre' ? 'Mercado Livre' : 
                        product.platform === 'shopee' ? 'Shopee' :
                        product.platform === 'amazon' ? 'Amazon' :
                        product.platform === 'aliexpress' ? 'AliExpress' : 'Geral';
    
    // Buscar categoria se tiver category_id
    let categoryName = 'Geral';
    if (product.category_id) {
      try {
        const Category = (await import('../../models/Category.js')).default;
        const category = await Category.findById(product.category_id);
        if (category) {
          categoryName = category.name;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar categoria: ${error.message}`);
      }
    }
    
    // Nome do produto será escapado depois baseado na plataforma
    const productName = product.name || 'Produto sem nome';

    // Preparar seção de cupom se houver
    let couponSection = '';
    if (product.coupon_id) {
      try {
        const coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          const discountText = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : `R$ ${coupon.discount_value.toFixed(2)}`;
          
          couponSection = `\n🎟️ **CUPOM DISPONÍVEL**\n\n`;
          couponSection += `💬 **Código:** \`${coupon.code}\`\n`;
          couponSection += `💰 **Desconto:** ${discountText} OFF\n`;
          
          // Mostrar preço final com cupom se calculado
          if (priceWithCoupon && priceWithCoupon < product.current_price) {
            const finalPriceFormatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(priceWithCoupon);
            couponSection += `\n🔥 **PREÇO FINAL COM CUPOM:** ${finalPriceFormatted}\n`;
            couponSection += `💵 ~~${priceFormatted}~~ → ${finalPriceFormatted}\n`;
          }
          
          if (coupon.min_purchase > 0) {
            // Para cupons de produtos, manter formato completo
            couponSection += `💳 **Compra mínima:** R$ ${coupon.min_purchase.toFixed(2)}\n`;
          }
          
          // Limite máximo de desconto
          if (coupon.max_discount_value > 0) {
            couponSection += `💰 **Limite de desconto:** R$ ${coupon.max_discount_value.toFixed(2)}\n`;
          }
          
          // Limite de usos
          if (coupon.max_uses) {
            couponSection += `📊 **Limite de usos:** ${coupon.current_uses || 0} / ${coupon.max_uses}\n`;
          }
          
          // Aplicabilidade
          if (coupon.is_general) {
            couponSection += `✅ **Válido para todos os produtos**\n`;
          } else {
            const productCount = coupon.applicable_products?.length || 0;
            if (productCount > 0) {
              couponSection += `📦 **Em produtos selecionados** (${productCount} produto${productCount > 1 ? 's' : ''})\n`;
            } else {
              couponSection += `📦 **Em produtos selecionados**\n`;
            }
          }
          
          couponSection += `📅 **Válido até:** ${this.formatDate(coupon.valid_until)}\n`;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom ${product.coupon_id}: ${error.message}`);
      }
    }

    // Informações específicas para Shopee (ofertas/coleções)
    let shopeeOfferInfo = '';
    if (product.platform === 'shopee') {
      const commissionRate = product.commission_rate || 0;
      const offerType = product.offer_type;
      const periodEnd = product.period_end;
      
      if (commissionRate > 0) {
        shopeeOfferInfo = `\n💰 **Comissão:** ${(commissionRate * 100).toFixed(2)}%\n`;
      }
      
      if (offerType === 1) {
        shopeeOfferInfo += `📦 **Tipo:** Coleção de Produtos\n`;
      } else if (offerType === 2) {
        shopeeOfferInfo += `🏷️ **Tipo:** Oferta por Categoria\n`;
      }
      
      if (periodEnd) {
        try {
          // Garantir que periodEnd seja um Date válido
          const endDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
          if (!isNaN(endDate.getTime())) {
            shopeeOfferInfo += `⏰ **Válido até:** ${this.formatDate(endDate)}\n`;
          }
        } catch (error) {
          logger.warn(`Erro ao formatar data de validade da oferta Shopee: ${error.message}`);
        }
      }
      
      shopeeOfferInfo += `\n🔍 **Esta é uma oferta especial da Shopee com múltiplos produtos!**\n`;
      shopeeOfferInfo += `Clique no link para ver todos os produtos disponíveis.\n`;
    }

    // Preparar variáveis adicionais para cupom se houver
    let couponCode = '';
    let couponDiscount = '';
    
    // Buscar cupom se houver coupon_id
    let coupon = null;
    if (product.coupon_id) {
      try {
        coupon = await Coupon.findById(product.coupon_id);
        if (coupon && coupon.is_active) {
          couponCode = coupon.code || '';
          const discountText = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}% OFF`
            : `R$ ${coupon.discount_value.toFixed(2)} OFF`;
          couponDiscount = discountText;
        }
      } catch (error) {
        logger.warn(`Erro ao buscar cupom para variáveis: ${error.message}`);
      }
    }

    return {
      product_name: productName,
      current_price: priceFormatted, // Preço final (com cupom se houver)
      original_price: originalPriceFormatted || priceFormatted, // Preço antes do cupom
      old_price: oldPriceFormatted ? ` ~~${oldPriceFormatted}~~` : '',
      discount_percentage: product.discount_percentage || 0,
      platform_name: platformName,
      category_name: categoryName,
      affiliate_link: product.affiliate_link || 'Link não disponível',
      coupon_section: couponSection,
      shopee_offer_info: shopeeOfferInfo,
      is_shopee_offer: product.platform === 'shopee' ? 'true' : 'false',
      final_price: priceFormatted, // Preço final com cupom aplicado
      price_with_coupon: priceWithCoupon ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(priceWithCoupon) : null,
      coupon_code: couponCode,
      coupon_discount: couponDiscount
    };
  }

  /**
   * Preparar variáveis para template de cupom
   * @param {Object} coupon - Dados do cupom
   * @returns {Object}
   */
  prepareCouponVariables(coupon) {
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    const platformName = this.getPlatformName(coupon.platform);
    
    // Verificar se é cupom capturado do Telegram
    const isTelegramCaptured = coupon.capture_source === 'telegram' || coupon.auto_captured === true;
    
    // Compra mínima - IMPORTANTE: retornar apenas o valor formatado, sem emoji e texto
    // A IA vai adicionar o emoji e texto "Compra mínima:" no template
    const minPurchase = coupon.min_purchase > 0
      ? `R$ ${coupon.min_purchase.toFixed(2)}`
      : '';

    // Limite máximo de desconto
    const maxDiscount = coupon.max_discount_value > 0
      ? `💰 **Limite de desconto:** R$ ${coupon.max_discount_value.toFixed(2)}\n`
      : '';

    // Limite de usos (não incluir para cupons do Telegram)
    const usageLimit = (!isTelegramCaptured && coupon.max_uses)
      ? `📊 **Limite de usos:** ${coupon.current_uses || 0} / ${coupon.max_uses}\n`
      : '';

    // Aplicabilidade (não incluir para cupons do Telegram)
    let applicability = '';
    if (!isTelegramCaptured) {
      if (coupon.is_general) {
        applicability = '✅ **Válido para todos os produtos**';
      } else {
        const productCount = coupon.applicable_products?.length || 0;
        if (productCount > 0) {
          applicability = `📦 **Em produtos selecionados** (${productCount} produto${productCount > 1 ? 's' : ''})`;
        } else {
          applicability = '📦 **Em produtos selecionados**';
        }
      }
    }

    // Para cupons capturados do Telegram: NÃO incluir descrição, link de afiliado e data de validade
    // Incluir: plataforma, código, desconto, compra mínima, limite desconto
    if (isTelegramCaptured) {
      // IMPORTANTE: NÃO incluir data de validade (valid_until) na mensagem do bot
      // A data de validade não deve aparecer nos templates

      return {
        platform_name: platformName,
        coupon_code: coupon.code || 'N/A',
        discount_value: discountText,
        valid_until: '', // NÃO incluir data de validade - deixar vazio
        min_purchase: minPurchase,
        max_discount: maxDiscount,
        usage_limit: '', // NÃO incluir limite de usos
        applicability: '', // NÃO incluir aplicabilidade
        coupon_title: '', // NÃO incluir título
        coupon_description: '', // NÃO incluir descrição
        affiliate_link: '' // NÃO incluir link de afiliado
      };
    }

    // Para cupons normais: incluir tudo
    return {
      platform_name: platformName,
      coupon_code: coupon.code || 'N/A',
      discount_value: discountText,
      valid_until: '', // IMPORTANTE: NÃO incluir data de validade na mensagem do bot
      min_purchase: minPurchase,
      max_discount: maxDiscount,
      usage_limit: usageLimit,
      applicability: applicability,
      coupon_title: coupon.title || coupon.description || 'Cupom de Desconto',
      coupon_description: coupon.description ? `\n${coupon.description}\n` : '',
      affiliate_link: coupon.affiliate_link || 'Link não disponível'
    };
  }

  /**
   * Preparar variáveis para template de cupom expirado
   * @param {Object} coupon - Dados do cupom
   * @returns {Object}
   */
  prepareExpiredCouponVariables(coupon) {
    const platformName = this.getPlatformName(coupon.platform);

    return {
      platform_name: platformName,
      coupon_code: coupon.code || 'N/A',
      expired_date: this.formatDate(coupon.valid_until)
    };
  }

  /**
   * Converter formatação de texto baseado na plataforma e parse_mode
   * Telegram MarkdownV2: *texto* = negrito, ~texto~ = riscado
   * Telegram HTML: <b>texto</b> = negrito, <s>texto</s> = riscado
   * Telegram Markdown (legado): *texto* = negrito, _texto_ = itálico (não suporta riscado)
   * WhatsApp: *texto* = negrito, ~texto~ = riscado
   * @param {string} message - Mensagem com formatação
   * @param {string} platform - Plataforma (telegram, whatsapp)
   * @param {string} parseMode - Parse mode do Telegram (Markdown, MarkdownV2, HTML) - opcional
   * @returns {string}
   */
  convertBoldFormatting(message, platform, parseMode = 'MarkdownV2') {
    if (!message) return '';
    
    // Proteger código dentro de backticks
    const codeBlocks = [];
    let codeIndex = 0;
    
    // Substituir código por placeholders temporários
    message = message.replace(/`([^`]+)`/g, (match, content) => {
      const placeholder = `__CODE_BLOCK_${codeIndex}__`;
      // Armazenar o conteúdo e o formato original
      codeBlocks[codeIndex] = {
        original: match,
        content: content
      };
      codeIndex++;
      return placeholder;
    });
    
    if (platform === 'whatsapp') {
      // Converter **texto** para *texto* - negrito
      message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      
      // Converter ~~texto~~ para ~texto~ - riscado
      message = message.replace(/~~([^~]+?)~~/g, '~$1~');
      
    } else if (platform === 'telegram') {
      // Converter negrito: **texto** para formato correto
      if (parseMode === 'HTML') {
        // HTML: <b>texto</b> para negrito
        // IMPORTANTE: Converter **texto** para <b>texto</b>
        // Processar em múltiplas passadas para garantir conversão completa
        
        // Primeiro, converter **texto** (duplo asterisco) - mais comum
        // Usar regex global para capturar todas as ocorrências
        let previousMessage = '';
        let iterations = 0;
        const maxIterations = 10; // Prevenir loop infinito
        
        // Converter todas as ocorrências de **texto**
        while (message !== previousMessage && iterations < maxIterations) {
          previousMessage = message;
          message = message.replace(/\*\*([^*]+?)\*\*/g, (match, content) => {
            // Escapar caracteres HTML especiais dentro do conteúdo
            const escaped = content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<b>${escaped}</b>`;
          });
          iterations++;
        }
        
        // Depois, converter *texto* (asterisco simples) que não foi capturado
        // Mas apenas se não estiver dentro de uma tag HTML já existente
        message = message.replace(/\*([^*\n<]+?)\*/g, (match, content) => {
          // Verificar se não está dentro de uma tag HTML (não contém < ou >)
          if (!match.includes('<') && !match.includes('>') && !match.includes('&lt;') && !match.includes('&gt;')) {
            const escaped = content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<b>${escaped}</b>`;
          }
          return match; // Manter original se já está em HTML
        });
        
        logger.debug(`📋 Conversão Markdown→HTML concluída (${iterations} iterações)`);
      } else if (parseMode === 'MarkdownV2') {
        // MarkdownV2: *texto* para negrito
        message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      } else {
        // Markdown (legado): *texto* para negrito
        message = message.replace(/\*\*([^*]+?)\*\*/g, '*$1*');
      }
      
      // Converter riscado: ~~texto~~ para formato correto
      if (parseMode === 'HTML') {
        // HTML: <s>texto</s> para riscado
        // IMPORTANTE: Processar ~~texto~~ (dois tildes) primeiro, depois ~texto~ (um tilde)
        // Usar múltiplas passadas para garantir conversão completa
        
        let previousMessage = '';
        let iterations = 0;
        const maxIterations = 10;
        
        // Converter todas as ocorrências de ~~texto~~ (dois tildes)
        // Padrão melhorado: captura qualquer conteúdo entre ~~, incluindo parênteses, vírgulas, etc.
        while (message !== previousMessage && iterations < maxIterations) {
          previousMessage = message;
          // Padrão: ~~ seguido de qualquer conteúdo (incluindo espaços, números, vírgulas, parênteses), seguido de ~~
          // Usar [\s\S]*? para capturar qualquer caractere incluindo quebras de linha (non-greedy)
          // IMPORTANTE: Não capturar se já está dentro de tags HTML
          message = message.replace(/~~([\s\S]*?)~~/g, (match, content) => {
            // Não processar se já está dentro de tags HTML
            if (content.includes('<') || content.includes('>') || content.includes('&lt;') || content.includes('&gt;')) {
              return match; // Manter como está
            }
            // Não processar se está vazio ou só tem espaços
            if (!content || content.trim().length === 0) {
              return match; // Manter como está
            }
            // Verificar se não está dentro de uma tag <s> já existente (evitar duplicação)
            if (message.includes(`<s>${content}</s>`)) {
              return match; // Já foi processado
            }
            // Escapar caracteres HTML especiais
            const escaped = content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<s>${escaped}</s>`;
          });
          iterations++;
        }
        
        logger.debug(`📋 Conversão strikethrough ~~texto~~ → <s>texto</s> concluída (${iterations} iterações)`);
        
        // Processar padrões mal formatados como "(de ~~R$ 252,00~~)" ou "(de R$ 252,00~~)"
        // Corrigir casos onde há ~~ mas o padrão não foi capturado corretamente
        // Padrão 1: "(de ~~R$ 252,00~~)" - já tem os tildes corretos, mas pode não ter sido capturado
        message = message.replace(/(\(de\s+)(~~)([^~]+?)(~~\))/g, (match, prefix, openTildes, price, suffix) => {
          if (price.includes('<') || price.includes('>')) {
            return match;
          }
          const escaped = price
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `${prefix}<s>${escaped}</s>)`;
        });
        
        // Padrão 2: "(de  ~~R$ 252,00~~)" - com espaço extra entre "de" e "~~"
        message = message.replace(/(\(de\s+)(\s*~~)([^~]+?)(~~\))/g, (match, prefix, spacesAndTildes, price, suffix) => {
          if (price.includes('<') || price.includes('>')) {
            return match;
          }
          const escaped = price
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `${prefix}<s>${escaped}</s>)`;
        });
        
        // Padrão 3: "(de R$ 252,00~~)" - tildes apenas no final
        message = message.replace(/(\(de\s+)([^~]+?)(~~\))/g, (match, prefix, price, suffix) => {
          if (price.includes('<') || price.includes('>')) {
            return match;
          }
          const escaped = price
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `${prefix}<s>${escaped}</s>)`;
        });
        
        // Padrão 4: "~~R$ 252,00~~)" - tildes no início e no final com parêntese
        message = message.replace(/(~~)([^~]+?)(~~\))/g, (match, prefix, content, suffix) => {
          if (content.includes('<') || content.includes('>')) {
            return match;
          }
          const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<s>${escaped}</s>)`;
        });
        
        // Padrão 5: Corrigir casos onde há tildes soltos no final como "R$ 252,00~~)"
        // Isso pode acontecer se a variável foi substituída incorretamente
        message = message.replace(/([R$]\s*[\d.,]+?)(~~\))/g, (match, price, suffix) => {
          // Se o preço não está dentro de uma tag <s>, converter
          if (!message.includes(`<s>${price}</s>`)) {
            const escaped = price
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<s>${escaped}</s>)`;
          }
          return match;
        });
        
        // Padrão 6: Corrigir casos onde há " ~~R$ 252,00~~)" (com espaço antes dos tildes)
        // Isso acontece quando a variável old_price é substituída e tem espaço antes
        message = message.replace(/(\s+)(~~)([^~]+?)(~~\))/g, (match, spaces, openTildes, content, suffix) => {
          // Verificar se não está dentro de tags HTML
          if (content.includes('<') || content.includes('>')) {
            return match;
          }
          // Verificar se não está dentro de uma tag <s> já existente
          if (message.includes(`<s>${content}</s>`)) {
            return match;
          }
          const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `${spaces}<s>${escaped}</s>)`;
        });
        
        // Processar ~texto~ (um tilde) apenas se não foi processado acima e não está dentro de tags HTML
        message = message.replace(/(?<!~)~([^~\n<]+?)~(?!~)/g, (match, content) => {
          // Verificar se não está dentro de tags HTML
          if (content.includes('<') || content.includes('>') || content.includes('&lt;') || content.includes('&gt;')) {
            return match; // Manter como está
          }
          // Verificar se não está dentro de uma tag <s> já existente
          if (message.includes(`<s>${content}</s>`)) {
            return match; // Já foi processado
          }
          const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<s>${escaped}</s>`;
        });
      } else if (parseMode === 'MarkdownV2') {
        // MarkdownV2: ~texto~ para riscado (não ~~texto~~)
        // Converter ~~texto~~ para ~texto~
        message = message.replace(/~~([^~]+?)~~/g, '~$1~');
      } else {
        // Markdown (legado): não suporta riscado, remover formatação mas manter texto
        message = message.replace(/~~([^~]+?)~~/g, '$1');
        message = message.replace(/~([^~\n]+?)~/g, '$1');
      }
    }
    // Se platform for 'all', manter como está (será convertido quando usado)
    
    // Restaurar código com formatação correta baseada no parse_mode
    codeBlocks.forEach((codeBlock, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      let restoredCode;
      
      if (platform === 'telegram' && parseMode === 'HTML') {
        // HTML: converter backticks para <code>texto</code>
        const escapedContent = codeBlock.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        restoredCode = `<code>${escapedContent}</code>`;
      } else if (platform === 'telegram' && parseMode === 'MarkdownV2') {
        // MarkdownV2: manter backticks mas escapar caracteres especiais dentro
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
        // Markdown (legado) ou WhatsApp: manter backticks originais
        restoredCode = codeBlock.original;
      }
      
      message = message.replace(placeholder, restoredCode);
    });
    
    return message;
  }

  /**
   * Garantir que HTML está válido para Telegram
   * Escapa apenas caracteres especiais no conteúdo, mantendo tags HTML intactas
   * IMPORTANTE: Preservar o template exatamente como configurado, apenas fazer escape mínimo necessário
   * @param {string} message - Mensagem com HTML
   * @returns {string}
   */
  ensureValidHtml(message) {
    if (!message) return '';
    
    // IMPORTANTE: Se a mensagem já contém tags HTML válidas e não tem entidades escapadas,
    // retornar como está (não fazer escape desnecessário)
    
    // Verificar se já tem tags HTML válidas (sem entidades escapadas)
    const hasValidHtmlTags = /<[bisu]>(.*?)<\/[bisu]>/gi.test(message) || 
                             /<code>(.*?)<\/code>/gi.test(message) ||
                             /<pre>(.*?)<\/pre>/gi.test(message);
    
    // Verificar se já tem entidades escapadas (indica que já foi processado)
    const hasEscapedEntities = /&lt;|&gt;|&amp;/.test(message);
    
    // Se tem HTML válido e não tem entidades escapadas, retornar como está
    if (hasValidHtmlTags && !hasEscapedEntities) {
      logger.debug(`📋 HTML já está válido e não escapado, preservando template original`);
      return message;
    }
    
    // Se já tem entidades escapadas, pode ser que esteja duplamente escapado
    // Tentar decodificar primeiro
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
      
      // Se conseguiu decodificar, retornar
      if (decoded !== message) {
        logger.info(`✅ HTML decodificado com sucesso`);
        return decoded;
      }
    }
    
    // Para HTML do Telegram, precisamos escapar apenas &, <, > no conteúdo
    // Mas manter as tags HTML intactas
    // Estratégia: proteger tags HTML, escapar conteúdo, restaurar tags
    
    const tagPlaceholders = [];
    let placeholderIndex = 0;
    
    // Proteger todas as tags HTML (abertas e fechadas)
    let protectedMessage = message.replace(/<[^>]+>/g, (match) => {
      const placeholder = `__HTML_TAG_${placeholderIndex}__`;
      tagPlaceholders.push({ placeholder, tag: match });
      placeholderIndex++;
      return placeholder;
    });
    
    // Escapar apenas caracteres & que não são entidades HTML já válidas
    // Não escapar < e > pois já estão protegidos nas tags
    protectedMessage = protectedMessage.replace(/&(?!(amp|lt|gt|quot|#39|#x[0-9a-fA-F]+);)/g, '&amp;');
    
    // Restaurar tags HTML
    tagPlaceholders.forEach(({ placeholder, tag }) => {
      protectedMessage = protectedMessage.replace(placeholder, tag);
    });
    
    // Se a mensagem não mudou (exceto por & escapados), significa que já estava bem formatada
    if (protectedMessage === message || protectedMessage.replace(/&amp;/g, '&') === message) {
      logger.debug(`📋 HTML já está válido, preservando template original`);
      return message;
    }
    
    return protectedMessage;
  }

  /**
   * Converter HTML para formato específico (Markdown/MarkdownV2)
   * @param {string} message - Mensagem com HTML
   * @param {string} targetFormat - Formato alvo (Markdown, MarkdownV2)
   * @returns {string}
   */
  convertHtmlToFormat(message, targetFormat) {
    if (!message) return '';
    
    // Converter <b>texto</b> para **texto** ou *texto*
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
   * Mas não dentro de entidades de formatação (*texto*, ~texto~, etc)
   * @param {string} message - Mensagem para escapar
   * @returns {string}
   */
  escapeMarkdownV2(message) {
    if (!message) return '';
    
    // Caracteres que precisam ser escapados no MarkdownV2
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    
    // Proteger entidades de formatação (negrito, riscado, código, links)
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
    
    // Escapar caracteres especiais no resto do texto
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
   * @param {string} text - Texto para escapar
   * @param {string} platform - Plataforma (telegram, whatsapp) - opcional
   * @returns {string}
   */
  escapeMarkdown(text, platform = 'telegram') {
    if (!text) return '';
    
    // Para WhatsApp, não escapar asteriscos simples (usados para negrito)
    // Para Telegram, não escapar asteriscos duplos (usados para negrito)
    let escaped = String(text);
    
    if (platform === 'whatsapp') {
      // Escapar apenas asteriscos duplos e outros caracteres especiais
      // Manter asteriscos simples para negrito
      escaped = escaped
        .replace(/\*\*/g, '\\*\\*') // Escapar **
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
      // Telegram: escapar todos os asteriscos simples, mas não duplos (usados para negrito)
      // Isso é mais complexo, então vamos escapar tudo e depois restaurar **
      escaped = escaped
        .replace(/\*\*/g, '___DOUBLE_ASTERISK___') // Temporariamente substituir **
        .replace(/\*/g, '\\*') // Escapar todos os *
        .replace(/___DOUBLE_ASTERISK___/g, '**') // Restaurar **
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

  /**
   * Formatar data
   * @param {string|Date} date - Data para formatar
   * @returns {string}
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
   * @param {string} platform - Código da plataforma
   * @returns {string}
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
   * @param {string} templateType - Tipo do template
   * @returns {Promise<string>} - 'default', 'custom', ou 'ai_advanced'
   */
  async getTemplateMode(templateType) {
    try {
      const AppSettings = (await import('../../models/AppSettings.js')).default;
      const settings = await AppSettings.get();
      
      // Mapear tipo de template para campo de configuração
      const modeMap = {
        'new_promotion': settings.template_mode_promotion || 'custom',
        'promotion_with_coupon': settings.template_mode_promotion_coupon || 'custom',
        'new_coupon': settings.template_mode_coupon || 'custom',
        'expired_coupon': settings.template_mode_expired_coupon || 'custom'
      };
      
      return modeMap[templateType] || 'custom';
    } catch (error) {
      logger.warn(`Erro ao buscar modo de template, usando 'custom': ${error.message}`);
      return 'custom';
    }
  }

  /**
   * Template padrão caso não encontre template customizado
   * @param {string} templateType - Tipo do template
   * @param {Object} variables - Variáveis
   * @returns {string}
   */
  getDefaultTemplate(templateType, variables, platform = 'telegram') {
    // Usar ** para negrito (será convertido automaticamente para WhatsApp)
    switch (templateType) {
      case 'new_promotion':
        // Template específico para Shopee (ofertas/coleções)
        if (variables.is_shopee_offer === 'true') {
          return `🛍️ **OFERTA ESPECIAL SHOPEE**\n\n📦 **${variables.product_name || 'Oferta Shopee'}**\n\n${variables.shopee_offer_info || ''}\n🔗 **Acesse a oferta:**\n${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Explore todos os produtos disponíveis nesta oferta!`;
        }
        // Template padrão para outras plataformas (SEM CUPOM)
        return `🔥 **NOVA PROMOÇÃO AUTOMÁTICA**\n\n📦 ${variables.product_name || 'Produto'}\n\n💰 **${variables.current_price || 'R$ 0,00'}**${variables.old_price || ''}\n🏷️ **${variables.discount_percentage || 0}% OFF**\n\n🛒 Plataforma: ${variables.platform_name || 'N/A'}\n\n🔗 ${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Aproveite antes que acabe!`;
      
      case 'promotion_with_coupon':
        // Template padrão para promoção COM CUPOM
        return `🔥 **PROMOÇÃO + CUPOM!**\n\n📦 ${variables.product_name || 'Produto'}\n\n💰 **Preço:** ${variables.original_price || variables.current_price || 'R$ 0,00'}\n🎟️ **Com Cupom:** ${variables.final_price || variables.current_price || 'R$ 0,00'}\n${variables.old_price || ''}\n🏷️ **${variables.discount_percentage || 0}% OFF**\n\n${variables.coupon_section || ''}\n\n🛒 Plataforma: ${variables.platform_name || 'N/A'}\n\n🔗 ${variables.affiliate_link || 'Link não disponível'}\n\n⚡ Economia dupla! Aproveite agora!`;
      
      case 'new_coupon':
        // Se não tem descrição nem data de validade, é cupom capturado do Telegram
        // Usar template simplificado apenas com: plataforma, código, compra mínima, limite desconto
        // SEM link de afiliado
        if (!variables.coupon_description && !variables.valid_until) {
          // Template simplificado e limpo para cupons do Telegram (formato padronizado)
        // Seguindo o formato especificado: 🎟️ CUPOM DISPONÍVEL
        let message = `🎟️ **CUPOM DISPONÍVEL**\n\n`;
        message += `**Código:** ${variables.coupon_code || 'N/A'}\n`;
        message += `**Plataforma:** ${variables.platform_name || 'N/A'}\n`;
        message += `**Desconto:** ${variables.discount_value || 'N/A'}\n`;
        if (variables.min_purchase) {
          // min_purchase agora contém apenas o valor (R$ X.XX), adicionar emoji e texto
          message += `💳 **Compra mínima:** ${variables.min_purchase}\n`;
        }
        // IMPORTANTE: NÃO incluir aviso de expiração ou data de validade na mensagem do bot
        // message += `\n⚠️ **Sujeito à expiração**\n`;
        return message;
        }
        // Template completo para cupons normais
        let fullMessage = `🎟️ **NOVO CUPOM DISPONÍVEL!**\n\n`;
        fullMessage += `🏪 **Plataforma:** ${variables.platform_name || 'N/A'}\n`;
        fullMessage += `💬 **Código:** \`${variables.coupon_code || 'N/A'}\`\n`;
        fullMessage += `💰 **Desconto:** ${variables.discount_value || 'N/A'} OFF\n`;
        if (variables.min_purchase) {
          // min_purchase agora contém apenas o valor (R$ X.XX), adicionar emoji e texto
          fullMessage += `💳 **Compra mínima:** ${variables.min_purchase}\n`;
        }
        if (variables.max_discount) fullMessage += `${variables.max_discount}`;
        if (variables.applicability) fullMessage += `\n${variables.applicability}\n`;
        if (variables.coupon_title) fullMessage += `\n📝 **${variables.coupon_title}**\n`;
        if (variables.coupon_description) fullMessage += `${variables.coupon_description}\n`;
        // IMPORTANTE: NÃO incluir data de validade (valid_until) na mensagem do bot
        // if (variables.valid_until) fullMessage += `\n📅 **Válido até:** ${variables.valid_until}\n`;
        if (variables.affiliate_link) fullMessage += `\n🔗 ${variables.affiliate_link}\n`;
        fullMessage += `\n⚡ Use agora e economize!`;
        return fullMessage;
      
      case 'expired_coupon':
        return `⚠️ **CUPOM EXPIROU**\n\n🏪 Plataforma: ${variables.platform_name || 'N/A'}\n💬 Código: \`${variables.coupon_code || 'N/A'}\`\n📅 Expirado em: ${variables.expired_date || 'N/A'}\n\n😔 Infelizmente este cupom não está mais disponível.\n🔔 Fique atento às próximas promoções!`;
      
      default:
        return 'Mensagem não configurada';
    }
  }
}

export default new TemplateRenderer();


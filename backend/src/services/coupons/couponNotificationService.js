import logger from '../../config/logger.js';
import notificationDispatcher from '../bots/notificationDispatcher.js';
import templateRenderer from '../bots/templateRenderer.js';
import imageGenerator from '../bots/imageGenerator.js';
import Notification from '../../models/Notification.js';
import supabase from '../../config/database.js';
import AppSettings from '../../models/AppSettings.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CouponNotificationService {
  /**
   * Formatar mensagem de novo cupom
   */
  formatNewCouponMessage(coupon) {
    const emoji = this.getPlatformEmoji(coupon.platform);
    const discount = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    return `
🔥 *CUPOM NOVO DISPONÍVEL* 🔥

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
💰 *Desconto:* ${discount} OFF
📅 *Válido até:* ${this.formatDate(coupon.valid_until)}
${coupon.min_purchase > 0 ? `💳 *Compra mínima:* R$ ${coupon.min_purchase.toFixed(2)}` : ''}

📝 *${coupon.title}*
${coupon.description ? `\n${coupon.description}` : ''}

👉 *Link com desconto:*
${coupon.affiliate_link || 'Link não disponível'}

⚡ Aproveite antes que expire!
    `.trim();
  }

  /**
   * Formatar mensagem de cupom expirado
   */
  formatExpiredCouponMessage(coupon) {
    const emoji = this.getPlatformEmoji(coupon.platform);

    return `
⚠️ *CUPOM EXPIROU* ⚠️

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
📅 *Expirado em:* ${this.formatDate(coupon.valid_until)}

😢 Infelizmente este cupom não está mais disponível.
Fique de olho para novos cupons!
    `.trim();
  }

  /**
   * Formatar mensagem de cupom expirando
   */
  formatExpiringCouponMessage(coupon, daysLeft) {
    const emoji = this.getPlatformEmoji(coupon.platform);
    const discount = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    return `
⏰ *CUPOM EXPIRANDO EM ${daysLeft} DIA(S)* ⏰

${emoji} *Plataforma:* ${this.getPlatformName(coupon.platform)}
🎟️ *Cupom:* \`${coupon.code}\`
💰 *Desconto:* ${discount} OFF
📅 *Expira em:* ${this.formatDate(coupon.valid_until)}

👉 *Link:*
${coupon.affiliate_link || 'Link não disponível'}

⚡ Última chance! Não perca!
    `.trim();
  }

  /**
   * Notificar novo cupom (com imagem)
   */
  async notifyNewCoupon(coupon) {
    try {
      logger.info(`📢 ========== NOTIFICAÇÃO DE NOVO CUPOM ==========`);
      logger.info(`   Cupom: ${coupon.code}`);
      logger.info(`   Plataforma: ${coupon.platform}`);
      logger.info(`   ID: ${coupon.id}`);

      // Preparar variáveis do template
      logger.debug(`   Preparando variáveis do template...`);
      const variables = templateRenderer.prepareCouponVariables(coupon);
      logger.debug(`   Variáveis preparadas: ${Object.keys(variables).join(', ')}`);
      logger.debug(`   Código do cupom: ${variables.coupon_code}`);

      // Preparar contextData para IA ADVANCED
      const contextData = { coupon };
      
      // Renderizar templates para cada plataforma
      logger.debug(`   Renderizando templates...`);
      let whatsappMessage = await templateRenderer.render('new_coupon', 'whatsapp', variables, contextData);
      let telegramMessage = await templateRenderer.render('new_coupon', 'telegram', variables, contextData);
      logger.info(`   Templates renderizados (WhatsApp: ${whatsappMessage.length} chars, Telegram: ${telegramMessage.length} chars)`);
      
      // IMPORTANTE: Garantir que o código do cupom esteja formatado para cópia fácil no Telegram
      // Se não estiver formatado com backticks ou <code>, formatar agora
      const couponCode = variables.coupon_code || coupon.code || '';
      if (couponCode && couponCode !== 'N/A') {
        // Verificar se já está formatado
        const hasCodeFormat = telegramMessage.includes(`\`${couponCode}\``) || 
                             telegramMessage.includes(`<code>${couponCode}</code>`) ||
                             telegramMessage.match(new RegExp(`[<\\\`]${couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[>\\\`]`));
        
        if (!hasCodeFormat) {
          logger.info(`📝 Formatando código do cupom para facilitar cópia no Telegram`);
          // Substituir código sem formatação por código formatado
          // Usar regex para encontrar o código mesmo com espaços ou pontuação ao redor
          const escapedCode = couponCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const codeRegex = new RegExp(`\\b${escapedCode}\\b`, 'g');
          telegramMessage = telegramMessage.replace(codeRegex, `<code>${couponCode}</code>`);
          logger.info(`   ✅ Código formatado: <code>${couponCode}</code>`);
        } else {
          logger.debug(`   ✅ Código do cupom já está formatado corretamente`);
        }
      }

      // IMPORTANTE: Sempre usar logo da plataforma quando disponível (similar ao produto)
      let imageToSend = null;
      let imageUrlForWhatsApp = null;
      let usePlatformLogo = false;
      
      // Verificar se a plataforma tem logo padrão
      const platformLogos = {
        mercadolivre: 'mercadolivre-logo.png',
        shopee: 'shopee-logo.png',
        aliexpress: 'aliexpress-logo.png',
        amazon: 'amazon-logo.png'
      };
      
      const logoFileName = platformLogos[coupon.platform];
      
      if (logoFileName) {
        // SEMPRE tentar usar logo da plataforma primeiro (similar ao produto)
        // Caminho correto: __dirname = backend/src/services/coupons
        // Logo está em: backend/assets/logos
        // Então: ../../../assets/logos (sobe 3 níveis: coupons -> services -> src -> backend, depois assets/logos)
        // IMPORTANTE: Usar path.resolve() para garantir caminho absoluto
        const logoPath = path.join(__dirname, '../../../assets/logos', logoFileName);
        // Resolver para caminho absoluto (resolve .. corretamente)
        const absoluteLogoPath = path.resolve(logoPath);
        
        logger.info(`🔍 ========== BUSCANDO LOGO DA PLATAFORMA ==========`);
        logger.info(`   Plataforma: ${coupon.platform}`);
        logger.info(`   Logo filename: ${logoFileName}`);
        logger.info(`   __dirname: ${__dirname}`);
        logger.info(`   Caminho relativo: ${logoPath}`);
        logger.info(`   Caminho absoluto: ${absoluteLogoPath}`);
        
        try {
          // Verificar se o arquivo existe usando caminho absoluto
          logger.info(`   Verificando existência do arquivo...`);
          await fs.access(absoluteLogoPath);
          logger.info(`   ✅ Arquivo existe e está acessível`);
          
          // Verificar se é realmente um arquivo
          const stats = await fs.stat(absoluteLogoPath);
          if (!stats.isFile()) {
            throw new Error(`Caminho não é um arquivo: ${absoluteLogoPath}`);
          }
          
          if (stats.size === 0) {
            throw new Error(`Arquivo está vazio: ${absoluteLogoPath}`);
          }
          
          logger.info(`   ✅ Arquivo válido encontrado: ${stats.size} bytes`);
          logger.info(`   ✅ Logo da plataforma será enviado com a mensagem`);
          logger.info(`   ✅ Caminho final que será usado: ${absoluteLogoPath}`);
          
          // IMPORTANTE: Usar caminho absoluto para garantir que funcione
          imageToSend = absoluteLogoPath;
          usePlatformLogo = true;
          
          // Para WhatsApp, precisamos de uma URL HTTP
          // Obter backend_url das configurações
          try {
            const settings = await AppSettings.get();
            logger.debug(`   Configurações carregadas: backend_url = ${settings.backend_url || 'NÃO DEFINIDO'}`);
            
            // Tentar múltiplas fontes para backend_url
            let backendUrl = settings.backend_url;
            if (!backendUrl) {
              backendUrl = process.env.BACKEND_URL;
            }
            if (!backendUrl) {
              backendUrl = process.env.API_URL;
            }
            if (!backendUrl) {
              // Último recurso: usar localhost com porta padrão
              backendUrl = 'http://localhost:3000';
              logger.warn(`⚠️ backend_url não configurado, usando padrão: ${backendUrl}`);
            }
            
            // Remover barra final se houver
            const cleanBackendUrl = backendUrl.replace(/\/$/, '');
            imageUrlForWhatsApp = `${cleanBackendUrl}/assets/logos/${logoFileName}`;
            
            logger.info(`✅ URL HTTP gerada para WhatsApp: ${imageUrlForWhatsApp}`);
            
            // Validar URL
            try {
              const urlObj = new URL(imageUrlForWhatsApp);
              logger.info(`✅ URL válida: protocol=${urlObj.protocol}, host=${urlObj.host}, path=${urlObj.pathname}`);
            } catch (urlError) {
              logger.error(`❌ URL inválida: ${imageUrlForWhatsApp}`);
              logger.error(`   Erro: ${urlError.message}`);
              throw new Error(`URL inválida gerada: ${imageUrlForWhatsApp}`);
            }
          } catch (urlError) {
            logger.error(`❌ Erro ao gerar URL HTTP: ${urlError.message}`);
            logger.error(`   Stack: ${urlError.stack}`);
            // Continuar com caminho local - Telegram pode usar, WhatsApp vai tentar
            imageUrlForWhatsApp = null;
          }
          
            const platformName = coupon.platform === 'mercadolivre' ? 'Mercado Livre' : 
                                coupon.platform === 'shopee' ? 'Shopee' : 
                                coupon.platform === 'aliexpress' ? 'AliExpress' : 
                                coupon.platform === 'amazon' ? 'Amazon' : coupon.platform;
          logger.info(`✅ ========== LOGO ENCONTRADO E CONFIGURADO ==========`);
          logger.info(`   Plataforma: ${platformName}`);
          logger.info(`   Caminho absoluto (Telegram): ${absoluteLogoPath}`);
          logger.info(`   URL HTTP (WhatsApp): ${imageUrlForWhatsApp || 'NÃO GERADA'}`);
          logger.info(`   Tamanho do arquivo: ${stats.size} bytes`);
          logger.info(`   imageToSend definido: ${imageToSend ? 'SIM' : 'NÃO'}`);
          logger.info(`   usePlatformLogo: ${usePlatformLogo}`);
        } catch (logoError) {
          logger.error(`❌ ========== ERRO AO BUSCAR LOGO ==========`);
          logger.error(`   Plataforma: ${coupon.platform}`);
          logger.error(`   Logo filename: ${logoFileName}`);
          logger.error(`   Caminho absoluto tentado: ${absoluteLogoPath}`);
          logger.error(`   Erro: ${logoError.message}`);
          logger.error(`   Stack: ${logoError.stack}`);
          
          // Tentar caminho alternativo: verificar se existe em diferentes locais
          const alternativePaths = [
            path.resolve(process.cwd(), 'assets/logos', logoFileName),
            path.resolve(process.cwd(), 'backend/assets/logos', logoFileName),
            path.resolve(__dirname, '../../../assets/logos', logoFileName),
            path.resolve(__dirname, '../../../../assets/logos', logoFileName)
          ];
          
          logger.info(`   Tentando caminhos alternativos...`);
          for (const altPath of alternativePaths) {
            const resolvedAltPath = path.resolve(altPath);
            try {
              logger.info(`   Tentando: ${resolvedAltPath}`);
              await fs.access(resolvedAltPath);
              const altStats = await fs.stat(resolvedAltPath);
              if (altStats.isFile() && altStats.size > 0) {
                logger.info(`   ✅ Logo encontrado em caminho alternativo: ${resolvedAltPath}`);
                imageToSend = resolvedAltPath; // Usar caminho absoluto
                usePlatformLogo = true;
                break;
              }
            } catch (altError) {
              logger.debug(`   Caminho alternativo não encontrado: ${resolvedAltPath}`);
            }
          }
          
          if (!imageToSend) {
            logger.error(`   ❌ Logo não encontrado em nenhum caminho tentado`);
            logger.error(`   Erro: ${logoError.message}`);
            logger.warn(`   ⚠️ Geração de imagem do cupom DESABILITADA - enviando apenas mensagem sem imagem`);
            
            // DESABILITADO: Não gerar imagem do cupom como fallback
            // Usar apenas logo da plataforma de backend/assets
            imageToSend = null;
            logger.info(`   ℹ️ Enviando mensagem sem imagem (logo da plataforma não encontrada)`);
          }
        }
      } else {
        // Para outras plataformas sem logo padrão, NÃO gerar imagem
        logger.info(`⚠️ Plataforma ${coupon.platform} não tem logo padrão em backend/assets`);
        logger.info(`   ⚠️ Geração de imagem do cupom DESABILITADA - enviando apenas mensagem sem imagem`);
        imageToSend = null;
      }

      // Enviar para WhatsApp
      let whatsappResult = null;
      try {
        logger.info(`📤 Enviando para WhatsApp...`);
        logger.info(`   imageToSend: ${imageToSend || 'NÃO DEFINIDA'}`);
        logger.info(`   usePlatformLogo: ${usePlatformLogo}`);
        logger.info(`   imageUrlForWhatsApp: ${imageUrlForWhatsApp || 'NÃO DEFINIDA'}`);
        
        if (imageToSend) {
          // IMPORTANTE: Sempre enviar imagem COM mensagem como caption (similar ao produto)
          if (usePlatformLogo) {
            // Logo da plataforma
            if (imageUrlForWhatsApp) {
              // Usar URL HTTP para WhatsApp
              logger.info(`📸 Enviando logo da plataforma COM mensagem como caption para WhatsApp (URL HTTP)`);
              logger.info(`   URL da imagem: ${imageUrlForWhatsApp}`);
              logger.info(`   Mensagem length: ${whatsappMessage.length} caracteres`);
              
              whatsappResult = await notificationDispatcher.sendToWhatsAppWithImage(
                whatsappMessage,
                imageUrlForWhatsApp,
                'coupon_new'
              );
              
              logger.info(`✅ Resultado WhatsApp: ${JSON.stringify(whatsappResult)}`);
              
              if (!whatsappResult || !whatsappResult.success) {
                logger.error(`❌ Falha ao enviar imagem para WhatsApp. Resultado: ${JSON.stringify(whatsappResult)}`);
                logger.warn(`⚠️ Tentando enviar apenas mensagem como fallback...`);
                // Fallback: enviar apenas mensagem
                try {
                  whatsappResult = await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_new');
                  logger.info(`✅ Mensagem WhatsApp enviada (sem imagem): ${JSON.stringify(whatsappResult)}`);
                } catch (fallbackError) {
                  logger.error(`❌ Erro no fallback: ${fallbackError.message}`);
                }
              }
            } else {
              // URL não gerada - tentar usar caminho local (pode não funcionar no WhatsApp)
              logger.warn(`⚠️ URL HTTP não disponível, tentando usar caminho local para WhatsApp`);
              logger.info(`   Caminho local: ${imageToSend}`);
              
              whatsappResult = await notificationDispatcher.sendToWhatsAppWithImage(
                whatsappMessage,
                imageToSend,
                'coupon_new'
              );
              
              logger.info(`✅ Resultado WhatsApp: ${JSON.stringify(whatsappResult)}`);
            }
          } else {
            // Outras imagens (geradas) - enviar imagem com mensagem como caption
            logger.info(`📸 Enviando imagem do cupom COM mensagem como caption para WhatsApp`);
            logger.info(`   Caminho da imagem: ${imageToSend}`);
            logger.info(`   Mensagem length: ${whatsappMessage.length} caracteres`);
            
            whatsappResult = await notificationDispatcher.sendToWhatsAppWithImage(
              whatsappMessage,
              imageToSend,
              'coupon_new'
            );
            
            logger.info(`✅ Resultado WhatsApp: ${JSON.stringify(whatsappResult)}`);
            
            if (!whatsappResult || !whatsappResult.success) {
              logger.error(`❌ Falha ao enviar imagem para WhatsApp. Resultado: ${JSON.stringify(whatsappResult)}`);
            }
          }
        } else {
          // Sem imagem - enviar apenas mensagem
          logger.warn(`⚠️ Sem imagem disponível, enviando apenas mensagem para WhatsApp`);
          whatsappResult = await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_new');
          logger.info(`✅ Mensagem WhatsApp enviada: ${JSON.stringify(whatsappResult)}`);
        }
      } catch (error) {
        logger.error(`❌ Erro ao enviar WhatsApp: ${error.message}`);
        logger.error(`   Stack: ${error.stack}`);
        logger.error(`   imageToSend era: ${imageToSend}`);
        logger.error(`   imageUrlForWhatsApp era: ${imageUrlForWhatsApp}`);
      }

      // Enviar para Telegram
      let telegramResult = null;
      try {
        logger.info(`📤 Enviando para Telegram...`);
        logger.info(`   imageToSend: ${imageToSend || 'NÃO DEFINIDA'}`);
        logger.info(`   usePlatformLogo: ${usePlatformLogo}`);
        
        if (imageToSend) {
          // IMPORTANTE: Sempre enviar imagem COM mensagem como caption (similar ao produto)
          logger.info(`📸 ========== ENVIANDO IMAGEM PARA TELEGRAM ==========`);
          logger.info(`   Caminho da imagem: ${imageToSend}`);
          logger.info(`   Caminho absoluto: ${path.resolve(imageToSend)}`);
          logger.info(`   É logo da plataforma: ${usePlatformLogo}`);
          logger.info(`   Mensagem length: ${telegramMessage.length} caracteres`);
          
          // Verificar se arquivo existe antes de enviar (usar caminho absoluto)
          const absoluteImagePath = path.isAbsolute(imageToSend) ? imageToSend : path.resolve(imageToSend);
          try {
            logger.info(`   Verificando acesso ao arquivo: ${absoluteImagePath}`);
            await fs.access(absoluteImagePath);
            const fileStats = await fs.stat(absoluteImagePath);
            logger.info(`   ✅ Arquivo existe e está acessível`);
            logger.info(`   ✅ Tamanho: ${fileStats.size} bytes`);
            logger.info(`   ✅ É arquivo: ${fileStats.isFile()}`);
            
            // Usar caminho absoluto para envio
            const finalImagePath = absoluteImagePath;
            logger.info(`   ✅ Usando caminho final: ${finalImagePath}`);
            
            telegramResult = await notificationDispatcher.sendToTelegramWithImage(
              telegramMessage,
              finalImagePath,
              'coupon_new',
              coupon // Passar dados do cupom para segmentação
            );
          } catch (accessError) {
            logger.error(`   ❌ Arquivo não acessível: ${accessError.message}`);
            logger.error(`   ❌ Caminho tentado: ${absoluteImagePath}`);
            logger.error(`   ❌ Stack: ${accessError.stack}`);
            throw new Error(`Arquivo de imagem não acessível: ${absoluteImagePath}`);
          }
          
          logger.info(`✅ Resultado Telegram: ${JSON.stringify(telegramResult)}`);
          
          if (!telegramResult || !telegramResult.success) {
            logger.error(`❌ Falha ao enviar imagem para Telegram. Resultado: ${JSON.stringify(telegramResult)}`);
            logger.warn(`⚠️ Tentando enviar apenas mensagem como fallback...`);
            // Fallback: enviar apenas mensagem
            try {
              telegramResult = await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_new');
              logger.info(`✅ Mensagem Telegram enviada (sem imagem): ${JSON.stringify(telegramResult)}`);
            } catch (fallbackError) {
              logger.error(`❌ Erro no fallback: ${fallbackError.message}`);
            }
          }
        } else {
          // Sem imagem - enviar apenas mensagem
          logger.warn(`⚠️ Sem imagem disponível, enviando apenas mensagem para Telegram`);
          telegramResult = await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_new');
          logger.info(`✅ Mensagem Telegram enviada: ${JSON.stringify(telegramResult)}`);
        }
      } catch (error) {
        logger.error(`❌ Erro ao enviar Telegram: ${error.message}`);
        logger.error(`   Stack: ${error.stack}`);
        logger.error(`   imageToSend era: ${imageToSend}`);
      }

      // Limpar imagem temporária após envio (apenas se não for o logo permanente)
      // NOTA: Geração de imagem do cupom está desabilitada, então isso não deve ser necessário
      // Mas mantemos para segurança caso alguma imagem temporária seja criada no futuro
      if (imageToSend && !usePlatformLogo) {
        try {
          await fs.unlink(imageToSend);
          logger.debug(`Imagem temporária removida: ${imageToSend}`);
        } catch (cleanupError) {
          logger.warn(`Erro ao remover imagem temporária: ${cleanupError.message}`);
        }
      }

      // Criar notificações push para usuários
      logger.info(`📱 Criando notificações push...`);
      await this.createPushNotifications(coupon, 'new_coupon');
      logger.info(`✅ Notificações push criadas`);

      const result = {
        success: true,
        message: 'Notificações enviadas',
        whatsapp: whatsappResult,
        telegram: telegramResult
      };
      
      logger.info(`✅ ========== NOTIFICAÇÃO CONCLUÍDA ==========`);
      logger.info(`   Resultado: ${JSON.stringify(result)}`);
      
      return result;

    } catch (error) {
      logger.error(`Erro ao notificar novo cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notificar cupom expirado
   */
  async notifyExpiredCoupon(coupon) {
    try {
      logger.info(`📢 Enviando notificação de cupom expirado: ${coupon.code}`);

      // Preparar variáveis do template
      const variables = templateRenderer.prepareExpiredCouponVariables(coupon);

      // Preparar contextData para IA ADVANCED
      const contextData = { coupon };

      // Renderizar templates para cada plataforma
      const whatsappMessage = await templateRenderer.render('expired_coupon', 'whatsapp', variables, contextData);
      const telegramMessage = await templateRenderer.render('expired_coupon', 'telegram', variables, contextData);

      // Enviar para WhatsApp
      try {
        await notificationDispatcher.sendToWhatsApp(whatsappMessage, 'coupon_expired');
        logger.info('✅ Notificação WhatsApp enviada');
      } catch (error) {
        logger.error(`Erro ao enviar WhatsApp: ${error.message}`);
      }

      // Enviar para Telegram
      try {
        await notificationDispatcher.sendToTelegram(telegramMessage, 'coupon_expired');
        logger.info('✅ Notificação Telegram enviada');
      } catch (error) {
        logger.error(`Erro ao enviar Telegram: ${error.message}`);
      }

      return {
        success: true,
        message: 'Notificações enviadas'
      };

    } catch (error) {
      logger.error(`Erro ao notificar cupom expirado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notificar cupom expirando
   */
  async notifyExpiringCoupon(coupon, daysLeft) {
    try {
      logger.info(`📢 Enviando notificação de cupom expirando: ${coupon.code}`);

      const message = this.formatExpiringCouponMessage(coupon, daysLeft);

      // Enviar para bots
      await notificationDispatcher.sendToWhatsApp(message, 'coupon_expiring');
      await notificationDispatcher.sendToTelegram(message, 'coupon_expiring');

      // Criar notificações push
      await this.createPushNotifications(coupon, 'expiring_coupon');

      return {
        success: true,
        message: 'Notificações enviadas'
      };

    } catch (error) {
      logger.error(`Erro ao notificar cupom expirando: ${error.message}`);
      throw error;
    }
  }

  /**
   * Criar notificações push para usuários
   */
  async createPushNotifications(coupon, type) {
    try {
      // Buscar usuários com push token
      const { data: users, error } = await supabase
        .from('users')
        .select('id, push_token')
        .not('push_token', 'is', null);

      if (error) throw error;

      if (!users || users.length === 0) {
        logger.info('Nenhum usuário com push token encontrado');
        return;
      }

      // Criar notificações em lote
      const notifications = users.map(user => ({
        user_id: user.id,
        title: type === 'new_coupon' ? '🔥 Novo Cupom Disponível!' : '⏰ Cupom Expirando!',
        message: `${coupon.code} - ${coupon.discount_value}% OFF em ${this.getPlatformName(coupon.platform)}`,
        type,
        related_coupon_id: coupon.id
      }));

      await Notification.createBulk(notifications);
      logger.info(`✅ ${notifications.length} notificações push criadas`);

    } catch (error) {
      logger.error(`Erro ao criar notificações push: ${error.message}`);
    }
  }

  /**
   * Obter emoji da plataforma
   */
  getPlatformEmoji(platform) {
    const emojis = {
      shopee: '🛍️',
      mercadolivre: '🛒',
      amazon: '📦',
      aliexpress: '🌐',
      general: '🎁'
    };
    return emojis[platform] || '🎟️';
  }

  /**
   * Obter nome formatado da plataforma
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
   * Formatar data
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new CouponNotificationService();

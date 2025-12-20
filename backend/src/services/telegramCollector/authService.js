/**
 * Serviço de autenticação Telegram usando gramjs (Node.js)
 */
import logger from '../../config/logger.js';
import TelegramCollectorConfig from '../../models/TelegramCollectorConfig.js';
import telegramClient from './telegramClient.js';

class TelegramAuthService {
  /**
   * Enviar código de verificação
   */
  async sendCode(phone) {
    try {
      const config = await TelegramCollectorConfig.get();
      
      if (!config.api_id || !config.api_hash) {
        throw new Error('API ID e API Hash devem ser configurados primeiro');
      }

      // Atualizar telefone
      await TelegramCollectorConfig.update({ phone });

      logger.info(`📱 Enviando código de verificação para ${phone}...`);
      logger.info(`   API ID configurado: ${!!config.api_id}`);
      logger.info(`   API Hash configurado: ${!!config.api_hash}`);

      const result = await telegramClient.sendCode(phone);

      logger.info(`✅ Resultado do sendCode recebido:`);
      logger.info(`   - success: ${result.success}`);
      logger.info(`   - message: ${result.message}`);
      logger.info(`   - phoneCodeHash: ${result.phoneCodeHash ? 'presente' : 'ausente'}`);
      logger.info(`   - timeout: ${result.timeout || 'N/A'}`);

      if (!result.phoneCodeHash) {
        logger.error(`❌ ATENÇÃO: phoneCodeHash não foi retornado!`);
        logger.error(`   Resultado completo: ${JSON.stringify(result, null, 2)}`);
        throw new Error('Resposta inválida do Telegram: phoneCodeHash não encontrado');
      }

      return {
        success: true,
        message: result.message || 'Código enviado com sucesso. Verifique seu Telegram (SMS ou chamada telefônica).',
        requiresCode: true,
        phoneCodeHash: result.phoneCodeHash,
        timeout: result.timeout || 120
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar código: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      
      // Garantir que desconectamos o cliente em caso de erro
      try {
        await telegramClient.disconnect();
      } catch (disconnectError) {
        logger.warn(`Erro ao desconectar cliente após erro: ${disconnectError.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Verificar código e completar autenticação
   */
  async verifyCode(code, password = null) {
    try {
      const config = await TelegramCollectorConfig.get();
      
      if (!config.api_id || !config.api_hash || !config.phone) {
        throw new Error('Credenciais não configuradas');
      }

      logger.info(`🔐 Verificando código de autenticação...`);

      const result = await telegramClient.verifyCode(code, password);

      return {
        success: true,
        message: result.message || 'Autenticação concluída com sucesso!',
        user: result.user
      };
    } catch (error) {
      logger.error(`Erro ao verificar código: ${error.message}`);
      
      // Verificar se o código expirou
      if (error.message.includes('expirado') || error.message.includes('expired') || error.message.includes('PHONE_CODE_EXPIRED')) {
        throw new Error('Código de verificação expirado. Por favor, solicite um novo código.');
      }
      
      // Verificar se precisa de senha 2FA
      if (error.message.includes('password') || error.message.includes('2FA') || error.message.includes('senha')) {
        throw new Error('Senha 2FA necessária. Digite sua senha 2FA.');
      }
      
      throw error;
    }
  }

  /**
   * Verificar status de autenticação
   */
  async checkAuthStatus() {
    try {
      const config = await TelegramCollectorConfig.get();

      // Verificar se as credenciais são válidas (não apenas se existem)
      // api_id deve ser um número válido, api_hash deve ter pelo menos 32 caracteres
      const hasValidApiId = config.api_id && !isNaN(parseInt(config.api_id)) && parseInt(config.api_id) > 0;
      const hasValidApiHash = config.api_hash && config.api_hash.length >= 32;
      const hasPhone = config.phone && config.phone.trim().length > 0;
      
      const has_credentials = hasValidApiId && hasValidApiHash && hasPhone;

      // Só verificar autenticação se as credenciais estiverem configuradas
      // e se já está marcado como autenticado no banco (para evitar verificações desnecessárias)
      let isAuthenticated = false;
      if (has_credentials) {
        // Se está marcado como autenticado no banco, verificar se ainda está válido
        // Mas fazer isso de forma assíncrona e com timeout para não travar
        if (config.is_authenticated) {
          try {
            // Timeout de 8 segundos para a verificação completa
            const authPromise = telegramClient.isAuthenticated();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 8000);
            });
            isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
          } catch (error) {
            // Tratar erros de rede/502 especificamente
            const errorMessage = error.message || String(error);
            const isNetworkError = errorMessage.includes('502') || 
                                  errorMessage.includes('Bad Gateway') ||
                                  errorMessage.includes('<html>') ||
                                  errorMessage.includes('cloudflare') ||
                                  errorMessage.includes('Timeout');
            
            if (isNetworkError) {
              // Para erros de rede, não logar como erro crítico
              logger.debug(`⚠️ Problema de rede ao verificar autenticação (pode ser temporário): ${errorMessage.substring(0, 100)}`);
              // Se estava marcado como autenticado no banco, manter esse status
              // para evitar desconectar o usuário por problemas temporários
              isAuthenticated = config.is_authenticated;
            } else {
              // Para outros erros, logar como aviso
              logger.warn(`Aviso ao verificar autenticação: ${errorMessage.substring(0, 200)}`);
              isAuthenticated = false;
            }
          }
        }
      }

      return {
        is_authenticated: isAuthenticated,
        has_credentials: has_credentials,
        has_session: isAuthenticated
      };
    } catch (error) {
      // Tratar erros de rede/502 especificamente
      const errorMessage = error.message || String(error);
      const isNetworkError = errorMessage.includes('502') || 
                            errorMessage.includes('Bad Gateway') ||
                            errorMessage.includes('<html>') ||
                            errorMessage.includes('cloudflare');
      
      if (isNetworkError) {
        logger.warn(`⚠️ Erro de rede ao verificar status (pode ser temporário): ${errorMessage.substring(0, 100)}`);
        // Retornar status baseado no banco de dados se disponível
        try {
          const config = await TelegramCollectorConfig.get();
          return {
            is_authenticated: config.is_authenticated || false,
            has_credentials: !!(config.api_id && config.api_hash && config.phone),
            has_session: config.is_authenticated || false
          };
        } catch (configError) {
          // Se não conseguir buscar config, retornar false
          return {
            is_authenticated: false,
            has_credentials: false,
            has_session: false
          };
        }
      } else {
        logger.error(`Erro ao verificar status de autenticação: ${errorMessage.substring(0, 200)}`);
        return {
          is_authenticated: false,
          has_credentials: false,
          has_session: false
        };
      }
    }
  }
}

export default new TelegramAuthService();

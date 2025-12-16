import TelegramCollectorConfig from '../models/TelegramCollectorConfig.js';
import collectorService from '../services/telegramCollector/collectorService.js';
import authService from '../services/telegramCollector/authService.js';
import telegramClient from '../services/telegramCollector/telegramClient.js';
import logger from '../config/logger.js';

class TelegramCollectorController {
  /**
   * Obter configuração
   * GET /api/telegram-collector/config
   */
  async getConfig(req, res) {
    try {
      const config = await TelegramCollectorConfig.get();
      
      // Não retornar valores sensíveis completos
      const safeConfig = {
        ...config,
        api_id: config.api_id ? `${config.api_id.substring(0, 4)}****` : null,
        api_hash: config.api_hash ? `${config.api_hash.substring(0, 8)}****` : null,
        phone: config.phone || null
      };

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      logger.error(`Erro ao buscar configuração: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar configuração',
        error: error.message
      });
    }
  }

  /**
   * Atualizar configuração
   * PUT /api/telegram-collector/config
   */
  async updateConfig(req, res) {
    try {
      let { api_id, api_hash, phone } = req.body;

      if (!api_id || !api_hash) {
        return res.status(400).json({
          success: false,
          message: 'API ID e API Hash são obrigatórios'
        });
      }

      // Limpar e validar API ID (remover espaços, garantir que é número)
      api_id = String(api_id).trim();
      const apiIdNum = parseInt(api_id);
      if (isNaN(apiIdNum) || apiIdNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'API ID deve ser um número válido'
        });
      }

      // Limpar API Hash (remover espaços)
      api_hash = String(api_hash).trim();
      if (api_hash.length < 32) {
        return res.status(400).json({
          success: false,
          message: 'API Hash inválido. Deve ter pelo menos 32 caracteres'
        });
      }

      const config = await TelegramCollectorConfig.update({
        api_id,
        api_hash,
        phone: phone ? String(phone).trim() : null
      });

      logger.info('✅ Configuração do Telegram Collector atualizada');
      logger.info(`   API ID: ${apiIdNum} (${api_id.length} caracteres)`);
      logger.info(`   API Hash: ${api_hash.substring(0, 8)}**** (${api_hash.length} caracteres)`);
      logger.info(`   Phone: ${phone ? phone : 'não configurado'}`);

      // Limpar cache de autenticação para forçar nova verificação
      telegramClient.clearAuthCache();

      res.json({
        success: true,
        message: 'Configuração salva com sucesso',
        data: {
          ...config,
          api_id: `${config.api_id.substring(0, 4)}****`,
          api_hash: `${config.api_hash.substring(0, 8)}****`
        }
      });
    } catch (error) {
      logger.error(`Erro ao atualizar configuração: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configuração',
        error: error.message
      });
    }
  }

  /**
   * Enviar código de verificação
   * POST /api/telegram-collector/auth/send-code
   */
  async sendCode(req, res) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone é obrigatório'
        });
      }

      logger.info(`📱 Recebida requisição para enviar código para: ${phone}`);
      
      try {
        const result = await authService.sendCode(phone);

        logger.info(`✅ Código enviado com sucesso. Mensagem: ${result.message}`);
        logger.info(`   requiresCode: ${result.requiresCode}`);
        logger.info(`   phoneCodeHash presente: ${!!result.phoneCodeHash}`);

        return res.json({
          success: true,
          message: result.message || 'Código enviado com sucesso. Verifique seu Telegram.',
          data: {
            requiresCode: result.requiresCode,
            timeout: result.timeout || 120
          }
        });
      } catch (serviceError) {
        logger.error(`❌ Erro no serviço de autenticação: ${serviceError.message}`);
        logger.error(`   Stack: ${serviceError.stack}`);
        
        // Verificar tipos específicos de erro
        const errorMessage = serviceError.message || 'Erro ao enviar código';
        
        // Se for erro de timeout, dar mensagem mais específica
        if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
          return res.status(504).json({
            success: false,
            message: 'Timeout ao aguardar resposta do Telegram. O código pode ter sido enviado mesmo assim. Verifique seu Telegram (SMS e chamadas).',
            error: errorMessage
          });
        }
        
        // Se for erro de rate limiting
        if (errorMessage.includes('rate') || errorMessage.includes('RATE') || errorMessage.includes('muitas tentativas')) {
          return res.status(429).json({
            success: false,
            message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
            error: errorMessage
          });
        }
        
        // Outros erros
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: errorMessage
        });
      }
    } catch (error) {
      logger.error(`❌ Erro inesperado ao enviar código: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      
      // Garantir que sempre retornamos uma resposta
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: error.message || 'Erro ao enviar código',
          error: error.message
        });
      }
    }
  }

  /**
   * Verificar código
   * POST /api/telegram-collector/auth/verify-code
   */
  async verifyCode(req, res) {
    try {
      const { code, password } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código é obrigatório'
        });
      }

      const result = await authService.verifyCode(code, password);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error(`Erro ao verificar código: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao verificar código',
        error: error.message
      });
    }
  }

  /**
   * Verificar status de autenticação
   * GET /api/telegram-collector/auth/status
   */
  async getAuthStatus(req, res) {
    try {
      const status = await authService.checkAuthStatus();
      
      // Adicionar informações do servidor MTProto
      const serverInfo = telegramClient.getServerInfo();
      status.server_info = serverInfo;

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error(`Erro ao verificar status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status',
        error: error.message
      });
    }
  }

  /**
   * Obter status do listener
   * GET /api/telegram-collector/listener/status
   */
  async getListenerStatus(req, res) {
    try {
      const status = await collectorService.checkStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error(`Erro ao verificar status do listener: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar status',
        error: error.message
      });
    }
  }

  /**
   * Iniciar listener
   * POST /api/telegram-collector/listener/start
   */
  async startListener(req, res) {
    try {
      const result = await collectorService.start();

      res.json({
        success: true,
        message: result.message,
        data: {
          pid: result.pid
        }
      });
    } catch (error) {
      logger.error(`Erro ao iniciar listener: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao iniciar listener',
        error: error.message
      });
    }
  }

  /**
   * Parar listener
   * POST /api/telegram-collector/listener/stop
   */
  async stopListener(req, res) {
    try {
      const result = await collectorService.stop();

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error(`Erro ao parar listener: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao parar listener',
        error: error.message
      });
    }
  }

  /**
   * Reiniciar listener
   * POST /api/telegram-collector/listener/restart
   */
  async restartListener(req, res) {
    try {
      const result = await collectorService.restart();

      res.json({
        success: true,
        message: 'Listener reiniciado com sucesso',
        data: {
          pid: result.pid
        }
      });
    } catch (error) {
      logger.error(`Erro ao reiniciar listener: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao reiniciar listener',
        error: error.message
      });
    }
  }

  /**
   * Limpar sessões do Telegram
   * DELETE /api/telegram-collector/sessions
   */
  async clearSessions(req, res) {
    try {
      logger.info('🗑️ Limpando sessões do Telegram...');
      
      // Limpar sessões usando o telegramClient
      const result = await telegramClient.clearSessions();
      
      logger.info(`✅ Sessões limpas: ${result.deletedCount} arquivo(s) removido(s)`);
      
      res.json({
        success: true,
        message: `Sessões limpas com sucesso. ${result.deletedCount} arquivo(s) removido(s).`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error(`Erro ao limpar sessões: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao limpar sessões',
        error: error.message
      });
    }
  }
}

export default new TelegramCollectorController();




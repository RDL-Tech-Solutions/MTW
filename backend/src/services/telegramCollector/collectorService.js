/**
 * Serviço de gerenciamento do Telegram Collector (Node.js)
 * Usa gramjs para comunicação com Telegram MTProto
 */
import logger from '../../config/logger.js';
import TelegramCollectorConfig from '../../models/TelegramCollectorConfig.js';
import listenerService from './listenerService.js';

class CollectorService {
  constructor() {
    this.statusCheckInterval = null;
  }

  /**
   * Verificar se o listener está rodando
   */
  async checkStatus() {
    try {
      const config = await TelegramCollectorConfig.get();
      const status = await listenerService.checkStatus();
      
      return {
        status: status.status,
        is_running: status.is_running,
        is_connected: status.is_connected,
        channels_monitored: status.channels_monitored || 0,
        config: {
          is_authenticated: config.is_authenticated,
          has_credentials: !!(config.api_id && config.api_hash && config.phone)
        },
        error: status.error || null
      };
    } catch (error) {
      logger.error(`Erro ao verificar status do listener: ${error.message}`);
      return {
        status: 'error',
        is_running: false,
        is_connected: false,
        channels_monitored: 0,
        error: error.message
      };
    }
  }

  /**
   * Iniciar listener
   */
  async start() {
    try {
      // Verificar se já está rodando
      const currentStatus = await this.checkStatus();
      if (currentStatus.status === 'running') {
        throw new Error('Listener já está rodando');
      }

      // Verificar configurações
      const config = await TelegramCollectorConfig.get();
      if (!config.api_id || !config.api_hash || !config.phone) {
        throw new Error('Credenciais não configuradas');
      }

      if (!config.is_authenticated) {
        throw new Error('Telegram não está autenticado. Faça a autenticação primeiro.');
      }

      logger.info('🚀 Iniciando Telegram Listener (Node.js)...');

      // Iniciar listener usando o serviço Node.js
      await listenerService.start();

      // Iniciar verificação periódica de status
      this.startStatusCheck();

      logger.info('✅ Listener iniciado com sucesso');

      return {
        success: true,
        message: 'Listener iniciado com sucesso'
      };
    } catch (error) {
      logger.error(`Erro ao iniciar listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parar listener
   */
  async stop() {
    try {
      logger.info('🛑 Parando Telegram Listener...');

      await listenerService.stop();

      // Parar verificação de status
      this.stopStatusCheck();

      logger.info('✅ Listener parado com sucesso');

      return {
        success: true,
        message: 'Listener parado com sucesso'
      };
    } catch (error) {
      logger.error(`Erro ao parar listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reiniciar listener
   */
  async restart() {
    try {
      logger.info('🔄 Reiniciando Telegram Listener...');

      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
      await this.start();

      logger.info('✅ Listener reiniciado com sucesso');

      return {
        success: true,
        message: 'Listener reiniciado com sucesso'
      };
    } catch (error) {
      logger.error(`Erro ao reiniciar listener: ${error.message}`);
      throw error;
    }
  }

  /**
   * Iniciar verificação periódica de status
   */
  startStatusCheck() {
    if (this.statusCheckInterval) {
      return;
    }

    this.statusCheckInterval = setInterval(async () => {
      try {
        const status = await this.checkStatus();
        
        if (status.status === 'error' && status.is_running) {
          logger.warn('⚠️ Listener em estado de erro, tentando reconectar...');
          // O listenerService já tem lógica de reconexão automática
        }
      } catch (error) {
        logger.error(`Erro na verificação de status: ${error.message}`);
      }
    }, 30000); // Verificar a cada 30 segundos
  }

  /**
   * Parar verificação periódica de status
   */
  stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }
}

export default new CollectorService();

/**
 * Cliente Telegram usando gramjs (MTProto em JavaScript)
 */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import logger from '../../config/logger.js';
import TelegramCollectorConfig from '../../models/TelegramCollectorConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Detectar ambiente serverless
const isServerless = __dirname.includes('/var/task') || process.env.VERCEL;

// Em ambiente serverless, usar /tmp, caso contrário usar diretório local
const SESSIONS_DIR = isServerless
  ? path.join('/tmp', 'telegram_sessions')
  : path.join(__dirname, '../../../telegram_sessions');

// Garantir que o diretório de sessões existe
try {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
} catch (error) {
  // Se falhar (ex: readonly fs mesmo no /tmp), logar erro mas não quebrar
  // O logger pode não estar totalmente inicializado aqui, então usamos console.error como fallback
  console.error(`Erro ao criar diretório de sessões ${SESSIONS_DIR}:`, error.message);
}

class TelegramClientService {
  constructor() {
    this.client = null;
    this.config = null;
    this.sessionPath = null;
    this.phoneCodeHash = null; // Armazenar phoneCodeHash temporariamente
    this.isCheckingAuth = false; // Lock para evitar verificações simultâneas
    this.lastAuthCheck = null; // Cache do último resultado
    this.lastAuthCheckTime = 0; // Timestamp do último check
    this.isConnecting = false; // Lock para evitar múltiplas conexões simultâneas
    this.connectionPromise = null; // Promise da conexão atual
    this.reconnectErrors = 0; // Contador de erros de reconexão
    this.maxReconnectErrors = 10; // Máximo de erros antes de limpar sessão
    this.lastSessionSaveTime = 0; // Throttling para salvar sessão
  }

  /**
   * Carregar configurações
   */
  async loadConfig() {
    try {
      this.config = await TelegramCollectorConfig.get();

      if (!this.config.api_id || !this.config.api_hash) {
        throw new Error('API ID e API Hash devem ser configurados primeiro');
      }

      // Validar que API ID é um número válido
      const apiId = parseInt(this.config.api_id);
      if (isNaN(apiId) || apiId <= 0) {
        throw new Error('API ID deve ser um número válido. Verifique a configuração.');
      }

      this.sessionPath = path.join(
        SESSIONS_DIR,
        this.config.session_path || 'telegram_session.session'
      );

      return true;
    } catch (error) {
      logger.error(`Erro ao carregar configurações: ${error.message}`);
      throw error;
    }
  }

  /**
   * Carregar sessão salva
   */
  loadSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        const sessionString = fs.readFileSync(this.sessionPath, 'utf8');
        return new StringSession(sessionString);
      }
      return new StringSession('');
    } catch (error) {
      logger.warn(`Erro ao carregar sessão: ${error.message}`);
      return new StringSession('');
    }
  }

  /**
   * Salvar sessão
   */
  saveSession(sessionString) {
    try {
      fs.writeFileSync(this.sessionPath, sessionString, 'utf8');
      logger.info('✅ Sessão salva com sucesso');
    } catch (error) {
      logger.error(`Erro ao salvar sessão: ${error.message}`);
    }
  }

  /**
   * Criar cliente Telegram
   */
  createClient() {
    if (!this.config) {
      throw new Error('Configurações não carregadas');
    }

    // Carregar sessão - se houver problema de conexão, pode ser útil limpar a sessão
    // para forçar o gramjs a escolher um novo data center
    let session = this.loadSession();

    // Se muitos erros de reconexão, limpar sessão para forçar novo data center
    if (this.reconnectErrors >= this.maxReconnectErrors) {
      logger.warn(`⚠️ Muitos erros de reconexão (${this.reconnectErrors}). Limpando sessão para forçar novo data center...`);
      if (this.sessionPath && fs.existsSync(this.sessionPath)) {
        try {
          fs.unlinkSync(this.sessionPath);
          logger.info(`✅ Sessão antiga removida`);
          // Criar nova sessão vazia
          session = new StringSession('');
          this.reconnectErrors = 0; // Reset contador
        } catch (deleteError) {
          logger.warn(`⚠️ Erro ao remover sessão: ${deleteError.message}`);
        }
      }
    }

    // Se a sessão existir mas estiver causando problemas, podemos limpar
    if (session && session.dcId) {
      logger.info(`📡 Sessão existente encontrada com DC: ${session.dcId}`);
      // Verificar se o DC está usando porta 80 (problemático)
      if (session.dcId === 1) {
        logger.warn(`⚠️ Sessão usando DC1 (Europa) - pode tentar usar porta 80`);
        logger.warn(`   Se houver problemas, limpe a sessão para forçar novo data center`);
      }
    }

    // Configurações do cliente
    // IMPORTANTE: Desabilitar autoReconnect para evitar loops infinitos
    // O listenerService vai gerenciar reconexões manualmente
    const clientOptions = {
      connectionRetries: 3, // Reduzido para evitar loops
      retryDelay: 3000, // 3 segundos entre tentativas
      autoReconnect: false, // DESABILITADO - vamos gerenciar manualmente no listener
      // Configurações adicionais para melhor estabilidade
      useWSS: false, // Usar TCP ao invés de WebSocket
      testServers: false, // Usar servidores de produção (não test servers)
      // Timeout para operações individuais (aumentado para evitar timeouts prematuros)
      timeout: 60000, // 60 segundos (aumentado de 30s)
      // Timeout para o loop de atualizações (crítico para evitar TIMEOUT errors)
      receiveTimeout: 300000, // 5 minutos para receber atualizações
      // Reduzir retries para evitar demoras
      requestRetries: 2,
      // Não desconectar automaticamente após operações
      noUpdates: false, // Receber atualizações
      // Configurações de reconexão do loop de atualizações
      updateRetries: 5, // Máximo de 5 tentativas antes de reconectar
      updateRetryDelay: 5000, // 5 segundos entre tentativas de atualização
    };

    // Tentar forçar data center 2 (Brasil/EUA) se disponível na sessão
    // O gramjs escolhe automaticamente, mas podemos tentar influenciar
    if (session && session.dcId) {
      logger.info(`📡 Sessão existente detectada com DC: ${session.dcId}`);
    } else {
      logger.info(`📡 Nova sessão - gramjs escolherá o data center automaticamente`);
      logger.info(`   Servidores padrão do Telegram:`);
      logger.info(`   - DC1: 149.154.175.50:443 (Europa) ou 149.154.175.57:80`);
      logger.info(`   - DC2: 149.154.167.51:443 (Américas) ou 149.154.167.40:443 (recomendado para Brasil)`);
      logger.info(`   - DC3: 149.154.175.100:443 (Ásia) ou 149.154.175.100:80`);
      logger.info(`   - DC4: 149.154.167.92:443 (Américas) ou 149.154.167.92:80`);
      logger.info(`   - DC5: 91.108.56.100:443 (Global)`);
      logger.info(`   Portas: 80 (HTTP/TCPFull) ou 443 (HTTPS/TCPFull)`);
      logger.info(`   Nota: O gramjs tenta primeiro 443 (HTTPS), depois 80 (HTTP) se falhar`);
      logger.info(`   ⚠️ Se estiver travando em 149.154.175.57:80, pode ser bloqueio de firewall`);
      logger.info(`   💡 Solução: Verificar se porta 80 está bloqueada e permitir 443 (HTTPS)`);
    }

    // Usar sessão (pode ser nova se foi limpa)
    this.client = new TelegramClient(session, parseInt(this.config.api_id), this.config.api_hash, clientOptions);

    // Log do servidor que será usado (se disponível)
    logger.info(`📡 Cliente criado. O gramjs escolherá o servidor automaticamente baseado na localização e sessão.`);
    logger.info(`   Se houver problemas de conexão, pode ser necessário verificar firewall/proxy.`);

    // Log da configuração do cliente
    logger.debug(`📡 Cliente Telegram criado com API ID: ${this.config.api_id.substring(0, 4)}****`);

    // Flag para rastrear migração de data center
    this.isMigrating = false;
    this.migrationPromise = null;

    // IMPORTANTE: Não adicionar handlers aqui que possam causar loops
    // Os handlers devem ser adicionados apenas no listenerService
    // para evitar múltiplos handlers processando os mesmos eventos
    // 
    // O salvamento de sessão será feito apenas quando necessário (após autenticação bem-sucedida)
    // e não a cada evento para evitar loops

    return this.client;
  }


  /**
   * Conectar e autenticar
   */
  async connect() {
    // Prevenir múltiplas conexões simultâneas
    if (this.isConnecting) {
      logger.debug(`⏳ Conexão já em andamento, aguardando...`);
      if (this.connectionPromise) {
        return await this.connectionPromise;
      }
    }

    // Se já está conectado, retornar
    if (this.client && (this.client.connected || this.client._connected)) {
      logger.debug(`✅ Cliente já está conectado`);
      return true;
    }

    this.isConnecting = true;
    this.connectionPromise = this._doConnect();

    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Método interno para realizar a conexão
   */
  async _doConnect() {
    try {
      // Se já existe cliente, desconectar primeiro para evitar múltiplas instâncias
      if (this.client) {
        try {
          // Verificar se está realmente desconectado
          if (this.client.connected || this.client._connected) {
            logger.info(`🔄 Desconectando cliente existente antes de reconectar...`);
            await this.client.disconnect();
            // Aguardar um pouco para garantir desconexão
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (disconnectError) {
          logger.warn(`⚠️ Erro ao desconectar cliente existente: ${disconnectError.message}`);
          // Continuar mesmo se falhar
        }
      }

      if (!this.client) {
        this.createClient();
      }

      logger.info(`🔌 Conectando ao Telegram...`);
      await this.client.connect();

      // Log informações sobre a conexão
      try {
        const dcId = this.client.session?.dcId || 'desconhecido';
        logger.info(`✅ Cliente Telegram conectado (DC: ${dcId})`);

        // Log do servidor se disponível
        if (this.client._connection && this.client._connection._ip) {
          logger.info(`   Servidor: ${this.client._connection._ip}:${this.client._connection._port || 'padrão'}`);
        }
      } catch (logError) {
        // Ignorar erros de log
        logger.info('✅ Cliente Telegram conectado');
      }

      // Aguardar um pouco para garantir que o handshake foi completado
      logger.info(`⏳ Aguardando handshake MTProto completar...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar autorização apenas se necessário (para listener, não precisamos verificar)
      // O checkAuthorization pode desconectar se não estiver autorizado
      // Para o listener, vamos pular essa verificação e deixar o gramjs gerenciar
      try {
        const isAuthorized = await this.client.checkAuthorization();
        if (!isAuthorized) {
          logger.warn('⚠️ Cliente não está autorizado, mas continuando...');
          // Não desconectar - deixar o listener tentar usar mesmo assim
        } else {
          logger.info('✅ Cliente Telegram autorizado');
        }
      } catch (authError) {
        logger.warn(`⚠️ Erro ao verificar autorização: ${authError.message}`);
        logger.warn(`   Continuando mesmo assim (pode ser necessário autenticar primeiro)`);
        // Não lançar erro - deixar continuar
      }

      // Reset contador de erros se conectar com sucesso
      this.reconnectErrors = 0;

      return true;
    } catch (error) {
      logger.error(`Erro ao conectar: ${error.message}`);

      // Incrementar contador de erros
      this.reconnectErrors++;

      // Se muitos erros consecutivos, limpar sessão
      if (this.reconnectErrors >= this.maxReconnectErrors) {
        logger.error(`❌ Muitos erros de conexão (${this.reconnectErrors}). Limpando sessão para forçar novo data center...`);
        await this.clearSession();
        this.reconnectErrors = 0;
      }

      // Limpar referência do cliente se falhar
      if (this.client && !this.client.connected && !this.client._connected) {
        this.client = null;
      }
      throw error;
    }
  }

  /**
   * Marcar listener como ativo/inativo
   */
  setListenerActive(active) {
    this.isListenerActive = active;
    logger.debug(`Listener ativo: ${active}`);
  }

  /**
   * Marcar listener como ativo/inativo
   */
  setListenerActive(active) {
    this.isListenerActive = active;
    logger.debug(`📡 Listener ativo: ${active}`);
  }

  /**
   * Desconectar
   */
  async disconnect() {
    try {
      if (this.client) {
        // Marcar listener como inativo antes de desconectar
        this.isListenerActive = false;

        // Verificar se está realmente conectado antes de desconectar
        const isConnected = this.client.connected || this.client._connected;
        if (isConnected) {
          logger.info(`🔌 Desconectando cliente Telegram...`);
          try {
            await this.client.disconnect();
            logger.info('✅ Cliente Telegram desconectado');
          } catch (disconnectError) {
            logger.warn(`⚠️ Erro ao desconectar: ${disconnectError.message}`);
            // Forçar limpeza mesmo se falhar
          }
        } else {
          logger.debug(`ℹ️ Cliente já estava desconectado`);
        }
      }

      // Limpar referência do cliente
      this.client = null;
      this.isConnecting = false;
      this.connectionPromise = null;

      return true;
    } catch (error) {
      logger.error(`Erro ao desconectar: ${error.message}`);
      // Limpar referência mesmo se falhar
      this.client = null;
      this.isConnecting = false;
      this.connectionPromise = null;
      return false;
    }
  }

  /**
   * Enviar código de verificação
   */
  async sendCode(phone) {
    const startTime = Date.now();
    logger.info(`🚀 [sendCode] Iniciando processo de envio de código`);
    logger.info(`   Timestamp: ${new Date().toISOString()}`);

    try {
      logger.info(`📋 [1/8] Carregando configurações...`);
      await this.loadConfig();
      logger.info(`✅ [1/8] Configurações carregadas`);

      // Validar que temos todos os dados necessários
      if (!this.config.api_id || !this.config.api_hash) {
        throw new Error('API ID e API Hash devem ser configurados primeiro');
      }

      // Verificar última tentativa (se houver campo no banco)
      // Isso ajuda a evitar rate limiting
      try {
        const config = await TelegramCollectorConfig.get();
        if (config.last_code_sent_at) {
          const lastSent = new Date(config.last_code_sent_at);
          const now = new Date();
          const diffSeconds = (now - lastSent) / 1000;

          // Se tentou há menos de 60 segundos, avisar
          if (diffSeconds < 60) {
            const waitTime = Math.ceil(60 - diffSeconds);
            logger.warn(`⚠️ Última tentativa foi há ${Math.floor(diffSeconds)} segundos. Aguarde ${waitTime} segundos para evitar rate limiting.`);
            // Não bloquear, apenas avisar
          }
        }
      } catch (e) {
        // Campo pode não existir, ignorar
      }

      const apiId = parseInt(this.config.api_id);
      const apiHash = String(this.config.api_hash).trim();

      if (isNaN(apiId) || apiId <= 0) {
        throw new Error('API ID inválido. Deve ser um número válido.');
      }

      if (!apiHash || apiHash.length < 32) {
        throw new Error('API Hash inválido. Deve ter pelo menos 32 caracteres.');
      }

      // Validar formato do telefone
      logger.info(`📋 [2/8] Validando número de telefone...`);
      if (!phone || typeof phone !== 'string') {
        throw new Error('Número de telefone inválido.');
      }

      const phoneTrimmed = phone.trim();
      if (!phoneTrimmed.startsWith('+')) {
        throw new Error('Número de telefone deve começar com + (formato internacional).');
      }
      logger.info(`✅ [2/8] Número de telefone válido: ${phoneTrimmed.substring(0, 4)}****`);

      // Log para debug (sem expor valores completos)
      logger.info(`📋 [3/8] Preparando para enviar código...`);
      logger.info(`   Phone: ${phoneTrimmed}`);
      logger.info(`   API ID: ${String(this.config.api_id).substring(0, 4)}****`);

      // Criar e conectar cliente
      logger.info(`📋 [4/8] Criando cliente Telegram...`);
      this.createClient();
      logger.info(`✅ [4/8] Cliente criado`);

      logger.info(`📋 [5/8] Conectando ao Telegram...`);
      try {
        logger.info(`   Iniciando client.connect()...`);
        logger.info(`   Nota: Para sendCode, não precisamos de autorização completa, apenas conexão TCP`);

        // O connect() do gramjs pode demorar, mas não deve travar indefinidamente
        // Vamos usar Promise.race com timeout
        const connectPromise = this.client.connect();

        // Timeout de 15 segundos (reduzido porque apenas precisamos da conexão TCP)
        const connectTimeout = new Promise((_, reject) => {
          setTimeout(() => {
            logger.error(`⏰ Timeout: connect() demorou mais de 15 segundos`);
            logger.error(`   Verificando se conexão TCP foi estabelecida...`);
            reject(new Error('Timeout ao conectar: connect() não retornou em 15 segundos'));
          }, 15000);
        });

        logger.info(`   Aguardando resposta do connect() (timeout 15s)...`);

        let connectResult;
        try {
          connectResult = await Promise.race([connectPromise, connectTimeout]);
          logger.info(`   connect() retornou com sucesso`);
        } catch (raceError) {
          // Se foi timeout, verificar se a conexão TCP foi estabelecida
          if (raceError.message.includes('Timeout')) {
            logger.warn(`⚠️ Timeout no connect(), verificando status da conexão...`);

            // Aguardar um pouco e verificar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verificar se há conexão TCP mesmo com timeout
            const hasTcpConnection = this.client._connection &&
              (this.client._connection._connected ||
                this.client._connection.connected ||
                this.client._connection._transport?.connected);

            logger.info(`   Status da conexão TCP: ${hasTcpConnection ? 'conectado' : 'desconectado'}`);
            logger.info(`   client.connected: ${this.client.connected}`);
            logger.info(`   _connection._connected: ${this.client._connection?._connected}`);
            logger.info(`   _connection.connected: ${this.client._connection?.connected}`);

            if (hasTcpConnection || this.client.connected) {
              logger.warn(`⚠️ Conexão TCP estabelecida, mas connect() não retornou. Continuando...`);
              logger.info(`   Para sendCode, conexão TCP é suficiente. Prosseguindo...`);
              // Não lançar erro, continuar
            } else {
              logger.error(`❌ Conexão TCP não estabelecida. Falha na conexão.`);
              throw raceError;
            }
          } else {
            throw raceError;
          }
        }

        logger.info(`✅ [5/8] Conectado ao Telegram com sucesso`);
      } catch (connectError) {
        logger.error(`❌ [5/8] Erro ao conectar ao Telegram: ${connectError.message}`);
        logger.error(`   Stack: ${connectError.stack}`);
        throw new Error(`Falha ao conectar ao Telegram: ${connectError.message}. Verifique sua conexão com a internet e as credenciais API.`);
      }

      // Verificar se está realmente conectado
      logger.info(`🔍 Verificando status da conexão...`);
      logger.info(`   client.connected: ${this.client.connected}`);
      logger.info(`   client._connection: ${this.client._connection ? 'presente' : 'ausente'}`);

      // Aguardar um pouco e verificar novamente (às vezes leva um tempo para marcar como conectado)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar novamente após aguardar
      const isConnected = this.client.connected ||
        (this.client._connection && this.client._connection._connected);

      logger.info(`   Status após aguardar: connected=${this.client.connected}, _connected=${this.client._connection?._connected}`);

      if (!isConnected) {
        logger.warn(`⚠️ Cliente não marcado como conectado, mas continuando...`);
        // Não lançar erro, apenas avisar - às vezes o gramjs não marca como connected imediatamente
        // Mas a conexão pode estar funcionando mesmo assim
      } else {
        logger.info(`✅ Cliente confirmado como conectado`);
      }

      logger.info(`✅ [5/8] Cliente conectado e pronto para enviar código`);

      // Log informações do servidor após conexão (não crítico, pode falhar)
      // Fazer isso de forma assíncrona para não bloquear
      logger.info(`📋 [6/8] Obtendo informações do servidor (não bloqueante)...`);
      Promise.resolve().then(async () => {
        try {
          const serverInfo = this.getServerInfo();
          if (serverInfo && serverInfo.dcId) {
            logger.info(`📡 Conectado ao Data Center ${serverInfo.dcId}`);
            if (serverInfo.server) {
              logger.info(`   Servidor: ${serverInfo.server}:${serverInfo.port || 'padrão'}`);
            }
          }
        } catch (logError) {
          // Ignorar erros de log - não é crítico
        }
      }).catch(() => { }); // Ignorar qualquer erro
      logger.info(`✅ [6/8] Prosseguindo (info do servidor em background)`);

      // Aguardar um pouco para garantir que a conexão está estável
      logger.info(`📋 [7/8] Aguardando 2 segundos para estabilizar conexão...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      logger.info(`✅ [7/8] Conexão estabilizada`);

      // Usar a API correta do telegram
      // SendCode requer apiId e apiHash explicitamente, mesmo que o cliente já tenha sido criado com eles
      logger.info(`📋 [8/8] Importando módulo telegram e preparando SendCode...`);
      let Api;
      try {
        logger.info(`   Importando 'telegram'...`);
        const telegramModule = await import('telegram');
        Api = telegramModule.Api;
        logger.info(`✅ Módulo telegram importado`);
      } catch (importError) {
        logger.error(`❌ Erro ao importar módulo telegram: ${importError.message}`);
        logger.error(`   Stack: ${importError.stack}`);
        throw new Error(`Falha ao importar módulo telegram: ${importError.message}`);
      }

      // SendCode requer phoneNumber, apiId, apiHash e settings (obrigatório)
      logger.info(`📤 Preparando SendCode com apiId: ${apiId}, apiHash: ${apiHash.substring(0, 8)}****`);

      // Criar CodeSettings (obrigatório)
      logger.info(`📋 Criando CodeSettings...`);
      let codeSettings;
      try {
        logger.info(`   Instanciando Api.CodeSettings...`);
        codeSettings = new Api.CodeSettings({
          allowFlashcall: true,       // Permitir chamada flash (pode ajudar se SMS falhar)
          currentNumber: true,        // Indicar que é o número atual
          allowAppHash: true,         // Permitir hash do app (necessário para SMS)
          allowMissedCall: true       // Permitir chamada perdida (backup se SMS falhar)
        });
        logger.info(`✅ CodeSettings criado: permitindo SMS, chamada flash e chamada perdida`);
      } catch (settingsError) {
        logger.error(`❌ Erro ao criar CodeSettings: ${settingsError.message}`);
        logger.error(`   Stack: ${settingsError.stack}`);
        throw new Error(`Falha ao criar CodeSettings: ${settingsError.message}`);
      }

      let result;
      let retryCount = 0;
      const maxRetries = 3; // Aumentado para 3 tentativas

      logger.info(`🔄 Iniciando loop de tentativas (máximo ${maxRetries + 1} tentativas)...`);

      while (retryCount <= maxRetries) {
        try {
          logger.info(`🔄 Tentativa ${retryCount + 1}/${maxRetries + 1} - Enviando SendCode...`);
          logger.info(`   Phone: ${phoneTrimmed}`);
          logger.info(`   API ID: ${apiId}`);
          logger.info(`   Cliente conectado: ${this.client.connected}`);

          // Verificar se cliente ainda está conectado antes de enviar
          if (!this.client.connected) {
            logger.warn(`⚠️ Cliente desconectado, reconectando...`);
            await this.client.connect();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Verificar se a conexão está realmente pronta para invocar
          logger.info(`🔍 Verificando se conexão está pronta para invocar...`);
          logger.info(`   client.connected: ${this.client._connected || this.client.connected}`);
          logger.info(`   client._sender: ${this.client._sender ? 'presente' : 'ausente'}`);

          // Aguardar um pouco mais para garantir que o handshake MTProto foi completado
          logger.info(`⏳ Aguardando 3 segundos para garantir handshake MTProto completo...`);
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Verificar se o handshake MTProto foi completado
          // O gramjs precisa completar o handshake antes de poder invocar métodos
          logger.info(`🔍 Verificando se handshake MTProto foi completado...`);

          // Tentar fazer uma chamada simples para verificar se a conexão está realmente pronta
          // Se o handshake não foi completado, o invoke() vai travar
          try {
            logger.info(`   Testando se conexão está pronta para invocar...`);
            // Não fazer nada, apenas verificar se o cliente tem o sender configurado
            const hasSender = this.client._sender !== undefined && this.client._sender !== null;
            logger.info(`   _sender presente: ${hasSender}`);

            if (!hasSender) {
              logger.warn(`⚠️ _sender não está presente - handshake pode não ter sido completado`);
              logger.warn(`   Aguardando mais 5 segundos para handshake completar...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (checkError) {
            logger.warn(`⚠️ Erro ao verificar sender: ${checkError.message}`);
          }

          // Adicionar timeout para evitar travamento
          logger.info(`📤 Invocando SendCode...`);
          logger.info(`   Criando Api.auth.SendCode request...`);

          const sendCodeRequest = new Api.auth.SendCode({
            phoneNumber: phoneTrimmed,
            apiId: apiId,
            apiHash: apiHash,
            settings: codeSettings
          });

          logger.info(`   Request criado, invocando...`);
          logger.info(`   ⚠️ Se travar aqui, o handshake MTProto pode não ter sido completado`);

          // Criar a promise de invocação
          const invokeStartTime = Date.now();
          const sendCodePromise = this.client.invoke(sendCodeRequest);

          logger.info(`✅ SendCode invoke() chamado, aguardando resposta...`);
          logger.info(`   Promise criada, iniciando timeout...`);

          // Timeout de 60 segundos
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              const elapsed = Math.floor((Date.now() - invokeStartTime) / 1000);
              logger.error(`⏰ Timeout: Resposta do Telegram demorou mais de 60 segundos (${elapsed}s)`);
              logger.error(`   Isso pode indicar que o handshake MTProto não foi completado`);
              logger.error(`   ou que o servidor não está respondendo`);
              logger.error(`   Tentativa: ${retryCount + 1}/${maxRetries + 1}`);
              reject(new Error('Timeout: Resposta do Telegram demorou mais de 60 segundos'));
            }, 60000);
          });

          logger.info(`⏳ Aguardando resposta (timeout de 60s)...`);

          // Adicionar um log periódico para saber que ainda está rodando
          let elapsedSeconds = 0;
          const progressInterval = setInterval(() => {
            elapsedSeconds += 10;
            logger.info(`   ⏳ Ainda aguardando resposta... (${elapsedSeconds}s decorridos)`);
          }, 10000); // A cada 10 segundos

          try {
            result = await Promise.race([sendCodePromise, timeoutPromise]);
            clearInterval(progressInterval);
            const totalTime = Math.floor((Date.now() - invokeStartTime) / 1000);
            logger.info(`✅ Resposta recebida do Telegram! (${totalTime}s)`);
            logger.info(`   Tipo da resposta: ${result?.constructor?.name || 'desconhecido'}`);
            break; // Sucesso, sair do loop
          } catch (raceError) {
            clearInterval(progressInterval);
            const totalTime = Math.floor((Date.now() - invokeStartTime) / 1000);
            logger.error(`❌ Erro no Promise.race após ${totalTime}s: ${raceError.message}`);
            logger.error(`   Stack: ${raceError.stack}`);

            // Se foi timeout, verificar se há algum problema de conexão
            if (raceError.message.includes('Timeout')) {
              logger.error(`   ⚠️ Timeout detectado - verificando status da conexão...`);
              logger.error(`   client.connected: ${this.client.connected}`);
              logger.error(`   client._sender: ${this.client._sender ? 'presente' : 'ausente'}`);
              logger.error(`   Isso pode indicar que o handshake MTProto não foi completado`);
              logger.error(`   💡 Solução: Tente limpar a sessão e reconectar`);
            }

            throw raceError;
          }

        } catch (error) {
          const errorMsg = error.message || '';
          logger.warn(`⚠️ Erro na tentativa ${retryCount + 1}: ${errorMsg}`);

          // Verificar se é erro de migração de data center
          if (errorMsg.includes('PHONE_MIGRATE') || errorMsg.includes('phone_migrate')) {
            const dcMatch = errorMsg.match(/PHONE_MIGRATE_(\d+)/i) || errorMsg.match(/phone_migrate[_\s](\d+)/i);
            if (dcMatch && retryCount < maxRetries) {
              const newDcId = parseInt(dcMatch[1]);
              logger.warn(`⚠️ Telefone migrado para data center ${newDcId}. Reconectando...`);

              // Desconectar e reconectar ao novo data center
              try {
                await this.client.disconnect();
              } catch (e) {
                // Ignorar erros de desconexão
              }

              // Aguardar antes de reconectar
              logger.info(`⏳ Aguardando 3 segundos antes de reconectar...`);
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Recriar cliente (o gramjs deve reconectar automaticamente ao DC correto)
              this.createClient();
              await this.client.connect();

              // Aguardar mais um pouco para garantir que a conexão está estável
              await new Promise(resolve => setTimeout(resolve, 2000));

              logger.info(`✅ Reconectado ao data center ${newDcId}. Tentando novamente...`);
              retryCount++;
              continue; // Tentar novamente
            }
          }

          // Se não for erro de migração ou já tentou demais, lançar o erro
          if (retryCount >= maxRetries) {
            logger.error(`❌ Erro após ${maxRetries + 1} tentativas: ${errorMsg}`);
            throw error;
          }

          // Aguardar antes de tentar novamente
          logger.info(`⏳ Aguardando 2 segundos antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
        }
      }

      // Log detalhado da resposta (com proteção contra erros de serialização)
      try {
        logger.info(`📥 Resposta do SendCode recebida:`);
        logger.info(`   - Tipo: ${result?.constructor?.name || 'desconhecido'}`);
        logger.info(`   - phoneCodeHash: ${result?.phoneCodeHash ? 'presente' : 'ausente'}`);
        logger.info(`   - timeout: ${result?.timeout || 'N/A'} segundos`);

        // Log detalhado do tipo de código
        if (result?.type) {
          const typeName = result.type.constructor?.name || 'desconhecido';
          logger.info(`   - Tipo de código: ${typeName}`);

          // Log de propriedades adicionais do tipo
          try {
            const typeProps = Object.keys(result.type);
            if (typeProps.length > 0) {
              logger.info(`   - Propriedades do tipo: ${typeProps.join(', ')}`);
            }
          } catch (e) {
            // Ignorar erros ao acessar propriedades
          }
        } else {
          logger.warn(`   ⚠️ Tipo de código não especificado na resposta`);
        }

        // Log de todas as propriedades da resposta (para debug)
        try {
          const resultProps = Object.keys(result);
          logger.info(`   - Propriedades da resposta: ${resultProps.join(', ')}`);
        } catch (e) {
          // Ignorar erros
        }
      } catch (logError) {
        logger.warn(`Erro ao fazer log da resposta: ${logError.message}`);
        logger.warn(`Stack: ${logError.stack}`);
      }

      // Salvar sessão
      if (this.client.session && this.client.session.save) {
        const sessionString = this.client.session.save();
        if (sessionString) {
          this.saveSession(sessionString);
        }
      }

      // Verificar se result.phoneCodeHash existe
      if (!result || !result.phoneCodeHash) {
        logger.error('Resposta do SendCode não contém phoneCodeHash');
        logger.error(`Resposta completa: ${JSON.stringify(result, null, 2)}`);
        throw new Error('Resposta inválida do Telegram. Tente novamente.');
      }

      logger.info(`✅ Código de verificação enviado! phoneCodeHash: ${result.phoneCodeHash.substring(0, 8)}****`);

      // Limpar phoneCodeHash anterior (se houver) antes de salvar o novo
      try {
        await TelegramCollectorConfig.update({ phone_code_hash: null });
      } catch (dbError) {
        // Se o campo não existir ainda (migração não executada), apenas logar
        logger.warn(`Aviso: campo phone_code_hash pode não existir: ${dbError.message}`);
      }

      // Armazenar phoneCodeHash no banco de dados para persistir entre requisições
      try {
        await TelegramCollectorConfig.update({ phone_code_hash: result.phoneCodeHash });
      } catch (dbError) {
        // Se o campo não existir ainda, apenas logar e continuar
        logger.warn(`Aviso: não foi possível salvar phone_code_hash no banco: ${dbError.message}`);
      }

      // Também armazenar na instância para uso imediato
      this.phoneCodeHash = result.phoneCodeHash;

      // Salvar timestamp da última tentativa (se campo existir)
      try {
        await TelegramCollectorConfig.update({
          phone_code_hash: result.phoneCodeHash,
          last_code_sent_at: new Date().toISOString()
        });
      } catch (dbError) {
        // Campo pode não existir, apenas logar
        logger.debug(`Campo last_code_sent_at pode não existir: ${dbError.message}`);
      }

      // Informar sobre o tipo de código enviado (com proteção)
      let codeTypeMessage = 'via SMS';
      let codeTypeDetails = '';
      try {
        if (result?.type) {
          const typeName = result.type.constructor?.name || '';
          logger.info(`🔍 Tipo de código detectado: ${typeName}`);

          if (typeName === 'auth.CodeTypeCall') {
            codeTypeMessage = 'via chamada telefônica';
            codeTypeDetails = 'Você receberá uma chamada telefônica com o código.';
          } else if (typeName === 'auth.CodeTypeFlashCall') {
            codeTypeMessage = 'via chamada flash';
            codeTypeDetails = 'Você receberá uma chamada flash (que desliga imediatamente) com o código no número de telefone.';
          } else if (typeName === 'auth.CodeTypeMissedCall') {
            codeTypeMessage = 'via chamada perdida';
            codeTypeDetails = 'Você receberá uma chamada perdida. O código estará no número de telefone.';
          } else if (typeName === 'auth.CodeTypeSms') {
            codeTypeMessage = 'via SMS';
            codeTypeDetails = 'Você receberá uma mensagem SMS com o código.';
          } else {
            codeTypeMessage = `via ${typeName}`;
            codeTypeDetails = `Tipo de código: ${typeName}`;
          }
        } else {
          logger.warn('⚠️ Tipo de código não especificado na resposta');
        }
      } catch (typeError) {
        logger.warn(`Erro ao determinar tipo de código: ${typeError.message}`);
      }

      const timeout = result?.timeout || 120;
      logger.info(`📱 Código de verificação será enviado ${codeTypeMessage}`);
      if (codeTypeDetails) {
        logger.info(`   ${codeTypeDetails}`);
      }
      logger.info(`⏱️  Aguarde até ${timeout} segundos para receber o código`);
      logger.info(`💡 Dica: Verifique as mensagens do Telegram no número ${phoneTrimmed}`);
      logger.info(`💡 Se não receber SMS, verifique também chamadas telefônicas (o código pode vir via chamada)`);
      logger.info(`💡 Verifique se o número está correto e se não há bloqueio de SMS/chamadas`);
      logger.info(`💡 Se não receber em ${timeout} segundos, aguarde alguns minutos antes de tentar novamente (rate limiting)`);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ [sendCode] Processo concluído com sucesso em ${elapsedTime}s`);

      return {
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        message: `Código de verificação enviado ${codeTypeMessage}. Verifique seu Telegram.`,
        timeout: timeout
      };
    } catch (error) {
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error(`❌ [sendCode] Erro após ${elapsedTime}s: ${error.message}`);
      logger.error(`   Stack trace: ${error.stack}`);

      // Log detalhado do erro
      if (error.cause) {
        logger.error(`   Causa: ${JSON.stringify(error.cause)}`);
      }
      if (error.response) {
        logger.error(`   Response status: ${error.response.status}`);
        logger.error(`   Response data: ${JSON.stringify(error.response.data)}`);
      }

      // Log detalhado do erro para debug
      if (error.cause) {
        logger.error(`Causa do erro: ${JSON.stringify(error.cause)}`);
      }

      // Desconectar cliente em caso de erro
      try {
        if (this.client) {
          await this.client.disconnect();
        }
      } catch (disconnectError) {
        logger.warn(`Erro ao desconectar cliente: ${disconnectError.message}`);
      }

      // Tratamento específico para erros comuns
      const errorMsg = error.message || '';

      if (errorMsg.includes('API_ID_INVALID') || errorMsg.includes('api_id_invalid') || errorMsg.includes('apiId')) {
        throw new Error('API ID inválido. Verifique se o API ID está correto no painel admin.');
      }

      if (errorMsg.includes('API_HASH_INVALID') || errorMsg.includes('api_hash_invalid') || errorMsg.includes('apiHash')) {
        throw new Error('API Hash inválido. Verifique se o API Hash está correto no painel admin.');
      }

      if (errorMsg.includes('PHONE_NUMBER_INVALID') || errorMsg.includes('phone_number_invalid')) {
        throw new Error('Número de telefone inválido. Use o formato internacional (ex: +5571999541560).');
      }

      if (errorMsg.includes('FLOOD_WAIT') || errorMsg.includes('flood_wait')) {
        const waitTimeMatch = errorMsg.match(/(\d+)/);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'alguns';
        const waitMinutes = waitTimeMatch ? Math.ceil(parseInt(waitTime) / 60) : 0;
        const message = waitMinutes > 0
          ? `Muitas tentativas. Aguarde ${waitMinutes} minuto(s) (${waitTime} segundos) antes de tentar novamente.`
          : `Muitas tentativas. Aguarde ${waitTime} segundos antes de tentar novamente.`;
        logger.warn(`⚠️ Rate limit detectado: ${message}`);
        throw new Error(message);
      }

      if (errorMsg.includes('PHONE_NUMBER_FLOOD') || errorMsg.includes('phone_number_flood')) {
        logger.warn(`⚠️ Número bloqueado temporariamente por muitas tentativas`);
        throw new Error('Muitas tentativas com este número. O Telegram bloqueou temporariamente. Aguarde 2-4 horas antes de tentar novamente.');
      }

      if (errorMsg.includes('PHONE_NUMBER_BANNED') || errorMsg.includes('phone_number_banned')) {
        logger.error(`❌ Número banido pelo Telegram`);
        throw new Error('Este número de telefone foi banido pelo Telegram. Entre em contato com o suporte do Telegram.');
      }

      // Verificar se é erro de rate limiting genérico
      if (errorMsg.includes('TOO_MANY') || errorMsg.includes('too_many') || errorMsg.includes('RATE_LIMIT')) {
        logger.warn(`⚠️ Rate limiting detectado`);
        throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
      }

      if (errorMsg.includes('CastError') || errorMsg.includes('wrong type')) {
        throw new Error('Erro de validação dos dados. Verifique se API ID e API Hash estão corretos no painel admin.');
      }

      // Se for timeout, dar dicas específicas
      if (errorMsg.includes('Timeout')) {
        logger.warn(`⏰ Timeout ao aguardar resposta do Telegram`);
        logger.warn(`💡 Possíveis causas:`);
        logger.warn(`   1. Rate limiting do Telegram (muitas tentativas)`);
        logger.warn(`   2. Problemas de conexão com o servidor do Telegram`);
        logger.warn(`   3. Número bloqueado temporariamente`);
        logger.warn(`💡 Soluções:`);
        logger.warn(`   - Aguarde 5-10 minutos antes de tentar novamente`);
        logger.warn(`   - Verifique se o código foi enviado mesmo assim (verifique SMS e chamadas)`);
        logger.warn(`   - Se persistir, aguarde algumas horas`);
        throw new Error('Timeout ao aguardar resposta do Telegram. O código pode ter sido enviado mesmo assim. Verifique seu Telegram (SMS e chamadas). Se não receber, aguarde 5-10 minutos antes de tentar novamente.');
      }

      // Re-throw com mensagem mais amigável
      throw new Error(error.message || 'Erro desconhecido ao enviar código de verificação');
    }
  }

  /**
   * Verificar código e completar autenticação
   */
  async verifyCode(code, password = null) {
    try {
      if (!this.client) {
        await this.loadConfig();
        this.createClient();
        await this.client.connect();
      }

      // Recuperar phoneCodeHash do banco de dados (caso tenha sido perdido da instância)
      if (!this.phoneCodeHash) {
        const config = await TelegramCollectorConfig.get();
        if (config.phone_code_hash) {
          this.phoneCodeHash = config.phone_code_hash;
        }
      }

      if (!this.phoneCodeHash) {
        throw new Error('phoneCodeHash não encontrado. Envie o código primeiro.');
      }

      const { Api } = await import('telegram');

      let result;
      try {
        // Tentar fazer sign in
        result = await this.client.invoke(
          new Api.auth.SignIn({
            phoneNumber: this.config.phone,
            phoneCodeHash: this.phoneCodeHash,
            phoneCode: code
          })
        );
      } catch (error) {
        // Se precisar de senha 2FA
        if (error.message.includes('PASSWORD') || error.message.includes('password') || error.code === 401) {
          if (!password) {
            throw new Error('Senha 2FA necessária');
          }

          // Fazer sign in com senha
          result = await this.client.invoke(
            new Api.auth.CheckPassword({
              password: password
            })
          );
        } else {
          throw error;
        }
      }

      // Salvar sessão
      if (this.client.session && this.client.session.save) {
        const sessionString = this.client.session.save();
        if (sessionString) {
          this.saveSession(sessionString);
        }
      }

      await TelegramCollectorConfig.setAuthenticated(true);

      // Limpar phoneCodeHash após autenticação bem-sucedida
      await TelegramCollectorConfig.update({ phone_code_hash: null });
      this.phoneCodeHash = null;

      return {
        success: true,
        user: result.user || { id: result.userId },
        message: 'Autenticação concluída com sucesso!'
      };
    } catch (error) {
      logger.error(`Erro ao verificar código: ${error.message}`);

      // Limpar phoneCodeHash se o código expirou
      if (error.message.includes('PHONE_CODE_EXPIRED') || error.message.includes('phone_code_expired')) {
        await TelegramCollectorConfig.update({ phone_code_hash: null });
        this.phoneCodeHash = null;
        throw new Error('Código de verificação expirado. Por favor, solicite um novo código.');
      }

      // Verificar se precisa de senha 2FA
      if (error.message.includes('password') || error.message.includes('2FA') || error.message.includes('senha') || error.message.includes('PASSWORD')) {
        throw new Error('Senha 2FA necessária');
      }

      throw error;
    }
  }

  /**
   * Verificar se está autenticado
   * Com cache de 10 segundos para evitar muitas verificações
   */
  async isAuthenticated() {
    try {
      // Cache: se verificou há menos de 10 segundos, retornar resultado em cache
      const now = Date.now();
      if (this.lastAuthCheck !== null && (now - this.lastAuthCheckTime) < 10000) {
        return this.lastAuthCheck;
      }

      // Lock: se já está verificando, aguardar resultado anterior
      if (this.isCheckingAuth) {
        // Aguardar até 5 segundos pelo resultado
        let waitCount = 0;
        while (this.isCheckingAuth && waitCount < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
          // Se já temos resultado em cache recente, usar ele
          if (this.lastAuthCheck !== null && (Date.now() - this.lastAuthCheckTime) < 10000) {
            return this.lastAuthCheck;
          }
        }
        // Se ainda está travado, retornar false
        if (this.isCheckingAuth) {
          logger.warn('⚠️ Verificação de autenticação travada, retornando false');
          return false;
        }
      }

      this.isCheckingAuth = true;

      try {
        await this.loadConfig();

        // Verificar se arquivo de sessão existe
        if (!fs.existsSync(this.sessionPath)) {
          this.lastAuthCheck = false;
          this.lastAuthCheckTime = now;
          return false;
        }

        this.createClient();

        // Timeout de 10 segundos para conexão
        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao conectar')), 10000);
        });

        try {
          await Promise.race([connectPromise, timeoutPromise]);
        } catch (connectError) {
          // Tratar erros de conexão (incluindo 502 Bad Gateway)
          const errorMessage = connectError.message || String(connectError);
          if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway') || errorMessage.includes('<html>')) {
            logger.warn(`⚠️ Erro de rede ao conectar (502 Bad Gateway). Problema temporário com servidores do Telegram.`);
            throw new Error('Erro de rede temporário (502 Bad Gateway)');
          }
          throw connectError;
        }

        // Timeout de 5 segundos para verificação de autorização
        let isAuth = false;
        try {
          const checkAuthPromise = this.client.checkAuthorization();
          const checkTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao verificar autorização')), 5000);
          });

          isAuth = await Promise.race([checkAuthPromise, checkTimeoutPromise]);
        } catch (checkError) {
          // Tratar erros de rede/502 especificamente no checkAuthorization
          const errorMessage = checkError.message || String(checkError);
          if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway') || errorMessage.includes('<html>')) {
            logger.warn(`⚠️ Erro de rede ao verificar autorização (502 Bad Gateway). Problema temporário.`);
            throw new Error('Erro de rede temporário (502 Bad Gateway)');
          }
          throw checkError;
        }

        if (isAuth) {
          await TelegramCollectorConfig.setAuthenticated(true);
        }

        // Cachear resultado
        this.lastAuthCheck = isAuth;
        this.lastAuthCheckTime = Date.now();

        return isAuth;
      } catch (authError) {
        // Tratar erros de rede/502 Bad Gateway especificamente
        const errorMessage = authError.message || String(authError);
        const isNetworkError = errorMessage.includes('502') ||
          errorMessage.includes('Bad Gateway') ||
          errorMessage.includes('<html>') ||
          errorMessage.includes('cloudflare') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('Timeout');

        if (isNetworkError) {
          logger.warn(`⚠️ Erro de rede ao verificar autenticação: ${errorMessage.substring(0, 100)}`);
          logger.warn(`   Isso geralmente indica problemas temporários de conexão com os servidores do Telegram.`);
          logger.warn(`   Usando status em cache ou assumindo que ainda está autenticado.`);

          // Se temos um resultado em cache recente (menos de 5 minutos), usar ele
          if (this.lastAuthCheck !== null && (Date.now() - this.lastAuthCheckTime) < 300000) {
            logger.debug(`   Usando resultado em cache: ${this.lastAuthCheck}`);
            return this.lastAuthCheck;
          }

          // Se não tem cache, assumir que está autenticado se estava marcado como tal no banco
          // (para evitar desconectar o usuário por problemas temporários de rede)
          const config = await TelegramCollectorConfig.get();
          if (config.is_authenticated) {
            logger.debug(`   Assumindo autenticado baseado no banco de dados (problema de rede temporário)`);
            return true;
          }

          return false;
        }

        // Para outros erros, logar e retornar false
        logger.warn(`⚠️ Erro ao verificar autenticação: ${errorMessage.substring(0, 200)}`);
        this.lastAuthCheck = false;
        this.lastAuthCheckTime = Date.now();
        return false;
      } finally {
        // Só desconectar se o listener não estiver ativo
        // Se o listener estiver rodando, manter a conexão aberta
        if (!this.isListenerActive) {
          try {
            if (this.client && (this.client.connected || this.client._connected)) {
              await this.client.disconnect();
              logger.debug('Cliente desconectado após verificação (listener não ativo)');
            }
          } catch (disconnectError) {
            // Ignorar erros de desconexão
            logger.debug(`Erro ao desconectar: ${disconnectError.message}`);
          }
        } else {
          logger.debug('✅ Cliente mantido conectado (listener ativo)');
        }
        this.isCheckingAuth = false;
      }
    } catch (error) {
      // Tratar erros de rede/502 especificamente no catch externo também
      const errorMessage = error.message || String(error);
      const isNetworkError = errorMessage.includes('502') ||
        errorMessage.includes('Bad Gateway') ||
        errorMessage.includes('<html>') ||
        errorMessage.includes('cloudflare');

      if (isNetworkError) {
        logger.warn(`⚠️ Erro de rede ao verificar autenticação (catch externo): ${errorMessage.substring(0, 100)}`);
        // Usar cache se disponível
        if (this.lastAuthCheck !== null && (Date.now() - this.lastAuthCheckTime) < 300000) {
          return this.lastAuthCheck;
        }
        // Assumir autenticado se estava no banco (problema temporário)
        try {
          const config = await TelegramCollectorConfig.get();
          if (config.is_authenticated) {
            return true;
          }
        } catch (configError) {
          // Ignorar erro ao buscar config
        }
      } else {
        logger.error(`Erro ao verificar autenticação: ${errorMessage.substring(0, 200)}`);
      }

      this.isCheckingAuth = false;
      this.lastAuthCheck = false;
      this.lastAuthCheckTime = Date.now();
      return false;
    }
  }

  /**
   * Obter cliente (para uso em outros serviços)
   */
  getClient() {
    // Verificar se cliente está realmente conectado antes de retornar
    if (this.client && (this.client.connected || this.client._connected)) {
      return this.client;
    }
    // Se não está conectado, retornar null para evitar uso de cliente desconectado
    // Isso evita loops infinitos de reconexão
    if (this.client && !this.client.connected && !this.client._connected) {
      logger.debug(`⚠️ Cliente existe mas não está conectado, retornando null`);
      return null;
    }
    if (!this.client) {
      logger.debug(`⚠️ Cliente não inicializado`);
      return null;
    }
    return this.client;
  }

  /**
   * Limpar cache de autenticação (útil quando configuração é atualizada)
   */
  clearAuthCache() {
    this.lastAuthCheck = null;
    this.lastAuthCheckTime = 0;
    logger.debug('Cache de autenticação limpo');
  }

  /**
   * Limpar sessão atual (forçar nova conexão)
   */
  async clearSession() {
    try {
      logger.info(`🗑️ Limpando sessão atual...`);

      // Desconectar cliente se existir
      if (this.client) {
        try {
          await this.disconnect();
        } catch (disconnectError) {
          logger.warn(`⚠️ Erro ao desconectar antes de limpar sessão: ${disconnectError.message}`);
        }
      }

      // Limpar arquivo de sessão
      if (this.sessionPath && fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
        logger.info(`✅ Arquivo de sessão removido: ${this.sessionPath}`);
      }

      // Limpar referências
      this.client = null;
      this.reconnectErrors = 0;

      logger.info(`✅ Sessão limpa. Nova conexão usará novo data center.`);
      return true;
    } catch (error) {
      logger.error(`Erro ao limpar sessão: ${error.message}`);
      return false;
    }
  }

  /**
   * Limpar todas as sessões do Telegram
   * DELETE /api/telegram-collector/sessions
   */
  async clearSessions() {
    try {
      let deletedCount = 0;

      // Desconectar cliente atual se existir
      if (this.client) {
        try {
          await this.client.disconnect();
          logger.info('✅ Cliente desconectado antes de limpar sessões');
        } catch (disconnectError) {
          logger.warn(`⚠️ Erro ao desconectar cliente: ${disconnectError.message}`);
        }
        this.client = null;
      }

      // Limpar sessão atual
      this.phoneCodeHash = null;

      // Limpar diretório de sessões
      if (fs.existsSync(SESSIONS_DIR)) {
        const files = fs.readdirSync(SESSIONS_DIR);

        for (const file of files) {
          try {
            const filePath = path.join(SESSIONS_DIR, file);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
              deletedCount++;
              logger.info(`   🗑️ Removido: ${file}`);
            }
          } catch (fileError) {
            logger.warn(`⚠️ Erro ao remover arquivo ${file}: ${fileError.message}`);
          }
        }
      }

      logger.info(`✅ Limpeza de sessões concluída. ${deletedCount} arquivo(s) removido(s).`);

      return {
        deletedCount,
        message: `${deletedCount} sessão(ões) removida(s) com sucesso`
      };
    } catch (error) {
      logger.error(`Erro ao limpar sessões: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obter informações sobre o servidor MTProto atual
   */
  getServerInfo() {
    try {
      if (!this.client) {
        return {
          connected: false,
          message: 'Cliente não inicializado'
        };
      }

      const info = {
        connected: this.client.connected || false,
        dcId: this.client.session?.dcId || null,
        server: null,
        port: null
      };

      // Tentar obter informações do servidor
      try {
        if (this.client._connection) {
          info.server = this.client._connection._ip || null;
          info.port = this.client._connection._port || null;
        }
      } catch (e) {
        // Ignorar erros
      }

      return info;
    } catch (error) {
      logger.error(`Erro ao obter informações do servidor: ${error.message}`);
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export default new TelegramClientService();


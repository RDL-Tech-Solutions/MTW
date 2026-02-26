import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
// import qrcode from 'qrcode-terminal'; // Opcional, mantido para debug se necessário
import { config } from './config.js';
import logger from '../../config/logger.js';
import fs from 'fs';
import path from 'path';

class WhatsAppClient {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.isInitializing = false;
        this.pairingCodeRequested = false;
        this.lastQr = null;
    }

    getQrCode() {
        return this.lastQr;
    }

    async initialize(overrideConfig = {}) {
        // Carregar configurações do banco
        try {
            const BotConfig = (await import('../../models/BotConfig.js')).default;
            const dbConfig = await BotConfig.get();

            // 1. Configurações do Banco (Prioridade Média)
            if (dbConfig.whatsapp_web_enabled) {
                config.update({
                    enabled: true,
                    pairingNumber: dbConfig.whatsapp_web_pairing_number || config.pairingNumber,
                    adminNumbers: dbConfig.whatsapp_web_admin_numbers || (config.adminNumbers || []).join(',')
                });
            }

            // 2. Overrides (Alta Prioridade - ex: durante pareamento antes de salvar)
            if (overrideConfig.enabled !== undefined || overrideConfig.pairingNumber) {
                config.update(overrideConfig);
            }

            if (!config.enabled) {
                logger.info('🚫 WhatsApp Web integration is disabled');
                return;
            }

            if (this.isInitializing) {
                logger.info('⏳ WhatsApp Client is already initializing. Please wait...');
                return;
            }

            if (this.client && this.isReady) {
                logger.info('⚠️ WhatsApp Client already initialized and ready.');
                return;
            }

            this.isInitializing = true;

            // Usar caminho absoluto para evitar problemas de contexto
            const absoluteSessionPath = path.resolve(config.sessionPath);
            
            // Criar diretório de sessão se não existir
            if (!fs.existsSync(absoluteSessionPath)) {
                logger.info(`📁 Creating session directory: ${absoluteSessionPath}`);
                fs.mkdirSync(absoluteSessionPath, { recursive: true });
            }

            // Verificar permissões de escrita
            try {
                fs.accessSync(absoluteSessionPath, fs.constants.W_OK);
                logger.info(`✅ Session directory is writable: ${absoluteSessionPath}`);
            } catch (permErr) {
                logger.error(`❌ Session directory is not writable: ${absoluteSessionPath}`);
                throw new Error(`Session directory is not writable: ${absoluteSessionPath}`);
            }

            // Tentar limpar lockfile se existir (pode estar travado de uma sessão anterior que caiu)
            const lockPath = path.join(absoluteSessionPath, 'lockfile');

            try {
                if (fs.existsSync(lockPath)) {
                    logger.info(`🧹 Found existing lockfile at ${lockPath}, attempting to remove...`);
                    fs.unlinkSync(lockPath);
                }
            } catch (fsErr) {
                logger.warn('⚠️ Could not remove lockfile (might be in use):', fsErr.message);
            }

            logger.info(`🚀 Initializing WhatsApp Web Client with session at: ${absoluteSessionPath}`);

            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: absoluteSessionPath,
                    clientId: 'whatsapp-bot' // ID único para esta instância
                }),
                takeoverOnConflict: true,
                takeoverTimeoutMs: 3000,
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--disable-component-update',
                        '--disable-default-apps',
                        '--mute-audio',
                        '--disable-domain-reliability',
                        '--disable-features=AudioServiceOutOfProcess',
                        '--disable-web-security',
                        '--single-process' // Útil em containers/VPS com pouca RAM
                    ],
                    ...config.puppeteer,
                    protocolTimeout: 300000
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                }
            });

            this.registerEvents();

            logger.info('⏳ Waiting for Client to initialize...');
            await this.client.initialize();
            logger.info('✅ Client initialization setup complete.');

        } catch (error) {
            logger.error('❌ Error creating/initializing WhatsApp Client:', error);
            // Se falhar, limpar client para permitir retry
            this.client = null;
            this.isReady = false;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Desconecta o cliente, limpa sessão e reseta estado
     */
    async disconnect() {
        logger.info('🔌 Disconnecting and cleaning up WhatsApp Client...');

        try {
            // 1. Logout se estiver conectado
            if (this.client && this.isReady) {
                try {
                    await this.client.logout();
                    logger.info('✅ Client logged out.');
                } catch (logoutErr) {
                    logger.warn('⚠️ Error during logout (ignoring):', logoutErr.message);
                }
            }

            // 2. Destruir cliente puppeteer
            if (this.client) {
                try {
                    await this.client.destroy();
                    logger.info('✅ Client destroyed.');
                } catch (destroyErr) {
                    logger.warn('⚠️ Error during destroy (ignoring):', destroyErr.message);
                }
            }

            // 3. Resetar estado interno
            this.client = null;
            this.isReady = false;
            this.isInitializing = false;
            this.pairingCodeRequested = false;
            this.lastQr = null;

            // 4. Remover diretório da sessão
            const absoluteSessionPath = path.resolve(config.sessionPath);
            if (fs.existsSync(absoluteSessionPath)) {
                logger.info(`🧹 Removing session directory: ${absoluteSessionPath}`);
                // Retry pattern simples para exclusão de arquivos (Windows pode travar)
                try {
                    // Tentar várias vezes remover (Windows Lock Fix)
                    let retries = 10;
                    while (retries > 0) {
                        try {
                            if (fs.existsSync(absoluteSessionPath)) {
                                fs.rmSync(absoluteSessionPath, { recursive: true, force: true });
                            }
                            logger.info('✅ Session directory removed.');
                            break;
                        } catch (err) {
                            // Se for erro de permissão ou busy, espera e tenta de novo
                            if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
                                logger.warn(`⚠️ Session dir busy/locked, retrying in 1s... (${retries} left)`);
                                await new Promise(r => setTimeout(r, 1000));
                                retries--;
                            } else {
                                // Se for outro erro (ex: não existe mais), ignora ou lança
                                if (err.code === 'ENOENT') break;
                                throw err;
                            }
                        }
                    }
                } catch (fsErr) {
                    logger.error('❌ Failed to remove session directory (might be locked):', fsErr.message);
                    // Tentar novamente após delay
                    setTimeout(() => {
                        try {
                            if (fs.existsSync(absoluteSessionPath)) {
                                fs.rmSync(absoluteSessionPath, { recursive: true, force: true });
                                logger.info('✅ Session directory removed (retry).');
                            }
                        } catch (retryErr) {
                            logger.error('❌ Failed to remove session directory on retry:', retryErr.message);
                        }
                    }, 5000);
                }
            }

            // 5. Atualizar config em memória
            config.update({
                enabled: false,
                pairingNumber: null
            });

        } catch (error) {
            logger.error('❌ Error during disconnect:', error);
            throw error;
        }
    }

    /**
     * Garante que o cliente está inicializado (útil se foi habilitado após startup ou durante pareamento)
     * @param {Object} overrideConfig - Configurações opcionais para forçar inicialização
     */
    async ensureInitialized(overrideConfig = {}) {
        // Atualizar configurações em memória se fornecidas
        if (overrideConfig.enabled !== undefined || overrideConfig.pairingNumber) {
            config.update(overrideConfig);
        }

        if (!this.client) {
            logger.info('🔄 Client not initialized. Attempting to initialize now...');
            // Forçar recarregamento de configs e init
            // Passar flag para ignorar DB check se tivermos override?
            // Melhor: O initialize recarrega do DB. Se o DB estiver false, ele vai sobrescrever o nosso update.
            // Precisamos passar o override para o initialize também.
            await this.initialize(overrideConfig);

            // Aguardar um pouco para o processo do puppeteer arrancar
            if (this.client) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Solicitar código de pareamento para um número específico
     * @param {string} phoneNumber - Número de telefone (apenas dígitos, ex: 5511999999999)
     * @returns {Promise<string>} O código de pareamento
     */
    async requestPairing(phoneNumber) {
        if (!this.client) {
            throw new Error('Cliente WhatsApp não inicializado. Verifique se o serviço está habilitado.');
        }

        // Normalização: garantir que o número contém apenas dígitos
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        logger.info(`📱 Solicitando código de pareamento para: ${cleanNumber} (original: ${phoneNumber})`);

        try {
            // Aguardar um pouco para garantir que o socket está pronto se acabamos de iniciar
            // Aumentando delay para garantir carregamento total do WASore
            if (this.client.pupPage) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                // FIX: Inject onCodeReceivedEvent if missing (library doesn't inject it for dynamic pairing)
                try {
                    const isDefined = await this.client.pupPage.evaluate(() => typeof window.onCodeReceivedEvent === 'function');
                    if (!isDefined) {
                        logger.info('🔧 Injecting missing onCodeReceivedEvent handler for pairing...');
                        await this.client.pupPage.exposeFunction('onCodeReceivedEvent', (code) => {
                            this.client.emit('code', code);
                            return code;
                        });
                    }
                } catch (injectErr) {
                    logger.warn('⚠️ Error checking/injecting onCodeReceivedEvent:', injectErr.message);
                }
            }

            const code = await this.client.requestPairingCode(cleanNumber);
            this.pairingCodeRequested = true;
            return code;
        } catch (error) {
            const errorMessage = error.message || error.toString();
            logger.error(`❌ Erro original ao solicitar pairing code: ${errorMessage}`);

            // Tratar o infame erro "t: t" ou erros de Rate Limit
            if (errorMessage === 't: t' || errorMessage.includes('DEBUG_ERROR') || errorMessage.includes('429')) {
                const enhancedError = new Error('RATE_LIMIT_OR_PROTOCOL_ERROR');
                enhancedError.originalError = errorMessage;
                enhancedError.fullError = error; // Incluir o objeto de erro completo

                if (errorMessage.includes('429') || errorMessage.includes('rate-overlimit') || errorMessage.includes('IQErrorRateOverlimit')) {
                    enhancedError.reason = 'RATE_LIMIT';
                } else if (errorMessage === 't: t') {
                    enhancedError.reason = 'WHATSAPP_INTERNAL_GENERIC_ERROR';
                } else {
                    enhancedError.reason = 'GENERIC_PROTOCOL_FAILURE';
                }

                throw enhancedError;
            }

            throw error;
        }
    }

    registerEvents() {
        this.client.on('qr', async (qr) => {
            // Save QR for retrieval via API
            this.lastQr = qr;

            logger.info('📱 QR Code received. Waiting for scan...');
            // qrcode.generate(qr, { small: true }); // Descomentar se quiser QR no terminal
        });

        this.client.on('ready', () => {
            this.isReady = true;
            this.lastQr = null; // Limpar QR code após conexão
            logger.info('✅ WhatsApp Client is READY!');
        });

        this.client.on('authenticated', () => {
            logger.info('✅ WhatsApp Client AUTHENTICATED');
        });

        this.client.on('auth_failure', (msg) => {
            logger.error(`❌ WhatsApp Auth Failure: ${msg}`);
        });

        this.client.on('disconnected', (reason) => {
            this.isReady = false;
            this.pairingCodeRequested = false;
            logger.warn(`⚠️ WhatsApp Client Disconnected: ${reason}`);

            // Se foi LOGOUT, talvez não devamos tentar re-init imediatamente sem intervenção do usuário?
            // Mas para automação, o re-init vai tentar buscar novas configs/esperar QR.
            if (reason === 'LOGOUT') {
                logger.info('👤 User logged out. Client will remain idle until re-initialized.');
                this.client = null; // Limpar client para reset total no próximo init
                return;
            }

            // Para outros erros (NAVIGATION, etc), tentar re-inicializar com delay
            setTimeout(() => {
                this.initialize().catch(err => logger.error('Error on auto-reinit:', err));
            }, 5000);
        });

        this.client.on('message_create', async (msg) => {
            // Ignorar mensagens de status
            if (msg.from === 'status@broadcast') return;

            // Log de debug para entender de onde vem
            // logger.debug(`📩 Msg received from ${msg.from}: ${msg.body.substring(0, 50)}...`);

            // Aqui integraremos com o messageHandler
            try {
                const { handleMessage } = await import('./handlers/messageHandler.js');
                await handleMessage(this.client, msg);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });
    }

    async getChats() {
        if (!this.isReady) {
            throw new Error('WhatsApp Client is not ready');
        }

        let chats = [];
        try {
            // Buscar chats normais (Grupos e PVs)
            chats = await this.client.getChats();
        } catch (error) {
            logger.error(`❌ Erro ao buscar CHATS do WhatsApp: ${error.message}`);
            // Se for erro "t", é erro interno do Puppeteer/WWebJS, vamos tentar continuar ou retornar vazio
            if (error.message === 't') {
                logger.warn('⚠️ Ignorando erro "t" ao buscar chats. Retornando lista vazia de chats.');
                chats = [];
            } else {
                throw error;
            }
        }

        // Buscar Canais (Newsletters) - Suportado nas versões mais recentes do whatsapp-web.js
        let channels = [];
        try {
            if (typeof this.client.getChannels === 'function') {
                channels = await this.client.getChannels();
            }
        } catch (error) {
            // Canais podem falhar com "t" também ou não estar disponíveis
            logger.warn(`⚠️ Erro ao buscar CANAIS do WhatsApp (não crítico): ${error.message}`);
        }

        const mappedChats = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name || chat.formattedTitle || 'Sem Nome',
            isGroup: chat.isGroup,
            isChannel: false,
            unreadCount: chat.unreadCount
        }));

        const mappedChannels = channels.map(channel => ({
            id: channel.id._serialized,
            name: channel.name || 'Canal Sem Nome',
            isGroup: false,
            isChannel: true,
            unreadCount: channel.unreadCount || 0
        }));

        return [...mappedChats, ...mappedChannels];
    }

    async sendMessage(to, content, options = {}) {
        if (!this.isReady) {
            throw new Error('WhatsApp Client is not ready');
        }
        return await this.client.sendMessage(to, content, options);
    }
}

export default new WhatsAppClient();

import axios from 'axios';
import logger from '../../config/logger.js';
import AppSettings from '../../models/AppSettings.js';

class MeliAuth {
  constructor() {
    // Inicializar com valores do .env (fallback)
    this.clientId = process.env.MELI_CLIENT_ID || process.env.MELI_APP_ID;
    this.clientSecret = process.env.MELI_CLIENT_SECRET || process.env.MELI_SECRET_KEY;
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.refreshToken = process.env.MELI_REFRESH_TOKEN;
    this.redirectUri = process.env.MELI_REDIRECT_URI;

    // Se temos um token fixo do env, assumimos que expira logo
    // então vamos definir para atualizar na próxima chamada se tiver refresh token
    this.tokenExpiresAt = this.accessToken ? Date.now() + 3600000 : null;

    // Carregar configurações do banco (async, será chamado no primeiro uso)
    this.settingsLoaded = false;
    this.loadSettings();
  }

  /**
   * Carregar configurações do banco de dados
   */
  async loadSettings() {
    try {
      const config = await AppSettings.getMeliConfig();
      const previousRefreshToken = this.refreshToken;
      
      this.clientId = config.clientId || this.clientId;
      this.clientSecret = config.clientSecret || this.clientSecret;
      this.accessToken = config.accessToken || this.accessToken;
      this.refreshToken = config.refreshToken || this.refreshToken;
      this.redirectUri = config.redirectUri || this.redirectUri;
      this.settingsLoaded = true;

      // Se um novo refresh token foi carregado (diferente do anterior), resetar flag de inválido
      if (this.refreshToken && this.refreshToken !== previousRefreshToken) {
        this.refreshTokenInvalid = false;
        logger.info('🔄 Novo refresh token detectado, resetando flag de inválido');
      }

      // Debug: verificar se credenciais estão carregadas
      console.log('🔑 MeliAuth inicializado');
      console.log('   CLIENT_ID:', this.clientId ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
      console.log('   REFRESH_TOKEN:', this.refreshToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
      console.log('   REFRESH_TOKEN_INVALID:', this.refreshTokenInvalid);
    } catch (error) {
      logger.warn(`⚠️ Erro ao carregar configurações do ML do banco: ${error.message}`);
      // Continuar com valores do .env
      console.log('🔑 MeliAuth inicializado (usando .env)');
      console.log('   CLIENT_ID:', this.clientId ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
      console.log('   REFRESH_TOKEN:', this.refreshToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    }
  }

  /**
   * Resetar flag de refresh token inválido (usado quando novo token é obtido)
   */
  resetRefreshTokenInvalid() {
    this.refreshTokenInvalid = false;
    logger.info('🔄 Flag de refresh token inválido resetada');
  }

  /**
   * Obter token válido (Renovar via Refresh Token ou Client Credentials)
   */
  async getAccessToken() {
    try {
      // Carregar configurações se ainda não foram carregadas
      if (!this.settingsLoaded) {
        await this.loadSettings();
      }

      // Se temos token válido, retornar
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      logger.info('🔑 Atualizando token do Mercado Livre...');

      let response;

      // Prioridade: Refresh Token (Acesso de usuário/seller)
      // IMPORTANTE: Enviar parâmetros no body (não querystring) conforme documentação de segurança
      // Pular refresh token se já foi marcado como inválido
      if (this.refreshToken && !this.refreshTokenInvalid) {
        try {
          // Validar que todos os valores estão presentes
          if (!this.clientId || !this.clientSecret || !this.refreshToken) {
            throw new Error('Credenciais incompletas para refresh token');
          }

          // Usar URLSearchParams para garantir formato correto
          const params = new URLSearchParams();
          params.append('grant_type', 'refresh_token');
          params.append('client_id', this.clientId.trim());
          params.append('client_secret', this.clientSecret.trim());
          params.append('refresh_token', this.refreshToken.trim());

          logger.debug('🔄 Tentando renovar token via Refresh Token...');

          response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded', 
              'Accept': 'application/json' 
            },
            timeout: 15000
          });

          this.refreshToken = response.data.refresh_token; // Atualizar refresh token se mudar
          logger.info('✅ Token renovado via Refresh Token');

        } catch (refreshError) {
          const status = refreshError.response?.status;
          const errorData = refreshError.response?.data || {};
          const errorMessage = errorData.message || errorData.error || refreshError.message;

          if (status === 400) {
            if (errorMessage?.includes('invalid_grant') || errorMessage?.includes('invalid_token') ||
                errorMessage?.includes('expired') || errorMessage?.includes('already used')) {
              logger.error(`❌ Refresh token inválido, expirado ou já utilizado: ${errorMessage}`);
              logger.error('⚠️ O refresh token do Mercado Livre expira após 6 meses de inatividade');
              logger.error('⚠️ Cada refresh token só pode ser usado UMA vez - após uso, um novo é gerado');
              logger.error('💡 Obtenha um novo refresh token usando o fluxo de autorização no painel admin');
              
              // Marcar refresh token como inválido para evitar tentativas futuras
              this.refreshTokenInvalid = true;
              this.refreshToken = null; // Limpar da memória
              
              // Tentar limpar do banco também (opcional, mas útil)
              try {
                await AppSettings.updateMeliToken(null, null);
                logger.info('🧹 Refresh token inválido removido do banco de dados');
              } catch (dbError) {
                logger.warn(`⚠️ Erro ao limpar refresh token do banco: ${dbError.message}`);
              }
              
              // Continuar para tentar client credentials como fallback
              logger.info('🔄 Tentando usar Client Credentials como fallback...');
            } else {
              logger.error(`❌ Erro 400 ao renovar token: ${errorMessage}`);
              logger.error('📋 Detalhes:', JSON.stringify(errorData, null, 2));
            }
          } else {
            logger.warn(`⚠️ Falha ao renovar via Refresh Token (${status}): ${errorMessage}`);
          }
          // Fallback para Client Credentials abaixo se falhar (apenas para outros erros)
        }
      }

      // Fallback: Client Credentials (Acesso de Aplicação)
      // IMPORTANTE: Enviar parâmetros no body (não querystring) conforme documentação de segurança
      if (!response && this.clientId && this.clientSecret) {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);

        response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded', 
            'Accept': 'application/json' 
          }
        });
        logger.info('✅ Token gerado via Client Credentials');
      }

      if (response && response.data) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 21600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;
        
        // Salvar token atualizado no banco
        try {
          await AppSettings.updateMeliToken(
            this.accessToken,
            response.data.refresh_token || this.refreshToken
          );
        } catch (error) {
          logger.warn(`⚠️ Erro ao salvar token no banco: ${error.message}`);
        }
        
        return this.accessToken;
      }

      throw new Error('Nenhum método de autenticação funcionou.');

    } catch (error) {
      logger.error(`❌ Erro auth ML: ${error.message}`);
      if (this.accessToken) return this.accessToken; // Tentar usar o antigo se falhar
      throw error;
    }
  }

  /**
   * Fazer requisição autenticada à API do ML
   * IMPORTANTE: Access token deve ser enviado em TODAS as chamadas (públicas e privadas)
   */
  async authenticatedRequest(url, params = {}) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      // Se o token expirou, tentar novamente com novo token
      // Mas não tentar se o refresh token já foi marcado como inválido
      if (status === 401 && !this.refreshTokenInvalid) {
        logger.warn('⚠️ Token expirado/inválido. Tentando renovar...');
        this.accessToken = null;
        this.tokenExpiresAt = null;

        try {
          // Tentar uma vez mais
          const token = await this.getAccessToken();
          const response = await axios.get(url, {
            params,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            timeout: 15000
          });

          return response.data;
        } catch (retryError) {
          // Se falhar novamente e for erro de refresh token inválido, não tentar mais
          if (retryError.message?.includes('Refresh token expirado')) {
            logger.error('❌ Refresh token definitivamente inválido. Não tentando mais.');
            throw retryError;
          }
          throw retryError;
        }
      } else if (status === 401 && this.refreshTokenInvalid) {
        logger.warn('⚠️ Token expirado, mas refresh token está inválido. Usando fallback ou retornando erro.');
      }

      // Tratamento detalhado de erro 403 conforme documentação
      if (status === 403) {
        const errorCode = errorData?.code || errorData?.error;
        const errorMessage = errorData?.message || error.message;

        logger.error(`❌ Erro 403 - Acesso negado:`);
        logger.error(`   Código: ${errorCode}`);
        logger.error(`   Mensagem: ${errorMessage}`);
        logger.error(`   URL: ${url}`);
        
        // Sugestões baseadas na documentação
        if (errorCode === 'FORBIDDEN' || errorMessage?.includes('Invalid scopes')) {
          logger.error(`   💡 Verifique se os scopes necessários estão configurados no DevCenter`);
        }
        if (errorMessage?.includes('IP')) {
          logger.error(`   💡 Verifique se o IP está na lista permitida da aplicação`);
        }
        if (errorMessage?.includes('blocked') || errorMessage?.includes('disabled')) {
          logger.error(`   💡 Verifique se a aplicação não está bloqueada ou desabilitada`);
        }
        if (errorMessage?.includes('user') || errorMessage?.includes('inactive')) {
          logger.error(`   💡 Verifique se o usuário está ativo e validado`);
        }
        if (errorMessage?.includes('token')) {
          logger.error(`   💡 Verifique se o access token corresponde ao owner da informação`);
        }
      }

      throw error;
    }
  }

  /**
   * Verificar se as credenciais estão configuradas
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }
}

export default new MeliAuth();

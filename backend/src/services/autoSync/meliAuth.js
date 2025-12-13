import axios from 'axios';
import logger from '../../config/logger.js';

class MeliAuth {
  constructor() {
    this.clientId = process.env.MELI_CLIENT_ID || process.env.MELI_APP_ID;
    this.clientSecret = process.env.MELI_CLIENT_SECRET || process.env.MELI_SECRET_KEY;
    this.accessToken = process.env.MELI_ACCESS_TOKEN;
    this.refreshToken = process.env.MELI_REFRESH_TOKEN;
    this.redirectUri = process.env.MELI_REDIRECT_URI;

    // Se temos um token fixo do env, assumimos que expira logo
    // então vamos definir para atualizar na próxima chamada se tiver refresh token
    this.tokenExpiresAt = this.accessToken ? Date.now() + 3600000 : null;

    // Debug: verificar se credenciais estão carregadas
    console.log('🔑 MeliAuth inicializado');
    console.log('   CLIENT_ID:', this.clientId ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
    console.log('   REFRESH_TOKEN:', this.refreshToken ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  }

  /**
   * Obter token válido (Renovar via Refresh Token ou Client Credentials)
   */
  async getAccessToken() {
    try {
      // Se temos token válido, retornar
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      logger.info('🔑 Atualizando token do Mercado Livre...');

      let response;

      // Prioridade: Refresh Token (Acesso de usuário/seller)
      if (this.refreshToken) {
        try {
          response = await axios.post('https://api.mercadolibre.com/oauth/token', {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken
          }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
          });

          this.refreshToken = response.data.refresh_token; // Atualizar refresh token se mudar
          logger.info('✅ Token renovado via Refresh Token');

        } catch (refreshError) {
          logger.warn(`⚠️ Falha ao renovar via Refresh Token: ${refreshError.message}`);
          // Fallback para Client Credentials abaixo se falhar
        }
      }

      // Fallback: Client Credentials (Acesso de Aplicação)
      if (!response && this.clientId && this.clientSecret) {
        response = await axios.post('https://api.mercadolibre.com/oauth/token', {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }
        });
        logger.info('✅ Token gerado via Client Credentials');
      }

      if (response && response.data) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 21600;
        this.tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000;
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
      // Se o token expirou, tentar novamente com novo token
      if (error.response?.status === 401) {
        logger.warn('⚠️ Token expirado, renovando...');
        this.accessToken = null;
        this.tokenExpiresAt = null;

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

import axios from 'axios';
import logger from '../../config/logger.js';

class MeliAuth {
  constructor() {
    this.appId = process.env.MELI_APP_ID;
    this.secretKey = process.env.MELI_SECRET_KEY;
    this.redirectUri = process.env.MELI_REDIRECT_URI;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Debug: verificar se credenciais estão carregadas
    console.log('🔑 MeliAuth inicializado');
    console.log('   APP_ID:', this.appId ? `${this.appId.substring(0, 10)}...` : 'NÃO CONFIGURADO');
    console.log('   SECRET_KEY:', this.secretKey ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  }

  /**
   * Gerar access token usando client credentials
   * Documentação: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
   */
  async getAccessToken() {
    try {
      // Se já temos um token válido, retornar
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        logger.info('✅ Usando access token existente do Mercado Livre');
        return this.accessToken;
      }

      logger.info('🔑 Gerando novo access token do Mercado Livre...');

      const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.appId,
        client_secret: this.secretKey
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      // Token expira em X segundos, vamos guardar com margem de segurança
      const expiresIn = response.data.expires_in || 21600; // 6 horas por padrão
      this.tokenExpiresAt = Date.now() + (expiresIn * 1000) - 60000; // -1 minuto de margem

      logger.info('✅ Access token gerado com sucesso!');
      logger.info(`⏰ Expira em ${Math.floor(expiresIn / 3600)} horas`);

      return this.accessToken;
    } catch (error) {
      logger.error(`❌ Erro ao gerar access token: ${error.message}`);
      if (error.response) {
        logger.error(`   Status: ${error.response.status}`);
        logger.error(`   Dados: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error('Falha ao autenticar com Mercado Livre');
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
    return !!(this.appId && this.secretKey);
  }
}

export default new MeliAuth();

import AppSettings from '../models/AppSettings.js';
import logger from '../config/logger.js';
import axios from 'axios';

class AppSettingsController {
  /**
   * Obter todas as configurações
   * GET /api/settings
   */
  async getSettings(req, res) {
    try {
      const settings = await AppSettings.get();
      
      // Mascarar valores sensíveis
      const safeSettings = {
        ...settings,
        meli_client_secret: settings.meli_client_secret ? '***' : null,
        meli_access_token: settings.meli_access_token ? '***' : null,
        meli_refresh_token: settings.meli_refresh_token ? '***' : null,
        shopee_partner_key: settings.shopee_partner_key ? '***' : null,
        amazon_secret_key: settings.amazon_secret_key ? '***' : null,
        expo_access_token: settings.expo_access_token ? '***' : null,
        backend_api_key: settings.backend_api_key ? '***' : null,
        openrouter_api_key: settings.openrouter_api_key ? '***' : null
      };

      res.json({
        success: true,
        data: safeSettings
      });
    } catch (error) {
      logger.error(`Erro ao buscar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações',
        error: error.message
      });
    }
  }

  /**
   * Atualizar configurações
   * PUT /api/settings
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;

      // Validar campos obrigatórios apenas se estiverem sendo atualizados
      // (não validar se o campo não foi enviado na requisição)
      if (updates.shopee_partner_id !== undefined && updates.shopee_partner_id && 
          updates.shopee_partner_key !== undefined && !updates.shopee_partner_key) {
        return res.status(400).json({
          success: false,
          message: 'Shopee Partner Key é obrigatório quando Partner ID é fornecido'
        });
      }

      if (updates.amazon_access_key !== undefined && updates.amazon_access_key && 
          updates.amazon_secret_key !== undefined && !updates.amazon_secret_key) {
        return res.status(400).json({
          success: false,
          message: 'Amazon Secret Key é obrigatório quando Access Key é fornecido'
        });
      }

      // Validar apenas se ambos client_id e client_secret estão sendo atualizados
      // Se apenas client_id está sendo atualizado, não exigir client_secret
      if (updates.meli_client_id !== undefined && updates.meli_client_id && 
          updates.meli_client_secret !== undefined && !updates.meli_client_secret) {
        return res.status(400).json({
          success: false,
          message: 'Mercado Livre Client Secret é obrigatório quando Client ID é fornecido'
        });
      }

      // Log dos campos que estão sendo atualizados (sem valores sensíveis)
      const logUpdates = { ...updates };
      if (logUpdates.meli_client_secret) logUpdates.meli_client_secret = '***';
      if (logUpdates.meli_access_token) logUpdates.meli_access_token = '***';
      if (logUpdates.meli_refresh_token) logUpdates.meli_refresh_token = '***';
      if (logUpdates.shopee_partner_key) logUpdates.shopee_partner_key = '***';
      if (logUpdates.amazon_secret_key) logUpdates.amazon_secret_key = '***';
      if (logUpdates.expo_access_token) logUpdates.expo_access_token = '***';
      if (logUpdates.backend_api_key) logUpdates.backend_api_key = '***';
      if (logUpdates.openrouter_api_key) logUpdates.openrouter_api_key = '***';
      
      logger.info('✅ Atualizando configurações:', JSON.stringify(logUpdates));

      const settings = await AppSettings.update(updates);

      logger.info('✅ Configurações da aplicação atualizadas com sucesso');

      // Retornar com valores mascarados
      const safeSettings = {
        ...settings,
        meli_client_secret: settings.meli_client_secret ? '***' : null,
        meli_access_token: settings.meli_access_token ? '***' : null,
        meli_refresh_token: settings.meli_refresh_token ? '***' : null,
        shopee_partner_key: settings.shopee_partner_key ? '***' : null,
        amazon_secret_key: settings.amazon_secret_key ? '***' : null,
        expo_access_token: settings.expo_access_token ? '***' : null,
        backend_api_key: settings.backend_api_key ? '***' : null,
        openrouter_api_key: settings.openrouter_api_key ? '***' : null
      };

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        data: safeSettings
      });
    } catch (error) {
      logger.error(`Erro ao atualizar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configurações',
        error: error.message
      });
    }
  }

  /**
   * Obter configurações de uma plataforma específica
   * GET /api/settings/:platform
   */
  async getPlatformSettings(req, res) {
    try {
      const { platform } = req.params;

      let config;
      switch (platform) {
        case 'meli':
        case 'mercadolivre':
          config = await AppSettings.getMeliConfig();
          break;
        case 'shopee':
          config = await AppSettings.getShopeeConfig();
          break;
        case 'amazon':
          config = await AppSettings.getAmazonConfig();
          break;
        case 'expo':
          config = await AppSettings.getExpoConfig();
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Plataforma não reconhecida'
          });
      }

      // Mascarar valores sensíveis
      const safeConfig = { ...config };
      if (safeConfig.clientSecret) safeConfig.clientSecret = '***';
      if (safeConfig.accessToken) safeConfig.accessToken = '***';
      if (safeConfig.refreshToken) safeConfig.refreshToken = '***';
      if (safeConfig.partnerKey) safeConfig.partnerKey = '***';
      if (safeConfig.secretKey) safeConfig.secretKey = '***';
      if (safeConfig.accessToken) safeConfig.accessToken = '***';

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      logger.error(`Erro ao buscar configurações da plataforma: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar configurações',
        error: error.message
      });
    }
  }

  /**
   * Gerar URL de autorização do Mercado Livre
   * POST /api/settings/meli/authorize
   */
  async generateMeliAuthUrl(req, res) {
    try {
      const { client_id, redirect_uri } = req.body;

      if (!client_id || !redirect_uri) {
        return res.status(400).json({
          success: false,
          message: 'Client ID e Redirect URI são obrigatórios'
        });
      }

      // Gerar URL de autorização do Mercado Livre
      const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

      res.json({
        success: true,
        data: {
          auth_url: authUrl
        }
      });
    } catch (error) {
      logger.error(`Erro ao gerar URL de autorização: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL de autorização',
        error: error.message
      });
    }
  }

  /**
   * Trocar código de autorização por tokens (refresh token e access token)
   * POST /api/settings/meli/exchange-code
   */
  async exchangeMeliCode(req, res) {
    try {
      const { code, client_id, client_secret, redirect_uri } = req.body;

      if (!code || !client_id || !client_secret || !redirect_uri) {
        return res.status(400).json({
          success: false,
          message: 'Code, Client ID, Client Secret e Redirect URI são obrigatórios'
        });
      }

      logger.info('🔄 Trocando código por tokens do Mercado Livre...');

      // Trocar código por tokens
      const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: client_id,
        client_secret: client_secret,
        code: code,
        redirect_uri: redirect_uri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const { access_token, refresh_token, expires_in, user_id } = response.data;

      // Salvar tokens no banco de dados
      await AppSettings.update({
        meli_access_token: access_token,
        meli_refresh_token: refresh_token
      });

      logger.info('✅ Tokens do Mercado Livre salvos com sucesso');

      res.json({
        success: true,
        message: 'Tokens obtidos e salvos com sucesso',
        data: {
          access_token: access_token,
          refresh_token: refresh_token,
          expires_in: expires_in,
          user_id: user_id
        }
      });
    } catch (error) {
      logger.error(`Erro ao trocar código por tokens: ${error.message}`);
      
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data || {};

      res.status(error.response?.status || 500).json({
        success: false,
        message: 'Erro ao trocar código por tokens',
        error: errorMessage,
        details: errorDetails
      });
    }
  }

  /**
   * Gerar access token usando refresh token
   * POST /api/settings/meli/refresh-token
   */
  async refreshMeliToken(req, res) {
    try {
      // Obter configurações do banco
      const config = await AppSettings.getMeliConfig();

      if (!config.clientId || !config.clientSecret) {
        return res.status(400).json({
          success: false,
          message: 'Client ID e Client Secret devem estar configurados'
        });
      }

      if (!config.refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh Token não encontrado. Obtenha um refresh token primeiro.'
        });
      }

      logger.info('🔄 Renovando access token do Mercado Livre...');

      // Renovar token usando refresh token
      const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Atualizar refresh token se um novo foi retornado
      const newRefreshToken = refresh_token || config.refreshToken;

      // Salvar tokens atualizados no banco
      await AppSettings.updateMeliToken(access_token, newRefreshToken);

      logger.info('✅ Access token renovado com sucesso');

      res.json({
        success: true,
        message: 'Access token gerado com sucesso',
        data: {
          access_token: access_token,
          refresh_token: newRefreshToken,
          expires_in: expires_in
        }
      });
    } catch (error) {
      logger.error(`Erro ao renovar token: ${error.message}`);
      
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data || {};

      res.status(error.response?.status || 500).json({
        success: false,
        message: 'Erro ao renovar token',
        error: errorMessage,
        details: errorDetails
      });
    }
  }
}

export default new AppSettingsController();


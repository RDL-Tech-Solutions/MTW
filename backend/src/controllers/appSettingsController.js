import AppSettings from '../models/AppSettings.js';
import logger from '../config/logger.js';
import axios from 'axios';
import { OPENROUTER_MODELS, getModelsByType, getModelsWithJsonSupport } from '../config/openrouterModels.js';

class AppSettingsController {
  /**
   * Obter todas as configurações
   * GET /api/settings
   * GET /api/settings?reveal=meli_client_secret,meli_access_token (para revelar valores específicos)
   */
  async getSettings(req, res) {
    try {
      const settings = await AppSettings.get();
      const revealFields = req.query.reveal ? req.query.reveal.split(',') : [];

      // Lista de campos sensíveis que podem ser revelados
      const sensitiveFields = [
        'meli_client_secret',
        'meli_access_token',
        'meli_refresh_token',
        'shopee_partner_key',
        'amazon_secret_key',
        'aliexpress_app_secret',
        'expo_access_token',
        'backend_api_key',
        'openrouter_api_key'
      ];

      // Criar objeto de configurações seguras
      const safeSettings = { ...settings };

      // Para cada campo sensível, mascarar ou revelar conforme solicitado
      sensitiveFields.forEach(field => {
        if (settings[field]) {
          // Se o campo foi solicitado para revelação, mostrar valor real
          if (revealFields.includes(field)) {
            safeSettings[field] = settings[field];
          } else {
            // Caso contrário, mascarar
            safeSettings[field] = '***';
          }
        } else {
          safeSettings[field] = null;
        }
      });

      res.json({
        success: true,
        data: safeSettings,
        // Informar quais campos foram revelados (para debug)
        revealed: revealFields.filter(f => sensitiveFields.includes(f))
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

      // Validar aliexpress_product_origin
      if (updates.aliexpress_product_origin !== undefined) {
        const validOrigins = ['brazil', 'international', 'both'];
        if (!validOrigins.includes(updates.aliexpress_product_origin)) {
          return res.status(400).json({
            success: false,
            message: `Origem de produto AliExpress inválida. Valores permitidos: ${validOrigins.join(', ')}`
          });
        }
        logger.info(`✅ Configurando origem AliExpress: ${updates.aliexpress_product_origin}`);
      }

      // Log dos campos que estão sendo atualizados (sem valores sensíveis)
      const logUpdates = { ...updates };
      if (logUpdates.meli_client_secret) logUpdates.meli_client_secret = '***';
      if (logUpdates.meli_access_token) logUpdates.meli_access_token = '***';
      if (logUpdates.meli_refresh_token) logUpdates.meli_refresh_token = '***';
      if (logUpdates.shopee_partner_key) logUpdates.shopee_partner_key = '***';
      if (logUpdates.amazon_secret_key) logUpdates.amazon_secret_key = '***';
      if (logUpdates.aliexpress_app_secret) logUpdates.aliexpress_app_secret = '***';
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
        aliexpress_app_secret: settings.aliexpress_app_secret ? '***' : null,
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
        case 'aliexpress':
          config = await AppSettings.getAliExpressConfig();
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

      // Gerar ID seguro para state (recomendação de segurança)
      const crypto = await import('crypto');
      const state = crypto.default.randomBytes(32).toString('hex');

      // Gerar URL de autorização do Mercado Livre
      // IMPORTANTE: Adicionar parâmetro state para segurança conforme documentação
      const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;

      res.json({
        success: true,
        data: {
          auth_url: authUrl,
          state: state // Retornar state para validação no frontend
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

      // IMPORTANTE: Enviar parâmetros no body usando URLSearchParams (não objeto) conforme documentação de segurança
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', client_id.trim());
      params.append('client_secret', client_secret.trim());
      params.append('code', code.trim());
      params.append('redirect_uri', redirect_uri.trim());

      // Trocar código por tokens
      const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const { access_token, refresh_token, expires_in, user_id } = response.data;

      // Salvar tokens no banco de dados
      await AppSettings.update({
        meli_access_token: access_token,
        meli_refresh_token: refresh_token
      });

      // Resetar flag de refresh token inválido no meliAuth
      try {
        const meliAuth = (await import('../services/autoSync/meliAuth.js')).default;
        meliAuth.resetRefreshTokenInvalid();
      } catch (importError) {
        logger.warn(`⚠️ Erro ao resetar flag de refresh token: ${importError.message}`);
      }

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

      // Validar que todos os valores estão presentes e não vazios
      if (!config.clientId || !config.clientSecret || !config.refreshToken) {
        logger.error('❌ Valores faltando:', {
          hasClientId: !!config.clientId,
          hasClientSecret: !!config.clientSecret,
          hasRefreshToken: !!config.refreshToken
        });
        return res.status(400).json({
          success: false,
          message: 'Configurações incompletas. Verifique Client ID, Client Secret e Refresh Token.'
        });
      }

      // IMPORTANTE: Enviar parâmetros no body (não querystring) conforme documentação de segurança
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', config.clientId.trim());
      params.append('client_secret', config.clientSecret.trim());
      params.append('refresh_token', config.refreshToken.trim());

      logger.debug('📤 Enviando requisição de refresh token...');
      logger.debug(`   Client ID: ${config.clientId.substring(0, 10)}...`);
      logger.debug(`   Refresh Token: ${config.refreshToken.substring(0, 20)}...`);

      // Renovar token usando refresh token
      const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Atualizar refresh token se um novo foi retornado
      const newRefreshToken = refresh_token || config.refreshToken;

      // Salvar tokens atualizados no banco
      await AppSettings.updateMeliToken(access_token, newRefreshToken);

      // Resetar flag de refresh token inválido no meliAuth (se novo token foi recebido)
      if (refresh_token) {
        try {
          const meliAuth = (await import('../services/autoSync/meliAuth.js')).default;
          meliAuth.resetRefreshTokenInvalid();
          // Atualizar refresh token na instância também
          meliAuth.refreshToken = refresh_token;
        } catch (importError) {
          logger.warn(`⚠️ Erro ao resetar flag de refresh token: ${importError.message}`);
        }
      }

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
      const status = error.response?.status;
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || errorData.error || error.message;

      logger.error(`❌ Erro ao renovar token (${status}): ${errorMessage}`);

      // Log detalhado para debug
      if (error.response) {
        logger.error('📋 Detalhes do erro:', JSON.stringify(errorData, null, 2));
      }

      // Mensagens específicas baseadas no erro
      let userMessage = 'Erro ao renovar access token';
      let suggestions = [];

      if (status === 400) {
        if (errorMessage?.includes('invalid_grant') || errorMessage?.includes('invalid_token') ||
          errorMessage?.includes('expired') || errorMessage?.includes('already used')) {
          userMessage = 'Refresh token inválido, expirado ou já utilizado';
          suggestions.push('⚠️ O refresh token do Mercado Livre expira após 6 meses de inatividade');
          suggestions.push('⚠️ Cada refresh token só pode ser usado UMA vez - após uso, um novo é gerado');
          suggestions.push('💡 Solução: Obtenha um novo refresh token usando o fluxo de autorização');
          suggestions.push('📝 Passos: 1) Clique em "Obter Refresh Token" 2) Autorize no Mercado Livre 3) Cole o código retornado');
        } else if (errorMessage?.includes('invalid_client')) {
          userMessage = 'Client ID ou Client Secret inválidos';
          suggestions.push('Verifique se o Client ID e Client Secret estão corretos');
          suggestions.push('Confirme as credenciais no DevCenter do Mercado Livre');
        } else {
          userMessage = 'Parâmetros inválidos na requisição';
          suggestions.push('Verifique se todos os campos estão preenchidos corretamente');
          suggestions.push('Client ID, Client Secret e Refresh Token são obrigatórios');
        }
      } else if (status === 401) {
        userMessage = 'Não autorizado';
        suggestions.push('Verifique as credenciais da aplicação');
      } else if (status === 403) {
        userMessage = 'Acesso negado';
        suggestions.push('Verifique se a aplicação não está bloqueada');
        suggestions.push('Confirme os scopes configurados no DevCenter');
      }

      res.status(status || 500).json({
        success: false,
        message: userMessage,
        error: errorMessage,
        details: errorData,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      });
    }
  }

  /**
   * Revelar valores sensíveis específicos
   * GET /api/settings/reveal?fields=meli_client_secret,meli_access_token
   */
  async revealSettings(req, res) {
    try {
      const fieldsParam = req.query.fields || req.query.field || '';
      const fieldsToReveal = fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : [];

      if (fieldsToReveal.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Parâmetro "fields" é obrigatório. Ex: ?fields=meli_client_secret,meli_access_token'
        });
      }

      const settings = await AppSettings.get();

      // Lista de campos sensíveis permitidos
      const allowedSensitiveFields = [
        'meli_client_secret',
        'meli_access_token',
        'meli_refresh_token',
        'shopee_partner_key',
        'amazon_secret_key',
        'aliexpress_app_secret',
        'expo_access_token',
        'backend_api_key',
        'openrouter_api_key'
      ];

      // Filtrar apenas campos permitidos
      const validFields = fieldsToReveal.filter(f => allowedSensitiveFields.includes(f));

      if (validFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo válido especificado. Campos permitidos: ' + allowedSensitiveFields.join(', ')
        });
      }

      // Retornar apenas os campos solicitados
      const revealed = {};
      validFields.forEach(field => {
        if (settings[field]) {
          revealed[field] = settings[field];
        } else {
          revealed[field] = null;
        }
      });

      res.json({
        success: true,
        data: revealed
      });
    } catch (error) {
      logger.error(`Erro ao revelar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao revelar configurações',
        error: error.message
      });
    }
  }

  /**
   * Obter lista de modelos OpenRouter disponíveis
   * GET /api/settings/openrouter-models
   */
  async getOpenRouterModels(req, res) {
    try {
      const type = req.query.type; // 'free', 'paid', ou undefined para todos

      let models = OPENROUTER_MODELS;
      if (type === 'free' || type === 'paid') {
        models = getModelsByType(type);
      }

      res.json({
        success: true,
        data: {
          models: models,
          total: models.length,
          free: getModelsByType('free').length,
          paid: getModelsByType('paid').length,
          withJsonSupport: getModelsWithJsonSupport().length
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter modelos OpenRouter: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter lista de modelos'
      });
    }
  }

  /**
   * Obter status da limpeza automática
   * GET /api/settings/cleanup/status
   */
  async getCleanupStatus(req, res) {
    try {
      const schedule = await AppSettings.getCleanupSchedule();

      // Calculate next run
      const now = new Date();
      const next = new Date(now);
      next.setHours(schedule.hour, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          hour: schedule.hour,
          lastRun: schedule.lastRun,
          nextRun: next.toISOString()
        }
      });
    } catch (error) {
      logger.error(`Erro ao obter status de limpeza: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter status de limpeza',
        message: error.message
      });
    }
  }

  /**
   * Atualizar horário de limpeza automática
   * PUT /api/settings/cleanup/schedule
   */
  async updateCleanupSchedule(req, res) {
    try {
      const { hour } = req.body;

      if (hour === undefined || hour === null) {
        return res.status(400).json({
          success: false,
          message: 'Campo "hour" é obrigatório'
        });
      }

      const hourNum = parseInt(hour);
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        return res.status(400).json({
          success: false,
          message: 'Horário deve ser entre 0 e 23'
        });
      }

      await AppSettings.updateCleanupSchedule(hourNum);

      // Reiniciar cron job com novo horário
      const { restartCleanupCron } = await import('../services/cron/index.js');
      await restartCleanupCron();

      logger.info(`✅ Horário de limpeza atualizado para ${hourNum}:00`);

      // Calculate next run
      const now = new Date();
      const next = new Date(now);
      next.setHours(hourNum, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      res.json({
        success: true,
        message: `Horário de limpeza atualizado para ${hourNum}:00`,
        data: {
          hour: hourNum,
          nextRun: next.toISOString()
        }
      });
    } catch (error) {
      logger.error(`Erro ao atualizar horário de limpeza: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar horário de limpeza',
        message: error.message
      });
    }
  }

  /**
   * Executar limpeza manualmente
   * POST /api/settings/cleanup/run
   */
  async runCleanupNow(req, res) {
    try {
      logger.info('🚀 Executando limpeza manual...');

      const { forceCleanup } = await import('../services/cron/cleanupOldData.js');
      const result = await forceCleanup();

      logger.info('✅ Limpeza manual concluída');

      res.json({
        success: true,
        message: 'Limpeza executada com sucesso',
        data: {
          executedAt: new Date().toISOString(),
          ...result
        }
      });
    } catch (error) {
      logger.error(`Erro ao executar limpeza manual: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Erro ao executar limpeza',
        message: error.message
      });
    }
  }
}

export default new AppSettingsController();


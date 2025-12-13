import User from '../models/User.js';
import { 
  comparePassword, 
  generateToken, 
  generateRefreshToken,
  verifyToken,
  successResponse,
  errorResponse
} from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import logger from '../config/logger.js';

class AuthController {
  // Registrar novo usuário
  static async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json(
          errorResponse(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS)
        );
      }

      // Criar usuário
      const user = await User.create({ name, email, password });

      // Gerar tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Novo usuário registrado: ${email}`);

      res.status(201).json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          'Usuário criado com sucesso'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Verificar senha (tentar password_hash primeiro, depois password)
      const passwordToCompare = user.password_hash || user.password;
      if (!passwordToCompare) {
        logger.error(`Usuário ${email} não tem senha configurada`);
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      const isValidPassword = await comparePassword(password, passwordToCompare);
      if (!isValidPassword) {
        logger.warn(`Tentativa de login falhou para: ${email}`);
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login realizado: ${email}`);

      res.json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          'Login realizado com sucesso'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED)
        );
      }

      // Verificar refresh token
      const decoded = verifyToken(refreshToken, true);

      // Buscar usuário
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED)
        );
      }

      // Gerar novos tokens
      const newToken = generateToken({ id: user.id, email: user.email, role: user.role });
      const newRefreshToken = generateRefreshToken({ id: user.id });

      res.json(
        successResponse(
          {
            token: newToken,
            refreshToken: newRefreshToken
          },
          'Token atualizado com sucesso'
        )
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.EXPIRED_TOKEN, ERROR_CODES.EXPIRED_TOKEN)
        );
      }
      next(error);
    }
  }

  // Obter dados do usuário autenticado
  static async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      delete user.password;

      res.json(
        successResponse(user)
      );
    } catch (error) {
      next(error);
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (email) {
        // Verificar se email já está em uso
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json(
            errorResponse(ERROR_MESSAGES.USER_EXISTS, ERROR_CODES.USER_EXISTS)
          );
        }
        updates.email = email;
      }

      const user = await User.update(req.user.id, updates);

      logger.info(`Perfil atualizado: ${user.email}`);

      res.json(
        successResponse(user, 'Perfil atualizado com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Alterar senha
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Buscar usuário com senha
      const user = await User.findById(req.user.id);

      // Verificar senha atual
      const isValidPassword = await comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json(
          errorResponse('Senha atual incorreta', ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Atualizar senha
      const { hashPassword } = await import('../utils/helpers.js');
      const hashedPassword = await hashPassword(newPassword);
      await User.update(req.user.id, { password: hashedPassword });

      logger.info(`Senha alterada: ${user.email}`);

      res.json(
        successResponse(null, 'Senha alterada com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Registrar push token
  static async registerPushToken(req, res, next) {
    try {
      const { push_token } = req.body;

      await User.updatePushToken(req.user.id, push_token);

      logger.info(`Push token registrado para usuário: ${req.user.id}`);

      res.json(
        successResponse(null, 'Push token registrado com sucesso')
      );
    } catch (error) {
      next(error);
    }
  }

  // Obter URL de autenticação OAuth
  static async getOAuthUrl(req, res, next) {
    try {
      const { provider, redirect_url } = req.body;

      if (!provider || !['google', 'facebook'].includes(provider)) {
        return res.status(400).json(
          errorResponse('Provider inválido. Use "google" ou "facebook"', 'INVALID_PROVIDER')
        );
      }

      const { getOAuthUrl } = await import('../services/supabaseAuth.js');
      const oauthUrl = await getOAuthUrl(provider, redirect_url || req.headers.origin);

      res.json(
        successResponse({ url: oauthUrl }, 'URL de autenticação gerada')
      );
    } catch (error) {
      next(error);
    }
  }

  // Trocar código por sessão e autenticar
  static async socialAuthCallback(req, res, next) {
    try {
      // Aceitar tanto GET (web redirect) quanto POST (mobile)
      const code = req.query.code || req.body.code;
      const provider = req.query.provider || req.body.provider;
      const redirectUrl = req.body.redirect_url || req.headers.origin || 'http://localhost:8081';

      if (!code) {
        return res.status(400).json(
          errorResponse('Código de autorização não fornecido', 'MISSING_CODE')
        );
      }

      // Trocar código por sessão Supabase
      const { exchangeCodeForSession } = await import('../services/supabaseAuth.js');
      const sessionData = await exchangeCodeForSession(code);

      if (!sessionData.session || !sessionData.user) {
        return res.status(400).json(
          errorResponse('Falha ao obter sessão do Supabase', 'SESSION_ERROR')
        );
      }

      const { user: supabaseUser } = sessionData.session;

      // Extrair dados do usuário
      const authProvider = provider || supabaseUser.app_metadata?.provider || 'unknown';
      const providerId = supabaseUser.id;
      const email = supabaseUser.email;
      const userMetadata = supabaseUser.user_metadata || {};
      const name = userMetadata.full_name || userMetadata.name || userMetadata.display_name || email?.split('@')[0] || 'Usuário';
      const avatarUrl = userMetadata.avatar_url || userMetadata.picture || userMetadata.photo_url;

      if (!email) {
        return res.status(400).json(
          errorResponse('Email não encontrado na sessão', 'MISSING_EMAIL')
        );
      }

      // Buscar ou criar usuário
      let user = await User.findByProviderId(authProvider, providerId);

      if (!user) {
        user = await User.findByEmail(email);
      }

      if (user) {
        // Usuário existe - atualizar dados
        const updates = {};
        if (!user.provider || user.provider !== authProvider) {
          updates.provider = authProvider;
          updates.provider_id = providerId;
        }
        if (avatarUrl && user.avatar_url !== avatarUrl) {
          updates.avatar_url = avatarUrl;
        }
        if (name && user.name !== name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          await User.update(user.id, updates);
          user = await User.findById(user.id);
        }
      } else {
        // Criar novo usuário
        user = await User.create({
          name,
          email,
          provider: authProvider,
          provider_id: providerId,
          avatar_url: avatarUrl,
          password: null, // Login social não precisa de senha
        });
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens JWT
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login social realizado: ${email} via ${authProvider}`);

      // Se for GET (web), redirecionar. Se for POST (mobile), retornar JSON
      if (req.method === 'GET') {
        const finalRedirectUrl = `${redirectUrl}?token=${token}&refreshToken=${refreshToken}`;
        res.redirect(finalRedirectUrl);
      } else {
        res.json(
          successResponse(
            {
              user,
              token,
              refreshToken
            },
            `Login com ${authProvider} realizado com sucesso`
          )
        );
      }
    } catch (error) {
      logger.error(`Erro no callback OAuth: ${error.message}`);
      next(error);
    }
  }

  // Login/Registro com autenticação social (dados diretos - para mobile)
  static async socialAuth(req, res, next) {
    try {
      const { provider, provider_id, email, name, avatar_url, supabase_token } = req.body;

      if (!provider || !provider_id || !email) {
        return res.status(400).json(
          errorResponse('Dados de autenticação social incompletos', 'INVALID_SOCIAL_DATA')
        );
      }

      // Primeiro, tentar buscar por provider_id
      let user = await User.findByProviderId(provider, provider_id);

      // Se não encontrou, buscar por email
      if (!user) {
        user = await User.findByEmail(email);
      }

      if (user) {
        // Usuário existe - fazer login
        // Atualizar dados se necessário
        const updates = {};
        if (!user.provider || user.provider !== provider) {
          updates.provider = provider;
          updates.provider_id = provider_id;
        }
        if (avatar_url && user.avatar_url !== avatar_url) {
          updates.avatar_url = avatar_url;
        }
        if (name && user.name !== name) {
          updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
          await User.update(user.id, updates);
          user = await User.findById(user.id);
        }
      } else {
        // Criar novo usuário
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          provider,
          provider_id,
          avatar_url,
          // Não precisa de senha para login social
          password: null,
        });
      }

      // Remover senhas do retorno
      delete user.password;
      delete user.password_hash;

      // Gerar tokens JWT
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info(`Login social realizado: ${email} via ${provider}`);

      res.json(
        successResponse(
          {
            user,
            token,
            refreshToken
          },
          `Login com ${provider} realizado com sucesso`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;

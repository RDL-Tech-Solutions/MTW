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

      // Verificar senha
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json(
          errorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, ERROR_CODES.INVALID_CREDENTIALS)
        );
      }

      // Remover senha do retorno
      delete user.password;

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
}

export default AuthController;

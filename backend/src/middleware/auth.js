import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import logger from '../config/logger.js';

// Middleware para verificar JWT
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
        code: ERROR_CODES.UNAUTHORIZED
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        const secretHint = process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 4) : 'UNDEFINED';
        // Tentar decodificar sem verificar para ver o payload (iat, exp)
        const decoded = jwt.decode(token);
        const expStr = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A';
        logger.warn(`Token inválido: ${err.message} (Secret hint: ${secretHint}..., Exp: ${expStr})`);
        return res.status(403).json({
          success: false,
          error: ERROR_MESSAGES.INVALID_TOKEN,
          code: ERROR_CODES.INVALID_TOKEN
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    logger.error(`Erro na autenticação: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

// Middleware para verificar se é admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      code: ERROR_CODES.FORBIDDEN
    });
  }
  next();
};

// DEPRECATED: VIP feature removed - all users have full access
// Middleware kept for backward compatibility but now passes all authenticated users
export const requireVIP = (req, res, next) => {
  // No VIP check - all authenticated users pass
  next();
};

// Middleware opcional de autenticação (não retorna erro se não autenticado)
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

export default {
  authenticateToken,
  requireAdmin,
  requireVIP,
  optionalAuth
};

import logger from '../config/logger.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

// Middleware de tratamento de erros
export const errorHandler = (err, req, res, next) => {
  // Log do erro
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });

  // Erro de validação do Joi
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: ERROR_MESSAGES.VALIDATION_ERROR,
      code: ERROR_CODES.VALIDATION_ERROR,
      details: err.details
    });
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.INVALID_TOKEN,
      code: ERROR_CODES.INVALID_TOKEN
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.EXPIRED_TOKEN,
      code: ERROR_CODES.EXPIRED_TOKEN
    });
  }

  // Erro do Supabase
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      success: false,
      error: 'Erro no banco de dados',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Erro customizado
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code || ERROR_CODES.INTERNAL_ERROR
    });
  }

  // Erro genérico
  return res.status(500).json({
    success: false,
    error: ERROR_MESSAGES.INTERNAL_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Middleware para rotas não encontradas
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: ERROR_MESSAGES.NOT_FOUND,
    code: ERROR_CODES.NOT_FOUND,
    path: req.url
  });
};

// Classe de erro customizado
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  errorHandler,
  notFoundHandler,
  AppError
};

import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants.js';

// Função para verificar se usuário é admin autenticado
const isAuthenticatedAdmin = (req) => {
  // Verificar token de autorização e role admin
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Em desenvolvimento, ser mais permissivo
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return req.user?.role === 'admin';
  }
  return false;
};

// Rate limiter geral - mais permissivo para admins
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.MAX_REQUESTS,
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isAuthenticatedAdmin(req), // Pular para admins autenticados
});

// Rate limiter para autenticação (mais restritivo)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

// Rate limiter para rotas de criação (admin)
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 criações por minuto
  message: {
    success: false,
    error: 'Muitas operações de criação. Aguarde um momento.',
    code: 'CREATE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para APIs externas
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto
  message: {
    success: false,
    error: 'Limite de requisições à API atingido. Aguarde um momento.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  generalLimiter,
  authLimiter,
  createLimiter,
  apiLimiter
};

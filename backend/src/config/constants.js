// Plataformas suportadas
export const PLATFORMS = {
  SHOPEE: 'shopee',
  MERCADOLIVRE: 'mercadolivre',
  AMAZON: 'amazon',
  ALIEXPRESS: 'aliexpress',
  KABUM: 'kabum',
  MAGAZINELUIZA: 'magazineluiza',
  PICHAU: 'pichau',
  GENERAL: 'general'
};

// Tipos de desconto
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed'
};

// Tipos de notificação
export const NOTIFICATION_TYPES = {
  NEW_COUPON: 'new_coupon',
  PRICE_DROP: 'price_drop',
  EXPIRING_COUPON: 'expiring_coupon',
  NEW_PROMO: 'new_promo',
  COUPON_EXPIRED: 'coupon_expired',
  FAVORITE_PRICE_CHANGE: 'favorite_price_change'
};

// Categorias padrão
export const DEFAULT_CATEGORIES = [
  { name: 'Eletrônicos', slug: 'eletronicos', icon: 'smartphone' },
  { name: 'Games', slug: 'games', icon: 'gamepad' },
  { name: 'Casa', slug: 'casa', icon: 'home' },
  { name: 'Acessórios', slug: 'acessorios', icon: 'watch' },
  { name: 'Moda', slug: 'moda', icon: 'shirt' },
  { name: 'Informática', slug: 'informatica', icon: 'laptop' },
  { name: 'Beleza', slug: 'beleza', icon: 'sparkles' },
  { name: 'Esportes', slug: 'esportes', icon: 'dumbbell' },
  { name: 'Livros', slug: 'livros', icon: 'book' },
  { name: 'Brinquedos', slug: 'brinquedos', icon: 'toy-brick' }
];

// Status de produtos
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock'
};

// Roles de usuário
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
  // VIP role removed - all users have full access
};

// Limites de paginação
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Cache TTL (em segundos)
export const CACHE_TTL = {
  PRODUCTS: 900, // 15 minutos
  COUPONS: 600, // 10 minutos
  CATEGORIES: 3600, // 1 hora
  ANALYTICS: 300, // 5 minutos
  LINK_ANALYSIS: 3600 // 1 hora
};

// Intervalos de cron jobs (em minutos)
export const CRON_INTERVALS = {
  PRICE_UPDATE: 15,
  COUPON_CHECK: 15,
  CLEANUP: 1440, // 24 horas
  ANALYTICS: 60
};

// Limites de taxa
export const RATE_LIMITS = {
  WINDOW_MS: 60 * 1000, // 1 minuto
  MAX_REQUESTS: 200, // 200 requisições por minuto
  MAX_REQUESTS_AUTH: 500 // 500 para usuários autenticados
};

// Mensagens de erro
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Não autorizado',
  FORBIDDEN: 'Acesso negado',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Erro de validação',
  INTERNAL_ERROR: 'Erro interno do servidor',
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  USER_EXISTS: 'Usuário já existe',
  INVALID_TOKEN: 'Token inválido',
  EXPIRED_TOKEN: 'Token expirado'
};

// Códigos de erro
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_EXISTS: 'USER_EXISTS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN'
};

// Configurações de JWT
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: '1h',
  REFRESH_TOKEN_EXPIRES: '7d'
};

// URLs das APIs externas
export const EXTERNAL_APIS = {
  SHOPEE: process.env.SHOPEE_API_URL || 'https://partner.shopeemobile.com/api/v2',
  MERCADOLIVRE: process.env.MELI_API_URL || 'https://api.mercadolibre.com',
  AMAZON: process.env.AMAZON_API_URL || 'https://webservices.amazon.com.br/paapi5',
  ALIEXPRESS: process.env.ALIEXPRESS_API_URL || 'https://api-sg.aliexpress.com/rest',
  EXPO_PUSH: 'https://exp.host/--/api/v2/push/send'
};

export default {
  PLATFORMS,
  DISCOUNT_TYPES,
  NOTIFICATION_TYPES,
  DEFAULT_CATEGORIES,
  PRODUCT_STATUS,
  USER_ROLES,
  PAGINATION,
  CACHE_TTL,
  CRON_INTERVALS,
  RATE_LIMITS,
  ERROR_MESSAGES,
  ERROR_CODES,
  JWT_CONFIG,
  EXTERNAL_APIS
};

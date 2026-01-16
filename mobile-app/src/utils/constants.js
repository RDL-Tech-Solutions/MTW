export const PLATFORMS = {
  SHOPEE: 'shopee',
  MERCADOLIVRE: 'mercadolivre',
  AMAZON: 'amazon',
  ALIEXPRESS: 'aliexpress',
  KABUM: 'kabum',
  MAGAZINELUIZA: 'magazineluiza',
  PICHAU: 'pichau',
  GENERAL: 'general',
};

export const PLATFORM_LABELS = {
  [PLATFORMS.SHOPEE]: 'Shopee',
  [PLATFORMS.MERCADOLIVRE]: 'Mercado Livre',
  [PLATFORMS.AMAZON]: 'Amazon',
  [PLATFORMS.ALIEXPRESS]: 'AliExpress',
  [PLATFORMS.KABUM]: 'Kabum',
  [PLATFORMS.MAGAZINELUIZA]: 'Magazine Luiza',
  [PLATFORMS.PICHAU]: 'Pichau',
  [PLATFORMS.GENERAL]: 'Geral',
};

export const PLATFORM_COLORS = {
  [PLATFORMS.SHOPEE]: '#EE4D2D',
  [PLATFORMS.MERCADOLIVRE]: '#FFE600',
  [PLATFORMS.AMAZON]: '#FF9900',
  [PLATFORMS.ALIEXPRESS]: '#FF4747',
  [PLATFORMS.KABUM]: '#FF6500',
  [PLATFORMS.MAGAZINELUIZA]: '#0086FF',
  [PLATFORMS.PICHAU]: '#FF6600',
  [PLATFORMS.GENERAL]: '#6B7280',
};

export const USER_ROLES = {
  USER: 'user',
  VIP: 'vip',
  ADMIN: 'admin',
};

export const NOTIFICATION_TYPES = {
  NEW_PRODUCT: 'new_product',
  NEW_COUPON: 'new_coupon',
  FAVORITE_DISCOUNT: 'favorite_discount',
  COUPON_EXPIRING: 'coupon_expiring',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
  INVALID_CREDENTIALS: 'Email ou senha inválidos.',
  USER_EXISTS: 'Este email já está cadastrado.',
  REQUIRED_FIELD: 'Este campo é obrigatório.',
  INVALID_EMAIL: 'Email inválido.',
  PASSWORD_TOO_SHORT: 'A senha deve ter no mínimo 6 caracteres.',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login realizado com sucesso!',
  REGISTER_SUCCESS: 'Conta criada com sucesso!',
  PROFILE_UPDATED: 'Perfil atualizado com sucesso!',
  FAVORITE_ADDED: 'Produto adicionado aos favoritos!',
  FAVORITE_REMOVED: 'Produto removido dos favoritos!',
};

export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',

  // Main Tabs
  HOME: 'Home',
  CATEGORIES: 'Categories',
  FAVORITES: 'Favorites',
  COUPONS: 'Coupons',
  PROFILE: 'Profile',

  // Stack
  PRODUCT_DETAILS: 'ProductDetails',
  COUPON_DETAILS: 'CouponDetails',
  EDIT_PROFILE: 'EditProfile',
  PRODUCT_LIST: 'ProductList',
  COUPON_LIST: 'CouponList',
  SETTINGS: 'Settings',
  NOTIFICATION_SETTINGS: 'NotificationSettings',
  HOME_FILTERS: 'HomeFilters',
  VIP_UPGRADE: 'VIPUpgrade',
  ABOUT: 'About',
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',

  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id) => `/products/${id}`,
  PRODUCT_CLICK: (id) => `/products/${id}/click`,

  // Categories
  CATEGORIES: '/categories',

  // Coupons
  COUPONS: '/coupons',

  // User
  USER_ME: '/users/me',
  USER_FAVORITES: '/favorites',
  ADD_FAVORITE: (id) => `/favorites/${id}`,
  REMOVE_FAVORITE: (id) => `/favorites/${id}`,
  PUSH_TOKEN: '/users/push-token',
};

export default {
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  USER_ROLES,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  SCREEN_NAMES,
  API_ENDPOINTS,
};

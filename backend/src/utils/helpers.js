import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Gerar hash de senha
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Comparar senha
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Gerar JWT token
export const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Gerar refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Verificar token
export const verifyToken = (token, isRefreshToken = false) => {
  const secret = isRefreshToken 
    ? process.env.JWT_REFRESH_SECRET 
    : process.env.JWT_SECRET;
  
  return jwt.verify(token, secret);
};

// Gerar ID único
export const generateUniqueId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Calcular porcentagem de desconto
export const calculateDiscountPercentage = (oldPrice, currentPrice) => {
  if (!oldPrice || oldPrice <= currentPrice) return 0;
  return Math.round(((oldPrice - currentPrice) / oldPrice) * 100);
};

// Formatar preço
export const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

// Validar email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitizar string
export const sanitizeString = (str) => {
  return str.trim().replace(/[<>]/g, '');
};

// Gerar slug
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Paginar resultados
export const paginate = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

// Formatar resposta de sucesso
export const successResponse = (data, message = 'Sucesso', meta = null) => {
  const response = {
    success: true,
    data,
    message
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

// Formatar resposta de erro
export const errorResponse = (error, code = 'ERROR') => {
  return {
    success: false,
    error,
    code
  };
};

// Verificar se cupom está válido
export const isCouponValid = (coupon) => {
  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  const validUntil = new Date(coupon.valid_until);
  
  return (
    coupon.is_active &&
    now >= validFrom &&
    now <= validUntil &&
    (coupon.max_uses === null || coupon.current_uses < coupon.max_uses)
  );
};

// Calcular preço com desconto
export const calculateDiscountedPrice = (price, coupon) => {
  if (!coupon || !isCouponValid(coupon)) return price;
  
  if (coupon.discount_type === 'percentage') {
    return price - (price * (coupon.discount_value / 100));
  } else {
    return Math.max(0, price - coupon.discount_value);
  }
};

// Delay (para rate limiting manual)
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Chunk array
export const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Remover campos undefined de objeto
export const removeUndefined = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

// Verificar se string é UUID válido
export const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Gerar código de cupom aleatório
export const generateCouponCode = (prefix = 'MTW', length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Formatar data para PT-BR
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// Calcular dias até expiração
export const daysUntilExpiration = (date) => {
  const now = new Date();
  const expiration = new Date(date);
  const diffTime = expiration - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  generateUniqueId,
  calculateDiscountPercentage,
  formatPrice,
  isValidEmail,
  sanitizeString,
  generateSlug,
  paginate,
  successResponse,
  errorResponse,
  isCouponValid,
  calculateDiscountedPrice,
  delay,
  chunkArray,
  removeUndefined,
  isValidUUID,
  generateCouponCode,
  formatDate,
  daysUntilExpiration
};

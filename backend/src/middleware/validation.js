import Joi from 'joi';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

// Helper para validar request
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        code: ERROR_CODES.VALIDATION_ERROR,
        details: errors
      });
    }
    
    next();
  };
};

// Schemas de validação

// Auth
export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Products
export const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(500).required(),
  image_url: Joi.string().uri().required(),
  platform: Joi.string().valid('shopee', 'mercadolivre', 'amazon').required(),
  current_price: Joi.number().positive().required(),
  old_price: Joi.number().positive().allow(null),
  discount_percentage: Joi.number().min(0).max(100).allow(null),
  category_id: Joi.string().uuid().allow('', null).optional(),
  coupon_id: Joi.string().uuid().allow('', null).optional(),
  affiliate_link: Joi.string().uri().required(),
  external_id: Joi.string().allow('', null).optional(),
  stock_available: Joi.boolean().default(true)
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(500),
  image_url: Joi.string().uri(),
  platform: Joi.string().valid('shopee', 'mercadolivre', 'amazon'),
  current_price: Joi.number().positive(),
  old_price: Joi.number().positive().allow(null),
  discount_percentage: Joi.number().min(0).max(100).allow(null),
  category_id: Joi.string().uuid().allow('', null),
  coupon_id: Joi.string().uuid().allow('', null),
  affiliate_link: Joi.string().uri(),
  external_id: Joi.string().allow('', null),
  stock_available: Joi.boolean(),
  is_active: Joi.boolean()
}).min(1);

// Coupons
export const createCouponSchema = Joi.object({
  code: Joi.string().min(3).max(100).required(),
  platform: Joi.string().valid('shopee', 'mercadolivre', 'general').required(),
  discount_type: Joi.string().valid('percentage', 'fixed').required(),
  discount_value: Joi.number().positive().required(),
  min_purchase: Joi.number().positive().default(0),
  valid_from: Joi.date().iso().required(),
  valid_until: Joi.date().iso().greater(Joi.ref('valid_from')).required(),
  is_general: Joi.boolean().default(true),
  applicable_products: Joi.array().items(Joi.string().uuid()).default([]),
  restrictions: Joi.string().allow('').default(''),
  max_uses: Joi.number().integer().positive().allow(null),
  is_vip: Joi.boolean().default(false)
});

export const updateCouponSchema = Joi.object({
  code: Joi.string().min(3).max(100),
  platform: Joi.string().valid('shopee', 'mercadolivre', 'general'),
  discount_type: Joi.string().valid('percentage', 'fixed'),
  discount_value: Joi.number().positive(),
  min_purchase: Joi.number().positive(),
  valid_from: Joi.date().iso(),
  valid_until: Joi.date().iso(),
  is_general: Joi.boolean(),
  applicable_products: Joi.array().items(Joi.string().uuid()),
  restrictions: Joi.string().allow(''),
  max_uses: Joi.number().integer().positive().allow(null),
  is_vip: Joi.boolean()
}).min(1);

// Categories
export const createCategorySchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  slug: Joi.string().min(3).max(100).pattern(/^[a-z0-9-]+$/).required(),
  icon: Joi.string().max(50).required()
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(3).max(100),
  slug: Joi.string().min(3).max(100).pattern(/^[a-z0-9-]+$/),
  icon: Joi.string().max(50),
  is_active: Joi.boolean()
}).min(1);

// Notifications
export const registerPushTokenSchema = Joi.object({
  push_token: Joi.string().required()
});

// Query params validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('created_at', 'price', 'discount', 'name').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

export const productFilterSchema = Joi.object({
  category: Joi.string().uuid(),
  platform: Joi.string().valid('shopee', 'mercadolivre'),
  min_price: Joi.number().positive(),
  max_price: Joi.number().positive(),
  min_discount: Joi.number().min(0).max(100),
  search: Joi.string().max(255)
}).concat(paginationSchema);

export default {
  validate,
  registerSchema,
  loginSchema,
  createProductSchema,
  updateProductSchema,
  createCouponSchema,
  updateCouponSchema,
  createCategorySchema,
  updateCategorySchema,
  registerPushTokenSchema,
  paginationSchema,
  productFilterSchema
};

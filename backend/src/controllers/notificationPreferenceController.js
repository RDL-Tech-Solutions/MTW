import NotificationPreference from '../models/NotificationPreference.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';

class NotificationPreferenceController {
  // Obter preferências do usuário
  static async get(req, res, next) {
    try {
      let preferences = await NotificationPreference.findByUserId(req.user.id);

      // Se não existir, criar com valores padrão
      if (!preferences) {
        preferences = await NotificationPreference.upsert(req.user.id, {
          push_enabled: true,
          email_enabled: false,
          category_preferences: [],
          keyword_preferences: [],
          product_name_preferences: [],
          home_filters: {
            platforms: [],
            categories: [],
            min_discount: 0,
            max_price: null,
            only_with_coupon: false,
          },
        });
      }

      res.json(successResponse(preferences));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar preferências
  static async update(req, res, next) {
    try {
      const {
        push_enabled,
        email_enabled,
        category_preferences,
        keyword_preferences,
        product_name_preferences,
        home_filters,
      } = req.body;

      const preferences = await NotificationPreference.upsert(req.user.id, {
        push_enabled,
        email_enabled,
        category_preferences,
        keyword_preferences,
        product_name_preferences,
        home_filters,
      });

      logger.info(`Preferências atualizadas: usuário ${req.user.id}`);
      res.json(successResponse(preferences, 'Preferências atualizadas com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar apenas tema escuro
  static async updateTheme(req, res, next) {
    try {
      const { dark_mode } = req.body;

      const User = (await import('../models/User.js')).default;
      await User.update(req.user.id, { dark_mode });

      logger.info(`Tema atualizado: usuário ${req.user.id} - dark_mode: ${dark_mode}`);
      res.json(successResponse({ dark_mode }, 'Tema atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export default NotificationPreferenceController;


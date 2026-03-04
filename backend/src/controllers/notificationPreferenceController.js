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
          coupons_only: false,
          coupon_platforms: [],
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
      logger.info(`\n📝 ========== ATUALIZANDO PREFERÊNCIAS ==========`);
      logger.info(`   Usuário ID: ${req.user.id}`);
      logger.info(`   Body recebido: ${JSON.stringify(req.body, null, 2)}`);

      const {
        push_enabled,
        email_enabled,
        coupons_only,
        coupon_platforms,
        category_preferences,
        keyword_preferences,
        product_name_preferences,
        home_filters,
      } = req.body;

      logger.info(`\n   📊 Dados extraídos:`);
      logger.info(`      push_enabled: ${push_enabled}`);
      logger.info(`      email_enabled: ${email_enabled}`);
      logger.info(`      coupons_only: ${coupons_only}`);
      logger.info(`      coupon_platforms: ${JSON.stringify(coupon_platforms)}`);
      logger.info(`      category_preferences: ${JSON.stringify(category_preferences)}`);
      logger.info(`      keyword_preferences: ${JSON.stringify(keyword_preferences)}`);
      logger.info(`      product_name_preferences: ${JSON.stringify(product_name_preferences)}`);

      logger.info(`\n   💾 Salvando no banco...`);
      const preferences = await NotificationPreference.upsert(req.user.id, {
        push_enabled,
        email_enabled,
        coupons_only,
        coupon_platforms,
        category_preferences,
        keyword_preferences,
        product_name_preferences,
        home_filters,
      });

      logger.info(`\n   ✅ Preferências salvas com sucesso!`);
      logger.info(`   Dados salvos: ${JSON.stringify(preferences, null, 2)}`);
      logger.info(`================================================\n`);

      // Não sincronizar tags com serviço externo (FCM não usa tags da mesma forma)
      // Tags/segmentação podem ser implementadas no futuro se necessário

      res.json(successResponse(preferences, 'Preferências atualizadas com sucesso'));
    } catch (error) {
      logger.error(`\n❌ Erro ao atualizar preferências:`);
      logger.error(`   Usuário ID: ${req.user.id}`);
      logger.error(`   Erro: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      logger.error(`   Body: ${JSON.stringify(req.body, null, 2)}`);
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


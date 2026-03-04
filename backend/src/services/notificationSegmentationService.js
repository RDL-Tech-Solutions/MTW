import NotificationPreference from '../models/NotificationPreference.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

class NotificationSegmentationService {
  /**
   * Obter usuários que devem receber notificação de um produto
   */
  async getUsersForProduct(product) {
    try {
      logger.info(`🎯 Segmentando usuários para produto: ${product.name}`);

      // Buscar todos os usuários com push ativado e FCM token
      const allUsers = await User.findAllWithFCMToken();
      
      if (!allUsers || allUsers.length === 0) {
        logger.info('   Nenhum usuário com FCM token encontrado');
        return [];
      }

      logger.info(`   ${allUsers.length} usuários com FCM token`);

      // Buscar preferências de todos os usuários
      const userIds = allUsers.map(u => u.id);
      const segmentedUsers = [];

      for (const user of allUsers) {
        const prefs = await NotificationPreference.findByUserId(user.id);
        
        // Se não tem preferências, enviar para todos (comportamento padrão)
        if (!prefs) {
          segmentedUsers.push(user);
          continue;
        }

        // Se push desativado, pular
        if (!prefs.push_enabled) {
          continue;
        }

        // Verificar se deve receber notificação deste produto
        if (this.shouldReceiveProductNotification(product, prefs)) {
          segmentedUsers.push(user);
        }
      }

      logger.info(`   ✅ ${segmentedUsers.length} usuários segmentados`);
      return segmentedUsers;

    } catch (error) {
      logger.error(`Erro ao segmentar usuários para produto: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obter usuários que devem receber notificação de um cupom
   */
  async getUsersForCoupon(coupon) {
    try {
      logger.info(`\n🎯 ========== SEGMENTAÇÃO DE USUÁRIOS (CUPOM) ==========`);
      logger.info(`   Cupom: ${coupon.code} (ID: ${coupon.id})`);
      logger.info(`   Plataforma: ${coupon.platform}`);

      // Buscar todos os usuários com push ativado e FCM token
      logger.info(`\n   📱 Buscando usuários com FCM token...`);
      const allUsers = await User.findAllWithFCMToken();
      
      if (!allUsers || allUsers.length === 0) {
        logger.warn(`   ❌ Nenhum usuário com FCM token encontrado!`);
        logger.warn(`   Motivo: Nenhum usuário registrou token FCM no app`);
        logger.warn(`   Solução: Usuários precisam abrir o app e permitir notificações`);
        return [];
      }

      logger.info(`   ✅ ${allUsers.length} usuários com FCM token encontrados`);

      const segmentedUsers = [];
      let usersSkippedNoPref = 0;
      let usersSkippedPushDisabled = 0;
      let usersSkippedNoMatch = 0;

      logger.info(`\n   🔍 Aplicando filtros de segmentação...`);

      for (const user of allUsers) {
        const prefs = await NotificationPreference.findByUserId(user.id);
        
        // Se não tem preferências, enviar para todos (comportamento padrão)
        if (!prefs) {
          logger.debug(`      ✅ ${user.name || user.email}: SEM preferências (recebe tudo)`);
          segmentedUsers.push(user);
          continue;
        }

        // Se push desativado, pular
        if (!prefs.push_enabled) {
          logger.debug(`      ⏭️ ${user.name || user.email}: Push DESABILITADO`);
          usersSkippedPushDisabled++;
          continue;
        }

        // Verificar se deve receber notificação deste cupom
        if (this.shouldReceiveCouponNotification(coupon, prefs)) {
          logger.debug(`      ✅ ${user.name || user.email}: MATCH (recebe notificação)`);
          segmentedUsers.push(user);
        } else {
          logger.debug(`      ⏭️ ${user.name || user.email}: SEM match com filtros`);
          usersSkippedNoMatch++;
        }
      }

      logger.info(`\n   📊 Resultado da segmentação:`);
      logger.info(`      Total de usuários com token: ${allUsers.length}`);
      logger.info(`      ✅ Usuários segmentados: ${segmentedUsers.length}`);
      logger.info(`      ⏭️ Pulados (push desabilitado): ${usersSkippedPushDisabled}`);
      logger.info(`      ⏭️ Pulados (sem match): ${usersSkippedNoMatch}`);

      if (segmentedUsers.length === 0) {
        logger.warn(`\n   ⚠️ NENHUM USUÁRIO SEGMENTADO!`);
        logger.warn(`   Possíveis causas:`);
        logger.warn(`   1. Todos os usuários desabilitaram push (${usersSkippedPushDisabled} usuários)`);
        logger.warn(`   2. Nenhum usuário tem filtros que correspondem ao cupom (${usersSkippedNoMatch} usuários)`);
        logger.warn(`   3. Usuários têm filtros muito restritivos`);
      }

      logger.info(`========================================================\n`);
      return segmentedUsers;

    } catch (error) {
      logger.error(`❌ Erro ao segmentar usuários para cupom: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Verificar se usuário deve receber notificação de produto
   */
  shouldReceiveProductNotification(product, preferences) {
    // Se não tem preferências específicas, enviar
    const hasSpecificPreferences = 
      (preferences.category_preferences && preferences.category_preferences.length > 0) ||
      (preferences.keyword_preferences && preferences.keyword_preferences.length > 0) ||
      (preferences.product_name_preferences && preferences.product_name_preferences.length > 0);

    if (!hasSpecificPreferences) {
      return true; // Sem filtros = recebe tudo
    }

    // Verificar categoria
    if (preferences.category_preferences && preferences.category_preferences.length > 0) {
      if (product.category_id && preferences.category_preferences.includes(product.category_id)) {
        logger.debug(`   ✅ Match por categoria: ${product.category_id}`);
        return true;
      }
    }

    // Verificar palavras-chave no nome do produto
    if (preferences.keyword_preferences && preferences.keyword_preferences.length > 0) {
      const productNameLower = (product.name || '').toLowerCase();
      const productDescLower = (product.description || '').toLowerCase();
      
      for (const keyword of preferences.keyword_preferences) {
        const keywordLower = keyword.toLowerCase();
        if (productNameLower.includes(keywordLower) || productDescLower.includes(keywordLower)) {
          logger.debug(`   ✅ Match por palavra-chave: ${keyword}`);
          return true;
        }
      }
    }

    // Verificar nome específico do produto
    if (preferences.product_name_preferences && preferences.product_name_preferences.length > 0) {
      const productNameLower = (product.name || '').toLowerCase();
      
      for (const productName of preferences.product_name_preferences) {
        const productNamePrefLower = productName.toLowerCase();
        if (productNameLower.includes(productNamePrefLower) || productNamePrefLower.includes(productNameLower)) {
          logger.debug(`   ✅ Match por nome de produto: ${productName}`);
          return true;
        }
      }
    }

    // Nenhum match
    return false;
  }

  /**
   * Verificar se usuário deve receber notificação de cupom
   */
  shouldReceiveCouponNotification(coupon, preferences) {
    // Se não tem preferências específicas, enviar
    const hasSpecificPreferences = 
      (preferences.category_preferences && preferences.category_preferences.length > 0) ||
      (preferences.keyword_preferences && preferences.keyword_preferences.length > 0);

    if (!hasSpecificPreferences) {
      return true; // Sem filtros = recebe tudo
    }

    // Verificar palavras-chave no título/descrição do cupom
    if (preferences.keyword_preferences && preferences.keyword_preferences.length > 0) {
      const titleLower = (coupon.title || '').toLowerCase();
      const descLower = (coupon.description || '').toLowerCase();
      const codeLower = (coupon.code || '').toLowerCase();
      
      for (const keyword of preferences.keyword_preferences) {
        const keywordLower = keyword.toLowerCase();
        if (titleLower.includes(keywordLower) || 
            descLower.includes(keywordLower) || 
            codeLower.includes(keywordLower)) {
          logger.debug(`   ✅ Match por palavra-chave: ${keyword}`);
          return true;
        }
      }
    }

    // Cupons geralmente não têm categoria, então se tem filtro de categoria
    // mas cupom não tem categoria, não enviar
    if (preferences.category_preferences && preferences.category_preferences.length > 0) {
      // Se cupom não tem categoria, não enviar para quem filtrou por categoria
      return false;
    }

    // Nenhum match
    return false;
  }

  /**
   * Obter estatísticas de segmentação
   */
  async getSegmentationStats() {
    try {
      const allUsers = await User.findAllWithFCMToken();
      const totalUsers = allUsers.length;

      let usersWithPreferences = 0;
      let usersWithCategoryFilter = 0;
      let usersWithKeywordFilter = 0;
      let usersWithProductNameFilter = 0;

      for (const user of allUsers) {
        const prefs = await NotificationPreference.findByUserId(user.id);
        if (prefs) {
          usersWithPreferences++;
          if (prefs.category_preferences && prefs.category_preferences.length > 0) {
            usersWithCategoryFilter++;
          }
          if (prefs.keyword_preferences && prefs.keyword_preferences.length > 0) {
            usersWithKeywordFilter++;
          }
          if (prefs.product_name_preferences && prefs.product_name_preferences.length > 0) {
            usersWithProductNameFilter++;
          }
        }
      }

      return {
        total_users: totalUsers,
        users_with_preferences: usersWithPreferences,
        users_with_category_filter: usersWithCategoryFilter,
        users_with_keyword_filter: usersWithKeywordFilter,
        users_with_product_name_filter: usersWithProductNameFilter,
        users_without_filters: totalUsers - usersWithPreferences,
      };
    } catch (error) {
      logger.error(`Erro ao obter estatísticas de segmentação: ${error.message}`);
      throw error;
    }
  }
}

export default new NotificationSegmentationService();

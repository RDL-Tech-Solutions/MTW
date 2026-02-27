import logger from '../config/logger.js';
import supabase from '../config/database.js';
import oneSignalService from './oneSignalService.js';

/**
 * Serviço de migração de tokens do Expo Notifications para OneSignal
 * 
 * Este serviço gerencia a migração gradual dos usuários existentes
 * do sistema Expo para o OneSignal, garantindo zero downtime.
 */
class OneSignalMigrationService {
  constructor() {
    this.batchSize = 100; // Processar 100 usuários por vez
    this.delayBetweenBatches = 1000; // 1 segundo entre batches
  }

  /**
   * Migrar todos os usuários com push tokens do Expo para OneSignal
   * 
   * @param {Object} options - Opções de migração
   * @param {boolean} options.dryRun - Se true, apenas simula a migração
   * @param {number} options.limit - Limite de usuários a migrar (opcional)
   * @returns {Promise<Object>} Resultado da migração
   */
  async migrateAllUsers(options = {}) {
    const { dryRun = false, limit = null } = options;

    try {
      logger.info('🚀 ========== INICIANDO MIGRAÇÃO PARA ONESIGNAL ==========');
      logger.info(`   Modo: ${dryRun ? 'DRY RUN (simulação)' : 'PRODUÇÃO'}`);
      logger.info(`   Limite: ${limit || 'sem limite'}`);

      // Buscar usuários com push tokens do Expo
      let query = supabase
        .from('users')
        .select('id, email, push_token, created_at')
        .not('push_token', 'is', null)
        .or('push_token.like.ExponentPushToken%,push_token.like.ExpoPushToken%');

      if (limit) {
        query = query.limit(limit);
      }

      const { data: users, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar usuários: ${error.message}`);
      }

      if (!users || users.length === 0) {
        logger.info('✅ Nenhum usuário com token Expo encontrado');
        return {
          success: true,
          total: 0,
          migrated: 0,
          failed: 0,
          skipped: 0
        };
      }

      logger.info(`📊 Encontrados ${users.length} usuários com tokens Expo`);

      // Processar em batches
      const batches = [];
      for (let i = 0; i < users.length; i += this.batchSize) {
        batches.push(users.slice(i, i + this.batchSize));
      }

      let totalMigrated = 0;
      let totalFailed = 0;
      let totalSkipped = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`📦 Processando batch ${i + 1}/${batches.length} (${batch.length} usuários)`);

        const results = await Promise.allSettled(
          batch.map(user => this.migrateUser(user, dryRun))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              totalMigrated++;
            } else if (result.value.skipped) {
              totalSkipped++;
            } else {
              totalFailed++;
            }
          } else {
            totalFailed++;
            logger.error(`❌ Erro ao migrar usuário ${batch[index].id}: ${result.reason}`);
          }
        });

        // Delay entre batches para não sobrecarregar a API
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
        }
      }

      logger.info('✅ ========== MIGRAÇÃO CONCLUÍDA ==========');
      logger.info(`   Total de usuários: ${users.length}`);
      logger.info(`   Migrados com sucesso: ${totalMigrated}`);
      logger.info(`   Falharam: ${totalFailed}`);
      logger.info(`   Ignorados: ${totalSkipped}`);

      return {
        success: true,
        total: users.length,
        migrated: totalMigrated,
        failed: totalFailed,
        skipped: totalSkipped
      };
    } catch (error) {
      logger.error(`❌ Erro na migração: ${error.message}`);
      return {
        success: false,
        error: error.message,
        total: 0,
        migrated: 0,
        failed: 0,
        skipped: 0
      };
    }
  }

  /**
   * Migrar um usuário específico
   * 
   * @param {Object} user - Dados do usuário
   * @param {boolean} dryRun - Se true, apenas simula
   * @returns {Promise<Object>} Resultado da migração
   */
  async migrateUser(user, dryRun = false) {
    try {
      const { id, email, push_token } = user;

      // Validar token Expo
      if (!this.isValidExpoPushToken(push_token)) {
        logger.warn(`⚠️ Token inválido para usuário ${id}: ${push_token}`);
        return {
          success: false,
          skipped: true,
          reason: 'Token inválido'
        };
      }

      if (dryRun) {
        logger.info(`[DRY RUN] Migraria usuário ${id} (${email})`);
        return {
          success: true,
          dryRun: true
        };
      }

      // Criar/atualizar usuário no OneSignal
      const result = await oneSignalService.createOrUpdateUser({
        external_id: id.toString(),
        email: email || undefined,
        tags: {
          migrated_from: 'expo',
          migration_date: new Date().toISOString(),
          original_token: push_token
        }
      });

      if (!result.success) {
        logger.error(`❌ Falha ao migrar usuário ${id}: ${result.error}`);
        return {
          success: false,
          error: result.error
        };
      }

      // Atualizar flag de migração no banco (opcional)
      // Você pode adicionar uma coluna 'onesignal_migrated' na tabela users
      try {
        await supabase
          .from('users')
          .update({ 
            onesignal_migrated: true,
            onesignal_migrated_at: new Date().toISOString()
          })
          .eq('id', id);
      } catch (dbError) {
        // Não falhar a migração se não conseguir atualizar o banco
        logger.warn(`⚠️ Não foi possível atualizar flag de migração para usuário ${id}`);
      }

      logger.info(`✅ Usuário ${id} migrado com sucesso`);

      return {
        success: true,
        user_id: id,
        player_id: result.player_id
      };
    } catch (error) {
      logger.error(`❌ Erro ao migrar usuário ${user.id}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar se é um token Expo válido
   */
  isValidExpoPushToken(token) {
    if (!token || typeof token !== 'string') return false;
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Obter estatísticas de migração
   * 
   * @returns {Promise<Object>} Estatísticas
   */
  async getMigrationStats() {
    try {
      // Total de usuários com push tokens
      const { count: totalWithTokens, error: error1 } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('push_token', 'is', null);

      if (error1) throw error1;

      // Total de usuários com tokens Expo
      const { count: totalExpoTokens, error: error2 } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .or('push_token.like.ExponentPushToken%,push_token.like.ExpoPushToken%');

      if (error2) throw error2;

      // Total de usuários já migrados (se a coluna existir)
      let totalMigrated = 0;
      try {
        const { count, error: error3 } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('onesignal_migrated', true);

        if (!error3) {
          totalMigrated = count || 0;
        }
      } catch (e) {
        // Coluna pode não existir ainda
        logger.debug('Coluna onesignal_migrated não existe');
      }

      return {
        success: true,
        stats: {
          total_with_tokens: totalWithTokens || 0,
          total_expo_tokens: totalExpoTokens || 0,
          total_migrated: totalMigrated,
          pending_migration: (totalExpoTokens || 0) - totalMigrated
        }
      };
    } catch (error) {
      logger.error(`❌ Erro ao obter estatísticas: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reverter migração de um usuário (rollback)
   * 
   * @param {number} userId - ID do usuário
   * @returns {Promise<Object>} Resultado
   */
  async rollbackUser(userId) {
    try {
      logger.info(`🔄 Revertendo migração do usuário ${userId}`);

      // Remover do OneSignal
      await oneSignalService.deleteUser(userId.toString());

      // Atualizar flag no banco
      try {
        await supabase
          .from('users')
          .update({ 
            onesignal_migrated: false,
            onesignal_migrated_at: null
          })
          .eq('id', userId);
      } catch (dbError) {
        logger.warn(`⚠️ Não foi possível atualizar flag de rollback para usuário ${userId}`);
      }

      logger.info(`✅ Rollback do usuário ${userId} concluído`);

      return {
        success: true,
        user_id: userId
      };
    } catch (error) {
      logger.error(`❌ Erro ao reverter migração: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpar dados de migração (após confirmação de sucesso)
   * 
   * @returns {Promise<Object>} Resultado
   */
  async cleanupMigrationData() {
    try {
      logger.info('🧹 Limpando dados de migração...');

      // Remover tokens Expo antigos (manter apenas OneSignal)
      const { error } = await supabase
        .from('users')
        .update({ push_token: null })
        .or('push_token.like.ExponentPushToken%,push_token.like.ExpoPushToken%')
        .eq('onesignal_migrated', true);

      if (error) throw error;

      logger.info('✅ Dados de migração limpos');

      return {
        success: true
      };
    } catch (error) {
      logger.error(`❌ Erro ao limpar dados: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OneSignalMigrationService();

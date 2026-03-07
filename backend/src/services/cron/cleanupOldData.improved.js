import Notification from '../../models/Notification.js';
import ClickTracking from '../../models/ClickTracking.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';
import SyncLog from '../../models/SyncLog.js';
import CouponSyncLog from '../../models/CouponSyncLog.js';
import AIDecisionLog from '../../models/AIDecisionLog.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SISTEMA MELHORADO DE AUTO-EXCLUSÃO
 * 
 * Melhorias implementadas:
 * 1. Limpeza de arquivos de log físicos (.log)
 * 2. Limpeza mais agressiva de dados do banco
 * 3. Verificação de horário programado
 * 4. Logs detalhados de execução
 * 5. Tratamento robusto de erros
 * 6. Limpeza de scheduled_posts órfãos
 */

/**
 * Limpar arquivos de log físicos antigos
 */
async function cleanupLogFiles() {
  try {
    logger.info('📁 Limpando arquivos de log físicos...');
    
    const logsDir = path.join(__dirname, '../../../logs');
    const maxAgeDays = 7; // Manter logs dos últimos 7 dias
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    try {
      const files = await fs.readdir(logsDir);
      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;

        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          totalSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`   🗑️ Deletado: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`   ✅ ${deletedCount} arquivos de log deletados (${(totalSize / 1024 / 1024).toFixed(2)} MB liberados)`);
      } else {
        logger.info('   ℹ️ Nenhum arquivo de log antigo para deletar');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('   ℹ️ Diretório de logs não encontrado');
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error(`❌ Erro ao limpar arquivos de log: ${error.message}`);
  }
}

/**
 * Limpar scheduled_posts órfãos (sem produto associado)
 */
async function cleanupOrphanedScheduledPosts() {
  try {
    logger.info('🗓️ Limpando agendamentos órfãos...');
    
    const { supabase } = await import('../../config/database.js');
    
    // Buscar scheduled_posts cujo product_id não existe mais
    const { data: orphanedPosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('id, product_id')
      .is('product_id', null)
      .limit(1000);

    if (fetchError) throw fetchError;

    if (orphanedPosts && orphanedPosts.length > 0) {
      const { error: deleteError } = await supabase
        .from('scheduled_posts')
        .delete()
        .in('id', orphanedPosts.map(p => p.id));

      if (deleteError) throw deleteError;

      logger.info(`   ✅ ${orphanedPosts.length} agendamentos órfãos removidos`);
    } else {
      logger.info('   ℹ️ Nenhum agendamento órfão encontrado');
    }
  } catch (error) {
    logger.error(`❌ Erro ao limpar agendamentos órfãos: ${error.message}`);
  }
}

/**
 * Limpar scheduled_posts antigos (>30 dias)
 */
async function cleanupOldScheduledPosts() {
  try {
    logger.info('🗓️ Limpando agendamentos antigos...');
    
    const { supabase } = await import('../../config/database.js');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('scheduled_posts')
      .delete({ count: 'exact' })
      .or(`status.eq.published,status.eq.failed,status.eq.cancelled`)
      .lt('created_at', thirtyDaysAgo);

    if (error) throw error;

    if (count > 0) {
      logger.info(`   ✅ ${count} agendamentos antigos removidos`);
    } else {
      logger.info('   ℹ️ Nenhum agendamento antigo para remover');
    }
  } catch (error) {
    logger.error(`❌ Erro ao limpar agendamentos antigos: ${error.message}`);
  }
}

/**
 * Verificar se está no horário programado para executar
 */
async function isScheduledTime() {
  try {
    const AppSettings = (await import('../../models/AppSettings.js')).default;
    const { hour, lastRun } = await AppSettings.getCleanupSchedule();
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Verificar se é o horário programado
    if (currentHour !== hour) {
      logger.debug(`⏰ Não é o horário programado (atual: ${currentHour}:00, programado: ${hour}:00)`);
      return false;
    }
    
    // Verificar se já executou hoje
    if (lastRun) {
      const lastRunDate = new Date(lastRun);
      const today = new Date();
      
      if (
        lastRunDate.getDate() === today.getDate() &&
        lastRunDate.getMonth() === today.getMonth() &&
        lastRunDate.getFullYear() === today.getFullYear()
      ) {
        logger.debug('⏰ Limpeza já executada hoje');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`❌ Erro ao verificar horário programado: ${error.message}`);
    return true; // Em caso de erro, executar mesmo assim
  }
}

/**
 * Atualizar timestamp da última execução
 */
async function updateLastRun() {
  try {
    const { supabase } = await import('../../config/database.js');
    
    const { error } = await supabase
      .from('app_settings')
      .update({ cleanup_last_run: new Date().toISOString() })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) throw error;
    
    logger.info('✅ Timestamp de última execução atualizado');
  } catch (error) {
    logger.error(`❌ Erro ao atualizar timestamp: ${error.message}`);
  }
}

/**
 * Função principal de limpeza melhorada
 */
export const cleanupOldData = async (force = false) => {
  const startTime = Date.now();
  
  try {
    logger.info('');
    logger.info('🧹 ========================================');
    logger.info('🧹 INICIANDO LIMPEZA AUTOMÁTICA DE DADOS');
    logger.info('🧹 ========================================');
    logger.info('');

    // Verificar se está no horário programado (a menos que seja forçado)
    if (!force) {
      const shouldRun = await isScheduledTime();
      if (!shouldRun) {
        logger.info('⏰ Limpeza não executada (fora do horário programado)');
        return;
      }
    }

    logger.info(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    logger.info(`🔧 Modo: ${force ? 'FORÇADO (manual)' : 'AUTOMÁTICO (agendado)'}`);
    logger.info('');

    // 1. Limpar arquivos de log físicos
    await cleanupLogFiles();
    logger.info('');

    // 2. Deletar notificações lidas com mais de 30 dias
    logger.info('📬 Limpando notificações antigas...');
    await Notification.deleteOld(30);
    logger.info('   ✅ Notificações antigas removidas');
    logger.info('');

    // 3. Deletar cliques com mais de 90 dias
    logger.info('🖱️ Limpando rastreamento de cliques...');
    await ClickTracking.deleteOld(90);
    logger.info('   ✅ Cliques antigos removidos');
    logger.info('');

    // 4. Deletar produtos antigos (24h pendentes / 7 dias aprovados)
    logger.info('📦 Limpando produtos antigos...');
    const productResult = await Product.cleanupOldItems();
    logger.info('');

    // 5. Deletar cupons antigos (24h pendentes / 7 dias aprovados)
    logger.info('🎟️ Limpando cupons antigos...');
    const couponResult = await Coupon.cleanupOldItems();
    logger.info('');

    // 6. Limpeza de logs do banco (30 dias)
    logger.info('📋 Limpando logs de sincronização e IA...');
    await SyncLog.deleteOld(30);
    await CouponSyncLog.cleanup(30);
    await AIDecisionLog.deleteOld(30);
    logger.info('   ✅ Logs de banco removidos');
    logger.info('');

    // 7. Limpar agendamentos órfãos
    await cleanupOrphanedScheduledPosts();
    logger.info('');

    // 8. Limpar agendamentos antigos
    await cleanupOldScheduledPosts();
    logger.info('');

    // Atualizar timestamp da última execução
    await updateLastRun();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('');
    logger.info('✅ ========================================');
    logger.info('✅ LIMPEZA CONCLUÍDA COM SUCESSO');
    logger.info('✅ ========================================');
    logger.info(`⏱️ Tempo de execução: ${duration}s`);
    logger.info('');

    return {
      success: true,
      duration,
      products: productResult,
      coupons: couponResult
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.error('');
    logger.error('❌ ========================================');
    logger.error('❌ ERRO NA LIMPEZA DE DADOS');
    logger.error('❌ ========================================');
    logger.error(`❌ Erro: ${error.message}`);
    logger.error(`❌ Stack: ${error.stack}`);
    logger.error(`⏱️ Tempo até falha: ${duration}s`);
    logger.error('');

    return {
      success: false,
      error: error.message,
      duration
    };
  }
};

/**
 * Executar limpeza forçada (manual)
 */
export const forceCleanup = async () => {
  logger.info('🚀 Limpeza FORÇADA iniciada manualmente');
  return await cleanupOldData(true);
};

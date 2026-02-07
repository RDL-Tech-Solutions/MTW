import Notification from '../../models/Notification.js';
import ClickTracking from '../../models/ClickTracking.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';
import SyncLog from '../../models/SyncLog.js';
import CouponSyncLog from '../../models/CouponSyncLog.js';
import AIDecisionLog from '../../models/AIDecisionLog.js';

export const cleanupOldData = async () => {
  try {
    logger.info('🔄 Iniciando limpeza de dados antigos...');

    // Deletar notificações lidas com mais de 30 dias
    await Notification.deleteOld(30);
    logger.info('Notificações antigas removidas');

    // Deletar cliques com mais de 90 dias
    await ClickTracking.deleteOld(90);
    logger.info('Cliques antigos removidos');

    // Deletar produtos antigos (24h pendentes / 7 dias aprovados)
    await Product.cleanupOldItems();

    // Deletar cupons antigos (24h pendentes / 7 dias aprovados)
    await Coupon.cleanupOldItems();

    // Limpeza de logs (30 dias)
    logger.info('🧹 Limpando logs de sincronização e IA...');
    await SyncLog.deleteOld(30);
    await CouponSyncLog.cleanup(30);
    await AIDecisionLog.deleteOld(30);

    logger.info('✅ Limpeza de dados concluída');
  } catch (error) {
    logger.error(`Erro na limpeza de dados: ${error.message}`);
  }
};

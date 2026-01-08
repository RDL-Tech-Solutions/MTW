import Notification from '../../models/Notification.js';
import ClickTracking from '../../models/ClickTracking.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import logger from '../../config/logger.js';

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

    logger.info('✅ Limpeza de dados concluída');
  } catch (error) {
    logger.error(`Erro na limpeza de dados: ${error.message}`);
  }
};

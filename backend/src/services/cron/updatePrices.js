import Product from '../../models/Product.js';
import Notification from '../../models/Notification.js';
import logger from '../../config/logger.js';

export const updatePrices = async () => {
  try {
    logger.info('🔄 Verificando mudanças de preço...');

    // Buscar produtos que precisam de atualização (mais de 30 min sem update)
    const staleProducts = await Product.findStale(30);

    let priceChanges = 0;

    for (const product of staleProducts) {
      try {
        const oldPrice = product.current_price;
        
        // Aqui você pode implementar lógica para buscar preço atualizado
        // das APIs externas se necessário
        
        // Por enquanto, apenas registrar que foi verificado
        await Product.update(product.id, { updated_at: new Date().toISOString() });

        // Se o preço caiu, notificar usuários que favoritaram
        if (product.current_price < oldPrice) {
          const users = await Notification.getUsersToNotify(product.id, 'price_drop');
          
          for (const user of users) {
            await Notification.create({
              user_id: user.id,
              title: '💰 Preço Caiu!',
              message: `${product.name} agora por R$ ${product.current_price.toFixed(2)}`,
              type: 'price_drop',
              related_product_id: product.id
            });
          }
          
          priceChanges++;
          logger.info(`Queda de preço detectada: ${product.name}`);
        }
      } catch (error) {
        logger.error(`Erro ao atualizar produto ${product.id}: ${error.message}`);
      }
    }

    logger.info(`✅ Verificação de preços concluída. ${priceChanges} mudanças detectadas.`);
  } catch (error) {
    logger.error(`Erro na atualização de preços: ${error.message}`);
  }
};

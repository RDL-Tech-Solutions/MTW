import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import shopeeService from '../shopee/shopeeService.js';
import mercadolivreService from '../mercadolivre/mercadolivreService.js';
import logger from '../../config/logger.js';
import { calculateDiscountPercentage } from '../../utils/helpers.js';

export const syncProducts = async () => {
  try {
    logger.info('🔄 Iniciando sincronização de produtos...');

    // Buscar categorias para mapear
    const categories = await Category.findAll();
    const defaultCategory = categories[0]; // Usar primeira categoria como padrão

    if (!defaultCategory) {
      logger.warn('Nenhuma categoria encontrada. Pulando sincronização.');
      return;
    }

    let totalSynced = 0;

    // Sincronizar Shopee
    try {
      const shopeeProducts = await shopeeService.syncProducts();
      
      for (const productData of shopeeProducts) {
        try {
          // Verificar se produto já existe
          const existing = await Product.findByExternalId(
            productData.external_id,
            'shopee'
          );

          if (existing) {
            // Atualizar preço se mudou
            if (existing.current_price !== productData.current_price) {
              await Product.updatePrice(existing.id, productData.current_price);
              logger.info(`Preço atualizado: ${existing.name}`);
            }
          } else {
            // Criar novo produto
            await Product.create({
              ...productData,
              category_id: defaultCategory.id,
              discount_percentage: calculateDiscountPercentage(
                productData.old_price,
                productData.current_price
              )
            });
            totalSynced++;
            logger.info(`Novo produto adicionado: ${productData.name}`);
          }
        } catch (error) {
          logger.error(`Erro ao processar produto Shopee: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Erro na sincronização Shopee: ${error.message}`);
    }

    // Sincronizar Mercado Livre
    try {
      const mlProducts = await mercadolivreService.syncProducts();
      
      for (const productData of mlProducts) {
        try {
          const existing = await Product.findByExternalId(
            productData.external_id,
            'mercadolivre'
          );

          if (existing) {
            if (existing.current_price !== productData.current_price) {
              await Product.updatePrice(existing.id, productData.current_price);
              logger.info(`Preço atualizado: ${existing.name}`);
            }
          } else {
            await Product.create({
              ...productData,
              category_id: defaultCategory.id,
              discount_percentage: calculateDiscountPercentage(
                productData.old_price,
                productData.current_price
              )
            });
            totalSynced++;
            logger.info(`Novo produto adicionado: ${productData.name}`);
          }
        } catch (error) {
          logger.error(`Erro ao processar produto ML: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Erro na sincronização ML: ${error.message}`);
    }

    logger.info(`✅ Sincronização concluída. ${totalSynced} novos produtos adicionados.`);
  } catch (error) {
    logger.error(`Erro na sincronização de produtos: ${error.message}`);
  }
};

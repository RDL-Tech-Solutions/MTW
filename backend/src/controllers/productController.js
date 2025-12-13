import Product from '../models/Product.js';
import ClickTracking from '../models/ClickTracking.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import { cacheGet, cacheSet, cacheDel, cacheDelByPattern } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';

class ProductController {
  // Listar produtos
  static async list(req, res, next) {
    try {
      const cacheKey = `products:${JSON.stringify(req.query)}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        return res.json(successResponse(cached));
      }

      const result = await Product.findAll(req.query);
      await cacheSet(cacheKey, result, CACHE_TTL.PRODUCTS);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  // Obter produto por ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      res.json(successResponse(product));
    } catch (error) {
      next(error);
    }
  }

  // Criar produto (admin)
  static async create(req, res, next) {
    try {
      const product = await Product.create(req.body);
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

      logger.info(`Produto criado: ${product.id}`);

      // Enviar notificação automática via bots (apenas se for promoção com desconto)
      if (product.discount_percentage && product.discount_percentage > 0) {
        try {
          // Buscar dados completos do produto para notificação
          const fullProduct = await Product.findById(product.id);
          await notificationDispatcher.notifyNewPromotion(fullProduct);
          logger.info(`Notificação de nova promoção enviada: ${product.name}`);
        } catch (notifError) {
          logger.error(`Erro ao enviar notificação de promoção: ${notifError.message}`);
          // Não falhar a criação do produto se a notificação falhar
        }
      }

      res.status(201).json(successResponse(product, 'Produto criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar produto (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.update(id, req.body);
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

      logger.info(`Produto atualizado: ${id}`);
      res.json(successResponse(product, 'Produto atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar produto (admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      await Product.delete(id);
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

      logger.info(`Produto deletado: ${id}`);
      res.json(successResponse(null, 'Produto deletado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar múltiplos produtos (admin)
  static async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(
          errorResponse('Lista de IDs inválida', 'INVALID_IDS')
        );
      }

      await Product.deleteMany(ids);
      await cacheDelByPattern('products:*');

      logger.info(`Produtos deletados em lote: ${ids.length} itens`);
      res.json(successResponse(null, `${ids.length} produtos deletados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  // Histórico de preços
  static async priceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      const history = await Product.getPriceHistory(id, parseInt(days));
      res.json(successResponse(history));
    } catch (error) {
      next(error);
    }
  }

  // Registrar clique
  static async trackClick(req, res, next) {
    try {
      const { id } = req.params;
      const { coupon_id } = req.body;

      const click = await ClickTracking.create({
        user_id: req.user?.id,
        product_id: id,
        coupon_id
      });

      logger.info(`Clique registrado: produto ${id}`);
      res.json(successResponse(click, 'Clique registrado'));
    } catch (error) {
      next(error);
    }
  }

  // Produtos relacionados
  static async related(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      const products = await Product.findRelated(id, parseInt(limit));
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  }
}

export default ProductController;

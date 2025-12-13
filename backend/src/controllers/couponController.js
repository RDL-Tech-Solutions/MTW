import Coupon from '../models/Coupon.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';

class CouponController {
  // Listar cupons ativos
  static async listActive(req, res, next) {
    try {
      const cacheKey = `coupons:active:${JSON.stringify(req.query)}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        return res.json(successResponse(cached));
      }

      const result = await Coupon.findActive(req.query);
      await cacheSet(cacheKey, result, CACHE_TTL.COUPONS);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  // Listar todos os cupons (admin)
  static async listAll(req, res, next) {
    try {
      const result = await Coupon.findAll(req.query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  // Obter cupom por ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      res.json(successResponse(coupon));
    } catch (error) {
      next(error);
    }
  }

  // Criar cupom (admin)
  static async create(req, res, next) {
    try {
      const coupon = await Coupon.create(req.body);
      await cacheDel('coupons:*');

      logger.info(`Cupom criado: ${coupon.code}`);

      // Enviar notificação automática via bots
      try {
        await notificationDispatcher.notifyNewCoupon(coupon);
        logger.info(`Notificação de novo cupom enviada: ${coupon.code}`);
      } catch (notifError) {
        logger.error(`Erro ao enviar notificação de cupom: ${notifError.message}`);
        // Não falhar a criação do cupom se a notificação falhar
      }

      res.status(201).json(successResponse(coupon, 'Cupom criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar cupom (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.update(id, req.body);
      await cacheDel('coupons:*');

      logger.info(`Cupom atualizado: ${id}`);
      res.json(successResponse(coupon, 'Cupom atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar cupom (admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      await Coupon.delete(id);
      await cacheDel('coupons:*');

      logger.info(`Cupom deletado: ${id}`);
      res.json(successResponse(null, 'Cupom deletado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar múltiplos cupons (admin)
  static async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(
          errorResponse('Lista de IDs inválida', 'INVALID_IDS')
        );
      }

      await Coupon.deleteMany(ids);
      await cacheDel('coupons:*');

      logger.info(`Cupons deletados em lote: ${ids.length} itens`);
      res.json(successResponse(null, `${ids.length} cupons deletados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  // Registrar uso do cupom
  static async use(req, res, next) {
    try {
      const { id } = req.params;

      const isValid = await Coupon.isValid(id);
      if (!isValid) {
        return res.status(400).json(
          errorResponse('Cupom inválido ou expirado', 'INVALID_COUPON')
        );
      }

      const coupon = await Coupon.incrementUse(id);
      await cacheDel('coupons:*');

      logger.info(`Cupom usado: ${id}`);
      res.json(successResponse(coupon, 'Uso registrado'));
    } catch (error) {
      next(error);
    }
  }

  // Cupons expirando em breve
  static async expiringSoon(req, res, next) {
    try {
      const { days = 3 } = req.query;
      const coupons = await Coupon.findExpiringSoon(parseInt(days));
      res.json(successResponse(coupons));
    } catch (error) {
      next(error);
    }
  }
}

export default CouponController;

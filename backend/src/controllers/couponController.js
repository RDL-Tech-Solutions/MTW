import Coupon from '../models/Coupon.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel, cacheDelByPattern } from '../utils/cache.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import couponNotificationService from '../services/coupons/couponNotificationService.js';
import couponApiService from '../services/coupons/couponApiService.js';

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

  // Buscar cupom por código (para auto-preenchimento)
  static async getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const { platform } = req.query; // Plataforma opcional para buscar via API

      if (!code || code.trim() === '') {
        return res.status(400).json(
          errorResponse('Código do cupom é obrigatório', ERROR_CODES.VALIDATION_ERROR)
        );
      }

      const upperCode = code.toUpperCase().trim();
      let coupon = null;

      // 1. Tentar buscar via API da plataforma se fornecida
      if (platform && ['mercadolivre', 'shopee', 'amazon', 'aliexpress'].includes(platform.toLowerCase())) {
        try {
          logger.debug(`🔍 Buscando cupom ${upperCode} via API da plataforma ${platform}`);
          const apiCoupon = await couponApiService.getCouponFromPlatform(upperCode, platform);

          if (apiCoupon) {
            logger.info(`✅ Cupom ${upperCode} encontrado via API da plataforma ${platform}`);
            return res.json(successResponse(apiCoupon));
          } else {
            logger.debug(`ℹ️ Cupom ${upperCode} não encontrado na API da plataforma ${platform}, buscando no banco local...`);
          }
        } catch (apiError) {
          // 404 não é um erro - apenas significa que o cupom não existe na API
          if (apiError.response?.status !== 404) {
            logger.debug(`⚠️ Erro ao buscar cupom via API: ${apiError.message}`);
          }
          // Continuar para buscar no banco local
        }
      }

      // 2. Buscar no banco de dados local
      coupon = await Coupon.findByCode(upperCode);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
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

      // Enviar notificação automática via bots COM IMAGEM DA PLATAFORMA
      // IMPORTANTE: Usar couponNotificationService que envia imagem com logo da plataforma
      try {
        logger.info(`📢 Enviando notificação de novo cupom com imagem da plataforma: ${coupon.code}`);
        const notificationResult = await couponNotificationService.notifyNewCoupon(coupon);
        logger.info(`✅ Notificação de novo cupom enviada com imagem: ${coupon.code}`);
        logger.info(`   Resultado: ${JSON.stringify(notificationResult)}`);
      } catch (notifError) {
        logger.error(`❌ Erro ao enviar notificação de cupom: ${notifError.message}`);
        logger.error(`   Stack: ${notifError.stack}`);
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

  // Forçar publicação de cupom (aprovar e notificar)
  static async forcePublish(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      // Aprovar cupom
      const approvedCoupon = await Coupon.approve(id, {
        is_pending_approval: false,
        ai_decision_reason: coupon.ai_decision_reason || 'Publicação forçada manualmente pelo admin'
      });

      // Notificar bots e app (sempre notificar quando forçar publicação manual)
      try {
        await couponNotificationService.notifyNewCoupon(approvedCoupon);
        logger.info(`✅ Cupom ${approvedCoupon.code} publicado e notificado com sucesso`);
      } catch (notifyError) {
        logger.warn(`⚠️ Erro ao notificar cupom: ${notifyError.message}`);
        logger.warn(`   Stack: ${notifyError.stack}`);
        // Não falhar a aprovação por causa de erro de notificação, mas avisar
        logger.warn(`   ⚠️ Cupom foi aprovado mas não foi notificado. Verifique os logs.`);
      }

      res.json(successResponse(approvedCoupon, 'Cupom publicado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Marcar cupom como esgotado
  static async markAsOutOfStock(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      const updatedCoupon = await Coupon.markAsOutOfStock(id);
      await cacheDel('coupons:*');

      logger.info(`Cupom marcado como esgotado: ${id} (${coupon.code})`);
      res.json(successResponse(updatedCoupon, 'Cupom marcado como esgotado'));
    } catch (error) {
      next(error);
    }
  }

  // Marcar cupom como disponível novamente
  static async markAsAvailable(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      const updatedCoupon = await Coupon.markAsAvailable(id);
      await cacheDel('coupons:*');

      logger.info(`Cupom marcado como disponível: ${id} (${coupon.code})`);
      res.json(successResponse(updatedCoupon, 'Cupom marcado como disponível'));
    } catch (error) {
      next(error);
    }
  }

  // Listar cupons pendentes de aprovação
  static async listPending(req, res, next) {
    try {
      const { page = 1, limit = 20, platform, search } = req.query;

      logger.info(`🔍 Buscando cupons pendentes - página: ${page}, limite: ${limit}, plataforma: ${platform || 'todas'}, busca: ${search || 'nenhuma'}`);

      const result = await Coupon.findPendingApproval({
        page: parseInt(page),
        limit: parseInt(limit),
        platform,
        search
      });

      logger.info(`✅ Cupons pendentes encontrados: ${result.coupons?.length || 0} de ${result.total || 0} total`);

      res.json(successResponse(result));
    } catch (error) {
      logger.error(`❌ Erro ao listar cupons pendentes: ${error.message}`);
      next(error);
    }
  }

  // Aprovar cupom
  static async approve(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const coupon = await Coupon.approve(id, updates);
      await cacheDel('coupons:*');

      // Notificar sobre novo cupom aprovado
      try {
        await couponNotificationService.notifyNewCoupon(coupon);
        logger.info(`✅ Cupom ${coupon.code} aprovado e notificado com sucesso`);
      } catch (notifError) {
        logger.warn(`⚠️ Erro ao notificar cupom aprovado: ${notifError.message}`);
      }

      logger.info(`Cupom aprovado: ${id} (${coupon.code})`);
      res.json(successResponse(coupon, 'Cupom aprovado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Rejeitar cupom
  static async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const coupon = await Coupon.reject(id, reason);
      await cacheDel('coupons:*');

      logger.info(`Cupom rejeitado: ${id} (${coupon.code})`);
      res.json(successResponse(coupon, 'Cupom rejeitado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Aprovar múltiplos cupons
  static async approveBatch(req, res, next) {
    try {
      const { ids, updates = {} } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(
          errorResponse('IDs inválidos', 'INVALID_IDS')
        );
      }

      const approved = [];
      const errors = [];

      for (const id of ids) {
        try {
          const coupon = await Coupon.approve(id, updates);
          approved.push(coupon);
          await cacheDel('coupons:*');

          // Notificar sobre novo cupom aprovado
          try {
            await couponNotificationService.notifyNewCoupon(coupon);
          } catch (notifError) {
            logger.warn(`⚠️ Erro ao notificar cupom aprovado: ${notifError.message}`);
          }
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      logger.info(`${approved.length} cupons aprovados em lote`);
      res.json(successResponse({
        approved: approved.length,
        errors: errors.length,
        details: errors
      }, `${approved.length} cupons aprovados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  // Rejeitar múltiplos cupons
  static async rejectBatch(req, res, next) {
    try {
      const { ids, reason = '' } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(
          errorResponse('IDs inválidos', 'INVALID_IDS')
        );
      }

      const rejected = [];
      const errors = [];

      for (const id of ids) {
        try {
          const coupon = await Coupon.reject(id, reason);
          rejected.push(coupon);
          await cacheDel('coupons:*');
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      logger.info(`${rejected.length} cupons rejeitados em lote`);
      res.json(successResponse({
        rejected: rejected.length,
        errors: errors.length,
        details: errors
      }, `${rejected.length} cupons rejeitados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  // Exportar cupons
  static async export(req, res, next) {
    try {
      const { format = 'json', ...filters } = req.query;

      // Buscar todos os cupons (sem paginação para exportação)
      const allFilters = { ...filters, limit: 10000, page: 1 };
      const result = await Coupon.findAll(allFilters);
      const coupons = result.coupons || result;

      if (format === 'csv') {
        // Converter para CSV
        const headers = ['Código', 'Plataforma', 'Tipo Desconto', 'Valor Desconto', 'Compra Mínima',
          'Limite Máximo', 'Válido De', 'Válido Até', 'Aplicabilidade', 'Status', 'Criado Em'];

        const csvRows = [
          headers.join(','),
          ...coupons.map(coupon => [
            coupon.code,
            coupon.platform,
            coupon.discount_type,
            coupon.discount_value,
            coupon.min_purchase || 0,
            coupon.max_discount_value || '',
            coupon.valid_from ? new Date(coupon.valid_from).toISOString() : '',
            coupon.valid_until ? new Date(coupon.valid_until).toISOString() : '',
            coupon.is_general ? 'Todos' : 'Selecionados',
            coupon.verification_status || 'active',
            coupon.created_at ? new Date(coupon.created_at).toISOString() : ''
          ].join(','))
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=coupons_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvRows.join('\n'));
      } else {
        res.json(successResponse({
          coupons,
          total: coupons.length
        }));
      }
    } catch (error) {
      next(error);
    }
  }
}

export default CouponController;

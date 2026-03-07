import Coupon from '../models/Coupon.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel, cacheDelByPattern } from '../utils/cache.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import couponNotificationService from '../services/coupons/couponNotificationService.js';
import couponApiService from '../services/coupons/couponApiService.js';
import fcmService from '../services/fcmService.js';

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
      console.log('📥 Requisição listAll recebida:', {
        query: req.query,
        headers: req.headers['user-agent']
      });
      
      const result = await Coupon.findAll(req.query);
      
      console.log('📤 Retornando cupons:', {
        total: result.total || result.length,
        count: Array.isArray(result) ? result.length : result.coupons?.length || 0,
        ids: (Array.isArray(result) ? result : result.coupons || []).map(c => ({ id: c.id, code: c.code }))
      });
      
      res.json(successResponse(result));
    } catch (error) {
      console.error('❌ Erro em listAll:', error);
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

      // DEBUG: Log para verificar o que está sendo retornado
      logger.info(`📤 Retornando cupom ${coupon.code}:`);
      logger.info(`   is_general: ${coupon.is_general} (tipo: ${typeof coupon.is_general})`);
      logger.info(`   applicable_products: ${JSON.stringify(coupon.applicable_products)}`);

      res.json(successResponse(coupon));
    } catch (error) {
      next(error);
    }
  }

  // Registrar visualização do cupom pelo usuário logado
  static async view(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Autenticação required via middleware

      if (!userId) {
        return res.status(401).json(errorResponse('Não autorizado', 'UNAUTHORIZED'));
      }

      await Coupon.registerView(id, userId);
      res.json(successResponse(null, 'Visualização registrada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Obter produtos vinculados a um cupom
  static async getProducts(req, res, next) {
    try {
      const { id } = req.params;

      // Importante: verificar se o cupom existe primeiro (opcional mas recomendado)
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      // Reutiliza o Product.findAll passando o coupon_id nos filtros
      const Product = (await import('../models/Product.js')).default;

      const filters = {
        ...req.query
      };

      if (coupon.is_general === true || coupon.is_general === null) {
        // Se for cupom geral, ele se aplica a todos da plataforma
        if (coupon.platform && coupon.platform !== 'general') {
          filters.platform = coupon.platform;
        }
      } else {
        filters.coupon_id = id;
        // Adicionar os applicable_products do cupom, se existirem
        if (coupon.applicable_products && Array.isArray(coupon.applicable_products) && coupon.applicable_products.length > 0) {
          filters.applicable_product_ids = coupon.applicable_products;
        }
      }

      const result = await Product.findAll(filters);

      res.json(successResponse(result));
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
      // CORREÇÃO: Adicionar validação e logs detalhados antes de criar cupom
      logger.info(`📝 Criando novo cupom...`);
      logger.debug(`   Dados recebidos: ${JSON.stringify(req.body, null, 2)}`);

      // Validar campos obrigatórios
      const requiredFields = ['code', 'platform', 'discount_type', 'discount_value'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        const errorMsg = `Campos obrigatórios ausentes: ${missingFields.join(', ')}`;
        logger.error(`❌ ${errorMsg}`);
        return res.status(400).json(errorResponse(errorMsg, 'VALIDATION_ERROR'));
      }

      // Extrair flag skip_notifications
      const { skip_notifications, ...couponData } = req.body;
      const skipNotifications = skip_notifications === true;

      const coupon = await Coupon.create(couponData);
      await cacheDelByPattern('coupons:*');

      logger.info(`✅ Cupom criado com sucesso: ${coupon.code} (ID: ${coupon.id})`);
      logger.debug(`   Dados do cupom criado: ${JSON.stringify(coupon, null, 2)}`);
      logger.info(`   Skip notifications: ${skipNotifications}`);

      // Enviar notificação automática via bots COM IMAGEM DA PLATAFORMA
      // IMPORTANTE: Usar couponNotificationService que envia imagem com logo da plataforma
      // SKIP se skip_notifications for true
      if (!skipNotifications) {
        try {
          logger.info(`📢 Iniciando envio de notificação para cupom: ${coupon.code}`);
          logger.debug(`   Plataforma: ${coupon.platform}`);
          logger.debug(`   is_pending_approval: ${coupon.is_pending_approval}`);

          const notificationResult = await couponNotificationService.notifyNewCoupon(coupon);

          logger.info(`✅ Notificação enviada com sucesso para cupom: ${coupon.code}`);
          logger.debug(`   Resultado da notificação: ${JSON.stringify(notificationResult, null, 2)}`);
        } catch (notifError) {
          logger.error(`❌ Erro ao enviar notificação de cupom: ${notifError.message}`);
          logger.error(`   Cupom: ${coupon.code} (ID: ${coupon.id})`);
          logger.error(`   Stack: ${notifError.stack}`);
          logger.warn(`   ⚠️ Cupom foi criado mas a notificação falhou. Verifique os logs acima.`);
          // Não falhar a criação do cupom se a notificação falhar
        }
      } else {
        logger.info(`📱 Cupom criado apenas para o app (sem notificações nos canais): ${coupon.code}`);
      }

      res.status(201).json(successResponse(coupon, 'Cupom criado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao criar cupom: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      logger.error(`   Dados recebidos: ${JSON.stringify(req.body, null, 2)}`);
      next(error);
    }
  }

  // Atualizar cupom (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      
      // Filtrar campos permitidos (remover campos que não existem na tabela)
      const allowedFields = [
        'code',
        'title',
        'description',
        'platform',
        'discount_type',
        'discount_value',
        'min_purchase',
        'max_discount_value',
        'max_uses',
        'usage_limit',
        'valid_from',
        'valid_until',
        'is_active',
        'is_exclusive',
        'is_general',
        'is_out_of_stock',
        'store_name',
        'applicable_products',
        'terms',
        'usage_instructions'
      ];
      
      const filteredUpdates = {};
      for (const key of Object.keys(req.body)) {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = req.body[key];
        }
      }
      
      const coupon = await Coupon.update(id, filteredUpdates);
      await cacheDelByPattern('coupons:*');

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
      await cacheDelByPattern('coupons:*');

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
      await cacheDelByPattern('coupons:*');

      logger.info(`Cupons deletados em lote: ${ids.length} itens`);
      res.json(successResponse(null, `${ids.length} cupons deletados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE ALL COUPONS
   * DELETE /api/coupons/bulk/all
   */
  static async deleteAll(req, res, next) {
    try {
      const userId = req.user.id;

      logger.warn(`⚠️ Deletando TODOS os cupons pelo usuário ${userId}`);

      const { supabase } = await import('../config/database.js');
      
      // Contar cupons antes de deletar
      const { count: totalCount, error: countError } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      if (totalCount === 0) {
        return res.json(successResponse({ deletedCount: 0 }, 'Nenhum cupom para deletar'));
      }

      // Deletar todos os cupons
      const { error: deleteError } = await supabase
        .from('coupons')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos (condição sempre verdadeira)

      if (deleteError) throw deleteError;

      await cacheDelByPattern('coupons:*');

      logger.warn(`🗑️ ${totalCount} cupons deletados`);

      res.json(successResponse(
        { deletedCount: totalCount },
        `${totalCount} cupons deletados com sucesso`
      ));
    } catch (error) {
      logger.error(`❌ Erro ao deletar todos os cupons: ${error.message}`);
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
      await cacheDelByPattern('coupons:*');

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
      const updateData = req.body; // Dados atualizados do frontend

      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      // IMPORTANTE: Atualizar dados do cupom antes de aprovar
      // Campos que podem ser atualizados pelo admin ao revisar
      const fieldsToUpdate = {};

      if (updateData.code !== undefined) fieldsToUpdate.code = updateData.code;
      if (updateData.platform !== undefined) fieldsToUpdate.platform = updateData.platform;
      if (updateData.description !== undefined) fieldsToUpdate.description = updateData.description;
      if (updateData.discount_type !== undefined) fieldsToUpdate.discount_type = updateData.discount_type;
      if (updateData.discount_value !== undefined) fieldsToUpdate.discount_value = updateData.discount_value;
      if (updateData.min_purchase !== undefined) fieldsToUpdate.min_purchase = updateData.min_purchase;
      if (updateData.max_discount_value !== undefined) fieldsToUpdate.max_discount_value = updateData.max_discount_value;
      if (updateData.is_general !== undefined && updateData.is_general !== null) fieldsToUpdate.is_general = updateData.is_general;
      if (updateData.max_uses !== undefined) fieldsToUpdate.max_uses = updateData.max_uses;
      if (updateData.valid_from !== undefined) fieldsToUpdate.valid_from = updateData.valid_from;
      if (updateData.valid_until !== undefined) fieldsToUpdate.valid_until = updateData.valid_until;
      if (updateData.is_exclusive !== undefined) fieldsToUpdate.is_exclusive = updateData.is_exclusive;

      // Aplicar atualizações se houver
      if (Object.keys(fieldsToUpdate).length > 0) {
        logger.info(`📝 Atualizando cupom ${id} com dados do admin:`, fieldsToUpdate);
        await Coupon.update(id, fieldsToUpdate);
      }

      // Aprovar cupom
      const approvedCoupon = await Coupon.approve(id, {
        is_pending_approval: false,
        ai_decision_reason: coupon.ai_decision_reason || 'Publicação forçada manualmente pelo admin'
      });

      // Notificar bots e app (sempre notificar quando forçar publicação manual)
      try {
        await couponNotificationService.notifyNewCoupon(approvedCoupon, { manual: true });
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

  // Marcar cupom como esgotado e notificar canais
  static async markAsOutOfStock(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      if (coupon.is_out_of_stock) {
        return res.status(400).json(
          errorResponse('Cupom já está marcado como esgotado', 'ALREADY_OUT_OF_STOCK')
        );
      }

      // Marcar como esgotado
      const updatedCoupon = await Coupon.markAsOutOfStock(id);
      await cacheDelByPattern('coupons:*');

      logger.info(`🚫 Cupom marcado como esgotado: ${id} (${coupon.code})`);

      // CORREÇÃO: Usar serviço completo de notificações (bots + push)
      try {
        logger.info(`📢 Enviando notificações de cupom esgotado...`);
        await couponNotificationService.notifyOutOfStockCoupon(updatedCoupon);
        logger.info(`✅ Notificações de cupom esgotado enviadas (bots + push)`);
      } catch (notifyError) {
        logger.error(`❌ Erro ao notificar cupom esgotado: ${notifyError.message}`);
        logger.error(`   Stack: ${notifyError.stack}`);
        // Não falhar a operação se a notificação falhar
      }

      res.json(successResponse(updatedCoupon, 'Cupom marcado como esgotado e notificações enviadas'));
    } catch (error) {
      logger.error(`❌ Erro ao marcar cupom como esgotado: ${error.message}`);
      next(error);
    }
  }

  // Restaurar estoque do cupom
  static async restoreStock(req, res, next) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json(
          errorResponse('Cupom não encontrado', ERROR_CODES.NOT_FOUND)
        );
      }

      if (!coupon.is_out_of_stock) {
        return res.status(400).json(
          errorResponse('Cupom não está marcado como esgotado', 'NOT_OUT_OF_STOCK')
        );
      }

      const updatedCoupon = await Coupon.restoreStock(id);
      await cacheDelByPattern('coupons:*');

      logger.info(`✅ Estoque do cupom restaurado: ${id} (${coupon.code})`);
      res.json(successResponse(updatedCoupon, 'Estoque do cupom restaurado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao restaurar estoque: ${error.message}`);
      next(error);
    }
  }

  // Marcar cupom como disponível novamente (alias para restoreStock)
  static async markAsAvailable(req, res, next) {
    return CouponController.restoreStock(req, res, next);
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

      // CORREÇÃO: Adicionar validação e logs detalhados antes de aprovar
      logger.info(`📝 Aprovando cupom ID: ${id}`);
      logger.debug(`   Atualizações recebidas: ${JSON.stringify(updates, null, 2)}`);

      // Verificar se o cupom existe antes de aprovar
      const existingCoupon = await Coupon.findById(id);
      if (!existingCoupon) {
        const errorMsg = `Cupom não encontrado: ID ${id}`;
        logger.error(`❌ ${errorMsg}`);
        return res.status(404).json(errorResponse(errorMsg, ERROR_CODES.NOT_FOUND));
      }

      logger.debug(`   Cupom encontrado: ${existingCoupon.code} (${existingCoupon.platform})`);
      logger.debug(`   Status atual: is_pending_approval=${existingCoupon.is_pending_approval}, is_active=${existingCoupon.is_active}`);

      const coupon = await Coupon.approve(id, updates);
      await cacheDelByPattern('coupons:*');

      logger.info(`✅ Cupom aprovado com sucesso: ${coupon.code} (ID: ${coupon.id})`);
      logger.debug(`   Novo status: is_pending_approval=${coupon.is_pending_approval}, is_active=${coupon.is_active}`);

      // CORREÇÃO CRÍTICA: Buscar cupom completo do banco antes de notificar
      // O método approve() pode não retornar todos os campos (como applicable_products)
      // Precisamos do objeto completo para renderizar o template corretamente
      const fullCoupon = await Coupon.findById(coupon.id);

      if (!fullCoupon) {
        logger.error(`❌ Erro crítico: Cupom aprovado mas não encontrado no banco: ID ${coupon.id}`);
        return res.status(500).json(errorResponse('Cupom aprovado mas não encontrado', ERROR_CODES.INTERNAL_ERROR));
      }

      logger.debug(`📦 Cupom completo carregado do banco:`);
      logger.debug(`   applicable_products: ${JSON.stringify(fullCoupon.applicable_products)}`);
      logger.debug(`   is_general: ${fullCoupon.is_general}`);

      // Notificar sobre novo cupom aprovado
      try {
        logger.info(`📢 Iniciando envio de notificação para cupom aprovado: ${fullCoupon.code}`);
        logger.debug(`   Plataforma: ${fullCoupon.platform}`);

        await couponNotificationService.notifyNewCoupon(fullCoupon, { manual: true });

        logger.info(`✅ Cupom ${fullCoupon.code} aprovado e notificado com sucesso`);
      } catch (notifError) {
        logger.warn(`⚠️ Erro ao notificar cupom aprovado: ${notifError.message}`);
        logger.warn(`   Cupom: ${coupon.code} (ID: ${coupon.id})`);
        logger.warn(`   Stack: ${notifError.stack}`);
        logger.warn(`   ⚠️ Cupom foi aprovado mas a notificação falhou. Verifique os logs acima.`);
      }

      logger.info(`Cupom aprovado: ${id} (${coupon.code})`);
      res.json(successResponse(coupon, 'Cupom aprovado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao aprovar cupom ID ${req.params.id}: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      logger.error(`   Atualizações recebidas: ${JSON.stringify(req.body, null, 2)}`);
      next(error);
    }
  }

  // Rejeitar cupom
  static async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const coupon = await Coupon.reject(id, reason);
      await cacheDelByPattern('coupons:*');

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
          await cacheDelByPattern('coupons:*');

          // Notificar sobre novo cupom aprovado
          try {
            await couponNotificationService.notifyNewCoupon(coupon, { manual: true });
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
          await cacheDelByPattern('coupons:*');
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

import couponCaptureService from '../services/coupons/couponCaptureService.js';
import couponCaptureCron from '../cron/couponCaptureCron.js';
import CouponSettings from '../models/CouponSettings.js';
import CouponSyncLog from '../models/CouponSyncLog.js';
import Coupon from '../models/Coupon.js';
import logger from '../config/logger.js';

class CouponCaptureController {
  /**
   * Executar sincronização manual de todas as plataformas
   */
  async syncAll(req, res) {
    try {
      logger.info('🔧 Sincronização manual iniciada pelo admin');

      const result = await couponCaptureService.captureAll();

      res.json({
        success: true,
        message: 'Sincronização concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na sincronização manual: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na sincronização',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar plataforma específica
   */
  async syncPlatform(req, res) {
    try {
      const { platform } = req.params;

      if (!['shopee', 'mercadolivre', 'amazon', 'aliexpress', 'gatry'].includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida'
        });
      }

      logger.info(`🔧 Sincronização manual de ${platform} iniciada`);

      const result = await couponCaptureService.capturePlatform(platform);

      res.json({
        success: true,
        message: `Sincronização de ${platform} concluída`,
        data: result
      });

    } catch (error) {
      logger.error(`Erro na sincronização: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na sincronização',
        error: error.message
      });
    }
  }

  /**
   * Verificar cupons expirados
   */
  async checkExpired(req, res) {
    try {
      logger.info('🔧 Verificação manual de cupons expirados');

      const result = await couponCaptureService.checkExpiredCoupons();

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na verificação: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na verificação',
        error: error.message
      });
    }
  }

  /**
   * Verificar validade de cupons ativos
   */
  async verifyActive(req, res) {
    try {
      logger.info('🔧 Verificação manual de validade de cupons');

      const result = await couponCaptureService.verifyActiveCoupons();

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro na verificação: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na verificação',
        error: error.message
      });
    }
  }

  /**
   * Obter estatísticas de captura
   */
  async getStats(req, res) {
    try {
      const { days = 7 } = req.query;

      const stats = await couponCaptureService.getStats(parseInt(days));

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error(`Erro ao obter estatísticas: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: error.message
      });
    }
  }

  /**
   * Obter logs de sincronização
   */
  async getLogs(req, res) {
    try {
      const {
        platform,
        sync_type,
        status,
        limit = 50,
        page = 1
      } = req.query;

      const logs = await CouponSyncLog.findRecent(parseInt(limit), {
        platform,
        sync_type,
        status
      }, parseInt(page));

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      logger.error(`Erro ao obter logs: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter logs',
        error: error.message
      });
    }
  }

  /**
   * Obter configurações do módulo
   */
  async getSettings(req, res) {
    try {
      const settings = await CouponSettings.get();

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao obter configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter configurações',
        error: error.message
      });
    }
  }

  /**
   * Atualizar configurações do módulo
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;

      const settings = await CouponSettings.update(updates);

      // Reiniciar cron se intervalo mudou
      if (updates.capture_interval_minutes || updates.auto_capture_enabled !== undefined) {
        await couponCaptureCron.restartCaptureJob();
      }

      res.json({
        success: true,
        message: 'Configurações atualizadas',
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao atualizar configurações: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar configurações',
        error: error.message
      });
    }
  }

  /**
   * Ativar/Desativar captura automática
   */
  async toggleAutoCapture(req, res) {
    try {
      const { enabled } = req.body;

      const settings = await CouponSettings.toggleAutoCapture(enabled);

      if (enabled) {
        await couponCaptureCron.startCaptureJob();
      } else {
        couponCaptureCron.stopAll();
      }

      res.json({
        success: true,
        message: enabled ? 'Captura automática ativada' : 'Captura automática desativada',
        data: settings
      });

    } catch (error) {
      logger.error(`Erro ao alterar captura automática: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar configuração',
        error: error.message
      });
    }
  }

  /**
   * Obter status dos cron jobs
   */
  async getCronStatus(req, res) {
    try {
      const status = couponCaptureCron.getStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status',
        error: error.message
      });
    }
  }

  /**
   * Listar cupons capturados
   */
  async listCoupons(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        platform,
        is_active,
        auto_captured,
        verification_status,
        search,
        min_discount,
        max_discount,
        discount_type,
        valid_from,
        valid_until,
        is_general,
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order
      };

      if (platform) filters.platform = platform;
      if (is_active !== undefined) filters.is_active = is_active === 'true';
      if (auto_captured !== undefined) filters.auto_captured = auto_captured === 'true';
      if (verification_status) filters.verification_status = verification_status;
      if (search) filters.search = search;
      if (min_discount) filters.min_discount = parseFloat(min_discount);
      if (max_discount) filters.max_discount = parseFloat(max_discount);
      if (discount_type) filters.discount_type = discount_type;
      if (valid_from) filters.valid_from = valid_from;
      if (valid_until) filters.valid_until = valid_until;
      if (is_general !== undefined) filters.is_general = is_general === 'true';

      const result = await Coupon.findAll(filters);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error(`Erro ao listar cupons: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar cupons',
        error: error.message
      });
    }
  }

  /**
   * Exportar cupons para CSV/JSON
   */
  async exportCoupons(req, res) {
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
            coupon.verification_status,
            coupon.created_at ? new Date(coupon.created_at).toISOString() : ''
          ].join(','))
        ];

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=coupons.csv');
        res.send(csvRows.join('\n'));
      } else {
        res.json({
          success: true,
          data: coupons,
          total: coupons.length
        });
      }

    } catch (error) {
      logger.error(`Erro ao exportar cupons: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao exportar cupons',
        error: error.message
      });
    }
  }

  /**
   * Ações em lote nos cupons
   */
  async batchAction(req, res) {
    try {
      const { action, coupon_ids } = req.body;

      if (!Array.isArray(coupon_ids) || coupon_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de IDs de cupons é obrigatória'
        });
      }

      let updated = 0;
      const updates = {};

      switch (action) {
        case 'expire':
          updates.is_active = false;
          updates.verification_status = 'expired';
          break;
        case 'activate':
          updates.is_active = true;
          updates.verification_status = 'active';
          break;
        case 'delete':
          // Deletar cupons
          for (const id of coupon_ids) {
            try {
              await Coupon.delete(id);
              updated++;
            } catch (error) {
              logger.warn(`Erro ao deletar cupom ${id}: ${error.message}`);
            }
          }
          return res.json({
            success: true,
            message: `${updated} cupons deletados`,
            data: { updated }
          });
        default:
          return res.status(400).json({
            success: false,
            message: 'Ação inválida'
          });
      }

      // Atualizar cupons
      for (const id of coupon_ids) {
        try {
          await Coupon.update(id, updates);
          updated++;
        } catch (error) {
          logger.warn(`Erro ao atualizar cupom ${id}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `${updated} cupons atualizados`,
        data: { updated, action }
      });

    } catch (error) {
      logger.error(`Erro na ação em lote: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na ação em lote',
        error: error.message
      });
    }
  }

  /**
   * Verificar cupom específico
   */
  async verifyCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Cupom não encontrado'
        });
      }

      // Verificar via serviço de captura
      const result = await couponCaptureService.verifyActiveCoupons([id]);

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });

    } catch (error) {
      logger.error(`Erro ao verificar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar cupom',
        error: error.message
      });
    }
  }

  /**
   * Forçar expiração de um cupom
   */
  async expireCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.update(id, {
        is_active: false,
        verification_status: 'expired'
      });

      res.json({
        success: true,
        message: 'Cupom marcado como expirado',
        data: coupon
      });

    } catch (error) {
      logger.error(`Erro ao expirar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao expirar cupom',
        error: error.message
      });
    }
  }

  /**
   * Reativar cupom
   */
  async reactivateCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.update(id, {
        is_active: true,
        verification_status: 'active'
      });

      res.json({
        success: true,
        message: 'Cupom reativado',
        data: coupon
      });

    } catch (error) {
      logger.error(`Erro ao reativar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao reativar cupom',
        error: error.message
      });
    }
  }

  /**
   * Listar cupons pendentes de aprovação
   */
  async listPendingCoupons(req, res) {
    try {
      const { page = 1, limit = 20, platform, search } = req.query;

      const result = await Coupon.findPendingApproval({
        page: parseInt(page),
        limit: parseInt(limit),
        platform,
        search
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao listar cupons pendentes: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar cupons pendentes',
        error: error.message
      });
    }
  }

  /**
   * Aprovar cupom
   */
  async approveCoupon(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const coupon = await Coupon.approve(id, updates);

      // Notificar sobre novo cupom aprovado
      try {
        const couponNotificationService = (await import('../services/coupons/couponNotificationService.js')).default;
        await couponNotificationService.notifyNewCoupon(coupon);
      } catch (notifError) {
        logger.warn(`Erro ao notificar cupom aprovado: ${notifError.message}`);
      }

      res.json({
        success: true,
        message: 'Cupom aprovado com sucesso',
        data: coupon
      });
    } catch (error) {
      logger.error(`Erro ao aprovar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao aprovar cupom',
        error: error.message
      });
    }
  }

  /**
   * Rejeitar cupom
   */
  async rejectCoupon(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const coupon = await Coupon.reject(id, reason);

      res.json({
        success: true,
        message: 'Cupom rejeitado com sucesso',
        data: coupon
      });
    } catch (error) {
      logger.error(`Erro ao rejeitar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao rejeitar cupom',
        error: error.message
      });
    }
  }

  /**
   * Aprovar múltiplos cupons
   */
  async approveBatch(req, res) {
    try {
      const { ids, updates = {} } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs inválidos'
        });
      }

      const approved = [];
      const errors = [];

      for (const id of ids) {
        try {
          const coupon = await Coupon.approve(id, updates);
          approved.push(coupon);

          // Notificar sobre novo cupom aprovado
          try {
            const couponNotificationService = (await import('../services/coupons/couponNotificationService.js')).default;
            await couponNotificationService.notifyNewCoupon(coupon);
          } catch (notifError) {
            logger.warn(`Erro ao notificar cupom aprovado: ${notifError.message}`);
          }
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `${approved.length} cupons aprovados`,
        data: {
          approved: approved.length,
          errors: errors.length,
          details: errors
        }
      });
    } catch (error) {
      logger.error(`Erro ao aprovar cupons em lote: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao aprovar cupons',
        error: error.message
      });
    }
  }

  /**
   * Rejeitar múltiplos cupons
   */
  async rejectBatch(req, res) {
    try {
      const { ids, reason = '' } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs inválidos'
        });
      }

      const rejected = [];
      const errors = [];

      for (const id of ids) {
        try {
          const coupon = await Coupon.reject(id, reason);
          rejected.push(coupon);
        } catch (error) {
          errors.push({ id, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `${rejected.length} cupons rejeitados`,
        data: {
          rejected: rejected.length,
          errors: errors.length,
          details: errors
        }
      });
    } catch (error) {
      logger.error(`Erro ao rejeitar cupons em lote: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao rejeitar cupons',
        error: error.message
      });
    }
  }

  // ============================================
  // Endpoints Específicos Shopee
  // ============================================

  /**
   * Buscar cupons Shopee por categoria
   * POST /api/coupon-capture/shopee/category/:categoryId
   */
  async captureShopeeByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const shopeeCouponCapture = (await import('../services/coupons/shopeeCouponCapture.js')).default;

      logger.info(`🔧 Captura manual de cupons Shopee por categoria: ${categoryId}`);

      const coupons = await shopeeCouponCapture.captureCouponsByCategory(categoryId);

      res.json({
        success: true,
        message: `Captura concluída para categoria ${categoryId}`,
        data: {
          found: coupons.length,
          coupons
        }
      });
    } catch (error) {
      logger.error(`Erro na captura por categoria: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na captura',
        error: error.message
      });
    }
  }

  /**
   * Buscar cupons Shopee por palavra-chave
   * POST /api/coupon-capture/shopee/keyword
   */
  async captureShopeeByKeyword(req, res) {
    try {
      const { keyword } = req.body;

      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: 'Palavra-chave é obrigatória'
        });
      }

      const shopeeCouponCapture = (await import('../services/coupons/shopeeCouponCapture.js')).default;

      logger.info(`🔧 Captura manual de cupons Shopee por palavra-chave: ${keyword}`);

      const coupons = await shopeeCouponCapture.captureCouponsByKeyword(keyword);

      res.json({
        success: true,
        message: `Captura concluída para "${keyword}"`,
        data: {
          found: coupons.length,
          coupons
        }
      });
    } catch (error) {
      logger.error(`Erro na captura por palavra-chave: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na captura',
        error: error.message
      });
    }
  }

  /**
   * Buscar categorias Shopee
   * GET /api/coupon-capture/shopee/categories
   */
  async getShopeeCategories(req, res) {
    try {
      const shopeeService = (await import('../services/shopee/shopeeService.js')).default;

      logger.info('🔧 Buscando categorias Shopee...');

      const categories = await shopeeService.getCategories();

      res.json({
        success: true,
        message: 'Categorias obtidas com sucesso',
        data: categories
      });
    } catch (error) {
      logger.error(`Erro ao buscar categorias: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar categorias',
        error: error.message
      });
    }
  }

  /**
   * Verificar cupom Shopee
   * POST /api/coupon-capture/shopee/verify
   */
  async verifyShopeeCoupon(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código do cupom é obrigatório'
        });
      }

      const shopeeCouponCapture = (await import('../services/coupons/shopeeCouponCapture.js')).default;

      logger.info(`🔧 Verificando cupom Shopee: ${code}`);

      const result = await shopeeCouponCapture.verifyCoupon(code);

      res.json({
        success: true,
        message: 'Verificação concluída',
        data: result
      });
    } catch (error) {
      logger.error(`Erro ao verificar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar cupom',
        error: error.message
      });
    }
  }

  /**
   * Buscar estatísticas de comissão Shopee
   * GET /api/coupon-capture/shopee/commission-stats
   */
  async getShopeeCommissionStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'start_date e end_date são obrigatórios (formato: YYYY-MM-DD)'
        });
      }

      const shopeeService = (await import('../services/shopee/shopeeService.js')).default;

      logger.info(`🔧 Buscando estatísticas de comissão Shopee: ${start_date} a ${end_date}`);

      const stats = await shopeeService.getCommissionStats(start_date, end_date);

      res.json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      logger.error(`Erro ao buscar estatísticas: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message
      });
    }
  }

  /**
   * Analisar cupom Shopee com IA
   * POST /api/coupon-capture/shopee/analyze-coupon
   */
  async analyzeShopeeCoupon(req, res) {
    try {
      const { coupon } = req.body;

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Dados do cupom são obrigatórios'
        });
      }

      const shopeeAnalyzer = (await import('../ai/shopeeAnalyzer.js')).default;

      logger.info(`🔧 Analisando cupom Shopee com IA...`);

      const analysis = await shopeeAnalyzer.analyzeCoupon(coupon);

      res.json({
        success: true,
        message: 'Análise concluída',
        data: analysis
      });
    } catch (error) {
      logger.error(`Erro ao analisar cupom: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao analisar cupom',
        error: error.message
      });
    }
  }

  /**
   * Analisar produto Shopee com IA
   * POST /api/coupon-capture/shopee/analyze-product
   */
  async analyzeShopeeProduct(req, res) {
    try {
      const { product } = req.body;

      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'Dados do produto são obrigatórios'
        });
      }

      const shopeeAnalyzer = (await import('../ai/shopeeAnalyzer.js')).default;

      logger.info(`🔧 Analisando produto Shopee com IA...`);

      const analysis = await shopeeAnalyzer.analyzeProduct(product);

      res.json({
        success: true,
        message: 'Análise concluída',
        data: analysis
      });
    } catch (error) {
      logger.error(`Erro ao analisar produto: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao analisar produto',
        error: error.message
      });
    }
  }

  /**
   * Analisar cupons em lote com IA
   * POST /api/coupon-capture/ai/batch-analyze
   */
  async batchAnalyzeCoupons(req, res) {
    try {
      const { coupons, options } = req.body;

      if (!coupons || !Array.isArray(coupons)) {
        return res.status(400).json({
          success: false,
          message: 'Array de cupons é obrigatório'
        });
      }

      if (coupons.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Máximo de 50 cupons por lote'
        });
      }

      const couponBatchAnalyzer = (await import('../ai/couponBatchAnalyzer.js')).default;

      logger.info(`🔧 Analisando ${coupons.length} cupons em lote...`);

      const analyses = await couponBatchAnalyzer.analyzeBatch(coupons, options || {});

      res.json({
        success: true,
        message: 'Análise em lote concluída',
        data: analyses
      });
    } catch (error) {
      logger.error(`Erro na análise em lote: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na análise em lote',
        error: error.message
      });
    }
  }

  /**
   * Gerar relatório de análise de cupons
   * POST /api/coupon-capture/ai/generate-report
   */
  async generateAnalysisReport(req, res) {
    try {
      const { coupons } = req.body;

      if (!coupons || !Array.isArray(coupons)) {
        return res.status(400).json({
          success: false,
          message: 'Array de cupons é obrigatório'
        });
      }

      const couponBatchAnalyzer = (await import('../ai/couponBatchAnalyzer.js')).default;

      logger.info(`🔧 Gerando relatório de análise para ${coupons.length} cupons...`);

      const report = await couponBatchAnalyzer.generateReport(coupons);

      res.json({
        success: true,
        message: 'Relatório gerado com sucesso',
        data: report
      });
    } catch (error) {
      logger.error(`Erro ao gerar relatório: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório',
        error: error.message
      });
    }
  }

  /**
   * Filtrar cupons usando análise em lote
   * POST /api/coupon-capture/ai/filter-by-analysis
   */
  async filterCouponsByAnalysis(req, res) {
    try {
      const { coupons, min_score } = req.body;

      if (!coupons || !Array.isArray(coupons)) {
        return res.status(400).json({
          success: false,
          message: 'Array de cupons é obrigatório'
        });
      }

      const couponBatchAnalyzer = (await import('../ai/couponBatchAnalyzer.js')).default;

      logger.info(`🔧 Filtrando ${coupons.length} cupons por análise...`);

      const filtered = await couponBatchAnalyzer.filterByAnalysis(coupons, min_score || 0.7);

      res.json({
        success: true,
        message: 'Filtragem concluída',
        data: {
          original_count: coupons.length,
          filtered_count: filtered.length,
          filtered_coupons: filtered
        }
      });
    } catch (error) {
      logger.error(`Erro na filtragem por análise: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro na filtragem',
        error: error.message
      });
    }
  }

  /**
   * Melhorar qualidade de cupons com IA
   * POST /api/coupon-capture/ai/enhance-coupons
   */
  async enhanceCoupons(req, res) {
    try {
      const { coupons } = req.body;

      if (!coupons || !Array.isArray(coupons)) {
        return res.status(400).json({
          success: false,
          message: 'Array de cupons é obrigatório'
        });
      }

      if (coupons.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Máximo de 20 cupons por vez'
        });
      }

      const couponQualityEnhancer = (await import('../ai/couponQualityEnhancer.js')).default;

      logger.info(`🔧 Melhorando ${coupons.length} cupons com IA...`);

      const enhanced = await couponQualityEnhancer.enhanceBatch(coupons, 3);

      res.json({
        success: true,
        message: 'Cupons melhorados com sucesso',
        data: enhanced
      });
    } catch (error) {
      logger.error(`Erro ao melhorar cupons: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Erro ao melhorar cupons',
        error: error.message
      });
    }
  }
}

export default new CouponCaptureController();

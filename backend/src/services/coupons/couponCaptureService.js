import logger from '../../config/logger.js';
import Coupon from '../../models/Coupon.js';
import CouponSettings from '../../models/CouponSettings.js';
import CouponSyncLog from '../../models/CouponSyncLog.js';
import shopeeCouponCapture from './shopeeCouponCapture.js';
import meliCouponCapture from './meliCouponCapture.js';
import amazonCouponCapture from './amazonCouponCapture.js';
import aliExpressCouponCapture from './aliExpressCouponCapture.js';
import gatryCouponCapture from './gatryCouponCapture.js';
import couponNotificationService from './couponNotificationService.js';
import CouponValidator from '../../utils/couponValidator.js';

class CouponCaptureService {
  /**
   * Executar captura automática de todas as plataformas ativas
   */
  async captureAll() {
    const startTime = Date.now();
    logger.info('🔥 ========== INICIANDO CAPTURA AUTOMÁTICA DE CUPONS ==========');

    try {
      const settings = await CouponSettings.get();

      if (!settings.auto_capture_enabled) {
        logger.info('⏸️ Captura automática desativada');
        return {
          success: false,
          message: 'Captura automática desativada'
        };
      }

      const results = {
        shopee: { found: 0, created: 0, errors: 0 },
        mercadolivre: { found: 0, created: 0, errors: 0 },
        amazon: { found: 0, created: 0, errors: 0 },
        aliexpress: { found: 0, created: 0, errors: 0 },
        gatry: { found: 0, created: 0, errors: 0 }
      };

      // Capturar de cada plataforma ativa
      const platforms = await CouponSettings.getActivePlatforms();

      for (const platform of platforms) {
        try {
          const result = await this.capturePlatform(platform);
          results[platform] = result;
        } catch (error) {
          logger.error(`❌ Erro na captura ${platform}: ${error.message}`);
          results[platform].errors++;
        }
      }

      const duration = Date.now() - startTime;
      const totalFound = Object.values(results).reduce((sum, r) => sum + r.found, 0);
      const totalCreated = Object.values(results).reduce((sum, r) => sum + r.created, 0);

      logger.info('✅ ========== CAPTURA CONCLUÍDA ==========');
      logger.info(`⏱️ Duração: ${(duration / 1000).toFixed(2)}s`);
      logger.info(`📊 Total encontrado: ${totalFound} cupons`);
      logger.info(`✨ Total criado: ${totalCreated} novos cupons`);

      return {
        success: true,
        duration,
        results,
        totalFound,
        totalCreated
      };

    } catch (error) {
      logger.error(`❌ Erro fatal na captura: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Capturar cupons de uma plataforma específica
   */
  async capturePlatform(platform) {
    const startTime = Date.now();
    const logId = await this.createSyncLog(platform);

    try {
      logger.info(`🚀 Capturando cupons de ${platform}...`);

      let coupons = [];

      // Selecionar service de captura
      switch (platform) {
        case 'shopee':
          coupons = await shopeeCouponCapture.captureCoupons();
          break;
        case 'mercadolivre':
          coupons = await meliCouponCapture.captureCoupons();
          break;
        case 'amazon':
          coupons = await amazonCouponCapture.captureCoupons();
          break;
        case 'aliexpress':
          coupons = await aliExpressCouponCapture.captureCoupons();
          break;
        case 'gatry':
          coupons = await gatryCouponCapture.captureCoupons();
          break;
        default:
          throw new Error(`Plataforma desconhecida: ${platform}`);
      }

      logger.info(`📦 ${platform}: ${coupons.length} cupons encontrados`);

      // Filtrar cupons inválidos antes de processar
      const validCoupons = CouponValidator.filterValidCoupons(coupons);
      logger.info(`✅ ${platform}: ${validCoupons.length} cupons válidos após filtragem (${coupons.length - validCoupons.length} inválidos removidos)`);

      // Processar e salvar cupons
      let created = 0;
      let errors = 0;

      for (const coupon of validCoupons) {
        try {
          const saved = await this.saveCoupon(coupon);
          if (saved.isNew) {
            created++;
            // Enviar notificação apenas se o cupom não estiver pendente de aprovação
            if (!saved.coupon.is_pending_approval) {
              await this.notifyNewCoupon(saved.coupon);
            }
          }
        } catch (error) {
          errors++;
          logger.error(`Erro ao salvar cupom ${coupon.code}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;

      // Atualizar log
      await CouponSyncLog.complete(logId, {
        coupons_found: coupons.length,
        coupons_created: created,
        errors,
        duration_ms: duration
      });

      logger.info(`✅ ${platform}: ${created} novos cupons salvos`);

      return {
        found: coupons.length,
        created,
        errors
      };

    } catch (error) {
      logger.error(`❌ Erro na captura ${platform}: ${error.message}`);

      // Marcar log como falho
      if (logId) {
        await CouponSyncLog.fail(logId, error.message);
      }

      return {
        found: 0,
        created: 0,
        errors: 1
      };
    }
  }

  /**
   * Salvar cupom no banco de dados
   */
  async saveCoupon(couponData) {
    try {
      // Validar cupom antes de salvar
      const validation = CouponValidator.validateCoupon(couponData);
      if (!validation.valid) {
        logger.warn(`⚠️ Cupom rejeitado antes de salvar: ${couponData.code} - ${validation.reason}`);
        throw new Error(`Cupom inválido: ${validation.reason}`);
      }

      // Verificar se cupom já existe (por código e plataforma)
      const existing = await Coupon.findByCode(couponData.code);

      if (existing) {
        // Se o cupom existente está pendente de aprovação e o novo também está, não atualizar
        // Isso evita duplicatas de cupons pendentes
        if (existing.is_pending_approval && couponData.is_pending_approval) {
          logger.info(`Cupom ${couponData.code} já existe como pendente, ignorando duplicata`);
          return {
            coupon: existing,
            isNew: false
          };
        }

        // Se o cupom existente não está pendente, atualizar apenas se o novo não estiver pendente
        // Cupons aprovados podem ser atualizados
        if (!existing.is_pending_approval && !couponData.is_pending_approval) {
          const updated = await Coupon.update(existing.id, {
            ...couponData,
            last_verified_at: new Date().toISOString()
          });

          return {
            coupon: updated,
            isNew: false
          };
        }

        // Se o existente está aprovado e o novo está pendente, não atualizar
        logger.info(`Cupom ${couponData.code} já existe e está aprovado, ignorando cupom pendente`);
        return {
          coupon: existing,
          isNew: false
        };
      }

      // Criar novo cupom
      const newCoupon = await Coupon.create(couponData);

      return {
        coupon: newCoupon,
        isNew: true
      };

    } catch (error) {
      logger.error(`Erro ao salvar cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Criar log de sincronização
   */
  async createSyncLog(platform) {
    try {
      const log = await CouponSyncLog.create({
        platform,
        sync_type: 'capture',
        started_at: new Date().toISOString(),
        status: 'running'
      });

      return log.id;
    } catch (error) {
      logger.error(`Erro ao criar log: ${error.message}`);
      return null;
    }
  }

  /**
   * Notificar sobre novo cupom
   */
  async notifyNewCoupon(coupon) {
    try {
      const settings = await CouponSettings.get();

      if (settings.notify_bots_on_new_coupon) {
        await couponNotificationService.notifyNewCoupon(coupon);
      }
    } catch (error) {
      logger.error(`Erro ao notificar novo cupom: ${error.message}`);
    }
  }

  /**
   * Verificar cupons expirados
   */
  async checkExpiredCoupons() {
    const startTime = Date.now();
    logger.info('⏰ Verificando cupons expirados...');

    try {
      const expiredCoupons = await Coupon.findExpired();
      logger.info(`📋 ${expiredCoupons.length} cupons expirados encontrados`);

      const settings = await CouponSettings.get();
      let deactivated = 0;

      for (const coupon of expiredCoupons) {
        try {
          // Desativar cupom
          await Coupon.update(coupon.id, {
            is_active: false,
            verification_status: 'expired'
          });

          deactivated++;

          // Notificar sobre expiração
          if (settings.notify_bots_on_expiration) {
            await couponNotificationService.notifyExpiredCoupon(coupon);
          }

        } catch (error) {
          logger.error(`Erro ao processar cupom expirado ${coupon.id}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ ${deactivated} cupons desativados em ${(duration / 1000).toFixed(2)}s`);

      return {
        found: expiredCoupons.length,
        deactivated,
        duration
      };

    } catch (error) {
      logger.error(`❌ Erro ao verificar cupons expirados: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar validade de cupons ativos
   */
  async verifyActiveCoupons(couponIds = null) {
    logger.info('🔍 Verificando validade de cupons ativos...');

    try {
      let activeCoupons;
      if (couponIds && Array.isArray(couponIds) && couponIds.length > 0) {
        // Buscar cupons específicos
        activeCoupons = { coupons: [] };
        for (const id of couponIds) {
          try {
            const coupon = await Coupon.findById(id);
            if (coupon) activeCoupons.coupons.push(coupon);
          } catch (error) {
            logger.warn(`Cupom ${id} não encontrado`);
          }
        }
      } else {
        activeCoupons = await Coupon.findActive({ limit: 100 });
      }
      
      let verified = 0;
      let invalid = 0;

      for (const coupon of activeCoupons.coupons) {
        try {
          let result = { valid: true };

          // Verificar de acordo com a plataforma
          switch (coupon.platform) {
            case 'shopee':
              result = await shopeeCouponCapture.verifyCoupon(coupon.code);
              break;
            case 'mercadolivre':
              result = await meliCouponCapture.verifyCoupon(coupon.code);
              break;
            case 'amazon':
              result = await amazonCouponCapture.verifyCoupon(coupon.code);
              break;
            case 'aliexpress':
              result = await aliExpressCouponCapture.verifyCoupon(coupon.code);
              break;
          }

          verified++;

          // Atualizar status
          const status = result.valid ? 'active' : 'invalid';
          await Coupon.update(coupon.id, {
            verification_status: status,
            last_verified_at: new Date().toISOString()
          });

          if (!result.valid) {
            invalid++;
            // Desativar se inválido
            await Coupon.deactivate(coupon.id);
          }

        } catch (error) {
          logger.error(`Erro ao verificar cupom ${coupon.code}: ${error.message}`);
        }
      }

      logger.info(`✅ ${verified} cupons verificados, ${invalid} inválidos`);

      return {
        verified,
        invalid
      };

    } catch (error) {
      logger.error(`❌ Erro na verificação: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obter estatísticas de captura
   */
  async getStats(days = 7) {
    try {
      const platforms = ['shopee', 'mercadolivre', 'amazon', 'aliexpress'];
      const stats = {};

      for (const platform of platforms) {
        stats[platform] = await CouponSyncLog.getStats(platform, days);
      }

      // Estatísticas gerais de cupons
      const totalActive = await Coupon.countActive();
      const expiringSoon = await Coupon.findExpiringSoon(3);

      return {
        platforms: stats,
        coupons: {
          active: totalActive,
          expiring_soon: expiringSoon.length
        }
      };

    } catch (error) {
      logger.error(`Erro ao obter estatísticas: ${error.message}`);
      throw error;
    }
  }
}

export default new CouponCaptureService();

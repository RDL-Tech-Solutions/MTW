/**
 * AUDITORIA COMPLETA DO SISTEMA DE NOTIFICAÇÕES PUSH
 * 
 * Este script testa:
 * 1. Criação de cupom → Notificação
 * 2. Aprovação de cupom → Notificação
 * 3. Cupom esgotado → Notificação
 * 4. Criação de produto → Notificação
 * 5. Aprovação de produto → Notificação
 * 6. Configurações FCM
 * 7. Tokens FCM dos usuários
 */

import logger from '../src/config/logger.js';
import fcmService from '../src/services/fcmService.js';
import couponNotificationService from '../src/services/coupons/couponNotificationService.js';
import publishService from '../src/services/autoSync/publishService.js';
import Coupon from '../src/models/Coupon.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import AppSettings from '../src/models/AppSettings.js';
import { supabase } from '../src/config/database.js';

class NotificationAuditor {
  constructor() {
    this.results = {
      fcm_config: null,
      user_tokens: null,
      coupon_create: null,
      coupon_approve: null,
      coupon_out_of_stock: null,
      product_create: null,
      product_approve: null,
      errors: []
    };
  }

  /**
   * 1. Verificar configuração FCM
   */
  async auditFCMConfig() {
    logger.info('\n========== 1. AUDITORIA: CONFIGURAÇÃO FCM ==========');
    
    try {
      const settings = await AppSettings.get();
      
      logger.info('📋 Configurações do sistema:');
      logger.info(`   backend_url: ${settings.backend_url || 'NÃO DEFINIDO'}`);
      logger.info(`   fcm_enabled: ${settings.fcm_enabled !== false ? 'SIM' : 'NÃO'}`);
      
      // Verificar se FCM está habilitado
      const isEnabled = fcmService.isEnabled();
      logger.info(`   FCM Service Status: ${isEnabled ? '✅ ATIVO' : '❌ INATIVO'}`);
      
      // Verificar variáveis de ambiente
      const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
      const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
      
      logger.info('\n🔑 Variáveis de ambiente:');
      logger.info(`   FIREBASE_SERVICE_ACCOUNT: ${hasServiceAccount ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
      logger.info(`   FIREBASE_PROJECT_ID: ${hasProjectId ? '✅ DEFINIDA' : '❌ NÃO DEFINIDA'}`);
      
      if (hasServiceAccount) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          logger.info(`   Project ID: ${serviceAccount.project_id}`);
          logger.info(`   Client Email: ${serviceAccount.client_email}`);
        } catch (e) {
          logger.error(`   ❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT: ${e.message}`);
        }
      }
      
      this.results.fcm_config = {
        enabled: isEnabled,
        has_service_account: hasServiceAccount,
        has_project_id: hasProjectId,
        backend_url: settings.backend_url
      };
      
      if (!isEnabled) {
        logger.error('\n❌ FCM NÃO ESTÁ HABILITADO! Notificações push não funcionarão.');
        this.results.errors.push('FCM não está habilitado');
      } else {
        logger.info('\n✅ Configuração FCM OK');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar configuração FCM: ${error.message}`);
      this.results.errors.push(`FCM Config: ${error.message}`);
    }
  }

  /**
   * 2. Verificar tokens FCM dos usuários
   */
  async auditUserTokens() {
    logger.info('\n========== 2. AUDITORIA: TOKENS FCM DOS USUÁRIOS ==========');
    
    try {
      // Buscar todos os usuários
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, fcm_token, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      logger.info(`\n📱 Total de usuários (últimos 10): ${users.length}`);
      
      const usersWithToken = users.filter(u => u.fcm_token);
      const usersWithoutToken = users.filter(u => !u.fcm_token);
      
      logger.info(`   ✅ Com token FCM: ${usersWithToken.length}`);
      logger.info(`   ❌ Sem token FCM: ${usersWithoutToken.length}`);
      
      if (usersWithToken.length > 0) {
        logger.info('\n📋 Usuários com token FCM:');
        usersWithToken.forEach(u => {
          logger.info(`   - ${u.name || u.email} (ID: ${u.id})`);
          logger.info(`     Token: ${u.fcm_token.substring(0, 50)}...`);
        });
      }
      
      if (usersWithoutToken.length > 0) {
        logger.info('\n⚠️ Usuários SEM token FCM:');
        usersWithoutToken.forEach(u => {
          logger.info(`   - ${u.name || u.email} (ID: ${u.id})`);
        });
      }
      
      this.results.user_tokens = {
        total: users.length,
        with_token: usersWithToken.length,
        without_token: usersWithoutToken.length
      };
      
      if (usersWithToken.length === 0) {
        logger.warn('\n⚠️ NENHUM USUÁRIO TEM TOKEN FCM! Notificações não serão enviadas.');
        this.results.errors.push('Nenhum usuário tem token FCM');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar tokens: ${error.message}`);
      this.results.errors.push(`User Tokens: ${error.message}`);
    }
  }

  /**
   * 3. Testar criação de cupom
   */
  async auditCouponCreate() {
    logger.info('\n========== 3. AUDITORIA: CRIAÇÃO DE CUPOM ==========');
    
    try {
      logger.info('📝 Simulando criação de cupom...');
      
      const testCoupon = {
        code: `TESTE_AUDIT_${Date.now()}`,
        platform: 'shopee',
        discount_type: 'percentage',
        discount_value: 15,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_pending_approval: false,
        is_general: true
      };
      
      logger.info(`   Código: ${testCoupon.code}`);
      logger.info(`   Plataforma: ${testCoupon.platform}`);
      logger.info(`   Desconto: ${testCoupon.discount_value}%`);
      
      // Criar cupom
      const coupon = await Coupon.create(testCoupon);
      logger.info(`✅ Cupom criado: ID ${coupon.id}`);
      
      // Tentar enviar notificação
      logger.info('\n📢 Tentando enviar notificação...');
      const notifResult = await couponNotificationService.notifyNewCoupon(coupon);
      
      logger.info('\n📊 Resultado da notificação:');
      logger.info(`   Success: ${notifResult.success}`);
      logger.info(`   WhatsApp: ${JSON.stringify(notifResult.whatsapp)}`);
      logger.info(`   Telegram: ${JSON.stringify(notifResult.telegram)}`);
      
      this.results.coupon_create = {
        coupon_id: coupon.id,
        notification_sent: notifResult.success,
        whatsapp: notifResult.whatsapp,
        telegram: notifResult.telegram
      };
      
      // Limpar cupom de teste
      await Coupon.delete(coupon.id);
      logger.info(`\n🗑️ Cupom de teste removido`);
      
      if (!notifResult.success) {
        logger.error('\n❌ FALHA ao enviar notificação de criação de cupom');
        this.results.errors.push('Notificação de criação de cupom falhou');
      } else {
        logger.info('\n✅ Notificação de criação de cupom OK');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar criação de cupom: ${error.message}`);
      logger.error(error.stack);
      this.results.errors.push(`Coupon Create: ${error.message}`);
    }
  }

  /**
   * 4. Testar aprovação de cupom
   */
  async auditCouponApprove() {
    logger.info('\n========== 4. AUDITORIA: APROVAÇÃO DE CUPOM ==========');
    
    try {
      logger.info('📝 Simulando aprovação de cupom...');
      
      const testCoupon = {
        code: `TESTE_APPROVE_${Date.now()}`,
        platform: 'mercadolivre',
        discount_type: 'fixed',
        discount_value: 20,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_pending_approval: true, // Pendente
        is_general: true
      };
      
      // Criar cupom pendente
      const coupon = await Coupon.create(testCoupon);
      logger.info(`✅ Cupom pendente criado: ID ${coupon.id}`);
      
      // Aprovar cupom
      logger.info('\n✅ Aprovando cupom...');
      const approved = await Coupon.approve(coupon.id, {});
      
      // Buscar cupom completo
      const fullCoupon = await Coupon.findById(approved.id);
      
      // Tentar enviar notificação
      logger.info('\n📢 Tentando enviar notificação de aprovação...');
      const notifResult = await couponNotificationService.notifyNewCoupon(fullCoupon, { manual: true });
      
      logger.info('\n📊 Resultado da notificação:');
      logger.info(`   Success: ${notifResult.success}`);
      logger.info(`   WhatsApp: ${JSON.stringify(notifResult.whatsapp)}`);
      logger.info(`   Telegram: ${JSON.stringify(notifResult.telegram)}`);
      
      this.results.coupon_approve = {
        coupon_id: coupon.id,
        notification_sent: notifResult.success,
        whatsapp: notifResult.whatsapp,
        telegram: notifResult.telegram
      };
      
      // Limpar cupom de teste
      await Coupon.delete(coupon.id);
      logger.info(`\n🗑️ Cupom de teste removido`);
      
      if (!notifResult.success) {
        logger.error('\n❌ FALHA ao enviar notificação de aprovação de cupom');
        this.results.errors.push('Notificação de aprovação de cupom falhou');
      } else {
        logger.info('\n✅ Notificação de aprovação de cupom OK');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar aprovação de cupom: ${error.message}`);
      logger.error(error.stack);
      this.results.errors.push(`Coupon Approve: ${error.message}`);
    }
  }

  /**
   * 5. Testar cupom esgotado
   */
  async auditCouponOutOfStock() {
    logger.info('\n========== 5. AUDITORIA: CUPOM ESGOTADO ==========');
    
    try {
      logger.info('📝 Simulando cupom esgotado...');
      
      const testCoupon = {
        code: `TESTE_STOCK_${Date.now()}`,
        platform: 'amazon',
        discount_type: 'percentage',
        discount_value: 25,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_pending_approval: false,
        is_general: true,
        is_out_of_stock: false
      };
      
      // Criar cupom
      const coupon = await Coupon.create(testCoupon);
      logger.info(`✅ Cupom criado: ID ${coupon.id}`);
      
      // Marcar como esgotado
      logger.info('\n🚫 Marcando como esgotado...');
      const outOfStock = await Coupon.markAsOutOfStock(coupon.id);
      
      logger.info(`✅ Cupom marcado como esgotado`);
      logger.info(`   is_out_of_stock: ${outOfStock.is_out_of_stock}`);
      
      // Tentar enviar notificação
      logger.info('\n📢 Tentando enviar notificação de esgotado...');
      const notifResult = await couponNotificationService.notifyOutOfStockCoupon(outOfStock);
      
      logger.info('\n📊 Resultado da notificação:');
      logger.info(`   Success: ${notifResult.success}`);
      logger.info(`   WhatsApp: ${JSON.stringify(notifResult.whatsapp)}`);
      logger.info(`   Telegram: ${JSON.stringify(notifResult.telegram)}`);
      
      this.results.coupon_out_of_stock = {
        coupon_id: coupon.id,
        notification_sent: notifResult.success,
        whatsapp: notifResult.whatsapp,
        telegram: notifResult.telegram
      };
      
      // Limpar cupom de teste
      await Coupon.delete(coupon.id);
      logger.info(`\n🗑️ Cupom de teste removido`);
      
      if (!notifResult.success) {
        logger.error('\n❌ FALHA ao enviar notificação de cupom esgotado');
        this.results.errors.push('Notificação de cupom esgotado falhou');
      } else {
        logger.info('\n✅ Notificação de cupom esgotado OK');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar cupom esgotado: ${error.message}`);
      logger.error(error.stack);
      this.results.errors.push(`Coupon Out of Stock: ${error.message}`);
    }
  }

  /**
   * 6. Testar criação de produto
   */
  async auditProductCreate() {
    logger.info('\n========== 6. AUDITORIA: CRIAÇÃO DE PRODUTO ==========');
    
    try {
      logger.info('📝 Simulando criação de produto...');
      
      // Buscar uma categoria real do banco
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .single();
      
      const categoryId = categories?.id || null;
      
      const testProduct = {
        name: `Produto Teste Auditoria ${Date.now()}`,
        description: 'Produto de teste para auditoria de notificações',
        current_price: 99.90,
        old_price: 149.90,
        discount_percentage: 33,
        affiliate_link: 'https://example.com/produto-teste',
        image_url: 'https://via.placeholder.com/300',
        platform: 'shopee',
        status: 'approved',
        category_id: categoryId, // Usar categoria real ou null
        external_id: `test_audit_${Date.now()}` // ID externo obrigatório
      };
      
      logger.info(`   Nome: ${testProduct.name}`);
      logger.info(`   Preço: R$ ${testProduct.current_price}`);
      logger.info(`   Desconto: ${testProduct.discount_percentage}%`);
      logger.info(`   Categoria: ${categoryId || 'SEM CATEGORIA'}`);
      
      // Criar produto
      const product = await Product.create(testProduct);
      logger.info(`✅ Produto criado: ID ${product.id}`);
      
      // Buscar produto completo
      const fullProduct = await Product.findById(product.id);
      
      // Tentar enviar notificação via publishService
      logger.info('\n📢 Tentando enviar notificação push...');
      const notifResult = await publishService.notifyPush(fullProduct);
      
      logger.info('\n📊 Resultado da notificação:');
      logger.info(`   Success: ${notifResult}`);
      
      this.results.product_create = {
        product_id: product.id,
        notification_sent: notifResult
      };
      
      // Limpar produto de teste
      await Product.delete(product.id);
      logger.info(`\n🗑️ Produto de teste removido`);
      
      if (!notifResult) {
        logger.error('\n❌ FALHA ao enviar notificação de criação de produto');
        this.results.errors.push('Notificação de criação de produto falhou');
      } else {
        logger.info('\n✅ Notificação de criação de produto OK');
      }
      
    } catch (error) {
      logger.error(`❌ Erro ao auditar criação de produto: ${error.message}`);
      logger.error(error.stack);
      this.results.errors.push(`Product Create: ${error.message}`);
    }
  }

  /**
   * 7. Gerar relatório final
   */
  generateReport() {
    logger.info('\n\n========================================');
    logger.info('📊 RELATÓRIO FINAL DA AUDITORIA');
    logger.info('========================================\n');
    
    // FCM Config
    logger.info('1️⃣ CONFIGURAÇÃO FCM:');
    if (this.results.fcm_config) {
      logger.info(`   Status: ${this.results.fcm_config.enabled ? '✅ ATIVO' : '❌ INATIVO'}`);
      logger.info(`   Service Account: ${this.results.fcm_config.has_service_account ? '✅' : '❌'}`);
      logger.info(`   Project ID: ${this.results.fcm_config.has_project_id ? '✅' : '❌'}`);
      logger.info(`   Backend URL: ${this.results.fcm_config.backend_url || '❌ NÃO DEFINIDO'}`);
    } else {
      logger.error('   ❌ Não foi possível verificar');
    }
    
    // User Tokens
    logger.info('\n2️⃣ TOKENS FCM DOS USUÁRIOS:');
    if (this.results.user_tokens) {
      logger.info(`   Total de usuários: ${this.results.user_tokens.total}`);
      logger.info(`   Com token: ${this.results.user_tokens.with_token} ✅`);
      logger.info(`   Sem token: ${this.results.user_tokens.without_token} ⚠️`);
    } else {
      logger.error('   ❌ Não foi possível verificar');
    }
    
    // Coupon Create
    logger.info('\n3️⃣ CRIAÇÃO DE CUPOM:');
    if (this.results.coupon_create) {
      logger.info(`   Notificação enviada: ${this.results.coupon_create.notification_sent ? '✅' : '❌'}`);
      logger.info(`   WhatsApp: ${this.results.coupon_create.whatsapp?.success ? '✅' : '❌'}`);
      logger.info(`   Telegram: ${this.results.coupon_create.telegram?.success ? '✅' : '❌'}`);
    } else {
      logger.error('   ❌ Não foi possível testar');
    }
    
    // Coupon Approve
    logger.info('\n4️⃣ APROVAÇÃO DE CUPOM:');
    if (this.results.coupon_approve) {
      logger.info(`   Notificação enviada: ${this.results.coupon_approve.notification_sent ? '✅' : '❌'}`);
      logger.info(`   WhatsApp: ${this.results.coupon_approve.whatsapp?.success ? '✅' : '❌'}`);
      logger.info(`   Telegram: ${this.results.coupon_approve.telegram?.success ? '✅' : '❌'}`);
    } else {
      logger.error('   ❌ Não foi possível testar');
    }
    
    // Coupon Out of Stock
    logger.info('\n5️⃣ CUPOM ESGOTADO:');
    if (this.results.coupon_out_of_stock) {
      logger.info(`   Notificação enviada: ${this.results.coupon_out_of_stock.notification_sent ? '✅' : '❌'}`);
      logger.info(`   WhatsApp: ${this.results.coupon_out_of_stock.whatsapp?.success ? '✅' : '❌'}`);
      logger.info(`   Telegram: ${this.results.coupon_out_of_stock.telegram?.success ? '✅' : '❌'}`);
    } else {
      logger.error('   ❌ Não foi possível testar');
    }
    
    // Product Create
    logger.info('\n6️⃣ CRIAÇÃO DE PRODUTO:');
    if (this.results.product_create) {
      logger.info(`   Notificação enviada: ${this.results.product_create.notification_sent ? '✅' : '❌'}`);
    } else {
      logger.error('   ❌ Não foi possível testar');
    }
    
    // Errors
    logger.info('\n❌ ERROS ENCONTRADOS:');
    if (this.results.errors.length === 0) {
      logger.info('   ✅ Nenhum erro encontrado!');
    } else {
      this.results.errors.forEach((error, index) => {
        logger.error(`   ${index + 1}. ${error}`);
      });
    }
    
    // Conclusão
    logger.info('\n========================================');
    if (this.results.errors.length === 0) {
      logger.info('✅ AUDITORIA CONCLUÍDA COM SUCESSO!');
      logger.info('   Todas as notificações estão funcionando corretamente.');
    } else {
      logger.error('❌ AUDITORIA ENCONTROU PROBLEMAS!');
      logger.error(`   ${this.results.errors.length} erro(s) detectado(s).`);
      logger.error('   Verifique os logs acima para mais detalhes.');
    }
    logger.info('========================================\n');
  }

  /**
   * Executar auditoria completa
   */
  async run() {
    logger.info('🔍 INICIANDO AUDITORIA COMPLETA DE NOTIFICAÇÕES PUSH\n');
    
    await this.auditFCMConfig();
    await this.auditUserTokens();
    await this.auditCouponCreate();
    await this.auditCouponApprove();
    await this.auditCouponOutOfStock();
    await this.auditProductCreate();
    
    this.generateReport();
  }
}

// Executar auditoria
const auditor = new NotificationAuditor();
auditor.run()
  .then(() => {
    logger.info('✅ Auditoria finalizada');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`❌ Erro fatal na auditoria: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  });

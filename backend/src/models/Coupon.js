import supabase from '../config/database.js';
import { isCouponValid } from '../utils/helpers.js';
import logger from '../config/logger.js';

class Coupon {
  // Plataformas válidas no banco de dados
  static VALID_PLATFORMS = ['shopee', 'mercadolivre', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'pichau', 'general'];

  // Normalizar plataforma para valor válido
  static normalizePlatform(platform) {
    if (!platform) return 'general';
    const normalized = platform.toLowerCase().trim();

    // Mapeamento de plataformas conhecidas para valores válidos
    const platformMap = {
      'shopee': 'shopee',
      'mercadolivre': 'mercadolivre',
      'mercado livre': 'mercadolivre',
      'meli': 'mercadolivre',
      'amazon': 'amazon',
      'aliexpress': 'aliexpress',
      'ali express': 'aliexpress',
      'kabum': 'kabum',
      'magazineluiza': 'magazineluiza',
      'magazine luiza': 'magazineluiza',
      'magalu': 'magazineluiza',
      'pichau': 'pichau',
      'general': 'general'
    };

    // Verificar mapeamento direto
    if (platformMap[normalized]) {
      return platformMap[normalized];
    }

    // Verificar se está na lista de válidas
    if (Coupon.VALID_PLATFORMS.includes(normalized)) {
      return normalized;
    }

    // Se não for válida, usar 'general'
    return 'general';
  }

  // Criar novo cupom
  static async create(couponData) {
    const {
      code,
      platform,
      discount_type,
      discount_value,
      min_purchase = 0,
      max_discount_value = null,
      valid_from,
      valid_until,
      is_general = null,
      applicable_products = [],
      restrictions = '',
      description = null,
      title = null,
      max_uses = null,
      current_uses = 0,
      is_vip = false,
      is_exclusive = false,
      is_pending_approval = false,
      is_out_of_stock = false,
      capture_source = null,
      source_url = null,
      origem = null,
      channel_origin = null,
      message_id = null,
      message_hash = null,
      confidence_score = null,
      ai_decision_reason = null,
      ai_edit_history = null,
      image_url = null
    } = couponData;

    // Normalizar plataforma para valor válido
    const normalizedPlatform = Coupon.normalizePlatform(platform);

    // Preparar dados para inserção
    const insertData = {
      code,
      platform: normalizedPlatform,
      discount_type,
      discount_value,
      min_purchase: min_purchase || 0,
      max_discount_value: max_discount_value || null,
      valid_from: valid_from || new Date().toISOString(),
      valid_until,
      is_general,
      applicable_products: applicable_products || [],
      restrictions: restrictions || '',
      max_uses,
      current_uses: current_uses || 0,
      is_vip: false, // DEPRECATED: VIP feature removed, always false
      is_exclusive: is_exclusive || false,
      is_pending_approval: is_pending_approval !== undefined ? is_pending_approval : false,
      is_out_of_stock: is_out_of_stock !== undefined ? is_out_of_stock : false,
      capture_source: capture_source || null,
      source_url: source_url || null,
      origem: origem || null,
      channel_origin: channel_origin || null,
      message_id: message_id || null,
      message_hash: message_hash || null,
      ai_decision_reason: ai_decision_reason || null,
      ai_edit_history: ai_edit_history || null,
      image_url: image_url || null
    };

    // Adicionar campos opcionais se fornecidos
    if (description) insertData.description = description;
    if (title) insertData.title = title;

    const { data, error } = await supabase
      .from('coupons')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar cupom por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // DEBUG: Log para verificar o valor de is_general
    if (data) {
      logger.debug(`🔍 Cupom ${data.code} - is_general: ${data.is_general} (tipo: ${typeof data.is_general})`);
    }
    
    return data;
  }

  // Buscar cupom por código
  static async findByCode(code) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Buscar todos os cupons com o mesmo código (para verificar duplicatas em múltiplos canais)
  static async findAllByCode(code, options = {}) {
    const { excludeId = null, onlyPending = false, onlyFromTelegram = false } = options;

    let query = supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    if (onlyPending) {
      query = query.eq('is_pending_approval', true);
    }

    if (onlyFromTelegram) {
      query = query.eq('capture_source', 'telegram');
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Buscar cupons recentes com o mesmo código (últimas 48 horas)
   * @param {string} code - Código do cupom
   * @param {object} options - Opções de busca
   * @returns {Promise<Array>}
   */
  static async findRecentByCode(code, options = {}) {
    const {
      excludeId = null,
      onlyPublished = false,
      hoursWindow = 48
    } = options;

    try {
      // Calcular timestamp de 48 horas atrás
      const windowDate = new Date();
      windowDate.setHours(windowDate.getHours() - hoursWindow);
      const windowTimestamp = windowDate.toISOString();

      let query = supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .gte('created_at', windowTimestamp) // Apenas cupons das últimas X horas
        .order('created_at', { ascending: false });

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      if (onlyPublished) {
        query = query.eq('is_pending_approval', false).eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Erro ao buscar cupons recentes: ${error.message}`);
      return [];
    }
  }

  /**
   * Verificar se existe cupom publicado com o mesmo código (últimas 48 horas)
   * Usado para evitar duplicação de notificações
   * ATUALIZADO: Verifica apenas cupons recentes para permitir republicação
   * @param {string} code - Código do cupom
   * @param {string} excludeId - ID do cupom a excluir da busca (opcional)
   * @param {number} hoursWindow - Janela de tempo em horas (padrão: 48h)
   * @returns {Promise<boolean>}
   */
  static async hasPublishedCouponWithCode(code, excludeId = null, hoursWindow = 48) {
    try {
      // Calcular timestamp de X horas atrás
      const windowDate = new Date();
      windowDate.setHours(windowDate.getHours() - hoursWindow);
      const windowTimestamp = windowDate.toISOString();

      let query = supabase
        .from('coupons')
        .select('id, code, is_active, is_pending_approval, created_at')
        .eq('code', code.toUpperCase())
        .eq('is_pending_approval', false) // Apenas cupons já aprovados
        .eq('is_active', true) // Apenas cupons ativos
        .gte('created_at', windowTimestamp); // Apenas cupons recentes (últimas X horas)

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.limit(1);

      if (error) throw error;

      const hasPublished = data && data.length > 0;

      if (hasPublished) {
        logger.debug(`Cupom ${code} já foi publicado nas últimas ${hoursWindow}h (criado em: ${data[0].created_at})`);
      }

      return hasPublished;
    } catch (error) {
      logger.error(`Erro ao verificar cupom publicado: ${error.message}`);
      return false; // Em caso de erro, não bloquear (fail-safe)
    }
  }

  // Buscar cupom por message_hash (anti-duplicação)
  static async findByMessageHash(messageHash) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('message_hash', messageHash)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Registrar visualização de cupom
  static async registerView(couponId, userId) {
    const { error } = await supabase
      .from('user_coupon_views')
      .upsert({ user_id: userId, coupon_id: couponId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id, coupon_id' });

    if (error) throw error;
    return true;
  }

  // Buscar tokens de push de usuários que visualizaram
  static async getUsersWhoViewed(couponId) {
    const { data: views, error: viewError } = await supabase
      .from('user_coupon_views')
      .select('user_id')
      .eq('coupon_id', couponId);

    if (viewError) throw viewError;
    if (!views || views.length === 0) return [];

    const userIds = views.map(v => v.user_id);

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    if (userError) throw userError;
    return users || [];
  }

  // Listar cupons ativos
  static async findActive(filters = {}) {
    const {
      page = 1,
      limit = 20,
      platform,
      is_vip,
      search,
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_pending_approval', false) // Excluir cupons pendentes de aprovação
      // Cupons esgotados agora OBRIGATORIAMENTE retornam e App gerencia a separação
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`); // Permitir NULL ou data futura

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    // DEPRECATED: is_vip filter removed - all coupons available to everyone
    // if (is_vip !== undefined) query = query.eq('is_vip', is_vip);
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Ordenação
    query = query.order(sort, { ascending: order === 'asc' });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      coupons: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Listar todos os cupons (admin)
  static async findAll(filters = {}) {
    const {
      page = 1,
      limit = 20,
      platform,
      is_active,
      is_vip,
      auto_captured,
      verification_status,
      is_pending_approval,
      search,
      origem,
      channel_origin,
      capture_source,
      min_discount,
      max_discount,
      discount_type,
      valid_from,
      valid_until,
      is_general,
      sort = 'created_at',
      order = 'desc',
      excludePending = false // Novo parâmetro para excluir pendentes
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' });

    // Se excludePending for true, excluir cupons pendentes automaticamente
    // Isso garante que na aba "Todos os Cupons" só apareçam cupons aprovados
    if (excludePending && (is_pending_approval === undefined || is_pending_approval === null || is_pending_approval === '')) {
      query = query.eq('is_pending_approval', false);
    }

    // Aplicar filtros básicos
    // Normalizar valores booleanos: strings vazias ou "false" devem ser tratados corretamente
    const normalizeBoolean = (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        return undefined;
      }
      return value;
    };

    if (platform && platform !== '') query = query.eq('platform', platform);

    // Aplicar filtro de is_active
    // Se excludePending for true e is_active não for fornecido, aplicar is_active: true por padrão
    if (excludePending && is_active === undefined) {
      query = query.eq('is_active', true);
    } else if (is_active !== undefined) {
      const normalizedIsActive = normalizeBoolean(is_active);
      if (normalizedIsActive !== undefined) query = query.eq('is_active', normalizedIsActive);
    }

    const normalizedIsVip = normalizeBoolean(is_vip);
    if (normalizedIsVip !== undefined) query = query.eq('is_vip', normalizedIsVip);

    const normalizedAutoCaptured = normalizeBoolean(auto_captured);
    if (normalizedAutoCaptured !== undefined) query = query.eq('auto_captured', normalizedAutoCaptured);

    if (verification_status && verification_status !== '') query = query.eq('verification_status', verification_status);

    // Sempre aplicar filtro de is_pending_approval se fornecido
    // Se excludePending for true, não aplicar este filtro (já foi aplicado acima como false)
    // Se for true (boolean), aplicar diretamente
    // Se for string, normalizar primeiro
    if (!excludePending && is_pending_approval !== undefined && is_pending_approval !== null && is_pending_approval !== '') {
      const normalizedIsPendingApproval = normalizeBoolean(is_pending_approval);
      if (normalizedIsPendingApproval !== undefined) {
        query = query.eq('is_pending_approval', normalizedIsPendingApproval);
      }
    }

    if (discount_type && discount_type !== '') query = query.eq('discount_type', discount_type);

    const normalizedIsGeneral = normalizeBoolean(is_general);
    if (normalizedIsGeneral !== undefined) query = query.eq('is_general', normalizedIsGeneral);
    if (origem) query = query.eq('origem', origem);
    if (channel_origin) query = query.eq('channel_origin', channel_origin);
    if (capture_source) query = query.eq('capture_source', capture_source);

    // Filtros de busca
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%,title.ilike.%${search}%`);
    }

    // Filtros de desconto
    if (min_discount !== undefined) {
      query = query.gte('discount_value', min_discount);
    }
    if (max_discount !== undefined) {
      query = query.lte('discount_value', max_discount);
    }

    // Filtros de data
    if (valid_from) {
      query = query.gte('valid_from', valid_from);
    }
    if (valid_until) {
      query = query.lte('valid_until', valid_until);
    }

    // Ordenação
    query = query.order(sort, { ascending: order === 'asc' });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      coupons: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Atualizar cupom
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar cupom
  static async delete(id) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Deletar múltiplos cupons
  static async deleteMany(ids) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  }

  // Desativar cupom
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Ativar cupom
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Marcar cupom como esgotado
  static async markAsOutOfStock(id) {
    const updated = await this.update(id, { is_out_of_stock: true });
    
    // Enviar notificações de cupom esgotado
    try {
      const couponNotificationService = (await import('../services/coupons/couponNotificationService.js')).default;
      const logger = (await import('../config/logger.js')).default;
      
      logger.info(`🎟️ Cupom ${id} marcado como esgotado, enviando notificações...`);
      
      // Buscar dados completos do cupom para notificação
      const fullCoupon = await this.findById(id);
      if (fullCoupon) {
        await couponNotificationService.notifyOutOfStockCoupon(fullCoupon);
        logger.info(`✅ Notificações de cupom esgotado enviadas para: ${fullCoupon.code}`);
      }
    } catch (notifError) {
      const logger = (await import('../config/logger.js')).default;
      logger.error(`❌ Erro ao enviar notificações de cupom esgotado: ${notifError.message}`);
      // Não falhar a operação se notificação falhar
    }
    
    return updated;
  }

  // Marcar cupom como disponível novamente
  static async markAsAvailable(id) {
    return await this.update(id, { is_out_of_stock: false });
  }

  // Registrar uso do cupom
  static async incrementUse(id) {
    const coupon = await this.findById(id);

    return await this.update(id, {
      current_uses: coupon.current_uses + 1
    });
  }

  // Buscar cupons pendentes de aprovação
  static async findPendingApproval(filters = {}) {
    // Garantir que is_pending_approval seja sempre true, mesmo se vier nos filtros
    const { is_pending_approval, ...otherFilters } = filters;
    return await this.findAll({
      ...otherFilters,
      is_pending_approval: true // Sempre forçar true para pendentes
    });
  }

  // Aprovar cupom (remover pendência e ativar)
  static async approve(id, updates = {}) {
    return await this.update(id, {
      ...updates,
      is_pending_approval: false,
      is_active: true,
      verification_status: 'active'
    });
  }

  // Rejeitar cupom
  static async reject(id, reason = '') {
    return await this.update(id, {
      is_pending_approval: false,
      is_active: false,
      verification_status: 'invalid',
      restrictions: reason ? `Rejeitado: ${reason}` : 'Rejeitado pelo administrador'
    });
  }

  // Verificar se cupom é válido
  static async isValid(id) {
    const coupon = await this.findById(id);
    return isCouponValid(coupon);
  }

  // Buscar cupons expirando em breve
  static async findExpiringSoon(days = 3) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', now.toISOString())
      .lte('valid_until', futureDate.toISOString())
      .order('valid_until', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Buscar cupons expirados
  static async findExpired() {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lt('valid_until', now);

    if (error) throw error;
    return data;
  }

  // Desativar cupons expirados
  static async deactivateExpired() {
    const expiredCoupons = await this.findExpired();

    const promises = expiredCoupons.map(coupon =>
      this.deactivate(coupon.id)
    );

    await Promise.all(promises);
    return expiredCoupons.length;
  }

  // Buscar cupons por plataforma
  static async findByPlatform(platform, page = 1, limit = 20) {
    return await this.findActive({ platform, page, limit });
  }

  // DEPRECATED: VIP feature removed - returns all active coupons
  static async findVIP(page = 1, limit = 20) {
    // Returns all coupons (VIP distinction removed)
    return await this.findActive({ page, limit });
  }

  // Buscar cupons aplicáveis a um produto
  static async findForProduct(productId) {
    const now = new Date().toISOString();

    // Primeiro, buscar o produto para obter sua plataforma
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('platform')
      .eq('id', productId)
      .single();

    if (productError) {
      logger.error('Erro ao buscar produto para filtrar cupons:', productError);
      throw productError;
    }

    if (!product) {
      return [];
    }

    const productPlatform = product.platform;

    // Buscar cupons que:
    // 1. Sejam gerais E da mesma plataforma do produto (ou plataforma 'general')
    // 2. OU tenham o produto na lista de applicable_products
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now);

    if (error) throw error;

    // Filtrar manualmente para garantir a lógica correta
    const filteredCoupons = (data || []).filter(coupon => {
      // Cupom diretamente vinculado ao produto via applicable_products
      if (coupon.applicable_products && coupon.applicable_products.includes(productId)) {
        return true;
      }

      // Cupom geral: deve ser da mesma plataforma ou plataforma 'general'
      if (coupon.is_general === true) {
        return coupon.platform === 'general' || coupon.platform === productPlatform;
      }

      return false;
    });

    return filteredCoupons;
  }

  // Buscar todos os cupons ativamente aplicáveis (em estoque, aprovados, não expirados)
  static async findActiveApplicable() {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .eq('is_pending_approval', false)
      .eq('is_out_of_stock', false)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`);

    if (error) throw error;
    return data || [];
  }

  // Contar cupons ativos
  static async countActive() {
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now);

    if (error) throw error;
    return count;
  }

  // Buscar cupons mais usados
  static async findMostUsed(limit = 10) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('current_uses', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Limpeza automática de cupons antigos
   * - Pendentes > 24h
   * - Aprovados/Ativos > 7 dias (SOMENTE se expirados ou sem validade)
   */
  static async cleanupOldItems() {
    try {
      logger.info('🔄 Iniciando limpeza automática de cupons...');

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Excluir cupons pendentes OU rejeitados com mais de 24h
      // CORREÇÃO: Incluir cupons rejeitados (is_pending_approval=false AND is_active=false)
      // Query: (is_pending_approval=true) OR (is_pending_approval=false AND is_active=false)
      logger.debug(`🔍 Buscando cupons para exclusão (>24h):`);
      logger.debug(`   - Pendentes de aprovação (is_pending_approval=true)`);
      logger.debug(`   - Rejeitados (is_pending_approval=false AND is_active=false)`);

      const { data: deletedPending, count: pendingCount, error: pendingError } = await supabase
        .from('coupons')
        .delete({ count: 'exact' })
        .or('is_pending_approval.eq.true,and(is_pending_approval.eq.false,is_active.eq.false)')
        .lt('created_at', twentyFourHoursAgo)
        .select('id, code, created_at, is_pending_approval, is_active');

      if (pendingError) throw pendingError;

      if (pendingCount > 0) {
        logger.info(`✅ Removidos ${pendingCount} cupons pendentes/rejeitados antigos (>24h):`);
        deletedPending.forEach(c => {
          const status = c.is_pending_approval ? 'PENDENTE' : 'REJEITADO';
          const createdDate = new Date(c.created_at).toLocaleString('pt-BR');
          logger.info(`   - ${c.code} (${status}) - Criado em: ${createdDate}`);
        });
      } else {
        logger.debug('ℹ️ Nenhum cupom pendente/rejeitado antigo para remover');
      }

      // 2. Excluir processados (não pendentes) com mais de 24 horas (era 7 dias)
      // IMPORTANTE: Respeitar valid_until - só deletar se expirado E antigo
      // Deletar SE: (1) Cupom antigo (>24h) E (2) (Sem validade OU já expirou)
      const { data: deletedProcessed, count: processedCount, error: processedError } = await supabase
        .from('coupons')
        .delete({ count: 'exact' })
        .eq('is_pending_approval', false)
        .lt('updated_at', twentyFourHoursAgo) // ALTERADO: 7 dias -> 24 horas
        .or(`valid_until.is.null,valid_until.lt.${now.toISOString()}`)
        .select('id, code, valid_until, updated_at');

      if (processedError) throw processedError;

      if (processedCount > 0) {
        const codes = deletedProcessed.map(c => c.code).join(', ');
        logger.info(`✅ Removidos ${processedCount} cupons antigos (>7 dias e expirados): ${codes}`);
      } else {
        logger.debug('ℹ️ Nenhum cupom processado antigo para remover');
      }

      logger.info(`📊 Total de cupons removidos: ${(pendingCount || 0) + (processedCount || 0)}`);

      return { pendingCount: pendingCount || 0, processedCount: processedCount || 0 };
    } catch (error) {
      logger.error(`❌ Erro na limpeza automática de cupons: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar cupom como esgotado
   * @param {string} couponId - ID do cupom
   * @returns {Promise<Object>} Cupom atualizado
   */
  static async markAsOutOfStock(couponId) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update({
          is_out_of_stock: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`🚫 Cupom marcado como esgotado: ${data.code} (${couponId})`);
      return data;
    } catch (error) {
      logger.error(`❌ Erro ao marcar cupom como esgotado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restaurar estoque do cupom
   * @param {string} couponId - ID do cupom
   * @returns {Promise<Object>} Cupom atualizado
   */
  static async restoreStock(couponId) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update({
          is_out_of_stock: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`✅ Estoque do cupom restaurado: ${data.code} (${couponId})`);
      return data;
    } catch (error) {
      logger.error(`❌ Erro ao restaurar estoque do cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar canais que receberam um cupom específico
   * @param {string} couponId - ID do cupom
   * @returns {Promise<Array>} Lista de canais
   */
  static async getChannelsWithCoupon(couponId) {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('channel_id, platform, channel_name')
        .eq('coupon_id', couponId)
        .eq('status', 'sent')
        .not('channel_id', 'is', null);

      if (error) throw error;

      // Remover duplicatas (mesmo canal pode ter recebido múltiplas vezes)
      const uniqueChannels = [];
      const channelIds = new Set();

      for (const log of data || []) {
        if (!channelIds.has(log.channel_id)) {
          channelIds.add(log.channel_id);
          uniqueChannels.push({
            channel_id: log.channel_id,
            platform: log.platform,
            channel_name: log.channel_name
          });
        }
      }

      logger.info(`📋 Encontrados ${uniqueChannels.length} canais que receberam o cupom ${couponId}`);
      return uniqueChannels;
    } catch (error) {
      logger.error(`❌ Erro ao buscar canais do cupom: ${error.message}`);
      return [];
    }
  }

  /**
   * Listar cupons esgotados
   * @param {Object} filters - Filtros de busca
   * @returns {Promise<Object>} Lista de cupons esgotados
   */
  static async findOutOfStock(filters = {}) {
    const {
      page = 1,
      limit = 20,
      platform,
      search
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('is_out_of_stock', true)
      .order('updated_at', { ascending: false });

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      coupons: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
}

export default Coupon;

import supabase from '../config/database.js';
import { isCouponValid } from '../utils/helpers.js';
import logger from '../config/logger.js';

class Coupon {
  // Plataformas válidas no banco de dados
  static VALID_PLATFORMS = ['shopee', 'mercadolivre', 'amazon', 'aliexpress', 'general'];

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
      ai_edit_history = null
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
      is_vip,
      is_exclusive: is_exclusive || false,
      is_pending_approval: is_pending_approval !== undefined ? is_pending_approval : false,
      is_out_of_stock: is_out_of_stock !== undefined ? is_out_of_stock : false,
      capture_source: capture_source || null,
      source_url: source_url || null,
      origem: origem || null,
      channel_origin: channel_origin || null,
      message_id: message_id || null,
      message_hash: message_hash || null,
      confidence_score: confidence_score !== null && confidence_score !== undefined ? confidence_score : null,
      ai_decision_reason: ai_decision_reason || null,
      ai_edit_history: ai_edit_history || null
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
      .eq('is_out_of_stock', false) // Excluir cupons esgotados
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`); // Permitir NULL ou data futura

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (is_vip !== undefined) query = query.eq('is_vip', is_vip);
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
    return await this.update(id, { is_out_of_stock: true });
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

  // Buscar cupons VIP
  static async findVIP(page = 1, limit = 20) {
    return await this.findActive({ is_vip: true, page, limit });
  }

  // Buscar cupons aplicáveis a um produto
  static async findForProduct(productId) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .or(`is_general.eq.true,applicable_products.cs.["${productId}"]`);

    if (error) throw error;
    return data;
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
   * - Aprovados/Ativos > 7 dias
   */
  static async cleanupOldItems() {
    try {
      logger.info('🔄 Iniciando limpeza automática de cupons...');

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Excluir pendentes com mais de 24h
      const { count: pendingCount, error: pendingError } = await supabase
        .from('coupons')
        .delete({ count: 'exact' })
        .eq('is_pending_approval', true)
        .lt('created_at', twentyFourHoursAgo);

      if (pendingError) throw pendingError;
      if (pendingCount > 0) {
        logger.info(`✅ Removidos ${pendingCount} cupons pendentes antigos (>24h)`);
      }

      // 2. Excluir processados (não pendentes) com mais de 7 dias
      const { count: processedCount, error: processedError } = await supabase
        .from('coupons')
        .delete({ count: 'exact' })
        .eq('is_pending_approval', false)
        .lt('updated_at', sevenDaysAgo);

      if (processedError) throw processedError;
      if (processedCount > 0) {
        logger.info(`✅ Removidos ${processedCount} cupons antigos (>7 dias)`);
      }

      return { pendingCount, processedCount };
    } catch (error) {
      logger.error(`❌ Erro na limpeza automática de cupons: ${error.message}`);
      throw error;
    }
  }
}

export default Coupon;

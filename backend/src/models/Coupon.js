import supabase from '../config/database.js';
import { isCouponValid } from '../utils/helpers.js';

class Coupon {
  // Criar novo cupom
  static async create(couponData) {
    const {
      code,
      platform,
      discount_type,
      discount_value,
      min_purchase = 0,
      valid_from,
      valid_until,
      is_general = true,
      applicable_products = [],
      restrictions = '',
      max_uses = null,
      is_vip = false
    } = couponData;

    const { data, error } = await supabase
      .from('coupons')
      .insert([{
        code,
        platform,
        discount_type,
        discount_value,
        min_purchase,
        valid_from,
        valid_until,
        is_general,
        applicable_products,
        restrictions,
        max_uses,
        is_vip
      }])
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

  // Listar cupons ativos
  static async findActive(filters = {}) {
    const {
      page = 1,
      limit = 20,
      platform,
      is_vip,
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;
    const now = new Date().toISOString();

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now);

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (is_vip !== undefined) query = query.eq('is_vip', is_vip);

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
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (is_active !== undefined) query = query.eq('is_active', is_active);
    if (is_vip !== undefined) query = query.eq('is_vip', is_vip);

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

  // Desativar cupom
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Ativar cupom
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Registrar uso do cupom
  static async incrementUse(id) {
    const coupon = await this.findById(id);
    
    return await this.update(id, {
      current_uses: coupon.current_uses + 1
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
}

export default Coupon;

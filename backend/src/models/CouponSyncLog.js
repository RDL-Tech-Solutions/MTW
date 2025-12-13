import supabase from '../config/database.js';

class CouponSyncLog {
  /**
   * Criar log de sincronização
   */
  static async create(logData) {
    const {
      platform,
      sync_type,
      coupons_found = 0,
      coupons_created = 0,
      coupons_updated = 0,
      coupons_expired = 0,
      errors = 0,
      error_details = null,
      duration_ms = null,
      started_at,
      completed_at = null,
      status = 'running'
    } = logData;

    const { data, error } = await supabase
      .from('coupon_sync_logs')
      .insert([{
        platform,
        sync_type,
        coupons_found,
        coupons_created,
        coupons_updated,
        coupons_expired,
        errors,
        error_details,
        duration_ms,
        started_at,
        completed_at,
        status
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualizar log
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('coupon_sync_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Finalizar log com sucesso
   */
  static async complete(id, results) {
    const completed_at = new Date().toISOString();
    const duration_ms = results.duration_ms || 0;

    return await this.update(id, {
      ...results,
      completed_at,
      duration_ms,
      status: 'completed'
    });
  }

  /**
   * Marcar log como falho
   */
  static async fail(id, errorDetails) {
    const completed_at = new Date().toISOString();

    return await this.update(id, {
      error_details: errorDetails,
      completed_at,
      status: 'failed'
    });
  }

  /**
   * Buscar logs por plataforma
   */
  static async findByPlatform(platform, limit = 50) {
    const { data, error } = await supabase
      .from('coupon_sync_logs')
      .select('*')
      .eq('platform', platform)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Buscar logs recentes
   */
  /**
   * Buscar logs recentes com paginação
   */
  static async findRecent(limit = 50, filters = {}, page = 1) {
    const { platform, sync_type, status } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('coupon_sync_logs')
      .select('*', { count: 'exact' });

    if (platform) query = query.eq('platform', platform);
    if (sync_type) query = query.eq('sync_type', sync_type);
    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      logs: data,
      total: count,
      totalPages: Math.ceil(count / limit),
      page,
      limit
    };
  }

  /**
   * Obter estatísticas de sincronização
   */
  static async getStats(platform = null, days = 7) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    let query = supabase
      .from('coupon_sync_logs')
      .select('*')
      .gte('created_at', dateFrom.toISOString());

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;

    if (error) throw error;

    // Calcular estatísticas
    const stats = {
      total_syncs: data.length,
      successful: data.filter(l => l.status === 'completed').length,
      failed: data.filter(l => l.status === 'failed').length,
      total_coupons_found: data.reduce((sum, l) => sum + l.coupons_found, 0),
      total_coupons_created: data.reduce((sum, l) => sum + l.coupons_created, 0),
      total_coupons_updated: data.reduce((sum, l) => sum + l.coupons_updated, 0),
      total_coupons_expired: data.reduce((sum, l) => sum + l.coupons_expired, 0),
      total_errors: data.reduce((sum, l) => sum + l.errors, 0),
      avg_duration_ms: data.length > 0
        ? Math.round(data.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / data.length)
        : 0
    };

    return stats;
  }

  /**
   * Limpar logs antigos
   */
  static async cleanup(daysToKeep = 30) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

    const { error } = await supabase
      .from('coupon_sync_logs')
      .delete()
      .lt('created_at', dateThreshold.toISOString());

    if (error) throw error;
    return true;
  }
}

export default CouponSyncLog;

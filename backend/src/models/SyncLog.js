import { supabase } from '../config/database.js';

class SyncLog {
  // Criar log de sincronização
  static async create(logData) {
    const {
      platform,
      product_name,
      product_id,
      discount_percentage,
      is_new_product,
      sent_to_bots,
      error_message
    } = logData;

    const { data, error } = await supabase
      .from('sync_logs')
      .insert([{
        platform,
        product_name,
        product_id,
        discount_percentage,
        is_new_product,
        sent_to_bots,
        error_message
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Listar logs com paginação
  static async findAll(filters = {}) {
    const {
      page = 1,
      limit = 50,
      platform,
      is_new_product
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('sync_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (platform) query = query.eq('platform', platform);
    if (is_new_product !== undefined) query = query.eq('is_new_product', is_new_product);

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Buscar log por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Estatísticas de sincronização
  static async getStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const stats = {
      total: data.length,
      new_products: data.filter(l => l.is_new_product).length,
      shopee: data.filter(l => l.platform === 'shopee').length,
      mercadolivre: data.filter(l => l.platform === 'mercadolivre').length,
      amazon: data.filter(l => l.platform === 'amazon').length,
      aliexpress: data.filter(l => l.platform === 'aliexpress').length,
      sent_to_bots: data.filter(l => l.sent_to_bots).length,
      errors: data.filter(l => l.error_message).length
    };

    return stats;
  }

  // Deletar logs antigos
  static async deleteOld(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { error } = await supabase
      .from('sync_logs')
      .delete()
      .lt('created_at', startDate.toISOString());

    if (error) throw error;
    return true;
  }
}

export default SyncLog;

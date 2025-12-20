import supabase from '../config/database.js';
import logger from '../config/logger.js';

class ClickTracking {
  // Registrar clique
  static async create(clickData) {
    const {
      user_id = null,
      product_id,
      coupon_id = null
    } = clickData;

    const { data, error } = await supabase
      .from('click_tracking')
      .insert([{
        user_id,
        product_id,
        coupon_id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Marcar como convertido
  static async markAsConverted(id) {
    const { data, error } = await supabase
      .from('click_tracking')
      .update({
        converted: true,
        conversion_date: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar cliques por usuário
  static async findByUser(userId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      converted
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('click_tracking')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (converted !== undefined) query = query.eq('converted', converted);

    query = query
      .order('clicked_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      clicks: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Buscar cliques por produto
  static async findByProduct(productId) {
    const { data, error } = await supabase
      .from('click_tracking')
      .select('*')
      .eq('product_id', productId)
      .order('clicked_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Contar cliques de um produto
  static async countByProduct(productId) {
    const { count, error } = await supabase
      .from('click_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (error) throw error;
    return count;
  }

  // Contar conversões de um produto
  static async countConversionsByProduct(productId) {
    const { count, error } = await supabase
      .from('click_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('converted', true);

    if (error) throw error;
    return count;
  }

  // Calcular taxa de conversão de um produto
  static async getConversionRate(productId) {
    const totalClicks = await this.countByProduct(productId);
    const conversions = await this.countConversionsByProduct(productId);

    if (totalClicks === 0) return 0;

    return (conversions / totalClicks) * 100;
  }

  // Buscar produtos mais clicados
  static async getMostClicked(limit = 10, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .rpc('get_most_clicked_products', {
        days_ago: days,
        result_limit: limit
      });

    if (error) {
      // Fallback se a função RPC não existir
      const { data: clicks, error: clickError } = await supabase
        .from('click_tracking')
        .select('product_id')
        .gte('clicked_at', startDate.toISOString());

      if (clickError) throw clickError;

      // Contar manualmente
      const productCounts = {};
      clicks.forEach(click => {
        productCounts[click.product_id] = (productCounts[click.product_id] || 0) + 1;
      });

      const sorted = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([product_id, count]) => ({ product_id, click_count: count }));

      return sorted;
    }

    return data;
  }

  // Estatísticas gerais
  static async getStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { count: totalClicks, error: clickError } = await supabase
      .from('click_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('clicked_at', startDate.toISOString());

    if (clickError) throw clickError;

    const { count: totalConversions, error: convError } = await supabase
      .from('click_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('clicked_at', startDate.toISOString())
      .eq('converted', true);

    if (convError) throw convError;

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      conversion_rate: conversionRate.toFixed(2),
      period_days: days
    };
  }

  // Deletar cliques antigos
  static async deleteOld(days = 90) {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - days);

    const { error } = await supabase
      .from('click_tracking')
      .delete()
      .lt('clicked_at', oldDate.toISOString());

    if (error) throw error;
    return true;
  }
}

export default ClickTracking;

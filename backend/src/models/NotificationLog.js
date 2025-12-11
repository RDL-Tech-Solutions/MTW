import supabase from '../config/database.js';

class NotificationLog {
  // Criar novo log de notificação
  static async create(logData) {
    const {
      event_type,
      platform,
      channel_id,
      payload,
      status = 'pending',
      error_message = null
    } = logData;

    const { data, error } = await supabase
      .from('notification_logs')
      .insert([{
        event_type,
        platform,
        channel_id,
        payload,
        status,
        error_message
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar log por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*, bot_channels(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Listar logs com filtros e paginação
  static async findAll(filters = {}) {
    const {
      page = 1,
      limit = 50,
      event_type,
      platform,
      status,
      start_date,
      end_date
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('notification_logs')
      .select('*, bot_channels(*)', { count: 'exact' });

    // Aplicar filtros
    if (event_type) query = query.eq('event_type', event_type);
    if (platform) query = query.eq('platform', platform);
    if (status) query = query.eq('status', status);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

  // Atualizar log
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('notification_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Marcar como enviado
  static async markAsSent(id) {
    return await this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  }

  // Marcar como falho
  static async markAsFailed(id, errorMessage) {
    return await this.update(id, {
      status: 'failed',
      error_message: errorMessage
    });
  }

  // Buscar logs recentes
  static async findRecent(limit = 20) {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*, bot_channels(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Estatísticas de envio
  static async getStats(filters = {}) {
    const { start_date, end_date, platform } = filters;

    let query = supabase
      .from('notification_logs')
      .select('status, event_type, platform');

    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);
    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;

    if (error) throw error;

    // Calcular estatísticas
    const stats = {
      total: data.length,
      sent: data.filter(log => log.status === 'sent').length,
      failed: data.filter(log => log.status === 'failed').length,
      pending: data.filter(log => log.status === 'pending').length,
      by_event_type: {},
      by_platform: {}
    };

    // Agrupar por tipo de evento
    data.forEach(log => {
      stats.by_event_type[log.event_type] = (stats.by_event_type[log.event_type] || 0) + 1;
      stats.by_platform[log.platform] = (stats.by_platform[log.platform] || 0) + 1;
    });

    return stats;
  }

  // Limpar logs antigos
  static async cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await supabase
      .from('notification_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
    return true;
  }
}

export default NotificationLog;

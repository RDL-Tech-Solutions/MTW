import supabase from '../config/database.js';

class Notification {
  // Criar notificação
  static async create(notificationData) {
    const {
      user_id,
      title,
      message,
      type,
      related_product_id = null,
      related_coupon_id = null
    } = notificationData;

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id,
        title,
        message,
        type,
        related_product_id,
        related_coupon_id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Criar notificação em massa
  static async createBulk(notifications) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return data;
  }

  // Buscar notificação por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar notificações do usuário
  static async findByUser(userId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      is_read,
      type
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (is_read !== undefined) query = query.eq('is_read', is_read);
    if (type) query = query.eq('type', type);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      notifications: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Marcar como lida
  static async markAsRead(id) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Marcar todas como lidas
  static async markAllAsRead(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;
    return data;
  }

  // Marcar como enviada
  static async markAsSent(id) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar notificação
  static async delete(id) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Buscar notificações não enviadas
  static async findUnsent(limit = 100) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Contar notificações não lidas do usuário
  static async countUnread(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count;
  }

  // Deletar notificações antigas
  static async deleteOld(days = 30) {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - days);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', oldDate.toISOString())
      .eq('is_read', true);

    if (error) throw error;
    return true;
  }

  // Buscar usuários para notificar sobre produto
  static async getUsersToNotify(productId, type) {
    // Buscar usuários que favoritaram o produto
    const { data: users, error } = await supabase
      .from('users')
      .select('id, push_token')
      .contains('favorites', [productId])
      .not('push_token', 'is', null);

    if (error) throw error;
    return users;
  }

  // Buscar usuários para notificar sobre categoria
  static async getUsersToNotifyByCategory(categoryId, type) {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, push_token')
      .contains('favorite_categories', [categoryId])
      .not('push_token', 'is', null);

    if (error) throw error;
    return users;
  }
}

export default Notification;

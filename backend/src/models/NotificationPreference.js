import supabase from '../config/database.js';

class NotificationPreference {
  // Criar ou atualizar preferências
  static async upsert(userId, preferences) {
    const {
      push_enabled = true,
      email_enabled = false,
      category_preferences = [],
      keyword_preferences = [],
      product_name_preferences = [],
      home_filters = {},
    } = preferences;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          push_enabled,
          email_enabled,
          category_preferences,
          keyword_preferences,
          product_name_preferences,
          home_filters,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar preferências do usuário
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  // Buscar usuários que devem receber notificação por categoria
  static async findUsersByCategory(categoryId) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled')
      .eq('push_enabled', true)
      .contains('category_preferences', [categoryId]);

    if (error) throw error;
    return data || [];
  }

  // Buscar usuários que devem receber notificação por palavra-chave
  static async findUsersByKeyword(keyword) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled, keyword_preferences')
      .eq('push_enabled', true);

    if (error) throw error;

    // Filtrar no código porque Supabase não tem busca case-insensitive em arrays JSONB
    const keywordLower = keyword.toLowerCase();
    return (data || []).filter(pref => {
      const keywords = pref.keyword_preferences || [];
      return keywords.some(k => k.toLowerCase().includes(keywordLower) || keywordLower.includes(k.toLowerCase()));
    });
  }

  // Buscar usuários que devem receber notificação por nome de produto
  static async findUsersByProductName(productName) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled, product_name_preferences')
      .eq('push_enabled', true);

    if (error) throw error;

    // Filtrar no código
    const productNameLower = productName.toLowerCase();
    return (data || []).filter(pref => {
      const productNames = pref.product_name_preferences || [];
      return productNames.some(pn => productNameLower.includes(pn.toLowerCase()) || pn.toLowerCase().includes(productNameLower));
    });
  }

  // Deletar preferências
  static async delete(userId) {
    const { error } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
}

export default NotificationPreference;


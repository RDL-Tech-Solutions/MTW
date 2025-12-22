import supabase from '../config/database.js';

class BotChannel {
  // Criar novo canal de bot
  static async create(channelData) {
    const { 
      platform, 
      identifier, 
      name, 
      is_active = true,
      only_coupons = false,
      category_filter = null
    } = channelData;

    const insertData = { 
      platform, 
      identifier, 
      name, 
      is_active,
      only_coupons: only_coupons || false
    };

    // Adicionar category_filter apenas se fornecido
    if (category_filter !== null && category_filter !== undefined) {
      // Garantir que seja um array JSON válido
      if (Array.isArray(category_filter)) {
        insertData.category_filter = category_filter;
      } else if (typeof category_filter === 'string') {
        try {
          insertData.category_filter = JSON.parse(category_filter);
        } catch (e) {
          insertData.category_filter = [];
        }
      }
    }

    const { data, error } = await supabase
      .from('bot_channels')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar canal por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('bot_channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar canal por plataforma e identificador
  static async findByPlatformAndIdentifier(platform, identifier) {
    const { data, error } = await supabase
      .from('bot_channels')
      .select('*')
      .eq('platform', platform)
      .eq('identifier', identifier)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Listar todos os canais
  static async findAll(filters = {}) {
    const { platform, is_active } = filters;

    let query = supabase.from('bot_channels').select('*');

    if (platform) query = query.eq('platform', platform);
    if (is_active !== undefined) query = query.eq('is_active', is_active);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Buscar canais ativos
  static async findActive(platform = null) {
    let query = supabase
      .from('bot_channels')
      .select('*')
      .eq('is_active', true);

    if (platform) query = query.eq('platform', platform);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Atualizar canal
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('bot_channels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar canal
  static async delete(id) {
    const { error } = await supabase
      .from('bot_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Ativar canal
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Desativar canal
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Contar canais ativos por plataforma
  static async countActive(platform = null) {
    let query = supabase
      .from('bot_channels')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (platform) query = query.eq('platform', platform);

    const { count, error } = await query;

    if (error) throw error;
    return count;
  }
}

export default BotChannel;

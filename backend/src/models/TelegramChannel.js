import supabase from '../config/database.js';

class TelegramChannel {
  /**
   * Criar novo canal
   */
  static async create(channelData) {
    const {
      name,
      username,
      is_active = true
    } = channelData;

    // Remover @ se houver
    const cleanUsername = username.replace('@', '').trim();

    const { data, error } = await supabase
      .from('telegram_channels')
      .insert([{
        name,
        username: cleanUsername,
        is_active
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Buscar canal por ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('telegram_channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Buscar canal por username
   */
  static async findByUsername(username) {
    const cleanUsername = username.replace('@', '').trim();
    
    const { data, error } = await supabase
      .from('telegram_channels')
      .select('*')
      .eq('username', cleanUsername)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Listar todos os canais
   */
  static async findAll(filters = {}) {
    const {
      is_active,
      search
    } = filters;

    let query = supabase
      .from('telegram_channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Buscar canais ativos
   */
  static async findActive() {
    const { data, error } = await supabase
      .from('telegram_channels')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Atualizar canal
   */
  static async update(id, updates) {
    // Limpar username se fornecido
    if (updates.username) {
      updates.username = updates.username.replace('@', '').trim();
    }

    // Preparar atualização - remover campos undefined/null desnecessários
    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    // Adicionar updated_at
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('telegram_channels')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Log detalhado do erro para debug
      console.error('Erro ao atualizar canal:', error);
      console.error('Updates tentados:', cleanUpdates);
      throw error;
    }
    return data;
  }

  /**
   * Deletar canal
   */
  static async delete(id) {
    const { error } = await supabase
      .from('telegram_channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  /**
   * Atualizar estatísticas do canal
   */
  static async updateStats(id, stats) {
    const { data, error } = await supabase
      .from('telegram_channels')
      .update({
        ...stats,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Incrementar contador de cupons
   */
  static async incrementCouponsCount(id) {
    const channel = await this.findById(id);
    if (!channel) throw new Error('Canal não encontrado');

    return await this.updateStats(id, {
      coupons_captured: (channel.coupons_captured || 0) + 1,
      last_message_at: new Date().toISOString()
    });
  }
}

export default TelegramChannel;





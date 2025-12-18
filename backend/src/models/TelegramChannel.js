import supabase from '../config/database.js';

class TelegramChannel {
  /**
   * Criar novo canal
   */
  static async create(channelData) {
    const {
      name,
      username,
      is_active = true,
      capture_schedule_start = null,
      capture_schedule_end = null,
      capture_mode = 'new_only',
      platform_filter = 'all'
    } = channelData;

    // Remover @ se houver
    const cleanUsername = username.replace('@', '').trim();

    // Converter strings vazias para null nos campos TIME
    const cleanScheduleStart = capture_schedule_start === '' ? null : capture_schedule_start;
    const cleanScheduleEnd = capture_schedule_end === '' ? null : capture_schedule_end;

    const { data, error } = await supabase
      .from('telegram_channels')
      .insert([{
        name,
        username: cleanUsername,
        is_active,
        capture_schedule_start: cleanScheduleStart,
        capture_schedule_end: cleanScheduleEnd,
        capture_mode,
        platform_filter
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
        // Converter strings vazias para null (especialmente para campos TIME)
        if (value === '' || value === null) {
          // Para campos TIME, string vazia deve ser null
          if (key === 'capture_schedule_start' || key === 'capture_schedule_end') {
            cleanUpdates[key] = null;
          } else {
            // Para outros campos, manter null se for string vazia
            cleanUpdates[key] = null;
          }
        } else {
          cleanUpdates[key] = value;
        }
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
      
      // Verificar se é erro de coluna não encontrada (migration não executada)
      if (error.message && (
        error.message.includes('column') && error.message.includes('does not exist') ||
        error.message.includes('campo') && error.message.includes('não existe') ||
        error.code === '42703' // PostgreSQL error code for undefined column
      )) {
        const missingFields = [];
        if (cleanUpdates.capture_schedule_start !== undefined || cleanUpdates.capture_schedule_end !== undefined) {
          missingFields.push('capture_schedule_start, capture_schedule_end');
        }
        if (cleanUpdates.capture_mode !== undefined) {
          missingFields.push('capture_mode');
        }
        if (cleanUpdates.platform_filter !== undefined) {
          missingFields.push('platform_filter');
        }
        
        if (missingFields.length > 0) {
          const errorMsg = `Campos não encontrados na tabela: ${missingFields.join(', ')}. ` +
            `Execute a migration 028_add_telegram_channel_capture_settings.sql primeiro.`;
          throw new Error(errorMsg);
        }
      }
      
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





import supabase from '../config/database.js';

class TelegramCollectorConfig {
  /**
   * Obter configuração (sempre retorna o registro único)
   */
  static async get() {
    const { data, error } = await supabase
      .from('telegram_collector_config')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      // Se não existir, criar com valores padrão
      if (error.code === 'PGRST116') {
        return await this.create();
      }
      throw error;
    }

    return data;
  }

  /**
   * Criar configuração padrão
   */
  static async create() {
    const { data, error } = await supabase
      .from('telegram_collector_config')
      .insert([{
        id: '00000000-0000-0000-0000-000000000001',
        api_id: null,
        api_hash: null,
        phone: null,
        session_path: 'telegram_session.session',
        is_authenticated: false,
        listener_status: 'stopped',
        listener_pid: null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualizar configuração
   */
  static async update(updates) {
    // Não permitir atualizar o ID
    const { id, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('telegram_collector_config')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualizar status do listener
   */
  static async updateListenerStatus(status, pid = null, error = null) {
    const updates = {
      listener_status: status,
      listener_pid: pid,
      updated_at: new Date().toISOString()
    };

    if (error) {
      updates.last_error = error;
    }

    return await this.update(updates);
  }

  /**
   * Marcar como autenticado
   */
  static async setAuthenticated(isAuthenticated) {
    return await this.update({
      is_authenticated: isAuthenticated
    });
  }
}

export default TelegramCollectorConfig;




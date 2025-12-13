import supabase from '../config/database.js';

class BotMessageTemplate {
  /**
   * Buscar template por tipo e plataforma
   * @param {string} templateType - Tipo do template (new_promotion, new_coupon, expired_coupon)
   * @param {string} platform - Plataforma (telegram, whatsapp, all)
   * @returns {Promise<Object|null>}
   */
  static async findByType(templateType, platform = 'all') {
    try {
      // Primeiro tentar buscar template específico da plataforma e ATIVO
      let { data, error } = await supabase
        .from('bot_message_templates')
        .select('*')
        .eq('template_type', templateType)
        .eq('platform', platform)
        .eq('is_active', true)
        .order('created_at', { ascending: false }) // Pegar o mais recente se houver múltiplos
        .limit(1)
        .maybeSingle();

      // Se não encontrar, buscar template genérico (all) e ATIVO
      if (!data && error?.code === 'PGRST116') {
        ({ data, error } = await supabase
          .from('bot_message_templates')
          .select('*')
          .eq('template_type', templateType)
          .eq('platform', 'all')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle());
      }

      // Se ainda não encontrar, buscar qualquer template do tipo (mesmo inativo) para debug
      if (!data) {
        ({ data, error } = await supabase
          .from('bot_message_templates')
          .select('*')
          .eq('template_type', templateType)
          .eq('platform', platform)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle());
        
        if (data && !data.is_active) {
          console.warn(`⚠️ Template encontrado mas está INATIVO: ${templateType} para ${platform}`);
          return null; // Retornar null se estiver inativo
        }
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar template:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar template:', error.message);
      return null;
    }
  }

  /**
   * Buscar todos os templates
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<Array>}
   */
  static async findAll(filters = {}) {
    try {
      let query = supabase
        .from('bot_message_templates')
        .select('*')
        .order('template_type', { ascending: true })
        .order('platform', { ascending: true });

      if (filters.template_type) {
        query = query.eq('template_type', filters.template_type);
      }

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar templates:', error.message);
      return [];
    }
  }

  /**
   * Criar novo template
   * @param {Object} templateData - Dados do template
   * @returns {Promise<Object>}
   */
  static async create(templateData) {
    const {
      template_type,
      platform = 'all',
      template,
      description,
      available_variables = [],
      is_active = true
    } = templateData;

    const { data, error } = await supabase
      .from('bot_message_templates')
      .insert([{
        template_type,
        platform,
        template,
        description,
        available_variables,
        is_active
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualizar template
   * @param {string} id - ID do template
   * @param {Object} updates - Dados para atualizar
   * @returns {Promise<Object>}
   */
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('bot_message_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deletar template
   * @param {string} id - ID do template
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const { error } = await supabase
      .from('bot_message_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  /**
   * Buscar template por ID
   * @param {string} id - ID do template
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('bot_message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}

export default BotMessageTemplate;


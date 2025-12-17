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

      // Se não encontrar template específico da plataforma, buscar template genérico (all) e ATIVO
      if (!data) {
        // Se a plataforma já é 'all', não precisa buscar novamente
        if (platform !== 'all') {
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
      }

      // Se ainda não encontrar template ativo, buscar qualquer template do tipo para debug
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
          // Tentar buscar template 'all' inativo como último recurso
          if (platform !== 'all') {
            const { data: allData } = await supabase
              .from('bot_message_templates')
              .select('*')
              .eq('template_type', templateType)
              .eq('platform', 'all')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (allData) {
              console.warn(`⚠️ Usando template 'all' (mesmo inativo): ${templateType}`);
              return allData;
            }
          }
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
      // Verificar se a tabela existe fazendo uma query simples primeiro
      let query = supabase
        .from('bot_message_templates')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filters.template_type) {
        query = query.eq('template_type', filters.template_type);
      }

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      // Ordenar - usar apenas uma ordenação principal
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        // Se a tabela não existir, retornar array vazio em vez de erro
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ Tabela bot_message_templates não existe ainda. Execute a migration.');
          return [];
        }
        
        console.error('Erro na query Supabase:', error);
        console.error('Código do erro:', error.code);
        console.error('Mensagem:', error.message);
        console.error('Detalhes:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      // Ordenar manualmente após buscar os dados
      const sorted = (data || []).sort((a, b) => {
        // Primeiro por tipo
        if (a.template_type !== b.template_type) {
          return a.template_type.localeCompare(b.template_type);
        }
        // Depois por plataforma
        if (a.platform !== b.platform) {
          return a.platform.localeCompare(b.platform);
        }
        // Por último por data de criação (mais recente primeiro)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return sorted;
    } catch (error) {
      console.error('Erro ao buscar templates:', error.message);
      console.error('Stack:', error.stack);
      // Se for erro de tabela não existir, retornar array vazio
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('⚠️ Tabela bot_message_templates não existe. Retornando array vazio.');
        return [];
      }
      throw error; // Re-throw para que o controller possa capturar
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
      is_active = true,
      is_system = false
    } = templateData;

    const { data, error } = await supabase
      .from('bot_message_templates')
      .insert([{
        template_type,
        platform,
        template,
        description,
        available_variables,
        is_active,
        is_system
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


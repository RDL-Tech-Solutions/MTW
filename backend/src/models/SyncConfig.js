import { supabase } from '../config/database.js';

class SyncConfig {
  // Buscar configuração ativa
  static async get() {
    const { data, error } = await supabase
      .from('sync_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignora erro de "não encontrado"
    
    // Se não existir, retornar config padrão
    if (!data) {
      return {
        shopee_enabled: false,
        mercadolivre_enabled: false,
        amazon_enabled: false,
        aliexpress_enabled: false,
        keywords: '',
        min_discount_percentage: 10,
        categories: [],
        cron_interval_minutes: 60,
        is_active: false
      };
    }

    return data;
  }

  // Criar ou atualizar configuração
  static async upsert(configData) {
    const {
      shopee_enabled,
      mercadolivre_enabled,
      amazon_enabled,
      aliexpress_enabled,
      keywords,
      min_discount_percentage,
      categories,
      cron_interval_minutes,
      is_active
    } = configData;

    // Verificar se já existe
    const existing = await this.get();

    if (existing && existing.id) {
      // Update
      const { data, error } = await supabase
        .from('sync_config')
        .update({
          shopee_enabled,
          mercadolivre_enabled,
          amazon_enabled: amazon_enabled || false,
          aliexpress_enabled: aliexpress_enabled || false,
          keywords,
          min_discount_percentage,
          categories,
          cron_interval_minutes,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('sync_config')
        .insert([{
          shopee_enabled,
          mercadolivre_enabled,
          amazon_enabled: amazon_enabled || false,
          aliexpress_enabled: aliexpress_enabled || false,
          keywords,
          min_discount_percentage,
          categories,
          cron_interval_minutes,
          is_active
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }
}

export default SyncConfig;

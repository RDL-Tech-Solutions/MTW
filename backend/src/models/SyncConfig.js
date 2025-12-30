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
        shopee_auto_publish: false,
        mercadolivre_auto_publish: false,
        amazon_auto_publish: false,
        aliexpress_auto_publish: false,
        keywords: '',
        min_discount_percentage: 10,
        categories: [],
        cron_interval_minutes: 60,
        auto_publish: false,
        is_active: false
      };
    }

    return data;
  }

  // Criar ou atualizar configuração
  static async upsert(configData) {
    // Sanitizar e garantir tipos corretos
    const payload = {
      shopee_enabled: Boolean(configData.shopee_enabled),
      mercadolivre_enabled: Boolean(configData.mercadolivre_enabled),
      amazon_enabled: Boolean(configData.amazon_enabled),
      aliexpress_enabled: Boolean(configData.aliexpress_enabled),
      shopee_auto_publish: Boolean(configData.shopee_auto_publish),
      mercadolivre_auto_publish: Boolean(configData.mercadolivre_auto_publish),
      amazon_auto_publish: Boolean(configData.amazon_auto_publish),
      aliexpress_auto_publish: Boolean(configData.aliexpress_auto_publish),
      auto_publish: Boolean(configData.auto_publish),
      keywords: String(configData.keywords || ''),
      min_discount_percentage: Number(configData.min_discount_percentage || 10),
      categories: Array.isArray(configData.categories) ? configData.categories : [],
      cron_interval_minutes: Number(configData.cron_interval_minutes || 60),
      is_active: Boolean(configData.is_active),
      updated_at: new Date().toISOString()
    };

    // Verificar se já existe
    const existing = await this.get();

    if (existing && existing.id) {
      // Update
      const { data, error } = await supabase
        .from('sync_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating sync_config:', error);
        throw error;
      }
      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('sync_config')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting sync_config:', error);
        throw error;
      }
      return data;
    }
  }
}

export default SyncConfig;

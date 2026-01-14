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
        kabum_enabled: false,
        magazineluiza_enabled: false,
        terabyteshop_enabled: false,
        shopee_auto_publish: false,
        mercadolivre_auto_publish: false,
        amazon_auto_publish: false,
        aliexpress_auto_publish: false,
        kabum_auto_publish: false,
        magazineluiza_auto_publish: false,
        terabyteshop_auto_publish: false,
        shopee_shorten_link: false,
        mercadolivre_shorten_link: false,
        amazon_shorten_link: false,
        aliexpress_shorten_link: false,
        kabum_shorten_link: false,
        magazineluiza_shorten_link: false,
        terabyteshop_shorten_link: false,
        keywords: '',
        min_discount_percentage: 10,
        categories: [],
        cron_interval_minutes: 60,
        auto_publish: false,
        is_active: false,
        use_ai_keywords: false
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
      kabum_enabled: Boolean(configData.kabum_enabled),
      magazineluiza_enabled: Boolean(configData.magazineluiza_enabled),
      terabyteshop_enabled: Boolean(configData.terabyteshop_enabled),
      shopee_auto_publish: Boolean(configData.shopee_auto_publish),
      mercadolivre_auto_publish: Boolean(configData.mercadolivre_auto_publish),
      amazon_auto_publish: Boolean(configData.amazon_auto_publish),
      aliexpress_auto_publish: Boolean(configData.aliexpress_auto_publish),
      kabum_auto_publish: Boolean(configData.kabum_auto_publish),
      magazineluiza_auto_publish: Boolean(configData.magazineluiza_auto_publish),
      terabyteshop_auto_publish: Boolean(configData.terabyteshop_auto_publish),
      shopee_shorten_link: Boolean(configData.shopee_shorten_link),
      mercadolivre_shorten_link: Boolean(configData.mercadolivre_shorten_link),
      amazon_shorten_link: Boolean(configData.amazon_shorten_link),
      aliexpress_shorten_link: Boolean(configData.aliexpress_shorten_link),
      kabum_shorten_link: Boolean(configData.kabum_shorten_link),
      magazineluiza_shorten_link: Boolean(configData.magazineluiza_shorten_link),
      terabyteshop_shorten_link: Boolean(configData.terabyteshop_shorten_link),
      auto_publish: Boolean(configData.auto_publish),
      keywords: String(configData.keywords || ''),
      min_discount_percentage: Number(configData.min_discount_percentage || 10),
      categories: Array.isArray(configData.categories) ? configData.categories : [],
      cron_interval_minutes: Number(configData.cron_interval_minutes || 60),
      is_active: Boolean(configData.is_active),
      use_ai_keywords: Boolean(configData.use_ai_keywords),
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

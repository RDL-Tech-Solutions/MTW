import supabase from '../config/database.js';

class Category {
  // Criar nova categoria
  static async create(categoryData) {
    const { name, slug, icon, description, is_active = true } = categoryData;

    // Gerar slug se não fornecido
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        name, 
        slug: finalSlug, 
        icon: icon || '📦',
        description: description || null,
        is_active: is_active !== false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar categoria por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar categoria por slug
  static async findBySlug(slug) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Listar todas as categorias
  static async findAll(activeOnly = true) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Atualizar categoria
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar categoria
  static async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Desativar categoria
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Ativar categoria
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Contar produtos por categoria
  static async countProducts(id) {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);

    if (error) throw error;
    return count;
  }

  // Buscar categorias com contagem de produtos
  static async findAllWithCount() {
    const categories = await this.findAll();
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await this.countProducts(category.id);
        return { ...category, product_count: count };
      })
    );

    return categoriesWithCount;
  }
}

export default Category;

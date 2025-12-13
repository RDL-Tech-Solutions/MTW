import supabase from '../config/database.js';
import logger from '../config/logger.js';

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
      .eq('is_active', true)
      .not('category_id', 'is', null);

    if (error) {
      logger.error(`Erro ao contar produtos da categoria ${id}: ${error.message}`);
      return 0;
    }
    return count || 0;
  }

  // Buscar categorias com contagem de produtos
  static async findAllWithCount() {
    try {
      const categories = await this.findAll();
      
      // Buscar contagem de produtos por categoria usando uma query agregada
      // Isso é mais eficiente que buscar todos os produtos
      const { data: productCounts, error: countError } = await supabase
        .from('products')
        .select('category_id, id')
        .eq('is_active', true)
        .not('category_id', 'is', null);

      if (countError) {
        logger.error(`Erro ao buscar contagem de produtos: ${countError.message}`);
        logger.error(`Detalhes do erro: ${JSON.stringify(countError)}`);
      }

      logger.info(`Produtos encontrados para contagem: ${productCounts?.length || 0}`);

      // Criar mapa de contagens por category_id
      const countMap = {};
      if (productCounts && Array.isArray(productCounts)) {
        productCounts.forEach(product => {
          const catId = product.category_id;
          if (catId) {
            // Converter para string para garantir comparação correta
            const catIdStr = String(catId);
            countMap[catIdStr] = (countMap[catIdStr] || 0) + 1;
          }
        });
      }

      logger.info(`Mapa de contagens: ${JSON.stringify(countMap)}`);

      // Adicionar contagem a cada categoria
      const categoriesWithCount = categories.map(category => {
        // Converter ID da categoria para string para comparação
        const catIdStr = String(category.id);
        const count = countMap[catIdStr] || 0;
        
        logger.info(`Categoria ${category.name} (ID: ${category.id}): ${count} produtos`);
        
        return {
          ...category,
          product_count: count
        };
      });

      return categoriesWithCount;
    } catch (error) {
      logger.error(`Erro ao buscar categorias com contagem: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      // Fallback: retornar categorias sem contagem
      const categories = await this.findAll();
      return categories.map(cat => ({ ...cat, product_count: 0 }));
    }
  }
}

export default Category;

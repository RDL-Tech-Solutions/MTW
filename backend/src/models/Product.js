import supabase from '../config/database.js';
import { calculateDiscountPercentage } from '../utils/helpers.js';

class Product {
  // Criar novo produto
  static async create(productData) {
    const {
      name,
      image_url,
      platform,
      current_price,
      old_price,
      category_id,
      coupon_id,
      affiliate_link,
      external_id,
      stock_available = true
    } = productData;

    const discount_percentage = old_price
      ? calculateDiscountPercentage(old_price, current_price)
      : 0;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        image_url,
        platform,
        current_price,
        old_price,
        discount_percentage,
        category_id,
        coupon_id,
        affiliate_link,
        external_id,
        stock_available
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar produto por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar produto por external_id
  static async findByExternalId(externalId, platform) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('external_id', externalId)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Listar produtos com filtros
  static async findAll(filters = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      platform,
      min_price,
      max_price,
      min_discount,
      search,
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('products_full')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Aplicar filtros
    if (category) query = query.eq('category_id', category);
    if (platform) query = query.eq('platform', platform);
    if (min_price) query = query.gte('current_price', min_price);
    if (max_price) query = query.lte('current_price', max_price);
    if (min_discount) query = query.gte('discount_percentage', min_discount);
    if (search) query = query.ilike('name', `%${search}%`);

    // Ordenação
    query = query.order(sort, { ascending: order === 'asc' });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      products: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Atualizar produto
  static async update(id, updates) {
    // Recalcular desconto se preços mudaram
    if (updates.current_price || updates.old_price) {
      const product = await this.findById(id);
      const oldPrice = updates.old_price || product.old_price;
      const currentPrice = updates.current_price || product.current_price;

      if (oldPrice) {
        updates.discount_percentage = calculateDiscountPercentage(oldPrice, currentPrice);
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar produto por external_id
  static async findByExternalId(externalId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('external_id', externalId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignora erro de "não encontrado"
    return data;
  }

  // Deletar produto (soft delete)
  static async delete(id) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Deletar múltiplos produtos (soft delete)
  static async deleteMany(ids) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .in('id', ids);

    if (error) throw error;
    return true;
  }

  // Desativar produto
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Ativar produto
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Marcar como fora de estoque
  static async markOutOfStock(id) {
    return await this.update(id, { stock_available: false });
  }

  // Marcar como em estoque
  static async markInStock(id) {
    return await this.update(id, { stock_available: true });
  }

  // Buscar histórico de preços
  static async getPriceHistory(id, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', id)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Buscar produtos por categoria
  static async findByCategory(categoryId, page = 1, limit = 20) {
    return await this.findAll({ category: categoryId, page, limit });
  }

  // Buscar produtos por plataforma
  static async findByPlatform(platform, page = 1, limit = 20) {
    return await this.findAll({ platform, page, limit });
  }

  // Buscar produtos em promoção (com desconto)
  static async findOnSale(page = 1, limit = 20) {
    return await this.findAll({ min_discount: 1, page, limit, sort: 'discount_percentage' });
  }

  // Buscar produtos mais recentes
  static async findRecent(limit = 10) {
    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('is_active', true)
      .eq('stock_available', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Buscar produtos com cupom
  static async findWithCoupon(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('products_full')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('stock_available', true)
      .not('coupon_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      products: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Buscar produtos relacionados
  static async findRelated(productId, limit = 5) {
    const product = await this.findById(productId);

    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .eq('stock_available', true)
      .neq('id', productId)
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Atualizar preço e criar histórico
  static async updatePrice(id, newPrice) {
    const product = await this.findById(id);

    // Se o preço mudou, atualizar
    if (product.current_price !== newPrice) {
      const updates = {
        old_price: product.current_price,
        current_price: newPrice
      };

      return await this.update(id, updates);
    }

    return product;
  }

  // Buscar produtos que precisam de atualização de preço
  static async findStale(minutes = 30) {
    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - minutes);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .lt('updated_at', staleDate.toISOString());

    if (error) throw error;
    return data;
  }

  // Contar produtos
  static async count(filters = {}) {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (filters.category) query = query.eq('category_id', filters.category);
    if (filters.platform) query = query.eq('platform', filters.platform);

    const { count, error } = await query;

    if (error) throw error;
    return count;
  }
}

export default Product;

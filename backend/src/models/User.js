import supabase from '../config/database.js';
import { hashPassword } from '../utils/helpers.js';

class User {
  // Criar novo usuário
  static async create(userData) {
    const { name, email, password, role = 'user', is_vip = false } = userData;
    
    const hashedPassword = await hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password: hashedPassword,
        role,
        is_vip
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Remover senha do retorno
    delete data.password;
    return data;
  }

  // Buscar usuário por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  // Atualizar usuário
  static async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    delete data.password;
    return data;
  }

  // Deletar usuário
  static async delete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // Adicionar produto aos favoritos
  static async addFavorite(userId, productId) {
    const user = await this.findById(userId);
    const favorites = user.favorites || [];
    
    if (!favorites.includes(productId)) {
      favorites.push(productId);
      return await this.update(userId, { favorites });
    }
    
    return user;
  }

  // Remover produto dos favoritos
  static async removeFavorite(userId, productId) {
    const user = await this.findById(userId);
    const favorites = user.favorites || [];
    
    const updatedFavorites = favorites.filter(id => id !== productId);
    return await this.update(userId, { favorites: updatedFavorites });
  }

  // Buscar favoritos do usuário
  static async getFavorites(userId) {
    const user = await this.findById(userId);
    const favorites = user.favorites || [];
    
    if (favorites.length === 0) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', favorites)
      .eq('is_active', true);
    
    if (error) throw error;
    return data;
  }

  // Atualizar push token
  static async updatePushToken(userId, pushToken) {
    return await this.update(userId, { push_token: pushToken });
  }

  // Adicionar categoria favorita
  static async addFavoriteCategory(userId, categoryId) {
    const user = await this.findById(userId);
    const favoriteCategories = user.favorite_categories || [];
    
    if (!favoriteCategories.includes(categoryId)) {
      favoriteCategories.push(categoryId);
      return await this.update(userId, { favorite_categories: favoriteCategories });
    }
    
    return user;
  }

  // Remover categoria favorita
  static async removeFavoriteCategory(userId, categoryId) {
    const user = await this.findById(userId);
    const favoriteCategories = user.favorite_categories || [];
    
    const updated = favoriteCategories.filter(id => id !== categoryId);
    return await this.update(userId, { favorite_categories: updated });
  }

  // Listar todos os usuários (admin)
  static async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('users')
      .select('id, name, email, role, is_vip, created_at', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      users: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Atualizar para VIP
  static async upgradeToVIP(userId) {
    return await this.update(userId, { is_vip: true });
  }

  // Remover VIP
  static async downgradeFromVIP(userId) {
    return await this.update(userId, { is_vip: false });
  }
}

export default User;

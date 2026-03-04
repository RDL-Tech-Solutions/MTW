import supabase from '../config/database.js';
import { hashPassword } from '../utils/helpers.js';
import crypto from 'crypto';

class User {
  // Criar novo usuário
  static async create(userData) {
    const {
      name,
      email,
      password,
      role = 'user',
      is_vip = false,
      provider,
      provider_id,
      avatar_url
    } = userData;

    // Se não tem senha (login social), usar um hash padrão temporário
    // O banco exige password_hash NOT NULL, mas usuários sociais não têm senha
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    } else {
      // Para login social, gerar um hash aleatório que nunca será usado
      // Isso satisfaz a constraint NOT NULL do banco
      const randomString = crypto.randomBytes(32).toString('hex');
      hashedPassword = await hashPassword(randomString);
    }

    const insertData = {
      name,
      email,
      password_hash: hashedPassword, // Sempre preencher password_hash
      role,
      is_vip: false, // DEPRECATED: VIP feature removed, always false
    }

    // Adicionar dados de autenticação social se fornecidos
    if (provider) {
      insertData.provider = provider;
      insertData.provider_id = provider_id;
    }

    if (avatar_url) {
      insertData.avatar_url = avatar_url;
    }

    const { data, error } = await supabase
      .from('users')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // Remover senhas do retorno
    delete data.password;
    delete data.password_hash;
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

    // Remover senhas do retorno
    delete data.password;
    delete data.password_hash;
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

  // Buscar todos os usuários com FCM token
  static async findAllWithFCMToken() {
    // CORREÇÃO: Buscar de ambas as fontes (tabela fcm_tokens E coluna users.fcm_token)
    
    // 1. Buscar da nova tabela fcm_tokens
    const { data: tokensData, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select(`
        fcm_token,
        user_id,
        platform,
        device_id,
        users!inner (
          id,
          name,
          email
        )
      `);

    if (tokensError) throw tokensError;
    
    // 2. Buscar da coluna antiga users.fcm_token (fallback)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, fcm_token')
      .not('fcm_token', 'is', null);

    if (usersError) throw usersError;
    
    // Transformar resultado para formato esperado
    // Agrupar por usuário (um usuário pode ter múltiplos tokens/dispositivos)
    const usersMap = new Map();
    
    // Adicionar tokens da nova tabela
    (tokensData || []).forEach(token => {
      const user = token.users;
      if (!usersMap.has(user.id)) {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          fcm_token: token.fcm_token, // Usar o primeiro token encontrado
          fcm_tokens: [] // Array com todos os tokens do usuário
        });
      }
      
      // Adicionar token ao array
      usersMap.get(user.id).fcm_tokens.push({
        fcm_token: token.fcm_token,
        platform: token.platform,
        device_id: token.device_id
      });
    });
    
    // Adicionar tokens da coluna antiga (se não estiver já no map)
    (usersData || []).forEach(user => {
      if (!usersMap.has(user.id) && user.fcm_token) {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          fcm_token: user.fcm_token,
          fcm_tokens: [{
            fcm_token: user.fcm_token,
            platform: 'unknown', // Não sabemos a plataforma da coluna antiga
            device_id: null
          }]
        });
      }
    });
    
    return Array.from(usersMap.values());
  }

  // DEPRECATED: VIP feature removed - all users have full access
  // Methods kept for backward compatibility but do nothing
  static async upgradeToVIP(userId) {
    // No-op: VIP feature removed
    return await this.findById(userId);
  }

  // DEPRECATED: VIP feature removed - all users have full access
  static async downgradeFromVIP(userId) {
    // No-op: VIP feature removed
    return await this.findById(userId);
  }
}

export default User;

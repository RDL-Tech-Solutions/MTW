import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import logger from '../config/logger.js';
import { hashPassword } from '../utils/helpers.js';

class UserController {
  // Listar todos os usuários (admin)
  static async list(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      
      const result = await User.findAll(parseInt(page), parseInt(limit));
      
      // Filtrar por busca se necessário
      let users = result.users;
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u => 
          u.email?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower)
        );
      }

      res.json(successResponse({
        users,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }));
    } catch (error) {
      next(error);
    }
  }

  // Obter usuário por ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  // Criar novo usuário (admin)
  static async create(req, res, next) {
    try {
      const { name, email, password, role = 'user', is_vip = false } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json(
          errorResponse('Nome, email e senha são obrigatórios', 'VALIDATION_ERROR')
        );
      }

      // Verificar se email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json(
          errorResponse('Email já cadastrado', 'EMAIL_EXISTS')
        );
      }

      const user = await User.create({
        name,
        email,
        password,
        role,
        is_vip
      });

      logger.info(`Usuário criado: ${user.email}`);
      res.status(201).json(successResponse(user, 'Usuário criado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar usuário (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Se houver senha, fazer hash
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }

      const user = await User.update(id, updates);
      logger.info(`Usuário atualizado: ${id}`);
      res.json(successResponse(user, 'Usuário atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar usuário (admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      // Não permitir deletar a si mesmo
      if (id === req.user.id) {
        return res.status(400).json(
          errorResponse('Você não pode deletar sua própria conta', 'INVALID_OPERATION')
        );
      }

      await User.delete(id);
      logger.info(`Usuário deletado: ${id}`);
      res.json(successResponse(null, 'Usuário deletado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar status VIP
  static async updateVIP(req, res, next) {
    try {
      const { id } = req.params;
      const { is_vip } = req.body;

      const user = await User.update(id, { is_vip: !!is_vip });
      logger.info(`Status VIP atualizado para usuário ${id}: ${is_vip}`);
      res.json(successResponse(user, `Usuário ${is_vip ? 'promovido a' : 'removido de'} VIP`));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar role (admin/user)
  static async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json(
          errorResponse('Role inválido. Use "admin" ou "user"', 'VALIDATION_ERROR')
        );
      }

      // Não permitir remover admin de si mesmo
      if (id === req.user.id && role !== 'admin') {
        return res.status(400).json(
          errorResponse('Você não pode remover seu próprio acesso de admin', 'INVALID_OPERATION')
        );
      }

      const user = await User.update(id, { role });
      logger.info(`Role atualizado para usuário ${id}: ${role}`);
      res.json(successResponse(user, `Role atualizado para ${role}`));
    } catch (error) {
      next(error);
    }
  }

  // Estatísticas de usuários
  static async stats(req, res, next) {
    try {
      const result = await User.findAll(1, 1000); // Buscar todos para estatísticas
      const users = result.users;

      const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        vips: users.filter(u => u.is_vip).length,
        regular: users.filter(u => u.role === 'user' && !u.is_vip).length,
        new_today: users.filter(u => {
          const today = new Date();
          const created = new Date(u.created_at);
          return created.toDateString() === today.toDateString();
        }).length,
        new_this_week: users.filter(u => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(u.created_at) >= weekAgo;
        }).length
      };

      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;


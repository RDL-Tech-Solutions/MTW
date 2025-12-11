import Category from '../models/Category.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';

class CategoryController {
  // Listar categorias
  static async list(req, res, next) {
    try {
      const cacheKey = 'categories:all';
      const cached = await cacheGet(cacheKey);
      
      if (cached) {
        return res.json(successResponse(cached));
      }

      const categories = await Category.findAllWithCount();
      await cacheSet(cacheKey, categories, CACHE_TTL.CATEGORIES);

      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  }

  // Obter categoria por ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      res.json(successResponse(category));
    } catch (error) {
      next(error);
    }
  }

  // Criar categoria (admin)
  static async create(req, res, next) {
    try {
      const category = await Category.create(req.body);
      await cacheDel('categories:*');

      logger.info(`Categoria criada: ${category.name}`);
      res.status(201).json(successResponse(category, 'Categoria criada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar categoria (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const category = await Category.update(id, req.body);
      await cacheDel('categories:*');

      logger.info(`Categoria atualizada: ${id}`);
      res.json(successResponse(category, 'Categoria atualizada com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar categoria (admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      await Category.delete(id);
      await cacheDel('categories:*');

      logger.info(`Categoria deletada: ${id}`);
      res.json(successResponse(null, 'Categoria deletada com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export default CategoryController;

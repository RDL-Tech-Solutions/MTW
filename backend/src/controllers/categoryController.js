import Category from '../models/Category.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel, cacheDelByPattern } from '../utils/cache.js';

class CategoryController {
  // Listar categorias
  static async list(req, res, next) {
    try {
      // Limpar cache para garantir dados atualizados
      await cacheDel('categories:all');

      logger.info('📊 Buscando categorias com contagem de produtos...');
      const categories = await Category.findAllWithCount();
      logger.info(`✅ ${categories.length} categorias encontradas`);

      // Log das contagens para debug
      categories.forEach(cat => {
        logger.info(`   - ${cat.name} (ID: ${cat.id}): ${cat.product_count} produtos`);
      });

      // Cachear resultado
      await cacheSet('categories:all', categories, CACHE_TTL.CATEGORIES);

      res.json(successResponse(categories));
    } catch (error) {
      logger.error(`❌ Erro ao listar categorias: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
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
      const { name, slug, icon, description, is_active } = req.body;

      if (!name) {
        return res.status(400).json(
          errorResponse('Nome da categoria é obrigatório', 'VALIDATION_ERROR')
        );
      }

      // Verificar se slug já existe (se fornecido)
      if (slug) {
        const existing = await Category.findBySlug(slug);
        if (existing) {
          return res.status(400).json(
            errorResponse('Slug já existe. Use outro slug ou deixe em branco para gerar automaticamente.', 'SLUG_EXISTS')
          );
        }
      }

      const category = await Category.create({
        name,
        slug,
        icon,
        description,
        is_active
      });
      await cacheDelByPattern('categories:*');

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
      await cacheDelByPattern('categories:*');

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
      await cacheDelByPattern('categories:*');

      logger.info(`Categoria deletada: ${id}`);
      res.json(successResponse(null, 'Categoria deletada com sucesso'));
    } catch (error) {
      next(error);
    }
  }
}

export default CategoryController;

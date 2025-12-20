/**
 * Detector de Categoria
 * Mapeia nomes de categorias para IDs do banco
 */
import logger from '../config/logger.js';
import Category from '../models/Category.js';

class CategoryDetector {
  /**
   * Detectar categoria pelo nome
   * @param {string} categoryName - Nome da categoria
   * @returns {Promise<Object|null>} - Categoria encontrada ou null
   */
  async detectCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string') {
      return null;
    }

    try {
      const normalized = categoryName.toLowerCase().trim();

      // Mapeamento de categorias comuns
      const categoryMap = {
        'eletrônicos': 'electronics',
        'eletronicos': 'electronics',
        'electronics': 'electronics',
        'roupas': 'clothing',
        'clothing': 'clothing',
        'casa': 'home',
        'home': 'home',
        'beleza': 'beauty',
        'beauty': 'beauty',
        'esportes': 'sports',
        'sports': 'sports',
        'livros': 'books',
        'books': 'books',
        'brinquedos': 'toys',
        'toys': 'toys',
        'outros': 'others',
        'others': 'others'
      };

      const slug = categoryMap[normalized] || 'others';

      // Buscar categoria no banco
      const categories = await Category.findAll();
      const category = categories.find(c => c.slug === slug);

      if (category) {
        logger.debug(`✅ Categoria detectada: ${category.name} (${category.slug})`);
        return category;
      }

      // Se não encontrou, retornar categoria "Outros" ou criar uma padrão
      const othersCategory = categories.find(c => c.slug === 'others');
      if (othersCategory) {
        return othersCategory;
      }

      // Se não existe categoria "Outros", retornar primeira categoria disponível
      if (categories.length > 0) {
        logger.warn(`⚠️ Categoria "${categoryName}" não encontrada, usando primeira disponível`);
        return categories[0];
      }

      return null;

    } catch (error) {
      logger.error(`Erro ao detectar categoria: ${error.message}`);
      return null;
    }
  }
}

export default new CategoryDetector();

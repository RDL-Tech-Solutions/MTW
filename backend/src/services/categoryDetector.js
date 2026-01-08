/**
 * Detector de Categoria
 * Mapeia nomes de categorias para IDs do banco
 */
import logger from '../config/logger.js';
import Category from '../models/Category.js';
import openRouterClient from '../ai/openrouterClient.js';

class CategoryDetector {
  /**
   * Detectar categoria usando IA
   * @param {string} productName - Nome do produto
   * @returns {Promise<Object|null>} - Categoria encontrada ou null
   */
  async detectWithAI(productName) {
    if (!productName || typeof productName !== 'string') {
      return this.detectCategory(productName);
    }

    try {
      // 1. Buscar categorias do banco
      const categories = await Category.findAll(true);
      if (!categories || categories.length === 0) {
        return this.detectCategory(productName);
      }

      // 2. Tentar detectar via IA
      const config = await openRouterClient.getConfig();
      if (!config.enabled) {
        logger.debug('🤖 IA desabilitada, usando método antigo de detecção de categoria');
        return this.detectCategory(productName);
      }

      const categoriesList = categories.map(c => `- ${c.name} (slug: ${c.slug})`).join('\n');

      const prompt = `Analise o nome do produto abaixo e escolha a melhor categoria da lista fornecida.
Responda APENAS com o "slug" da categoria escolhida, sem explicações.
Se nenhuma categoria for minimamente parecida, responda "others".

Produto: ${productName}

Categorias Disponíveis:
${categoriesList}`;

      logger.info(`🤖 IA analisando categoria para: ${productName.substring(0, 50)}...`);

      const response = await openRouterClient.makeRequest(prompt, { forceTextMode: true });
      const slug = response.trim().toLowerCase().replace(/['"]/g, '');

      logger.info(`🤖 IA sugeriu categoria: ${slug}`);

      // 3. Buscar a categoria pelo slug retornado
      const category = categories.find(c => c.slug === slug);
      if (category) {
        return category;
      }

      // Fallback para o método antigo se a IA sugerir algo inválido
      logger.warn(`⚠️ IA sugeriu slug inválido: "${slug}". Usando método antigo.`);
      return this.detectCategory(productName);

    } catch (error) {
      logger.error(`❌ Erro na detecção por IA: ${error.message}. Usando método antigo.`);
      return this.detectCategory(productName);
    }
  }

  /**
   * Detectar categoria pelo nome (Método Antigo/Fallback)
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

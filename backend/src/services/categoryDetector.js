/**
 * Serviço de Detecção Automática de Categoria
 * Detecta a categoria de um produto baseado no nome e descrição
 */

import Category from '../models/Category.js';
import logger from '../config/logger.js';

class CategoryDetector {
  constructor() {
    // Mapeamento de palavras-chave para categorias
    this.keywords = {
      'acessorios': [
        'relógio', 'watch', 'pulseira', 'bracelete', 'colar', 'brinco', 'óculos', 'oculos',
        'cinto', 'bolsa', 'mochila', 'carteira', 'estojo', 'case', 'capinha', 'protetor',
        'suporte', 'carregador', 'cabo', 'fone', 'headphone', 'fone de ouvido'
      ],
      'beleza': [
        'maquiagem', 'makeup', 'batom', 'lipstick', 'base', 'foundation', 'pó', 'powder',
        'sombra', 'eyeshadow', 'rimel', 'mascara', 'perfume', 'fragrance', 'creme', 'cream',
        'shampoo', 'condicionador', 'sabonete', 'soap', 'hidratante', 'protetor solar',
        'esmalte', 'nail polish', 'pincel', 'brush', 'esponja', 'sponge', 'demaquilante'
      ],
      'brinquedos': [
        'brinquedo', 'toy', 'boneca', 'doll', 'carrinho', 'car', 'lego', 'bloco',
        'puzzle', 'quebra-cabeça', 'pelúcia', 'stuffed', 'jogo educativo', 'educativo',
        'bicicleta infantil', 'patinete', 'scooter', 'triciclo', 'cama elástica'
      ],
      'casa': [
        'cama', 'bed', 'mesa', 'table', 'cadeira', 'chair', 'sofá', 'sofa', 'poltrona',
        'armário', 'wardrobe', 'estante', 'shelf', 'prateleira', 'rack', 'luminária',
        'lamp', 'lâmpada', 'cortina', 'curtain', 'tapete', 'rug', 'almofada', 'pillow',
        'toalha', 'towel', 'lençol', 'sheet', 'edredom', 'comforter', 'decoração', 'decoration'
      ],
      'eletronicos': [
        'smartphone', 'celular', 'phone', 'tablet', 'smartwatch', 'fitness tracker',
        'fone bluetooth', 'bluetooth', 'caixa de som', 'speaker', 'carregador wireless',
        'wireless charger', 'power bank', 'carregador portátil', 'câmera', 'camera',
        'drone', 'gopro', 'action camera'
      ],
      'esporte': [
        'tênis', 'sneaker', 'chuteira', 'cleat', 'meia esportiva', 'shorts', 'bermuda',
        'camiseta esportiva', 'legging', 'top', 'sports bra', 'equipamento', 'equipment',
        'halter', 'dumbbell', 'peso', 'weight', 'bicicleta', 'bike', 'patinete adulto',
        'skate', 'skateboard', 'patins', 'roller', 'bola', 'ball', 'raquete', 'racket'
      ],
      'games': [
        'playstation', 'xbox', 'nintendo', 'switch', 'ps5', 'ps4', 'xbox series',
        'controle', 'controller', 'joystick', 'gamepad', 'jogo', 'game', 'console',
        'steam deck', 'oculus', 'vr', 'virtual reality', 'realidade virtual'
      ],
      'informatica': [
        'notebook', 'laptop', 'computador', 'computer', 'pc', 'monitor', 'teclado',
        'keyboard', 'mouse', 'mousepad', 'webcam', 'microfone', 'microphone', 'headset',
        'impressora', 'printer', 'scanner', 'roteador', 'router', 'switch', 'hub',
        'ssd', 'hd', 'hard drive', 'memória ram', 'ram', 'processador', 'processor',
        'placa de vídeo', 'graphics card', 'gpu'
      ],
      'livros': [
        'livro', 'book', 'ebook', 'kindle', 'leitor digital', 'e-reader', 'revista',
        'magazine', 'mangá', 'manga', 'quadrinho', 'comic', 'enciclopédia', 'dicionário',
        'dictionary', 'biografia', 'biography', 'romance', 'ficção', 'fiction'
      ],
      'moda': [
        'camiseta', 't-shirt', 'camisa', 'shirt', 'calça', 'pants', 'jeans', 'short',
        'vestido', 'dress', 'saia', 'skirt', 'blusa', 'blouse', 'casaco', 'jacket',
        'jaqueta', 'moletom', 'hoodie', 'suéter', 'sweater', 'cardigan', 'sapato',
        'shoe', 'sandália', 'sandal', 'chinelo', 'flip flop', 'bolsa', 'bag', 'mochila'
      ]
    };

    // Cache de categorias
    this.categoriesCache = null;
  }

  /**
   * Carregar categorias do banco de dados
   */
  async loadCategories() {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }

    try {
      const categories = await Category.findAll(true);
      this.categoriesCache = categories.reduce((acc, cat) => {
        acc[cat.slug] = cat;
        return acc;
      }, {});
      return this.categoriesCache;
    } catch (error) {
      logger.error(`Erro ao carregar categorias: ${error.message}`);
      return {};
    }
  }

  /**
   * Detectar categoria baseado no nome do produto
   */
  async detectCategory(productName, description = '') {
    try {
      const categories = await this.loadCategories();
      const text = `${productName} ${description}`.toLowerCase();

      // Contar matches por categoria
      const scores = {};

      for (const [categorySlug, keywords] of Object.entries(this.keywords)) {
        if (!categories[categorySlug]) continue;

        let score = 0;
        for (const keyword of keywords) {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) {
            score += matches.length;
          }
        }
        if (score > 0) {
          scores[categorySlug] = score;
        }
      }

      // Retornar categoria com maior score
      if (Object.keys(scores).length === 0) {
        logger.debug(`Nenhuma categoria detectada para: ${productName}`);
        return null;
      }

      const bestCategory = Object.entries(scores).reduce((a, b) => 
        scores[a[0]] > scores[b[0]] ? a : b
      );

      const category = categories[bestCategory[0]];
      logger.debug(`Categoria detectada: ${category.name} para produto: ${productName}`);
      return category;
    } catch (error) {
      logger.error(`Erro ao detectar categoria: ${error.message}`);
      return null;
    }
  }

  /**
   * Limpar cache de categorias
   */
  clearCache() {
    this.categoriesCache = null;
  }
}

export default new CategoryDetector();


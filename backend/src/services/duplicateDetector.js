/**
 * Detector de Produtos Duplicados com IA
 * Normaliza nomes e identifica produtos duplicados entre plataformas
 */
import logger from '../config/logger.js';
import openrouterClient from '../ai/openrouterClient.js';
import Product from '../models/Product.js';
import AppSettings from '../models/AppSettings.js';
import supabase from '../config/database.js';

class DuplicateDetector {
  /**
   * Normalizar nome de produto para comparação
   * @param {string} name - Nome do produto
   * @returns {string} - Nome normalizado
   */
  normalizeProductName(name) {
    if (!name || typeof name !== 'string') return '';

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiais
      .replace(/\s+/g, ' ') // Normalizar espaços
      .trim();
  }

  /**
   * Detectar produtos duplicados usando IA
   * @param {Object} product - Produto a verificar
   * @returns {Promise<Object|null>} - Produto canônico se encontrado, null caso contrário
   */
  async detectDuplicate(product) {
    try {
      // Verificar se detecção está habilitada
      const config = await AppSettings.get();
      if (!config.ai_enable_duplicate_detection) {
        logger.debug('⚠️ Detecção de duplicados está desabilitada');
        return null;
      }

      logger.debug(`🔍 Verificando duplicados para: ${product.name?.substring(0, 50)}...`);

      // Buscar produtos similares no banco
      const similarProducts = await this.findSimilarProducts(product);

      if (similarProducts.length === 0) {
        logger.debug(`   ✅ Nenhum produto similar encontrado`);
        return null;
      }

      logger.debug(`   📋 Encontrados ${similarProducts.length} produto(s) similar(is)`);

      // Usar IA para determinar se são realmente duplicados
      const duplicate = await this.compareWithAI(product, similarProducts);

      if (duplicate) {
        logger.info(`   ✅ Duplicado detectado! Produto canônico: ${duplicate.canonical_id}`);
        return duplicate;
      }

      return null;

    } catch (error) {
      logger.error(`❌ Erro ao detectar duplicado: ${error.message}`);
      return null; // Não falhar o fluxo por causa de erro na detecção
    }
  }

  /**
   * Buscar produtos similares no banco
   */
  async findSimilarProducts(product) {
    try {
      const normalizedName = this.normalizeProductName(product.name);
      const words = normalizedName.split(' ').filter(w => w.length > 3); // Palavras com mais de 3 caracteres

      if (words.length === 0) {
        return [];
      }

      // Buscar produtos que compartilham palavras-chave importantes
      // Usar busca por similaridade de texto (pg_trgm)
      let query = supabase
        .from('products')
        .select('id, name, platform, external_id, canonical_product_id');
      
      if (product.id) {
        query = query.neq('id', product.id); // Excluir o próprio produto
      }
      
      if (product.platform) {
        query = query.neq('platform', product.platform); // Buscar em outras plataformas
      }
      
      query = query.limit(20);
      
      const { data, error } = await query;

      if (error) throw error;

      // Filtrar por similaridade de nome
      const similar = (data || []).filter(p => {
        const otherNormalized = this.normalizeProductName(p.name);
        const otherWords = otherNormalized.split(' ').filter(w => w.length > 3);
        
        // Calcular similaridade simples (palavras em comum)
        const commonWords = words.filter(w => otherWords.includes(w));
        const similarity = commonWords.length / Math.max(words.length, otherWords.length);
        
        return similarity >= 0.5; // 50% de palavras em comum
      });

      return similar;

    } catch (error) {
      logger.error(`Erro ao buscar produtos similares: ${error.message}`);
      return [];
    }
  }

  /**
   * Comparar produtos com IA para determinar se são duplicados
   */
  async compareWithAI(product, similarProducts) {
    try {
      const prompt = `Você é um especialista em e-commerce. Determine se dois produtos são o MESMO produto vendido em plataformas diferentes.

PRODUTO 1:
Nome: ${product.name}
Plataforma: ${product.platform}
Preço: R$ ${product.current_price}

PRODUTOS SIMILARES:
${similarProducts.map((p, i) => `${i + 1}. Nome: ${p.name} | Plataforma: ${p.platform}`).join('\n')}

INSTRUÇÕES:
- Compare o Produto 1 com cada produto similar
- Determine se são o MESMO produto (mesma marca, modelo, especificações)
- Ignore diferenças de preço, cor ou variações menores
- Considere duplicado apenas se for claramente o mesmo item

Retorne APENAS JSON válido:
{
  "is_duplicate": true|false,
  "canonical_product_id": "uuid do produto canônico (primeiro encontrado) ou null",
  "similarity_score": 0.0-100.0,
  "reason": "explicação da decisão"
}`;

      const aiResponse = await openrouterClient.makeRequest(prompt);

      if (aiResponse.is_duplicate && aiResponse.canonical_product_id) {
        return {
          canonical_id: aiResponse.canonical_product_id,
          similarity_score: aiResponse.similarity_score || 0.0,
          reason: aiResponse.reason || 'IA identificou como duplicado'
        };
      }

      return null;

    } catch (error) {
      logger.error(`Erro ao comparar com IA: ${error.message}`);
      return null;
    }
  }

  /**
   * Criar ou atualizar relação de duplicados
   */
  async createDuplicateRelation(canonicalId, duplicateId, similarityScore) {
    try {
      const { data, error } = await supabase
        .from('product_duplicates')
        .insert([{
          canonical_product_id: canonicalId,
          duplicate_product_id: duplicateId,
          similarity_score: similarityScore,
          detection_method: 'ai'
        }])
        .select()
        .single();

      if (error && error.code !== '23505') { // Ignorar erro de duplicata
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Erro ao criar relação de duplicado: ${error.message}`);
      return null;
    }
  }
}

export default new DuplicateDetector();



/**
 * Editor de Publicação com IA
 * Reescreve títulos, gera descrições, classifica categorias e define prioridades
 */
import logger from '../config/logger.js';
import openrouterClient from './openrouterClient.js';
import AppSettings from '../models/AppSettings.js';
import categoryDetector from '../services/categoryDetector.js';

class ProductEditor {
  /**
   * Editar produto antes da publicação
   * @param {Object} product - Produto original
   * @returns {Promise<Object>} - Produto editado com melhorias da IA
   */
  async editProduct(product) {
    try {
      // Verificar se IA está habilitada
      const config = await AppSettings.get();
      if (!config.ai_enable_product_editing) {
        logger.debug('⚠️ Edição de produtos por IA está desabilitada');
        return product; // Retornar produto original sem edições
      }

      logger.info(`🤖 Editando produto com IA: ${product.name?.substring(0, 50)}...`);

      const startTime = Date.now();

      // Preparar prompt para edição
      const prompt = this.generateEditPrompt(product);

      // Fazer requisição para IA
      const aiResponse = await openrouterClient.makeRequest(prompt);

      // Processar resposta da IA
      const editedProduct = this.processAIResponse(product, aiResponse);

      const processingTime = Date.now() - startTime;

      // Logar decisão da IA
      try {
        const AIDecisionLog = (await import('../models/AIDecisionLog.js')).default;
        await AIDecisionLog.create({
          entity_type: 'product',
          entity_id: product.id,
          decision_type: 'editing',
          confidence_score: editedProduct.ai_confidence || null,
          decision_reason: editedProduct.ai_decision_reason || null,
          input_data: {
            original_name: product.name,
            original_price: product.current_price,
            platform: product.platform
          },
          output_data: {
            optimized_title: editedProduct.ai_optimized_title,
            generated_description: editedProduct.ai_generated_description?.substring(0, 100),
            detected_category: editedProduct.ai_detected_category_id,
            offer_priority: editedProduct.offer_priority
          },
          processing_time_ms: processingTime,
          success: true
        });
      } catch (logError) {
        logger.warn(`⚠️ Erro ao salvar log de edição: ${logError.message}`);
      }

      logger.info(`✅ Produto editado pela IA em ${processingTime}ms`);
      return editedProduct;

    } catch (error) {
      logger.error(`❌ Erro ao editar produto com IA: ${error.message}`);
      // Retornar produto original em caso de erro (fallback)
      return product;
    }
  }

  /**
   * Gerar prompt para edição de produto
   */
  generateEditPrompt(product) {
    return `Você é um especialista em marketing e e-commerce. Sua tarefa é otimizar informações de produtos para publicação.

PRODUTO ORIGINAL:
Nome: ${product.name || 'N/A'}
Preço: R$ ${product.current_price || 0}
Preço Original: ${product.old_price ? `R$ ${product.old_price}` : 'N/A'}
Desconto: ${product.discount_percentage || 0}%
Plataforma: ${product.platform || 'N/A'}
Categoria Atual: ${product.category_name || 'N/A'}

INSTRUÇÕES:
1. **TÍTULO OTIMIZADO (ai_optimized_title)**:
   - Reescreva o título de forma CURTA (máximo 60 caracteres)
   - Seja CHAMATIVO e direto
   - Remova emojis excessivos (máximo 1-2 se realmente necessário)
   - Destaque o benefício principal
   - Exemplo: "Notebook Dell i5 8GB - R$ 2.499" (não: "🔥🔥🔥 NOTEBOOK DELL INCRÍVEL 🔥🔥🔥")

2. **DESCRRIÇÃO GERADA (ai_generated_description)**:
   - Gere uma descrição padronizada e profissional (máximo 200 caracteres)
   - Destaque características principais
   - Formato: "Produto [característica 1], [característica 2]. Ideal para [uso]. [Benefício]."

3. **CATEGORIA (ai_detected_category)**:
   - Classifique o produto em uma categoria
   - Opções: Eletrônicos, Roupas, Casa, Beleza, Esportes, Livros, Brinquedos, Outros
   - Retorne apenas o nome da categoria

4. **PRIORIDADE (offer_priority)**:
   - "high": Desconto > 30% OU produto muito popular OU preço muito baixo
   - "medium": Desconto entre 15-30% OU produto interessante
   - "low": Desconto < 15% OU produto comum
   - Retorne apenas: "high", "medium" ou "low"

5. **DECISÕES DE PUBLICAÇÃO**:
   - should_send_push: true se prioridade = "high" OU desconto > 25%
   - should_send_to_bots: true (sempre, a menos que seja muito ruim)
   - is_featured_offer: true se prioridade = "high" E desconto > 30%

Retorne APENAS JSON válido (sem markdown, sem comentários):

{
  "ai_optimized_title": "string",
  "ai_generated_description": "string",
  "ai_detected_category": "string",
  "offer_priority": "high|medium|low",
  "should_send_push": true|false,
  "should_send_to_bots": true|false,
  "is_featured_offer": true|false,
  "ai_decision_reason": "string explicando as decisões"
}`;
  }

  /**
   * Processar resposta da IA e aplicar ao produto
   */
  async processAIResponse(product, aiResponse) {
    const edited = { ...product };

    // Aplicar título otimizado
    if (aiResponse.ai_optimized_title) {
      edited.ai_optimized_title = aiResponse.ai_optimized_title.trim().substring(0, 500);
      logger.debug(`   ✅ Título otimizado: ${edited.ai_optimized_title.substring(0, 50)}...`);
    }

    // Aplicar descrição gerada
    if (aiResponse.ai_generated_description) {
      edited.ai_generated_description = aiResponse.ai_generated_description.trim().substring(0, 1000);
      logger.debug(`   ✅ Descrição gerada: ${edited.ai_generated_description.substring(0, 50)}...`);
    }

    // Detectar e aplicar categoria
    if (aiResponse.ai_detected_category) {
      try {
        const detectedCategory = await categoryDetector.detectCategory(aiResponse.ai_detected_category);
        if (detectedCategory) {
          edited.ai_detected_category_id = detectedCategory.id;
          logger.debug(`   ✅ Categoria detectada: ${detectedCategory.name}`);
        }
      } catch (error) {
        logger.warn(`   ⚠️ Erro ao detectar categoria: ${error.message}`);
      }
    }

    // Aplicar prioridade
    if (aiResponse.offer_priority && ['low', 'medium', 'high'].includes(aiResponse.offer_priority)) {
      edited.offer_priority = aiResponse.offer_priority;
      logger.debug(`   ✅ Prioridade: ${edited.offer_priority}`);
    } else {
      edited.offer_priority = 'medium'; // Default
    }

    // Aplicar decisões de publicação
    edited.should_send_push = aiResponse.should_send_push === true;
    edited.should_send_to_bots = aiResponse.should_send_to_bots !== false; // Default true
    edited.is_featured_offer = aiResponse.is_featured_offer === true;

    // Salvar motivo da decisão
    if (aiResponse.ai_decision_reason) {
      edited.ai_decision_reason = aiResponse.ai_decision_reason;
    }

    // Adicionar ao histórico de edições
    if (!edited.ai_edit_history) {
      edited.ai_edit_history = [];
    }
    edited.ai_edit_history.push({
      timestamp: new Date().toISOString(),
      action: 'ai_edit',
      changes: {
        title: edited.ai_optimized_title ? { old: product.name, new: edited.ai_optimized_title } : null,
        description: edited.ai_generated_description ? { old: product.description, new: edited.ai_generated_description } : null,
        category: edited.ai_detected_category_id ? { old: product.category_id, new: edited.ai_detected_category_id } : null,
        priority: edited.offer_priority ? { old: null, new: edited.offer_priority } : null
      }
    });

    return edited;
  }

  /**
   * Verificar se edição está habilitada
   */
  async isEnabled() {
    try {
      const config = await AppSettings.get();
      return config.ai_enable_product_editing === true;
    } catch (error) {
      logger.error(`Erro ao verificar se edição está habilitada: ${error.message}`);
      return false;
    }
  }
}

export default new ProductEditor();



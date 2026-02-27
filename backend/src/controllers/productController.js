import Product from '../models/Product.js';
import ClickTracking from '../models/ClickTracking.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';

import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import publishService from '../services/autoSync/publishService.js';

class ProductController {
  // Listar produtos
  static async list(req, res, next) {
    try {
      // CACHE REMOVIDO: Direto ao banco
      const result = await Product.findAll(req.query);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  // Obter produto por ID
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      res.json(successResponse(product));
    } catch (error) {
      next(error);
    }
  }

  // Criar produto (admin)
  static async create(req, res, next) {
    try {
      const { schedule_mode, category_id } = req.body;

      // Criar produto (status padrão é 'pending' no modelo)
      const product = await Product.create(req.body);

      logger.info(`Produto criado: ${product.id}`);

      // NOVO: Detectar se categoria foi definida manualmente
      const hasManualCategory = !!category_id;
      if (hasManualCategory) {
        logger.info(`📂 Categoria manual detectada: ${category_id} - IA não poderá alterar`);
      }

      // Buscar dados completos do produto para publicação/agendamento
      const fullProduct = await Product.findById(product.id);

      if (schedule_mode) {
        // MODO AGENDAMENTO: Usar IA para definir melhor horário
        logger.info(`📅 Modo agendamento ativado para: ${product.name}`);

        const schedulerService = (await import('../services/autoSync/schedulerService.js')).default;

        // NOVO: Passar categoria manual para o agendador
        await schedulerService.scheduleProduct(fullProduct, {
          skipAiCategory: hasManualCategory,
          manualCategoryId: category_id
        });

        // Atualizar status para 'approved' (aguardando publicação agendada)
        await Product.update(product.id, { status: 'approved' });

        logger.info(`✅ Produto agendado com IA: ${product.name}`);

        const updatedProduct = await Product.findById(product.id);
        res.status(201).json(successResponse(updatedProduct, 'Produto criado e agendado com IA! Verifique em Agendamentos.'));
      } else {
        // MODO NORMAL: Publicar imediatamente
        // IMPORTANTE: Passar manual: true para ignorar o agendador
        // NOVO: Passar skipAiCategory e manualCategoryId se categoria foi definida manualmente
        const publishResult = await publishService.publishAll(fullProduct, {
          manual: true,
          skipAiCategory: hasManualCategory,
          manualCategoryId: category_id
        });

        // Atualizar status para 'published' após publicação bem-sucedida
        if (publishResult.success) {
          await Product.update(product.id, { status: 'published' });
          logger.info(`✅ Produto publicado automaticamente: ${product.name}`);
        } else {
          // Se a publicação falhou, manter como 'approved' (aprovado mas não publicado)
          await Product.update(product.id, { status: 'approved' });
          logger.warn(`⚠️ Produto aprovado mas publicação falhou: ${product.name}`);
        }

        // Buscar produto atualizado para retornar
        const updatedProduct = await Product.findById(product.id);

        const successMessage = publishResult.success
          ? 'Produto criado e publicado com sucesso'
          : `Produto criado, mas falha na publicação: ${publishResult.reason || 'Verifique os logs'}`;

        res.status(201).json(successResponse(updatedProduct, successMessage));
      }
    } catch (error) {
      next(error);
    }
  }

  // Salvar produto SEM publicar (aparece no app mas não nos canais)
  static async saveOnly(req, res, next) {
    try {
      const { category_id } = req.body;

      // Criar produto com status 'created' (salvo mas não publicado)
      const product = await Product.create({
        ...req.body,
        status: 'created'
      });

      logger.info(`💾 Produto salvo (não publicado): ${product.id} - ${product.name}`);
      logger.info(`   Status: created (aparecerá no app mas não será publicado nos canais)`);

      // Buscar produto completo para retornar
      const fullProduct = await Product.findById(product.id);

      res.status(201).json(successResponse(
        fullProduct,
        'Produto salvo com sucesso! Ele aparecerá no app mas não foi publicado nos canais.'
      ));
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      next(error);
    }
  }

  // Atualizar produto (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.update(id, req.body);

      logger.info(`Produto atualizado: ${id}`);
      res.json(successResponse(product, 'Produto atualizado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar produto (admin)
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      await Product.delete(id);

      logger.info(`Produto deletado: ${id}`);
      res.json(successResponse(null, 'Produto deletado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Deletar múltiplos produtos (admin)
  static async batchDelete(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(
          errorResponse('Lista de IDs inválida', 'INVALID_IDS')
        );
      }

      await Product.deleteMany(ids);

      logger.info(`Produtos deletados em lote: ${ids.length} itens`);
      res.json(successResponse(null, `${ids.length} produtos deletados com sucesso`));
    } catch (error) {
      next(error);
    }
  }

  // Histórico de preços
  static async priceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      const history = await Product.getPriceHistory(id, parseInt(days));
      res.json(successResponse(history));
    } catch (error) {
      next(error);
    }
  }

  // Registrar clique
  static async trackClick(req, res, next) {
    try {
      const { id } = req.params;
      const { coupon_id } = req.body;

      const click = await ClickTracking.create({
        user_id: req.user?.id,
        product_id: id,
        coupon_id
      });

      logger.info(`Clique registrado: produto ${id}`);
      res.json(successResponse(click, 'Clique registrado'));
    } catch (error) {
      next(error);
    }
  }

  // Produtos relacionados
  static async related(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      const products = await Product.findRelated(id, parseInt(limit));
      res.json(successResponse(products));
    } catch (error) {
      next(error);
    }
  }

  // Listar produtos pendentes (admin)
  static async listPending(req, res, next) {
    try {
      logger.info('📋 Buscando produtos pendentes...');
      const result = await Product.findPending(req.query);
      logger.info(`✅ ${result.products?.length || 0} produtos pendentes encontrados`);
      res.json(successResponse(result));
    } catch (error) {
      logger.error(`❌ Erro ao listar produtos pendentes: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      next(error);
    }
  }

  // Aprovar e publicar produto com link de afiliado (admin)
  static async approve(req, res, next) {
    try {
      logger.info(`📥 ========== REQUISIÇÃO RECEBIDA ==========`);
      logger.info(`   Método: ${req.method}`);
      logger.info(`   URL: ${req.url}`);
      logger.info(`   Body completo: ${JSON.stringify(req.body, null, 2)}`);
      logger.info(`   Parâmetros: ${JSON.stringify(req.params, null, 2)}`);
      logger.info(`==========================================`);

      const { id } = req.params;
      const { affiliate_link, coupon_id, category_id, shorten_link, current_price, old_price } = req.body;

      logger.info(`📝 Parâmetros extraídos do body:`);
      logger.info(`   id: ${id}`);
      logger.info(`   affiliate_link: ${affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
      logger.info(`   coupon_id: ${coupon_id || 'NÃO DEFINIDO'}`);
      logger.info(`   category_id: ${category_id || 'NÃO DEFINIDO'}`);
      logger.info(`   shorten_link: ${shorten_link} (tipo: ${typeof shorten_link})`);

      if (!affiliate_link || !affiliate_link.trim()) {
        return res.status(400).json(
          errorResponse('Link de afiliado é obrigatório', 'MISSING_AFFILIATE_LINK')
        );
      }

      // Encurtar link se solicitado
      let finalAffiliateLink = affiliate_link.trim();

      // Verificar se encurtamento foi solicitado (aceitar true, 'true', 1, '1')
      const shouldShorten = shorten_link === true ||
        shorten_link === 'true' ||
        shorten_link === 1 ||
        shorten_link === '1' ||
        String(shorten_link).toLowerCase() === 'true';

      logger.info(`🔗 ========== PROCESSANDO ENCURTAMENTO ==========`);
      logger.info(`   Parâmetro shorten_link recebido: ${JSON.stringify(shorten_link)}`);
      logger.info(`   Tipo do parâmetro: ${typeof shorten_link}`);
      logger.info(`   shouldShorten calculado: ${shouldShorten}`);
      logger.info(`   Link original: ${affiliate_link.substring(0, 100)}...`);
      logger.info(`===============================================`);

      if (shouldShorten) {
        logger.info(`🔗 ✅ Encurtamento SOLICITADO. Iniciando processo...`);
        logger.info(`   Link a encurtar: ${affiliate_link.substring(0, 100)}...`);

        try {
          const urlShortener = (await import('../services/urlShortener.js')).default;
          logger.info(`   📞 Chamando urlShortener.shorten()...`);

          const shortenedUrl = await urlShortener.shorten(affiliate_link.trim());

          logger.info(`   📥 Resposta do urlShortener: ${shortenedUrl}`);
          logger.info(`   🔍 Comparando URLs:`);
          logger.info(`      Original: ${affiliate_link.trim()}`);
          logger.info(`      Encurtado: ${shortenedUrl}`);
          logger.info(`      São diferentes: ${shortenedUrl !== affiliate_link.trim()}`);

          // Verificar se a URL foi realmente encurtada
          // O serviço urlShortener já normaliza a URL (adiciona https:// se necessário)
          if (shortenedUrl && shortenedUrl !== affiliate_link.trim()) {
            // Validar se é uma URL válida
            try {
              new URL(shortenedUrl);
              finalAffiliateLink = shortenedUrl;
              logger.info(`✅ ✅ ✅ Link encurtado com SUCESSO!`);
              logger.info(`   Original: ${affiliate_link.substring(0, 80)}...`);
              logger.info(`   Encurtado: ${finalAffiliateLink}`);
            } catch (e) {
              logger.error(`❌ URL encurtada não é válida: ${shortenedUrl}`);
              logger.error(`   Erro de validação: ${e.message}`);
              logger.warn(`⚠️ Usando link original devido a URL inválida`);
              finalAffiliateLink = affiliate_link.trim();
            }
          } else {
            logger.warn(`⚠️ ⚠️ ⚠️ URL NÃO foi encurtada (retornou original ou vazio)`);
            logger.warn(`   Original: ${affiliate_link.substring(0, 80)}...`);
            logger.warn(`   Retornado: ${shortenedUrl || 'VAZIO'}`);
            logger.warn(`   Motivo: ${!shortenedUrl ? 'Resposta vazia' : 'URL retornada é igual à original'}`);
            finalAffiliateLink = affiliate_link.trim();
          }
        } catch (error) {
          logger.error(`❌ ❌ ❌ ERRO ao encurtar link:`);
          logger.error(`   Mensagem: ${error.message}`);
          logger.error(`   Stack: ${error.stack}`);
          if (error.response) {
            logger.error(`   Status HTTP: ${error.response.status}`);
            logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
          }
          // Continuar com o link original se falhar
          logger.warn(`⚠️ Usando link original devido ao erro no encurtamento`);
          finalAffiliateLink = affiliate_link.trim();
        }
      } else {
        logger.info(`ℹ️ Encurtamento NÃO solicitado`);
        logger.info(`   shorten_link: ${shorten_link} (tipo: ${typeof shorten_link})`);
        logger.info(`   shouldShorten: ${shouldShorten}`);
      }

      logger.info(`🔗 ========== RESULTADO FINAL ==========`);
      logger.info(`   finalAffiliateLink: ${finalAffiliateLink.substring(0, 100)}...`);
      logger.info(`   É encurtado: ${finalAffiliateLink !== affiliate_link.trim() ? 'SIM ✅' : 'NÃO ❌'}`);
      logger.info(`========================================`);

      // Buscar produto
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      if (product.status !== 'pending') {
        return res.status(400).json(
          errorResponse('Produto já foi processado', 'PRODUCT_ALREADY_PROCESSED')
        );
      }

      // Log do link que será usado
      logger.info(`📝 Link que será salvo no banco: ${finalAffiliateLink.substring(0, 100)}...`);
      logger.info(`   É link encurtado: ${finalAffiliateLink !== affiliate_link.trim() ? 'SIM' : 'NÃO'}`);

      // Calcular preço final com cupom se fornecido
      let finalPrice = product.current_price;
      let updateData = {
        affiliate_link: finalAffiliateLink, // IMPORTANTE: Usar link encurtado se aplicável
        status: 'approved'
      };

      if (category_id) {
        updateData.category_id = category_id;
        logger.info(`📂 Categoria atualizada: ${category_id}`);
      }

      // Atualizar preços se editados
      if (current_price !== undefined && !isNaN(parseFloat(current_price))) {
        updateData.current_price = parseFloat(current_price);
        logger.info(`💰 Preço atual atualizado: R$ ${current_price}`);
      }

      if (old_price !== undefined && !isNaN(parseFloat(old_price))) {
        updateData.old_price = parseFloat(old_price);
        logger.info(`💰 Preço antigo atualizado: R$ ${old_price}`);

        // Recalcular desconto se ambos os preços foram fornecidos
        if (updateData.current_price && updateData.old_price > updateData.current_price) {
          const discountPercent = Math.round(((updateData.old_price - updateData.current_price) / updateData.old_price) * 100);
          updateData.discount_percentage = discountPercent;
          logger.info(`📊 Desconto recalculado: ${discountPercent}%`);
        }
      }

      logger.info(`📝 updateData.affiliate_link: ${updateData.affiliate_link.substring(0, 100)}...`);

      if (coupon_id) {
        // Buscar cupom
        const Coupon = (await import('../models/Coupon.js')).default;
        const coupon = await Coupon.findById(coupon_id);

        if (coupon && coupon.is_active) {
          // Verificar se cupom é válido
          const now = new Date();
          const validFrom = new Date(coupon.valid_from);
          const validUntil = new Date(coupon.valid_until);

          if (now >= validFrom && now <= validUntil) {
            // Calcular preço final com cupom
            const currentPrice = product.current_price || 0;

            if (coupon.discount_type === 'percentage') {
              // Desconto percentual: preço - (preço * desconto%)
              finalPrice = currentPrice - (currentPrice * (coupon.discount_value / 100));
            } else {
              // Desconto fixo: preço - valor fixo
              finalPrice = Math.max(0, currentPrice - coupon.discount_value);
            }

            // Aplicar limite máximo de desconto se existir
            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentPrice - finalPrice;
              if (discountAmount > coupon.max_discount_value) {
                finalPrice = currentPrice - coupon.max_discount_value;
              }
            }

            // Vincular cupom ao produto
            updateData.coupon_id = coupon_id;

            logger.info(`💰 Preço final calculado: R$ ${product.current_price} → R$ ${finalPrice.toFixed(2)} (cupom: ${coupon.code})`);
          } else {
            logger.warn(`⚠️ Cupom ${coupon_id} não está válido no momento`);
          }
        } else {
          logger.warn(`⚠️ Cupom ${coupon_id} não encontrado ou inativo`);
        }
      }

      // Aprovar produto com link de afiliado e cupom
      // IMPORTANTE: Passar finalAffiliateLink (link encurtado) como segundo parâmetro
      logger.info(`📝 Chamando Product.approve com link: ${finalAffiliateLink.substring(0, 100)}...`);
      const approvedProduct = await Product.approve(id, finalAffiliateLink, updateData);
      logger.info(`✅ Produto aprovado. Link salvo: ${approvedProduct.affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);

      // Buscar produto completo para publicação
      // IMPORTANTE: Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      const fullProduct = await Product.findById(id);

      // Log do link antes de atualizar
      logger.info(`📝 Link no produto ANTES de atualizar (do banco): ${fullProduct.affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
      logger.info(`📝 Link que SERÁ usado na publicação (finalAffiliateLink): ${finalAffiliateLink.substring(0, 100)}...`);
      logger.info(`📝 Link original recebido (affiliate_link): ${affiliate_link.substring(0, 100)}...`);
      logger.info(`📝 Link é encurtado: ${finalAffiliateLink !== affiliate_link.trim() ? 'SIM ✅' : 'NÃO ❌'}`);

      // IMPORTANTE: Sempre usar finalAffiliateLink (pode ser encurtado)
      // Atualizar affiliate_link no objeto para publicação
      fullProduct.affiliate_link = finalAffiliateLink;

      // Log após atualizar
      logger.info(`📝 Link no produto APÓS atualizar (fullProduct.affiliate_link): ${fullProduct.affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
      logger.info(`📝 Confirmando: Link no fullProduct é encurtado: ${fullProduct.affiliate_link !== affiliate_link.trim() ? 'SIM ✅' : 'NÃO ❌'}`);

      // IMPORTANTE: Garantir que coupon_id e category_id estão definidos no fullProduct
      if (category_id) {
        fullProduct.category_id = category_id;
        logger.info(`📂 Categoria vinculada ao produto para publicação: ${category_id}`);
      }

      if (coupon_id) {
        fullProduct.coupon_id = coupon_id;
        logger.info(`🎟️ Cupom vinculado ao produto para publicação: ${coupon_id}`);

        if (finalPrice !== product.current_price) {
          // Armazenar preço final calculado (será usado no bot e app)
          fullProduct.final_price = finalPrice;
          fullProduct.price_with_coupon = finalPrice;
          logger.info(`💰 Preço com cupom definido: R$ ${finalPrice.toFixed(2)}`);
        }
      }

      // Log estado completo do produto antes de publicar
      logger.info(`📦 ========== ESTADO DO PRODUTO ANTES DE PUBLICAR ==========`);
      logger.info(`   ID: ${fullProduct.id}`);
      logger.info(`   Nome: ${fullProduct.name}`);
      logger.info(`   category_id: ${fullProduct.category_id || 'NÃO DEFINIDO'}`);
      logger.info(`   coupon_id: ${fullProduct.coupon_id || 'NÃO DEFINIDO'}`);
      logger.info(`   affiliate_link: ${fullProduct.affiliate_link?.substring(0, 80) || 'NÃO DEFINIDO'}...`);
      logger.info(`   final_price: ${fullProduct.final_price || 'NÃO DEFINIDO'}`);
      logger.info(`   price_with_coupon: ${fullProduct.price_with_coupon || 'NÃO DEFINIDO'}`);
      logger.info(`   current_price: ${fullProduct.current_price}`);
      logger.info(`   Template esperado: ${fullProduct.coupon_id ? 'promotion_with_coupon ✅' : 'new_promotion'}`);
      logger.info(`===========================================================`);

      // Publicar e notificar (agora com edição de IA, score e detecção de duplicados)
      // Passar skipAiCategory: true se a categoria foi definida manualmente
      // Passar manualCategoryId explicitamente para garantir
      // IMPORTANTE: manual: true garante publicação imediata sem passar pelo agendador
      const publishResult = await publishService.publishAll(fullProduct, {
        skipAiCategory: !!category_id,
        manualCategoryId: category_id,
        manual: true
      });

      // Atualizar status para 'published' apenas se a publicação foi bem-sucedida ou agendada
      if (publishResult.success) {
        await Product.update(id, { status: 'published' });
        logger.info(`✅ Produto aprovado e publicado: ${fullProduct.name}${coupon_id ? ` com cupom (preço final: R$ ${finalPrice.toFixed(2)})` : ''}`);
      } else {
        // Se falhou por algum motivo (ex: duplicado), o status ficará como approved mas não published
        const detailedReason = publishResult.reason || 'Erro desconhecido';
        logger.warn(`⚠️ Produto aprovado mas NÃO publicado: ${fullProduct.name}. Motivo: ${detailedReason}`);
      }

      res.json(successResponse({
        product: approvedProduct,
        publishResult,
        final_price: coupon_id ? finalPrice : null
      }, publishResult.success ? 'Produto aprovado e publicado com sucesso' : `Produto aprovado, mas não publicado: ${publishResult.reason || 'Verifique os logs'}`));
    } catch (error) {
      logger.error(`❌ Erro ao aprovar produto: ${error.message}`);
      next(error);
    }
  }

  // Aprovar e AGENDAR produto com IA (admin)
  // Diferente do approve normal, este não publica imediatamente - a IA decide o melhor horário
  static async approveAndSchedule(req, res, next) {
    try {
      logger.info(`📅 ========== APROVAR E AGENDAR COM IA ==========`);

      const { id } = req.params;
      const { affiliate_link, coupon_id, category_id, shorten_link } = req.body;

      if (!affiliate_link || !affiliate_link.trim()) {
        return res.status(400).json(
          errorResponse('Link de afiliado é obrigatório', 'MISSING_AFFILIATE_LINK')
        );
      }

      // Encurtar link se solicitado
      let finalAffiliateLink = affiliate_link.trim();
      const shouldShorten = shorten_link === true || shorten_link === 'true' || shorten_link === 1 || shorten_link === '1';

      if (shouldShorten) {
        try {
          const urlShortener = (await import('../services/urlShortener.js')).default;
          const shortenedUrl = await urlShortener.shorten(affiliate_link.trim());
          if (shortenedUrl && shortenedUrl !== affiliate_link.trim()) {
            new URL(shortenedUrl); // Validar
            finalAffiliateLink = shortenedUrl;
            logger.info(`✅ Link encurtado: ${finalAffiliateLink}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao encurtar link, usando original: ${error.message}`);
        }
      }

      // Buscar produto
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      if (product.status !== 'pending') {
        return res.status(400).json(
          errorResponse('Produto já foi processado', 'PRODUCT_ALREADY_PROCESSED')
        );
      }

      // Preparar dados de atualização
      let updateData = {
        affiliate_link: finalAffiliateLink,
        status: 'approved'
      };

      if (category_id) {
        updateData.category_id = category_id;
      }

      // Processar cupom se fornecido
      let finalPrice = product.current_price;
      if (coupon_id) {
        const Coupon = (await import('../models/Coupon.js')).default;
        const coupon = await Coupon.findById(coupon_id);

        if (coupon && coupon.is_active) {
          const now = new Date();
          const validFrom = new Date(coupon.valid_from);
          const validUntil = new Date(coupon.valid_until);

          if (now >= validFrom && now <= validUntil) {
            const currentPrice = product.current_price || 0;

            if (coupon.discount_type === 'percentage') {
              finalPrice = currentPrice - (currentPrice * (coupon.discount_value / 100));
            } else {
              finalPrice = Math.max(0, currentPrice - coupon.discount_value);
            }

            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentPrice - finalPrice;
              if (discountAmount > coupon.max_discount_value) {
                finalPrice = currentPrice - coupon.max_discount_value;
              }
            }

            updateData.coupon_id = coupon_id;
            logger.info(`💰 Preço com cupom: R$ ${finalPrice.toFixed(2)}`);
          }
        }
      }

      // Aprovar produto
      const approvedProduct = await Product.approve(id, finalAffiliateLink, updateData);
      logger.info(`✅ Produto aprovado: ${approvedProduct.name}`);

      // Buscar produto completo para agendamento
      const fullProduct = await Product.findById(id);
      fullProduct.affiliate_link = finalAffiliateLink;
      if (category_id) fullProduct.category_id = category_id;
      if (coupon_id) {
        fullProduct.coupon_id = coupon_id;
        fullProduct.final_price = finalPrice;
        fullProduct.price_with_coupon = finalPrice;
      }

      // AGENDAR COM IA (não publicar imediatamente)
      const schedulerService = (await import('../services/autoSync/schedulerService.js')).default;
      await schedulerService.scheduleProduct(fullProduct);

      logger.info(`📅 ✅ Produto agendado com IA: ${fullProduct.name}`);
      logger.info(`   Verifique em /scheduled-posts para ver o horário definido pela IA`);

      res.json(successResponse({
        product: approvedProduct,
        scheduled: true,
        final_price: coupon_id ? finalPrice : null,
        message: 'Produto aprovado e agendado! A IA definiu o melhor horário para publicação.'
      }, 'Produto aprovado e agendado com IA'));
    } catch (error) {
      logger.error(`❌ Erro ao aprovar e agendar produto: ${error.message}`);
      next(error);
    }
  }

  static async reject(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Buscar produto
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      if (product.status !== 'pending') {
        return res.status(400).json(
          errorResponse('Produto já foi processado', 'PRODUCT_ALREADY_PROCESSED')
        );
      }

      // Rejeitar produto
      await Product.update(id, {
        status: 'rejected',
        // Opcional: salvar motivo da rejeição se houver campo para isso
      });

      logger.info(`❌ Produto rejeitado: ${product.name}${reason ? ` - Motivo: ${reason}` : ''}`);

      res.json(successResponse(null, 'Produto rejeitado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao rejeitar produto: ${error.message}`);
      next(error);
    }
  }

  // Aprovar produto SEM publicar (apenas aprovar e aparecer no app)
  static async approveOnly(req, res, next) {
    try {
      const { id } = req.params;
      const { affiliate_link, coupon_id, category_id, shorten_link, current_price, old_price } = req.body;

      logger.info(`✅ ========== APROVAR SEM PUBLICAR ==========`);
      logger.info(`   Produto ID: ${id}`);
      logger.info(`   affiliate_link: ${affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
      logger.info(`   coupon_id: ${coupon_id || 'NÃO DEFINIDO'}`);
      logger.info(`   category_id: ${category_id || 'NÃO DEFINIDO'}`);

      if (!affiliate_link || !affiliate_link.trim()) {
        return res.status(400).json(
          errorResponse('Link de afiliado é obrigatório', 'MISSING_AFFILIATE_LINK')
        );
      }

      // Encurtar link se solicitado
      let finalAffiliateLink = affiliate_link.trim();
      const shouldShorten = shorten_link === true ||
        shorten_link === 'true' ||
        shorten_link === 1 ||
        shorten_link === '1' ||
        String(shorten_link).toLowerCase() === 'true';

      if (shouldShorten) {
        try {
          const urlShortener = (await import('../services/urlShortener.js')).default;
          const shortenedUrl = await urlShortener.shorten(affiliate_link.trim());
          if (shortenedUrl && shortenedUrl !== affiliate_link.trim()) {
            try {
              new URL(shortenedUrl);
              finalAffiliateLink = shortenedUrl;
              logger.info(`✅ Link encurtado: ${finalAffiliateLink}`);
            } catch (e) {
              logger.warn(`⚠️ URL encurtada inválida, usando original`);
            }
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao encurtar link: ${error.message}`);
        }
      }

      // Buscar produto
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      if (product.status !== 'pending') {
        return res.status(400).json(
          errorResponse('Produto já foi processado', 'PRODUCT_ALREADY_PROCESSED')
        );
      }

      // Preparar dados de atualização
      let updateData = {
        affiliate_link: finalAffiliateLink,
        status: 'approved' // Aprovado mas não publicado
      };

      if (category_id) {
        updateData.category_id = category_id;
        logger.info(`📂 Categoria atualizada: ${category_id}`);
      }

      // Atualizar preços se editados
      if (current_price !== undefined && !isNaN(parseFloat(current_price))) {
        updateData.current_price = parseFloat(current_price);
        logger.info(`💰 Preço atual atualizado: R$ ${current_price}`);
      }

      if (old_price !== undefined && !isNaN(parseFloat(old_price))) {
        updateData.old_price = parseFloat(old_price);
        logger.info(`💰 Preço antigo atualizado: R$ ${old_price}`);

        if (updateData.current_price && updateData.old_price > updateData.current_price) {
          const discountPercent = Math.round(((updateData.old_price - updateData.current_price) / updateData.old_price) * 100);
          updateData.discount_percentage = discountPercent;
          logger.info(`📊 Desconto recalculado: ${discountPercent}%`);
        }
      }

      // Processar cupom se fornecido
      let finalPrice = product.current_price;
      if (coupon_id) {
        const Coupon = (await import('../models/Coupon.js')).default;
        const coupon = await Coupon.findById(coupon_id);

        if (coupon && coupon.is_active) {
          const now = new Date();
          const validFrom = new Date(coupon.valid_from);
          const validUntil = new Date(coupon.valid_until);

          if (now >= validFrom && now <= validUntil) {
            const currentPrice = updateData.current_price || product.current_price || 0;

            if (coupon.discount_type === 'percentage') {
              finalPrice = currentPrice - (currentPrice * (coupon.discount_value / 100));
            } else {
              finalPrice = Math.max(0, currentPrice - coupon.discount_value);
            }

            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentPrice - finalPrice;
              if (discountAmount > coupon.max_discount_value) {
                finalPrice = currentPrice - coupon.max_discount_value;
              }
            }

            updateData.coupon_id = coupon_id;
            logger.info(`💰 Preço com cupom: R$ ${finalPrice.toFixed(2)}`);
          } else {
            logger.warn(`⚠️ Cupom ${coupon_id} não está válido no momento`);
          }
        } else {
          logger.warn(`⚠️ Cupom ${coupon_id} não encontrado ou inativo`);
        }
      }

      // Aprovar produto SEM publicar
      const approvedProduct = await Product.approve(id, finalAffiliateLink, updateData);
      logger.info(`✅ Produto aprovado (não publicado): ${approvedProduct.name}`);
      logger.info(`   Status: approved (aparecerá no app mas não foi publicado nos canais)`);

      res.json(successResponse({
        product: approvedProduct,
        final_price: coupon_id ? finalPrice : null
      }, 'Produto aprovado! Ele aparecerá no app mas não foi publicado nos canais.'));
    } catch (error) {
      logger.error(`❌ Erro ao aprovar produto: ${error.message}`);
      next(error);
    }
  }

  // Republicar produto (admin)
  static async republish(req, res, next) {
    try {
      const { id } = req.params;
      const { coupon_id } = req.body;

      logger.info(`🔄 Republicando produto ${id}...`);

      // Buscar produto completo (com dados de categoria)
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json(
          errorResponse(ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.NOT_FOUND)
        );
      }

      // Verificar status (permitir apenas aprovados ou já publicados)
      if (product.status !== 'approved' && product.status !== 'published') {
        return res.status(400).json(
          errorResponse('Apenas produtos aprovados ou já publicados podem ser republicados', 'INVALID_STATUS')
        );
      }

      let updateData = {};
      let finalPrice = product.final_price || product.current_price;

      // Se um cupom foi fornecido ou explicitamente removido (null)
      if (coupon_id !== undefined) {
        if (coupon_id) {
          // Buscar cupom
          const Coupon = (await import('../models/Coupon.js')).default;
          const coupon = await Coupon.findById(coupon_id);

          if (coupon && coupon.is_active) {
            // Calcular preço final com cupom
            const currentBasePrice = product.current_price || 0;

            if (coupon.discount_type === 'percentage') {
              finalPrice = currentBasePrice - (currentBasePrice * (coupon.discount_value / 100));
            } else {
              finalPrice = Math.max(0, currentBasePrice - coupon.discount_value);
            }

            // Aplicar limite máximo de desconto se existir
            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentBasePrice - finalPrice;
              if (discountAmount > coupon.max_discount_value) {
                finalPrice = currentBasePrice - coupon.max_discount_value;
              }
            }

            updateData.coupon_id = coupon_id;

            logger.info(`🎟️ Cupom vinculado na republicação: ${coupon.code}. Novo preço final: R$ ${finalPrice.toFixed(2)}`);
          } else {
            return res.status(400).json(errorResponse('Cupom inválido ou inativo', 'INVALID_COUPON'));
          }
        } else {
          // Remover cupom
          updateData.coupon_id = null;
          finalPrice = product.current_price;
          logger.info(`🎟️ Cupom removido na republicação`);
        }
      }

      // Atualizar no banco se houver mudanças
      if (Object.keys(updateData).length > 0) {
        await Product.update(id, updateData);
        // Atualizar objeto em memória para publicação
        Object.assign(product, updateData);
      }

      // Garantir que os campos virtuais de preço estejam corretos no objeto de publicação
      product.final_price = finalPrice;
      product.price_with_coupon = product.coupon_id ? finalPrice : null;

      // Publicar imediato (ignore o scheduler da IA para republicação manual)
      logger.info(`📤 Disparando republicação imediata para ${product.name}`);
      const publishResult = await publishService.publishAll(product, {
        manual: true,
        // Ao republicar, garantimos que mantemos a categoria atual
        manualCategoryId: product.category_id,
        skipAiCategory: true
      });

      if (publishResult.success) {
        // Garantir status 'published'
        await Product.update(id, { status: 'published' });
        logger.info(`✅ Produto republicado com sucesso.`);
      } else {
        logger.warn(`⚠️ Falha ao republicar: ${publishResult.reason || 'Erro desconhecido'}`);
      }

      res.json(successResponse({
        publishResult,
        product
      }, publishResult.success ? 'Produto republicado com sucesso' : `Produto republicado, mas houve falha no envio: ${publishResult.reason || 'Verifique os logs'}`));

    } catch (error) {
      logger.error(`❌ Erro ao republicar produto: ${error.message}`);
      next(error);
    }
  }

  // Estatísticas de produtos
  static async getStats(req, res, next) {
    try {
      const stats = await Product.getStats();
      res.json(successResponse(stats));
    } catch (error) {
      logger.error(`❌ Erro ao buscar estatísticas: ${error.message}`);
      next(error);
    }
  }

  // Captura em lote de produtos (admin)
  static async batchCapture(req, res, next) {
    try {
      const { urls } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json(
          errorResponse('Lista de URLs é obrigatória', 'MISSING_URLS')
        );
      }

      // Limitar quantidade de URLs por vez (máximo 50)
      if (urls.length > 50) {
        return res.status(400).json(
          errorResponse('Máximo de 50 URLs por vez', 'TOO_MANY_URLS')
        );
      }

      logger.info(`📦 Iniciando captura em lote de ${urls.length} produtos...`);

      const results = [];
      const linkAnalyzer = (await import('../services/linkAnalyzer.js')).default;

      // Processar cada URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim();
        
        if (!url) {
          results.push({
            url: url,
            success: false,
            error: 'URL vazia'
          });
          continue;
        }

        try {
          logger.info(`📥 [${i + 1}/${urls.length}] Processando: ${url.substring(0, 80)}...`);

          // Validar URL
          try {
            new URL(url);
          } catch {
            results.push({
              url: url,
              success: false,
              error: 'URL inválida'
            });
            continue;
          }

          // Detectar plataforma
          const platform = linkAnalyzer.detectPlatform(url);
          
          if (platform === 'unknown') {
            results.push({
              url: url,
              success: false,
              error: 'Plataforma não suportada'
            });
            continue;
          }

          logger.info(`   🏪 Plataforma detectada: ${platform}`);

          // Extrair informações do produto usando analyzeLink
          const productInfo = await linkAnalyzer.analyzeLink(url);

          if (!productInfo || !productInfo.name) {
            results.push({
              url: url,
              success: false,
              error: 'Não foi possível extrair informações do produto'
            });
            continue;
          }

          // Criar produto com status 'pending'
          const product = await Product.create({
            name: productInfo.name,
            description: productInfo.description || '',
            current_price: productInfo.currentPrice || 0,
            old_price: productInfo.oldPrice || 0,
            discount_percentage: productInfo.discountPercentage || 0,
            image_url: productInfo.imageUrl || '',
            platform: productInfo.platform || platform,
            original_link: url,
            affiliate_link: productInfo.affiliateLink || url,
            external_id: productInfo.productId || `batch_${Date.now()}_${i}`, // ID externo ou gerado
            status: 'pending' // Salvar como pendente
          });

          logger.info(`   ✅ Produto capturado: ${product.name} (ID: ${product.id})`);

          results.push({
            url: url,
            success: true,
            product: {
              id: product.id,
              name: product.name,
              platform: platform,
              current_price: product.current_price
            }
          });

        } catch (error) {
          logger.error(`   ❌ Erro ao processar URL ${url}: ${error.message}`);
          results.push({
            url: url,
            success: false,
            error: error.message || 'Erro desconhecido'
          });
        }
      }

      // Contar sucessos e falhas
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.info(`✅ Captura em lote concluída: ${successCount} sucessos, ${failureCount} falhas`);

      res.json(successResponse({
        total: urls.length,
        success: successCount,
        failed: failureCount,
        results: results
      }, `Captura concluída: ${successCount} produtos capturados, ${failureCount} falhas`));

    } catch (error) {
      logger.error(`❌ Erro na captura em lote: ${error.message}`);
      next(error);
    }
  }
}

export default ProductController;

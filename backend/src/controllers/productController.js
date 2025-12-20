import Product from '../models/Product.js';
import ClickTracking from '../models/ClickTracking.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { ERROR_MESSAGES, ERROR_CODES } from '../config/constants.js';
import { cacheGet, cacheSet, cacheDel, cacheDelByPattern } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';
import notificationDispatcher from '../services/bots/notificationDispatcher.js';
import publishService from '../services/autoSync/publishService.js';

class ProductController {
  // Listar produtos
  static async list(req, res, next) {
    try {
      const cacheKey = `products:${JSON.stringify(req.query)}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        return res.json(successResponse(cached));
      }

      const result = await Product.findAll(req.query);
      await cacheSet(cacheKey, result, CACHE_TTL.PRODUCTS);

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
      // Criar produto (status padrão é 'pending' no modelo)
      const product = await Product.create(req.body);
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

      logger.info(`Produto criado: ${product.id}`);

      // Buscar dados completos do produto para publicação
      const fullProduct = await Product.findById(product.id);

      // Publicar e notificar automaticamente (como era antes)
      const publishResult = await publishService.publishAll(fullProduct);

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

      res.status(201).json(successResponse(updatedProduct, 'Produto criado e publicado com sucesso'));
    } catch (error) {
      next(error);
    }
  }

  // Atualizar produto (admin)
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const product = await Product.update(id, req.body);
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

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
      await cacheDelByPattern('products:*');
      await cacheDelByPattern('categories:*'); // Limpar cache de categorias também

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
      await cacheDelByPattern('products:*');

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
      const { affiliate_link, coupon_id, shorten_link } = req.body;
      
      logger.info(`📝 Parâmetros extraídos do body:`);
      logger.info(`   id: ${id}`);
      logger.info(`   affiliate_link: ${affiliate_link?.substring(0, 100) || 'NÃO DEFINIDO'}...`);
      logger.info(`   coupon_id: ${coupon_id || 'NÃO DEFINIDO'}`);
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
      if (coupon_id && finalPrice !== product.current_price) {
        // Armazenar preço final calculado (será usado no bot e app)
        fullProduct.final_price = finalPrice;
        fullProduct.price_with_coupon = finalPrice;
      }

      // Publicar e notificar (agora com edição de IA, score e detecção de duplicados)
      const publishResult = await publishService.publishAll(fullProduct);

      // Atualizar status para 'published'
      await Product.update(id, { status: 'published' });

      // Limpar cache
      await cacheDelByPattern('products:*');

      logger.info(`✅ Produto aprovado e publicado: ${fullProduct.name}${coupon_id ? ` com cupom (preço final: R$ ${finalPrice.toFixed(2)})` : ''}`);

      res.json(successResponse({
        product: approvedProduct,
        publishResult,
        final_price: coupon_id ? finalPrice : null
      }, 'Produto aprovado e publicado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao aprovar produto: ${error.message}`);
      next(error);
    }
  }

  // Rejeitar produto pendente (admin)
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

      // Limpar cache
      await cacheDelByPattern('products:*');

      logger.info(`❌ Produto rejeitado: ${product.name}${reason ? ` - Motivo: ${reason}` : ''}`);

      res.json(successResponse(null, 'Produto rejeitado com sucesso'));
    } catch (error) {
      logger.error(`❌ Erro ao rejeitar produto: ${error.message}`);
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
}

export default ProductController;

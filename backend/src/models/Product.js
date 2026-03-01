import supabase from '../config/database.js';
import { calculateDiscountPercentage } from '../utils/helpers.js';
import logger from '../config/logger.js';

class Product {
  // Plataformas válidas no banco de dados
  static VALID_PLATFORMS = [
    'shopee',
    'mercadolivre',
    'amazon',
    'aliexpress',
    'kabum',
    'magazineluiza',
    'pichau',
    'general',
    'unknown'
  ];

  // Status válidos no banco de dados
  static VALID_STATUS = ['pending', 'approved', 'published', 'rejected'];

  // Normalizar plataforma para valor válido
  static normalizePlatform(platform) {
    if (!platform) return 'unknown';
    const normalized = platform.toLowerCase().trim();

    // Mapeamento de plataformas conhecidas para valores válidos
    const platformMap = {
      'shopee': 'shopee',
      'mercadolivre': 'mercadolivre',
      'mercado livre': 'mercadolivre',
      'meli': 'mercadolivre',
      'amazon': 'amazon',
      'aliexpress': 'aliexpress',
      'ali express': 'aliexpress',
      'kabum': 'kabum',
      'magazineluiza': 'magazineluiza',
      'magazine luiza': 'magazineluiza',
      'magalu': 'magazineluiza',
      'pichau': 'pichau',
      'general': 'general',
      'unknown': 'unknown'
    };

    // Verificar mapeamento direto
    if (platformMap[normalized]) {
      return platformMap[normalized];
    }

    // Verificar se está na lista de válidas
    if (Product.VALID_PLATFORMS.includes(normalized)) {
      return normalized;
    }

    // Se não for válida, usar 'unknown'
    return 'unknown';
  }

  // Normalizar status para valor válido
  static normalizeStatus(status) {
    if (!status) return 'pending';
    const normalized = status.toLowerCase().trim();

    // Verificar se está na lista de válidos
    if (Product.VALID_STATUS.includes(normalized)) {
      return normalized;
    }

    // Se não for válido, usar 'pending'
    return 'pending';
  }

  // Criar novo produto
  static async create(productData) {
    const {
      name,
      image_url,
      platform,
      current_price,
      old_price,
      category_id,
      coupon_id,
      affiliate_link,
      external_id,
      stock_available = true,
      status = 'pending',
      original_link
    } = productData;

    // Normalizar plataforma e status para valores válidos
    const normalizedPlatform = Product.normalizePlatform(platform);
    const normalizedStatus = Product.normalizeStatus(status);

    const discount_percentage = old_price
      ? calculateDiscountPercentage(old_price, current_price)
      : 0;

    // Se original_link não foi fornecido, usar affiliate_link como original
    const finalOriginalLink = original_link || affiliate_link;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        image_url,
        platform: normalizedPlatform,
        current_price,
        old_price,
        discount_percentage,
        category_id,
        coupon_id,
        affiliate_link,
        external_id,
        stock_available,
        status: normalizedStatus,
        original_link: finalOriginalLink
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Buscar produto por ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (data) {
      try {
        const currentPrice = parseFloat(data.current_price) || 0;
        let bestFinalPrice = currentPrice;
        let applicableCoupons = [];

        // Fetch all active, in-stock coupons
        const Coupon = (await import('./Coupon.js')).default;
        const allCoupons = await Coupon.findActiveApplicable();

        // Check which coupons apply to this product
        for (const coupon of allCoupons) {
          const isDirectlyLinked = data.coupon_id === coupon.id;
          const isListedInApplicable = coupon.applicable_products && coupon.applicable_products.includes(data.id);
          const isGeneralPlatform = coupon.is_general === true && (coupon.platform === 'general' || coupon.platform === data.platform);

          if (isDirectlyLinked || isListedInApplicable || isGeneralPlatform) {
            // IMPORTANTE: Verificar se o produto atende ao valor mínimo de compra do cupom
            const minPurchase = parseFloat(coupon.min_purchase) || 0;
            if (minPurchase > 0 && currentPrice < minPurchase) {
              // Produto não atinge o valor mínimo, pular este cupom
              continue;
            }

            applicableCoupons.push(coupon);

            // Calculate discount for this coupon
            const discountValue = parseFloat(coupon.discount_value) || 0;
            let tempFinalPrice = currentPrice;

            if (coupon.discount_type === 'percentage') {
              tempFinalPrice = currentPrice - (currentPrice * (discountValue / 100));
            } else {
              tempFinalPrice = Math.max(0, currentPrice - discountValue);
            }

            // Apply max discount limit if it exists
            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentPrice - tempFinalPrice;
              if (discountAmount > coupon.max_discount_value) {
                tempFinalPrice = currentPrice - coupon.max_discount_value;
              }
            }

            // Keep track of the best price
            if (tempFinalPrice < bestFinalPrice) {
              bestFinalPrice = tempFinalPrice;
            }
          }
        }

        data.coupons = applicableCoupons;

        if (applicableCoupons.length > 0) {
          data.final_price = parseFloat(bestFinalPrice.toFixed(2));
          data.price_with_coupon = parseFloat(bestFinalPrice.toFixed(2));
        } else {
          // Nenhum cupom ativamente aplicável (esgotado, inativo, pendente, expirado)
          // O preço deve ser o current_price sem descontos adicionais
          data.final_price = currentPrice;
          data.price_with_coupon = currentPrice;
        }

      } catch (e) {
        logger.warn(`Erro ao calcular cupons para produto ${id}: ${e.message}`);
      }
    }

    return data;
  }

  // Buscar produto por external_id
  static async findByExternalId(externalId, platform = null) {
    let query = supabase
      .from('products')
      .select('*')
      .eq('external_id', externalId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Listar produtos com filtros
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        platform,
        min_price,
        max_price,
        min_discount,
        search,
        status,
        coupon_id,
        sort = 'created_at',
        order = 'desc'
      } = filters;

      logger.debug(`🔍 Product.findAll - Filtros: ${JSON.stringify({ page, limit, category, platform, status })}`);

      const offset = (page - 1) * limit;

      let query = supabase
        .from('products_full')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .in('status', ['approved', 'created', 'published']); // Filtrar apenas produtos que devem aparecer no app

    // Aplicar filtros
    if (category) query = query.eq('category_id', category);
    if (platform) query = query.eq('platform', platform);

    // Suporte para buscar produtos que estão vinculados de duas formas:
    // 1. O produto tem o coupon_id definido (relação One-to-Many tradicional)
    // 2. O cupom tem o produto na lista applicable_products (Arrays no PostgreSQL da tabela coupons)
    if (filters.applicable_product_ids && filters.applicable_product_ids.length > 0) {
      if (coupon_id) {
        // Se ambos existirem, buscar os que tem coupon_id = X OU id está na lista
        query = query.or(`coupon_id.eq.${coupon_id},id.in.(${filters.applicable_product_ids.join(',')})`);
      } else {
        // Apenas pela lista de IDs
        query = query.in('id', filters.applicable_product_ids);
      }
    } else if (coupon_id) {
      // Apenas pelo coupon_id tradicional
      query = query.eq('coupon_id', coupon_id);
    }
    if (min_price) query = query.gte('current_price', min_price);
    if (max_price) query = query.lte('current_price', max_price);
    if (min_discount) query = query.gte('discount_percentage', min_discount);
    if (search) query = query.ilike('name', `%${search}%`);

    // Filtro por status (se a coluna existir)
    if (status) {
      try {
        query = query.eq('status', status);
      } catch (e) {
        // Se a coluna status não existir, ignorar o filtro
        logger.debug('Coluna status não encontrada, ignorando filtro');
      }
    }

    // Ordenação
    query = query.order(sort, { ascending: order === 'asc' });

    // Paginação
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      // Log detalhado do erro
      logger.error(`❌ Erro na query do Supabase`);
      logger.error(`   Message: ${error.message || 'N/A'}`);
      logger.error(`   Code: ${error.code || 'N/A'}`);
      logger.error(`   Details: ${error.details || 'N/A'}`);
      logger.error(`   Hint: ${error.hint || 'N/A'}`);
      
      // Log das propriedades do objeto error
      if (typeof error === 'object') {
        logger.error(`   Propriedades do erro:`);
        for (const key in error) {
          if (error.hasOwnProperty(key)) {
            logger.error(`     ${key}: ${error[key]}`);
          }
        }
      }
      
      throw new Error(`Erro do Supabase: ${error.message || error.details || error.code || 'Erro desconhecido'}`);
    }

    logger.debug(`✅ Query executada - ${count} produtos encontrados`);

    // Calcular preço final com cupom para cada produto
    // Novo comportamento dinâmico de múltiplos cupons
    let allCoupons = [];
    try {
      const Coupon = (await import('./Coupon.js')).default;
      allCoupons = await Coupon.findActiveApplicable();
      logger.debug(`📋 ${allCoupons.length} cupons ativos encontrados`);
    } catch (e) {
      logger.warn(`⚠️ Erro ao buscar cupons para calcular precos dinâmicos: ${e.message}`);
    }

    const productsWithFinalPrice = await Promise.all(
      (data || []).map(async (product) => {
        try {
          let applicableCoupons = [];
          const currentPrice = parseFloat(product.current_price) || 0;
          let bestFinalPrice = currentPrice;

          for (const coupon of allCoupons) {
            const isDirectlyLinked = product.coupon_id === coupon.id;
            const isListedInApplicable = coupon.applicable_products && coupon.applicable_products.includes(product.id);
            const isGeneralPlatform = coupon.is_general === true && (coupon.platform === 'general' || coupon.platform === product.platform);

            // Verificar se o cupom é aplicável ao produto
            if (isDirectlyLinked || isListedInApplicable || isGeneralPlatform) {
              // IMPORTANTE: Verificar se o produto atende ao valor mínimo de compra do cupom
              const minPurchase = parseFloat(coupon.min_purchase) || 0;
              if (minPurchase > 0 && currentPrice < minPurchase) {
                // Produto não atinge o valor mínimo, pular este cupom
                continue;
              }

              applicableCoupons.push(coupon);

              const discountValue = parseFloat(coupon.discount_value) || 0;
              let tempFinalPrice = currentPrice;

              if (coupon.discount_type === 'percentage') {
                tempFinalPrice = currentPrice - (currentPrice * (discountValue / 100));
              } else {
                tempFinalPrice = Math.max(0, currentPrice - discountValue);
              }

              if (coupon.max_discount_value && coupon.max_discount_value > 0) {
                const discountAmount = currentPrice - tempFinalPrice;
                if (discountAmount > coupon.max_discount_value) {
                  tempFinalPrice = currentPrice - coupon.max_discount_value;
                }
              }

              if (tempFinalPrice < bestFinalPrice) {
                bestFinalPrice = tempFinalPrice;
              }
            }
          }

          const enrichedProduct = { ...product, coupons: applicableCoupons };

          if (applicableCoupons.length > 0) {
            enrichedProduct.final_price = parseFloat(bestFinalPrice.toFixed(2));
            enrichedProduct.price_with_coupon = parseFloat(bestFinalPrice.toFixed(2));
          } else {
            // Nenhum cupom ativamente vinculável, garantir que o preço volte ao original
            enrichedProduct.final_price = currentPrice;
            enrichedProduct.price_with_coupon = currentPrice;
            // Se o produto possuía um cupom desativado, esconder seus detalhes legados
            enrichedProduct.coupon_id = null;
            enrichedProduct.coupon_discount_value = null;
            enrichedProduct.coupon_discount_type = null;
          }

          return enrichedProduct;
        } catch (productError) {
          logger.error(`❌ Erro ao processar produto ${product.id}: ${productError.message}`);
          // Retornar produto sem processamento de cupom em caso de erro
          return {
            ...product,
            coupons: [],
            final_price: parseFloat(product.current_price) || 0,
            price_with_coupon: parseFloat(product.current_price) || 0
          };
        }
      })
    );

    return {
      products: productsWithFinalPrice,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  } catch (error) {
    logger.error(`❌ Erro crítico em Product.findAll`);
    logger.error(`Mensagem: ${error.message || 'Sem mensagem'}`);
    logger.error(`Tipo: ${error.constructor.name}`);
    logger.error(`Stack: ${error.stack || 'Sem stack trace'}`);
    logger.error(`Message: ${error.message || 'Sem mensagem'}`);
    throw error;
  }
}

  // Atualizar produto
  static async update(id, updates) {
    // Recalcular desconto se preços mudaram
    if (updates.current_price || updates.old_price) {
      const product = await this.findById(id);
      const oldPrice = updates.old_price || product.old_price;
      const currentPrice = updates.current_price || product.current_price;

      if (oldPrice) {
        updates.discount_percentage = calculateDiscountPercentage(oldPrice, currentPrice);
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deletar produto (soft delete)
  static async delete(id) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Deletar múltiplos produtos (soft delete)
  static async deleteMany(ids) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .in('id', ids);

    if (error) throw error;
    return true;
  }

  // Desativar produto
  static async deactivate(id) {
    return await this.update(id, { is_active: false });
  }

  // Ativar produto
  static async activate(id) {
    return await this.update(id, { is_active: true });
  }

  // Marcar como fora de estoque
  static async markOutOfStock(id) {
    return await this.update(id, { stock_available: false });
  }

  // Marcar como em estoque
  static async markInStock(id) {
    return await this.update(id, { stock_available: true });
  }

  // Buscar histórico de preços
  static async getPriceHistory(id, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', id)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Buscar produtos por categoria
  static async findByCategory(categoryId, page = 1, limit = 20) {
    return await this.findAll({ category: categoryId, page, limit });
  }

  // Buscar produtos por plataforma
  static async findByPlatform(platform, page = 1, limit = 20) {
    return await this.findAll({ platform, page, limit });
  }

  // Buscar produtos em promoção (com desconto)
  static async findOnSale(page = 1, limit = 20) {
    return await this.findAll({ min_discount: 1, page, limit, sort: 'discount_percentage' });
  }

  // Buscar produtos mais recentes
  static async findRecent(limit = 10) {
    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('is_active', true)
      .in('status', ['approved', 'created', 'published']) // Apenas produtos que devem aparecer
      .eq('stock_available', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Buscar produtos com cupom
  static async findWithCoupon(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('products_full')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .in('status', ['approved', 'created', 'published']) // Apenas produtos que devem aparecer
      .eq('stock_available', true)
      .not('coupon_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      products: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Buscar produtos relacionados
  static async findRelated(productId, limit = 5) {
    const product = await this.findById(productId);

    const { data, error } = await supabase
      .from('products_full')
      .select('*')
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .in('status', ['approved', 'created', 'published']) // Apenas produtos que devem aparecer
      .eq('stock_available', true)
      .neq('id', productId)
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Atualizar preço e criar histórico
  static async updatePrice(id, newPrice) {
    const product = await this.findById(id);

    // Se o preço mudou, atualizar
    if (product.current_price !== newPrice) {
      const updates = {
        old_price: product.current_price,
        current_price: newPrice
      };

      return await this.update(id, updates);
    }

    return product;
  }

  // Buscar produtos que precisam de atualização de preço
  static async findStale(minutes = 30) {
    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - minutes);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .lt('updated_at', staleDate.toISOString());

    if (error) throw error;
    return data;
  }

  // Contar produtos
  static async count(filters = {}) {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (filters.category) query = query.eq('category_id', filters.category);
    if (filters.platform) query = query.eq('platform', filters.platform);

    const { count, error } = await query;

    if (error) throw error;
    return count;
  }

  // Buscar produtos pendentes de aprovação
  static async findPending(filters = {}) {
    const {
      page = 1,
      limit = 20,
      platform,
      search,
      category,
      min_discount,
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;

    try {
      // Primeiro, verificar se a coluna status existe fazendo uma query de teste
      const testQuery = supabase
        .from('products')
        .select('status')
        .limit(1);

      const { error: testError } = await testQuery;

      // Se a coluna status não existir, retornar array vazio
      if (testError && (
        (testError.message && (
          testError.message.includes('column') &&
          (testError.message.includes('status') || testError.message.toLowerCase().includes('does not exist'))
        )) ||
        (testError.code && (
          testError.code === '42703' || // PostgreSQL: column does not exist
          testError.code === 'PGRST116' || // Supabase: column not found
          testError.code === 'PGRST202' // Supabase: column not found (outro código)
        ))
      )) {
        logger.warn('⚠️ Coluna status não encontrada. Execute o SQL: SIMPLE_FIX_STATUS.sql');
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }

      // Se a coluna existe, fazer a query completa com filtro de status
      let query = supabase
        .from('products')
        .select('id, name, image_url, platform, current_price, old_price, discount_percentage, affiliate_link, original_link, external_id, is_active, stock_available, status, category_id, coupon_id, scheduled_post_id, created_at, updated_at', { count: 'exact' })
        .eq('is_active', true)
        .eq('status', 'pending')
        .is('scheduled_post_id', null); // Excluir produtos agendados pela IA

      // Aplicar filtros básicos
      if (platform) query = query.eq('platform', platform);
      if (search) query = query.ilike('name', `%${search}%`);
      if (category) query = query.eq('category_id', category);
      if (min_discount !== undefined && min_discount !== null) {
        query = query.gte('discount_percentage', parseFloat(min_discount));
      }
      if (category) query = query.eq('category_id', category);
      if (min_discount !== undefined && min_discount !== null) {
        query = query.gte('discount_percentage', min_discount);
      }

      // Ordenação
      query = query.order(sort, { ascending: order === 'asc' });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      // Buscar produtos pendentes
      logger.debug(`🔍 Buscando produtos pendentes (findPending)...`);
      const { data: allData, error, count: allCount } = await query;

      if (error) {
        logger.error(`❌ Erro na query inicial: ${error.message}`);
        logger.error(`   Código: ${error.code || 'N/A'}`);
        logger.error(`   Detalhes: ${error.details || 'N/A'}`);
        logger.error(`   Hint: ${error.hint || 'N/A'}`);

        // Se o erro for sobre a coluna status não existir, retornar array vazio
        // Isso permite que a migração seja executada depois sem quebrar a aplicação
        const isStatusColumnError =
          (error.message && (
            error.message.includes('column') &&
            (error.message.includes('status') || error.message.toLowerCase().includes('does not exist'))
          )) ||
          (error.code && (
            error.code === '42703' || // PostgreSQL: column does not exist
            error.code === 'PGRST116' || // Supabase: column not found
            error.code === 'PGRST202' || // Supabase: column not found (outro código)
            String(error.code).includes('42703') || // Pode vir como string
            String(error.code).includes('PGRST')
          ));

        if (isStatusColumnError) {
          logger.warn('⚠️ Coluna status não encontrada. Execute o SQL: SIMPLE_FIX_STATUS.sql');
          return {
            products: [],
            total: 0,
            page,
            limit,
            totalPages: 0
          };
        }

        // Se for outro tipo de erro, lançar para ser tratado pelo error handler
        throw error;
      }

      logger.debug(`   Produtos pendentes encontrados: ${allData?.length || 0}`);
      logger.debug(`   Count total: ${allCount || 0}`);

      // Usar os dados retornados diretamente (já filtrados e paginados)
      const paginatedProducts = allData || [];
      const totalPending = allCount || 0;

      // Extrair category_id e coupon_id dos produtos já retornados
      const categoryIds = [...new Set(paginatedProducts.map(p => p.category_id).filter(Boolean))];
      const couponIds = [...new Set(paginatedProducts.map(p => p.coupon_id).filter(Boolean))];

      const categoriesMap = {};
      const couponsMap = {};

      if (categoryIds.length > 0) {
        try {
          const Category = (await import('./Category.js')).default;
          const categories = await Promise.all(
            categoryIds.map(id => Category.findById(id).catch(() => null))
          );
          categories.forEach(cat => {
            if (cat) categoriesMap[cat.id] = cat;
          });
        } catch (catError) {
          console.warn('Erro ao buscar categorias:', catError.message);
        }
      }

      if (couponIds.length > 0) {
        try {
          const Coupon = (await import('./Coupon.js')).default;
          const coupons = await Promise.all(
            couponIds.map(id => Coupon.findById(id).catch(() => null))
          );
          coupons.forEach(coupon => {
            if (coupon) couponsMap[coupon.id] = coupon;
          });
        } catch (couponError) {
          console.warn('Erro ao buscar cupons:', couponError.message);
        }
      }

      // Enriquecer produtos com dados de categoria e cupom
      const enrichedProducts = paginatedProducts.map(product => {
        const enriched = { ...product };

        const category = product.category_id ? categoriesMap[product.category_id] : null;
        const coupon = product.coupon_id ? couponsMap[product.coupon_id] : null;

        if (category) {
          enriched.category_name = category.name;
          enriched.category_slug = category.slug;
          enriched.category_icon = category.icon;
        }

        if (coupon) {
          enriched.coupon_code = coupon.code;
          enriched.coupon_discount_type = coupon.discount_type;
          enriched.coupon_discount_value = coupon.discount_value;
          enriched.coupon_valid_until = coupon.valid_until;
          enriched.coupon_is_vip = coupon.is_vip;

          // Calcular preço final com cupom
          try {
            let finalPrice = product.current_price;
            const currentPrice = parseFloat(product.current_price) || 0;
            const discountValue = parseFloat(coupon.discount_value) || 0;

            if (coupon.discount_type === 'percentage') {
              // Desconto percentual
              finalPrice = currentPrice - (currentPrice * (discountValue / 100));
            } else {
              // Desconto fixo
              finalPrice = Math.max(0, currentPrice - discountValue);
            }

            // Aplicar limite máximo de desconto se existir
            if (coupon.max_discount_value && coupon.max_discount_value > 0) {
              const discountAmount = currentPrice - finalPrice;
              if (discountAmount > coupon.max_discount_value) {
                finalPrice = currentPrice - coupon.max_discount_value;
              }
            }

            enriched.final_price = parseFloat(finalPrice.toFixed(2));
            enriched.price_with_coupon = parseFloat(finalPrice.toFixed(2));
          } catch (e) {
            logger.warn(`Erro ao calcular preço final para produto ${product.id}: ${e.message}`);
          }
        }

        return enriched;
      });

      return {
        products: enrichedProducts,
        total: totalPending,
        page,
        limit,
        totalPages: Math.ceil(totalPending / limit)
      };
    } catch (error) {
      logger.error('❌ Erro em findPending:', error);
      logger.error('   Mensagem:', error.message);
      logger.error('   Stack:', error.stack);
      logger.error('   Code:', error.code || 'N/A');
      logger.error('   Details:', error.details || 'N/A');

      // Se o erro for sobre a coluna status não existir, retornar array vazio
      const isStatusColumnError =
        (error.message && (
          error.message.includes('column') &&
          (error.message.includes('status') || error.message.toLowerCase().includes('does not exist'))
        )) ||
        (error.code && (
          error.code === '42703' || // PostgreSQL: column does not exist
          error.code === 'PGRST116' || // Supabase: column not found
          error.code === 'PGRST202' || // Supabase: column not found (outro código)
          String(error.code).includes('42703') || // Pode vir como string
          String(error.code).includes('PGRST')
        ));

      if (isStatusColumnError) {
        logger.warn('⚠️ Coluna status não encontrada (catch). Execute o SQL: SIMPLE_FIX_STATUS.sql');
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }

      throw error;
    }
  }

  // Aprovar e atualizar produto com link de afiliado e cupom
  static async approve(id, affiliateLink, additionalData = {}) {
    // IMPORTANTE: O affiliateLink do parâmetro tem prioridade sobre o do additionalData
    // Isso garante que o link encurtado seja usado
    // Fazer spread do additionalData primeiro, depois sobrescrever com affiliateLink do parâmetro
    const updateData = {
      status: 'approved',
      updated_at: new Date().toISOString(),
      ...additionalData,
      // IMPORTANTE: Definir affiliate_link DEPOIS do spread para garantir que o link encurtado seja usado
      affiliate_link: affiliateLink
    };

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Estatísticas de produtos
  static async getStats() {
    try {
      // Total de produtos
      const { count: totalProducts, error: totalError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (totalError) throw totalError;

      // Produtos por status (se a coluna existir)
      let statusStats = {};
      try {
        const { data: statusData, error: statusError } = await supabase
          .from('products')
          .select('status')
          .eq('is_active', true);

        if (!statusError && statusData) {
          statusStats = statusData.reduce((acc, product) => {
            const status = product.status || 'published';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
        }
      } catch (e) {
        logger.debug('Erro ao buscar estatísticas por status:', e.message);
      }

      // Produtos por plataforma
      const { data: platformData, error: platformError } = await supabase
        .from('products')
        .select('platform')
        .eq('is_active', true);

      let platformStats = {};
      if (!platformError && platformData) {
        platformStats = platformData.reduce((acc, product) => {
          acc[product.platform] = (acc[product.platform] || 0) + 1;
          return acc;
        }, {});
      }

      // Produtos com desconto
      const { count: productsWithDiscount, error: discountError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('discount_percentage', 0);

      // Média de desconto
      const { data: discountData, error: avgDiscountError } = await supabase
        .from('products')
        .select('discount_percentage')
        .eq('is_active', true)
        .gt('discount_percentage', 0);

      let avgDiscount = 0;
      if (!avgDiscountError && discountData && discountData.length > 0) {
        const sum = discountData.reduce((acc, p) => acc + (p.discount_percentage || 0), 0);
        avgDiscount = Math.round((sum / discountData.length) * 100) / 100;
      }

      return {
        total: totalProducts || 0,
        withDiscount: productsWithDiscount || 0,
        averageDiscount: avgDiscount,
        byStatus: statusStats,
        byPlatform: platformStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Erro ao buscar estatísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpeza automática de produtos antigos
   * - Pendentes > 24h
   * - Aprovados/Publicados/Rejeitados > 7 dias
   */
  static async cleanupOldItems() {
    try {
      logger.info('🔄 Iniciando limpeza automática de produtos...');

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const BATCH_SIZE = 500; // Supabase limita .in() a ~1000 IDs
      const QUERY_LIMIT = 1000; // Limite de busca por query

      // Contadores totais
      let totalPendingCount = 0;
      let totalProcessedCount = 0;
      let totalRelated = {
        scheduled_posts: 0,
        sync_logs: 0,
        price_history: 0,
        click_tracking: 0,
        notifications: 0
      };

      // Função auxiliar para deletar em lotes com limpeza COMPLETA de registros relacionados
      const deleteInBatches = async (ids, table = 'products') => {
        let deleted = 0;

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);

          // 1. Deletar agendamentos vinculados
          try {
            const { count } = await supabase
              .from('scheduled_posts')
              .delete({ count: 'exact' })
              .in('product_id', batch);
            totalRelated.scheduled_posts += count || 0;
          } catch (e) { /* Ignorar */ }

          // 2. Deletar logs de sincronização vinculados
          try {
            const { count } = await supabase
              .from('sync_logs')
              .delete({ count: 'exact' })
              .in('product_id', batch);
            totalRelated.sync_logs += count || 0;
          } catch (e) { /* Ignorar */ }

          // 3. Deletar histórico de preços
          try {
            const { count } = await supabase
              .from('price_history')
              .delete({ count: 'exact' })
              .in('product_id', batch);
            totalRelated.price_history += count || 0;
          } catch (e) { /* Ignorar */ }

          // 4. Deletar rastreamento de cliques
          try {
            const { count } = await supabase
              .from('click_tracking')
              .delete({ count: 'exact' })
              .in('product_id', batch);
            totalRelated.click_tracking += count || 0;
          } catch (e) { /* Ignorar */ }

          // 5. Deletar notificações relacionadas
          try {
            const { count } = await supabase
              .from('notifications')
              .delete({ count: 'exact' })
              .in('product_id', batch);
            totalRelated.notifications += count || 0;
          } catch (e) { /* Ignorar */ }

          // 6. Finalmente, deletar os produtos
          const { count, error } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .in('id', batch);

          if (error) throw error;
          deleted += count || 0;
        }

        return deleted;
      };

      // ===== LOOP 1: Limpar TODOS os produtos pendentes > 24h =====
      let pendingRound = 0;
      while (true) {
        pendingRound++;

        const { data: pendingProducts, error: pendingFetchError } = await supabase
          .from('products')
          .select('id, name')
          .eq('status', 'pending')
          .lt('created_at', twentyFourHoursAgo)
          .limit(QUERY_LIMIT);

        if (pendingFetchError) throw pendingFetchError;

        if (!pendingProducts || pendingProducts.length === 0) {
          if (pendingRound === 1) {
            logger.info('ℹ️ Nenhum produto pendente antigo para remover');
          }
          break; // Saiu do loop - não há mais produtos
        }

        logger.info(`   📋 Rodada ${pendingRound}: ${pendingProducts.length} produtos pendentes encontrados`);

        const deletedCount = await deleteInBatches(pendingProducts.map(p => p.id));
        totalPendingCount += deletedCount;

        logger.info(`   ✅ Rodada ${pendingRound}: ${deletedCount} produtos deletados (Total: ${totalPendingCount})`);

        // Se retornou menos que o limite, não há mais produtos
        if (pendingProducts.length < QUERY_LIMIT) break;
      }

      // ===== LOOP 2: Limpar TODOS os produtos processados > 7 dias =====
      let processedRound = 0;
      while (true) {
        processedRound++;

        const { data: processedProducts, error: processedFetchError } = await supabase
          .from('products')
          .select('id, name')
          .in('status', ['approved', 'published', 'rejected'])
          .lt('updated_at', sevenDaysAgo)
          .limit(QUERY_LIMIT);

        if (processedFetchError) throw processedFetchError;

        if (!processedProducts || processedProducts.length === 0) {
          if (processedRound === 1) {
            logger.info('ℹ️ Nenhum produto processado antigo para remover');
          }
          break; // Saiu do loop - não há mais produtos
        }

        logger.info(`   📋 Rodada ${processedRound}: ${processedProducts.length} produtos processados encontrados`);

        const deletedCount = await deleteInBatches(processedProducts.map(p => p.id));
        totalProcessedCount += deletedCount;

        logger.info(`   ✅ Rodada ${processedRound}: ${deletedCount} produtos deletados (Total: ${totalProcessedCount})`);

        // Se retornou menos que o limite, não há mais produtos
        if (processedProducts.length < QUERY_LIMIT) break;
      }

      // ===== RESUMO FINAL =====
      logger.info('');
      logger.info('📊 ===== RESUMO DA LIMPEZA =====');
      logger.info(`   🗑️ Produtos pendentes (>24h): ${totalPendingCount}`);
      logger.info(`   🗑️ Produtos processados (>7 dias): ${totalProcessedCount}`);
      logger.info(`   📦 TOTAL DE PRODUTOS REMOVIDOS: ${totalPendingCount + totalProcessedCount}`);

      if (Object.values(totalRelated).some(v => v > 0)) {
        logger.info('');
        logger.info('   📋 Registros relacionados removidos:');
        if (totalRelated.scheduled_posts > 0) logger.info(`      - Agendamentos: ${totalRelated.scheduled_posts}`);
        if (totalRelated.sync_logs > 0) logger.info(`      - Logs de sync: ${totalRelated.sync_logs}`);
        if (totalRelated.price_history > 0) logger.info(`      - Histórico de preços: ${totalRelated.price_history}`);
        if (totalRelated.click_tracking > 0) logger.info(`      - Rastreamento de cliques: ${totalRelated.click_tracking}`);
        if (totalRelated.notifications > 0) logger.info(`      - Notificações: ${totalRelated.notifications}`);
      }

      logger.info('================================');

      return {
        pendingCount: totalPendingCount,
        processedCount: totalProcessedCount,
        relatedDeleted: totalRelated
      };
    } catch (error) {
      logger.error(`❌ Erro na limpeza automática de produtos: ${error.message}`);
      throw error;
    }
  }
}

export default Product;

/**
 * Script de teste: Criar cupom específico e vincular produto
 */

import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function testCouponProductLink() {
  try {
    logger.info('🧪 Teste: Criar cupom específico e vincular produto\n');

    // 1. Criar cupom específico (is_general=false)
    logger.info('1️⃣ Criando cupom específico...');
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert([{
        code: 'TESTE123',
        platform: 'mercadolivre',
        discount_type: 'percentage',
        discount_value: 15,
        min_purchase: 50,
        max_discount_value: 30,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_general: false, // ESPECÍFICO
        applicable_products: [], // Vazio inicialmente
        is_active: true
      }])
      .select()
      .single();

    if (couponError) {
      logger.error(`❌ Erro ao criar cupom: ${couponError.message}`);
      return;
    }

    logger.info(`✅ Cupom criado: ${coupon.code} (ID: ${coupon.id})`);
    logger.info(`   is_general: ${coupon.is_general}`);
    logger.info(`   applicable_products: ${coupon.applicable_products?.length || 0} produtos\n`);

    // 2. Buscar um produto aprovado para vincular
    logger.info('2️⃣ Buscando produto aprovado...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'approved')
      .eq('platform', 'mercadolivre')
      .limit(1);

    if (productError || !products || products.length === 0) {
      logger.warn('⚠️  Nenhum produto aprovado encontrado. Criando produto de teste...');
      
      // Criar produto de teste
      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert([{
          name: 'Produto Teste para Cupom',
          platform: 'mercadolivre',
          current_price: 100,
          old_price: 150,
          discount_percentage: 33,
          status: 'approved',
          affiliate_link: 'https://exemplo.com/produto-teste',
          stock_available: true
        }])
        .select()
        .single();

      if (createError) {
        logger.error(`❌ Erro ao criar produto: ${createError.message}`);
        return;
      }

      logger.info(`✅ Produto criado: ${newProduct.name} (ID: ${newProduct.id})\n`);
      
      // 3. Vincular produto ao cupom
      logger.info('3️⃣ Vinculando produto ao cupom...');
      
      // Atualizar produto com coupon_id
      const { error: updateProductError } = await supabase
        .from('products')
        .update({ coupon_id: coupon.id })
        .eq('id', newProduct.id);

      if (updateProductError) {
        logger.error(`❌ Erro ao vincular cupom ao produto: ${updateProductError.message}`);
        return;
      }

      // Atualizar cupom com applicable_products
      const { error: updateCouponError } = await supabase
        .from('coupons')
        .update({ applicable_products: [newProduct.id] })
        .eq('id', coupon.id);

      if (updateCouponError) {
        logger.error(`❌ Erro ao adicionar produto ao cupom: ${updateCouponError.message}`);
        return;
      }

      logger.info(`✅ Vinculação completa!`);
      logger.info(`   Produto: ${newProduct.name}`);
      logger.info(`   Cupom: ${coupon.code}\n`);

      // 4. Verificar resultado
      logger.info('4️⃣ Verificando resultado...');
      const { data: updatedCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', coupon.id)
        .single();

      const { data: updatedProduct } = await supabase
        .from('products')
        .select('*')
        .eq('id', newProduct.id)
        .single();

      logger.info('📊 Estado final:');
      logger.info(`   Cupom ${updatedCoupon.code}:`);
      logger.info(`     - is_general: ${updatedCoupon.is_general}`);
      logger.info(`     - applicable_products: ${updatedCoupon.applicable_products?.length || 0} produtos`);
      logger.info(`   Produto ${updatedProduct.name}:`);
      logger.info(`     - coupon_id: ${updatedProduct.coupon_id ? 'Vinculado ✅' : 'Não vinculado ❌'}`);

      logger.info('\n✅ Teste concluído com sucesso!');
      logger.info(`\n📱 Agora teste no app:`);
      logger.info(`   1. Abra os detalhes do cupom ${coupon.code}`);
      logger.info(`   2. Deve mostrar "Válido para produtos selecionados"`);
      logger.info(`   3. Deve ter botão "Ver 1 produto vinculado"`);

    } else {
      const product = products[0];
      logger.info(`✅ Produto encontrado: ${product.name} (ID: ${product.id})\n`);
      
      // Continuar com vinculação...
      logger.info('3️⃣ Vinculando produto ao cupom...');
      
      const { error: updateProductError } = await supabase
        .from('products')
        .update({ coupon_id: coupon.id })
        .eq('id', product.id);

      if (updateProductError) {
        logger.error(`❌ Erro ao vincular cupom ao produto: ${updateProductError.message}`);
        return;
      }

      const { error: updateCouponError } = await supabase
        .from('coupons')
        .update({ applicable_products: [product.id] })
        .eq('id', coupon.id);

      if (updateCouponError) {
        logger.error(`❌ Erro ao adicionar produto ao cupom: ${updateCouponError.message}`);
        return;
      }

      logger.info(`✅ Vinculação completa!`);
      logger.info(`   Produto: ${product.name}`);
      logger.info(`   Cupom: ${coupon.code}\n`);

      logger.info('✅ Teste concluído com sucesso!');
      logger.info(`\n📱 Agora teste no app:`);
      logger.info(`   1. Abra os detalhes do cupom ${coupon.code}`);
      logger.info(`   2. Deve mostrar "Válido para produtos selecionados"`);
      logger.info(`   3. Deve ter botão "Ver 1 produto vinculado"`);
    }

  } catch (error) {
    logger.error(`❌ Erro fatal: ${error.message}`);
    logger.error(error.stack);
  }
}

// Executar
testCouponProductLink()
  .then(() => {
    logger.info('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`❌ Erro fatal: ${error.message}`);
    process.exit(1);
  });

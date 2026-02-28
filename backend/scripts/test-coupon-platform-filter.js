#!/usr/bin/env node

/**
 * Script de teste para validar filtro de plataforma em cupons gerais
 * Testa se cupons gerais são corretamente filtrados por plataforma
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCouponPlatformFilter() {
  console.log('🧪 Iniciando teste de filtro de plataforma em cupons...\n');

  try {
    // 1. Buscar produtos de diferentes plataformas
    console.log('📦 Buscando produtos de teste...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, platform')
      .limit(10);

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      console.log('⚠️  Nenhum produto encontrado no banco');
      return;
    }

    console.log(`✅ Encontrados ${products.length} produtos\n`);

    // Agrupar produtos por plataforma
    const productsByPlatform = {};
    products.forEach(p => {
      if (!productsByPlatform[p.platform]) {
        productsByPlatform[p.platform] = [];
      }
      productsByPlatform[p.platform].push(p);
    });

    console.log('📊 Produtos por plataforma:');
    Object.entries(productsByPlatform).forEach(([platform, prods]) => {
      console.log(`   ${platform}: ${prods.length} produto(s)`);
    });
    console.log('');

    // 2. Buscar cupons gerais
    console.log('🎫 Buscando cupons gerais...');
    const now = new Date().toISOString();
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('id, code, platform, is_general')
      .eq('is_active', true)
      .eq('is_general', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .limit(10);

    if (couponsError) throw couponsError;

    if (!coupons || coupons.length === 0) {
      console.log('⚠️  Nenhum cupom geral encontrado no banco');
      console.log('💡 Crie um cupom geral para testar');
      return;
    }

    console.log(`✅ Encontrados ${coupons.length} cupons gerais\n`);

    // Agrupar cupons por plataforma
    const couponsByPlatform = {};
    coupons.forEach(c => {
      if (!couponsByPlatform[c.platform]) {
        couponsByPlatform[c.platform] = [];
      }
      couponsByPlatform[c.platform].push(c);
    });

    console.log('📊 Cupons por plataforma:');
    Object.entries(couponsByPlatform).forEach(([platform, cups]) => {
      console.log(`   ${platform}: ${cups.length} cupom(ns)`);
      cups.forEach(c => console.log(`      - ${c.code}`));
    });
    console.log('');

    // 3. Testar lógica de filtro
    console.log('🔍 Testando lógica de filtro...\n');

    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    for (const product of products) {
      console.log(`📦 Produto: ${product.name} (${product.platform})`);

      // Buscar cupons aplicáveis usando a lógica corrigida
      const applicableCoupons = coupons.filter(coupon => {
        // Cupom geral: deve ser da mesma plataforma ou plataforma 'general'
        if (coupon.is_general === true) {
          return coupon.platform === 'general' || coupon.platform === product.platform;
        }
        return false;
      });

      console.log(`   Cupons aplicáveis: ${applicableCoupons.length}`);
      applicableCoupons.forEach(c => {
        console.log(`      ✅ ${c.code} (${c.platform})`);
      });

      // Validar que cupons de outras plataformas não aparecem
      const wrongCoupons = coupons.filter(coupon => {
        return coupon.is_general === true &&
               coupon.platform !== 'general' &&
               coupon.platform !== product.platform;
      });

      if (wrongCoupons.length > 0) {
        console.log(`   ❌ ERRO: Cupons de outras plataformas foram incluídos:`);
        wrongCoupons.forEach(c => {
          console.log(`      ❌ ${c.code} (${c.platform}) - NÃO deveria aparecer`);
        });
        testsFailed++;
      } else {
        console.log(`   ✅ Filtro correto: nenhum cupom de outra plataforma`);
        testsPassed++;
      }

      testsRun++;
      console.log('');
    }

    // 4. Resumo dos testes
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMO DOS TESTES');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total de testes: ${testsRun}`);
    console.log(`✅ Passou: ${testsPassed}`);
    console.log(`❌ Falhou: ${testsFailed}`);
    console.log('');

    if (testsFailed === 0) {
      console.log('🎉 TODOS OS TESTES PASSARAM!');
      console.log('✅ Cupons gerais estão sendo filtrados corretamente por plataforma');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM');
      console.log('❌ Verifique a implementação da função findForProduct');
    }

    console.log('');

    // 5. Teste específico da função findForProduct
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔬 TESTE DA FUNÇÃO findForProduct');
    console.log('═══════════════════════════════════════════════════════════');

    // Importar o modelo Coupon
    const CouponModule = await import('../src/models/Coupon.js');
    const Coupon = CouponModule.default;

    for (const product of products.slice(0, 3)) { // Testar apenas 3 produtos
      console.log(`\n📦 Testando produto: ${product.name} (${product.platform})`);
      
      try {
        const foundCoupons = await Coupon.findForProduct(product.id);
        console.log(`   Cupons encontrados: ${foundCoupons.length}`);
        
        foundCoupons.forEach(c => {
          const isCorrect = c.platform === 'general' || c.platform === product.platform;
          const icon = isCorrect ? '✅' : '❌';
          console.log(`      ${icon} ${c.code} (${c.platform})`);
          
          if (!isCorrect) {
            console.log(`         ❌ ERRO: Cupom de plataforma diferente!`);
          }
        });

        // Verificar se há cupons incorretos
        const incorrectCoupons = foundCoupons.filter(c => 
          c.platform !== 'general' && c.platform !== product.platform
        );

        if (incorrectCoupons.length > 0) {
          console.log(`   ❌ FALHOU: ${incorrectCoupons.length} cupom(ns) incorreto(s)`);
        } else {
          console.log(`   ✅ PASSOU: Todos os cupons são da plataforma correta`);
        }

      } catch (error) {
        console.error(`   ❌ ERRO ao executar findForProduct:`, error.message);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executar teste
testCouponPlatformFilter()
  .then(() => {
    console.log('✨ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

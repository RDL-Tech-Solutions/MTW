import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCouponStatus() {
  try {
    console.log('🔍 Verificando status dos cupons...\n');
    
    // Buscar todos os cupons
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar cupons:', error);
      process.exit(1);
    }
    
    console.log(`📊 Total de cupons no banco: ${coupons.length}\n`);
    
    // Mostrar detalhes de cada cupom
    coupons.forEach((coupon, index) => {
      console.log(`${index + 1}. ${coupon.code || 'SEM CÓDIGO'}`);
      console.log(`   ID: ${coupon.id}`);
      console.log(`   Título: ${coupon.title || 'N/A'}`);
      console.log(`   Plataforma: ${coupon.platform}`);
      console.log(`   Ativo: ${coupon.is_active ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Esgotado: ${coupon.is_out_of_stock ? '⚠️ SIM' : '✅ NÃO'}`);
      console.log(`   Pendente: ${coupon.is_pending_approval ? '⏳ SIM' : '✅ NÃO'}`);
      console.log(`   Exclusivo: ${coupon.is_exclusive ? '⭐ SIM' : 'NÃO'}`);
      console.log(`   Criado em: ${new Date(coupon.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    });
    
    // Verificar especificamente o cupom CERT500OF
    const cert500 = coupons.find(c => c.code === 'CERT500OF' || c.code === 'CERT5000F');
    if (cert500) {
      console.log('🎯 Cupom CERT500OF encontrado:');
      console.log(JSON.stringify(cert500, null, 2));
    } else {
      console.log('⚠️ Cupom CERT500OF não encontrado no banco');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkCouponStatus();

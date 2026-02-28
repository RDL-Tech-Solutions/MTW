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

async function deleteInactiveCoupon() {
  try {
    const couponId = '8db0eda0-ede6-4760-ac4d-5e9073b25a7c'; // CERT500OF
    
    console.log('🗑️ Deletando cupom inativo CERT500OF...');
    console.log(`ID: ${couponId}\n`);
    
    // Deletar o cupom
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);
    
    if (error) {
      console.error('❌ Erro ao deletar cupom:', error);
      process.exit(1);
    }
    
    console.log('✅ Cupom CERT500OF deletado com sucesso!');
    
    // Verificar cupons restantes
    const { data: remaining, error: countError } = await supabase
      .from('coupons')
      .select('code, is_active, is_out_of_stock')
      .order('created_at', { ascending: false });
    
    if (countError) {
      console.error('❌ Erro ao verificar cupons restantes:', countError);
      process.exit(1);
    }
    
    console.log(`\n📊 Cupons restantes no banco: ${remaining.length}`);
    remaining.forEach((c, i) => {
      console.log(`${i + 1}. ${c.code} - Ativo: ${c.is_active ? '✅' : '❌'} - Esgotado: ${c.is_out_of_stock ? '⚠️' : '✅'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

deleteInactiveCoupon();

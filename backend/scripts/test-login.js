// Script para testar login e verificar hash
// Uso: node scripts/test-login.js

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testLogin() {
  const email = 'admin@mtwpromo.com';
  const password = 'admin123';
  
  console.log('🔍 Testando login para:', email);
  console.log('');
  
  // 1. Buscar usuário no banco
  console.log('1️⃣ Buscando usuário no banco...');
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) {
    console.error('❌ Erro ao buscar usuário:', error.message);
    return;
  }
  
  if (!user) {
    console.error('❌ Usuário não encontrado!');
    return;
  }
  
  console.log('✅ Usuário encontrado!');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Nome:', user.name);
  console.log('   Role:', user.role);
  console.log('');
  
  // 2. Verificar qual coluna tem a senha
  console.log('2️⃣ Verificando colunas de senha...');
  console.log('   password:', user.password ? '✓ Existe' : '✗ Vazio');
  console.log('   password_hash:', user.password_hash ? '✓ Existe' : '✗ Vazio');
  console.log('');
  
  if (user.password) {
    console.log('   password (primeiros 30 chars):', user.password.substring(0, 30) + '...');
  }
  if (user.password_hash) {
    console.log('   password_hash (primeiros 30 chars):', user.password_hash.substring(0, 30) + '...');
  }
  console.log('');
  
  // 3. Testar senha com password
  if (user.password) {
    console.log('3️⃣ Testando senha com coluna "password"...');
    const isValid1 = await bcrypt.compare(password, user.password);
    console.log('   Resultado:', isValid1 ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    console.log('');
  }
  
  // 4. Testar senha com password_hash
  if (user.password_hash) {
    console.log('4️⃣ Testando senha com coluna "password_hash"...');
    const isValid2 = await bcrypt.compare(password, user.password_hash);
    console.log('   Resultado:', isValid2 ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    console.log('');
  }
  
  // 5. Conclusão
  console.log('📊 RESUMO:');
  const passwordToUse = user.password_hash || user.password;
  if (passwordToUse) {
    const finalTest = await bcrypt.compare(password, passwordToUse);
    if (finalTest) {
      console.log('✅ LOGIN DEVE FUNCIONAR!');
      console.log('   A senha está correta no banco.');
    } else {
      console.log('❌ LOGIN VAI FALHAR!');
      console.log('   O hash no banco não corresponde à senha "admin123"');
      console.log('');
      console.log('🔧 SOLUÇÃO:');
      console.log('   Execute o SQL: database/FINAL-create-admin.sql');
    }
  } else {
    console.log('❌ NENHUMA SENHA CONFIGURADA!');
    console.log('');
    console.log('🔧 SOLUÇÃO:');
    console.log('   Execute o SQL: database/FINAL-create-admin.sql');
  }
}

testLogin().catch(console.error);

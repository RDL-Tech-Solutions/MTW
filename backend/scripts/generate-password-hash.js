// Script para gerar hash de senha
// Uso: node scripts/generate-password-hash.js [senha]

import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = process.argv[2] || 'admin123';
  
  console.log('🔐 Gerando hash para senha:', password);
  console.log('');
  
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log('✅ Hash gerado:');
  console.log(hash);
  console.log('');
  
  // Testar se o hash funciona
  const isValid = await bcrypt.compare(password, hash);
  console.log('✅ Teste de validação:', isValid ? 'OK' : 'FALHOU');
  console.log('');
  
  console.log('📋 SQL para usar no Supabase:');
  console.log('');
  console.log(`INSERT INTO users (email, password, password_hash, name, role, is_vip, created_at, updated_at)`);
  console.log(`VALUES (`);
  console.log(`  'admin@mtwpromo.com',`);
  console.log(`  '${hash}',`);
  console.log(`  '${hash}',`);
  console.log(`  'Administrador',`);
  console.log(`  'admin',`);
  console.log(`  true,`);
  console.log(`  NOW(),`);
  console.log(`  NOW()`);
  console.log(`) ON CONFLICT (email) DO UPDATE SET`);
  console.log(`  password = EXCLUDED.password,`);
  console.log(`  password_hash = EXCLUDED.password_hash,`);
  console.log(`  updated_at = NOW();`);
}

generateHash().catch(console.error);

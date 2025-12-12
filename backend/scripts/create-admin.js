// Script para criar usuário admin no banco de dados
// Uso: node scripts/create-admin.js

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createAdmin() {
  try {
    console.log('🔐 Gerando hash da senha...');
    
    // Gerar hash da senha "admin123"
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    console.log('✅ Hash gerado:', passwordHash);
    console.log('');
    
    console.log('👤 Criando usuário admin...');
    
    // Inserir ou atualizar usuário admin
    const { data, error } = await supabase
      .from('users')
      .upsert({
        email: 'admin@mtwpromo.com',
        password_hash: passwordHash,
        name: 'Administrador',
        role: 'admin',
        is_vip: true,
        vip_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select();
    
    if (error) {
      console.error('❌ Erro ao criar usuário:', error);
      process.exit(1);
    }
    
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('');
    console.log('📋 CREDENCIAIS DE LOGIN:');
    console.log('   Email: admin@mtwpromo.com');
    console.log('   Senha: admin123');
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    console.log('');
    
    if (data && data.length > 0) {
      console.log('👤 Dados do usuário:');
      console.log('   ID:', data[0].id);
      console.log('   Email:', data[0].email);
      console.log('   Nome:', data[0].name);
      console.log('   Role:', data[0].role);
      console.log('   VIP:', data[0].is_vip);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar
createAdmin();

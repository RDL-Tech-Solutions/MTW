import 'dotenv/config';
import { supabase } from './src/config/database.js';

async function checkPushTokens() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, push_token')
      .not('push_token', 'is', null)
      .limit(5);
    
    if (error) throw error;
    
    console.log('\n📱 Usuários com Push Token registrado:\n');
    if (data && data.length > 0) {
      data.forEach(user => {
        console.log(`✅ ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nome: ${user.name || 'N/A'}`);
        console.log(`   Token: ${user.push_token.substring(0, 50)}...`);
        console.log('');
      });
      console.log(`Total: ${data.length} usuário(s) com push token\n`);
      
      console.log('🧪 Para testar notificação push:');
      console.log('   1. Certifique-se que o backend está rodando (npm run dev)');
      console.log('   2. Faça login no sistema e obtenha o JWT token');
      console.log('   3. Execute o comando:');
      console.log('');
      console.log('   curl -X POST http://localhost:3000/api/notifications/test-push \\');
      console.log('        -H "Authorization: Bearer SEU_JWT_TOKEN" \\');
      console.log('        -H "Content-Type: application/json"');
      console.log('');
    } else {
      console.log('❌ Nenhum usuário com push token registrado.\n');
      console.log('💡 Para registrar um token:');
      console.log('   1. Faça build do app: cd app && npx expo run:android');
      console.log('   2. Abra o app e faça login');
      console.log('   3. O token será registrado automaticamente\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkPushTokens();

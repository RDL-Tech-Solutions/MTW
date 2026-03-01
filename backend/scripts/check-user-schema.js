import supabase from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function checkUserSchema() {
  try {
    logger.info('🔍 Verificando schema da tabela users...\n');

    // Buscar um usuário para ver os campos
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      logger.error(`❌ Erro: ${error.message}`);
      return;
    }

    if (users && users.length > 0) {
      const user = users[0];
      logger.info('📋 Campos disponíveis na tabela users:');
      logger.info('');
      
      Object.keys(user).forEach(key => {
        const value = user[key];
        const type = typeof value;
        const preview = key.includes('password') || key.includes('token') 
          ? '***' 
          : (value ? String(value).substring(0, 50) : 'null');
        
        logger.info(`   ${key.padEnd(30)} | ${type.padEnd(10)} | ${preview}`);
      });

      logger.info('');
      logger.info('🔐 Campos relacionados a senha:');
      const passwordFields = Object.keys(user).filter(k => 
        k.includes('password') || k.includes('pass')
      );
      
      if (passwordFields.length > 0) {
        passwordFields.forEach(field => {
          logger.info(`   ✓ ${field}`);
        });
      } else {
        logger.warn('   ⚠️ Nenhum campo de senha encontrado!');
      }
    }

  } catch (error) {
    logger.error(`❌ Erro: ${error.message}`);
  }
}

checkUserSchema();

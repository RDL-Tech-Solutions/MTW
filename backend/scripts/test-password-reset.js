import supabase from '../src/config/database.js';
import { hashPassword, comparePassword } from '../src/utils/helpers.js';
import logger from '../src/config/logger.js';

/**
 * Script para testar o fluxo de reset de senha
 */

async function testPasswordReset() {
  try {
    const testEmail = 'janicelima850@gmail.com'; // Email que você testou
    const testPassword = 'senha123'; // Senha que você tentou definir

    logger.info('🧪 Testando fluxo de reset de senha...');
    logger.info(`📧 Email: ${testEmail}`);

    // 1. Buscar usuário
    logger.info('\n1️⃣ Buscando usuário...');
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .limit(1);

    if (findError || !users || users.length === 0) {
      logger.error('❌ Usuário não encontrado');
      return;
    }

    const user = users[0];
    logger.info(`✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);

    // 2. Verificar senha atual
    logger.info('\n2️⃣ Verificando senha atual no banco...');
    logger.info(`   Senha hash: ${user.password?.substring(0, 20)}...`);

    // 3. Testar senha que você tentou usar
    logger.info('\n3️⃣ Testando senha que você definiu...');
    const isPasswordCorrect = await comparePassword(testPassword, user.password);
    
    if (isPasswordCorrect) {
      logger.info(`✅ Senha "${testPassword}" está CORRETA!`);
      logger.info('   O problema pode estar no app ou na digitação');
    } else {
      logger.error(`❌ Senha "${testPassword}" está INCORRETA!`);
      logger.error('   A senha não foi salva corretamente no banco');
    }

    // 4. Verificar campos de verificação
    logger.info('\n4️⃣ Verificando campos de verificação...');
    logger.info(`   verification_code: ${user.verification_code || 'null (correto)'}`);
    logger.info(`   verification_code_expiry: ${user.verification_code_expiry || 'null (correto)'}`);

    // 5. Testar hash manual
    logger.info('\n5️⃣ Testando hash manual da senha...');
    const manualHash = await hashPassword(testPassword);
    logger.info(`   Hash gerado: ${manualHash.substring(0, 20)}...`);
    
    const manualCompare = await comparePassword(testPassword, manualHash);
    logger.info(`   Comparação: ${manualCompare ? '✅ OK' : '❌ FALHOU'}`);

    // 6. Atualizar senha manualmente para teste
    logger.info('\n6️⃣ Deseja atualizar a senha manualmente? (y/n)');
    logger.info('   Isso vai definir a senha como "senha123"');
    
    // Atualizar automaticamente para teste
    logger.info('   Atualizando senha...');
    const newHash = await hashPassword(testPassword);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: newHash,
        password_hash: newHash, // Salvar em ambos os campos
        verification_code: null,
        verification_code_expiry: null
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error(`❌ Erro ao atualizar: ${updateError.message}`);
    } else {
      logger.info('✅ Senha atualizada com sucesso!');
      
      // Verificar se salvou
      const { data: updatedUsers } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .limit(1);

      if (updatedUsers && updatedUsers.length > 0) {
        const testAgain = await comparePassword(testPassword, updatedUsers[0].password);
        logger.info(`   Verificação: ${testAgain ? '✅ Senha salva corretamente' : '❌ Senha não salva'}`);
      }
    }

    logger.info('\n✅ Teste concluído!');
    logger.info(`\n📝 Tente fazer login agora com:`);
    logger.info(`   Email: ${testEmail}`);
    logger.info(`   Senha: ${testPassword}`);

  } catch (error) {
    logger.error(`❌ Erro no teste: ${error.message}`);
    logger.error(error.stack);
  }
}

testPasswordReset();

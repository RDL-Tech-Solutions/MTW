/**
 * VERIFICAR E CORRIGIR TABELA notification_preferences
 * 
 * Este script:
 * 1. Verifica se a tabela existe
 * 2. Verifica se as colunas necessárias existem
 * 3. Aplica correções se necessário
 */

import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

async function checkAndFixTable() {
  logger.info('\n🔍 ========== VERIFICANDO TABELA notification_preferences ==========\n');

  try {
    // 1. Verificar se a tabela existe
    logger.info('1️⃣ Verificando se a tabela existe...');
    const { data: tables, error: tablesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1);

    if (tablesError && tablesError.code === '42P01') {
      logger.error('❌ Tabela notification_preferences NÃO EXISTE!');
      logger.error('   Execute a migration para criar a tabela.');
      process.exit(1);
    }

    logger.info('✅ Tabela existe\n');

    // 2. Verificar estrutura da tabela
    logger.info('2️⃣ Verificando colunas da tabela...');
    
    // Buscar um registro para ver as colunas
    const { data: sample, error: sampleError } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') {
      // PGRST116 = not found (ok se não houver registros)
      if (sampleError.code !== 'PGRST116') {
        throw sampleError;
      }
    }

    // Verificar colunas necessárias
    const requiredColumns = [
      'id',
      'user_id',
      'push_enabled',
      'email_enabled',
      'coupons_only',
      'coupon_platforms',
      'category_preferences',
      'keyword_preferences',
      'product_name_preferences',
      'home_filters',
      'created_at',
      'updated_at'
    ];

    logger.info('   Colunas necessárias:');
    requiredColumns.forEach(col => {
      logger.info(`      - ${col}`);
    });

    if (sample) {
      logger.info('\n   Colunas encontradas no registro de exemplo:');
      Object.keys(sample).forEach(col => {
        logger.info(`      - ${col}: ${typeof sample[col]}`);
      });

      // Verificar se colunas críticas existem
      const missingColumns = requiredColumns.filter(col => !(col in sample));
      
      if (missingColumns.length > 0) {
        logger.warn('\n⚠️ Colunas faltando:');
        missingColumns.forEach(col => {
          logger.warn(`      - ${col}`);
        });
        logger.warn('\n   Execute a migration: add_coupons_only_preferences.sql');
      } else {
        logger.info('\n✅ Todas as colunas necessárias existem');
      }
    } else {
      logger.info('\n   ℹ️ Nenhum registro encontrado para verificar colunas');
      logger.info('   Isso é normal se nenhum usuário configurou preferências ainda');
    }

    // 3. Testar inserção
    logger.info('\n3️⃣ Testando inserção de dados...');
    
    const testUserId = 99999; // ID de teste
    const testData = {
      user_id: testUserId,
      push_enabled: true,
      email_enabled: false,
      coupons_only: true,
      coupon_platforms: ['shopee', 'amazon'],
      category_preferences: [1, 2],
      keyword_preferences: ['teste', 'iphone'],
      product_name_preferences: ['iPhone 15'],
      home_filters: { platforms: [], categories: [] },
    };

    logger.info('   Dados de teste:');
    logger.info(`      user_id: ${testData.user_id}`);
    logger.info(`      push_enabled: ${testData.push_enabled}`);
    logger.info(`      coupons_only: ${testData.coupons_only}`);
    logger.info(`      coupon_platforms: ${JSON.stringify(testData.coupon_platforms)}`);

    const { data: inserted, error: insertError } = await supabase
      .from('notification_preferences')
      .upsert(testData, { onConflict: 'user_id' })
      .select()
      .single();

    if (insertError) {
      logger.error('\n❌ Erro ao inserir dados de teste:');
      logger.error(`   Código: ${insertError.code}`);
      logger.error(`   Mensagem: ${insertError.message}`);
      logger.error(`   Detalhes: ${JSON.stringify(insertError.details)}`);
      
      if (insertError.code === '42703') {
        logger.error('\n   ⚠️ Coluna não existe! Execute a migration:');
        logger.error('   psql -d seu_banco -f backend/database/migrations/add_coupons_only_preferences.sql');
      }
      
      process.exit(1);
    }

    logger.info('\n✅ Inserção bem-sucedida!');
    logger.info('   Dados inseridos:');
    logger.info(`      id: ${inserted.id}`);
    logger.info(`      user_id: ${inserted.user_id}`);
    logger.info(`      push_enabled: ${inserted.push_enabled}`);
    logger.info(`      coupons_only: ${inserted.coupons_only}`);
    logger.info(`      coupon_platforms: ${JSON.stringify(inserted.coupon_platforms)}`);

    // 4. Limpar dados de teste
    logger.info('\n4️⃣ Limpando dados de teste...');
    const { error: deleteError } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', testUserId);

    if (deleteError) {
      logger.warn(`   ⚠️ Erro ao limpar: ${deleteError.message}`);
    } else {
      logger.info('   ✅ Dados de teste removidos');
    }

    // 5. Estatísticas
    logger.info('\n5️⃣ Estatísticas da tabela...');
    
    const { count: totalCount, error: countError } = await supabase
      .from('notification_preferences')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      logger.info(`   Total de registros: ${totalCount}`);
    }

    const { count: couponsOnlyCount } = await supabase
      .from('notification_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('coupons_only', true);

    logger.info(`   Com coupons_only ativado: ${couponsOnlyCount || 0}`);

    const { count: pushEnabledCount } = await supabase
      .from('notification_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('push_enabled', true);

    logger.info(`   Com push_enabled ativado: ${pushEnabledCount || 0}`);

    logger.info('\n========================================');
    logger.info('✅ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!');
    logger.info('   A tabela está configurada corretamente.');
    logger.info('========================================\n');

  } catch (error) {
    logger.error('\n❌ Erro durante verificação:');
    logger.error(`   Mensagem: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Executar verificação
checkAndFixTable()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    logger.error(`❌ Erro fatal: ${error.message}`);
    process.exit(1);
  });

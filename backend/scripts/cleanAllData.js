/**
 * Script para limpar TODOS os dados do banco de dados
 * Mantém apenas as configurações (settings, telegram-channels, bots)
 * 
 * USO: node backend/scripts/cleanAllData.js
 * 
 * ATENÇÃO: Esta operação é IRREVERSÍVEL!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Tabelas que serão LIMPADAS (dados)
const DATA_TABLES = [
  'price_history',
  'click_tracking',
  'notifications',
  'bot_send_logs',
  'sync_logs',
  'coupon_sync_logs',
  'product_duplicates',
  'ai_decision_logs',
  'products',
  'coupons',
  'users', // Opcional - descomente se quiser limpar
  'categories' // Opcional - descomente se quiser limpar
];

// Tabelas que serão PRESERVADAS (configurações)
const CONFIG_TABLES = [
  'app_settings',
  'bot_config',
  'bot_channels',
  'bot_message_templates',
  'telegram_channels',
  'telegram_collector_config',
  'sync_config',
  'coupon_settings'
];

// Função para confirmar ação
function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'sim' || answer.toLowerCase() === 's' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Função para deletar dados de uma tabela
async function deleteFromTable(tableName) {
  try {
    console.log(`🗑️  Deletando dados de ${tableName}...`);
    
    // Para tabelas com foreign keys, primeiro desvincular
    if (tableName === 'products') {
      // Desvincular cupons dos produtos
      const { error: updateError } = await supabase
        .from('products')
        .update({ coupon_id: null })
        .neq('coupon_id', null);
      
      if (updateError) {
        console.warn(`⚠️  Aviso ao desvincular cupons: ${updateError.message}`);
      }
    }
    
    // Deletar em lotes usando Supabase API - sem limite de tentativas
    let hasMore = true;
    let totalDeleted = 0;
    let attempts = 0;
    let consecutiveEmptyBatches = 0;
    const maxConsecutiveEmpty = 3; // Parar após 3 lotes vazios consecutivos
    
    while (hasMore) {
      attempts++;
      
      // Buscar um lote de IDs (usar order by para garantir ordem consistente)
      const { data: batch, error: fetchError } = await supabase
        .from(tableName)
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1000);
      
      if (fetchError) {
        if (fetchError.message.includes('does not exist') || fetchError.message.includes('não existe')) {
          console.log(`   ℹ️  Tabela ${tableName} não existe, pulando...`);
          return { success: true, skipped: true };
        }
        throw fetchError;
      }
      
      if (!batch || batch.length === 0) {
        consecutiveEmptyBatches++;
        if (consecutiveEmptyBatches >= maxConsecutiveEmpty) {
          hasMore = false;
          break;
        }
        // Pequeno delay antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      consecutiveEmptyBatches = 0; // Reset contador
      
      // Deletar o lote
      const ids = batch.map(row => row.id);
      
      // Tentar deletar todos de uma vez
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        // Se falhar, tentar deletar em sub-lotes menores
        console.warn(`   ⚠️  Erro ao deletar lote completo, tentando em sub-lotes...`);
        const subBatchSize = 100;
        for (let i = 0; i < ids.length; i += subBatchSize) {
          const subBatch = ids.slice(i, i + subBatchSize);
          const { error: subError } = await supabase
            .from(tableName)
            .delete()
            .in('id', subBatch);
          
          if (subError) {
            console.error(`   ❌ Erro ao deletar sub-lote: ${subError.message}`);
            // Continuar mesmo com erro
          } else {
            totalDeleted += subBatch.length;
          }
        }
      } else {
        totalDeleted += ids.length;
      }
      
      // Mostrar progresso a cada 1000 registros ou no final
      if (totalDeleted % 1000 === 0 || batch.length < 1000) {
        console.log(`   📊 Deletados ${totalDeleted} registros... (tentativa ${attempts})`);
      }
      
      // Se o lote foi menor que 1000, verificar se ainda há mais
      if (batch.length < 1000) {
        // Verificar se ainda há registros
        const { count: remainingCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (remainingCount === 0) {
          hasMore = false;
        }
      }
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Verificação final - tentar deletar qualquer registro restante
    const { count: finalCount } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (finalCount > 0) {
      console.log(`   ⚠️  Ainda restam ${finalCount} registros. Tentando deletar novamente...`);
      
      // Última tentativa: deletar todos de uma vez usando uma query diferente
      const { data: remaining, error: remainingError } = await supabase
        .from(tableName)
        .select('id')
        .limit(10000);
      
      if (!remainingError && remaining && remaining.length > 0) {
        const remainingIds = remaining.map(row => row.id);
        // Deletar em lotes menores
        for (let i = 0; i < remainingIds.length; i += 500) {
          const subBatch = remainingIds.slice(i, i + 500);
          await supabase
            .from(tableName)
            .delete()
            .in('id', subBatch);
        }
        totalDeleted += remainingIds.length;
      }
    }
    
    console.log(`   ✅ ${tableName} limpo (${totalDeleted} registros deletados em ${attempts} tentativas)`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`   ❌ Erro ao limpar ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função para deletar notification_logs baseado em event_type
async function deleteNotificationLogs() {
  try {
    console.log(`🗑️  Deletando logs de notificações relacionados...`);
    
    const eventTypes = ['promotion_new', 'coupon_new', 'coupon_expired', 'price_drop'];
    let hasMore = true;
    let totalDeleted = 0;
    let attempts = 0;
    let consecutiveEmptyBatches = 0;
    const maxConsecutiveEmpty = 3;
    
    while (hasMore) {
      attempts++;
      
      // Buscar um lote de IDs
      const { data: batch, error: fetchError } = await supabase
        .from('notification_logs')
        .select('id')
        .in('event_type', eventTypes)
        .order('created_at', { ascending: true })
        .limit(1000);
      
      if (fetchError) {
        if (fetchError.message.includes('does not exist') || fetchError.message.includes('não existe')) {
          console.log(`   ℹ️  Tabela notification_logs não existe, pulando...`);
          return { success: true, skipped: true };
        }
        throw fetchError;
      }
      
      if (!batch || batch.length === 0) {
        consecutiveEmptyBatches++;
        if (consecutiveEmptyBatches >= maxConsecutiveEmpty) {
          hasMore = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      consecutiveEmptyBatches = 0;
      
      // Deletar o lote
      const ids = batch.map(row => row.id);
      const { error: deleteError } = await supabase
        .from('notification_logs')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        // Tentar em sub-lotes
        const subBatchSize = 100;
        for (let i = 0; i < ids.length; i += subBatchSize) {
          const subBatch = ids.slice(i, i + subBatchSize);
          const { error: subError } = await supabase
            .from('notification_logs')
            .delete()
            .in('id', subBatch);
          
          if (!subError) {
            totalDeleted += subBatch.length;
          }
        }
      } else {
        totalDeleted += ids.length;
      }
      
      if (totalDeleted % 1000 === 0 || batch.length < 1000) {
        console.log(`   📊 Deletados ${totalDeleted} registros... (tentativa ${attempts})`);
      }
      
      if (batch.length < 1000) {
        const { count: remainingCount } = await supabase
          .from('notification_logs')
          .select('*', { count: 'exact', head: true })
          .in('event_type', eventTypes);
        
        if (remainingCount === 0) {
          hasMore = false;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Verificação final
    const { count: finalCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .in('event_type', eventTypes);
    
    if (finalCount > 0) {
      console.log(`   ⚠️  Ainda restam ${finalCount} registros. Tentando deletar novamente...`);
      const { data: remaining } = await supabase
        .from('notification_logs')
        .select('id')
        .in('event_type', eventTypes)
        .limit(10000);
      
      if (remaining && remaining.length > 0) {
        const remainingIds = remaining.map(row => row.id);
        for (let i = 0; i < remainingIds.length; i += 500) {
          const subBatch = remainingIds.slice(i, i + 500);
          await supabase
            .from('notification_logs')
            .delete()
            .in('id', subBatch);
        }
        totalDeleted += remainingIds.length;
      }
    }
    
    console.log(`   ✅ notification_logs limpo (${totalDeleted} registros deletados em ${attempts} tentativas)`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`   ❌ Erro ao limpar notification_logs: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função para verificar contagem de registros
async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('não existe')) {
        return 0;
      }
      throw error;
    }
    
    return count || 0;
  } catch (error) {
    return 0;
  }
}

// Função principal
async function main() {
  console.log('========================================');
  console.log('🧹 SCRIPT DE LIMPEZA DE DADOS');
  console.log('========================================');
  console.log('');
  console.log('⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!');
  console.log('');
  console.log('Este script irá DELETAR:');
  console.log('  - Todos os produtos');
  console.log('  - Todos os cupons');
  console.log('  - Histórico de preços');
  console.log('  - Rastreamento de cliques');
  console.log('  - Notificações');
  console.log('  - Todos os logs relacionados');
  console.log('');
  console.log('Tabelas PRESERVADAS (configurações):');
  CONFIG_TABLES.forEach(table => console.log(`  ✅ ${table}`));
  console.log('');
  
  // Confirmar ação
  const confirmed = await confirmAction('Deseja continuar? (sim/não): ');
  
  if (!confirmed) {
    console.log('❌ Operação cancelada pelo usuário');
    process.exit(0);
  }
  
  console.log('');
  console.log('🔄 Iniciando limpeza...');
  console.log('');
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  // Limpar tabelas de dados
  for (const table of DATA_TABLES) {
    // Pular users e categories por padrão (descomente se quiser limpar)
    if (table === 'users' || table === 'categories') {
      console.log(`⏭️  Pulando ${table} (preservado por padrão)`);
      results.skipped.push(table);
      continue;
    }
    
    const result = await deleteFromTable(table);
    if (result.success) {
      if (result.skipped) {
        results.skipped.push(table);
      } else {
        results.success.push(table);
      }
    } else {
      results.failed.push({ table, error: result.error });
    }
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Limpar notification_logs separadamente
  const notificationResult = await deleteNotificationLogs();
  if (notificationResult.success) {
    if (notificationResult.skipped) {
      results.skipped.push('notification_logs');
    } else {
      results.success.push('notification_logs');
    }
  } else {
    results.failed.push({ table: 'notification_logs', error: notificationResult.error });
  }
  
  console.log('');
  console.log('========================================');
  console.log('📊 RESULTADO DA LIMPEZA');
  console.log('========================================');
  console.log(`✅ Tabelas limpas com sucesso: ${results.success.length}`);
  results.success.forEach(table => console.log(`   - ${table}`));
  console.log('');
  
  if (results.skipped.length > 0) {
    console.log(`⏭️  Tabelas puladas: ${results.skipped.length}`);
    results.skipped.forEach(table => console.log(`   - ${table}`));
    console.log('');
  }
  
  if (results.failed.length > 0) {
    console.log(`❌ Tabelas com erro: ${results.failed.length}`);
    results.failed.forEach(({ table, error }) => console.log(`   - ${table}: ${error}`));
    console.log('');
  }
  
  // Verificação final
  console.log('🔍 Verificando contagens finais...');
  console.log('');
  
  const finalCounts = {};
  const tablesWithRemaining = [];
  
  for (const table of DATA_TABLES) {
    if (table === 'users' || table === 'categories') continue;
    const count = await getTableCount(table);
    finalCounts[table] = count;
    if (count > 0) {
      console.log(`⚠️  ${table}: ${count} registro(s) restante(s)`);
      tablesWithRemaining.push(table);
    } else {
      console.log(`✅ ${table}: 0 registros`);
    }
  }
  
  const notificationCount = await getTableCount('notification_logs');
  if (notificationCount > 0) {
    console.log(`⚠️  notification_logs: ${notificationCount} registro(s) restante(s)`);
    tablesWithRemaining.push('notification_logs');
  } else {
    console.log(`✅ notification_logs: 0 registros`);
  }
  
  // Se ainda houver registros, tentar deletar novamente
  if (tablesWithRemaining.length > 0) {
    console.log('');
    console.log('🔄 Tentando limpar registros restantes...');
    console.log('');
    
    for (const table of tablesWithRemaining) {
      if (table === 'notification_logs') {
        // Tentar deletar notification_logs novamente
        const result = await deleteNotificationLogs();
        if (result.success) {
          const newCount = await getTableCount('notification_logs');
          if (newCount === 0) {
            console.log(`   ✅ notification_logs limpo completamente`);
          } else {
            console.log(`   ⚠️  notification_logs ainda tem ${newCount} registros`);
          }
        }
      } else {
        // Tentar deletar a tabela novamente
        const result = await deleteFromTable(table);
        if (result.success) {
          const newCount = await getTableCount(table);
          if (newCount === 0) {
            console.log(`   ✅ ${table} limpo completamente`);
          } else {
            console.log(`   ⚠️  ${table} ainda tem ${newCount} registros`);
          }
        }
      }
    }
    
    console.log('');
    console.log('🔍 Verificação final após segunda tentativa...');
    console.log('');
    
    // Verificação final novamente
    for (const table of DATA_TABLES) {
      if (table === 'users' || table === 'categories') continue;
      const count = await getTableCount(table);
      if (count > 0) {
        console.log(`⚠️  ${table}: ${count} registro(s) restante(s) - pode ser necessário usar SQL direto`);
      } else {
        console.log(`✅ ${table}: 0 registros`);
      }
    }
    
    const finalNotificationCount = await getTableCount('notification_logs');
    if (finalNotificationCount > 0) {
      console.log(`⚠️  notification_logs: ${finalNotificationCount} registro(s) restante(s) - pode ser necessário usar SQL direto`);
    } else {
      console.log(`✅ notification_logs: 0 registros`);
    }
  }
  
  console.log('');
  console.log('========================================');
  console.log('✅ Limpeza concluída!');
  console.log('========================================');
  
  // Verificar se há erros
  if (results.failed.length > 0) {
    console.log('');
    console.log('⚠️  Algumas tabelas não puderam ser limpas. Verifique os erros acima.');
    console.log('💡 Dica: Se ainda houver registros, use o script SQL direto: database/migrations/047_clean_all_data_keep_configs.sql');
    process.exit(1);
  }
  
  // Avisar se ainda houver registros
  const stillHasData = Object.values(finalCounts).some(count => count > 0) || 
                       (await getTableCount('notification_logs')) > 0;
  
  if (stillHasData) {
    console.log('');
    console.log('⚠️  Ainda há registros restantes em algumas tabelas.');
    console.log('💡 Dica: Use o script SQL direto para limpeza completa: database/migrations/047_clean_all_data_keep_configs.sql');
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});


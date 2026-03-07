import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

/**
 * Script para debugar a query do cron de agendamento
 * Verifica por que posts não estão sendo encontrados
 */

async function debugCronQuery() {
  console.log('🔍 ========== DEBUG: QUERY DO CRON ==========\n');

  try {
    const now = new Date();
    const nowISO = now.toISOString();
    
    console.log('📅 Informações de Horário:');
    console.log(`   Horário atual (Date.now()): ${now}`);
    console.log(`   Horário atual (ISO): ${nowISO}`);
    console.log(`   Horário local (BR): ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`   Timezone do processo: ${process.env.TZ || 'não configurado'}`);
    console.log('');

    // 1. Query exata que o cron usa
    console.log('1️⃣ Executando query EXATA do cron...');
    console.log(`   Query: status='pending' AND scheduled_at <= '${nowISO}'`);
    console.log('');

    const { data: posts, error, count } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(*)', { count: 'exact' })
      .eq('status', 'pending')
      .lte('scheduled_at', nowISO)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) throw error;

    console.log(`   ✅ Query executada com sucesso`);
    console.log(`   Total encontrado: ${count || 0}`);
    console.log(`   Retornados (limit 10): ${posts?.length || 0}`);
    console.log('');

    if (posts && posts.length > 0) {
      console.log('📋 Posts encontrados pela query do cron:');
      posts.forEach((post, index) => {
        const scheduledDate = new Date(post.scheduled_at);
        const diffMs = now - scheduledDate;
        const diffMin = Math.floor(diffMs / 60000);
        
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Produto: ${post.products?.name || 'N/A'}`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Agendado para: ${post.scheduled_at}`);
        console.log(`      Diferença: ${diffMin} minutos atrás`);
        console.log(`      Tentativas: ${post.attempts || 0}`);
        if (post.error_message) {
          console.log(`      ❌ Último erro: ${post.error_message}`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum post encontrado pela query do cron!');
      console.log('');
    }

    // 2. Verificar posts pendentes (sem filtro de data)
    console.log('2️⃣ Verificando TODOS os posts pendentes (sem filtro de data)...');
    const { data: allPending, error: allError } = await supabase
      .from('scheduled_posts')
      .select('id, scheduled_at, platform, status, attempts')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(20);

    if (allError) throw allError;

    console.log(`   Total de posts pendentes: ${allPending?.length || 0}`);
    console.log('');

    if (allPending && allPending.length > 0) {
      console.log('📋 Todos os posts pendentes:');
      allPending.forEach((post, index) => {
        const scheduledDate = new Date(post.scheduled_at);
        const diffMs = now - scheduledDate;
        const diffMin = Math.floor(diffMs / 60000);
        const isPast = scheduledDate <= now;
        
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Agendado para: ${post.scheduled_at}`);
        console.log(`      Horário local: ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`      Status: ${isPast ? '⏰ DEVERIA SER PROCESSADO' : '⏳ AGUARDANDO'}`);
        console.log(`      Diferença: ${diffMin > 0 ? `${diffMin} min atrás` : `em ${Math.abs(diffMin)} min`}`);
        console.log(`      Tentativas: ${post.attempts || 0}`);
        console.log('');
      });
    }

    // 3. Comparação de datas
    console.log('3️⃣ Análise de Comparação de Datas:');
    if (allPending && allPending.length > 0) {
      const firstPost = allPending[0];
      const scheduledDate = new Date(firstPost.scheduled_at);
      
      console.log(`   Post mais antigo: ${firstPost.id.substring(0, 8)}...`);
      console.log(`   scheduled_at (string): ${firstPost.scheduled_at}`);
      console.log(`   scheduled_at (Date): ${scheduledDate}`);
      console.log(`   now (Date): ${now}`);
      console.log(`   now (ISO): ${nowISO}`);
      console.log('');
      console.log('   Comparações:');
      console.log(`   scheduledDate <= now: ${scheduledDate <= now}`);
      console.log(`   firstPost.scheduled_at <= nowISO: ${firstPost.scheduled_at <= nowISO}`);
      console.log(`   Diferença (ms): ${now - scheduledDate}`);
      console.log(`   Diferença (min): ${Math.floor((now - scheduledDate) / 60000)}`);
      console.log('');
    }

    // 4. Verificar timezone do banco
    console.log('4️⃣ Verificando timezone do banco de dados...');
    const { data: dbTime, error: timeError } = await supabase
      .rpc('get_current_timestamp');

    if (!timeError && dbTime) {
      console.log(`   Horário do banco: ${dbTime}`);
      console.log(`   Horário do Node: ${nowISO}`);
      console.log(`   Diferença: ${new Date(dbTime) - now}ms`);
    } else {
      console.log('   ⚠️ Não foi possível obter horário do banco');
    }
    console.log('');

    // 5. Verificar posts em processamento
    console.log('5️⃣ Verificando posts em processamento...');
    const { data: processing, error: procError } = await supabase
      .from('scheduled_posts')
      .select('id, processing_started_at, platform')
      .eq('status', 'processing');

    if (procError) throw procError;

    console.log(`   Total em processamento: ${processing?.length || 0}`);
    if (processing && processing.length > 0) {
      processing.forEach((post, index) => {
        const startedAt = new Date(post.processing_started_at);
        const diffMin = Math.floor((now - startedAt) / 60000);
        const isStuck = diffMin > 5;
        
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Iniciado: ${post.processing_started_at}`);
        console.log(`      Tempo: ${diffMin} minutos`);
        console.log(`      Status: ${isStuck ? '🚨 TRAVADO' : '✅ OK'}`);
        console.log('');
      });
    }
    console.log('');

    // 6. Resumo e diagnóstico
    console.log('📊 ========== RESUMO DO DIAGNÓSTICO ==========');
    console.log('');
    
    if (posts && posts.length > 0) {
      console.log('✅ Query do cron ESTÁ FUNCIONANDO');
      console.log(`   ${posts.length} post(s) prontos para processar`);
      console.log('');
      console.log('🔍 Possíveis causas de não publicação:');
      console.log('   1. Bots offline ou com erro');
      console.log('   2. Erro na lógica de publicação');
      console.log('   3. Posts ficando travados em "processing"');
      console.log('');
      console.log('💡 Próximos passos:');
      console.log('   1. Verificar logs de erro do cron');
      console.log('   2. Testar publicação manual de um post');
      console.log('   3. Verificar status dos bots');
    } else if (allPending && allPending.length > 0) {
      console.log('⚠️ Query do cron NÃO está encontrando posts');
      console.log(`   Mas existem ${allPending.length} posts pendentes`);
      console.log('');
      console.log('🔍 Possíveis causas:');
      console.log('   1. Problema de timezone');
      console.log('   2. Formato de data incorreto');
      console.log('   3. Posts agendados para o futuro');
      console.log('');
      console.log('💡 Próximos passos:');
      console.log('   1. Verificar timezone do servidor (TZ)');
      console.log('   2. Comparar horários do banco vs Node');
      console.log('   3. Forçar publicação de um post para testar');
    } else {
      console.log('ℹ️ Não há posts pendentes no momento');
      console.log('');
      console.log('Isso é normal se:');
      console.log('   - Todos os posts já foram publicados');
      console.log('   - Não há produtos agendados');
      console.log('   - Posts estão agendados para o futuro');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar
debugCronQuery()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

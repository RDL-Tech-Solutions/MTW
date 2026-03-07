import { supabase } from '../src/config/database.js';
import logger from '../src/config/logger.js';

/**
 * Script para testar e diagnosticar posts agendados
 */

async function testScheduledPosts() {
  console.log('🔍 ========== DIAGNÓSTICO DE POSTS AGENDADOS ==========\n');

  try {
    // 1. Verificar posts pendentes
    console.log('1️⃣ Verificando posts pendentes...');
    const now = new Date().toISOString();
    console.log(`   Horário atual: ${now}`);
    console.log(`   Horário local: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`);

    const { data: pendingPosts, error: pendingError } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(id, name, platform)')
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true });

    if (pendingError) throw pendingError;

    console.log(`   ✅ Total de posts pendentes: ${pendingPosts.length}\n`);

    if (pendingPosts.length > 0) {
      console.log('   📋 Posts pendentes:');
      pendingPosts.forEach((post, index) => {
        const scheduledDate = new Date(post.scheduled_at);
        const nowDate = new Date();
        const diffMinutes = Math.floor((nowDate - scheduledDate) / 60000);
        const isPast = scheduledDate <= nowDate;
        
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Produto: ${post.products?.name || 'N/A'}`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Agendado para: ${post.scheduled_at}`);
        console.log(`      Horário local: ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`      Status: ${isPast ? '⏰ PRONTO PARA PROCESSAR' : '⏳ AGUARDANDO'}`);
        console.log(`      Diferença: ${diffMinutes > 0 ? `${diffMinutes} min atrás` : `em ${Math.abs(diffMinutes)} min`}`);
        console.log(`      Tentativas: ${post.attempts || 0}`);
        if (post.error_message) {
          console.log(`      ❌ Último erro: ${post.error_message}`);
        }
        console.log('');
      });
    }

    // 2. Verificar posts em processamento
    console.log('\n2️⃣ Verificando posts em processamento...');
    const { data: processingPosts, error: processingError } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(id, name)')
      .eq('status', 'processing')
      .order('processing_started_at', { ascending: true });

    if (processingError) throw processingError;

    console.log(`   Total de posts em processamento: ${processingPosts.length}\n`);

    if (processingPosts.length > 0) {
      console.log('   ⚙️ Posts em processamento:');
      processingPosts.forEach((post, index) => {
        const startedAt = new Date(post.processing_started_at);
        const nowDate = new Date();
        const diffMinutes = Math.floor((nowDate - startedAt) / 60000);
        const isStuck = diffMinutes > 5;
        
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Produto: ${post.products?.name || 'N/A'}`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Iniciado em: ${post.processing_started_at}`);
        console.log(`      Tempo decorrido: ${diffMinutes} minutos`);
        console.log(`      Status: ${isStuck ? '🚨 TRAVADO (>5 min)' : '✅ OK'}`);
        console.log('');
      });
    }

    // 3. Verificar posts publicados recentemente
    console.log('\n3️⃣ Verificando posts publicados recentemente (últimas 24h)...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: publishedPosts, error: publishedError } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(id, name)')
      .eq('status', 'published')
      .gte('updated_at', yesterday)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (publishedError) throw publishedError;

    console.log(`   Total de posts publicados (24h): ${publishedPosts.length}\n`);

    if (publishedPosts.length > 0) {
      console.log('   ✅ Posts publicados recentemente:');
      publishedPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Produto: ${post.products?.name || 'N/A'}`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Publicado em: ${post.updated_at}`);
        console.log(`      Tentativas: ${post.attempts || 0}`);
        console.log('');
      });
    }

    // 4. Verificar posts falhados
    console.log('\n4️⃣ Verificando posts falhados...');
    const { data: failedPosts, error: failedError } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(id, name)')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (failedError) throw failedError;

    console.log(`   Total de posts falhados: ${failedPosts.length}\n`);

    if (failedPosts.length > 0) {
      console.log('   ❌ Posts falhados:');
      failedPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. Post ${post.id.substring(0, 8)}...`);
        console.log(`      Produto: ${post.products?.name || 'N/A'}`);
        console.log(`      Plataforma: ${post.platform}`);
        console.log(`      Agendado para: ${post.scheduled_at}`);
        console.log(`      Falhou em: ${post.updated_at}`);
        console.log(`      Tentativas: ${post.attempts || 0}`);
        console.log(`      Erro: ${post.error_message || 'N/A'}`);
        console.log('');
      });
    }

    // 5. Estatísticas gerais
    console.log('\n5️⃣ Estatísticas gerais...');
    const { data: stats, error: statsError } = await supabase
      .from('scheduled_posts')
      .select('status');

    if (statsError) throw statsError;

    const statusCount = stats.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {});

    console.log('   📊 Distribuição por status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });

    // 6. Verificar produtos recentes da extensão
    console.log('\n6️⃣ Verificando produtos recentes criados pela extensão...');
    const recentTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // Última hora
    
    const { data: recentProducts, error: recentError } = await supabase
      .from('products')
      .select('id, name, status, created_at')
      .gte('created_at', recentTime)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    console.log(`   Total de produtos criados (última hora): ${recentProducts.length}\n`);

    if (recentProducts.length > 0) {
      console.log('   📦 Produtos recentes:');
      for (const product of recentProducts) {
        console.log(`   - ${product.name.substring(0, 50)}...`);
        console.log(`     ID: ${product.id}`);
        console.log(`     Status: ${product.status}`);
        console.log(`     Criado em: ${product.created_at}`);
        
        // Verificar se tem posts agendados
        const { data: productPosts, error: postsError } = await supabase
          .from('scheduled_posts')
          .select('id, platform, status, scheduled_at')
          .eq('product_id', product.id);

        if (!postsError && productPosts.length > 0) {
          console.log(`     Posts agendados: ${productPosts.length}`);
          productPosts.forEach(post => {
            console.log(`       - ${post.platform}: ${post.status} (${post.scheduled_at})`);
          });
        } else {
          console.log(`     ⚠️ SEM POSTS AGENDADOS`);
        }
        console.log('');
      }
    }

    console.log('\n✅ Diagnóstico concluído!\n');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar
testScheduledPosts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

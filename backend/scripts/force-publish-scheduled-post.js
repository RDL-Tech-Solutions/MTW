import { supabase } from '../src/config/database.js';
import schedulerService from '../src/services/autoSync/schedulerService.js';
import logger from '../src/config/logger.js';

/**
 * Script para forçar publicação de um post agendado específico
 * Útil para testar e debugar o sistema de agendamento
 */

async function forcePublishPost() {
  const postId = process.argv[2];

  if (!postId) {
    console.log('❌ Uso: node scripts/force-publish-scheduled-post.js <post_id>');
    console.log('');
    console.log('Exemplo:');
    console.log('  node scripts/force-publish-scheduled-post.js 73180391');
    console.log('');
    console.log('Para ver posts disponíveis:');
    console.log('  node scripts/test-scheduled-posts.js');
    process.exit(1);
  }

  console.log('🚀 ========== FORÇAR PUBLICAÇÃO DE POST ==========\n');
  console.log(`Post ID: ${postId}\n`);

  try {
    // 1. Buscar post
    console.log('1️⃣ Buscando post...');
    const { data: posts, error: searchError } = await supabase
      .from('scheduled_posts')
      .select('*, products!product_id(*)')
      .or(`id.eq.${postId},id.like.${postId}%`)
      .limit(1);

    if (searchError) throw searchError;

    if (!posts || posts.length === 0) {
      console.log('❌ Post não encontrado!');
      console.log('');
      console.log('Dica: Use apenas os primeiros 8 caracteres do ID');
      console.log('Exemplo: 73180391 ao invés de 73180391-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      process.exit(1);
    }

    const post = posts[0];
    console.log(`✅ Post encontrado: ${post.id}`);
    console.log(`   Produto: ${post.products?.name || 'N/A'}`);
    console.log(`   Plataforma: ${post.platform}`);
    console.log(`   Status: ${post.status}`);
    console.log(`   Agendado para: ${post.scheduled_at}`);
    console.log('');

    // 2. Verificar se já foi publicado
    if (post.status === 'published') {
      console.log('⚠️ Este post já foi publicado!');
      console.log(`   Publicado em: ${post.updated_at}`);
      console.log('');
      console.log('Deseja publicar novamente? (isso pode causar duplicação)');
      process.exit(0);
    }

    // 3. Verificar se está em processamento
    if (post.status === 'processing') {
      console.log('⚠️ Este post está em processamento!');
      console.log(`   Iniciado em: ${post.processing_started_at}`);
      console.log('');
      console.log('Liberando post travado...');
      
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'pending',
          processing_started_at: null
        })
        .eq('id', post.id);
      
      console.log('✅ Post liberado. Tentando publicar...');
      console.log('');
    }

    // 4. Forçar publicação
    console.log('2️⃣ Forçando publicação...');
    console.log(`   Horário atual: ${new Date().toISOString()}`);
    console.log(`   Horário agendado: ${post.scheduled_at}`);
    console.log('');

    const success = await schedulerService.processSinglePost(post, { isForced: true });

    if (success) {
      console.log('');
      console.log('✅ ========== PUBLICAÇÃO BEM-SUCEDIDA ==========');
      console.log('');
      console.log('O post foi publicado com sucesso!');
      console.log('');
      console.log('Verifique:');
      console.log(`  - Canal ${post.platform}`);
      console.log('  - Logs do servidor');
      console.log('  - Status do post no banco');
      console.log('');
    } else {
      console.log('');
      console.log('❌ ========== PUBLICAÇÃO FALHOU ==========');
      console.log('');
      console.log('A publicação falhou. Verifique:');
      console.log('  - Logs de erro acima');
      console.log('  - Configuração dos bots');
      console.log('  - Conectividade com APIs');
      console.log('');
      
      // Buscar erro atualizado
      const { data: updatedPost } = await supabase
        .from('scheduled_posts')
        .select('error_message, attempts')
        .eq('id', post.id)
        .single();

      if (updatedPost && updatedPost.error_message) {
        console.log(`Erro registrado: ${updatedPost.error_message}`);
        console.log(`Tentativas: ${updatedPost.attempts || 0}/3`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro ao forçar publicação:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar
forcePublishPost()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

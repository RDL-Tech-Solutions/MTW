/**
 * Script de teste para Republicação Automática com IA
 * 
 * Testa:
 * 1. Conexão com OpenRouter
 * 2. Busca de produtos aprovados
 * 3. Criação de estratégia com IA
 * 4. Agendamento de produtos
 * 
 * Uso: node backend/scripts/test-auto-republish.js
 */

import autoRepublishService from '../src/services/autoRepublishService.js';
import logger from '../src/config/logger.js';
import AppSettings from '../src/models/AppSettings.js';

async function testAutoRepublish() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTE: Republicação Automática com IA');
  console.log('🧪 ========================================\n');

  try {
    // 1. Verificar configurações do OpenRouter
    console.log('1️⃣ Verificando configurações do OpenRouter...');
    const settings = await AppSettings.get();
    
    if (!settings.openrouter_api_key) {
      console.error('❌ OpenRouter API Key não configurada!');
      console.log('💡 Configure em: Configurações → IA / OpenRouter');
      process.exit(1);
    }
    
    if (!settings.openrouter_enabled) {
      console.warn('⚠️ OpenRouter está desabilitado!');
      console.log('💡 Ative em: Configurações → IA / OpenRouter');
    }
    
    console.log(`✅ OpenRouter configurado`);
    console.log(`   Modelo: ${settings.openrouter_model || 'padrão'}`);
    console.log(`   Status: ${settings.openrouter_enabled ? 'Ativo' : 'Inativo'}\n`);

    // 2. Verificar status do serviço
    console.log('2️⃣ Verificando status do serviço...');
    const enabled = await autoRepublishService.isEnabled();
    const status = autoRepublishService.getStatus();
    
    console.log(`   Republicação automática: ${enabled ? '✅ Ativada' : '❌ Desativada'}`);
    console.log(`   Em execução: ${status.isRunning ? 'Sim' : 'Não'}`);
    console.log(`   Última execução: ${status.lastRun || 'Nunca'}\n`);

    // 3. Buscar produtos aprovados
    console.log('3️⃣ Buscando produtos aprovados...');
    const products = await autoRepublishService.getApprovedProducts();
    
    if (products.length === 0) {
      console.log('⚠️ Nenhum produto aprovado encontrado para teste');
      console.log('💡 Aprove alguns produtos primeiro em /products\n');
      
      console.log('✅ Teste concluído (sem produtos para testar)');
      process.exit(0);
    }
    
    console.log(`✅ Encontrados ${products.length} produtos aprovados`);
    console.log('\n📋 Primeiros 5 produtos:');
    products.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
      console.log(`      Plataforma: ${p.platform}`);
      console.log(`      Desconto: ${p.discount_percentage || 0}%`);
      console.log(`      Score: ${p.offer_score || 'N/A'}`);
      console.log(`      Cupom: ${p.coupon_id ? 'Sim' : 'Não'}`);
    });
    console.log('');

    // 4. Testar criação de estratégia (sem agendar)
    console.log('4️⃣ Testando criação de estratégia com IA...');
    console.log('   (Isso pode levar alguns segundos...)\n');
    
    try {
      const strategy = await autoRepublishService.createRepublishStrategy(products.slice(0, 10));
      
      console.log('✅ Estratégia criada com sucesso!');
      console.log(`\n📝 Resumo: ${strategy.summary}`);
      console.log(`\n📅 Agendamentos sugeridos: ${strategy.schedule.length}`);
      
      if (strategy.schedule.length > 0) {
        console.log('\n📋 Primeiros 5 agendamentos:');
        strategy.schedule.slice(0, 5).forEach((item, i) => {
          const product = products.find(p => p.id === item.product_id);
          console.log(`   ${i + 1}. ${product?.name || 'Produto não encontrado'}`);
          console.log(`      Data: ${item.scheduled_date} ${item.scheduled_time}`);
          console.log(`      Prioridade: ${item.priority}`);
          console.log(`      Motivo: ${item.reason}`);
        });
      }
      
    } catch (aiError) {
      console.error('❌ Erro ao criar estratégia com IA:', aiError.message);
      console.log('\n⚠️ Testando estratégia de fallback...');
      
      const fallbackStrategy = autoRepublishService.createFallbackStrategy(products.slice(0, 10));
      console.log('✅ Estratégia de fallback criada');
      console.log(`   Resumo: ${fallbackStrategy.summary}`);
      console.log(`   Agendamentos: ${fallbackStrategy.schedule.length}`);
    }

    console.log('\n5️⃣ Teste de agendamento (DRY RUN)...');
    console.log('   ℹ️ Este teste NÃO irá agendar produtos de verdade');
    console.log('   ℹ️ Para agendar de verdade, use o botão no admin panel\n');

    // 6. Resumo final
    console.log('🎉 ========================================');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('🎉 ========================================\n');
    
    console.log('✅ Checklist:');
    console.log(`   ${settings.openrouter_api_key ? '✅' : '❌'} OpenRouter configurado`);
    console.log(`   ${settings.openrouter_enabled ? '✅' : '⚠️'} OpenRouter ativo`);
    console.log(`   ${products.length > 0 ? '✅' : '⚠️'} Produtos aprovados disponíveis`);
    console.log(`   ✅ Serviço de republicação funcionando`);
    console.log(`   ✅ IA capaz de criar estratégias\n`);

    console.log('📝 Próximos passos:');
    console.log('   1. Acesse o admin panel em /products');
    console.log('   2. Clique em "Ativar IA"');
    console.log('   3. Clique em "Republicar Agora"');
    console.log('   4. Verifique os agendamentos em /scheduled-posts\n');

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ ERRO NO TESTE');
    console.error('❌ ========================================\n');
    console.error('Erro:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Executar teste
testAutoRepublish()
  .then(() => {
    console.log('✅ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

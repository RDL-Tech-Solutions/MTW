/**
 * Script de Teste: Criar Cupom e Enviar Notificações
 * 
 * Cria um cupom de teste e envia para WhatsApp, Telegram e Push
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎟️ TESTE: Criar Cupom e Enviar Notificações\n');
console.log('='.repeat(60));

async function testCouponCreationAndSend() {
  try {
    // Importar dependências
    const { default: Coupon } = await import('../src/models/Coupon.js');
    const { default: couponNotificationService } = await import('../src/services/coupons/couponNotificationService.js');

    console.log('\n1️⃣ Criando cupom de teste...\n');

    // Dados do cupom de teste
    const couponData = {
      code: `TESTE${Date.now()}`,
      title: '🔥 Cupom de Teste - 50% OFF',
      description: 'Cupom de teste para validar envio de imagem + template no WhatsApp',
      discount_type: 'percentage', // 'percentage' ou 'fixed'
      discount_value: 50.00, // Valor do desconto
      platform: 'mercadolivre', // Tem logo disponível
      link: 'https://mercadolivre.com.br/cupom-teste',
      category_id: 1, // Categoria padrão
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      is_active: true,
      is_published: false,
      is_out_of_stock: false
    };

    console.log('📋 Dados do cupom:');
    console.log(`   Código: ${couponData.code}`);
    console.log(`   Título: ${couponData.title}`);
    console.log(`   Desconto: ${couponData.discount_value}${couponData.discount_type === 'percentage' ? '%' : ' reais'}`);
    console.log(`   Plataforma: ${couponData.platform}`);
    console.log(`   Expira em: ${new Date(couponData.valid_until).toLocaleDateString('pt-BR')}`);

    // Criar cupom no banco de dados
    const coupon = await Coupon.create(couponData);
    console.log(`\n✅ Cupom criado com ID: ${coupon.id}`);

    console.log('\n' + '='.repeat(60));
    console.log('2️⃣ Enviando notificações...\n');

    // Enviar notificações
    const startTime = Date.now();
    const result = await couponNotificationService.notifyNewCoupon(coupon, { manual: true });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO DO ENVIO');
    console.log('='.repeat(60));

    console.log(`\n⏱️  Tempo de execução: ${duration}s`);
    console.log(`\n✅ Status geral: ${result.success ? 'SUCESSO' : 'FALHA'}`);

    if (result.whatsapp) {
      console.log('\n📱 WhatsApp:');
      console.log(`   Status: ${result.whatsapp.success ? '✅ Enviado' : '❌ Falhou'}`);
      console.log(`   Enviados: ${result.whatsapp.sent || 0}/${result.whatsapp.total || 0}`);
      if (result.whatsapp.reason) {
        console.log(`   Motivo: ${result.whatsapp.reason}`);
      }
    }

    if (result.telegram) {
      console.log('\n📢 Telegram:');
      console.log(`   Status: ${result.telegram.success ? '✅ Enviado' : '❌ Falhou'}`);
      console.log(`   Enviados: ${result.telegram.sent || 0}/${result.telegram.total || 0}`);
      if (result.telegram.reason) {
        console.log(`   Motivo: ${result.telegram.reason}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICAÇÕES');
    console.log('='.repeat(60));

    console.log('\n✅ O que verificar no WhatsApp:');
    console.log('   1. Imagem do logo do Mercado Livre');
    console.log('   2. Template completo como caption');
    console.log('   3. Código do cupom formatado');
    console.log('   4. Link clicável');

    console.log('\n✅ O que verificar no Telegram:');
    console.log('   1. Imagem do logo do Mercado Livre');
    console.log('   2. Template completo como caption');
    console.log('   3. Código do cupom em <code>');
    console.log('   4. Botão "Ver Cupom"');

    console.log('\n✅ Performance esperada:');
    console.log(`   Tempo: ${duration}s (esperado: 1-3s)`);
    if (parseFloat(duration) <= 3) {
      console.log('   ✅ Performance EXCELENTE!');
    } else if (parseFloat(duration) <= 5) {
      console.log('   ⚠️  Performance BOA (pode melhorar)');
    } else {
      console.log('   ❌ Performance RUIM (investigar logs)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📝 LOGS DO SERVIDOR');
    console.log('='.repeat(60));

    console.log('\nPara ver logs detalhados:');
    console.log('   pm2 logs backend --lines 50');

    console.log('\nProcurar por:');
    console.log('   ✅ "Cupom ${coupon.code} publicado com sucesso"');
    console.log('   ✅ "Logo encontrado"');
    console.log('   ✅ "Enviando para WhatsApp"');
    console.log('   ✅ "Enviando para Telegram"');
    console.log('   ❌ Erros de timeout');
    console.log('   ❌ Erros de "Logo não encontrado"');

    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRÓXIMOS PASSOS');
    console.log('='.repeat(60));

    console.log('\n1. Verificar WhatsApp e Telegram');
    console.log('2. Confirmar que imagem + template chegaram');
    console.log('3. Verificar performance (tempo de envio)');
    console.log('4. Se tudo OK, testar com cupom real');

    console.log('\n✅ Teste concluído!\n');

    // Limpar cupom de teste (opcional)
    console.log('💡 Dica: Para limpar o cupom de teste:');
    console.log(`   DELETE FROM coupons WHERE id = ${coupon.id};`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Verificar se servidor está rodando: pm2 status');
    console.log('   2. Verificar logs: pm2 logs backend --lines 50');
    console.log('   3. Verificar conexão com banco de dados');
    console.log('   4. Verificar se WhatsApp Web está conectado');
    
    process.exit(1);
  }
}

// Executar teste
testCouponCreationAndSend();

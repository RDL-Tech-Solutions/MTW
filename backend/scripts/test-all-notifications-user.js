/**
 * Script para testar TODAS as notificações para um usuário específico
 * Uso: node backend/scripts/test-all-notifications-user.js robertossh@gmail.com
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fcmService from '../src/services/fcmService.js';
import { supabase } from '../src/config/database.js';

// Carregar .env do diretório backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const userEmail = process.argv[2] || 'robertosshbrasil@gmail.com';

console.log('🧪 ========================================');
console.log('🧪 TESTE COMPLETO DE NOTIFICAÇÕES');
console.log('🧪 ========================================\n');
console.log(`📧 Usuário: ${userEmail}\n`);

async function findUser(email) {
  console.log('1️⃣ Buscando usuário no banco de dados...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('❌ Erro ao buscar usuário:', error.message);
    return null;
  }

  if (!users || users.length === 0) {
    console.error('❌ Usuário não encontrado');
    console.log('\n💡 Usuários disponíveis:');
    
    // Listar alguns usuários
    const { data: allUsers } = await supabase
      .from('users')
      .select('email, name')
      .limit(10);
    
    if (allUsers && allUsers.length > 0) {
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.name || 'Sem nome'})`);
      });
    }
    
    return null;
  }

  const user = users[0]; // Pegar o primeiro se houver múltiplos

  console.log('✅ Usuário encontrado!');
  console.log(`   Nome: ${user.name || 'Sem nome'}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   FCM Token: ${user.fcm_token ? '✅ Registrado' : '❌ Não registrado'}`);
  
  if (user.fcm_token) {
    console.log(`   Token: ${user.fcm_token.substring(0, 40)}...`);
  }
  
  console.log('');
  
  return user;
}

async function checkFCMStatus() {
  console.log('2️⃣ Verificando configuração do FCM...');
  
  const isEnabled = fcmService.isEnabled();
  
  if (isEnabled) {
    console.log('✅ Firebase Admin inicializado');
    console.log('✅ FCM Messaging disponível\n');
  } else {
    console.log('❌ Firebase Admin não está configurado');
    console.log('💡 Configure firebase-service-account.json\n');
  }
  
  return isEnabled;
}

async function sendNotification(user, title, message, data = {}) {
  if (!user.fcm_token) {
    console.log('   ⚠️ Usuário não tem FCM token - PULANDO');
    return { success: false, skipped: true };
  }

  try {
    const result = await fcmService.sendToUser({
      fcm_token: user.fcm_token,
      title,
      message,
      data: {
        ...data,
        test_id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString()
      },
      priority: 'high'
    });

    if (result.success) {
      console.log('   ✅ ENVIADA');
      console.log(`   Message ID: ${result.message_id}`);
    } else {
      console.log('   ❌ FALHOU');
      console.log(`   Erro: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.log('   ❌ ERRO');
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests(user) {
  console.log('3️⃣ Executando testes de notificação...\n');
  
  const tests = [
    {
      name: 'Notificação Simples',
      title: '🧪 Teste Simples',
      message: 'Esta é uma notificação de teste básica',
      data: { type: 'test_simple' }
    },
    {
      name: 'Nova Oferta',
      title: '🔥 Nova Oferta Imperdível!',
      message: 'iPhone 14 Pro com 60% de desconto! De R$ 7.999 por R$ 3.199',
      data: { 
        type: 'new_offer',
        product_id: 'test-123',
        discount: 60
      }
    },
    {
      name: 'Cupom Expirando',
      title: '⏰ Cupom Expirando em Breve!',
      message: 'Seu cupom PRECO50 expira em 2 horas! Use agora e economize 50%',
      data: { 
        type: 'coupon_expiring',
        coupon_code: 'PRECO50',
        hours_left: 2
      }
    },
    {
      name: 'Queda de Preço',
      title: '📉 Alerta de Preço!',
      message: 'O produto que você favoritou baixou de preço! Galaxy S23 agora por R$ 2.499',
      data: { 
        type: 'price_drop',
        product_id: 'test-456',
        old_price: 3499,
        new_price: 2499
      }
    },
    {
      name: 'Produto Favoritado em Oferta',
      title: '⭐ Seu Favorito em Oferta!',
      message: 'Notebook Dell que você favoritou está com 40% OFF! Corre que é por tempo limitado',
      data: { 
        type: 'favorite_on_sale',
        product_id: 'test-789',
        discount: 40
      }
    },
    {
      name: 'Novo Cupom Disponível',
      title: '🎟️ Novo Cupom Exclusivo!',
      message: 'Use o cupom MEGA70 e ganhe 70% de desconto em produtos selecionados',
      data: { 
        type: 'new_coupon',
        coupon_code: 'MEGA70',
        discount: 70
      }
    },
    {
      name: 'Oferta do Dia',
      title: '🌟 Oferta do Dia!',
      message: 'Não perca! Fone Bluetooth JBL com 55% OFF apenas hoje',
      data: { 
        type: 'daily_deal',
        product_id: 'test-101',
        discount: 55
      }
    },
    {
      name: 'Lembrete de Carrinho',
      title: '🛒 Você esqueceu algo!',
      message: 'Você tem produtos no carrinho esperando por você. Finalize sua compra agora!',
      data: { 
        type: 'cart_reminder',
        items_count: 3
      }
    },
    {
      name: 'Categoria em Promoção',
      title: '🏷️ Eletrônicos em Promoção!',
      message: 'Toda a categoria de eletrônicos com até 60% OFF! Confira agora',
      data: { 
        type: 'category_sale',
        category: 'eletronicos',
        max_discount: 60
      }
    },
    {
      name: 'Notificação Rica (com imagem)',
      title: '📱 iPhone 14 Pro Max',
      message: 'Maior desconto do ano! Não perca esta oportunidade única',
      data: { 
        type: 'rich_notification',
        product_id: 'test-202',
        image_url: 'https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=iPhone+14+Pro',
        action_url: 'https://precocerto.app/product/test-202'
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n📱 Teste ${i + 1}/${tests.length}: ${test.name}`);
    console.log(`   Título: "${test.title}"`);
    console.log(`   Mensagem: "${test.message}"`);
    
    const result = await sendNotification(user, test.title, test.message, test.data);
    
    if (result.skipped) {
      skippedCount++;
    } else if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Aguardar 2 segundos entre notificações para não sobrecarregar
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { total: tests.length, success: successCount, fail: failCount, skipped: skippedCount };
}

async function main() {
  try {
    // 1. Buscar usuário
    const user = await findUser(userEmail);
    if (!user) {
      console.log('\n❌ Não foi possível continuar sem usuário');
      process.exit(1);
    }

    // 2. Verificar FCM
    const fcmEnabled = await checkFCMStatus();
    if (!fcmEnabled) {
      console.log('❌ FCM não está configurado. Configure firebase-service-account.json');
      process.exit(1);
    }

    // 3. Executar testes
    const results = await runAllTests(user);

    // 4. Resumo
    console.log('\n\n🎉 ========================================');
    console.log('🎉 RESUMO DOS TESTES');
    console.log('🎉 ========================================\n');
    
    console.log(`📊 Total de testes: ${results.total}`);
    console.log(`✅ Enviadas com sucesso: ${results.success}`);
    console.log(`❌ Falharam: ${results.fail}`);
    console.log(`⚠️ Puladas (sem token): ${results.skipped}`);
    
    const successRate = results.total > 0 ? ((results.success / results.total) * 100).toFixed(1) : 0;
    console.log(`\n📈 Taxa de sucesso: ${successRate}%\n`);

    if (results.success > 0) {
      console.log('✅ Testes concluídos com sucesso!');
      console.log('\n💡 Verifique o dispositivo móvel do usuário para confirmar o recebimento');
      console.log('   As notificações devem aparecer na barra de notificações\n');
    } else if (results.skipped > 0) {
      console.log('⚠️ Usuário não tem FCM token registrado');
      console.log('\n💡 Para registrar o token:');
      console.log('   1. Abra o app mobile');
      console.log('   2. Faça login com robertossh@gmail.com');
      console.log('   3. Conceda permissão de notificações');
      console.log('   4. Execute este script novamente\n');
    } else {
      console.log('❌ Todos os testes falharam');
      console.log('\n💡 Possíveis causas:');
      console.log('   - Token FCM expirado (usuário precisa fazer login novamente)');
      console.log('   - Firebase Service Account incorreto');
      console.log('   - Problemas de conectividade com Firebase\n');
    }

    process.exit(results.success > 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ ERRO DURANTE OS TESTES');
    console.error('❌ ========================================\n');
    console.error('Erro:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

main();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Script de debug para investigar por que notificações não estão sendo enviadas
 */
async function debugNotifications() {
  console.log('🔍 ========== DEBUG DE NOTIFICAÇÕES ==========\n');

  try {
    // 1. Verificar FCM Service Account
    console.log('1️⃣ Verificando Firebase Service Account...');
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.resolve(__dirname, '../firebase-service-account.json');
    
    try {
      const fs = await import('fs/promises');
      await fs.access(serviceAccountPath);
      console.log(`   ✅ Service account encontrado: ${serviceAccountPath}\n`);
    } catch (error) {
      console.log(`   ❌ Service account NÃO encontrado: ${serviceAccountPath}`);
      console.log(`   ⚠️ FCM não funcionará sem este arquivo!\n`);
    }

    // 2. Verificar usuários com FCM tokens
    console.log('2️⃣ Verificando usuários com FCM tokens...');
    const { data: fcmTokens, error: fcmError } = await supabase
      .from('fcm_tokens')
      .select('*');

    if (fcmError) {
      console.log(`   ❌ Erro ao buscar tokens: ${fcmError.message}\n`);
    } else {
      console.log(`   📊 Total de tokens registrados: ${fcmTokens.length}`);
      
      if (fcmTokens.length > 0) {
        // Agrupar por usuário
        const tokensByUser = {};
        fcmTokens.forEach(token => {
          if (!tokensByUser[token.user_id]) {
            tokensByUser[token.user_id] = [];
          }
          tokensByUser[token.user_id].push(token);
        });

        console.log(`   👥 Usuários com tokens: ${Object.keys(tokensByUser).length}`);
        
        // Mostrar detalhes de cada usuário
        for (const [userId, tokens] of Object.entries(tokensByUser)) {
          const { data: user } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', userId)
            .single();

          console.log(`\n   👤 Usuário: ${user?.email || userId}`);
          console.log(`      Nome: ${user?.name || 'N/A'}`);
          console.log(`      Tokens: ${tokens.length}`);
          
          tokens.forEach((token, idx) => {
            console.log(`      Token ${idx + 1}:`);
            console.log(`         Device: ${token.device_id || 'N/A'}`);
            console.log(`         Platform: ${token.platform || 'N/A'}`);
            console.log(`         Criado: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
            console.log(`         Token: ${token.fcm_token.substring(0, 30)}...`);
          });
        }
      } else {
        console.log(`   ⚠️ NENHUM token FCM registrado!`);
        console.log(`   ⚠️ Usuários precisam abrir o app e fazer login para registrar tokens.\n`);
      }
      console.log('');
    }

    // 3. Verificar preferências de notificação dos usuários
    console.log('3️⃣ Verificando preferências de notificação...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, notification_preferences');

    if (usersError) {
      console.log(`   ❌ Erro ao buscar usuários: ${usersError.message}\n`);
    } else {
      console.log(`   👥 Total de usuários: ${users.length}\n`);
      
      users.forEach(user => {
        const prefs = user.notification_preferences || {};
        console.log(`   👤 ${user.email}`);
        console.log(`      Preferências: ${JSON.stringify(prefs, null, 2)}`);
        
        // Verificar se tem preferências restritivas
        if (prefs.new_products === false) {
          console.log(`      ⚠️ Notificações de novos produtos DESABILITADAS`);
        }
        if (prefs.new_coupons === false) {
          console.log(`      ⚠️ Notificações de novos cupons DESABILITADAS`);
        }
        console.log('');
      });
    }

    // 4. Verificar produtos recentes e campo should_send_push
    console.log('4️⃣ Verificando produtos recentes...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, status, should_send_push, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (productsError) {
      console.log(`   ❌ Erro ao buscar produtos: ${productsError.message}\n`);
    } else {
      console.log(`   📦 Últimos 10 produtos:\n`);
      
      products.forEach(product => {
        console.log(`   📦 ${product.name}`);
        console.log(`      ID: ${product.id}`);
        console.log(`      Status: ${product.status}`);
        console.log(`      should_send_push: ${product.should_send_push !== false ? 'true (padrão)' : 'FALSE ❌'}`);
        console.log(`      Criado: ${new Date(product.created_at).toLocaleString('pt-BR')}`);
        
        if (product.should_send_push === false) {
          console.log(`      ⚠️ IA DESABILITOU push para este produto!`);
        }
        console.log('');
      });
    }

    // 5. Verificar notificações criadas no banco
    console.log('5️⃣ Verificando notificações no banco...');
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (notifError) {
      console.log(`   ❌ Erro ao buscar notificações: ${notifError.message}\n`);
    } else {
      console.log(`   📬 Últimas 20 notificações:\n`);
      
      if (notifications.length === 0) {
        console.log(`   ⚠️ NENHUMA notificação encontrada no banco!`);
        console.log(`   ⚠️ Isso indica que publishService.notifyPush() não está sendo chamado.\n`);
      } else {
        // Agrupar por tipo
        const byType = {};
        notifications.forEach(notif => {
          if (!byType[notif.type]) {
            byType[notif.type] = [];
          }
          byType[notif.type].push(notif);
        });

        for (const [type, notifs] of Object.entries(byType)) {
          console.log(`   📬 Tipo: ${type} (${notifs.length} notificações)`);
          
          notifs.slice(0, 3).forEach(notif => {
            console.log(`      - ${notif.title}`);
            console.log(`        Mensagem: ${notif.message.substring(0, 50)}...`);
            console.log(`        Enviada: ${notif.sent_at ? 'SIM ✅' : 'NÃO ❌'}`);
            console.log(`        Criada: ${new Date(notif.created_at).toLocaleString('pt-BR')}`);
          });
          console.log('');
        }
      }
    }

    // 6. Verificar cupons e notificações
    console.log('6️⃣ Verificando cupons...');
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('id, code, is_active, is_out_of_stock, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (couponsError) {
      console.log(`   ❌ Erro ao buscar cupons: ${couponsError.message}\n`);
    } else {
      console.log(`   🎟️ Últimos 10 cupons:\n`);
      
      coupons.forEach(coupon => {
        console.log(`   🎟️ ${coupon.code}`);
        console.log(`      ID: ${coupon.id}`);
        console.log(`      Ativo: ${coupon.is_active ? 'SIM' : 'NÃO'}`);
        console.log(`      Esgotado: ${coupon.is_out_of_stock ? 'SIM ⚠️' : 'NÃO'}`);
        console.log(`      Criado: ${new Date(coupon.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });
    }

    console.log('\n✅ ========== DEBUG CONCLUÍDO ==========\n');

    // Resumo e recomendações
    console.log('📋 RESUMO E RECOMENDAÇÕES:\n');
    
    if (fcmTokens && fcmTokens.length === 0) {
      console.log('❌ PROBLEMA CRÍTICO: Nenhum token FCM registrado');
      console.log('   Solução: Usuários precisam abrir o app e fazer login\n');
    }

    if (notifications && notifications.length === 0) {
      console.log('❌ PROBLEMA CRÍTICO: Nenhuma notificação criada no banco');
      console.log('   Solução: publishService.notifyPush() não está sendo chamado');
      console.log('   Verificar logs do backend durante aprovação de produtos\n');
    }

    const productsWithPushDisabled = products?.filter(p => p.should_send_push === false) || [];
    if (productsWithPushDisabled.length > 0) {
      console.log(`⚠️ ATENÇÃO: ${productsWithPushDisabled.length} produtos com push desabilitado pela IA`);
      console.log('   Isso é normal se a IA detectou produtos de baixa qualidade\n');
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
    console.error(error.stack);
  }
}

// Executar
debugNotifications()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });

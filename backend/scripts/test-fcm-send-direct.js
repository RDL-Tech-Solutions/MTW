import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDirectSend() {
  try {
    console.log('🔥 Teste Direto de Envio FCM\n');

    // 1. Inicializar Firebase Admin
    console.log('1️⃣ Inicializando Firebase Admin...');
    
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.resolve(__dirname, '../firebase-service-account.json');

      console.log(`   Carregando service account de: ${serviceAccountPath}`);

      const require = createRequire(import.meta.url);
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('   ✅ Firebase Admin inicializado\n');
    } else {
      console.log('   ✅ Firebase Admin já inicializado\n');
    }

    // 2. Buscar token do usuário
    console.log('2️⃣ Buscando token FCM do usuário...');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'robertosshbrasil@gmail.com')
      .single();

    if (userError || !user) {
      console.error('   ❌ Usuário não encontrado');
      return;
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (tokensError || !tokens || tokens.length === 0) {
      console.error('   ❌ Nenhum token FCM encontrado');
      return;
    }

    const token = tokens[0].fcm_token;
    console.log(`   ✅ Token encontrado: ${token.substring(0, 30)}...${token.substring(token.length - 20)}`);
    console.log(`   Token length: ${token.length} caracteres\n`);

    // 3. Preparar mensagem
    console.log('3️⃣ Preparando mensagem de teste...');
    
    const message = {
      token: token,
      notification: {
        title: '🧪 Teste FCM Direto',
        body: 'Esta é uma notificação de teste enviada diretamente via Firebase Admin SDK'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        test_id: 'direct-send-' + Date.now()
      },
      android: {
        priority: 'high',
        notification: {
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default'
          }
        }
      }
    };

    console.log('   ✅ Mensagem preparada\n');

    // 4. Enviar notificação
    console.log('4️⃣ Enviando notificação...');
    console.log('   ⏳ Aguarde...\n');

    const response = await admin.messaging().send(message);

    console.log('   ✅ SUCESSO! Notificação enviada');
    console.log(`   Message ID: ${response}\n`);

    console.log('─────────────────────────────────────────────────');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO');
    console.log('─────────────────────────────────────────────────');
    console.log('');
    console.log('📱 Verifique seu celular agora!');
    console.log('   A notificação deve aparecer na bandeja.');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO AO ENVIAR NOTIFICAÇÃO\n');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    console.error('');

    if (error.code === 'messaging/registration-token-not-registered') {
      console.log('🔍 DIAGNÓSTICO:');
      console.log('   O token FCM não está mais registrado no Firebase.');
      console.log('');
      console.log('📱 POSSÍVEIS CAUSAS:');
      console.log('   1. App foi desinstalado e reinstalado');
      console.log('   2. App teve dados limpos');
      console.log('   3. Token expirou (raro, mas pode acontecer)');
      console.log('   4. Token foi registrado em projeto Firebase diferente');
      console.log('');
      console.log('✅ SOLUÇÃO:');
      console.log('   1. Abra o app no celular');
      console.log('   2. Faça logout');
      console.log('   3. Faça login novamente');
      console.log('   4. Aceite permissão de notificações');
      console.log('   5. Execute este teste novamente');
      console.log('');
    } else if (error.code === 'messaging/invalid-registration-token') {
      console.log('🔍 DIAGNÓSTICO:');
      console.log('   O formato do token FCM está inválido.');
      console.log('');
      console.log('📱 POSSÍVEIS CAUSAS:');
      console.log('   1. Token foi corrompido ao salvar no banco');
      console.log('   2. Token não é do Firebase Cloud Messaging');
      console.log('   3. Token foi truncado ou modificado');
      console.log('');
      console.log('✅ SOLUÇÃO:');
      console.log('   1. Verifique o token no banco de dados');
      console.log('   2. Execute: node scripts/test-fcm-token-specific.js');
      console.log('   3. Se token estiver corrompido, faça login novamente no app');
      console.log('');
    } else if (error.code === 'messaging/invalid-argument') {
      console.log('🔍 DIAGNÓSTICO:');
      console.log('   Argumentos inválidos na mensagem.');
      console.log('');
      console.log('📱 POSSÍVEL CAUSA:');
      console.log('   Algum campo da mensagem está com formato incorreto.');
      console.log('');
      console.log('Detalhes do erro:');
      console.error(error);
      console.log('');
    } else {
      console.log('🔍 ERRO DESCONHECIDO');
      console.log('');
      console.log('Stack trace completo:');
      console.error(error.stack);
      console.log('');
    }
  }
}

testDirectSend();

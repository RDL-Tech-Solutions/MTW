/**
 * Script de Teste - Captura de Cupons do Mercado Livre
 * Execute: node scripts/test-meli-capture.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env do backend
dotenv.config({ path: join(__dirname, '../.env') });

console.log('\n🔍 VALIDAÇÃO - Captura de Cupons Mercado Livre\n');
console.log('='.repeat(60));

// 1. Verificar variáveis de ambiente
console.log('\n1️⃣ VARIÁVEIS DE AMBIENTE\n');

const requiredVars = {
  'MELI_CLIENT_ID': process.env.MELI_CLIENT_ID,
  'MELI_CLIENT_SECRET': process.env.MELI_CLIENT_SECRET,
  'MELI_ACCESS_TOKEN': process.env.MELI_ACCESS_TOKEN,
  'MELI_API_URL': process.env.MELI_API_URL,
  'MELI_AFFILIATE_CODE': process.env.MELI_AFFILIATE_CODE,
  'COUPON_CAPTURE_ENABLED': process.env.COUPON_CAPTURE_ENABLED,
  'COUPON_CAPTURE_INTERVAL': process.env.COUPON_CAPTURE_INTERVAL,
  'ENABLE_CRON_JOBS': process.env.ENABLE_CRON_JOBS
};

let allVarsOk = true;

for (const [key, value] of Object.entries(requiredVars)) {
  const status = value ? '✅' : '❌';
  const displayValue = value 
    ? (value.length > 50 ? value.substring(0, 50) + '...' : value)
    : 'NÃO CONFIGURADO';
  
  console.log(`${status} ${key}: ${displayValue}`);
  
  if (!value) allVarsOk = false;
}

if (!allVarsOk) {
  console.log('\n❌ ERRO: Algumas variáveis não estão configuradas!');
  console.log('📝 Edite o arquivo backend/.env e adicione as variáveis faltantes.');
  process.exit(1);
}

// 2. Testar conexão com API do Mercado Livre
console.log('\n2️⃣ TESTE DE CONEXÃO COM API\n');

async function testMeliAPI() {
  try {
    const axios = (await import('axios')).default;
    
    // Testar endpoint de deals
    console.log('🔄 Testando endpoint de deals...');
    const dealsResponse = await axios.get(
      `${process.env.MELI_API_URL}/deals/MLB`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MELI_ACCESS_TOKEN}`
        },
        timeout: 10000
      }
    );
    
    console.log(`✅ API respondeu: ${dealsResponse.status} ${dealsResponse.statusText}`);
    console.log(`📊 Deals encontrados: ${dealsResponse.data?.deals?.length || 0}`);
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ Erro na API: ${error.response.status} - ${error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('⚠️  Token expirado ou inválido!');
        console.log('💡 Execute: curl -X POST http://localhost:3000/api/sync/mercadolivre/refresh-token');
      }
    } else {
      console.log(`❌ Erro de conexão: ${error.message}`);
    }
    return false;
  }
}

// 3. Verificar arquivos do módulo
console.log('\n3️⃣ ARQUIVOS DO MÓDULO\n');

import { existsSync } from 'fs';

const requiredFiles = [
  'src/services/coupons/meliCouponCapture.js',
  'src/services/coupons/couponCaptureService.js',
  'src/services/coupons/couponNotificationService.js',
  'src/controllers/couponCaptureController.js',
  'src/routes/couponCaptureRoutes.js',
  'src/cron/couponCaptureCron.js',
  'src/models/CouponSettings.js',
  'src/models/CouponSyncLog.js'
];

let allFilesExist = true;

for (const file of requiredFiles) {
  const fullPath = join(__dirname, '..', file);
  const exists = existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ ERRO: Alguns arquivos do módulo estão faltando!');
  console.log('📝 Certifique-se de que todos os arquivos foram criados corretamente.');
  process.exit(1);
}

// 4. Executar testes
console.log('\n4️⃣ TESTE DE API\n');

const apiOk = await testMeliAPI();

// Resumo final
console.log('\n' + '='.repeat(60));
console.log('\n📋 RESUMO\n');

console.log(`✅ Variáveis de ambiente: ${allVarsOk ? 'OK' : 'FALHOU'}`);
console.log(`✅ Arquivos do módulo: ${allFilesExist ? 'OK' : 'FALHOU'}`);
console.log(`✅ Conexão com API: ${apiOk ? 'OK' : 'FALHOU'}`);

console.log('\n' + '='.repeat(60));

if (allVarsOk && allFilesExist && apiOk) {
  console.log('\n🎉 TUDO PRONTO!\n');
  console.log('✅ O módulo está configurado corretamente');
  console.log('✅ A API do Mercado Livre está acessível');
  console.log('✅ Você pode iniciar o backend com: npm start\n');
  console.log('📊 Acesse o painel admin em: http://localhost:5173/coupon-capture\n');
} else {
  console.log('\n⚠️  ATENÇÃO!\n');
  console.log('Corrija os problemas acima antes de continuar.\n');
  process.exit(1);
}

console.log('='.repeat(60) + '\n');

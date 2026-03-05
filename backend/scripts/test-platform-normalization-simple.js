/**
 * Script de Teste Simplificado: Normalização de Plataformas
 * 
 * Testa a lógica de normalização sem precisar do banco de dados
 */

console.log('🧪 TESTE: Normalização de Plataformas em Cupons\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Simular a lógica do Coupon.normalizePlatform
const VALID_PLATFORMS = ['shopee', 'mercadolivre', 'amazon', 'aliexpress', 'kabum', 'magazineluiza', 'pichau', 'general'];

function normalizePlatform(platform) {
  if (!platform) return 'general';
  const normalized = platform.toLowerCase().trim();

  const platformMap = {
    'shopee': 'shopee',
    'mercadolivre': 'mercadolivre',
    'mercado livre': 'mercadolivre',
    'meli': 'mercadolivre',
    'amazon': 'amazon',
    'aliexpress': 'aliexpress',
    'ali express': 'aliexpress',
    'kabum': 'kabum',
    'magazineluiza': 'magazineluiza',
    'magazine luiza': 'magazineluiza',
    'magalu': 'magazineluiza',
    'pichau': 'pichau',
    'general': 'general'
  };

  if (platformMap[normalized]) {
    return platformMap[normalized];
  }

  if (VALID_PLATFORMS.includes(normalized)) {
    return normalized;
  }

  return 'general';
}

// Casos de teste
const testCases = [
  // Plataformas principais
  { input: 'shopee', expected: 'shopee', description: 'Shopee (lowercase)' },
  { input: 'Shopee', expected: 'shopee', description: 'Shopee (capitalized)' },
  { input: 'mercadolivre', expected: 'mercadolivre', description: 'Mercado Livre' },
  { input: 'amazon', expected: 'amazon', description: 'Amazon' },
  { input: 'aliexpress', expected: 'aliexpress', description: 'AliExpress' },
  
  // Plataformas que estavam com problema
  { input: 'kabum', expected: 'kabum', description: '🔧 Kabum (lowercase)' },
  { input: 'Kabum', expected: 'kabum', description: '🔧 Kabum (capitalized)' },
  { input: 'KABUM', expected: 'kabum', description: '🔧 Kabum (uppercase)' },
  
  { input: 'magazineluiza', expected: 'magazineluiza', description: '🔧 Magazine Luiza' },
  { input: 'MagazineLuiza', expected: 'magazineluiza', description: '🔧 Magazine Luiza (camelCase)' },
  { input: 'magazine luiza', expected: 'magazineluiza', description: '🔧 Magazine Luiza (com espaço)' },
  { input: 'magalu', expected: 'magazineluiza', description: '🔧 Magalu (alias)' },
  { input: 'Magalu', expected: 'magazineluiza', description: '🔧 Magalu (capitalized)' },
  
  { input: 'pichau', expected: 'pichau', description: '🔧 Pichau (lowercase)' },
  { input: 'Pichau', expected: 'pichau', description: '🔧 Pichau (capitalized)' },
  { input: 'PICHAU', expected: 'pichau', description: '🔧 Pichau (uppercase)' },
  
  // Casos especiais
  { input: 'general', expected: 'general', description: 'Geral' },
  { input: '', expected: 'general', description: 'String vazia (deve retornar general)' },
  { input: null, expected: 'general', description: 'Null (deve retornar general)' },
  { input: undefined, expected: 'general', description: 'Undefined (deve retornar general)' },
  { input: 'plataforma_invalida', expected: 'general', description: 'Plataforma inválida (deve retornar general)' },
];

// Executar testes
let passed = 0;
let failed = 0;
const failures = [];

console.log('📝 Executando testes...\n');

testCases.forEach((testCase, index) => {
  const result = normalizePlatform(testCase.input);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ TESTE ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}" → Output: "${result}"`);
  } else {
    failed++;
    failures.push(testCase);
    console.log(`❌ TESTE ${index + 1}: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    console.log(`   Esperado: "${testCase.expected}"`);
    console.log(`   Recebido: "${result}"`);
  }
  console.log('');
});

// Resumo
console.log('═══════════════════════════════════════════════════════════');
console.log('📊 RESUMO DOS TESTES');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Total de testes: ${testCases.length}`);
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`📈 Taxa de sucesso: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log('❌ TESTES QUE FALHARAM:\n');
  failures.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    console.log(`   Esperado: "${testCase.expected}"`);
    console.log(`   Recebido: "${normalizePlatform(testCase.input)}"`);
    console.log('');
  });
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(1);
} else {
  console.log('🎉 TODOS OS TESTES PASSARAM!\n');
  console.log('✅ Plataformas Pichau, Kabum e Magazine Luiza estão funcionando corretamente');
  console.log('✅ Aliases (magalu, magazine luiza) estão funcionando');
  console.log('✅ Normalização de case está funcionando');
  console.log('✅ Plataformas inválidas retornam "general" corretamente\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Teste adicional: Verificar VALID_PLATFORMS
  console.log('📋 PLATAFORMAS VÁLIDAS REGISTRADAS:\n');
  VALID_PLATFORMS.forEach((platform, index) => {
    console.log(`${index + 1}. ${platform}`);
  });
  console.log('');
  
  // Verificar se as 3 plataformas estão na lista
  const requiredPlatforms = ['kabum', 'magazineluiza', 'pichau'];
  const missingPlatforms = requiredPlatforms.filter(p => !VALID_PLATFORMS.includes(p));
  
  if (missingPlatforms.length > 0) {
    console.log(`❌ ERRO: Plataformas faltando em VALID_PLATFORMS: ${missingPlatforms.join(', ')}\n`);
    process.exit(1);
  } else {
    console.log('✅ Todas as plataformas necessárias estão em VALID_PLATFORMS\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🚀 PRÓXIMOS PASSOS:\n');
  console.log('1. Reiniciar o backend: npm start');
  console.log('2. Testar criação de cupons no admin panel');
  console.log('3. Verificar se cupons salvam com plataforma correta');
  console.log('4. Validar notificações nos bots\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

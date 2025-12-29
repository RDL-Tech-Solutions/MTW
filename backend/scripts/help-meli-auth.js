// Script rápido para gerar nova URL de autorização com o redirect_uri correto

import dotenv from 'dotenv';
dotenv.config();

const CLIENT_ID = '1016544593231768';

// Possíveis redirect URIs válidos
const redirectURIs = [
    'http://localhost:3000/api/auth/meli/callback',
    'http://localhost:3001/auth/meli/callback',
    'https://localhost:3000/api/auth/meli/callback',
    'https://localhost:3001/auth/meli/callback',
];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔐 OBTER NOVO CÓDIGO DE AUTORIZAÇÃO DO MERCADO LIVRE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('⚠️  O código anterior expirou ou o redirect_uri não corresponde.\n');
console.log('💡 INSTRUÇÕES:\n');
console.log('1️⃣  Verifique qual Redirect URI está configurado no portal do Mercado Livre:');
console.log('   👉 https://developers.mercadolivre.com.br');
console.log('   👉 Suas Aplicações → Selecione sua app → Redirect URIs\n');

console.log('2️⃣  Escolha uma das URLs abaixo (use a que está no portal):\n');

redirectURIs.forEach((uri, index) => {
    console.log(`   ${index + 1}. ${uri}`);
});

console.log('\n3️⃣  Acesse a URL de autorização correspondente:\n');

redirectURIs.forEach((uri, index) => {
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(uri)}`;
    console.log(`   Para opção ${index + 1}:`);
    console.log(`   ${authUrl}\n`);
});

console.log('4️⃣  Após autorizar, você será redirecionado para uma URL como:');
console.log('   http://localhost:XXXX/callback?code=TG-XXXXX...\n');

console.log('5️⃣  Copie APENAS o código (parte após "code=", antes de "&state="):\n');

console.log('6️⃣  Edite o arquivo backend/scripts/exchange-meli-code.js:');
console.log('   - Linha 10: Cole o NOVO código');
console.log('   - Linha 11: Use o MESMO redirect_uri da URL que você acessou\n');

console.log('7️⃣  Execute novamente:');
console.log('   node backend/scripts/exchange-meli-code.js\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 CONFIGURAÇÃO ATUAL:');
console.log(`   Client ID: ${CLIENT_ID}`);
console.log(`   Client Secret: 2VA7yCY4fEPX7PWEvwG0rrq6N0qKzxfG`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 DICA: Se aparecer página de erro "redirect_uri mismatch":');
console.log('   - O redirect_uri da URL deve estar EXATAMENTE igual ao configurado no portal');
console.log('   - Adicione o redirect_uri no portal se necessário\n');

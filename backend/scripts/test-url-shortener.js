import axios from 'axios';
import urlShortener from '../src/services/urlShortener.js';

async function testUrlShortener() {
  console.log('🧪 Testando serviço de encurtamento de URLs...\n');

  // Teste 1: URL simples
  console.log('📝 Teste 1: Encurtando URL simples (https://google.com)');
  try {
    const testUrl1 = 'https://google.com';
    const shortUrl1 = await urlShortener.shorten(testUrl1);
    console.log(`   Original: ${testUrl1}`);
    console.log(`   Encurtado: ${shortUrl1}`);
    console.log(`   ✅ Sucesso: ${shortUrl1 !== testUrl1 ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}\n`);
  }

  // Teste 2: URL longa (tipo link de afiliado)
  console.log('📝 Teste 2: Encurtando URL longa (link de afiliado)');
  try {
    const testUrl2 = 'https://pt.aliexpress.com/item/1005001234567890.html?aff_trace_key=abc123&terminal_id=MTWPromo';
    const shortUrl2 = await urlShortener.shorten(testUrl2);
    console.log(`   Original: ${testUrl2.substring(0, 80)}...`);
    console.log(`   Encurtado: ${shortUrl2}`);
    console.log(`   ✅ Sucesso: ${shortUrl2 !== testUrl2 ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}\n`);
  }

  // Teste 3: Testar API diretamente
  console.log('📝 Teste 3: Testando API diretamente');
  try {
    const response = await axios.post(
      'https://api.encurtador.dev/encurtamentos',
      { url: 'https://google.com' },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log(`   Status: ${response.status}`);
    console.log(`   Resposta: ${JSON.stringify(response.data)}`);
    console.log(`   ✅ Sucesso: ${response.data?.urlEncurtada ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    console.log('');
  }

  // Teste 4: Verificar se serviço está disponível
  console.log('📝 Teste 4: Verificando disponibilidade do serviço');
  try {
    const isAvailable = await urlShortener.isAvailable();
    console.log(`   Disponível: ${isAvailable ? 'SIM' : 'NÃO'}\n`);
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}\n`);
  }
}

testUrlShortener().catch(console.error);





/**
 * Script de Teste: WhatsApp Template + Imagem
 * 
 * Testa se a publicação de cupons está enviando imagem + template corretamente
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 TESTE: WhatsApp Template + Imagem\n');

// 1. Verificar se logos existem
console.log('1️⃣ Verificando logos da plataforma...\n');

const platformLogos = {
  mercadolivre: 'mercadolivre-logo.png',
  shopee: 'shopee-logo.png',
  aliexpress: 'aliexpress-logo.png',
  amazon: 'amazon-logo.png'
};

const logoPaths = [
  path.join(__dirname, '../../assets/logos'),
  path.join(__dirname, '../assets/logos'),
  path.resolve(process.cwd(), 'assets/logos'),
  path.resolve(process.cwd(), 'backend/assets/logos')
];

for (const [platform, logoFile] of Object.entries(platformLogos)) {
  console.log(`📦 ${platform}:`);
  
  let found = false;
  for (const logoPath of logoPaths) {
    const fullPath = path.join(logoPath, logoFile);
    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);
      if (stats.isFile() && stats.size > 0) {
        console.log(`   ✅ Encontrado: ${fullPath}`);
        console.log(`   📏 Tamanho: ${stats.size} bytes`);
        found = true;
        break;
      }
    } catch (error) {
      // Continuar tentando
    }
  }
  
  if (!found) {
    console.log(`   ❌ NÃO ENCONTRADO em nenhum caminho`);
  }
  console.log('');
}

// 2. Verificar configuração backend_url
console.log('\n2️⃣ Verificando configuração backend_url...\n');

try {
  const { default: AppSettings } = await import('../src/models/AppSettings.js');
  const settings = await AppSettings.get();
  
  const backendUrl = settings.backend_url || process.env.BACKEND_URL || process.env.API_URL;
  
  console.log(`📍 backend_url: ${backendUrl || 'NÃO CONFIGURADO'}`);
  
  if (!backendUrl) {
    console.log('   ⚠️ backend_url não configurado - WhatsApp usará arquivo local');
  } else if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
    console.log('   ⚠️ backend_url é localhost - WhatsApp usará arquivo local');
  } else {
    console.log('   ✅ backend_url configurado - WhatsApp usará URL HTTP');
    
    // Testar se URL está acessível
    const testUrl = `${backendUrl.replace(/\/$/, '')}/assets/logos/mercadolivre-logo.png`;
    console.log(`   🔗 URL de teste: ${testUrl}`);
    
    try {
      const response = await fetch(testUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`   ✅ URL acessível (${response.status})`);
      } else {
        console.log(`   ❌ URL não acessível (${response.status})`);
      }
    } catch (fetchError) {
      console.log(`   ❌ Erro ao acessar URL: ${fetchError.message}`);
    }
  }
} catch (error) {
  console.log(`   ❌ Erro ao verificar configuração: ${error.message}`);
}

// 3. Verificar WhatsApp Web conectado
console.log('\n3️⃣ Verificando WhatsApp Web...\n');

try {
  const { default: BotChannel } = await import('../src/models/BotChannel.js');
  
  const whatsappChannels = await BotChannel.findActive('whatsapp');
  const whatsappWebChannels = await BotChannel.findActive('whatsapp_web');
  
  const allChannels = [...whatsappChannels, ...whatsappWebChannels];
  
  console.log(`📱 Canais WhatsApp ativos: ${allChannels.length}`);
  
  if (allChannels.length === 0) {
    console.log('   ❌ Nenhum canal WhatsApp ativo encontrado');
  } else {
    for (const channel of allChannels) {
      console.log(`   ✅ Canal: ${channel.name} (${channel.identifier})`);
    }
  }
} catch (error) {
  console.log(`   ❌ Erro ao verificar canais: ${error.message}`);
}

// 4. Verificar template de cupom
console.log('\n4️⃣ Verificando template de cupom...\n');

try {
  const { default: templateRenderer } = await import('../src/services/bots/templateRenderer.js');
  
  const mockCoupon = {
    code: 'TESTE123',
    discount: '50%',
    title: 'Cupom de Teste',
    description: 'Descrição do cupom de teste',
    platform: 'mercadolivre',
    link: 'https://example.com/cupom',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const variables = templateRenderer.prepareCouponVariables(mockCoupon);
  const contextData = { coupon: mockCoupon };
  
  const whatsappMessage = await templateRenderer.render('new_coupon', 'whatsapp', variables, contextData);
  
  console.log('📝 Template WhatsApp renderizado:');
  console.log('─'.repeat(50));
  console.log(whatsappMessage);
  console.log('─'.repeat(50));
  console.log(`📏 Tamanho: ${whatsappMessage.length} caracteres`);
  
  if (!whatsappMessage || whatsappMessage.includes('Mensagem não configurada')) {
    console.log('   ❌ Template não configurado ou inválido');
  } else {
    console.log('   ✅ Template configurado corretamente');
  }
} catch (error) {
  console.log(`   ❌ Erro ao renderizar template: ${error.message}`);
}

// 5. Resumo
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DO TESTE');
console.log('='.repeat(60));

console.log('\n✅ VERIFICAÇÕES NECESSÁRIAS:');
console.log('   1. Logos da plataforma existem em backend/assets/logos/');
console.log('   2. backend_url configurado (ou localhost para arquivo local)');
console.log('   3. Canais WhatsApp ativos no banco de dados');
console.log('   4. Template de cupom configurado corretamente');

console.log('\n🔧 SE PUBLICAÇÃO FALHAR:');
console.log('   1. Verificar logs: pm2 logs backend --lines 100');
console.log('   2. Procurar por erros de "Logo não encontrado"');
console.log('   3. Procurar por erros de "URL inválida"');
console.log('   4. Procurar por erros de "WhatsApp Web"');
console.log('   5. Verificar se WhatsApp Web está conectado');

console.log('\n✅ Teste concluído!\n');

process.exit(0);

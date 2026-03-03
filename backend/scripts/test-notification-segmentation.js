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
 * Script de teste para segmentação de notificações push
 * Testa: categorias, palavras-chave e produtos específicos
 */

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testNotificationSegmentation() {
  log('\n🧪 ========== TESTE DE SEGMENTAÇÃO DE NOTIFICAÇÕES ==========\n', 'bright');

  try {
    // Importar serviços
    const notificationSegmentationService = (await import('../src/services/notificationSegmentationService.js')).default;
    const NotificationPreference = (await import('../src/models/NotificationPreference.js')).default;

    // 1. SETUP: Criar usuários de teste com diferentes preferências
    log('📋 PASSO 1: Configurando usuários de teste\n', 'cyan');

    // Buscar ou criar usuários de teste
    const testUsers = [
      {
        email: 'teste.gamer@example.com',
        name: 'Teste Gamer',
        preferences: {
          push_enabled: true,
          category_preferences: [], // Será preenchido com ID de Games
          keyword_preferences: ['playstation', 'xbox', 'nintendo', 'pc gamer'],
          product_name_preferences: []
        }
      },
      {
        email: 'teste.tech@example.com',
        name: 'Teste Tech',
        preferences: {
          push_enabled: true,
          category_preferences: [], // Será preenchido com ID de Hardware
          keyword_preferences: ['notebook', 'smartphone', 'tablet'],
          product_name_preferences: ['iPhone', 'Samsung Galaxy', 'MacBook']
        }
      },
      {
        email: 'teste.tudo@example.com',
        name: 'Teste Tudo',
        preferences: {
          push_enabled: true,
          category_preferences: [], // Sem filtros = recebe tudo
          keyword_preferences: [],
          product_name_preferences: []
        }
      },
      {
        email: 'teste.desativado@example.com',
        name: 'Teste Desativado',
        preferences: {
          push_enabled: false, // Push desativado
          category_preferences: [],
          keyword_preferences: [],
          product_name_preferences: []
        }
      }
    ];

    // Buscar categorias para usar nos testes
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .limit(10);

    log('📂 Categorias disponíveis:', 'blue');
    categories.forEach(cat => {
      log(`   - ${cat.name} (${cat.slug}) - ID: ${cat.id}`);
    });
    log('');

    // Mapear categorias para os usuários
    const gamesCategory = categories.find(c => c.slug.includes('game') || c.name.toLowerCase().includes('game'));
    const hardwareCategory = categories.find(c => c.slug.includes('hardware') || c.name.toLowerCase().includes('hardware'));

    if (gamesCategory) {
      testUsers[0].preferences.category_preferences = [gamesCategory.id];
      log(`✅ Usuário Gamer configurado para categoria: ${gamesCategory.name}`, 'green');
    }

    if (hardwareCategory) {
      testUsers[1].preferences.category_preferences = [hardwareCategory.id];
      log(`✅ Usuário Tech configurado para categoria: ${hardwareCategory.name}`, 'green');
    }

    log('');

    // Criar/atualizar usuários e preferências
    const createdUsers = [];
    for (const testUser of testUsers) {
      // Verificar se usuário existe
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', testUser.email)
        .single();

      if (!user) {
        // Criar usuário
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            email: testUser.email,
            name: testUser.name,
            password: 'test123', // Senha de teste
            role: 'user'
          })
          .select()
          .single();

        if (error) {
          log(`❌ Erro ao criar usuário ${testUser.email}: ${error.message}`, 'red');
          continue;
        }
        user = newUser;
      }

      // Criar/atualizar preferências
      await NotificationPreference.upsert(user.id, testUser.preferences);

      // Criar token FCM fake para teste
      await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: user.id,
          fcm_token: `TEST_TOKEN_${user.id}`,
          platform: 'android',
          device_id: `TEST_DEVICE_${user.id}`
        }, {
          onConflict: 'fcm_token'
        });

      createdUsers.push({ ...user, preferences: testUser.preferences });
      log(`✅ Usuário configurado: ${testUser.email}`, 'green');
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

    // 2. TESTE: Segmentação por categoria
    log('📋 PASSO 2: Testando segmentação por CATEGORIA\n', 'cyan');

    const testProducts = [
      {
        name: 'PlayStation 5 Console',
        category_id: gamesCategory?.id,
        description: 'Console de última geração',
        current_price: 3999.99
      },
      {
        name: 'Notebook Dell Inspiron',
        category_id: hardwareCategory?.id,
        description: 'Notebook para trabalho',
        current_price: 2999.99
      },
      {
        name: 'Cadeira Gamer RGB',
        category_id: gamesCategory?.id,
        description: 'Cadeira confortável para gamers',
        current_price: 899.99
      }
    ];

    for (const product of testProducts) {
      log(`\n🎯 Testando produto: ${product.name}`, 'yellow');
      log(`   Categoria: ${product.category_id || 'Sem categoria'}`);

      const segmentedUsers = await notificationSegmentationService.getUsersForProduct(product);

      log(`   📊 Resultado: ${segmentedUsers.length} usuários segmentados`, 'blue');
      segmentedUsers.forEach(u => {
        const testUser = createdUsers.find(cu => cu.id === u.id);
        log(`      ✅ ${testUser?.email || u.email}`, 'green');
      });

      // Verificar se segmentação está correta
      if (product.category_id === gamesCategory?.id) {
        const gamerUser = segmentedUsers.find(u => u.email === 'teste.gamer@example.com');
        const tudoUser = segmentedUsers.find(u => u.email === 'teste.tudo@example.com');
        
        if (gamerUser) {
          log(`      ✅ CORRETO: Usuário Gamer recebeu (filtro de categoria)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Gamer NÃO recebeu (deveria receber)`, 'red');
        }

        if (tudoUser) {
          log(`      ✅ CORRETO: Usuário Tudo recebeu (sem filtros)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Tudo NÃO recebeu (deveria receber)`, 'red');
        }
      }
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

    // 3. TESTE: Segmentação por palavras-chave
    log('📋 PASSO 3: Testando segmentação por PALAVRAS-CHAVE\n', 'cyan');

    const keywordProducts = [
      {
        name: 'Controle Xbox Series X Wireless',
        description: 'Controle sem fio para Xbox',
        current_price: 399.99
      },
      {
        name: 'iPhone 15 Pro Max 256GB',
        description: 'Smartphone Apple com câmera profissional',
        current_price: 7999.99
      },
      {
        name: 'Mouse Gamer Logitech',
        description: 'Mouse RGB para PC Gamer',
        current_price: 199.99
      }
    ];

    for (const product of keywordProducts) {
      log(`\n🎯 Testando produto: ${product.name}`, 'yellow');
      log(`   Descrição: ${product.description}`);

      const segmentedUsers = await notificationSegmentationService.getUsersForProduct(product);

      log(`   📊 Resultado: ${segmentedUsers.length} usuários segmentados`, 'blue');
      segmentedUsers.forEach(u => {
        const testUser = createdUsers.find(cu => cu.id === u.id);
        log(`      ✅ ${testUser?.email || u.email}`, 'green');
      });

      // Verificar matches esperados
      if (product.name.toLowerCase().includes('xbox')) {
        const gamerUser = segmentedUsers.find(u => u.email === 'teste.gamer@example.com');
        if (gamerUser) {
          log(`      ✅ CORRETO: Usuário Gamer recebeu (palavra-chave: xbox)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Gamer NÃO recebeu (deveria receber por 'xbox')`, 'red');
        }
      }

      if (product.name.toLowerCase().includes('iphone')) {
        const techUser = segmentedUsers.find(u => u.email === 'teste.tech@example.com');
        if (techUser) {
          log(`      ✅ CORRETO: Usuário Tech recebeu (produto específico: iPhone)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Tech NÃO recebeu (deveria receber por 'iPhone')`, 'red');
        }
      }

      if (product.name.toLowerCase().includes('pc gamer') || product.description.toLowerCase().includes('pc gamer')) {
        const gamerUser = segmentedUsers.find(u => u.email === 'teste.gamer@example.com');
        if (gamerUser) {
          log(`      ✅ CORRETO: Usuário Gamer recebeu (palavra-chave: pc gamer)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Gamer NÃO recebeu (deveria receber por 'pc gamer')`, 'red');
        }
      }
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

    // 4. TESTE: Segmentação por nome de produto específico
    log('📋 PASSO 4: Testando segmentação por NOME DE PRODUTO ESPECÍFICO\n', 'cyan');

    const specificProducts = [
      {
        name: 'Samsung Galaxy S24 Ultra 512GB',
        description: 'Smartphone Samsung top de linha',
        current_price: 6999.99
      },
      {
        name: 'MacBook Pro M3 16" 1TB',
        description: 'Notebook Apple para profissionais',
        current_price: 19999.99
      }
    ];

    for (const product of specificProducts) {
      log(`\n🎯 Testando produto: ${product.name}`, 'yellow');

      const segmentedUsers = await notificationSegmentationService.getUsersForProduct(product);

      log(`   📊 Resultado: ${segmentedUsers.length} usuários segmentados`, 'blue');
      segmentedUsers.forEach(u => {
        const testUser = createdUsers.find(cu => cu.id === u.id);
        log(`      ✅ ${testUser?.email || u.email}`, 'green');
      });

      // Verificar matches esperados
      if (product.name.toLowerCase().includes('samsung galaxy')) {
        const techUser = segmentedUsers.find(u => u.email === 'teste.tech@example.com');
        if (techUser) {
          log(`      ✅ CORRETO: Usuário Tech recebeu (produto específico: Samsung Galaxy)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Tech NÃO recebeu (deveria receber por 'Samsung Galaxy')`, 'red');
        }
      }

      if (product.name.toLowerCase().includes('macbook')) {
        const techUser = segmentedUsers.find(u => u.email === 'teste.tech@example.com');
        if (techUser) {
          log(`      ✅ CORRETO: Usuário Tech recebeu (produto específico: MacBook)`, 'green');
        } else {
          log(`      ❌ ERRO: Usuário Tech NÃO recebeu (deveria receber por 'MacBook')`, 'red');
        }
      }
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

    // 5. TESTE: Usuário com push desativado
    log('📋 PASSO 5: Testando usuário com PUSH DESATIVADO\n', 'cyan');

    const anyProduct = {
      name: 'Produto Qualquer',
      description: 'Teste',
      current_price: 99.99
    };

    const segmentedUsers = await notificationSegmentationService.getUsersForProduct(anyProduct);
    const desativadoUser = segmentedUsers.find(u => u.email === 'teste.desativado@example.com');

    if (!desativadoUser) {
      log(`✅ CORRETO: Usuário com push desativado NÃO recebeu notificação`, 'green');
    } else {
      log(`❌ ERRO: Usuário com push desativado recebeu notificação (não deveria)`, 'red');
    }

    log('\n' + '='.repeat(70) + '\n', 'cyan');

    // 6. ESTATÍSTICAS
    log('📋 PASSO 6: Estatísticas de segmentação\n', 'cyan');

    const stats = await notificationSegmentationService.getSegmentationStats();

    log('📊 Estatísticas:', 'blue');
    log(`   Total de usuários com FCM: ${stats.total_users}`);
    log(`   Usuários com preferências: ${stats.users_with_preferences}`);
    log(`   Usuários com filtro de categoria: ${stats.users_with_category_filter}`);
    log(`   Usuários com filtro de palavra-chave: ${stats.users_with_keyword_filter}`);
    log(`   Usuários com filtro de produto específico: ${stats.users_with_product_name_filter}`);
    log(`   Usuários sem filtros (recebem tudo): ${stats.users_without_filters}`);

    log('\n✅ ========== TESTES CONCLUÍDOS ==========\n', 'bright');

    // 7. LIMPEZA (opcional)
    log('🧹 Deseja limpar os usuários de teste? (Ctrl+C para cancelar)', 'yellow');
    log('   Aguardando 5 segundos...', 'yellow');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    log('\n🧹 Limpando usuários de teste...', 'yellow');
    for (const user of createdUsers) {
      await supabase.from('fcm_tokens').delete().eq('user_id', user.id);
      await supabase.from('notification_preferences').delete().eq('user_id', user.id);
      await supabase.from('users').delete().eq('id', user.id);
      log(`   ✅ Usuário removido: ${user.email}`, 'green');
    }

    log('\n✅ Limpeza concluída!\n', 'green');

  } catch (error) {
    log(`\n❌ Erro no teste: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar
testNotificationSegmentation()
  .then(() => {
    log('\n✅ Script finalizado com sucesso!\n', 'green');
    process.exit(0);
  })
  .catch(error => {
    log(`\n❌ Erro fatal: ${error.message}\n`, 'red');
    console.error(error.stack);
    process.exit(1);
  });

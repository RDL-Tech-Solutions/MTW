import logger from '../src/config/logger.js';
import supabase from '../src/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Testar todas as correções de bugs
 */
async function testBugFixes() {
  logger.info('🧪 ========== TESTE DE CORREÇÕES DE BUGS ==========\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Teste 1: Verificar template out_of_stock_coupon
  logger.info('📋 Teste 1: Template out_of_stock_coupon');
  try {
    const { data: templates, error } = await supabase
      .from('bot_message_templates')
      .select('*')
      .eq('template_type', 'out_of_stock_coupon');

    if (error) throw error;

    if (templates && templates.length >= 2) {
      const telegram = templates.find(t => t.platform === 'telegram');
      const whatsapp = templates.find(t => t.platform === 'whatsapp');

      if (telegram && whatsapp && telegram.is_active && whatsapp.is_active) {
        logger.info('   ✅ Templates encontrados e ativos');
        logger.info(`      - Telegram: ${telegram.content.substring(0, 50)}...`);
        logger.info(`      - WhatsApp: ${whatsapp.content.substring(0, 50)}...`);
        results.passed++;
        results.tests.push({ name: 'Template out_of_stock_coupon', status: 'PASS' });
      } else {
        throw new Error('Templates não estão ativos');
      }
    } else {
      throw new Error('Templates não encontrados');
    }
  } catch (error) {
    logger.error(`   ❌ FALHOU: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Template out_of_stock_coupon', status: 'FAIL', error: error.message });
  }

  // Teste 2: Verificar logo da Kabum
  logger.info('\n🖼️ Teste 2: Logo da Kabum');
  try {
    const logosDir = path.join(__dirname, '../assets/logos');
    const kabumPath = path.join(logosDir, 'kabum.png');

    await fs.access(kabumPath);
    const stats = await fs.stat(kabumPath);

    if (stats.isFile() && stats.size > 0) {
      logger.info(`   ✅ Logo encontrado: ${(stats.size / 1024).toFixed(2)} KB`);
      results.passed++;
      results.tests.push({ name: 'Logo Kabum', status: 'PASS' });
    } else {
      throw new Error('Arquivo vazio ou inválido');
    }
  } catch (error) {
    logger.error(`   ❌ FALHOU: ${error.message}`);
    logger.warn('   ⚠️ Adicione o logo: backend/assets/logos/kabum.png');
    results.failed++;
    results.tests.push({ name: 'Logo Kabum', status: 'FAIL', error: error.message });
  }

  // Teste 3: Verificar todos os logos esperados
  logger.info('\n🖼️ Teste 3: Todos os logos de plataformas');
  try {
    const logosDir = path.join(__dirname, '../assets/logos');
    const expectedLogos = [
      'shopee.png',
      'mercadolivre.png',
      'amazon.png',
      'magazineluiza.png',
      'aliexpress.png',
      'kabum.png',
      'pichau.png',
      'terabyte.png',
      'general.png'
    ];

    const files = await fs.readdir(logosDir);
    const missing = expectedLogos.filter(logo => !files.includes(logo));

    if (missing.length === 0) {
      logger.info('   ✅ Todos os logos esperados estão presentes');
      results.passed++;
      results.tests.push({ name: 'Todos os logos', status: 'PASS' });
    } else {
      throw new Error(`Logos faltando: ${missing.join(', ')}`);
    }
  } catch (error) {
    logger.error(`   ❌ FALHOU: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Todos os logos', status: 'FAIL', error: error.message });
  }

  // Teste 4: Verificar configuração de auto-republicação
  logger.info('\n🤖 Teste 4: Configuração de auto-republicação');
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'auto_republish_enabled')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (settings) {
      const enabled = settings.value === 'true' || settings.value === true;
      logger.info(`   ✅ Configuração encontrada: ${enabled ? 'HABILITADO' : 'DESABILITADO'}`);
      results.passed++;
      results.tests.push({ name: 'Config auto-republicação', status: 'PASS' });
    } else {
      logger.warn('   ⚠️ Configuração não encontrada (será criada no primeiro uso)');
      results.passed++;
      results.tests.push({ name: 'Config auto-republicação', status: 'PASS' });
    }
  } catch (error) {
    logger.error(`   ❌ FALHOU: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Config auto-republicação', status: 'FAIL', error: error.message });
  }

  // Teste 5: Verificar estrutura de arquivos
  logger.info('\n📁 Teste 5: Estrutura de arquivos');
  try {
    const files = [
      '../src/services/schedulers/autoRepublishScheduler.js',
      '../database/migrations/add_out_of_stock_template.sql',
      '../src/services/coupons/couponNotificationService.js',
      '../src/services/bots/notificationDispatcher.js'
    ];

    for (const file of files) {
      const filePath = path.join(__dirname, file);
      await fs.access(filePath);
    }

    logger.info('   ✅ Todos os arquivos necessários estão presentes');
    results.passed++;
    results.tests.push({ name: 'Estrutura de arquivos', status: 'PASS' });
  } catch (error) {
    logger.error(`   ❌ FALHOU: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Estrutura de arquivos', status: 'FAIL', error: error.message });
  }

  // Teste 6: Verificar se node-cron está instalado
  logger.info('\n📦 Teste 6: Dependência node-cron');
  try {
    await import('node-cron');
    logger.info('   ✅ node-cron instalado');
    results.passed++;
    results.tests.push({ name: 'Dependência node-cron', status: 'PASS' });
  } catch (error) {
    logger.error('   ❌ FALHOU: node-cron não instalado');
    logger.warn('   ⚠️ Execute: npm install node-cron');
    results.failed++;
    results.tests.push({ name: 'Dependência node-cron', status: 'FAIL', error: 'Não instalado' });
  }

  // Resumo
  logger.info('\n========== RESUMO DOS TESTES ==========');
  logger.info(`✅ Passou: ${results.passed}`);
  logger.info(`❌ Falhou: ${results.failed}`);
  logger.info(`📊 Total: ${results.passed + results.failed}`);
  logger.info(`📈 Taxa de sucesso: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  logger.info('\n📋 Detalhes:');
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    logger.info(`   ${icon} ${test.name}`);
    if (test.error) {
      logger.info(`      Erro: ${test.error}`);
    }
  });

  if (results.failed > 0) {
    logger.warn('\n⚠️ Alguns testes falharam. Verifique os erros acima.');
    logger.warn('   Consulte APLICAR_CORRECOES_BUGS.md para instruções.');
    process.exit(1);
  } else {
    logger.info('\n🎉 Todos os testes passaram! Sistema pronto para uso.');
    process.exit(0);
  }
}

testBugFixes();

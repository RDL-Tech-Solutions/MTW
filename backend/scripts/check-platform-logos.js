import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verificar logos de plataformas
 */
async function checkLogos() {
  try {
    logger.info('🔍 Verificando logos de plataformas...\n');

    const logosDir = path.join(__dirname, '../assets/logos');
    
    // Verificar se diretório existe
    try {
      await fs.access(logosDir);
      logger.info(`✅ Diretório de logos encontrado: ${logosDir}\n`);
    } catch (error) {
      logger.error(`❌ Diretório de logos NÃO encontrado: ${logosDir}`);
      logger.error('   Crie o diretório: mkdir -p backend/assets/logos');
      process.exit(1);
    }

    // Listar arquivos
    const files = await fs.readdir(logosDir);
    
    logger.info('📁 Arquivos encontrados:');
    for (const file of files) {
      const filePath = path.join(logosDir, file);
      const stats = await fs.stat(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      logger.info(`   - ${file} (${sizeKB} KB)`);
    }

    // Verificar logos esperados
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

    logger.info('\n🔍 Verificando logos esperados:');
    const missing = [];
    
    for (const logo of expectedLogos) {
      const exists = files.includes(logo);
      if (exists) {
        logger.info(`   ✅ ${logo}`);
      } else {
        logger.warn(`   ❌ ${logo} - FALTANDO`);
        missing.push(logo);
      }
    }

    if (missing.length > 0) {
      logger.warn(`\n⚠️ ${missing.length} logo(s) faltando:`);
      missing.forEach(logo => logger.warn(`   - ${logo}`));
      logger.warn('\nAdicione os logos faltantes em: backend/assets/logos/');
    } else {
      logger.info('\n✅ Todos os logos esperados estão presentes!');
    }

    // Verificar logo da Kabum especificamente
    logger.info('\n🔍 Verificação detalhada do logo Kabum:');
    const kabumPath = path.join(logosDir, 'kabum.png');
    
    try {
      await fs.access(kabumPath);
      const stats = await fs.stat(kabumPath);
      logger.info(`   ✅ Arquivo existe: ${kabumPath}`);
      logger.info(`   ✅ Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
      logger.info(`   ✅ É arquivo: ${stats.isFile()}`);
      
      if (stats.size === 0) {
        logger.error('   ❌ ERRO: Arquivo está vazio!');
      }
    } catch (error) {
      logger.error(`   ❌ Logo da Kabum NÃO encontrado: ${kabumPath}`);
      logger.error('   Adicione o logo: backend/assets/logos/kabum.png');
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Erro ao verificar logos: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

checkLogos();

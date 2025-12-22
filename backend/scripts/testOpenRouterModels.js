/**
 * Script para testar todos os modelos OpenRouter e remover os que não funcionam
 * Execute: node scripts/testOpenRouterModels.js
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import supabase from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Obter API key do banco de dados
async function getApiKey() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('openrouter_api_key')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (error) throw error;
    return data?.openrouter_api_key || process.env.OPENROUTER_API_KEY;
  } catch (error) {
    console.error('Erro ao buscar API key:', error.message);
    return process.env.OPENROUTER_API_KEY;
  }
}

// Ler a lista de modelos atual
const modelsPath = join(__dirname, '../src/config/openrouterModels.js');
let modelsContent = readFileSync(modelsPath, 'utf-8');

// Extrair modelos usando regex mais robusto
const models = [];
const modelBlockRegex = /{\s*id:\s*['"]([^'"]+)['"][\s\S]*?},?\s*(?=\n\s*{|\n\s*\/\/|\n\s*\])/g;
let match;

while ((match = modelBlockRegex.exec(modelsContent)) !== null) {
  const fullBlock = match[0];
  const modelId = match[1];
  
  // Extrair informações do modelo
  const nameMatch = fullBlock.match(/name:\s*['"]([^'"]+)['"]/);
  const typeMatch = fullBlock.match(/type:\s*['"]([^'"]+)['"]/);
  
  models.push({
    id: modelId,
    name: nameMatch ? nameMatch[1] : modelId,
    type: typeMatch ? typeMatch[1] : 'unknown',
    fullBlock: fullBlock.trim()
  });
}

console.log(`🔍 Encontrados ${models.length} modelos para testar\n`);

// Testar cada modelo
const workingModels = [];
const brokenModels = [];

async function testModel(model, apiKey) {
  try {
    process.stdout.write(`🧪 Testando: ${model.id.padEnd(50)}... `);
    
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: model.id,
        messages: [
          {
            role: 'user',
            content: 'Test'
          }
        ],
        max_tokens: 5
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/your-repo',
          'X-Title': 'MTW Bot'
        },
        timeout: 15000 // 15 segundos
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      console.log('✅');
      workingModels.push(model);
      return true;
    } else {
      console.log('❌ Resposta inválida');
      brokenModels.push(model);
      return false;
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'Erro desconhecido';
      
      if (status === 404) {
        console.log('❌ 404 (não encontrado)');
      } else if (status === 401) {
        console.log('❌ 401 (API Key inválida)');
        console.error('\n❌ API Key inválida. Verifique OPENROUTER_API_KEY.');
        process.exit(1);
      } else if (status === 402) {
        console.log('❌ 402 (sem créditos)');
      } else if (status === 429) {
        console.log('❌ 429 (rate limit)');
      } else {
        console.log(`❌ ${status}: ${message.substring(0, 30)}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.log('❌ Timeout');
    } else {
      console.log(`❌ ${error.message.substring(0, 30)}`);
    }
    
    brokenModels.push(model);
    return false;
  }
}

// Testar todos os modelos sequencialmente
async function testAllModels() {
  console.log('🚀 Iniciando testes de modelos OpenRouter...\n');
  
  // Obter API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY não configurada. Configure no painel admin ou variável de ambiente.');
    process.exit(1);
  }
  
  console.log('⏱️  Isso pode levar alguns minutos...\n');
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    await testModel(model, apiKey);
    
    // Pequeno delay entre requisições para evitar rate limit
    if (i < models.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTADOS DOS TESTES');
  console.log('='.repeat(70));
  console.log(`✅ Modelos funcionando: ${workingModels.length}`);
  console.log(`❌ Modelos quebrados: ${brokenModels.length}`);
  console.log(`📦 Total testado: ${models.length}\n`);
  
  if (brokenModels.length > 0) {
    console.log('❌ Modelos que não funcionam (serão removidos):');
    brokenModels.forEach(model => {
      console.log(`   - ${model.id} (${model.name})`);
    });
    console.log();
  }
  
  // Atualizar arquivo removendo modelos quebrados
  if (brokenModels.length > 0) {
    console.log('📝 Atualizando arquivo de modelos...');
    
    // Remover cada modelo quebrado do conteúdo
    brokenModels.forEach(model => {
      const escapedId = model.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Remover o bloco completo do modelo (incluindo comentários antes se houver)
      // Padrão: pode ter comentários antes, depois o bloco do modelo
      const pattern = new RegExp(
        `(?:\\s*//[^\\n]*\\n)*` + // Comentários opcionais antes
        `\\s*{[^}]*id:\\s*['"]${escapedId}['"][\\s\\S]*?},?\\s*\\n`, // Bloco do modelo
        'g'
      );
      
      modelsContent = modelsContent.replace(pattern, '');
    });
    
    // Limpar linhas vazias excessivas
    modelsContent = modelsContent.replace(/\n{3,}/g, '\n\n');
    
    // Salvar arquivo atualizado
    writeFileSync(modelsPath, modelsContent, 'utf-8');
    console.log('✅ Arquivo atualizado com sucesso!');
    console.log(`   Removidos ${brokenModels.length} modelo(s) que não funcionam.\n`);
  } else {
    console.log('✅ Todos os modelos estão funcionando!\n');
  }
  
  // Listar modelos funcionais
  if (workingModels.length > 0) {
    console.log('✅ Modelos funcionais:');
    workingModels.forEach(model => {
      console.log(`   - ${model.id} (${model.name})`);
    });
  }
}

// Executar testes
testAllModels().catch(error => {
  console.error('\n❌ Erro ao executar testes:', error.message);
  process.exit(1);
});

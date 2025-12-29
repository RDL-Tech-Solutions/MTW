/**
 * Script para testar modelos OpenRouter com modo JSON
 * Verifica quais modelos retornam JSON válido (com ou sem markdown)
 * Execute: node scripts/testModelsJsonMode.js
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
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
const modelsContent = readFileSync(modelsPath, 'utf-8');

// Extrair modelos gratuitos
const models = [];
const modelBlockRegex = /{\s*id:\s*['"]([^'"]+)['"][\s\S]*?type:\s*['"]free['"][\s\S]*?},?\s*(?=\n\s*{|\n\s*\/\/|\n\s*\])/g;
let match;

while ((match = modelBlockRegex.exec(modelsContent)) !== null) {
  const fullBlock = match[0];
  const modelId = match[1];
  
  const nameMatch = fullBlock.match(/name:\s*['"]([^'"]+)['"]/);
  
  models.push({
    id: modelId,
    name: nameMatch ? nameMatch[1] : modelId
  });
}

console.log(`🔍 Encontrados ${models.length} modelos gratuitos para testar\n`);

// Função para limpar JSON de markdown
function cleanJsonResponse(content) {
  return content
    .replace(/```json\s*\n?/gi, '')
    .replace(/```JSON\s*\n?/gi, '')
    .replace(/```\s*json\s*\n?/gi, '')
    .replace(/```\s*\n?/g, '')
    .replace(/^```/gm, '')
    .replace(/```$/gm, '')
    .replace(/<s>/g, '')
    .replace(/\[OUT\]/g, '')
    .replace(/<\|.*?\|>/g, '')
    .trim();
}

// Função para extrair JSON do conteúdo
function extractJson(content) {
  // Limpar markdown primeiro
  let cleaned = cleanJsonResponse(content);
  
  // Procurar por { ... }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // Se não encontrou, tentar extrair do conteúdo original
  const originalMatch = content.match(/\{[\s\S]*\}/);
  if (originalMatch) {
    return cleanJsonResponse(originalMatch[0]);
  }
  
  return null;
}

// Testar cada modelo
const workingModels = [];
const brokenModels = [];
const markdownModels = []; // Modelos que retornam JSON em markdown mas funcionam

async function testModel(model, apiKey) {
  try {
    process.stdout.write(`🧪 Testando: ${model.id.padEnd(50)}... `);
    
    const prompt = `Você é um sistema automatizado que retorna APENAS objetos JSON válidos. NUNCA responda com texto livre. NUNCA explique. NUNCA adicione comentários. Retorne SOMENTE o JSON solicitado.

Retorne um JSON com a seguinte estrutura:
{
  "test": "success",
  "number": 42,
  "valid": true
}`;

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: model.id,
        messages: [
          {
            role: 'system',
            content: 'Você é um sistema automatizado que retorna APENAS objetos JSON válidos. NUNCA responda com texto livre. NUNCA explique. NUNCA adicione comentários. Retorne SOMENTE o JSON solicitado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/your-repo',
          'X-Title': 'MTW Bot'
        },
        timeout: 20000
      }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.log('❌ Resposta inválida');
      brokenModels.push({ ...model, reason: 'Resposta inválida' });
      return false;
    }

    const content = response.data.choices[0].message?.content || '';
    
    if (!content) {
      console.log('❌ Conteúdo vazio');
      brokenModels.push({ ...model, reason: 'Conteúdo vazio' });
      return false;
    }

    // Tentar extrair e parsear JSON
    let jsonContent = extractJson(content);
    
    if (!jsonContent) {
      console.log('❌ JSON não encontrado');
      brokenModels.push({ ...model, reason: 'JSON não encontrado', content: content.substring(0, 100) });
      return false;
    }

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Verificar se tem a estrutura esperada
      if (parsed.test === 'success' && parsed.number === 42 && parsed.valid === true) {
        // Verificar se veio em markdown
        if (content.includes('```json') || content.includes('```JSON') || (content.includes('```') && content.includes('{'))) {
          console.log('✅ (com markdown)');
          markdownModels.push(model);
        } else {
          console.log('✅');
        }
        workingModels.push(model);
        return true;
      } else {
        console.log('❌ JSON inválido');
        brokenModels.push({ ...model, reason: 'JSON inválido', content: jsonContent.substring(0, 100) });
        return false;
      }
    } catch (parseError) {
      console.log('❌ Erro ao parsear');
      brokenModels.push({ ...model, reason: `Erro de parsing: ${parseError.message}`, content: jsonContent.substring(0, 100) });
      return false;
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        console.log('❌ 404');
      } else if (status === 401) {
        console.log('❌ 401');
        console.error('\n❌ API Key inválida.');
        process.exit(1);
      } else if (status === 402) {
        console.log('❌ 402');
      } else {
        console.log(`❌ ${status}`);
      }
    } else {
      console.log(`❌ ${error.message.substring(0, 30)}`);
    }
    
    brokenModels.push({ ...model, reason: error.message });
    return false;
  }
}

// Testar todos os modelos
async function testAllModels() {
  console.log('🚀 Iniciando testes de modelos com modo JSON...\n');
  
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY não configurada.');
    process.exit(1);
  }
  
  console.log('⏱️  Isso pode levar alguns minutos...\n');
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    await testModel(model, apiKey);
    
    if (i < models.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTADOS DOS TESTES');
  console.log('='.repeat(70));
  console.log(`✅ Modelos funcionando: ${workingModels.length}`);
  console.log(`   - Retornam JSON puro: ${workingModels.length - markdownModels.length}`);
  console.log(`   - Retornam JSON em markdown: ${markdownModels.length}`);
  console.log(`❌ Modelos quebrados: ${brokenModels.length}`);
  console.log(`📦 Total testado: ${models.length}\n`);
  
  if (workingModels.length > 0) {
    console.log('✅ Modelos funcionais:');
    workingModels.forEach(model => {
      const isMarkdown = markdownModels.some(m => m.id === model.id);
      console.log(`   - ${model.id} (${model.name})${isMarkdown ? ' [retorna em markdown]' : ''}`);
    });
    console.log();
  }
  
  if (brokenModels.length > 0) {
    console.log('❌ Modelos que não funcionam:');
    brokenModels.forEach(model => {
      console.log(`   - ${model.id} (${model.name}) - ${model.reason}`);
    });
  }
  
  console.log('\n💡 RECOMENDAÇÃO:');
  if (markdownModels.length > 0) {
    console.log('   O código já foi atualizado para lidar com JSON em markdown.');
    console.log('   Todos os modelos funcionais podem ser usados.');
  } else {
    console.log('   Todos os modelos funcionais retornam JSON puro.');
  }
}

testAllModels().catch(error => {
  console.error('\n❌ Erro ao executar testes:', error.message);
  process.exit(1);
});



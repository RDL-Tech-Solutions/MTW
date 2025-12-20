/**
 * Lista completa de modelos disponíveis no OpenRouter
 * Sincronizado com backend/src/config/openrouterModels.js
 */

export const OPENROUTER_MODELS = [
  // ========== MODELOS GRATUITOS ==========
  {
    id: 'mistralai/mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'Mistral AI',
    type: 'free',
    description: 'Modelo leve e rápido, ideal para tarefas básicas',
    supportsJson: false,
    maxTokens: 8192
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B Instruct',
    provider: 'Mistral AI',
    type: 'free',
    description: 'Modelo inteligente e rápido, melhor qualidade que Mistral 7B',
    supportsJson: true,
    maxTokens: 32768
  },
  {
    id: 'meta-llama/llama-3-8b-instruct',
    name: 'Llama 3 8B Instruct',
    provider: 'Meta',
    type: 'free',
    description: 'Modelo pequeno e poderoso da Meta',
    supportsJson: false,
    maxTokens: 8192
  },
  {
    id: 'openchat/openchat-3.5-0106',
    name: 'OpenChat 3.5',
    provider: 'OpenChat',
    type: 'free',
    description: 'Modelo de chat otimizado, útil e rápido',
    supportsJson: false,
    maxTokens: 8192
  },
  {
    id: 'nousresearch/nous-capybara-7b',
    name: 'Nous Capybara 7B',
    provider: 'Nous Research',
    type: 'free',
    description: 'Modelo conversacional com boa memória',
    supportsJson: false,
    maxTokens: 8192
  },
  {
    id: 'gryphe/mythomax-l2-13b',
    name: 'MythoMax L2 13B',
    provider: 'Gryphe',
    type: 'free',
    description: 'Equilibrado entre criatividade e lógica',
    supportsJson: false,
    maxTokens: 8192
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    type: 'free',
    description: 'Modelo rápido e eficiente do Google',
    supportsJson: true,
    maxTokens: 8192
  },
  {
    id: 'qwen/qwen-2.5-7b-instruct',
    name: 'Qwen 2.5 7B Instruct',
    provider: 'Qwen',
    type: 'free',
    description: 'Modelo de instrução eficiente',
    supportsJson: false,
    maxTokens: 32768
  },

  // ========== MODELOS PAGOS (POPULARES) ==========
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Modelo mais avançado da OpenAI, melhor precisão',
    supportsJson: true,
    maxTokens: 16384,
    pricing: 'Alto custo, melhor qualidade'
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Versão turbo do GPT-4, mais rápido',
    supportsJson: true,
    maxTokens: 128000,
    pricing: 'Alto custo, melhor qualidade'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Modelo rápido e econômico da OpenAI',
    supportsJson: true,
    maxTokens: 16384,
    pricing: 'Custo médio, boa qualidade'
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Contexto longo, raciocínio poderoso',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Alto custo, excelente qualidade'
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Versão balanceada do Claude 3',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Custo médio-alto, ótima qualidade'
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Versão rápida e econômica do Claude 3',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Custo baixo, boa qualidade'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Versão mais recente e melhorada do Claude',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Custo médio-alto, excelente qualidade'
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    type: 'paid',
    description: 'Desempenho razoável do Google',
    supportsJson: true,
    maxTokens: 32768,
    pricing: 'Custo médio'
  },
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    type: 'paid',
    description: 'Versão melhorada do Gemini Pro',
    supportsJson: true,
    maxTokens: 1000000,
    pricing: 'Custo médio'
  },
  {
    id: 'cohere/command-r+',
    name: 'Command R+',
    provider: 'Cohere',
    type: 'paid',
    description: 'Ideal para embedding e aplicações RAG',
    supportsJson: true,
    maxTokens: 128000,
    pricing: 'Custo médio'
  },
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    type: 'paid',
    description: 'Modelo premium da Mistral AI',
    supportsJson: true,
    maxTokens: 32000,
    pricing: 'Custo médio-alto'
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B Instruct',
    provider: 'Meta',
    type: 'paid',
    description: 'Modelo grande e poderoso da Meta',
    supportsJson: true,
    maxTokens: 8192,
    pricing: 'Custo médio'
  }
];

/**
 * Obter modelos por tipo
 */
export function getModelsByType(type) {
  return OPENROUTER_MODELS.filter(model => model.type === type);
}

/**
 * Obter modelo por ID
 */
export function getModelById(id) {
  return OPENROUTER_MODELS.find(model => model.id === id);
}

/**
 * Obter modelos que suportam JSON
 */
export function getModelsWithJsonSupport() {
  return OPENROUTER_MODELS.filter(model => model.supportsJson === true);
}

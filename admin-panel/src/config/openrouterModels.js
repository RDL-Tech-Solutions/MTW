/**
 * Lista de modelos disponíveis no OpenRouter
 * SINCRONIZADO com backend/src/config/openrouterModels.js
 * 
 * IMPORTANTE: Modelos com supportsJson: true são REQUERIDOS para análise de cupom
 */

export const OPENROUTER_MODELS = [
  // ========== MODELOS GRATUITOS RECOMENDADOS ==========
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5 ⭐ RECOMENDADO (Gratuito)',
    provider: 'Google',
    type: 'free',
    description: 'MELHOR OPÇÃO GRATUITA - Rápido, suporta JSON, ideal para todas as funções.',
    supportsJson: true,
    maxTokens: 8192,
    recommended: true
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B Instruct (Gratuito)',
    provider: 'Mistral AI',
    type: 'free',
    description: 'Gratuito com suporte JSON. Contexto grande (32K).',
    supportsJson: true,
    maxTokens: 32768
  },

  // ========== MODELOS PAGOS (MELHOR QUALIDADE) ==========
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (Pago)',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Melhor custo-benefício pago. Rápido, inteligente, econômico.',
    supportsJson: true,
    maxTokens: 128000,
    pricing: 'Custo muito baixo, excelente qualidade'
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku (Pago)',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Rápido e econômico. Boa alternativa ao GPT-4o Mini.',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Custo baixo, boa qualidade'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Excelente para templates criativos e análise profunda.',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Custo médio-alto, excelente qualidade'
  },

  // ========== MODELOS PREMIUM (ALTA QUALIDADE) ==========
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Modelo mais avançado da OpenAI. Melhor precisão.',
    supportsJson: true,
    maxTokens: 16384,
    pricing: 'Alto custo, melhor qualidade'
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Contexto grande (128K), versão turbo do GPT-4.',
    supportsJson: true,
    maxTokens: 128000,
    pricing: 'Alto custo, melhor qualidade'
  },
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'paid',
    description: 'Máximo poder de raciocínio. Contexto longo.',
    supportsJson: true,
    maxTokens: 200000,
    pricing: 'Alto custo, excelente qualidade'
  },

  // ========== MODELOS ECONÔMICOS ==========
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'paid',
    description: 'Modelo rápido e econômico. Bom para tarefas simples.',
    supportsJson: true,
    maxTokens: 16384,
    pricing: 'Custo médio, boa qualidade'
  },
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    type: 'paid',
    description: 'Modelo premium da Mistral. Bom custo-benefício.',
    supportsJson: true,
    maxTokens: 32000,
    pricing: 'Custo médio-alto'
  },
  {
    id: 'meta-llama/llama-3-70b-instruct',
    name: 'Llama 3 70B Instruct',
    provider: 'Meta',
    type: 'paid',
    description: 'Modelo grande e poderoso da Meta. Open source.',
    supportsJson: true,
    maxTokens: 8192,
    pricing: 'Custo médio'
  },

  // ========== MODELOS GOOGLE ==========
  {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    type: 'paid',
    description: 'Contexto muito grande (1M tokens). Bom para análises longas.',
    supportsJson: true,
    maxTokens: 1000000,
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
 * Obter modelos que suportam JSON (REQUERIDO para análise de cupom)
 */
export function getModelsWithJsonSupport() {
  return OPENROUTER_MODELS.filter(model => model.supportsJson === true);
}

/**
 * Obter modelos recomendados para MTW Promo
 */
export function getRecommendedModels() {
  return OPENROUTER_MODELS.filter(model =>
    model.supportsJson === true && (
      model.recommended === true ||
      model.id.includes('gpt-4o') ||
      model.id.includes('claude') ||
      model.id.includes('gemini')
    )
  );
}

/**
 * Obter modelo padrão recomendado (GRATUITO)
 */
export function getDefaultModel() {
  return OPENROUTER_MODELS.find(model => model.recommended === true) ||
    OPENROUTER_MODELS.find(model => model.id === 'google/gemini-flash-1.5') ||
    OPENROUTER_MODELS[0];
}

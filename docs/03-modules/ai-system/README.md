# 🧠 Sistema de IA (Inteligência Artificial)

Documentação completa do sistema de Inteligência Artificial do MTW Promo.

## 📋 Visão Geral

O sistema de IA utiliza a API do OpenRouter para fornecer análises inteligentes, edição automática e otimização de produtos e cupons. O sistema é configurável através do painel administrativo e suporta múltiplos modelos de IA (gratuitos e pagos).

## 🎯 Funcionalidades Principais

### 1. Análise Inteligente de Cupons

O sistema analisa automaticamente mensagens do Telegram e extrai informações de cupons:

- **Código do cupom**: Extrai o código automaticamente
- **Plataforma**: Identifica a plataforma (Mercado Livre, Shopee, etc)
- **Tipo de desconto**: Percentual ou valor fixo
- **Valor do desconto**: Extrai o valor exato
- **Limite de desconto**: Valor máximo (se aplicável)
- **Compra mínima**: Valor mínimo necessário
- **Validade**: Data de expiração
- **Limite de uso**: Quantas vezes pode ser usado

**Confidence Score**: Cada análise recebe um score de confiança (0-1):
- **≥ 0.90**: Publicação automática
- **< 0.90**: Fica pendente para aprovação manual

### 2. Editor de Produtos

Antes da publicação, a IA edita automaticamente os produtos:

- **Otimização de Títulos**: 
  - Torna títulos mais curtos e chamativos
  - Remove informações redundantes
  - Adiciona emojis estratégicos (mínimo)
  - Mantém informações essenciais

- **Geração de Descrições**:
  - Cria descrições padronizadas e persuasivas
  - Destaca características principais
  - Cria senso de urgência quando apropriado

- **Classificação de Categorias**:
  - Detecta categoria automaticamente
  - Mapeia para categorias existentes no sistema

- **Prioridade da Oferta**:
  - Classifica como baixa/média/alta
  - Baseado em desconto, qualidade e relevância

### 3. Score de Qualidade

O sistema calcula um score de qualidade para cada oferta baseado em:

- **Percentual de desconto** (peso: 30%)
- **Histórico de preços** (peso: 20%)
- **Popularidade do produto** (peso: 20%)
- **Performance anterior (CTR)** (peso: 15%)
- **Confiança da IA** (peso: 15%)

**Uso do Score**:
- Ordenação do feed de produtos
- Decisão de envio de notificações push
- Priorização de envio para bots

### 4. Detecção de Duplicados

O sistema identifica produtos duplicados automaticamente:

- **Normalização de Nomes**: Padroniza nomes de produtos
- **Comparação Inteligente**: Compara produtos entre plataformas
- **Canonical Product ID**: Cria ID canônico para produtos duplicados
- **Prevenção de Poluição**: Evita múltiplas entradas do mesmo produto

### 5. Segmentação Inteligente de Bots

Os bots podem ser configurados com segmentação inteligente:

- **Filtro por Categoria**: Publica apenas produtos de categorias específicas
- **Filtro por Plataforma**: Publica apenas de plataformas específicas
- **Horários de Engajamento**: Respeita horários configurados
- **Score Mínimo**: Publica apenas produtos com score acima do mínimo
- **Anti-Duplicação**: Evita publicar a mesma oferta em período curto

### 6. Templates IA ADVANCED

O sistema pode gerar templates de mensagens dinamicamente:

- **Geração Dinâmica**: Templates gerados baseados no produto específico
- **Otimização de Títulos**: Títulos otimizados antes da publicação
- **Mensagens Persuasivas**: Descrições elaboradas e convincentes
- **Formatação Inteligente**: Correção automática de formatação

## ⚙️ Configuração

### No Painel Admin (`/settings`)

1. **OpenRouter API Key**: Configure sua chave da API
2. **Modelo Selecionado**: Escolha entre modelos gratuitos ou pagos
3. **Threshold de Confiança**: Defina o score mínimo para publicação automática (padrão: 0.90)
4. **Habilitar Funcionalidades**:
   - ✅ Publicação automática de cupons
   - ✅ Edição de produtos
   - ✅ Detecção de duplicados
   - ✅ Score de qualidade

### Modelos Disponíveis

O sistema suporta múltiplos modelos do OpenRouter:

**Modelos Gratuitos**:
- Meta Llama 3.1 8B
- Google Gemma 2 9B
- Mistral 7B
- E mais...

**Modelos Pagos**:
- OpenAI GPT-4
- Anthropic Claude 3.5 Sonnet
- Google Gemini Pro
- E mais...

Cada modelo tem características diferentes:
- Suporte a JSON mode
- Limite de tokens
- Preço por token
- Velocidade de resposta

## 📊 Observabilidade

### Logs de Decisões

Todas as decisões da IA são registradas em `ai_decision_logs`:

- **Entrada**: Dados originais
- **Saída**: Resultado da análise
- **Confidence Score**: Score de confiança
- **Razão da Decisão**: Explicação da decisão
- **Status**: Sucesso ou falha
- **Timestamp**: Data e hora

### Histórico de Edições

O sistema mantém histórico completo de edições:

- **Título Original** vs **Título Otimizado**
- **Descrição Original** vs **Descrição Gerada**
- **Categoria Detectada**
- **Prioridade Definida**
- **Timestamp**: Data e hora da edição

## 🔧 Arquitetura Técnica

### Fluxo de Análise de Cupons

1. Mensagem capturada do Telegram
2. `couponAnalyzer` analisa a mensagem
3. `confidenceValidator` valida o score
4. Se score ≥ threshold → Publica automaticamente
5. Se score < threshold → Fica pendente
6. Log registrado em `ai_decision_logs`

### Fluxo de Edição de Produtos

1. Produto criado ou aprovado
2. `productEditor` edita o produto:
   - Otimiza título
   - Gera descrição
   - Detecta categoria
   - Define prioridade
3. `qualityScorer` calcula score
4. `duplicateDetector` verifica duplicados
5. Produto publicado com dados otimizados
6. Log registrado em `ai_decision_logs`

### Fluxo de Templates IA ADVANCED

1. Produto pronto para publicação
2. `advancedTemplateGenerator` gera template:
   - Otimiza título do produto
   - Cria descrição persuasiva
   - Formata preços e descontos
   - Adiciona emojis estratégicos
3. Template processado e formatado
4. Mensagem enviada para bots

## 🚨 Tratamento de Erros

### Fallback Automático

Se a IA falhar:
- Sistema usa template padrão ou customizado
- Produto/cupom é salvo sem edições da IA
- Erro é registrado nos logs
- Sistema continua funcionando normalmente

### Rate Limiting

- Limites configuráveis por modelo
- Retry automático com backoff exponencial
- Cache de respostas quando apropriado

## 📚 Mais Informações

- [Backend API](../backend/README.md)
- [Admin Panel](../admin-panel/README.md)
- [Bots](../04-integrations/bots/README.md)
- [Troubleshooting](../../06-troubleshooting/README.md)

---

**Próximo**: [Auto Sync](../auto-sync/README.md)





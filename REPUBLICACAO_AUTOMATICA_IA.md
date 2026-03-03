# Republicação Automática com IA

## 📋 Visão Geral

Sistema inteligente de republicação automática de produtos aprovados usando IA para criar estratégias otimizadas de publicação.

## ✨ Funcionalidades

### 🤖 Análise Inteligente com IA
- Analisa todos os produtos aprovados
- Cria estratégia de republicação baseada em:
  - Desconto e offer_score
  - Categoria dos produtos
  - Presença de cupons
  - Histórico de publicações

### 📅 Agendamento Estratégico
- Distribui publicações ao longo de 7 dias
- Máximo de 5 produtos por dia
- Horários de pico: 10h-12h, 14h-16h, 19h-21h
- Espaçamento mínimo de 2 horas entre publicações
- Produtos da mesma categoria em dias diferentes

### 🎯 Priorização Inteligente
- Produtos com maior desconto têm prioridade
- Produtos com cupom são priorizados
- Produtos com melhor offer_score vêm primeiro
- Evita publicações repetitivas

## 🚀 Como Usar

### 1. Ativar Republicação Automática

Na página de **Produtos** (`/products`):

1. Clique no botão **"Ativar IA"** no canto superior direito
2. O botão ficará roxo indicando que está ativo
3. Um card informativo aparecerá mostrando que a IA está ativa

### 2. Executar Republicação Manual

Com a IA ativada:

1. Clique no botão **"Republicar Agora"**
2. A IA irá:
   - Buscar todos os produtos aprovados
   - Analisar e criar estratégia
   - Agendar publicações em `/scheduled-posts`
3. Você verá uma notificação com quantos produtos foram agendados

### 3. Verificar Agendamentos

1. Acesse **Agendamentos IA** (`/scheduled-posts`)
2. Veja todos os produtos agendados pela IA
3. Cada agendamento mostra:
   - Data e hora programada
   - Prioridade (alta/média/baixa)
   - Motivo da escolha

## 🔧 Configuração Backend

### Migração do Banco de Dados

Execute o SQL no Supabase:

```sql
-- Arquivo: backend/database/migrations/add_auto_republish_setting.sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS auto_republish_enabled BOOLEAN DEFAULT false;
```

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```env
# OpenRouter (IA)
OPENROUTER_API_KEY=your_api_key
OPENROUTER_ENABLED=true
OPENROUTER_MODEL=mistralai/mixtral-8x7b-instruct

# Cron Jobs (para agendamentos)
ENABLE_CRON_JOBS=true
TZ=America/Sao_Paulo
```

## 📡 Endpoints da API

### POST `/api/auto-republish/toggle`
Ativar/desativar republicação automática

**Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "enabled": true
  },
  "message": "Republicação automática ativada com sucesso"
}
```

### GET `/api/auto-republish/status`
Obter status do serviço

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "isRunning": false,
    "lastRun": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST `/api/auto-republish/run`
Executar republicação manual

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "scheduled": 15,
    "message": "15 produtos agendados para republicação",
    "strategy": {
      "summary": "Estratégia criada: 15 produtos distribuídos em 3 dias"
    }
  }
}
```

## 🧠 Como a IA Funciona

### Prompt para a IA

A IA recebe:
- Lista de produtos aprovados com:
  - Nome, plataforma, preços
  - Desconto e offer_score
  - Categoria
  - Se tem cupom vinculado

### Regras da Estratégia

1. **Distribuição Temporal**: 7 dias
2. **Limite Diário**: Máximo 5 produtos/dia
3. **Priorização**: Maior desconto + melhor score
4. **Diversificação**: Produtos similares em dias diferentes
5. **Horários**: Picos de engajamento
6. **Espaçamento**: Mínimo 2 horas entre posts
7. **Cupons**: Prioridade para produtos com cupom

### Fallback

Se a IA falhar, o sistema usa estratégia automática:
- Ordena por score + desconto
- Distribui uniformemente em 7 dias
- Horários fixos: 10h, 12h, 14h, 16h, 19h

## 📊 Metadados dos Agendamentos

Cada agendamento criado pela IA contém:

```json
{
  "metadata": {
    "auto_republish": true,
    "priority": "high|medium|low",
    "reason": "Explicação da IA sobre a escolha"
  }
}
```

## 🎨 Interface do Usuário

### Botões

1. **"Ativar IA"** / **"IA Ativa"**
   - Alterna entre ativado/desativado
   - Cor roxa quando ativo
   - Ícone de cérebro (Brain)

2. **"Republicar Agora"**
   - Só aparece quando IA está ativa
   - Executa análise e agendamento
   - Ícone de raio (Zap)

### Card Informativo

Quando ativo, mostra:
- Status da IA
- Descrição da estratégia
- Benefícios principais

## 🔍 Filtros e Validações

### Produtos Elegíveis

- Status: `approved`
- Estoque: `stock_available = true`
- Sem agendamento pendente
- Limite: 50 produtos por execução

### Validações

- Data de agendamento deve ser futura
- Produto deve existir no banco
- Não duplicar agendamentos pendentes

## 🐛 Troubleshooting

### IA não está agendando produtos

1. Verifique se há produtos aprovados
2. Confirme que `OPENROUTER_API_KEY` está configurada
3. Verifique logs do backend para erros da IA
4. Sistema usará fallback se IA falhar

### Agendamentos não estão sendo publicados

1. Verifique se `ENABLE_CRON_JOBS=true`
2. Confirme que o cron está rodando: `GET /api/scheduled-posts/debug`
3. Inicie manualmente: `POST /api/scheduled-posts/cron/start`

### Botão "Republicar Agora" não aparece

1. Certifique-se de que a IA está ativada
2. Recarregue a página
3. Verifique console do navegador para erros

## 📝 Logs

O sistema gera logs detalhados:

```
🤖 Iniciando análise de produtos para republicação automática...
📊 Encontrados 25 produtos aprovados
🤖 Solicitando estratégia de republicação à IA...
✅ Estratégia criada: 15 produtos agendados
📝 Resumo: Distribuição inteligente em 3 dias priorizando ofertas
✅ Produto "iPhone 14 Pro" agendado para 2024-01-16 10:00 (high)
✅ Republicação automática concluída: 15 produtos agendados
```

## 🔐 Segurança

- Todas as rotas requerem autenticação de admin
- Validação de dados de entrada
- Rate limiting da IA
- Circuit breaker para falhas

## 🚀 Próximos Passos

Possíveis melhorias futuras:

1. **Análise de Performance**: Métricas de engajamento por horário
2. **A/B Testing**: Testar diferentes estratégias
3. **Machine Learning**: Aprender com resultados passados
4. **Notificações**: Alertar quando republicação for concluída
5. **Agendamento Recorrente**: Republicar automaticamente a cada X dias

## 📚 Arquivos Criados

### Backend
- `backend/src/services/autoRepublishService.js` - Serviço principal
- `backend/src/controllers/autoRepublishController.js` - Controller
- `backend/src/routes/autoRepublishRoutes.js` - Rotas
- `backend/database/migrations/add_auto_republish_setting.sql` - Migração

### Frontend
- Modificações em `admin-panel/src/pages/Products.jsx`

### Documentação
- `REPUBLICACAO_AUTOMATICA_IA.md` - Este arquivo

## ✅ Checklist de Implementação

- [x] Criar serviço de republicação automática
- [x] Implementar análise com IA
- [x] Criar estratégia de fallback
- [x] Adicionar rotas da API
- [x] Criar interface no frontend
- [x] Adicionar botões de controle
- [x] Criar card informativo
- [x] Adicionar validações
- [x] Implementar logs detalhados
- [x] Criar migração do banco
- [x] Documentar funcionalidade

## 🎉 Conclusão

A funcionalidade de Republicação Automática com IA está completa e pronta para uso! 

Ela permite que produtos aprovados sejam republicados de forma inteligente e estratégica, maximizando o alcance e evitando spam ou publicações desorganizadas.

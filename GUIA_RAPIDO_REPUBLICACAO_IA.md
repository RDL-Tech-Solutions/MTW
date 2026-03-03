# 🚀 Guia Rápido - Republicação Automática com IA

## ⚡ Início Rápido (3 passos)

### 1️⃣ Executar Migração do Banco
No Supabase SQL Editor, execute:

```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS auto_republish_enabled BOOLEAN DEFAULT false;
```

### 2️⃣ Testar Configuração
No terminal, execute:

```bash
node backend/scripts/test-auto-republish.js
```

Este script irá verificar:
- ✅ OpenRouter configurado
- ✅ Produtos aprovados disponíveis
- ✅ IA funcionando
- ✅ Serviço pronto para usar

### 3️⃣ Usar no Admin Panel

1. Acesse: `http://localhost:5173/products` (ou seu domínio)
2. Clique no botão **"Ativar IA"** (canto superior direito)
3. Clique em **"Republicar Agora"**
4. Aguarde alguns segundos
5. Veja a notificação: "X produtos agendados"
6. Acesse `/scheduled-posts` para ver os agendamentos

## 🎯 Como Funciona

```
┌─────────────────┐
│ Produtos        │
│ Aprovados       │
│ (status=approved)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IA Analisa      │
│ - Desconto      │
│ - Score         │
│ - Categoria     │
│ - Cupom         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cria Estratégia │
│ - 7 dias        │
│ - 5 por dia     │
│ - Horários pico │
│ - Sem repetição │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agenda em       │
│ /scheduled-posts│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend Publica │
│ Automaticamente │
└─────────────────┘
```

## 📱 Interface

### Botões na Página /products

```
┌──────────────────────────────────────────┐
│ Produtos                                  │
│ Gerencie produtos (150)                   │
│                                           │
│  [Ativar IA] [Novo Produto]              │ ← Quando desativado
│                                           │
│  [IA Ativa 🧠] [Republicar Agora ⚡]     │ ← Quando ativado
│  [Novo Produto]                           │
└──────────────────────────────────────────┘
```

### Card Informativo (quando IA ativa)

```
┌──────────────────────────────────────────────┐
│ 🧠 Republicação Automática com IA Ativada    │
│                                               │
│ A IA está analisando produtos aprovados e    │
│ criando uma estratégia inteligente de        │
│ republicação. Os produtos serão distribuídos │
│ ao longo dos próximos dias em horários       │
│ estratégicos para maximizar o alcance.       │
│                                               │
│ ⚡ Prioriza melhores ofertas                 │
│ 📅 Distribui ao longo de 7 dias              │
│ 🧠 Evita repetições                          │
└──────────────────────────────────────────────┘
```

## 🔍 Exemplo Real

### Antes de Clicar "Republicar Agora"
- 25 produtos com status "approved"
- Nenhum agendamento

### Depois de Clicar "Republicar Agora"
```
✅ Republicação Automática Concluída! 🎉
15 produtos agendados para republicação

Estratégia da IA:
- Distribuição em 3 dias
- Prioridade para produtos com maior desconto
- Horários de pico: 10h, 12h, 14h, 16h, 19h
```

### Em /scheduled-posts
```
┌────────────────────────────────────────────────┐
│ Produto              │ Data/Hora  │ Prioridade │
├────────────────────────────────────────────────┤
│ iPhone 14 Pro 60%OFF │ 16/01 10:00│ Alta 🔥   │
│ Galaxy S23 50%OFF    │ 16/01 12:00│ Alta 🔥   │
│ Notebook Dell 40%OFF │ 16/01 14:00│ Média ⚡  │
│ Mouse Gamer 30%OFF   │ 16/01 16:00│ Média ⚡  │
│ Teclado RGB 25%OFF   │ 16/01 19:00│ Baixa 📌  │
│ ...                  │ ...        │ ...        │
└────────────────────────────────────────────────┘
```

## ⚙️ Configurações

### Variáveis de Ambiente (já configuradas)
```env
# OpenRouter (IA)
OPENROUTER_API_KEY=sk-or-v1-xxxxx  ✅ Já configurado
OPENROUTER_ENABLED=true             ✅ Já configurado
OPENROUTER_MODEL=mistralai/mixtral-8x7b-instruct

# Cron Jobs
ENABLE_CRON_JOBS=true
TZ=America/Sao_Paulo
```

## 🎛️ Controles

### Ativar/Desativar
- **Botão**: "Ativar IA" / "IA Ativa"
- **Efeito**: Liga/desliga o serviço
- **Persistente**: Salvo no banco de dados

### Executar Manualmente
- **Botão**: "Republicar Agora"
- **Quando**: Só aparece se IA estiver ativa
- **Efeito**: Executa análise e agendamento imediatamente

## 📊 Regras da IA

### Produtos Elegíveis
- ✅ Status: "approved"
- ✅ Estoque disponível
- ✅ Sem agendamento pendente
- ❌ Máximo 50 produtos por execução

### Estratégia de Agendamento
- 📅 **Período**: 7 dias
- 🔢 **Limite diário**: 5 produtos
- ⏰ **Horários**: 10h, 12h, 14h, 16h, 19h, 21h
- ⏱️ **Espaçamento**: Mínimo 2 horas
- 🎯 **Prioridade**: Maior desconto primeiro
- 🏷️ **Cupons**: Prioridade extra
- 📂 **Categorias**: Mesma categoria em dias diferentes

## 🐛 Solução de Problemas

### "Nenhum produto para republicar"
**Causa**: Não há produtos aprovados ou todos já estão agendados

**Solução**:
1. Vá em `/products`
2. Filtre por status "Pendentes"
3. Aprove alguns produtos
4. Tente novamente

### "Erro ao executar republicação"
**Causa**: Problema com OpenRouter ou IA

**Solução**:
1. Execute: `node backend/scripts/test-auto-republish.js`
2. Verifique os logs do backend
3. Sistema usará fallback automático

### Botão "Republicar Agora" não aparece
**Causa**: IA não está ativada

**Solução**:
1. Clique em "Ativar IA" primeiro
2. Recarregue a página se necessário

### Agendamentos não publicam
**Causa**: Cron jobs não estão rodando

**Solução**:
1. Verifique: `GET /api/scheduled-posts/debug`
2. Inicie: `POST /api/scheduled-posts/cron/start`
3. Confirme `ENABLE_CRON_JOBS=true` no `.env`

## 📝 Logs

### Backend Console
```
🤖 Iniciando análise de produtos para republicação automática...
📊 Encontrados 25 produtos aprovados
🤖 Solicitando estratégia de republicação à IA...
✅ Estratégia criada: 15 produtos agendados
📝 Resumo: Distribuição inteligente em 3 dias priorizando ofertas
✅ Produto "iPhone 14 Pro" agendado para 2024-01-16 10:00 (high)
✅ Republicação automática concluída: 15 produtos agendados
```

### Frontend Toast
```
✅ Republicação Automática Concluída! 🎉
15 produtos agendados para republicação
```

## 🎯 Dicas de Uso

### Melhor Momento para Usar
- 📅 **Segunda-feira**: Agendar semana inteira
- 🌅 **Manhã**: Antes do horário de pico
- 📊 **Após aprovações**: Quando tiver muitos produtos aprovados

### Frequência Recomendada
- 🔄 **1x por semana**: Para manter fluxo constante
- 🚀 **2x por semana**: Se tiver muitos produtos
- ⚡ **Sob demanda**: Quando aprovar lote grande

### Boas Práticas
1. ✅ Aprove produtos em lotes
2. ✅ Use a IA para distribuir automaticamente
3. ✅ Monitore `/scheduled-posts` regularmente
4. ✅ Ajuste cupons antes de republicar
5. ✅ Verifique logs se houver problemas

## 🎉 Pronto!

Agora você tem republicação automática inteligente! 

A IA vai:
- ✅ Analisar seus produtos
- ✅ Criar estratégia otimizada
- ✅ Agendar em horários de pico
- ✅ Evitar spam e desorganização
- ✅ Maximizar alcance das ofertas

**Basta ativar e deixar a IA trabalhar!** 🚀

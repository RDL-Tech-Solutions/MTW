# 🧪 Teste da Republicação Automática com IA

## ✅ Pré-requisitos

- ✅ OpenRouter já configurado no projeto
- ✅ Produtos com status "approved" no banco
- ✅ Cron jobs ativos (`ENABLE_CRON_JOBS=true`)

## 🚀 Passo a Passo do Teste

### 1. Executar Migração do Banco

No **Supabase SQL Editor**:

```sql
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS auto_republish_enabled BOOLEAN DEFAULT false;
```

**Resultado esperado**: ✅ Success

---

### 2. Executar Script de Teste

No **terminal do backend**:

```bash
node backend/scripts/test-auto-republish.js
```

**Resultado esperado**:
```
🧪 ========================================
🧪 TESTE: Republicação Automática com IA
🧪 ========================================

1️⃣ Verificando configurações do OpenRouter...
✅ OpenRouter configurado
   Modelo: mistralai/mixtral-8x7b-instruct
   Status: Ativo

2️⃣ Verificando status do serviço...
   Republicação automática: ❌ Desativada
   Em execução: Não
   Última execução: Nunca

3️⃣ Buscando produtos aprovados...
✅ Encontrados 25 produtos aprovados

📋 Primeiros 5 produtos:
   1. iPhone 14 Pro 128GB
      Plataforma: shopee
      Desconto: 60%
      Score: 85
      Cupom: Sim
   ...

4️⃣ Testando criação de estratégia com IA...
   (Isso pode levar alguns segundos...)

✅ Estratégia criada com sucesso!

📝 Resumo: Distribuição inteligente em 3 dias priorizando ofertas com maior desconto

📅 Agendamentos sugeridos: 15

📋 Primeiros 5 agendamentos:
   1. iPhone 14 Pro 128GB
      Data: 2024-01-16 10:00
      Prioridade: high
      Motivo: Produto com 60% de desconto e cupom vinculado
   ...

🎉 ========================================
🎉 TESTE CONCLUÍDO COM SUCESSO!
🎉 ========================================

✅ Checklist:
   ✅ OpenRouter configurado
   ✅ OpenRouter ativo
   ✅ Produtos aprovados disponíveis
   ✅ Serviço de republicação funcionando
   ✅ IA capaz de criar estratégias

📝 Próximos passos:
   1. Acesse o admin panel em /products
   2. Clique em "Ativar IA"
   3. Clique em "Republicar Agora"
   4. Verifique os agendamentos em /scheduled-posts
```

---

### 3. Testar no Admin Panel

#### 3.1. Acessar Página de Produtos

1. Abra o navegador
2. Acesse: `http://localhost:5173/products`
3. Faça login como admin

**Resultado esperado**: 
- ✅ Página carrega normalmente
- ✅ Botão "Ativar IA" visível no canto superior direito

---

#### 3.2. Ativar Republicação Automática

1. Clique no botão **"Ativar IA"**

**Resultado esperado**:
- ✅ Botão muda para **"IA Ativa"** (cor roxa)
- ✅ Botão **"Republicar Agora"** aparece ao lado
- ✅ Card informativo aparece abaixo do cabeçalho
- ✅ Toast de sucesso: "Republicação Automática Ativada! 🤖"

**Screenshot esperado**:
```
┌──────────────────────────────────────────────┐
│ Produtos                                      │
│ Gerencie produtos (150)                       │
│                                               │
│ [IA Ativa 🧠] [Republicar Agora ⚡]          │
│ [Novo Produto]                                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🧠 Republicação Automática com IA Ativada    │
│                                               │
│ A IA está analisando produtos aprovados...   │
│                                               │
│ ⚡ Prioriza melhores ofertas                 │
│ 📅 Distribui ao longo de 7 dias              │
│ 🧠 Evita repetições                          │
└──────────────────────────────────────────────┘
```

---

#### 3.3. Executar Republicação

1. Clique no botão **"Republicar Agora"**

**Resultado esperado**:
- ✅ Botão mostra "Analisando..." com spinner
- ✅ Aguarda 3-10 segundos (IA processando)
- ✅ Toast de sucesso aparece:
  ```
  ✅ Republicação Automática Concluída! 🎉
  15 produtos agendados para republicação
  ```

**Logs do backend esperados**:
```
🤖 Iniciando análise de produtos para republicação automática...
📊 Encontrados 25 produtos aprovados
🤖 Solicitando estratégia de republicação à IA...
✅ Estratégia criada: 15 produtos agendados
📝 Resumo: Distribuição inteligente em 3 dias priorizando ofertas
✅ Produto "iPhone 14 Pro" agendado para 2024-01-16 10:00 (high)
✅ Produto "Galaxy S23" agendado para 2024-01-16 12:00 (high)
...
✅ Republicação automática concluída: 15 produtos agendados
```

---

#### 3.4. Verificar Agendamentos

1. Acesse: `http://localhost:5173/scheduled-posts`

**Resultado esperado**:
- ✅ Lista de agendamentos aparece
- ✅ 15 produtos agendados (ou o número informado)
- ✅ Cada agendamento mostra:
  - Nome do produto
  - Data e hora futura
  - Status: "Pendente"
  - Plataforma

**Screenshot esperado**:
```
┌────────────────────────────────────────────────┐
│ Agendamentos IA                                │
│ Fila de publicações inteligentes (15)          │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Produto              │ Data/Hora  │ Status     │
├────────────────────────────────────────────────┤
│ iPhone 14 Pro 60%OFF │ 16/01 10:00│ Pendente   │
│ Galaxy S23 50%OFF    │ 16/01 12:00│ Pendente   │
│ Notebook Dell 40%OFF │ 16/01 14:00│ Pendente   │
│ Mouse Gamer 30%OFF   │ 16/01 16:00│ Pendente   │
│ Teclado RGB 25%OFF   │ 16/01 19:00│ Pendente   │
│ ...                  │ ...        │ ...        │
└────────────────────────────────────────────────┘
```

---

### 4. Testar Desativação

1. Volte para `/products`
2. Clique no botão **"IA Ativa"**

**Resultado esperado**:
- ✅ Botão volta para **"Ativar IA"** (outline)
- ✅ Botão **"Republicar Agora"** desaparece
- ✅ Card informativo desaparece
- ✅ Toast: "Republicação Automática Desativada"

---

## 🔍 Testes de API (Opcional)

### Teste 1: Verificar Status

```bash
curl -X GET http://localhost:3000/api/auto-republish/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

**Resposta esperada**:
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

---

### Teste 2: Ativar/Desativar

```bash
curl -X POST http://localhost:3000/api/auto-republish/toggle \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

**Resposta esperada**:
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

---

### Teste 3: Executar Republicação

```bash
curl -X POST http://localhost:3000/api/auto-republish/run \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

**Resposta esperada**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "scheduled": 15,
    "message": "15 produtos agendados para republicação",
    "strategy": {
      "summary": "Distribuição inteligente em 3 dias priorizando ofertas"
    }
  }
}
```

---

## ❌ Testes de Erro

### Erro 1: Sem Produtos Aprovados

**Cenário**: Nenhum produto com status "approved"

**Resultado esperado**:
```json
{
  "success": true,
  "scheduled": 0,
  "message": "Nenhum produto para republicar"
}
```

---

### Erro 2: IA Desativada

**Cenário**: Tentar executar com `enabled: false`

**Resultado esperado**:
```json
{
  "success": false,
  "message": "Serviço desativado"
}
```

---

### Erro 3: OpenRouter Falha

**Cenário**: API Key inválida ou erro na IA

**Resultado esperado**:
- ⚠️ Sistema usa estratégia de fallback
- ✅ Produtos são agendados mesmo assim
- 📝 Log: "Usando estratégia de fallback (sem IA)"

---

## 📊 Checklist Final

Marque cada item após testar:

- [ ] Migração do banco executada
- [ ] Script de teste executado com sucesso
- [ ] Botão "Ativar IA" funciona
- [ ] Botão "Republicar Agora" aparece quando ativo
- [ ] Card informativo aparece quando ativo
- [ ] Republicação executa e agenda produtos
- [ ] Produtos aparecem em `/scheduled-posts`
- [ ] Desativação funciona corretamente
- [ ] Logs do backend estão corretos
- [ ] Toasts aparecem corretamente

---

## 🐛 Problemas Comuns

### Problema: "Nenhum produto para republicar"

**Solução**:
1. Vá em `/products`
2. Filtre por "Pendentes"
3. Aprove alguns produtos
4. Tente novamente

---

### Problema: "Erro ao executar republicação"

**Solução**:
1. Verifique logs do backend
2. Execute: `node backend/scripts/test-auto-republish.js`
3. Confirme OpenRouter configurado
4. Sistema usará fallback se IA falhar

---

### Problema: Botões não aparecem

**Solução**:
1. Limpe cache do navegador
2. Recarregue a página (Ctrl+F5)
3. Verifique console do navegador para erros
4. Confirme que está logado como admin

---

### Problema: Agendamentos não publicam

**Solução**:
1. Verifique: `GET /api/scheduled-posts/debug`
2. Confirme `ENABLE_CRON_JOBS=true`
3. Inicie cron: `POST /api/scheduled-posts/cron/start`

---

## ✅ Teste Concluído!

Se todos os itens do checklist estão marcados, a funcionalidade está **100% funcional**! 🎉

A republicação automática com IA está pronta para uso em produção.

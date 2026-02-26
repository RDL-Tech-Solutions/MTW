# 🐛 Problema: Produtos Salvos pelos Bots Não Aparecem no App

## 📋 Descrição do Problema

Quando produtos são salvos pelos bots (Telegram tradicional e WhatsApp Web) usando a opção "Manter Pendente" ou apenas salvando sem publicar, eles NÃO aparecem no app mobile.

## 🔍 Causa Raiz

### Status dos Produtos

O modelo `Product.js` define 4 status válidos:
- `pending` - Produto capturado mas aguardando aprovação
- `approved` - Produto aprovado e aparece no app
- `published` - Produto publicado nos canais
- `rejected` - Produto rejeitado

### Filtro do App

Na linha 248 de `backend/src/models/Product.js`, a query `findAll()` filtra apenas:

```javascript
.in('status', ['approved', 'created', 'published'])
```

### Comportamento dos Bots

**Bot Telegram (`captureHandler.js` linha 88):**
```javascript
status: 'pending'
```

**Bot WhatsApp (`whatsappCaptureHandler.js` linha 83):**
```javascript
status: 'pending'
```

**Quando usuário escolhe "Manter Pendente":**
- Produto fica com `status: 'pending'`
- NÃO aparece no app (filtrado pela query)

## ✅ Soluções

### Solução 1: Adicionar 'pending' ao Filtro do App (Não Recomendado)

Modificar `backend/src/models/Product.js` linha 248:

```javascript
.in('status', ['pending', 'approved', 'created', 'published'])
```

**Problema:** Produtos não aprovados apareceriam no app.

### Solução 2: Mudar Status ao Salvar (Recomendado)

Quando o usuário escolhe "Manter Pendente", mudar o status para `'created'` em vez de `'pending'`.

**Vantagens:**
- Produto aparece no app
- Não foi publicado nos canais
- Mantém controle de aprovação

### Solução 3: Criar Novo Status 'saved'

Adicionar novo status `'saved'` e incluir no filtro do app.

## 🔧 Implementação da Solução 2 (Recomendada)

### 1. Bot Telegram

Modificar `backend/src/services/adminBot/handlers/captureHandler.js`:

```javascript
// Linha 88 - Mudar de 'pending' para 'created'
status: 'created',  // Aparece no app mas não foi publicado
```

### 2. Bot WhatsApp

Modificar `backend/src/services/whatsappWeb/handlers/whatsappCaptureHandler.js`:

```javascript
// Linha 83 - Mudar de 'pending' para 'created'
status: 'created',  // Aparece no app mas não foi publicado

// Linha 132 - Mudar de 'pending' para 'created'
status: 'created',  // Aparece no app mas não foi publicado
```

### 3. Atualizar Lógica de "Manter Pendente"

Quando usuário escolhe opção "0️⃣ Manter Pendente", o produto já está salvo com `status: 'created'`, então ele aparecerá no app.

## 📊 Comparação de Status

| Status | Aparece no App? | Publicado nos Canais? | Uso |
|--------|----------------|----------------------|-----|
| `pending` | ❌ Não | ❌ Não | Aguardando aprovação manual |
| `created` | ✅ Sim | ❌ Não | Salvo mas não publicado |
| `approved` | ✅ Sim | ❌ Não | Aprovado mas não publicado |
| `published` | ✅ Sim | ✅ Sim | Publicado nos canais |
| `rejected` | ❌ Não | ❌ Não | Rejeitado |

## 🎯 Fluxo Correto

### Cenário 1: Salvar e Manter no App (Sem Publicar)
1. Bot captura produto
2. Salva com `status: 'created'`
3. ✅ Produto aparece no app
4. ❌ Produto NÃO é publicado nos canais

### Cenário 2: Publicar Agora
1. Bot captura produto
2. Salva com `status: 'created'`
3. Usuário escolhe "Publicar Agora"
4. Status muda para `'published'`
5. ✅ Produto aparece no app
6. ✅ Produto é publicado nos canais

### Cenário 3: Agendar com IA
1. Bot captura produto
2. Salva com `status: 'created'`
3. Usuário escolhe "Agendar (IA)"
4. Status muda para `'approved'`
5. ✅ Produto aparece no app
6. ⏰ Produto será publicado no horário agendado

## 🔍 Verificação

### Antes da Correção:
```sql
-- Produtos salvos mas não aparecem no app
SELECT id, name, status, created_at 
FROM products 
WHERE status = 'pending' 
  AND capture_source IN ('admin_bot', 'whatsapp_admin')
ORDER BY created_at DESC;
```

### Depois da Correção:
```sql
-- Produtos salvos e aparecem no app
SELECT id, name, status, created_at 
FROM products 
WHERE status = 'created' 
  AND capture_source IN ('admin_bot', 'whatsapp_admin')
ORDER BY created_at DESC;
```

## 📝 Resumo

**Problema:** Produtos com `status: 'pending'` não aparecem no app

**Causa:** Query do app filtra apenas `['approved', 'created', 'published']`

**Solução:** Mudar status inicial de `'pending'` para `'created'` nos bots

**Resultado:** Produtos salvos aparecem no app mesmo sem publicar nos canais

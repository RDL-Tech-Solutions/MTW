# 🔄 Sistema de Retry Automático para Supabase

## 📋 Visão Geral

Sistema implementado para lidar automaticamente com erros temporários do Supabase, como:
- **502 Bad Gateway** (servidor temporariamente indisponível)
- **503 Service Unavailable**
- **504 Gateway Timeout**
- Erros de rede (ECONNRESET, ETIMEDOUT, etc.)

---

## 🎯 Problema Resolvido

### Erro Original
```
Error: <!DOCTYPE html>
<title> | 502: Bad gateway</title>
Host: mipzxjahexlqddhocllo.supabase.co
Error
```

### Causa
O Supabase ocasionalmente retorna erro 502 quando:
- Servidor está sob alta carga
- Manutenção temporária
- Problemas de rede transitórios
- Cloudflare (CDN) está reiniciando conexões

---

## 🛠️ Solução Implementada

### 1. Wrapper de Retry (`supabaseRetry.js`)

Funções criadas:
- `withRetry()` - Wrapper genérico para qualquer operação
- `selectWithRetry()` - Para operações SELECT
- `insertWithRetry()` - Para operações INSERT
- `updateWithRetry()` - Para operações UPDATE
- `deleteWithRetry()` - Para operações DELETE
- `rpcWithRetry()` - Para chamadas RPC

---

## ⚙️ Configuração Padrão

```javascript
{
  maxAttempts: 3,              // Máximo de 3 tentativas
  baseDelay: 1000,             // Delay inicial de 1 segundo
  maxDelay: 10000,             // Delay máximo de 10 segundos
  backoffMultiplier: 2,        // Exponential backoff (2x a cada tentativa)
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'Bad gateway',
    '502', '503', '504',
    'Network error',
    'fetch failed'
  ]
}
```

---

## 📊 Estratégia de Retry

### Exponential Backoff com Jitter

**Tentativa 1**: Falha → Aguarda ~1 segundo  
**Tentativa 2**: Falha → Aguarda ~2 segundos  
**Tentativa 3**: Falha → Lança erro

**Jitter**: Adiciona variação aleatória de ±30% para evitar "thundering herd"

### Exemplo de Delays
```
Tentativa 1: 1000ms + jitter (700-1300ms)
Tentativa 2: 2000ms + jitter (1400-2600ms)
Tentativa 3: 4000ms + jitter (2800-5200ms)
```

---

## 💻 Como Usar

### Uso Básico

```javascript
import { withRetry } from '../utils/supabaseRetry.js';

// Operação simples
const result = await withRetry(
  () => Product.findById(productId),
  { operationName: 'Buscar produto' }
);
```

### Operações do Supabase

```javascript
import { selectWithRetry, updateWithRetry } from '../utils/supabaseRetry.js';

// SELECT
const { data, error } = await selectWithRetry(
  supabase.from('products').select('*').eq('id', productId),
  'Buscar produto por ID'
);

// UPDATE
const { data, error } = await updateWithRetry(
  supabase.from('products').update({ price: 99.90 }).eq('id', productId),
  'Atualizar preço do produto'
);
```

### Configuração Customizada

```javascript
await withRetry(
  () => Product.findAll(),
  {
    operationName: 'Buscar todos os produtos',
    maxAttempts: 5,        // Mais tentativas
    baseDelay: 2000,       // Delay maior
    maxDelay: 30000        // Timeout maior
  }
);
```

---

## 📝 Logs Gerados

### Sucesso após Retry
```
⚠️ Buscar produto falhou (tentativa 1/3): Bad gateway. Tentando novamente em 1200ms...
✅ Buscar produto bem-sucedida na tentativa 2
```

### Erro Não-Retryable
```
❌ Buscar produto falhou com erro não-retryable: Invalid UUID format
```

### Falha após Todas as Tentativas
```
⚠️ Buscar produto falhou (tentativa 1/3): Bad gateway. Tentando novamente em 1200ms...
⚠️ Buscar produto falhou (tentativa 2/3): Bad gateway. Tentando novamente em 2400ms...
❌ Buscar produto falhou após 3 tentativas: Bad gateway
```

---

## 🔧 Arquivos Modificados

### 1. `backend/src/utils/supabaseRetry.js` (NOVO)
Sistema completo de retry com exponential backoff

### 2. `backend/src/config/database.js`
Adicionado timeout de 30 segundos nas requisições

### 3. `backend/src/services/cron/updatePrices.js`
Implementado retry em todas as operações do banco

---

## 🎯 Erros Retryable vs Não-Retryable

### ✅ Retryable (Tenta novamente)
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout
- ECONNRESET (Conexão resetada)
- ETIMEDOUT (Timeout)
- ENOTFOUND (DNS não encontrado)
- Network error
- fetch failed

### ❌ Não-Retryable (Falha imediatamente)
- 400 Bad Request (dados inválidos)
- 401 Unauthorized (não autenticado)
- 403 Forbidden (sem permissão)
- 404 Not Found (recurso não existe)
- 409 Conflict (conflito de dados)
- 422 Unprocessable Entity (validação falhou)
- Erros de validação
- Erros de constraint do banco

---

## 📈 Benefícios

### 1. Resiliência
- Sistema continua funcionando mesmo com falhas temporárias
- Reduz impacto de instabilidades do Supabase

### 2. Experiência do Usuário
- Menos erros visíveis para o usuário
- Operações completam com sucesso na maioria dos casos

### 3. Logs Informativos
- Visibilidade clara de quando retries acontecem
- Facilita debugging e monitoramento

### 4. Configurável
- Fácil ajustar número de tentativas
- Delays customizáveis por operação
- Pode adicionar novos tipos de erros retryable

---

## 🚀 Próximos Passos

### Implementar em Outros Serviços

```javascript
// Product Model
import { selectWithRetry, updateWithRetry } from '../utils/supabaseRetry.js';

static async findById(id) {
  const { data, error } = await selectWithRetry(
    supabase.from('products').select('*').eq('id', id).single(),
    `Buscar produto ${id}`
  );
  
  if (error) throw error;
  return data;
}

static async update(id, updates) {
  const { data, error } = await updateWithRetry(
    supabase.from('products').update(updates).eq('id', id).select().single(),
    `Atualizar produto ${id}`
  );
  
  if (error) throw error;
  return data;
}
```

### Adicionar Métricas

```javascript
// Contador de retries
let retryCount = 0;
let successAfterRetry = 0;

// No withRetry
if (attempt > 1) {
  retryCount++;
  if (success) successAfterRetry++;
}

// Endpoint de métricas
app.get('/metrics/retry', (req, res) => {
  res.json({
    totalRetries: retryCount,
    successAfterRetry: successAfterRetry,
    retrySuccessRate: (successAfterRetry / retryCount * 100).toFixed(2) + '%'
  });
});
```

### Circuit Breaker

```javascript
// Parar de tentar se muitos erros consecutivos
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## 📊 Monitoramento

### Verificar Logs
```bash
# Ver logs do PM2
pm2 logs backend

# Filtrar por retry
pm2 logs backend | grep "tentativa"

# Ver apenas erros
pm2 logs backend --err
```

### Estatísticas
```bash
# Contar retries bem-sucedidos
pm2 logs backend | grep "bem-sucedida na tentativa" | wc -l

# Contar falhas após todas as tentativas
pm2 logs backend | grep "falhou após" | wc -l
```

---

## ✅ Checklist de Implementação

- [x] Criar `supabaseRetry.js` com funções de retry
- [x] Adicionar timeout no cliente Supabase
- [x] Implementar retry em `updatePrices.js`
- [ ] Implementar retry em todos os Models
- [ ] Implementar retry em todos os Controllers
- [ ] Adicionar métricas de retry
- [ ] Implementar Circuit Breaker
- [ ] Criar dashboard de monitoramento
- [ ] Adicionar alertas para muitos retries

---

## 🎉 Resultado

O sistema agora é muito mais resiliente a falhas temporárias do Supabase. Erros 502 são automaticamente tratados com retry, garantindo que operações críticas sejam completadas com sucesso.

---

**Data**: 27 de Fevereiro de 2026  
**Status**: ✅ IMPLEMENTADO  
**Versão**: 1.0

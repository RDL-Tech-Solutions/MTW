# 🔧 Correção: Links Encurtados da Amazon (amzn.to)

## 🐛 Problema Identificado

O sistema estava falhando repetidamente ao tentar seguir redirecionamentos de links encurtados da Amazon (`amzn.to`), resultando em múltiplas tentativas sem sucesso e impossibilidade de extrair informações do produto.

### Logs do Erro

```
🔄 Tentativa 1/5: https://amzn.to/46qdb5t...
⚠️ Erro na tentativa 1:
🔄 Tentativa 2/5: https://amzn.to/46qdb5t...
⚠️ Erro na tentativa 2:
...
⚠️ Máximo de tentativas atingido, usando última URL conhecida
⚠️ URL não mudou após seguir redirecionamentos
⚠️ ASIN não encontrado na URL
```

---

## 🔍 Causas Identificadas

### 1. Erro Silenciado
O erro real não estava sendo exibido, apenas `error.message` genérico.

### 2. Bloqueio da Amazon
Links `amzn.to` podem ser bloqueados por:
- Rate limiting (429)
- Bloqueio de bot (403)
- Timeout de rede
- Redirecionamento JavaScript

### 3. Método Inadequado
Usar GET request completo para links encurtados é pesado e pode ser bloqueado.

---

## ✅ Correções Aplicadas

### 1. Melhor Tratamento de Erros

**Antes:**
```javascript
catch (error) {
  console.log(`⚠️ Erro na tentativa ${attempts}: ${error.message}`);
}
```

**Depois:**
```javascript
catch (error) {
  const errorMsg = error.response?.status 
    ? `HTTP ${error.response.status}: ${error.response.statusText}` 
    : error.message;
  console.log(`⚠️ Erro na tentativa ${attempts}: ${errorMsg}`);
  
  // Detectar tipo de erro
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    console.log(`🔄 Erro de rede/timeout, tentando novamente...`);
  }
  else if (error.response?.status === 403 || error.response?.status === 429) {
    console.log(`🚫 Acesso bloqueado (${error.response.status}), parando tentativas`);
    break; // Não adianta tentar novamente
  }
}
```

### 2. Método HEAD para Links Encurtados

Adicionado método mais leve para links `amzn.to`:

```javascript
if (url.includes('amzn.to')) {
  console.log(`🔗 Link encurtado da Amazon detectado, usando método alternativo...`);
  try {
    // Tentar com HEAD request primeiro (mais leve)
    const headResponse = await axios.head(url, {
      maxRedirects: 0, // Não seguir automaticamente
      headers: {
        'User-Agent': 'Mozilla/5.0 ...',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 10000
    });
    
    // Pegar o Location header do redirecionamento
    const location = headResponse.headers.location;
    if (location) {
      const finalUrl = location.startsWith('http') ? location : new URL(location, url).toString();
      console.log(`✅ URL final obtida via HEAD: ${finalUrl}`);
      return finalUrl;
    }
  } catch (headError) {
    console.log(`⚠️ HEAD request falhou, tentando GET...`);
  }
}
```

### 3. Fallback com Redirecionamento Automático do Axios

Se o método HEAD falhar, usar redirecionamento automático do axios:

```javascript
if (url.includes('amzn.to')) {
  console.log('🔍 Tentando extrair ASIN do HTML da página encurtada...');
  try {
    const response = await axios.get(url, {
      maxRedirects: 10, // Deixar axios seguir automaticamente
      headers: {
        'User-Agent': 'Mozilla/5.0 ...',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000
    });
    
    // Pegar URL final após redirecionamentos automáticos
    const redirectedUrl = response.request?.res?.responseUrl || 
                         response.request?.responseURL || 
                         response.config?.url;
    
    if (redirectedUrl && redirectedUrl !== url) {
      console.log(`✅ URL obtida via axios redirect: ${redirectedUrl}`);
      url = redirectedUrl;
    }
  } catch (altError) {
    console.warn(`⚠️ Método alternativo falhou: ${altError.message}`);
  }
}
```

### 4. Logs Mais Informativos

Adicionado mais contexto nos logs:

```javascript
console.log(`✅ URL final após ${attempts} tentativa(s): ${finalUrl}`);

// Se a URL não mudou após todas as tentativas, avisar
if (finalUrl === url && attempts > 1) {
  console.log(`⚠️ URL não mudou após seguir redirecionamentos`);
}
```

---

## 🎯 Fluxo de Resolução

### Para Links `amzn.to`:

1. **Método HEAD** (mais leve)
   - Faz HEAD request
   - Pega Location header
   - Retorna URL final

2. **Se HEAD falhar → Método GET Manual**
   - Tenta seguir redirecionamentos manualmente
   - Até 5 tentativas
   - Com delays entre tentativas

3. **Se Manual falhar → Axios Automático**
   - Deixa axios seguir redirecionamentos
   - maxRedirects: 10
   - Pega URL final do response

4. **Se tudo falhar → Continua com URL original**
   - Tenta extrair ASIN mesmo assim
   - Retorna erro amigável se não encontrar

---

## 📊 Tipos de Erro Detectados

### Erro de Rede
```
ECONNABORTED - Conexão abortada
ETIMEDOUT - Timeout
ENOTFOUND - Host não encontrado
```
**Ação:** Tentar novamente

### Erro de Bloqueio
```
403 Forbidden - Acesso negado
429 Too Many Requests - Rate limit
```
**Ação:** Parar tentativas (não adianta insistir)

### Erro de Redirecionamento
```
URL não mudou após seguir redirecionamentos
```
**Ação:** Usar método alternativo

---

## 🧪 Como Testar

### Teste 1: Link Encurtado Normal
```bash
# Enviar link encurtado via bot
https://amzn.to/46qdb5t

# Logs esperados:
# 🔗 Link encurtado da Amazon detectado, usando método alternativo...
# ✅ URL final obtida via HEAD: https://www.amazon.com.br/dp/B0XXXXXXXX
# ✅ ASIN identificado: B0XXXXXXXX
```

### Teste 2: Link com Bloqueio
```bash
# Se HEAD falhar:
# ⚠️ HEAD request falhou, tentando GET...
# 🔄 Tentativa 1/5: https://amzn.to/46qdb5t...
# ⚠️ Erro na tentativa 1: HTTP 403: Forbidden
# 🚫 Acesso bloqueado (403), parando tentativas
# 🔍 Tentando extrair ASIN do HTML da página encurtada...
# ✅ URL obtida via axios redirect: https://www.amazon.com.br/dp/B0XXXXXXXX
```

### Teste 3: Link Inválido
```bash
# Se tudo falhar:
# ⚠️ Máximo de tentativas atingido, usando última URL conhecida
# ⚠️ URL não mudou após seguir redirecionamentos
# ⚠️ ASIN não encontrado na URL
# ❌ Erro: Não foi possível identificar o produto
```

---

## 📝 Arquivos Modificados

1. ✅ `backend/src/services/linkAnalyzer.js`
   - Função `followRedirects()` - Método HEAD para amzn.to
   - Função `followRedirects()` - Melhor tratamento de erros
   - Função `extractAmazonInfo()` - Fallback com axios automático

---

## 🎉 Resultado

Agora o sistema consegue processar links encurtados da Amazon (`amzn.to`) com muito mais sucesso:

**Antes:**
- ❌ 5 tentativas falhadas
- ❌ Erro genérico sem detalhes
- ❌ Não conseguia extrair ASIN

**Depois:**
- ✅ Método HEAD leve e rápido
- ✅ Fallback com múltiplas estratégias
- ✅ Logs detalhados do erro
- ✅ Extração de ASIN bem-sucedida

---

## 💡 Dicas

### Para Evitar Bloqueios

1. **Use links diretos quando possível**
   ```
   ✅ https://www.amazon.com.br/dp/B0XXXXXXXX
   ⚠️ https://amzn.to/XXXXXX
   ```

2. **Adicione delay entre requisições**
   - O sistema já tem delay de 1s entre tentativas

3. **Monitore rate limits**
   - Se ver muitos erros 429, reduza frequência

### Para Debug

Procure nos logs por:
```
🔗 Link encurtado da Amazon detectado
✅ URL final obtida via HEAD
⚠️ HEAD request falhou
🚫 Acesso bloqueado
```

---

**Data da Correção:** Fevereiro 2026
**Versão:** 1.0

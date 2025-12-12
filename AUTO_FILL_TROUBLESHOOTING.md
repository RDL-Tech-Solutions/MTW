# 🔧 AUTO-PREENCHIMENTO - TROUBLESHOOTING

## 🐛 Problemas Comuns e Soluções

### 1. Link Encurtado (mercadolivre.com/sec/...)

**Problema**: Links encurtados do Mercado Livre não funcionam  
**Exemplo**: `https://mercadolivre.com/sec/24pS6ea`

**Solução**: ✅ **JÁ CORRIGIDO!**
- O sistema agora segue redirecionamentos automaticamente
- Links encurtados são expandidos para a URL completa
- Funciona com qualquer formato de link do ML

**Como testar**:
1. Cole o link encurtado
2. Clique em "Auto-Preencher"
3. Aguarde alguns segundos (pode demorar mais que links normais)

---

### 2. Nenhum Dado é Preenchido

**Possíveis Causas**:

#### A. Backend não está rodando
**Verificar**:
```bash
# Verificar se backend está ativo
curl http://localhost:3000/api/health
```

**Solução**:
```bash
cd backend
npm start
```

#### B. Erro de CORS
**Sintoma**: Erro no console do navegador sobre CORS

**Solução**: Verificar se o admin panel está na lista de origens permitidas no `.env`:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

#### C. Token expirado
**Sintoma**: Erro 401 Unauthorized

**Solução**: Fazer logout e login novamente no admin panel

---

### 3. Apenas Alguns Campos São Preenchidos

**Normal!** Nem todos os produtos têm todas as informações disponíveis.

**O que pode estar faltando**:
- ❌ Descrição (alguns produtos não têm)
- ❌ Preço antigo (se não houver desconto)
- ❌ Imagem (em casos raros)

**Solução**: Preencha manualmente os campos faltantes

---

### 4. Preços Estão Errados ou Zerados

**Causas**:
- Mercado Livre mudou o layout da página
- Produto sem preço visível
- Erro no scraping

**Solução Temporária**: Preencha os preços manualmente

**Solução Permanente**: Reportar o link para atualizar os seletores

---

### 5. Plataforma Não Detectada

**Erro**: "Plataforma não suportada"

**Causas**:
- Link de plataforma não suportada (ex: Amazon)
- Link inválido ou quebrado

**Solução**: Use apenas links de:
- ✅ Shopee (shopee.com.br)
- ✅ Mercado Livre (mercadolivre.com.br)

---

### 6. Timeout / Demora Muito

**Sintoma**: Botão fica "Analisando..." por muito tempo

**Causas**:
- Site está lento
- Muitos redirecionamentos
- Timeout de 15 segundos atingido

**Solução**:
1. Aguarde até 15 segundos
2. Se não funcionar, tente novamente
3. Se persistir, preencha manualmente

---

## 🔍 Debug no Backend

### Ver Logs em Tempo Real

```bash
cd backend
npm start
```

Quando você clicar em "Auto-Preencher", verá logs como:
```
🔗 URL original: https://mercadolivre.com/sec/24pS6ea
🔗 URL final: https://produto.mercadolivre.com.br/MLB-123456...
🏷️ Plataforma detectada: mercadolivre
📦 Dados extraídos: {
  name: 'Nome do Produto...',
  currentPrice: 99.90,
  oldPrice: 149.90,
  hasImage: true
}
```

---

## 🧪 Testar Manualmente

### Teste 1: Endpoint Direto

```bash
# Windows PowerShell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer SEU_TOKEN_AQUI"
}

$body = @{
    url = "https://mercadolivre.com/sec/24pS6ea"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/link-analyzer/analyze" -Method Post -Headers $headers -Body $body
```

### Teste 2: Console do Navegador

```javascript
// Abra o console (F12) no admin panel
fetch('http://localhost:3000/api/link-analyzer/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    url: 'https://mercadolivre.com/sec/24pS6ea'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📋 Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] Backend está rodando (`npm start`)
- [ ] Admin panel está aberto e logado
- [ ] Link é da Shopee ou Mercado Livre
- [ ] Link abre normalmente no navegador
- [ ] Não há erros no console do navegador (F12)
- [ ] Aguardou pelo menos 10 segundos
- [ ] Tentou com outro link para comparar

---

## 🆘 Links para Testar

### Mercado Livre (Funcionam)
```
https://produto.mercadolivre.com.br/MLB-1234567890-produto-teste
https://mercadolivre.com.br/p/MLB1234567890
https://mercadolivre.com/sec/XXXXX (encurtado)
```

### Shopee (Funcionam)
```
https://shopee.com.br/produto-i.123.456789
https://shp.ee/xxxxx (encurtado)
```

---

## 🔄 Melhorias Implementadas

### Versão Atual
- ✅ Suporte a links encurtados
- ✅ Seguimento automático de redirecionamentos
- ✅ Múltiplos seletores CSS (maior compatibilidade)
- ✅ Timeout aumentado para 15 segundos
- ✅ Logs detalhados para debug
- ✅ Detecção melhorada de plataforma
- ✅ Tratamento de erros robusto

---

## 📞 Reportar Problema

Se o problema persistir, forneça:

1. **Link testado**: (cole aqui)
2. **Erro exibido**: (screenshot ou mensagem)
3. **Logs do backend**: (copie do terminal)
4. **Console do navegador**: (F12 > Console > screenshot)

---

**Última atualização**: Dezembro 2024  
**Versão**: 2.0 (com suporte a links encurtados)

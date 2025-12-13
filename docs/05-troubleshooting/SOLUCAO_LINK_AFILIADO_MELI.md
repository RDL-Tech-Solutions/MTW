# 🔧 Solução: Link de Afiliado do Mercado Livre não está sendo aplicado

## 🔍 Problema Identificado

A captura automática de produtos do Mercado Livre não estava aplicando o código de afiliado nos links dos produtos capturados.

### Causa

O método `generateMeliAffiliateLink` no arquivo `meliSync.js` estava tentando obter o link de afiliado apenas via API autenticada, mas não estava usando a variável de ambiente `MELI_AFFILIATE_CODE` para gerar o link de afiliado manualmente.

## ✅ Solução Implementada

### O que foi corrigido:

1. **Priorização do código de afiliado**: Agora o sistema verifica primeiro se `MELI_AFFILIATE_CODE` está configurado
2. **Geração manual do link**: Se o código estiver configurado, gera o link no formato correto do ML
3. **Fallback inteligente**: Se não tiver código, tenta via API autenticada, e se não tiver autenticação, usa o link original

### Formato do Link de Afiliado

O link de afiliado do Mercado Livre segue este formato:

```
https://mercadolivre.com/jm/mlb?&meuid={SEU_CODIGO}&redirect={URL_ENCODADA}
```

## ⚙️ Como Configurar

### Passo 1: Obter Código de Afiliado

1. Acesse o [Programa de Afiliados do Mercado Livre](https://www.mercadolivre.com.br/afiliados)
2. Faça login com sua conta
3. Obtenha seu **Código de Afiliado** (meuid)
   - Exemplo: `RDLTECH` ou `123456789`

### Passo 2: Configurar no Backend

1. Abra o arquivo `backend/.env`
2. Adicione ou edite a linha:

```env
# Código de Afiliado do Mercado Livre
MELI_AFFILIATE_CODE=SEU_CODIGO_AQUI
```

**Exemplo:**
```env
MELI_AFFILIATE_CODE=RDLTECH
```

### Passo 3: Reiniciar Backend

```bash
cd backend
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🧪 Como Testar

### Teste 1: Verificar Configuração

1. Verifique se a variável está configurada:
   ```bash
   # No terminal do backend
   echo $MELI_AFFILIATE_CODE
   ```

2. Ou verifique no código:
   - O backend deve logar: `✅ Link de afiliado gerado para...`

### Teste 2: Capturar Produto de Teste

1. Aguarde a próxima sincronização automática, ou
2. Execute manualmente via API:
   ```bash
   curl -X POST http://localhost:3000/api/sync/run \
     -H "Authorization: Bearer SEU_TOKEN_ADMIN"
   ```

3. Verifique os logs do backend:
   ```bash
   tail -f backend/logs/app.log | grep "Link de afiliado"
   ```

### Teste 3: Verificar Produto no Banco

1. Acesse o Painel Admin
2. Vá em **Produtos**
3. Abra um produto capturado do Mercado Livre
4. Verifique o campo **"Link de Afiliado"**
5. O link deve estar no formato:
   ```
   https://mercadolivre.com/jm/mlb?&meuid=SEU_CODIGO&redirect=...
   ```

## 📊 Logs Esperados

### Quando o código está configurado:

```
✅ Link de afiliado gerado para mercadolivre-MLB123456789
```

### Quando não está configurado:

```
ℹ️ Usando link original (sem código de afiliado) para mercadolivre-MLB123456789
```

### Quando há erro:

```
⚠️ Erro ao gerar link de afiliado com código: [mensagem de erro]
```

## 🔍 Troubleshooting

### Problema: Link ainda não tem código de afiliado

**Solução:**
1. Verifique se `MELI_AFFILIATE_CODE` está no `.env`
2. Verifique se não há espaços extras no valor
3. Reinicie o backend após alterar o `.env`
4. Verifique os logs para ver qual caminho está sendo usado

### Problema: Link está quebrado

**Solução:**
1. Verifique se o código de afiliado está correto
2. Verifique se a URL original do produto é válida
3. Teste o link gerado manualmente no navegador

### Problema: Produtos antigos não foram atualizados

**Solução:**
Os produtos já salvos não serão atualizados automaticamente. Você pode:
1. Deletar produtos antigos e deixar a captura criar novos
2. Ou atualizar manualmente via Painel Admin

## 📝 Notas Importantes

1. **Produtos já capturados**: Produtos que já foram salvos antes da correção não terão o link de afiliado atualizado automaticamente. Apenas novos produtos capturados terão o link correto.

2. **Prioridade**: O sistema agora usa esta ordem:
   - 1º: `MELI_AFFILIATE_CODE` (se configurado)
   - 2º: API autenticada (se configurada)
   - 3º: Link original

3. **Formato do código**: O código de afiliado pode ser alfanumérico (ex: `RDLTECH`) ou apenas numérico (ex: `123456789`)

## ✅ Checklist de Verificação

- [ ] Código de afiliado obtido do programa de afiliados do ML
- [ ] `MELI_AFFILIATE_CODE` configurado no `.env`
- [ ] Backend reiniciado após alterar `.env`
- [ ] Logs mostram "✅ Link de afiliado gerado"
- [ ] Produto capturado tem link no formato correto
- [ ] Link funciona quando testado no navegador

---

**Data da correção**: 13/12/2024  
**Arquivo modificado**: `backend/src/services/autoSync/meliSync.js`  
**Método corrigido**: `generateMeliAffiliateLink()`


# ✅ SOLUÇÃO DEFINITIVA - Mercado Livre Token

## 🎯 O Problema

O Mercado Livre NÃO aceita:
- ❌ `http://localhost:3000/...`
- ❌ `https://localhost:3000/...`
- ❌ Qualquer URL com `localhost`

## ✅ A SOLUÇÃO

Use um domínio público válido. A opção mais simples:

### **URL de Redirect**: `https://www.google.com`

---

## 📋 PASSO A PASSO DEFINITIVO

### 1️⃣ Configurar Aplicação

1. Acesse: https://developers.mercadolivre.com.br
2. Clique em **"Minhas aplicações"**
3. Clique na aplicação **MTW Promo** (ou crie uma nova)
4. Em **"URLs de redirect"**, coloque:
   ```
   https://www.google.com
   ```
5. Clique em **"Salvar"**

✅ **Deve aceitar sem erros!**

---

### 2️⃣ Obter CODE

1. **Copie esta URL** e cole no navegador:

```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6916793910009014&redirect_uri=https://www.google.com
```

2. **Faça login** no Mercado Livre

3. **Clique em "Autorizar"**

4. Você será redirecionado para Google. A URL será algo como:
```
https://www.google.com/?code=TG-67584e4c4e4b5f00010c9c8e-1234567890
```

5. **COPIE O CODE** (tudo entre `code=` e o final ou até `&`)

Exemplo de CODE:
```
TG-67584e4c4e4b5f00010c9c8e-1234567890
```

⏰ **ATENÇÃO**: O CODE expira em 10 minutos! Seja rápido no próximo passo.

---

### 3️⃣ Trocar CODE por TOKEN

Abra o **PowerShell** e execute:

```powershell
# SUBSTITUA "SEU_CODE_AQUI" pelo code que você copiou!

$body = @{
    grant_type = "authorization_code"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    code = "SEU_CODE_AQUI"
    redirect_uri = "https://www.google.com"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ TOKENS OBTIDOS COM SUCESSO!"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
Write-Host "📋 COPIE ESTES VALORES PARA O .env:`n"
Write-Host "MELI_ACCESS_TOKEN=$($response.access_token)"
Write-Host "MELI_REFRESH_TOKEN=$($response.refresh_token)"
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "`nℹ️  Informações:"
Write-Host "   User ID: $($response.user_id)"
Write-Host "   Expira em: $($response.expires_in) segundos ($($response.expires_in / 3600) horas)"
Write-Host "`n"
```

---

### 4️⃣ Atualizar .env

Copie os tokens exibidos e cole em `backend/.env`:

```env
MELI_ACCESS_TOKEN=APP_USR-6916793910009014-121225-abc123def456...
MELI_REFRESH_TOKEN=TG-67584e4c4e4b5f00010c9c8e-1234567890
```

---

### 5️⃣ Testar

```bash
cd backend
node scripts/test-meli-token.js
```

**Resultado esperado**:
```
✅ Token válido!
👤 Dados do Usuário:
   ID: 1234567890
   Nickname: SEU_USUARIO
   ...
✅ TODOS OS TESTES PASSARAM!
```

---

## 🔄 Renovar Token (Após 6 horas)

Quando o token expirar:

```bash
node scripts/refresh-meli-token.js
```

Ou manualmente no PowerShell:

```powershell
$body = @{
    grant_type = "refresh_token"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    refresh_token = "SEU_REFRESH_TOKEN_AQUI"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "NOVO MELI_ACCESS_TOKEN=$($response.access_token)"
Write-Host "NOVO MELI_REFRESH_TOKEN=$($response.refresh_token)"
```

---

## 📝 Exemplo Completo

### URL que você vai colar no navegador:
```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6916793910009014&redirect_uri=https://www.google.com
```

### Depois de autorizar, a URL do Google será:
```
https://www.google.com/?code=TG-67584e4c4e4b5f00010c9c8e-1234567890
```

### CODE que você vai copiar:
```
TG-67584e4c4e4b5f00010c9c8e-1234567890
```

### Comando PowerShell (com o CODE):
```powershell
$body = @{
    grant_type = "authorization_code"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    code = "TG-67584e4c4e4b5f00010c9c8e-1234567890"
    redirect_uri = "https://www.google.com"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "MELI_ACCESS_TOKEN=$($response.access_token)"
Write-Host "MELI_REFRESH_TOKEN=$($response.refresh_token)"
```

---

## ⚠️ Erros Comuns

### "invalid_grant"
- **Causa**: CODE expirou (10 minutos)
- **Solução**: Volte ao passo 2 e gere um novo CODE

### "invalid_client"
- **Causa**: Client ID ou Secret errados
- **Solução**: Verifique as credenciais

### "redirect_uri_mismatch"
- **Causa**: Redirect URI diferente entre autorização e troca de token
- **Solução**: Use `https://www.google.com` em AMBOS os lugares

---

## 🎯 Checklist

- [ ] Configurei redirect URI como `https://www.google.com`
- [ ] Abri URL de autorização no navegador
- [ ] Autorizei a aplicação
- [ ] Copiei o CODE da URL do Google
- [ ] Executei comando PowerShell com o CODE
- [ ] Copiei os tokens para .env
- [ ] Testei com `test-meli-token.js`

---

**Agora vai funcionar! 🚀**

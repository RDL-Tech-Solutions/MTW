# 🔑 MERCADO LIVRE - Obter Token MANUALMENTE

## ⚡ Método Simples (SEM Scripts)

Como o Mercado Livre exige HTTPS, vamos fazer manualmente. É mais simples!

---

## 📋 Passo a Passo

### 1. Criar Aplicação

1. Acesse: https://developers.mercadolivre.com.br
2. Faça login
3. Clique em **"Criar aplicação"**
4. Preencha:
   - **Nome**: MTW Promo
   - **Descrição**: Plataforma de ofertas
   - **URL de redirecionamento**: `https://www.google.com`
   - **Tópicos**: Marketplace

5. Clique em **"Criar"**

⚠️ **Use `https://www.google.com` como redirect URI** (é mais fácil!)

---

### 2. Copiar Credenciais

Após criar, copie:
- **Client ID**: (já está no .env: `6916793910009014`)
- **Client Secret**: (já está no .env: `hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2`)

---

### 3. Gerar URL de Autorização

Copie esta URL e cole no navegador (substitua o CLIENT_ID se necessário):

```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6916793910009014&redirect_uri=https://www.google.com
```

---

### 4. Autorizar

1. Cole a URL no navegador
2. Faça login no Mercado Livre
3. Clique em **"Autorizar"**
4. Você será redirecionado para Google com um CODE na URL

Exemplo:
```
https://www.google.com/?code=TG-123456789abcdef-123456789
```

5. **COPIE O CODE** (tudo após `code=` até o final ou até `&`)

Exemplo: `TG-123456789abcdef-123456789`

---

### 5. Trocar CODE por TOKEN

Agora vamos trocar o CODE pelo ACCESS TOKEN.

#### Opção A: Usando PowerShell (Windows)

```powershell
$body = @{
    grant_type = "authorization_code"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    code = "SEU_CODE_AQUI"
    redirect_uri = "https://www.google.com"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "ACCESS_TOKEN:" $response.access_token
Write-Host "REFRESH_TOKEN:" $response.refresh_token
```

**Substitua `SEU_CODE_AQUI` pelo code que você copiou!**

#### Opção B: Usando cURL

```bash
curl -X POST \
  'https://api.mercadolibre.com/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code' \
  -d 'client_id=6916793910009014' \
  -d 'client_secret=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2' \
  -d 'code=SEU_CODE_AQUI' \
  -d 'redirect_uri=https://www.google.com'
```

#### Opção C: Usando Postman

1. Abra Postman
2. Crie uma requisição POST
3. URL: `https://api.mercadolibre.com/oauth/token`
4. Body (x-www-form-urlencoded):
   - `grant_type`: `authorization_code`
   - `client_id`: `6916793910009014`
   - `client_secret`: `hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2`
   - `code`: `SEU_CODE_AQUI`
   - `redirect_uri`: `https://www.google.com`
5. Clique em **Send**

---

### 6. Copiar Tokens

A resposta será algo como:

```json
{
  "access_token": "APP_USR-123456789-abcdef-ghijklmnop",
  "token_type": "Bearer",
  "expires_in": 21600,
  "scope": "offline_access read write",
  "user_id": 123456789,
  "refresh_token": "TG-987654321-fedcba-zyxwvutsrq"
}
```

**COPIE**:
- `access_token`
- `refresh_token`

---

### 7. Atualizar .env

Edite `backend/.env` e adicione:

```env
MELI_ACCESS_TOKEN=APP_USR-123456789-abcdef-ghijklmnop
MELI_REFRESH_TOKEN=TG-987654321-fedcba-zyxwvutsrq
```

---

### 8. Testar

```bash
cd backend
node scripts/test-meli-token.js
```

Deve mostrar:
```
✅ Token válido!
👤 Dados do Usuário:
   ID: 123456789
   Nickname: SEU_USUARIO
```

---

## ⏰ Renovar Token (Após 6 horas)

Quando o token expirar, use:

```bash
node scripts/refresh-meli-token.js
```

Ou manualmente:

```powershell
$body = @{
    grant_type = "refresh_token"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    refresh_token = "SEU_REFRESH_TOKEN"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "NOVO ACCESS_TOKEN:" $response.access_token
Write-Host "NOVO REFRESH_TOKEN:" $response.refresh_token
```

---

## 🎯 Resumo Rápido

```
1. Criar app no ML com redirect: https://www.google.com
2. Abrir URL de autorização no navegador
3. Copiar CODE da URL do Google
4. Trocar CODE por TOKEN (PowerShell/cURL/Postman)
5. Copiar access_token e refresh_token
6. Colar no .env
7. Testar com test-meli-token.js
```

---

## ⚠️ IMPORTANTE

- ⏰ **Access token expira em 6 horas**
- 🔄 **Use refresh_token para renovar**
- 🔒 **Nunca compartilhe seus tokens**
- ✅ **CODE expira em 10 minutos** (seja rápido no passo 5)

---

## 🐛 Troubleshooting

### "invalid_grant"
**Causa**: CODE expirou (10 minutos)  
**Solução**: Volte ao passo 3 e gere um novo CODE

### "invalid_client"
**Causa**: Client ID ou Secret errados  
**Solução**: Verifique as credenciais no portal

### CODE muito longo
**Dica**: Copie apenas até o primeiro `&` ou até o final se não houver `&`

---

**Método manual é mais simples que configurar HTTPS local!** ✨

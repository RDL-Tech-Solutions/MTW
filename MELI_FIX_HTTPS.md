# 🔧 CORREÇÃO: URL de Redirecionamento HTTPS

## ❌ Erro que Você Teve

```
O endereço deve conter https://
```

## ✅ Solução Rápida

### Opção 1: Usar Google como Redirect (MAIS FÁCIL)

Na configuração da aplicação do Mercado Livre:

**Antes (ERRADO)**:
```
http://localhost:3000/auth/meli/callback
```

**Agora (CORRETO)**:
```
https://www.google.com
```

**Por quê?**
- ✅ Google já tem HTTPS
- ✅ Não precisa configurar certificado local
- ✅ Funciona imediatamente
- ✅ Você copia o CODE da URL do Google

---

### Opção 2: Usar HTTPS no Localhost (AVANÇADO)

Se quiser usar localhost com HTTPS:

**URL de Redirect**:
```
https://localhost:3000/auth/meli/callback
```

**Mas você precisará**:
1. Gerar certificado SSL local
2. Configurar servidor HTTPS
3. Aceitar certificado auto-assinado no navegador

❌ **Muito complicado!** Use a Opção 1.

---

## 🚀 Passo a Passo CORRETO

### 1. Editar Aplicação no Mercado Livre

1. Acesse: https://developers.mercadolivre.com.br
2. Clique na sua aplicação **MTW Promo**
3. Edite a **URL de redirecionamento**
4. Mude para: `https://www.google.com`
5. Salve

### 2. Gerar TOKEN

Siga o guia: **MELI_TOKEN_MANUAL.md**

Resumo:
```
1. Abrir URL de autorização
2. Autorizar
3. Copiar CODE da URL do Google
4. Trocar CODE por TOKEN (PowerShell)
5. Colar tokens no .env
```

---

## 📝 URL de Autorização Correta

```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6916793910009014&redirect_uri=https://www.google.com
```

Copie e cole no navegador!

---

## 🎯 Depois de Autorizar

Você será redirecionado para:
```
https://www.google.com/?code=TG-123456789abcdef-123456789
```

**Copie o CODE** (tudo após `code=`)

---

## 💻 Trocar CODE por TOKEN (PowerShell)

```powershell
$body = @{
    grant_type = "authorization_code"
    client_id = "6916793910009014"
    client_secret = "hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2"
    code = "COLE_SEU_CODE_AQUI"
    redirect_uri = "https://www.google.com"
}

$response = Invoke-RestMethod -Uri "https://api.mercadolibre.com/oauth/token" -Method Post -Body $body

Write-Host "`n✅ TOKENS OBTIDOS!`n"
Write-Host "MELI_ACCESS_TOKEN=$($response.access_token)"
Write-Host "MELI_REFRESH_TOKEN=$($response.refresh_token)"
Write-Host "`nCopie e cole no backend/.env`n"
```

---

## 📋 Atualizar .env

Copie os tokens e cole em `backend/.env`:

```env
MELI_ACCESS_TOKEN=APP_USR-seu-token-aqui
MELI_REFRESH_TOKEN=TG-seu-refresh-token-aqui
```

---

## ✅ Testar

```bash
cd backend
node scripts/test-meli-token.js
```

---

## 🎉 Pronto!

Agora você tem os tokens do Mercado Livre configurados!

**Próximo passo**: Testar o auto-preenchimento no admin panel! 🚀

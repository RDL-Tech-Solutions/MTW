# 🔑 GUIA: Configurar Access Token do Mercado Livre

## 📋 Passo a Passo Completo

### 1. Criar Aplicação no Mercado Livre

#### 1.1 Acessar Portal de Desenvolvedores
1. Acesse: https://developers.mercadolivre.com.br
2. Faça login com sua conta Mercado Livre
3. Se não tiver conta, crie uma em: https://www.mercadolivre.com.br

#### 1.2 Criar Nova Aplicação
1. Clique em **"Minhas aplicações"** ou **"Criar aplicação"**
2. Preencha os dados:
   - **Nome**: MTW Promo
   - **Descrição**: Plataforma de agregação de ofertas
   - **URL de redirecionamento**: `https://localhost:3000/auth/meli/callback`
   - **Tópicos**: Marketplace

3. Aceite os termos e clique em **"Criar aplicação"**

⚠️ **IMPORTANTE**: Use `https://` (não `http://`)

#### 1.3 Obter Credenciais
Após criar, você verá:
- ✅ **Client ID**: `6916793910009014` (já está no .env)
- ✅ **Client Secret**: `hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2` (já está no .env)

---

### 2. Gerar Access Token

#### Opção A: Usando o Script Automático (RECOMENDADO)

Vou criar um script que faz isso automaticamente para você!

```bash
cd backend
node scripts/get-meli-token.js
```

#### Opção B: Manual (OAuth Flow)

1. **Gerar URL de Autorização**:
```
https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6916793910009014&redirect_uri=http://localhost:3000/auth/meli/callback
```

2. **Abrir no navegador**:
   - Cole a URL acima no navegador
   - Faça login no Mercado Livre
   - Autorize a aplicação
   - Você será redirecionado para: `http://localhost:3000/auth/meli/callback?code=TG-...`

3. **Copiar o CODE**:
   - Copie o valor após `?code=`
   - Exemplo: `TG-123456789abcdef`

4. **Trocar CODE por TOKEN**:
```bash
curl -X POST \
  'https://api.mercadolibre.com/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code' \
  -d 'client_id=6916793910009014' \
  -d 'client_secret=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2' \
  -d 'code=TG-123456789abcdef' \
  -d 'redirect_uri=http://localhost:3000/auth/meli/callback'
```

5. **Resposta**:
```json
{
  "access_token": "APP_USR-123456789-abcdef-...",
  "token_type": "Bearer",
  "expires_in": 21600,
  "scope": "offline_access read write",
  "user_id": 123456789,
  "refresh_token": "TG-987654321-..."
}
```

6. **Copiar Tokens**:
   - `access_token`: Para usar na API
   - `refresh_token`: Para renovar o token

---

### 3. Atualizar .env

Edite o arquivo `backend/.env`:

```env
# Mercado Livre API
MELI_CLIENT_ID=6916793910009014
MELI_CLIENT_SECRET=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2
MELI_ACCESS_TOKEN=APP_USR-seu-access-token-aqui
MELI_REFRESH_TOKEN=TG-seu-refresh-token-aqui
MELI_API_URL=https://api.mercadolibre.com
```

---

### 4. Testar Token

#### Usando o Script de Teste
```bash
cd backend
node scripts/test-meli-token.js
```

#### Manualmente (cURL)
```bash
curl -X GET \
  'https://api.mercadolibre.com/users/me' \
  -H 'Authorization: Bearer APP_USR-seu-access-token'
```

**Resposta esperada**:
```json
{
  "id": 123456789,
  "nickname": "SEU_USUARIO",
  "email": "seu@email.com",
  ...
}
```

---

## 🔄 Renovar Token (Quando Expirar)

O access token expira em **6 horas**. Use o refresh token para renovar:

### Script Automático
```bash
cd backend
node scripts/refresh-meli-token.js
```

### Manual (cURL)
```bash
curl -X POST \
  'https://api.mercadolibre.com/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=refresh_token' \
  -d 'client_id=6916793910009014' \
  -d 'client_secret=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2' \
  -d 'refresh_token=TG-seu-refresh-token'
```

---

## 📝 Resumo dos Tokens

| Token | Validade | Uso |
|-------|----------|-----|
| **Access Token** | 6 horas | Fazer requisições à API |
| **Refresh Token** | 6 meses | Renovar o access token |

---

## 🚨 Troubleshooting

### Erro: "invalid_grant"
**Causa**: Code expirado (válido por 10 minutos)  
**Solução**: Gere um novo code

### Erro: "invalid_client"
**Causa**: Client ID ou Secret incorretos  
**Solução**: Verifique as credenciais no portal

### Erro: "Unauthorized"
**Causa**: Token expirado  
**Solução**: Renove usando refresh token

---

## 🎯 Próximos Passos

Após configurar o token:

1. ✅ Reiniciar o backend
2. ✅ Testar integração com Mercado Livre
3. ✅ Importar produtos automaticamente
4. ✅ Atualizar preços periodicamente

---

**Vou criar os scripts automatizados para você!** 🚀

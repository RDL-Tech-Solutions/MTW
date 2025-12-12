# ⚡ MERCADO LIVRE - QUICK START

## 🚀 Configuração Rápida em 3 Passos

### 1️⃣ Obter Access Token (PRIMEIRA VEZ)

```bash
cd backend
node scripts/get-meli-token.js
```

**O que acontece:**
1. ✅ Abre o navegador automaticamente
2. ✅ Você faz login no Mercado Livre
3. ✅ Autoriza a aplicação
4. ✅ Tokens são exibidos no terminal

**Copie os tokens exibidos e cole no `.env`:**
```env
MELI_ACCESS_TOKEN=APP_USR-seu-token-aqui
MELI_REFRESH_TOKEN=TG-seu-refresh-token-aqui
```

---

### 2️⃣ Testar Token

```bash
node scripts/test-meli-token.js
```

**Resultado esperado:**
```
✅ Token válido!
👤 Dados do Usuário:
   ID: 123456789
   Nickname: SEU_USUARIO
   ...
✅ TODOS OS TESTES PASSARAM!
```

---

### 3️⃣ Renovar Token (Quando Expirar)

```bash
node scripts/refresh-meli-token.js
```

**Quando usar:**
- ⏰ A cada 6 horas (quando o token expira)
- ❌ Quando receber erro 401 (Unauthorized)

---

## 📋 Resumo dos Scripts

| Script | Quando Usar | Frequência |
|--------|-------------|------------|
| `get-meli-token.js` | Primeira vez | Uma vez |
| `test-meli-token.js` | Testar se funciona | Sempre que quiser |
| `refresh-meli-token.js` | Token expirou | A cada 6 horas |

---

## 🔄 Fluxo Completo

```
1. get-meli-token.js
   ↓
2. Copiar tokens para .env
   ↓
3. test-meli-token.js
   ↓
4. Usar por 6 horas
   ↓
5. refresh-meli-token.js
   ↓
6. Atualizar .env
   ↓
7. Voltar ao passo 4
```

---

## ⚠️ Troubleshooting

### "MELI_CLIENT_ID não encontrado"
**Solução**: Verifique se o `.env` existe e tem as credenciais

### "invalid_grant"
**Solução**: O code expirou, execute `get-meli-token.js` novamente

### "invalid_token"
**Solução**: O refresh_token expirou, execute `get-meli-token.js` novamente

### Token expira muito rápido
**Solução**: Normal! Expira em 6 horas. Use `refresh-meli-token.js`

---

## 🎯 Credenciais Atuais

Já configuradas no `.env`:
```env
MELI_CLIENT_ID=6916793910009014
MELI_CLIENT_SECRET=hyFLmlMAq4V43ZPpivH6VtJCE6bXB7C2
```

**Falta apenas:**
- ⏳ MELI_ACCESS_TOKEN
- ⏳ MELI_REFRESH_TOKEN

---

## 🚀 Começar AGORA

Execute este comando:
```bash
cd backend
node scripts/get-meli-token.js
```

E siga as instruções na tela! ✨

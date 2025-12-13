# 🔐 Configuração Segura - Autenticação Social

## ✅ Implementação Segura

A autenticação social foi implementada de forma **segura**, onde:
- ✅ **Backend** gerencia todas as credenciais do Supabase
- ✅ **Mobile App** não precisa da `SUPABASE_ANON_KEY`
- ✅ **Credenciais** ficam apenas no `.env` do backend

---

## 🔄 Fluxo de Autenticação

### 1. Mobile App solicita URL OAuth
```
Mobile App → Backend: POST /auth/social/url { provider: 'google' }
Backend → Supabase: Gera URL OAuth
Backend → Mobile App: Retorna URL
```

### 2. Usuário autoriza no provedor
```
Mobile App → Google/Facebook: Abre URL OAuth
Google/Facebook → Supabase: Retorna código
Supabase → Mobile App: Redireciona com código
```

### 3. Mobile App envia código para backend
```
Mobile App → Backend: GET /auth/social/callback?code=XXX&provider=google
Backend → Supabase: Troca código por sessão
Backend → Cria/atualiza usuário no banco
Backend → Gera JWT
Backend → Mobile App: Redireciona com tokens
```

### 4. Mobile App salva tokens
```
Mobile App: Salva JWT no AsyncStorage
Mobile App: Usuário autenticado
```

---

## ⚙️ Configuração do Backend

### 1. Adicionar ao `.env` do backend

```env
# Supabase (já deve ter)
SUPABASE_URL=https://rsulwtpvvjkysqqsbtlq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...

# NOVO: Adicionar para OAuth social
SUPABASE_ANON_KEY=eyJhbGci...  # Anon key do Supabase
```

**Onde obter**:
1. Acesse: https://supabase.com/dashboard/project/_/settings/api
2. Copie a chave **anon/public**
3. Adicione ao `.env` do backend

### 2. Configurar OAuth no Supabase

1. **Acesse**: https://supabase.com/dashboard/project/_/auth/providers

2. **Configure Google**:
   - Ative o toggle
   - Adicione Client ID e Secret do Google Cloud Console
   - Redirect URL: `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`

3. **Configure Facebook**:
   - Ative o toggle
   - Adicione App ID e Secret do Facebook Developers
   - Redirect URL: `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`

4. **URL Configuration** (Authentication > URL Configuration):
   ```
   mtwpromo://
   http://localhost:8081
   http://localhost:5173
   exp://localhost:8081
   ```

---

## 📱 Configuração do Mobile App

### ✅ Nenhuma credencial necessária!

O mobile app **não precisa** de nenhuma credencial do Supabase. Tudo é gerenciado pelo backend.

**Arquivo**: `mobile-app/app.json`
```json
{
  "extra": {
    "apiUrl": "http://localhost:3000/api"
  },
  "scheme": "mtwpromo"
}
```

**Removido**:
- ❌ `supabaseUrl`
- ❌ `supabaseAnonKey`

---

## 🗄️ Executar Migration

Execute no Supabase SQL Editor:

```sql
-- Arquivo: database/migrations/010_add_social_auth_fields.sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
```

---

## 🧪 Testar

### 1. Backend
```bash
cd backend
npm start
```

### 2. Mobile App
```bash
cd mobile-app
npm install  # Instalar dependências (sem @supabase/supabase-js)
npx expo start --clear
```

### 3. Testar Login Social
1. Abra o app
2. Vá em Login/Registro
3. Clique em "Continuar com Google" ou "Continuar com Facebook"
4. Autorize no navegador
5. Deve redirecionar e fazer login automaticamente

---

## 🔒 Segurança

### ✅ Vantagens desta abordagem:

1. **Credenciais no backend**: `SUPABASE_ANON_KEY` fica apenas no `.env` do backend
2. **Mobile app limpo**: Não expõe credenciais no código
3. **Controle centralizado**: Backend gerencia todo o fluxo OAuth
4. **Tokens JWT**: Backend gera tokens próprios, não depende do Supabase no cliente

### ⚠️ Importante:

- A `SUPABASE_ANON_KEY` é pública por design do Supabase
- Mas é melhor mantê-la no backend para controle
- O backend pode adicionar validações extras antes de criar usuários

---

## 📝 Checklist

- [ ] Adicionar `SUPABASE_ANON_KEY` ao `.env` do backend
- [ ] Configurar Google OAuth no Supabase
- [ ] Configurar Facebook OAuth no Supabase
- [ ] Configurar Redirect URLs no Supabase
- [ ] Executar migration no Supabase
- [ ] Testar login Google
- [ ] Testar login Facebook

---

## 🆘 Troubleshooting

### Erro: "Supabase não configurado"
- ✅ Verifique se `SUPABASE_ANON_KEY` está no `.env` do backend
- ✅ Reinicie o backend após adicionar

### Erro: "URL de autenticação não retornada"
- ✅ Verifique se OAuth está configurado no Supabase
- ✅ Verifique se `SUPABASE_ANON_KEY` está correta

### Erro: "Redirect URI mismatch"
- ✅ Verifique redirect URLs no Supabase
- ✅ Deve incluir: `mtwpromo://`, `http://localhost:8081`, etc.

---

**Status**: ✅ Implementação segura - Credenciais apenas no backend


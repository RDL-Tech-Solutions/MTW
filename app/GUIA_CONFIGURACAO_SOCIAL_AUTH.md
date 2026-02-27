# 🔐 Guia de Configuração - Autenticação Social

## ⚠️ Nota Importante

A autenticação com Facebook foi removida do sistema em 26/02/2026 para simplificar o processo de autenticação social. Apenas o Google OAuth está disponível.

## 📋 Pré-requisitos

1. ✅ Supabase configurado
2. ✅ Google Cloud Console (para Google OAuth)

---

## 🔧 Passo 1: Configurar Supabase OAuth

### 1.1 Acessar Configurações de Auth

1. Acesse: https://supabase.com/dashboard/project/_/auth/providers
2. Vá em **Authentication** > **Providers**

### 1.2 Configurar Google

1. Ative o toggle **Google**
2. Você precisará de:
   - **Client ID (for OAuth)**
   - **Client Secret (for OAuth)**

**Como obter**:
1. Acesse: https://console.cloud.google.com/
2. Crie/selecione um projeto
3. Vá em **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth client ID**
5. Tipo: **Web application**
6. **Authorized redirect URIs**: 
   ```
   https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback
   ```
7. Copie **Client ID** e **Client Secret**

**No Supabase**:
- Cole o Client ID e Client Secret
- Salve

### 1.3 Configurar Redirect URLs no Supabase

1. Vá em **Authentication** > **URL Configuration**
2. Adicione em **Redirect URLs**:
   ```
   precocerto://
   http://localhost:8081
   http://localhost:5173
   exp://localhost:8081
   ```

---

## 📱 Passo 2: Configurar Mobile App

### 2.1 Adicionar Credenciais Supabase

**Arquivo**: `app/app.json`

```json
{
  "extra": {
    "supabaseUrl": "https://rsulwtpvvjkysqqsbtlq.supabase.co",
    "supabaseAnonKey": "SUA_ANON_KEY_AQUI"
  },
  "scheme": "precocerto"
}
```

**Como obter Anon Key**:
1. Acesse: https://supabase.com/dashboard/project/_/settings/api
2. Copie **anon/public** key
3. Cole no `app.json`

### 2.2 Instalar Dependências

```bash
cd app
npm install
```

**Dependências adicionadas**:
- `@supabase/supabase-js`
- `expo-auth-session`
- `expo-crypto`
- `expo-web-browser`

---

## 🗄️ Passo 3: Executar Migration

### 3.1 No Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/_/sql/new
2. Execute:

```sql
-- Adicionar campos para autenticação social
ALTER TABLE users
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
```

---

## 🧪 Passo 4: Testar

### 4.1 Mobile App

```bash
cd app
npx expo start --clear
```

1. Abra o app
2. Vá em Login/Registro
3. Clique em "Continuar com Google"
4. Autorize no navegador
5. Deve redirecionar e fazer login

### 4.2 Admin Panel

```bash
cd admin-panel
npm run dev
```

1. Acesse: http://localhost:5173/login
2. Clique em botão social
3. Deve redirecionar e fazer login

---

## ⚠️ Troubleshooting

### Erro: "Supabase não configurado"
- ✅ Verifique se `supabaseAnonKey` está no `app.json`
- ✅ Verifique se a key está correta

### Erro: "Redirect URI mismatch"
- ✅ Verifique redirect URLs no Supabase
- ✅ Verifique redirect URLs no Google
- ✅ Deve ser exatamente: `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`

### Erro: "Provider not enabled"
- ✅ Ative o provider no Supabase
- ✅ Configure Client ID/Secret corretamente

### Erro: "Invalid credentials"
- ✅ Verifique Client ID e Secret
- ✅ Certifique-se de que copiou corretamente

---

## 📝 Checklist Final

- [ ] Google OAuth configurado no Supabase
- [ ] Redirect URLs configuradas no Supabase
- [ ] Redirect URLs configuradas no Google Cloud
- [ ] `supabaseAnonKey` adicionado no `app.json`
- [ ] Migration executada no Supabase
- [ ] Dependências instaladas no mobile app
- [ ] Testado login Google

---

**Status**: ✅ Implementação completa - Configure OAuth para usar

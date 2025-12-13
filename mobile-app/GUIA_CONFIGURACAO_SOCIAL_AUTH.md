# 🔐 Guia de Configuração - Autenticação Social

## 📋 Pré-requisitos

1. ✅ Supabase configurado
2. ✅ Google Cloud Console (para Google OAuth)
3. ✅ Facebook Developers (para Facebook OAuth)

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

### 1.3 Configurar Facebook

1. Ative o toggle **Facebook**
2. Você precisará de:
   - **App ID**
   - **App Secret**

**Como obter**:
1. Acesse: https://developers.facebook.com/
2. Crie um app (tipo: **Consumer**)
3. Adicione produto **Facebook Login**
4. Vá em **Settings** > **Basic**
5. Copie **App ID** e **App Secret**
6. Em **Facebook Login** > **Settings**, adicione:
   - **Valid OAuth Redirect URIs**: 
     ```
     https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback
     ```

**No Supabase**:
- Cole o App ID e App Secret
- Salve

### 1.4 Configurar Redirect URLs no Supabase

1. Vá em **Authentication** > **URL Configuration**
2. Adicione em **Redirect URLs**:
   ```
   mtwpromo://
   http://localhost:8081
   http://localhost:5173
   exp://localhost:8081
   ```

---

## 📱 Passo 2: Configurar Mobile App

### 2.1 Adicionar Credenciais Supabase

**Arquivo**: `mobile-app/app.json`

```json
{
  "extra": {
    "supabaseUrl": "https://rsulwtpvvjkysqqsbtlq.supabase.co",
    "supabaseAnonKey": "SUA_ANON_KEY_AQUI"
  },
  "scheme": "mtwpromo"
}
```

**Como obter Anon Key**:
1. Acesse: https://supabase.com/dashboard/project/_/settings/api
2. Copie **anon/public** key
3. Cole no `app.json`

### 2.2 Instalar Dependências

```bash
cd mobile-app
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
2. Execute o conteúdo de: `database/migrations/010_add_social_auth_fields.sql`

**OU copie e cole**:

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
cd mobile-app
npx expo start --clear
```

1. Abra o app
2. Vá em Login/Registro
3. Clique em "Continuar com Google" ou "Continuar com Facebook"
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
- ✅ Verifique redirect URLs no Google/Facebook
- ✅ Deve ser exatamente: `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`

### Erro: "Provider not enabled"
- ✅ Ative o provider no Supabase
- ✅ Configure Client ID/Secret corretamente

### Erro: "Invalid credentials"
- ✅ Verifique Client ID e Secret
- ✅ Verifique App ID e App Secret
- ✅ Certifique-se de que copiou corretamente

---

## 📝 Checklist Final

- [ ] Google OAuth configurado no Supabase
- [ ] Facebook OAuth configurado no Supabase
- [ ] Redirect URLs configuradas no Supabase
- [ ] Redirect URLs configuradas no Google Cloud
- [ ] Redirect URLs configuradas no Facebook
- [ ] `supabaseAnonKey` adicionado no `app.json`
- [ ] Migration executada no Supabase
- [ ] Dependências instaladas no mobile app
- [ ] Testado login Google
- [ ] Testado login Facebook

---

**Status**: ✅ Implementação completa - Configure OAuth para usar


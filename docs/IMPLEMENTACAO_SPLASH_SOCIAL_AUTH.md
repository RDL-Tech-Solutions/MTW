# 🚀 Implementação: Splash Screen e Autenticação Social

## ✅ Funcionalidades Implementadas

### 1. **Splash Screen Customizada** ✅

**Arquivo**: `mobile-app/src/components/common/SplashScreen.js`

**Características**:
- ✅ Animação de fade in
- ✅ Animação de escala (spring)
- ✅ Rotação do logo
- ✅ Barra de progresso animada
- ✅ Background com efeitos de círculos
- ✅ Compatível com web e mobile

**Integração**: 
- Adicionada ao `App.js` com controle de estado
- Exibida por 2.5 segundos antes de carregar o app

### 2. **Autenticação Social (Google e Facebook)** ✅

#### Mobile App

**Arquivos criados**:
- ✅ `mobile-app/src/services/supabase.js` - Cliente Supabase
- ✅ `mobile-app/src/services/authSocial.js` - Serviços de autenticação social

**Dependências adicionadas**:
```json
"@supabase/supabase-js": "^2.39.0",
"expo-auth-session": "~5.0.2",
"expo-crypto": "~13.0.1",
"expo-web-browser": "~13.0.1"
```

**Telas atualizadas**:
- ✅ `LoginScreen.js` - Botões Google e Facebook
- ✅ `RegisterScreen.js` - Botões Google e Facebook

**Store atualizado**:
- ✅ `authStore.js` - Métodos `loginWithGoogle()` e `loginWithFacebook()`

#### Backend

**Arquivos atualizados**:
- ✅ `backend/src/controllers/authController.js` - Método `socialAuth()`
- ✅ `backend/src/routes/authRoutes.js` - Rota `/auth/social`
- ✅ `backend/src/models/User.js` - Suporte a `provider`, `provider_id`, `avatar_url`

**Migration criada**:
- ✅ `database/migrations/010_add_social_auth_fields.sql`

#### Admin Panel

**Arquivo atualizado**:
- ✅ `admin-panel/src/pages/Login.jsx` - Botões Google e Facebook

## 📋 Configuração Necessária

### 1. **Supabase - Configurar OAuth Providers**

1. Acesse: https://supabase.com/dashboard/project/_/auth/providers

2. **Configurar Google**:
   - Ative o provider Google
   - Adicione Client ID e Client Secret do Google Cloud Console
   - Configure redirect URLs:
     - `mtwpromo://`
     - `http://localhost:8081`
     - `http://localhost:5173`

3. **Configurar Facebook**:
   - Ative o provider Facebook
   - Adicione App ID e App Secret do Facebook Developers
   - Configure redirect URLs (mesmas do Google)

### 2. **Mobile App - Configurar Credenciais**

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

**OU criar arquivo**: `mobile-app/.env`

```env
EXPO_PUBLIC_SUPABASE_URL=https://rsulwtpvvjkysqqsbtlq.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. **Backend - Executar Migration**

```sql
-- Executar no Supabase SQL Editor
-- Arquivo: database/migrations/010_add_social_auth_fields.sql
```

### 4. **Google Cloud Console**

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto ou selecione existente
3. Ative Google+ API
4. Crie credenciais OAuth 2.0
5. Configure authorized redirect URIs:
   - `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`
6. Copie Client ID e Client Secret para Supabase

### 5. **Facebook Developers**

1. Acesse: https://developers.facebook.com/
2. Crie um app
3. Adicione Facebook Login
4. Configure OAuth Redirect URIs:
   - `https://rsulwtpvvjkysqqsbtlq.supabase.co/auth/v1/callback`
5. Copie App ID e App Secret para Supabase

## 🔄 Fluxo de Autenticação Social

### Mobile App

1. Usuário clica em "Continuar com Google/Facebook"
2. App abre navegador com OAuth do Supabase
3. Usuário autoriza no provedor
4. Supabase retorna código de autorização
5. App troca código por sessão Supabase
6. App envia dados do usuário para backend (`/auth/social`)
7. Backend cria/atualiza usuário e retorna JWT
8. App salva tokens e autentica usuário

### Admin Panel

1. Usuário clica em botão social
2. Redireciona para endpoint OAuth do backend
3. Backend redireciona para Supabase
4. Após autorização, retorna para admin panel
5. Admin panel recebe token e autentica

## 📝 Estrutura de Dados

### Tabela `users` - Novos Campos

```sql
provider TEXT          -- 'google', 'facebook', null
provider_id TEXT       -- ID do usuário no provedor
avatar_url TEXT        -- URL do avatar
```

## 🎨 UI/UX

### Splash Screen
- Logo animado com rotação
- Barra de progresso
- Background com efeitos visuais
- Texto de loading

### Botões de Login Social
- Google: Cor #4285F4
- Facebook: Cor #1877F2
- Ícones dos provedores
- Estados de loading

## ⚠️ Notas Importantes

1. **Supabase Anon Key**: Deve ser configurada no `app.json` ou `.env`
2. **Redirect URLs**: Devem estar configuradas no Supabase e nos provedores
3. **Scheme**: `mtwpromo://` configurado no `app.json` para deep linking
4. **Web**: No web, o fluxo OAuth abre em nova janela
5. **Mobile**: No mobile, usa `WebBrowser` do Expo

## 🚀 Próximos Passos

1. ✅ Configurar Google OAuth no Supabase
2. ✅ Configurar Facebook OAuth no Supabase
3. ✅ Adicionar `SUPABASE_ANON_KEY` no `app.json`
4. ✅ Executar migration no Supabase
5. ✅ Testar login Google
6. ✅ Testar login Facebook
7. ✅ Testar splash screen

## 📚 Documentação de Referência

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login)

---

**Status**: ✅ Implementação completa - Aguardando configuração OAuth


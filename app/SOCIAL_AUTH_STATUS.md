# 🔐 Status da Autenticação Social (Google/Facebook)

## ✅ O que já está implementado

### Backend
- ✅ Rotas de autenticação social (`/api/auth/social`)
- ✅ Controller com métodos `socialAuth()` e `socialAuthCallback()`
- ✅ Suporte para Google e Facebook OAuth
- ✅ Geração de tokens JWT após autenticação
- ✅ Criação automática de usuário se não existir

### Mobile App
- ✅ Botões de login social nas telas de Login e Registro
- ✅ Integração com `authStore` (métodos `loginWithGoogle` e `loginWithFacebook`)
- ✅ Serviço `authSocial.js` com lógica de autenticação
- ✅ UI/UX completa com loading states
- ✅ Tratamento de erros

## 📋 O que precisa ser configurado

### 1. Google OAuth

#### Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google+ API**
4. Vá em **Credenciais** → **Criar Credenciais** → **ID do cliente OAuth 2.0**

#### Configurar Credenciais

**Para Android:**
```
Tipo de aplicativo: Android
Nome do pacote: com.precocerto.app
Certificado SHA-1: (obter com keytool)
```

**Para iOS:**
```
Tipo de aplicativo: iOS
ID do pacote: com.precocerto.app
```

**Para Web (Admin Panel):**
```
Tipo de aplicativo: Aplicativo da Web
URIs de redirecionamento autorizados:
- http://localhost:5173/auth/callback
- https://admin.precocerto.app/auth/callback
```

#### Obter SHA-1 (Android)

```bash
# Debug keystore
cd android/app
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore (após criar)
keytool -list -v -keystore release.keystore -alias release
```

#### Adicionar ao app.json

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "config": {
        "googleSignIn": {
          "apiKey": "YOUR_ANDROID_API_KEY",
          "certificateHash": "YOUR_SHA1_HASH"
        }
      }
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "config": {
        "googleSignIn": {
          "reservedClientId": "YOUR_IOS_CLIENT_ID"
        }
      }
    }
  }
}
```

### 2. Facebook Login

#### Criar App no Facebook Developers

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app
3. Adicione o produto **Facebook Login**
4. Configure as plataformas (Android, iOS, Web)

#### Configurar Android

```
Nome do pacote: com.precocerto.app
Nome da classe: MainActivity
Hash da chave: (obter com keytool)
```

#### Configurar iOS

```
ID do pacote: com.precocerto.app
```

#### Obter Key Hash (Android)

```bash
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
```

#### Adicionar ao app.json

```json
{
  "expo": {
    "facebookScheme": "fb{YOUR_FACEBOOK_APP_ID}",
    "facebookAppId": "YOUR_FACEBOOK_APP_ID",
    "facebookDisplayName": "PreçoCerto",
    "android": {
      "config": {
        "facebook": {
          "appId": "YOUR_FACEBOOK_APP_ID",
          "displayName": "PreçoCerto"
        }
      }
    },
    "ios": {
      "config": {
        "facebook": {
          "appId": "YOUR_FACEBOOK_APP_ID",
          "displayName": "PreçoCerto"
        }
      }
    }
  }
}
```

### 3. Variáveis de Ambiente

#### Backend (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/social/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/social/callback
```

#### App Mobile (.env)

```env
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
FACEBOOK_APP_ID=your-facebook-app-id
```

## 📦 Dependências Necessárias

### Mobile App

```bash
cd app
npx expo install @react-native-google-signin/google-signin
npx expo install react-native-fbsdk-next
npx expo install expo-auth-session
npx expo install expo-web-browser
```

### Backend

```bash
cd backend
npm install google-auth-library
npm install passport passport-google-oauth20 passport-facebook
```

## 🔧 Configuração do Código

### 1. Atualizar authSocial.js (App)

O arquivo `app/src/services/authSocial.js` já existe e tem a estrutura básica. Você precisa:

1. Descomentar as importações do Google e Facebook
2. Configurar os client IDs
3. Testar o fluxo completo

### 2. Verificar authController.js (Backend)

O método `socialAuth()` já está implementado e suporta:
- Google OAuth
- Facebook OAuth
- Criação automática de usuário
- Geração de tokens JWT

## 🧪 Testando

### 1. Testar Google Login

```bash
# No app mobile
1. Clique em "Continuar com Google"
2. Selecione uma conta Google
3. Autorize o app
4. Verifique se o login foi bem-sucedido
```

### 2. Testar Facebook Login

```bash
# No app mobile
1. Clique em "Continuar com Facebook"
2. Faça login no Facebook (se necessário)
3. Autorize o app
4. Verifique se o login foi bem-sucedido
```

### 3. Verificar Backend

```bash
# Logs do backend devem mostrar:
✅ Login social bem-sucedido: usuario@gmail.com (google)
✅ Novo usuário criado via Google: usuario@gmail.com
```

## 🚀 Fluxo de Autenticação Social

### Google

```
1. App → Google Sign In SDK
2. Google → Retorna ID Token
3. App → POST /api/auth/social { provider: 'google', token: 'ID_TOKEN' }
4. Backend → Valida token com Google API
5. Backend → Busca/Cria usuário
6. Backend → Retorna JWT tokens
7. App → Salva tokens e autentica usuário
```

### Facebook

```
1. App → Facebook Login SDK
2. Facebook → Retorna Access Token
3. App → POST /api/auth/social { provider: 'facebook', token: 'ACCESS_TOKEN' }
4. Backend → Valida token com Facebook Graph API
5. Backend → Busca/Cria usuário
6. Backend → Retorna JWT tokens
7. App → Salva tokens e autentica usuário
```

## 📝 Checklist de Implementação

### Google OAuth
- [ ] Criar projeto no Google Cloud Console
- [ ] Configurar OAuth 2.0 credentials
- [ ] Obter Client IDs (Web, Android, iOS)
- [ ] Adicionar ao app.json
- [ ] Configurar variáveis de ambiente
- [ ] Instalar dependências
- [ ] Testar login

### Facebook Login
- [ ] Criar app no Facebook Developers
- [ ] Configurar Facebook Login
- [ ] Obter App ID e App Secret
- [ ] Adicionar ao app.json
- [ ] Configurar variáveis de ambiente
- [ ] Instalar dependências
- [ ] Testar login

### Backend
- [x] Rotas de autenticação social
- [x] Controller com lógica OAuth
- [x] Validação de tokens
- [x] Criação automática de usuários
- [ ] Configurar credenciais OAuth
- [ ] Testar endpoints

### Mobile App
- [x] UI dos botões de login social
- [x] Integração com authStore
- [x] Serviço authSocial.js
- [x] Tratamento de erros
- [ ] Configurar SDKs (Google/Facebook)
- [ ] Testar fluxo completo

## 🆘 Troubleshooting

### Google Login não funciona

1. Verifique se o Client ID está correto
2. Confirme o SHA-1 no Google Console
3. Verifique se a Google+ API está ativada
4. Teste com diferentes contas Google

### Facebook Login não funciona

1. Verifique se o App ID está correto
2. Confirme o Key Hash no Facebook Developers
3. Verifique se o app está em modo de desenvolvimento
4. Adicione contas de teste no Facebook Developers

### Token inválido no backend

1. Verifique se o token está sendo enviado corretamente
2. Confirme as credenciais no backend .env
3. Verifique os logs do backend
4. Teste a validação do token manualmente

## 📚 Recursos

- [Google Sign-In for React Native](https://github.com/react-native-google-signin/google-signin)
- [Facebook SDK for React Native](https://github.com/thebergamo/react-native-fbsdk-next)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login)

## 🎯 Próximos Passos

1. **Configurar Google OAuth** (mais fácil de começar)
2. **Testar no desenvolvimento**
3. **Configurar Facebook Login**
4. **Testar ambos os fluxos**
5. **Preparar para produção** (credenciais de produção)
6. **Adicionar Apple Sign In** (obrigatório para iOS)

# 🔐 Configuração Google OAuth

Guia completo para configurar autenticação Google OAuth no PreçoCerto.

## 📋 Visão Geral

O PreçoCerto usa Google OAuth direto (sem Supabase) para autenticação social. A implementação usa:
- **Backend**: `google-auth-library` para validar tokens
- **App Mobile**: `expo-auth-session` para fluxo OAuth

## 🚀 Configuração Rápida

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google+ API**

### 2. Criar Credenciais OAuth 2.0

#### Para Web (Backend)
1. Vá em **APIs & Services** → **Credentials**
2. Clique em **Create Credentials** → **OAuth 2.0 Client ID**
3. Tipo: **Web application**
4. Nome: `PreçoCerto Backend`
5. **Authorized redirect URIs**: Deixe vazio (não necessário para validação de token)
6. Copie o **Client ID**

#### Para Android (App Mobile)
1. Clique em **Create Credentials** → **OAuth 2.0 Client ID**
2. Tipo: **Android**
3. Nome: `PreçoCerto Android`
4. **Package name**: `com.mtwpromo` (do app.json)
5. **SHA-1**: Obtenha executando o script `app/get-sha1.bat`
6. Copie o **Client ID**

#### Para iOS (App Mobile)
1. Clique em **Create Credentials** → **OAuth 2.0 Client ID**
2. Tipo: **iOS**
3. Nome: `PreçoCerto iOS`
4. **Bundle ID**: `com.mtwpromo` (do app.json)
5. Copie o **Client ID**

### 3. Obter SHA-1 do Keystore Android

Execute o script no diretório do app:

```bash
cd app
./get-sha1.bat
```

Ou manualmente:

```bash
cd app/android/app
keytool -keystore debug.keystore -list -v
```

Senha padrão: `android`

### 4. Configurar Variáveis de Ambiente

#### Backend (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_web.apps.googleusercontent.com
```

#### App Mobile (.env)

```env
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=seu_client_id_web.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=seu_client_id_android.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=seu_client_id_ios.apps.googleusercontent.com
```

## 📝 URLs de Autenticação

### Para Google Cloud Console

Configure estas URLs no Google Cloud Console:

**Authorized JavaScript origins**:
- `http://localhost:3000` (desenvolvimento)
- `https://seu-dominio.com` (produção)

**Authorized redirect URIs**:
- Não necessário para validação de token no backend
- O app mobile usa deep linking automático do Expo

## 🔧 Implementação

### Backend

O backend valida o ID Token recebido do app:

```javascript
// backend/src/services/googleAuth.js
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
```

### App Mobile

O app usa `expo-auth-session` para o fluxo OAuth:

```javascript
// app/src/services/authSocial.js
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
```

## 🧪 Teste

### 1. Teste no App

1. Inicie o backend: `cd backend && npm run dev`
2. Inicie o app: `cd app && npm start`
3. Abra no Expo Go
4. Clique em "Continuar com Google"
5. Selecione uma conta Google
6. Verifique se o login foi bem-sucedido

### 2. Verificar Logs

**Backend**:
```
[INFO] Google auth successful for user: email@example.com
```

**App**:
```
Google auth response: { type: 'success', ... }
```

## 🔍 Troubleshooting

### Erro: "Invalid client ID"

**Causa**: Client ID incorreto ou não configurado

**Solução**:
1. Verifique se o Client ID está correto no `.env`
2. Verifique se o Client ID corresponde ao tipo (Web, Android, iOS)
3. Reinicie o backend após alterar `.env`

### Erro: "SHA-1 fingerprint mismatch"

**Causa**: SHA-1 do keystore não corresponde ao configurado no Google Cloud

**Solução**:
1. Execute `app/get-sha1.bat` para obter o SHA-1 correto
2. Atualize o SHA-1 no Google Cloud Console
3. Aguarde alguns minutos para propagar

### Erro: "Redirect URI mismatch"

**Causa**: URI de redirecionamento não autorizado

**Solução**:
1. Verifique se o deep link está configurado no `app.json`
2. Verifique se o scheme está correto: `com.mtwpromo`
3. Não é necessário configurar redirect URIs no Google Cloud para o app mobile

### Login funciona no Expo Go mas não no build

**Causa**: SHA-1 do build é diferente do debug keystore

**Solução**:
1. Para builds de produção, use o SHA-1 do keystore de produção
2. Para EAS Build, obtenha o SHA-1 do build:
   ```bash
   eas credentials
   ```
3. Adicione o SHA-1 de produção no Google Cloud Console

## 📚 Documentação Adicional

- [Guia Completo de Implementação](../../GUIA_GOOGLE_OAUTH_SETUP.md)
- [Implementação Detalhada](../../IMPLEMENTACAO_GOOGLE_AUTH_DIRETO.md)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)

## 🔄 Fluxo de Autenticação

```
1. Usuário clica em "Continuar com Google"
   ↓
2. App abre navegador com Google OAuth
   ↓
3. Usuário seleciona conta e autoriza
   ↓
4. Google retorna ID Token para o app
   ↓
5. App envia ID Token para backend
   ↓
6. Backend valida token com Google
   ↓
7. Backend cria/atualiza usuário no banco
   ↓
8. Backend retorna JWT access token
   ↓
9. App salva token e redireciona para home
```

## ✅ Checklist de Configuração

- [ ] Projeto criado no Google Cloud Console
- [ ] Google+ API ativada
- [ ] Client ID Web criado
- [ ] Client ID Android criado (com SHA-1)
- [ ] Client ID iOS criado
- [ ] Variáveis de ambiente configuradas no backend
- [ ] Variáveis de ambiente configuradas no app
- [ ] Backend reiniciado
- [ ] Teste de login realizado com sucesso

---

**Próximo**: [Configuração SMTP](./smtp-setup.md)

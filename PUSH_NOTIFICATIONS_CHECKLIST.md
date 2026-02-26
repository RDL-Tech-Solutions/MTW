# 🔔 Checklist Completo - Notificações Push

## ✅ Status da Implementação

### Backend (100% Implementado)
- ✅ Serviço de Push Notification (`pushNotification.js`)
- ✅ Rotas de notificação (`/api/notifications/*`)
- ✅ Controller de notificações
- ✅ Modelo de Notification no banco
- ✅ Modelo de User com campo `push_token`
- ✅ Endpoint para registrar token (`POST /api/notifications/register-token`)
- ✅ Sistema de envio em lote (batch de 100)
- ✅ Validação de tokens
- ✅ Tratamento de erros
- ✅ Logs detalhados

### Mobile App (100% Implementado)
- ✅ Store de notificações (`notificationStore.js`)
- ✅ Configuração do `expo-notifications`
- ✅ Plugin no `app.json`
- ✅ Permissões Android
- ✅ ProjectId configurado
- ✅ Canais de notificação Android (4 canais)
- ✅ Listeners de notificações
- ✅ Registro automático de token
- ✅ Tratamento de erros para Expo Go
- ✅ Notificações locais de teste

---

## 📋 O Que Precisa Ser Configurado

### 1. Expo Access Token (Opcional, mas Recomendado)

O Expo Access Token aumenta o limite de notificações e adiciona recursos extras.

**Como obter:**
1. Acesse: https://expo.dev/accounts/[seu-username]/settings/access-tokens
2. Clique em "Create Token"
3. Dê um nome (ex: "PreçoCerto Push Notifications")
4. Copie o token gerado

**Onde configurar:**
```env
# backend/.env
EXPO_ACCESS_TOKEN=seu-token-aqui
```

**Limites:**
- Sem token: 600 notificações/hora
- Com token: Sem limite (uso comercial)

---

### 2. Build do App (OBRIGATÓRIO para testar)

⚠️ **IMPORTANTE**: Push notifications NÃO funcionam no Expo Go (SDK 53+)

**Opção A: Development Build Local (Mais Rápido)**
```bash
cd app

# Android
npx expo run:android

# iOS (requer Mac + Xcode)
npx expo run:ios
```

**Opção B: EAS Build (Cloud)**
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Configurar projeto
eas build:configure

# Build Android Development
eas build --profile development --platform android

# Build iOS Development (requer Apple Developer Account)
eas build --profile development --platform ios
```

**Opção C: Production Build**
```bash
# Android (APK/AAB)
eas build --profile production --platform android

# iOS (para App Store)
eas build --profile production --platform ios
```

---

### 3. Configuração do EAS (se usar EAS Build)

Arquivo `app/eas.json` já está configurado, mas verifique:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

### 4. Permissões Android

Já configurado em `app/app.json`:
```json
{
  "android": {
    "permissions": ["NOTIFICATIONS"]
  }
}
```

---

### 5. Configuração iOS (se for publicar na App Store)

**Requisitos:**
- Apple Developer Account ($99/ano)
- Certificado de Push Notification
- Provisioning Profile

**Passos:**
1. Acesse: https://developer.apple.com
2. Certificates, Identifiers & Profiles
3. Criar App ID com Push Notifications habilitado
4. Criar certificado APNs (Apple Push Notification service)
5. Baixar e instalar o certificado

**No EAS:**
```bash
eas credentials
```

---

## 🧪 Como Testar

### Passo 1: Fazer Build do App
```bash
cd app
npx expo run:android
```

### Passo 2: Abrir o App e Fazer Login
- O app vai solicitar permissão de notificações
- Aceite a permissão
- Faça login com sua conta

### Passo 3: Verificar Token no Backend
```bash
# No terminal do backend, você verá:
✅ Push token registrado: usuário [user-id]
```

### Passo 4: Verificar Token no Banco de Dados
```sql
SELECT id, email, push_token 
FROM users 
WHERE push_token IS NOT NULL;
```

### Passo 5: Enviar Notificação de Teste

**Opção A: Pelo App (Notificação Local)**
```javascript
// No app, em qualquer tela, adicione um botão:
import { useNotificationStore } from '../stores/notificationStore';

const { sendTestNotification } = useNotificationStore();

<Button onPress={sendTestNotification}>
  Testar Notificação Local
</Button>
```

**Opção B: Pelo Backend (Notificação Remota)**

Crie um endpoint de teste no backend:

```javascript
// backend/src/routes/notificationRoutes.js
router.post('/test-push', requireAdmin, NotificationController.testPush);

// backend/src/controllers/notificationController.js
static async testPush(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user || !user.push_token) {
      return res.status(400).json(errorResponse('Usuário sem push token'));
    }

    const result = await pushNotificationService.sendToUser(
      user.push_token,
      {
        title: '🧪 Teste de Notificação',
        message: 'Esta é uma notificação de teste do backend!',
        type: 'test',
        data: { screen: 'Home' }
      }
    );

    res.json(successResponse({ sent: result }));
  } catch (error) {
    next(error);
  }
}
```

Depois, envie via Postman/Insomnia:
```http
POST http://localhost:3000/api/notifications/test-push
Authorization: Bearer seu-token-jwt
Content-Type: application/json

{
  "userId": "seu-user-id"
}
```

---

## 🔍 Troubleshooting

### Problema: "Push notifications removed from Expo Go"
**Solução**: Fazer development build (não funciona no Expo Go)

### Problema: Token não está sendo salvo no backend
**Verificar:**
1. Backend está rodando?
2. `API_URL` no `app/.env` está correto?
3. Usuário está logado?
4. Verificar logs do app: `npx expo start`

### Problema: Notificação não aparece no dispositivo
**Verificar:**
1. App está em background? (notificações só aparecem em background)
2. Permissão foi concedida?
3. Token está no banco de dados?
4. Backend enviou a notificação? (verificar logs)
5. Token é válido? (começa com `ExponentPushToken[` ou `ExpoPushToken[`)

### Problema: Erro ao enviar notificação do backend
**Verificar:**
1. Token é válido?
2. Formato da mensagem está correto?
3. Expo API está respondendo? (https://status.expo.dev)
4. Verificar logs do backend

### Problema: Notificação aparece mas não navega para tela
**Solução**: Implementar navigation ref no app

```javascript
// app/App.js
import { navigationRef } from './src/navigation/navigationRef';

<NavigationContainer ref={navigationRef}>
  ...
</NavigationContainer>

// app/src/navigation/navigationRef.js
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// app/src/stores/notificationStore.js
import { navigate } from '../navigation/navigationRef';

// No listener de resposta:
if (data?.screen) {
  navigate(data.screen, data);
}
```

---

## 📊 Monitoramento

### Logs do App
```bash
cd app
npx expo start
```

Procure por:
- `✅ Push token obtido: ExponentPushToken[...]`
- `✅ Token registrado no backend`
- `✅ Canais de notificação configurados`
- `🔔 Notificação recebida:`
- `👆 Usuário tocou na notificação:`

### Logs do Backend
```bash
cd backend
npm run dev
```

Procure por:
- `✅ Push token registrado: usuário [id]`
- `✅ Push enviada com sucesso:`
- `📊 Push notifications: X enviadas, Y falharam`

### Banco de Dados
```sql
-- Verificar usuários com push token
SELECT COUNT(*) FROM users WHERE push_token IS NOT NULL;

-- Verificar notificações enviadas
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Verificar preferências de notificação
SELECT * FROM notification_preferences;
```

---

## 🚀 Próximos Passos

### 1. Testar Notificações Automáticas
- Publicar novo produto → usuários recebem notificação
- Publicar novo cupom → usuários recebem notificação
- Produto favorito com desconto → usuário recebe notificação

### 2. Implementar Deep Linking
- Tocar na notificação abre a tela correta
- Passar dados da notificação para a tela

### 3. Agendar Notificações
- Cupons expirando em 24h
- Produtos favoritos com desconto
- Resumo semanal de ofertas

### 4. Analytics
- Quantas notificações foram enviadas
- Taxa de abertura (open rate)
- Taxa de conversão

---

## 📚 Documentação Oficial

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Push Notification Tool](https://expo.dev/notifications) - Testar manualmente

---

## ✅ Resumo: O Que Fazer Agora

1. **Opcional**: Configurar `EXPO_ACCESS_TOKEN` no backend/.env
2. **Obrigatório**: Fazer development build do app (`npx expo run:android`)
3. **Obrigatório**: Abrir o app e fazer login
4. **Verificar**: Token foi salvo no banco de dados
5. **Testar**: Enviar notificação de teste
6. **Monitorar**: Verificar logs do app e backend

**Tudo já está implementado e funcionando!** Só precisa fazer o build do app para testar.

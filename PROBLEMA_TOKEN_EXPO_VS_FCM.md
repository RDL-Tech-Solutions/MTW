# ❌ Problema: Token Expo vs Token FCM

## 🔍 DIAGNÓSTICO

O backend está tentando enviar notificações via Firebase Cloud Messaging (FCM), mas o token registrado no banco é um **Expo Push Token**, não um token FCM.

### Token Encontrado no Banco

```
ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]
```

### Erro do Firebase

```
messaging/invalid-argument: The registration token is not a valid FCM registration token
```

## 🎯 CAUSA RAIZ

O app está rodando no **Expo Go** (modo desenvolvimento), que usa Expo Push Notifications em vez de Firebase Cloud Messaging.

### Expo Go vs Development Build

| Característica | Expo Go | Development Build |
|----------------|---------|-------------------|
| Firebase Messaging | ❌ Não suportado | ✅ Suportado |
| Token gerado | `ExponentPushToken[...]` | Token FCM válido |
| Notificações | Via Expo Push Service | Via Firebase (FCM) |
| Instalação | Rápida (app da loja) | Requer build |

## ✅ SOLUÇÃO

Para usar Firebase Cloud Messaging, você precisa criar um **Development Build** do app.

### Opção 1: Build Local (Recomendado para Desenvolvimento)

```bash
cd app

# 1. Limpar e preparar projeto nativo
npx expo prebuild --clean

# 2. Build e instalar no dispositivo Android
npx expo run:android

# 3. Ou build para iOS
npx expo run:ios
```

**Resultado**: App instalado no celular com suporte completo a FCM.

### Opção 2: Build com EAS (Recomendado para Produção)

```bash
cd app

# 1. Instalar EAS CLI (se ainda não tiver)
npm install -g eas-cli

# 2. Login no Expo
eas login

# 3. Configurar projeto
eas build:configure

# 4. Build de desenvolvimento
eas build --profile development --platform android

# 5. Ou build de produção
eas build --profile production --platform android
```

**Resultado**: APK/AAB para instalar ou publicar na Play Store.

## 🔧 VERIFICAÇÃO

Após fazer o build e instalar o app:

### 1. Verificar Token Registrado

```bash
cd backend
node scripts/find-user-with-fcm.js
```

**Token FCM válido deve ter este formato:**
```
fA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4
```

**Características de um token FCM válido:**
- ✅ Comprimento: ~150-200 caracteres
- ✅ Formato: String alfanumérica (sem colchetes ou prefixos)
- ✅ Não contém "Exponent" ou "ExponentPushToken"

### 2. Testar Envio

```bash
cd backend
node scripts/test-fcm-send-direct.js
```

**Resultado esperado:**
```
✅ SUCESSO! Notificação enviada
Message ID: projects/...
```

## 🚨 IMPORTANTE

### Expo Go NÃO suporta:

- ❌ Firebase Cloud Messaging (FCM)
- ❌ Módulos nativos customizados
- ❌ Configurações nativas (AndroidManifest.xml, Info.plist)
- ❌ Permissões de background

### Development Build suporta:

- ✅ Firebase Cloud Messaging (FCM)
- ✅ Todos os módulos nativos
- ✅ Configurações nativas completas
- ✅ Permissões de background
- ✅ Notificações em background/foreground/killed

## 📋 CHECKLIST

- [ ] Fazer build do app (`npx expo run:android`)
- [ ] Instalar app no celular
- [ ] Fazer login no app
- [ ] Aceitar permissão de notificações
- [ ] Verificar token registrado (`node scripts/find-user-with-fcm.js`)
- [ ] Confirmar que token NÃO é `ExponentPushToken`
- [ ] Testar envio (`node scripts/test-fcm-send-direct.js`)
- [ ] Aprovar produto no admin e verificar notificação

## 🔄 ALTERNATIVA TEMPORÁRIA

Se você não pode fazer build agora, pode usar Expo Push Notifications temporariamente:

### 1. Instalar Expo Notifications

```bash
cd backend
npm install expo-server-sdk
```

### 2. Criar Serviço Expo Push

```javascript
// backend/src/services/expoPushService.js
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function sendExpoPush(tokens, notification) {
  const messages = tokens
    .filter(token => Expo.isExpoPushToken(token))
    .map(token => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: notification.data
    }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...ticketChunk);
  }

  return tickets;
}
```

### 3. Detectar Tipo de Token

```javascript
// backend/src/services/fcmService.js
async sendToMultiple(fcmTokens, notification) {
  // Separar tokens Expo de tokens FCM
  const expoTokens = fcmTokens.filter(t => t.startsWith('ExponentPushToken'));
  const fcmTokens = fcmTokens.filter(t => !t.startsWith('ExponentPushToken'));

  // Enviar via Expo
  if (expoTokens.length > 0) {
    await sendExpoPush(expoTokens, notification);
  }

  // Enviar via FCM
  if (fcmTokens.length > 0) {
    // ... código FCM existente
  }
}
```

**⚠️ ATENÇÃO**: Esta é uma solução temporária. Para produção, use apenas FCM com development build.

## 📚 REFERÊNCIAS

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Firebase Cloud Messaging - React Native](https://rnfirebase.io/messaging/usage)
- [Expo vs Development Build](https://docs.expo.dev/workflow/expo-go/)

---

**Data**: 2026-03-04  
**Status**: Problema identificado, solução documentada


# 🔔 Notificações em Segundo Plano (Background)

## ✅ IMPLEMENTADO

O app agora está configurado para receber notificações push mesmo quando está em segundo plano ou fechado.

## 📋 MUDANÇAS APLICADAS

### 1. Permissões Android (`AndroidManifest.xml`)

Adicionadas permissões essenciais:

```xml
<!-- Permissões para notificações em segundo plano -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Android 12+ (API 31+) - Permissões de alarmes exatos -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
```

**O que cada permissão faz:**

- `RECEIVE_BOOT_COMPLETED`: Permite receber notificações após reiniciar o celular
- `WAKE_LOCK`: Mantém o dispositivo acordado para processar notificações
- `FOREGROUND_SERVICE`: Permite serviços em primeiro plano (necessário para FCM)
- `POST_NOTIFICATIONS`: Permissão obrigatória no Android 13+ (API 33+)
- `SCHEDULE_EXACT_ALARM`: Permite agendar alarmes exatos (Android 12+)
- `USE_EXACT_ALARM`: Alternativa para alarmes exatos

### 2. Configuração Expo (`app.json`)

Adicionadas permissões no `app.json`:

```json
"permissions": [
  "NOTIFICATIONS",
  "RECEIVE_BOOT_COMPLETED",
  "WAKE_LOCK",
  "FOREGROUND_SERVICE",
  "POST_NOTIFICATIONS",
  "SCHEDULE_EXACT_ALARM",
  "USE_EXACT_ALARM"
],
"useNextNotificationsApi": true
```

### 3. Background Message Handler (`index.js`)

Registrado handler para processar notificações em background:

```javascript
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🔔 FCM Background: Notificação recebida em background', remoteMessage);
  return Promise.resolve();
});
```

**IMPORTANTE**: Este handler é executado quando:
- App está em background (minimizado)
- App está completamente fechado
- Dispositivo está bloqueado

## 🎯 COMPORTAMENTO DAS NOTIFICAÇÕES

### App em Foreground (Aberto)
- ✅ Notificação recebida via `onMessage()`
- ⚠️ Não exibe automaticamente (você controla)
- 💡 Pode exibir notificação local customizada

### App em Background (Minimizado)
- ✅ Notificação recebida via `setBackgroundMessageHandler()`
- ✅ Android exibe automaticamente na bandeja
- ✅ Ao tocar, abre o app e navega para tela correta

### App Fechado (Killed)
- ✅ Notificação recebida via `setBackgroundMessageHandler()`
- ✅ Android exibe automaticamente na bandeja
- ✅ Ao tocar, abre o app e navega para tela correta

### Dispositivo Reiniciado
- ✅ Permissão `RECEIVE_BOOT_COMPLETED` garante que notificações funcionem após reboot

## 🧪 COMO TESTAR

### 1. Rebuild do App (OBRIGATÓRIO)

As mudanças no `AndroidManifest.xml` exigem rebuild:

```bash
cd app

# Limpar cache
npx expo prebuild --clean

# Build e instalar
npx expo run:android
```

### 2. Testar App em Foreground

1. Abra o app
2. Execute no backend:
```bash
cd backend
node scripts/test-all-notifications-user.js
```
3. Verifique os logs do app (não exibe notificação, apenas log)

### 3. Testar App em Background

1. Abra o app e faça login
2. Minimize o app (botão Home)
3. Execute no backend:
```bash
node scripts/test-all-notifications-user.js
```
4. ✅ Notificações devem aparecer na bandeja
5. Toque em uma notificação
6. ✅ App deve abrir e navegar para tela correta

### 4. Testar App Fechado

1. Abra o app e faça login
2. Feche o app completamente (swipe para cima no multitask)
3. Execute no backend:
```bash
node scripts/test-all-notifications-user.js
```
4. ✅ Notificações devem aparecer na bandeja
5. Toque em uma notificação
6. ✅ App deve abrir e navegar para tela correta

### 5. Testar Após Reboot

1. Faça login no app
2. Reinicie o celular
3. Não abra o app
4. Execute no backend:
```bash
node scripts/test-all-notifications-user.js
```
5. ✅ Notificações devem aparecer na bandeja

## 🔍 DEBUG

### Ver Logs do Background Handler

```bash
# Android
npx react-native log-android

# Filtrar apenas FCM
npx react-native log-android | grep FCM
```

### Verificar Permissões

No celular:
1. Configurações → Apps → PreçoCerto
2. Permissões
3. Verificar se "Notificações" está ativado

### Verificar Token FCM Registrado

```bash
cd backend
node scripts/debug-notifications.js
```

Deve mostrar:
```
📊 Total de tokens registrados: 1
```

## ⚠️ PROBLEMAS COMUNS

### Notificações não aparecem em background

**Causa**: App não foi rebuilded após mudanças no `AndroidManifest.xml`

**Solução**:
```bash
cd app
npx expo prebuild --clean
npx expo run:android
```

### Permissão negada no Android 13+

**Causa**: Android 13+ exige permissão explícita de notificações

**Solução**: O app já solicita automaticamente no onboarding (4º slide)

### Token não registra

**Causa**: Permissão de notificações não concedida

**Solução**:
1. Abra o app
2. Vá em Configurações → Notificações
3. Ative "Receber Notificações"

### App não abre ao tocar na notificação

**Causa**: Dados da notificação não incluem `screen` ou `productId`/`couponId`

**Solução**: Verifique que o backend envia:
```javascript
data: {
  type: 'new_product',
  productId: '123',
  screen: 'ProductDetails'
}
```

## 📊 MONITORAMENTO

### Logs Importantes

```javascript
// Inicialização
✅ FCM inicializado com sucesso
📱 Permissão: Concedida

// Token
📱 FCM Token obtido: ...
✅ FCM token registrado no backend

// Background
🔔 FCM Background: Notificação recebida em background

// Navegação
🧭 FCM: Navegando baseado na notificação
```

## 🎯 CHECKLIST

- [x] Permissões adicionadas no `AndroidManifest.xml`
- [x] Permissões adicionadas no `app.json`
- [x] Background handler registrado no `index.js`
- [x] Handler de foreground no `fcmStore.js`
- [x] Handler de notificação aberta no `fcmStore.js`
- [x] Navegação baseada em dados da notificação
- [ ] Rebuild do app (`npx expo prebuild --clean`)
- [ ] Testar em background
- [ ] Testar com app fechado
- [ ] Testar após reboot

## 📚 REFERÊNCIAS

- [Firebase Cloud Messaging - React Native](https://rnfirebase.io/messaging/usage)
- [Background Messages](https://rnfirebase.io/messaging/usage#background-messages)
- [Android Permissions](https://developer.android.com/guide/topics/permissions/overview)

---

**Data**: 2026-03-04  
**Status**: Implementado, aguardando rebuild e testes


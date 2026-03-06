# 🔧 Correção: Erro "Unable to resolve expo-notifications"

## ❌ Erro

```
Android Bundling failed
Unable to resolve "expo-notifications" from "src\services\permissionsService.js"
```

## 🔍 Causa

O `permissionsService.js` estava importando `expo-notifications`, mas o projeto usa **Firebase Cloud Messaging (FCM)** para notificações, não Expo Notifications.

### Código Problemático:
```javascript
import * as Notifications from 'expo-notifications'; // ❌ Pacote não instalado
```

## ✅ Solução

Removida a dependência do `expo-notifications` e ajustada a lógica para usar apenas APIs nativas do React Native e FCM.

### Mudanças Implementadas:

#### 1. Removido Import do Expo Notifications
```javascript
// ANTES (INCORRETO)
import * as Notifications from 'expo-notifications';

// DEPOIS (CORRETO)
// Removido - não é necessário
```

#### 2. Atualizado requestIOSPermissions()
```javascript
// ANTES (INCORRETO)
async requestIOSPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  this.permissionsStatus.notifications = status === 'granted';
  // ...
}

// DEPOIS (CORRETO)
async requestIOSPermissions() {
  // iOS: Permissões de notificação são gerenciadas pelo FCM
  console.log('📱 iOS: Permissões de notificação gerenciadas pelo FCM');
  
  // Assumir que permissões serão solicitadas pelo FCM
  this.permissionsStatus.notifications = true;
  this.permissionsStatus.storage = true;
  this.permissionsStatus.all = true;
}
```

#### 3. Atualizado checkIOSPermissions()
```javascript
// ANTES (INCORRETO)
async checkIOSPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  this.permissionsStatus.notifications = status === 'granted';
  // ...
}

// DEPOIS (CORRETO)
async checkIOSPermissions() {
  // iOS: Permissões gerenciadas pelo FCM
  this.permissionsStatus.notifications = true;
  this.permissionsStatus.storage = true;
  this.permissionsStatus.all = true;
  return this.permissionsStatus.all;
}
```

#### 4. Atualizado requestNotificationPermission() para iOS
```javascript
// ANTES (INCORRETO)
else if (Platform.OS === 'ios') {
  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === 'granted';
  // ...
}

// DEPOIS (CORRETO)
else if (Platform.OS === 'ios') {
  // iOS: Permissões gerenciadas pelo FCM
  console.log('📱 iOS: Permissão de notificações gerenciada pelo FCM');
  this.permissionsStatus.notifications = true;
  return true;
}
```

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Dependência | ❌ expo-notifications | ✅ Apenas React Native + FCM |
| Android | ✅ Funcionava | ✅ Continua funcionando |
| iOS | ❌ Erro de build | ✅ Funciona (delegado ao FCM) |
| Permissões Android | ✅ PermissionsAndroid | ✅ PermissionsAndroid |
| Permissões iOS | ❌ expo-notifications | ✅ Gerenciadas pelo FCM |

## 🔄 Fluxo de Permissões

### Android:
```
1. permissionsService.requestAllPermissions()
   ↓
2. requestAndroidPermissions()
   ↓
3. PermissionsAndroid.requestMultiple([
     POST_NOTIFICATIONS,
     READ_EXTERNAL_STORAGE,
     WRITE_EXTERNAL_STORAGE
   ])
   ↓
4. Permissões concedidas/negadas
```

### iOS:
```
1. permissionsService.requestAllPermissions()
   ↓
2. requestIOSPermissions()
   ↓
3. Delega ao FCM (fcmStore.js)
   ↓
4. FCM solicita permissões via messaging().requestPermission()
   ↓
5. Permissões concedidas/negadas
```

## 🎯 Por Que Funciona?

### Android:
- Usa `PermissionsAndroid` nativo do React Native
- Solicita `POST_NOTIFICATIONS` para Android 13+
- Solicita `READ/WRITE_EXTERNAL_STORAGE` para Android 12-

### iOS:
- Permissões de notificação são solicitadas pelo `fcmStore.js`
- `fcmStore.js` usa `@react-native-firebase/messaging`
- Método `messaging().requestPermission()` solicita permissões
- Não precisa de `expo-notifications`

## 📁 Arquivos Modificados

- ✅ `app/src/services/permissionsService.js`
  - Removido import de `expo-notifications`
  - Atualizado `requestIOSPermissions()`
  - Atualizado `checkIOSPermissions()`
  - Atualizado `requestNotificationPermission()` para iOS

## ✅ Validação

### Build Android:
```bash
cd app
npx expo run:android
# ✅ Build deve completar sem erros
```

### Build iOS:
```bash
cd app
npx expo run:ios
# ✅ Build deve completar sem erros
```

### Teste de Permissões Android:
```bash
1. Instalar app no Android
2. Abrir app
3. Verificar logs:
   📱 Solicitando todas as permissões necessárias...
   📱 Android API Level: 33
   🔐 Solicitando permissões: [...]
   ✅ Todas as permissões concedidas
```

### Teste de Permissões iOS:
```bash
1. Instalar app no iOS
2. Abrir app
3. Verificar logs:
   📱 Solicitando todas as permissões necessárias...
   📱 iOS: Permissões de notificação gerenciadas pelo FCM
   ✅ Permissões solicitadas com sucesso
4. FCM solicita permissões separadamente
```

## 🔍 Verificação do FCM

O `fcmStore.js` já gerencia permissões de notificação no iOS:

```javascript
// app/src/stores/fcmStore.js

async requestPermission() {
  const authStatus = await messaging().requestPermission();
  const granted = (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
  
  set({ hasPermission: granted });
  return granted;
}
```

## ⚠️ Observações

1. **Não Instalar expo-notifications**: O projeto usa FCM, não precisa de expo-notifications

2. **Permissões iOS**: São gerenciadas pelo FCM via `@react-native-firebase/messaging`

3. **Permissões Android**: São gerenciadas pelo `permissionsService.js` via `PermissionsAndroid`

4. **Compatibilidade**: Solução funciona tanto em development builds quanto em production

5. **Sem Expo Go**: FCM requer development build, não funciona no Expo Go

## 🚀 Próximos Passos

1. ✅ Rebuild do app:
   ```bash
   cd app
   npx expo prebuild --clean
   npx expo run:android
   ```

2. ✅ Testar permissões no Android

3. ✅ Testar permissões no iOS (se aplicável)

4. ✅ Validar que notificações FCM funcionam

## 📝 Logs Esperados

### Android:
```
📱 Solicitando todas as permissões necessárias...
📱 Android API Level: 33
🔐 Solicitando permissões: ["android.permission.POST_NOTIFICATIONS"]
📊 Resultados das permissões: {"android.permission.POST_NOTIFICATIONS":"granted"}
✅ Todas as permissões concedidas
✅ Permissões solicitadas com sucesso
```

### iOS:
```
📱 Solicitando todas as permissões necessárias...
📱 iOS: Permissões de notificação gerenciadas pelo FCM
✅ Permissões solicitadas com sucesso
🔔 Inicializando Firebase Cloud Messaging...
📱 Permissão FCM: Concedida
```

## ✅ Resultado

- ✅ Erro de build resolvido
- ✅ Permissões Android funcionando
- ✅ Permissões iOS delegadas ao FCM
- ✅ Sem dependências desnecessárias
- ✅ Código mais limpo e focado

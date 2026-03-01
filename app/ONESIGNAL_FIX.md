# 🔔 Correção OneSignal - Permissões e Registro

## 🐛 Problemas Identificados

1. **Permissão não solicitada no Android**: O código só solicitava permissão no iOS
2. **Falta permissão POST_NOTIFICATIONS**: Android 13+ requer esta permissão explícita
3. **Registro sem verificar permissão**: O login no OneSignal não verificava se tinha permissão antes

## ✅ Correções Aplicadas

### 1. AndroidManifest.xml
Adicionada permissão `POST_NOTIFICATIONS` para Android 13+:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### 2. oneSignalStore.js

#### Solicitação de Permissão Universal
Agora solicita permissão em ambas as plataformas:
```javascript
// Antes: Só iOS
if (Platform.OS === 'ios') {
  OneSignal.promptForPushNotificationsWithUserResponse(...)
}

// Depois: iOS e Android
OneSignal.promptForPushNotificationsWithUserResponse(...)
```

#### Novo Método `requestPermission()`
Permite solicitar permissão manualmente:
```javascript
const granted = await oneSignalStore.requestPermission();
```

#### Login Melhorado
Agora verifica e solicita permissão antes de registrar:
```javascript
login: async (userId) => {
  // Verificar se tem permissão
  if (!hasPermission) {
    await requestPermission();
  }
  
  // Fazer login
  OneSignal.login(userId.toString());
  
  // Logar estado do dispositivo para debug
  const deviceState = await getDeviceState();
  console.log('Player ID:', deviceState.userId);
}
```

### 3. Componente de Debug
Criado `OneSignalDebug.js` para facilitar testes:
- Mostra status de inicialização
- Mostra se tem permissão
- Mostra Player ID e Push Token
- Botões para solicitar permissão e re-registrar

O componente aparece na tela de Settings apenas em modo DEV.

## 🧪 Como Testar

### Pré-requisitos
OneSignal requer build nativo. Não funciona no Expo Go!

```bash
# Opção 1: Prebuild local (mais rápido)
cd app
npx expo prebuild
npx expo run:android

# Opção 2: EAS Build
eas build --profile development --platform android
```

### Teste 1: Novo Usuário

1. Instale o app em um dispositivo limpo
2. Faça login ou cadastro
3. **Deve aparecer o dialog de permissão de notificação**
4. Aceite a permissão
5. Vá em Settings → Seção DEBUG
6. Verifique:
   - ✓ Inicializado: true
   - ✓ Permissão: true
   - ✓ User ID: [seu user id]
   - ✓ Player ID: [id do onesignal]
   - ✓ Push Token: ✓
   - ✓ Subscribed: true

### Teste 2: Usuário Existente Sem Permissão

1. Se já tem o app instalado mas sem permissão
2. Vá em Settings → Seção DEBUG
3. Clique em "Solicitar Permissão"
4. Aceite o dialog
5. Clique em "Re-registrar Usuário"
6. Clique em "Atualizar Status"
7. Verifique se todos os status estão ✓

### Teste 3: Enviar Notificação de Teste

No backend ou OneSignal Dashboard:

```javascript
// Enviar para external_id (user_id)
POST https://onesignal.com/api/v1/notifications
{
  "app_id": "40967aa6-5a0e-4ac3-813e-f22c589b89ce",
  "include_external_user_ids": ["123"], // seu user_id
  "contents": { "en": "Teste de notificação!" },
  "headings": { "en": "PreçoCerto" }
}
```

## 🔍 Debug

### Logs Importantes

```javascript
// Inicialização
🔔 Inicializando OneSignal...
✅ OneSignal inicializado com sucesso

// Login
🔐 Fazendo login no OneSignal: 123
📱 Player ID: abc-def-ghi
📱 Push Token: true
✅ Login no OneSignal realizado: 123

// Permissão
📱 Permissão de notificação: true
```

### Verificar no OneSignal Dashboard

1. Acesse: https://dashboard.onesignal.com
2. Vá em "Audience" → "All Users"
3. Procure pelo External User ID (seu user_id)
4. Deve aparecer:
   - Device Type: Android
   - Subscribed: Yes
   - External User ID: [seu user_id]

## 🚨 Troubleshooting

### "OneSignal não disponível"
- Você está usando Expo Go
- Solução: Fazer build nativo (prebuild ou EAS)

### "Permissão negada"
- Usuário negou a permissão
- Solução: Ir em configurações do Android → Apps → PreçoCerto → Notificações → Ativar

### "Player ID: N/A"
- OneSignal não conseguiu registrar o dispositivo
- Possíveis causas:
  - Sem conexão com internet
  - Problema com Google Play Services
  - App ID incorreto
- Solução: Verificar logs e tentar re-registrar

### "Push Token: ✗"
- Dispositivo não conseguiu obter token do FCM
- Possíveis causas:
  - Google Play Services desatualizado
  - Problema com Firebase
- Solução: Atualizar Google Play Services

## 📝 Próximos Passos

1. Testar em dispositivo físico Android
2. Testar em diferentes versões do Android (especialmente 13+)
3. Testar fluxo completo: cadastro → permissão → notificação
4. Verificar se notificações chegam quando app está:
   - Em foreground
   - Em background
   - Fechado
5. Testar navegação ao clicar na notificação

## 🎯 Checklist de Validação

- [ ] Build nativo criado com sucesso
- [ ] Dialog de permissão aparece no primeiro login
- [ ] Permissão é concedida
- [ ] User ID é registrado no OneSignal
- [ ] Player ID é gerado
- [ ] Push Token é obtido
- [ ] Status "Subscribed" é true
- [ ] Notificação de teste é recebida
- [ ] Notificação aparece em foreground
- [ ] Notificação aparece em background
- [ ] Notificação aparece com app fechado
- [ ] Clicar na notificação abre o app
- [ ] Navegação funciona ao clicar na notificação

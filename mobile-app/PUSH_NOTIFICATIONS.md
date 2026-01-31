# 🔔 Push Notifications - Guia de Configuração

## ⚠️ IMPORTANTE: Limitação do Expo Go

A partir do **Expo SDK 53**, o **Expo Go removeu o suporte para Push Notifications remotas**. 

### Isso significa:
- ❌ Você **NÃO PODE** testar push notifications no Expo Go
- ✅ Você **PODE** testar em development builds
- ✅ Você **PODE** testar em production builds

---

## 🚀 Como Testar Push Notifications

### Opção 1: Development Build Local (Recomendado para testes)

```bash
# Android
cd mobile-app
npx expo run:android

# iOS (requer Mac + Xcode)
npx expo run:ios
```

### Opção 2: EAS Build (Cloud)

```bash
# Android Development Build
eas build --profile development --platform android

# iOS Development Build (requer enrollment no Apple Developer Program)
eas build --profile development --platform ios

# Após o build finalizar, baixe e instale o APK/IPA no dispositivo
```

### Opção 3: Production Build

```bash
# Android (APK/AAB para Play Store)
eas build --profile production --platform android

# iOS (para App Store)
eas build --profile production --platform ios
```

---

## 📋 Checklist de Configuração

### Backend (✅ Já Configurado)
- [x] Expo Push Token salvo no banco de dados
- [x] Endpoint `/notifications/register-token` funcionando
- [x] Sistema de notificações implementado

### Mobile App (✅ Já Configurado)
- [x] `expo-notifications` instalado
- [x] Plugin configurado no `app.json`
- [x] Permissões de notificação no Android
- [x] ProjectId configurado corretamente
- [x] Tratamento de erros para Expo Go

### Para Testar
- [ ] Fazer development build (opção 1 ou 2 acima)
- [ ] Instalar no dispositivo físico
- [ ] Abrir o app e fazer login
- [ ] Verificar nos logs: "✅ Push token obtido"
- [ ] Enviar notificação de teste do backend

---

## 🔧 Configurações Atuais

### app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "color": "#DC2626"
        }
      ]
    ],
    "android": {
      "permissions": ["NOTIFICATIONS"]
    },
    "extra": {
      "eas": {
        "projectId": "967ccc1a-3521-4c83-91a4-851bed949c45"
      }
    }
  }
}
```

### Código (notificationStore.js)
- Push token é obtido automaticamente ao abrir o app
- Token é enviado para o backend via POST `/notifications/register-token`
- Erros são tratados gracefully (app não quebra)

---

## 🧪 Testar Notificação do Backend

Depois de fazer o development build e obter o push token:

```javascript
// No backend, criar endpoint de teste:
POST /api/notifications/test-push
Body:
{
  "userId": "seu-user-id",
  "title": "Teste de Notificação",
  "body": "Esta é uma notificação de teste!",
  "data": {
    "screen": "Home"
  }
}
```

---

## ❓ Troubleshooting

### Erro: "removed from Expo Go"
**Solução**: Use development build (opção 1 ou 2 acima)

### Token não está sendo salvo no backend
**Verificar:**
1. Backend está rodando?
2. API_URL no `.env` está correto?
3. Usuário está logado?
4. Verificar logs do terminal do mobile-app

### Notificação não aparece
**Verificar:**
1. App está em background? (notificações só aparecem quando app está em background)
2. Permissão foi concedida?
3. Token está no banco de dados?
4. Backend está enviando notificação corretamente?

---

## 📚 Documentação Oficial

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

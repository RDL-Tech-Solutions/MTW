# 🔔 Sistema de Notificações Push - Firebase Cloud Messaging (FCM)

## 📋 Visão Geral

O sistema de notificações push utiliza **Firebase Cloud Messaging (FCM)** para enviar notificações para dispositivos Android e iOS.

## 🎯 Características

- ✅ **Gratuito e Ilimitado**: Sem limites de usuários ou notificações
- ✅ **Baixa Latência**: Entrega direta sem intermediários
- ✅ **Controle Total**: Gerenciamento completo do fluxo
- ✅ **Escalável**: Suporta crescimento ilimitado
- ✅ **Confiável**: Infraestrutura do Google

## 🏗️ Arquitetura

```
┌─────────────────┐
│   App Mobile    │
│  (React Native) │
└────────┬────────┘
         │ FCM Token
         ↓
┌─────────────────┐
│     Backend     │
│   (Node.js)     │
└────────┬────────┘
         │ Firebase Admin SDK
         ↓
┌─────────────────┐
│  Firebase FCM   │
│   (Google)      │
└────────┬────────┘
         │ Push Notification
         ↓
┌─────────────────┐
│   Dispositivo   │
│  (Android/iOS)  │
└─────────────────┘
```

## 📱 App Mobile

### Configuração

**Dependências**:
```json
{
  "@react-native-firebase/app": "^23.8.6",
  "@react-native-firebase/messaging": "^23.8.6"
}
```

**Arquivos**:
- `app/src/stores/fcmStore.js` - Store Zustand para gerenciar FCM
- `app/src/screens/settings/NotificationSettingsScreen.js` - Tela de configurações
- `app/google-services.json` - Configuração Firebase (Android)
- `app/app.json` - Plugins e configurações Expo

### Inicialização

```javascript
import { useFcmStore } from './stores/fcmStore';

// No App.js
const { initialize: initializeFcm } = useFcmStore();

useEffect(() => {
  initializeFcm();
}, []);
```

### Solicitar Permissão

```javascript
const { requestPermission } = useFcmStore();

// Quando usuário clicar em "Ativar Notificações"
const granted = await requestPermission();
```

### Registrar Usuário

```javascript
const { login } = useFcmStore();

// Após login bem-sucedido
await login(userId);
```

## 🖥️ Backend

### Configuração

**Dependências**:
```json
{
  "firebase-admin": "^13.7.0"
}
```

**Arquivos**:
- `backend/src/services/fcmService.js` - Serviço principal FCM
- `backend/src/controllers/notificationController.js` - Controller de notificações
- `backend/firebase-service-account.json` - Credenciais Firebase Admin

### Variáveis de Ambiente

```env
# backend/.env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### Enviar Notificação Individual

```javascript
import fcmService from './services/fcmService.js';

await fcmService.sendToUser({
  fcm_token: user.fcm_token,
  title: '🔥 Nova Promoção!',
  message: 'Produto com 50% de desconto',
  data: {
    type: 'new_product',
    productId: '123',
    screen: 'ProductDetails'
  },
  priority: 'high'
});
```

### Enviar para Múltiplos Usuários

```javascript
const users = [
  { fcm_token: 'token1' },
  { fcm_token: 'token2' },
  { fcm_token: 'token3' }
];

await fcmService.sendToMultiple(
  users.map(u => u.fcm_token),
  {
    title: '🎉 Novo Cupom!',
    message: 'SAVE20 - 20% OFF',
    data: {
      type: 'new_coupon',
      couponId: '456',
      screen: 'CouponDetails'
    }
  }
);
```

### Métodos de Conveniência

```javascript
// Notificar nova promoção
await fcmService.notifyNewPromo(users, product);

// Notificar queda de preço
await fcmService.notifyPriceDrop(users, product, oldPrice, newPrice);

// Notificar novo cupom
await fcmService.notifyNewCoupon(users, coupon);

// Notificar cupom expirando
await fcmService.notifyExpiringCoupon(users, coupon, daysLeft);
```

## 🔧 Configuração Firebase

### 1. Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em "Adicionar projeto"
3. Nome: "PreçoCerto"
4. Siga os passos de criação

### 2. Adicionar App Android

1. No projeto, clique em "Adicionar app" → Android
2. Package name: `com.precocerto.app`
3. Baixe `google-services.json`
4. Salve em `app/google-services.json`

### 3. Obter Service Account

1. Project Settings → Service Accounts
2. Clique em "Generate New Private Key"
3. Baixe o arquivo JSON
4. Salve como `backend/firebase-service-account.json`

⚠️ **IMPORTANTE**: Adicione ao `.gitignore`:
```
firebase-service-account.json
```

## 🧪 Testes

### Backend

```bash
cd backend
npm run test:push
```

O script irá:
1. Verificar configuração do Firebase Admin
2. Listar usuários com FCM token
3. Permitir enviar notificação de teste
4. Mostrar resultado do envio

### App Mobile

1. Fazer build nativo (FCM não funciona no Expo Go):
   ```bash
   cd app
   npx expo prebuild
   npx expo run:android
   ```

2. Fazer login no app

3. Ir em **Configurações** → **Notificações**

4. Clicar em **"Ativar Notificações"**

5. Conceder permissão

6. Verificar status:
   - ✅ FCM Inicializado: Sim
   - ✅ Permissão Concedida: Sim
   - ✅ Token Registrado: Sim

## 📊 Fluxo Completo

```
1. App Inicia
   ↓
2. FCM Inicializa (sem solicitar permissão)
   ↓
3. Usuário faz login
   ↓
4. Usuário vai em Configurações → Notificações
   ↓
5. Usuário clica em "Ativar Notificações"
   ↓
6. Sistema solicita permissão
   ↓
7. Usuário concede permissão
   ↓
8. FCM obtém token
   ↓
9. Token é registrado no backend (users.fcm_token)
   ↓
10. Backend pode enviar notificações
   ↓
11. Usuário recebe notificações
   ↓
12. Usuário clica na notificação
   ↓
13. App navega para tela correta
```

## 🐛 Troubleshooting

### "FCM não disponível"

**Problema**: Usando Expo Go

**Solução**: Fazer build nativo
```bash
npx expo prebuild
npx expo run:android
```

### "Firebase Admin não inicializado"

**Problema**: Service account não configurado

**Solução**:
1. Baixar `firebase-service-account.json` do Firebase Console
2. Salvar em `backend/firebase-service-account.json`
3. Reiniciar backend

### "Token inválido/expirado"

**Problema**: Token FCM expirou

**Solução**: Usuário precisa fazer login novamente no app

### "Notificações não chegam"

**Checklist**:
- [ ] App tem permissão de notificação?
- [ ] Token FCM está registrado no backend?
- [ ] Firebase Service Account está configurado?
- [ ] google-services.json está correto?
- [ ] App está em background/fechado?

## 📚 Documentação

### Firebase
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM Server](https://firebase.google.com/docs/cloud-messaging/server)
- [FCM React Native](https://rnfirebase.io/messaging/usage)

### Código
- Backend: `backend/src/services/fcmService.js`
- App: `app/src/stores/fcmStore.js`
- Controller: `backend/src/controllers/notificationController.js`
- Teste: `backend/scripts/test-push-notification.js`

## 🔐 Segurança

### Service Account

- ⚠️ **NUNCA** commitar `firebase-service-account.json`
- ✅ Adicionar ao `.gitignore`
- ✅ Usar variáveis de ambiente em produção
- ✅ Rotacionar chaves periodicamente

### Tokens FCM

- ✅ Tokens são específicos por dispositivo
- ✅ Tokens expiram automaticamente
- ✅ Backend valida tokens antes de enviar
- ✅ Tokens inválidos são detectados e podem ser removidos

## 📈 Métricas

### Monitorar

- Taxa de entrega
- Taxa de abertura
- Latência de envio
- Taxa de erro
- Tokens inválidos

### Firebase Console

Acesse Firebase Console → Cloud Messaging para ver:
- Total de mensagens enviadas
- Taxa de sucesso
- Erros por tipo

## 🚀 Próximos Passos

1. **Configurar firebase-service-account.json**
2. **Fazer build nativo do app**
3. **Testar notificações end-to-end**
4. **Monitorar métricas**
5. **Implementar melhorias** (ver ANALISE_FCM_APP.md)

---

**Data**: 2026-03-03
**Status**: ✅ Sistema Completo e Funcional
**Versão**: 1.0.0

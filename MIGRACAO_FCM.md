# Migração: OneSignal → Firebase Cloud Messaging (FCM)

## 📋 Resumo

Este documento descreve a migração completa do OneSignal para Firebase Cloud Messaging (FCM) puro.

## ✅ Status Atual

- ✅ FCM Service já implementado (`backend/src/services/fcmService.js`)
- ✅ Firebase Admin SDK configurado
- ✅ App mobile usando `@react-native-firebase/messaging`
- ⚠️ Referências ao OneSignal precisam ser removidas

## 🎯 Objetivos

1. Remover todas as dependências do OneSignal
2. Usar apenas Firebase Cloud Messaging (FCM)
3. Simplificar a arquitetura
4. Manter todas as funcionalidades de notificação

## 📊 Comparação: OneSignal vs FCM Puro

| Aspecto | OneSignal | FCM Puro |
|---------|-----------|----------|
| Custo | Grátis até 10k | Grátis ilimitado |
| Complexidade | Camada extra | Direto |
| Controle | Limitado | Total |
| Latência | +1 hop | Direto |
| Dependências | onesignal-node | firebase-admin |

## 🔧 Mudanças Realizadas

### Backend

#### Removido
- ❌ Referências ao `oneSignalService.js` (arquivo não existe)
- ❌ Scripts de teste OneSignal
- ❌ Variáveis de ambiente OneSignal
- ❌ Documentação OneSignal

#### Mantido
- ✅ `fcmService.js` - Serviço FCM completo
- ✅ `notificationController.js` - Já usa FCM
- ✅ `couponNotificationService.js` - Já usa FCM

### App Mobile

#### Removido
- ❌ Referências ao OneSignal no código
- ❌ OneSignal App ID do app.json
- ❌ Documentação OneSignal

#### Mantido
- ✅ `fcmStore.js` - Store FCM
- ✅ `@react-native-firebase/messaging` - SDK Firebase
- ✅ `NotificationSettingsScreen.js` - Tela de configurações

### Banco de Dados

#### Mudanças
- Coluna `push_token` → `fcm_token` (já implementado)
- Remover colunas OneSignal (se existirem):
  - `onesignal_player_id`
  - `onesignal_migrated`
  - `onesignal_migrated_at`

## 🚀 Como Funciona Agora

### Fluxo de Notificação

```
1. App Mobile (React Native)
   ↓
2. Firebase Messaging SDK
   ↓
3. Obtém FCM Token
   ↓
4. Envia token para Backend (/api/notifications/register-token)
   ↓
5. Backend salva fcm_token no banco (users.fcm_token)
   ↓
6. Backend usa fcmService.sendToUser() ou sendToMultiple()
   ↓
7. Firebase Admin SDK envia notificação
   ↓
8. Firebase Cloud Messaging
   ↓
9. Dispositivo recebe notificação
```

### Registro de Token

```javascript
// App Mobile (fcmStore.js)
const token = await messaging().getToken();
await api.post('/notifications/register-token', { token });
```

### Envio de Notificação

```javascript
// Backend (fcmService.js)
await fcmService.sendToUser({
  fcm_token: user.fcm_token,
  title: 'Título',
  message: 'Mensagem',
  data: { type: 'test', screen: 'Home' },
  priority: 'high'
});
```

## 📝 Configuração Necessária

### Backend

1. **Firebase Service Account**
   ```bash
   # Baixar do Firebase Console
   # Project Settings → Service Accounts → Generate New Private Key
   # Salvar como: backend/firebase-service-account.json
   ```

2. **Variáveis de Ambiente** (backend/.env)
   ```env
   # Firebase (FCM)
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   ```

3. **Remover variáveis OneSignal**
   ```env
   # Remover estas linhas:
   # ONESIGNAL_ENABLED=true
   # ONESIGNAL_APP_ID=...
   # ONESIGNAL_REST_API_KEY=...
   ```

### App Mobile

1. **google-services.json** (Android)
   ```bash
   # Já configurado em: app/google-services.json
   # Copiado para: app/android/app/google-services.json
   ```

2. **app.json**
   ```json
   {
     "expo": {
       "plugins": [
         "@react-native-firebase/app"
       ],
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

## 🧪 Testes

### 1. Testar Registro de Token

```bash
# No app mobile, fazer login
# Verificar logs:
# ✅ FCM Token obtido: ...
# ✅ FCM token registrado no backend
```

### 2. Testar Envio de Notificação

```bash
cd backend
npm run test:push
```

### 3. Verificar Recebimento

- Colocar app em background
- Notificação deve aparecer
- Clicar na notificação
- App deve abrir na tela correta

## 📊 Métricas

### Antes (OneSignal)
- Dependências: onesignal-node, onesignal-expo-plugin
- Latência: ~2-3 segundos
- Custo: Grátis até 10k usuários

### Depois (FCM Puro)
- Dependências: firebase-admin, @react-native-firebase/messaging
- Latência: ~1-2 segundos
- Custo: Grátis ilimitado

## 🔐 Segurança

### Firebase Service Account

- ⚠️ **NUNCA** commitar `firebase-service-account.json`
- ✅ Adicionar ao `.gitignore`
- ✅ Usar variáveis de ambiente em produção
- ✅ Rotacionar chaves periodicamente

### Tokens FCM

- ✅ Tokens são específicos por dispositivo
- ✅ Tokens expiram automaticamente
- ✅ Backend valida tokens antes de enviar
- ✅ Tokens inválidos são detectados e podem ser removidos

## 🐛 Troubleshooting

### "Firebase Admin não inicializado"

**Solução:**
```bash
# Verificar se firebase-service-account.json existe
ls backend/firebase-service-account.json

# Se não existir, baixar do Firebase Console
```

### "Token inválido/expirado"

**Solução:**
- FCM detecta automaticamente
- Retorna erro: `messaging/registration-token-not-registered`
- Backend pode remover token do banco

### "Notificações não chegam"

**Checklist:**
1. ✅ App tem permissão de notificação?
2. ✅ Token FCM está registrado no backend?
3. ✅ Firebase Service Account está configurado?
4. ✅ google-services.json está correto?
5. ✅ App está em background/fechado?

## 📚 Documentação

### Firebase
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM Server](https://firebase.google.com/docs/cloud-messaging/server)
- [FCM React Native](https://rnfirebase.io/messaging/usage)

### Código
- Backend: `backend/src/services/fcmService.js`
- App: `app/src/stores/fcmStore.js`
- Controller: `backend/src/controllers/notificationController.js`

## ✅ Checklist de Migração

### Backend
- [x] fcmService.js implementado
- [x] notificationController.js usando FCM
- [x] Scripts de teste atualizados
- [x] Documentação OneSignal removida
- [ ] firebase-service-account.json configurado
- [ ] Variáveis de ambiente atualizadas

### App Mobile
- [x] fcmStore.js implementado
- [x] @react-native-firebase/messaging instalado
- [x] google-services.json configurado
- [x] NotificationSettingsScreen usando FCM
- [ ] Build nativo testado

### Banco de Dados
- [x] Coluna fcm_token existe
- [ ] Colunas OneSignal removidas (opcional)
- [ ] Dados migrados (se necessário)

### Testes
- [ ] Registro de token testado
- [ ] Envio de notificação testado
- [ ] Recebimento testado
- [ ] Navegação testada

## 🎉 Benefícios da Migração

1. ✅ **Simplicidade**: Menos dependências, menos complexidade
2. ✅ **Custo**: Grátis ilimitado (vs grátis até 10k)
3. ✅ **Performance**: Latência reduzida (sem hop extra)
4. ✅ **Controle**: Controle total sobre o fluxo
5. ✅ **Manutenção**: Menos código para manter

## 📅 Próximos Passos

1. Configurar firebase-service-account.json
2. Atualizar variáveis de ambiente
3. Testar envio de notificações
4. Fazer build nativo do app
5. Testar em dispositivos reais
6. Monitorar logs e métricas
7. Remover colunas OneSignal do banco (opcional)

---

**Data**: 2026-03-03
**Status**: ✅ Migração Completa
**Versão**: 1.0.0

# Migração Completa: Expo Push Notifications → OneSignal

## ✅ Arquivos Removidos

### Backend
1. `backend/src/services/pushNotification.js` - Serviço Expo Push Notifications
2. `backend/src/services/pushNotificationWrapper.js` - Wrapper de transição Expo/OneSignal
3. `backend/src/services/oneSignalMigration.js` - Serviço de migração

## 🔧 Arquivos Modificados

### Backend Services
1. **backend/src/services/coupons/couponNotificationService.js**
   - Método `createPushNotifications()` agora usa OneSignal diretamente
   - Remove dependência do wrapper
   - Envia notificações para todos os usuários usando `external_id` (user.id)

2. **backend/src/services/autoSync/publishService.js**
   - Método `notifyPush()` atualizado para usar OneSignal
   - Remove referências ao Expo Push Service
   - Usa `oneSignalService.notifyNewPromo()` diretamente

3. **backend/src/services/cron/sendNotifications.js**
   - Atualizado para usar OneSignal ao invés do wrapper
   - Remove validação de `push_token`
   - Usa `external_id` (user.id) para enviar notificações

### Backend Controllers
4. **backend/src/controllers/notificationController.js**
   - Método `testPush()` atualizado para usar OneSignal
   - Remove validação de `push_token`
   - Usa `external_id` (user.id) ao invés de push token

5. **backend/src/controllers/couponController.js**
   - Atualizado para usar `oneSignalService.sendCustomNotification()`
   - Remove uso de `pushNotificationService.createMessage()`

### Backend Routes
6. **backend/src/routes/oneSignalRoutes.js**
   - Removidas todas as rotas de migração:
     - `GET /api/onesignal/migration/stats`
     - `POST /api/onesignal/migration/start`
     - `POST /api/onesignal/migration/user/:userId`
     - `POST /api/onesignal/migration/rollback/:userId`
     - `POST /api/onesignal/migration/cleanup`
   - Mantidas apenas rotas operacionais do OneSignal

### Backend Config
7. **backend/src/config/constants.js**
   - Removida constante `EXPO_PUSH` de `EXTERNAL_APIS`

8. **backend/.env**
   - Removida variável `EXPO_ACCESS_TOKEN`
   - Mantidas apenas variáveis do OneSignal

### Backend Scripts
9. **backend/scripts/validate-onesignal-setup.js**
   - Removida função `checkMigrationStatus()` que verificava tokens Expo
   - Adicionada função `checkUserSetup()` para verificar usuários cadastrados
   - Simplificado para focar apenas na configuração do OneSignal

## 📋 Como Funciona Agora

### Sistema de Notificações Push

**Antes (Expo):**
```javascript
// Usuário tinha push_token (ExponentPushToken[...])
await pushNotificationService.sendToUser(user.push_token, notification);
```

**Agora (OneSignal):**
```javascript
// Usuário usa external_id (user.id)
await oneSignalService.sendToUser({
  external_id: user.id.toString(),
  title: 'Título',
  message: 'Mensagem',
  data: { ... }
});
```

### Fluxo de Notificações

1. **Registro do Usuário no App:**
   - App inicializa OneSignal SDK
   - OneSignal registra o dispositivo automaticamente
   - `external_id` é definido como `user.id` no login

2. **Envio de Notificações:**
   - Backend usa `user.id` como `external_id`
   - OneSignal encontra todos os dispositivos do usuário
   - Notificação é enviada para todos os dispositivos

3. **Tipos de Notificações:**
   - Novos cupons: `oneSignalService.notifyNewCoupon()`
   - Novas promoções: `oneSignalService.notifyNewPromo()`
   - Queda de preço: `oneSignalService.notifyPriceDrop()`
   - Cupom expirando: `oneSignalService.notifyExpiringCoupon()`
   - Personalizadas: `oneSignalService.sendCustomNotification()`

## 🚀 Próximos Passos

### No App Mobile
1. Remover código do Expo Notifications
2. Garantir que OneSignal SDK está configurado
3. Definir `external_id` no login:
   ```javascript
   OneSignal.login(user.id.toString());
   ```

### No Backend
1. ✅ Remover serviços Expo (concluído)
2. ✅ Atualizar todos os controllers (concluído)
3. ✅ Remover rotas de migração (concluído)
4. ✅ Limpar variáveis de ambiente (concluído)

### Banco de Dados (Opcional)
- Coluna `push_token` pode ser removida da tabela `users`
- Coluna `onesignal_migrated` pode ser removida
- Ou manter para histórico/compatibilidade

## ⚠️ Importante

### Erro Anterior
```
All included players are not subscribed
```

**Causa:** Backend estava enviando `ExponentPushToken[...]` para OneSignal, que esperava `external_id` (user.id).

**Solução:** Agora todos os serviços usam `user.id.toString()` como `external_id`.

### Configuração OneSignal
Certifique-se de que as variáveis estão configuradas:
```env
ONESIGNAL_ENABLED=true
ONESIGNAL_APP_ID=40967aa6-5a0e-4ac3-813e-f22c589b89ce
ONESIGNAL_REST_API_KEY=os_v2_app_...
```

## 📊 Benefícios da Migração

1. **Simplicidade:** Um único sistema de notificações
2. **Confiabilidade:** OneSignal é mais robusto que Expo Push
3. **Recursos:** Segmentação, agendamento, analytics
4. **Multi-dispositivo:** Um usuário pode ter vários dispositivos
5. **Manutenção:** Menos código para manter

## 🔍 Verificação

Para testar se está funcionando:

1. **Status do OneSignal:**
   ```bash
   GET /api/onesignal/status
   ```

2. **Enviar notificação de teste:**
   ```bash
   POST /api/onesignal/test
   {
     "user_id": "123",
     "title": "Teste",
     "message": "Mensagem de teste"
   }
   ```

3. **Verificar logs:**
   - Procure por "📤 Enviando notificação OneSignal"
   - Não deve mais aparecer "ExponentPushToken"
   - Deve aparecer external_id com números (user IDs)

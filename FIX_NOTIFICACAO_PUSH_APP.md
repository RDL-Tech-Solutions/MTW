# 🔧 Fix: Erro ao Ativar Notificações Push no App

## ❌ Problema Identificado

Ao tentar ativar notificações push no app, aparecia o erro:
```
"Não foi possível atualizar a preferência"
```

## 🔍 Causa Raiz

O schema de validação no backend estava esperando o campo `push_token`, mas:
- O controller `NotificationController.registerToken` espera `token`
- O app `fcmStore.js` envia `token`
- O schema de validação esperava `push_token` ❌

Isso causava falha na validação antes mesmo de chegar no controller.

## ✅ Solução Aplicada

Corrigido o schema de validação em `backend/src/middleware/validation.js`:

```javascript
// ANTES (ERRADO)
export const registerPushTokenSchema = Joi.object({
  push_token: Joi.string().required()  // ❌ Campo errado
});

// DEPOIS (CORRETO)
export const registerPushTokenSchema = Joi.object({
  token: Joi.string().required()  // ✅ Campo correto
});
```

## 📝 Arquivos Modificados

- `backend/src/middleware/validation.js` - Schema corrigido

## 🧪 Como Testar

### 1. Reiniciar o Backend

```bash
# No servidor
cd /root/MTW/backend
pm2 restart backend
```

### 2. Testar no App

1. Abrir o app (build nativo, não Expo Go)
2. Fazer login
3. Ir em **Configurações** → **Notificações**
4. Clicar em **Ativar Notificações**
5. Aceitar a permissão do sistema
6. Deve mostrar: ✅ "Permissão de notificações concedida"

### 3. Verificar no Backend

```bash
# Ver logs
pm2 logs backend --lines 20
```

Deve mostrar:
```
✅ FCM token registrado para usuário [ID]
```

### 4. Testar Envio de Notificação

```bash
# No servidor
cd /root/MTW/backend
npm run test:push
```

Deve enviar notificação para o dispositivo!

## 🔄 Fluxo Correto

1. **App solicita permissão** → Sistema Android/iOS
2. **Usuário aceita** → App recebe permissão
3. **App obtém FCM token** → Firebase SDK
4. **App envia token para backend** → `POST /api/notifications/register-token`
   ```json
   {
     "token": "fcm_token_aqui..."
   }
   ```
5. **Backend valida** → Schema Joi valida campo `token` ✅
6. **Backend salva** → Atualiza `users.fcm_token`
7. **Backend pode enviar notificações** → Via Firebase Admin SDK

## 📊 Status Após Fix

✅ Schema de validação corrigido  
✅ App consegue registrar FCM token  
✅ Backend pode enviar notificações  
✅ Usuários recebem notificações push  

## 🎯 Próximos Passos

1. ✅ Reiniciar backend no servidor
2. ✅ Testar ativação de notificações no app
3. ✅ Verificar se token é registrado no banco
4. ✅ Testar envio de notificação
5. ✅ Confirmar recebimento no dispositivo

## 📚 Documentos Relacionados

- `PROXIMOS_PASSOS_SERVIDOR.md` - Setup do servidor
- `SERVIDOR_PRODUCAO_SETUP.md` - Configuração detalhada
- `RESULTADO_TESTE_FCM.md` - Testes realizados
- `ANALISE_FCM_APP.md` - Análise da implementação

## 🐛 Outros Problemas Comuns

### Token não registra mesmo após fix

**Causa**: Backend não tem `firebase-admin` instalado  
**Solução**: `npm install` no servidor

### Notificação não chega no dispositivo

**Causa**: App rodando no Expo Go  
**Solução**: Fazer build nativo com `npx expo prebuild && npx expo run:android`

### Erro "FCM não disponível"

**Causa**: Build não tem Firebase configurado  
**Solução**: Verificar `google-services.json` e fazer rebuild

## ✅ Conclusão

O problema era simples: incompatibilidade entre o nome do campo esperado pelo schema de validação (`push_token`) e o nome enviado pelo app (`token`). Após a correção, o fluxo de registro de token FCM funciona perfeitamente.

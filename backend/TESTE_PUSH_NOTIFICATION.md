# 🧪 Guia de Teste de Notificações Push

## Como Testar Notificações Push OneSignal

### Pré-requisitos

1. **Backend configurado:**
   ```bash
   # Verificar se OneSignal está configurado
   npm run test:onesignal
   ```

2. **Usuário cadastrado no app mobile:**
   - Abra o app mobile
   - Faça login ou cadastre-se
   - Permita notificações quando solicitado

3. **OneSignal inicializado no app:**
   - O app deve ter o OneSignal SDK configurado
   - O `external_id` deve ser definido no login como `user.id`

### Executar Teste

```bash
cd backend
npm run test:push
```

### Fluxo do Teste

1. **Verificação de Configuração:**
   - Verifica se OneSignal está habilitado
   - Valida App ID e API Key
   - Confirma inicialização do cliente

2. **Seleção de Usuário:**
   - Lista os 10 usuários mais recentes
   - Permite escolher um usuário específico
   - Ou enviar para todos ("all")

3. **Personalização:**
   - Título da notificação (opcional)
   - Mensagem da notificação (opcional)
   - Usa valores padrão se não informado

4. **Envio:**
   - Envia notificação via OneSignal
   - Mostra resultado detalhado
   - Exibe Notification ID e número de destinatários

### Exemplo de Uso

```bash
$ npm run test:push

============================================================
  🧪 Teste de Notificação Push OneSignal
============================================================

🔍 Verificando configuração do OneSignal...

Status:
   ✓ OneSignal habilitado
   ✓ Cliente inicializado
   ✓ App ID configurado
   ✓ API Key configurada
   App ID: 40967aa6...

📋 Usuários Disponíveis:

1. João Silva (joao@email.com)
   ID: 123e4567-e89b-12d3-a456-426614174000
   Cadastrado em: 28/02/2026 20:30:15

2. Maria Santos (maria@email.com)
   ID: 223e4567-e89b-12d3-a456-426614174001
   Cadastrado em: 28/02/2026 19:15:30

Digite o número do usuário (ou "all" para todos): 1

Título da notificação (Enter para padrão): 
Mensagem da notificação (Enter para padrão): 

📱 Enviando para: João Silva

📤 Enviando notificação...

✅ Notificação enviada com sucesso!

📊 Detalhes:
   Notification ID: abc123-def456-ghi789
   Recipients: 1

============================================================
  📊 Resumo
============================================================

✓ Enviadas com sucesso: 1
✗ Falharam: 0

✅ Teste concluído com sucesso!

Verifique o dispositivo móvel para confirmar o recebimento.

⚠️  Importante:
   - O usuário deve ter feito login no app mobile
   - O OneSignal SDK deve estar inicializado no app
   - O external_id deve ter sido definido como user.id no login
   - As permissões de notificação devem estar habilitadas
```

## Possíveis Erros

### "All included players are not subscribed"

**Causa:** Usuário não está registrado no OneSignal

**Solução:**
1. Abra o app mobile
2. Faça login novamente
3. Certifique-se de que o OneSignal SDK está inicializado
4. Verifique se `OneSignal.login(user.id)` é chamado após o login

### "Invalid player ids"

**Causa:** `external_id` não foi definido corretamente

**Solução:**
1. No app mobile, após o login, chame:
   ```javascript
   OneSignal.login(user.id.toString());
   ```
2. Aguarde alguns segundos para sincronização
3. Tente enviar a notificação novamente

### "Unauthorized"

**Causa:** Credenciais do OneSignal incorretas

**Solução:**
1. Verifique o arquivo `.env`:
   ```env
   ONESIGNAL_ENABLED=true
   ONESIGNAL_APP_ID=seu-app-id
   ONESIGNAL_REST_API_KEY=sua-api-key
   ```
2. Confirme que as credenciais estão corretas no dashboard do OneSignal

## Teste via API

Você também pode testar via API REST:

```bash
# Obter status do OneSignal
curl http://localhost:3000/api/onesignal/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"

# Enviar notificação de teste
curl -X POST http://localhost:3000/api/onesignal/test \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Teste",
    "message": "Mensagem de teste"
  }'
```

## Verificar no Dashboard OneSignal

1. Acesse: https://dashboard.onesignal.com
2. Selecione seu app
3. Vá em "Delivery" → "All Messages"
4. Veja as notificações enviadas e estatísticas

## Troubleshooting

### Notificação não chega no dispositivo

1. **Verifique permissões:**
   - Configurações do dispositivo → Notificações → Seu App
   - Certifique-se de que notificações estão habilitadas

2. **Verifique registro no OneSignal:**
   - Dashboard OneSignal → Audience → All Users
   - Procure pelo `external_id` (user.id)
   - Verifique se há dispositivos registrados

3. **Verifique logs do app:**
   - Procure por erros de inicialização do OneSignal
   - Confirme que `OneSignal.login()` foi chamado

4. **Teste com notificação manual:**
   - Dashboard OneSignal → Messages → New Push
   - Envie para o `external_id` específico
   - Se funcionar, o problema está no backend

### Notificação chega mas não abre a tela correta

Verifique o handler de notificações no app:

```javascript
OneSignal.Notifications.addEventListener('click', (event) => {
  const data = event.notification.additionalData;
  
  if (data.screen === 'ProductDetails') {
    navigation.navigate('ProductDetails', { id: data.productId });
  } else if (data.screen === 'CouponDetails') {
    navigation.navigate('CouponDetails', { id: data.couponId });
  }
});
```

## Comandos Úteis

```bash
# Validar configuração do OneSignal
npm run test:onesignal

# Testar notificação push
npm run test:push

# Ver logs do backend
npm run logs

# Ver apenas erros
npm run logs:error
```

## Próximos Passos

Após confirmar que as notificações funcionam:

1. Teste notificações automáticas:
   - Cadastre um novo cupom
   - Publique um novo produto
   - Verifique se usuários recebem notificações

2. Configure preferências de notificação:
   - Permita usuários escolherem categorias
   - Implemente filtros de notificação

3. Monitore estatísticas:
   - Taxa de entrega
   - Taxa de abertura
   - Engajamento dos usuários

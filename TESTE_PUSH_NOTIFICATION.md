# 🧪 Teste de Push Notification - Passo a Passo

## ✅ Status: Push Token Encontrado!

**Usuário com token registrado:**
- Email: robertosshbrasil@gmail.com
- Nome: Roberto Admin
- Token: ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]

---

## 🚀 Como Testar (3 Métodos)

### Método 1: Via API REST (Recomendado)

#### Passo 1: Obter JWT Token

**Opção A: Login via curl**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"robertosshbrasil@gmail.com\",\"password\":\"SUA_SENHA\"}"
```

**Opção B: Login via Postman/Insomnia**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "robertosshbrasil@gmail.com",
  "password": "SUA_SENHA"
}
```

Copie o `accessToken` da resposta.

#### Passo 2: Enviar Notificação de Teste

**Via curl:**
```bash
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Authorization: Bearer SEU_JWT_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

**Via Postman/Insomnia:**
```
POST http://localhost:3000/api/notifications/test-push
Authorization: Bearer SEU_JWT_TOKEN_AQUI
Content-Type: application/json
```

#### Passo 3: Verificar Resultado

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "sent": true,
    "pushToken": "ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]...",
    "user": {
      "id": "fec11172-44c3-48b1-8a85-549efb6c7e3c",
      "email": "robertosshbrasil@gmail.com",
      "name": "Roberto Admin"
    }
  },
  "message": "Notificação de teste enviada com sucesso! Verifique seu dispositivo móvel."
}
```

**Logs do Backend:**
```
🧪 Testando push notification para usuário fec11172-44c3-48b1-8a85-549efb6c7e3c (robertosshbrasil@gmail.com)
📱 Push token: ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]...
✅ Push enviada com sucesso: ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]...
✅ Notificação de teste enviada com sucesso!
```

**No Dispositivo Móvel:**
- Notificação aparece com título: "🧪 Teste de Notificação"
- Mensagem: "Esta é uma notificação de teste do PreçoCerto! Se você recebeu isso, as notificações push estão funcionando perfeitamente! 🎉"

---

### Método 2: Via Script Node.js

Crie um arquivo `backend/send-test-push.js`:

```javascript
import 'dotenv/config';
import pushNotificationService from './src/services/pushNotification.js';

const pushToken = 'ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]';

async function sendTest() {
  console.log('🧪 Enviando notificação de teste...\n');
  
  const result = await pushNotificationService.sendToUser(
    pushToken,
    {
      title: '🧪 Teste Direto',
      message: 'Notificação enviada diretamente via script!',
      type: 'test',
      data: { screen: 'Home' }
    }
  );
  
  if (result) {
    console.log('✅ Notificação enviada com sucesso!');
  } else {
    console.log('❌ Falha ao enviar notificação');
  }
  
  process.exit(0);
}

sendTest();
```

Execute:
```bash
cd backend
node send-test-push.js
```

---

### Método 3: Via Expo Push Notification Tool

1. Acesse: https://expo.dev/notifications
2. Cole o token: `ExponentPushToken[8JMWykH5k_xwvbDH_ibQWl]`
3. Preencha:
   - Title: "Teste Manual"
   - Message: "Teste via Expo Tool"
4. Clique em "Send a Notification"

---

## 📱 Verificar no Dispositivo

### Requisitos:
1. ✅ App instalado (development build ou production)
2. ✅ Usuário logado (robertosshbrasil@gmail.com)
3. ✅ Permissão de notificações concedida
4. ✅ App em background ou fechado (notificações não aparecem com app aberto)

### O que esperar:
- Notificação aparece na barra de notificações
- Som de notificação toca
- Badge do app é atualizado
- Ao tocar, app abre na tela Home

---

## 🔍 Troubleshooting

### Notificação não aparece

**1. Verificar se app está em background**
- Notificações só aparecem quando app está minimizado ou fechado
- Se app estiver aberto, notificação é recebida mas não exibida

**2. Verificar permissões**
```bash
# No app, verificar logs:
✅ Push token obtido: ExponentPushToken[...]
✅ Token registrado no backend
```

**3. Verificar token no banco**
```bash
cd backend
node test-push.js
```

**4. Verificar logs do backend**
```bash
cd backend
npm run dev

# Procurar por:
✅ Push enviada com sucesso
# ou
❌ Erro ao enviar push
```

### Erro: "Usuário não possui push token"

**Solução:**
1. Abrir o app mobile
2. Fazer login
3. Aguardar alguns segundos
4. Verificar logs: "✅ Token registrado no backend"

### Erro: "Token inválido"

**Solução:**
1. Fazer logout no app
2. Fazer login novamente
3. Novo token será gerado e registrado

### Erro ao enviar do backend

**Verificar:**
1. EXPO_ACCESS_TOKEN está configurado no .env?
2. Token começa com "ExponentPushToken[" ou "ExpoPushToken["?
3. Expo API está online? (https://status.expo.dev)

---

## 📊 Monitoramento

### Logs do Backend
```bash
cd backend
npm run dev

# Procurar por:
🧪 Testando push notification para usuário...
📱 Push token: ExponentPushToken[...]
✅ Push enviada com sucesso
✅ Notificação de teste enviada com sucesso!
```

### Logs do App
```bash
cd app
npx expo start

# Procurar por:
🔔 Notificação recebida: ...
👆 Usuário tocou na notificação: ...
```

### Banco de Dados
```sql
-- Verificar token
SELECT id, email, push_token 
FROM users 
WHERE email = 'robertosshbrasil@gmail.com';

-- Verificar notificações enviadas
SELECT * FROM notifications 
WHERE user_id = 'fec11172-44c3-48b1-8a85-549efb6c7e3c'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ✅ Checklist de Teste

- [ ] Backend está rodando (`npm run dev`)
- [ ] Usuário tem push token registrado (verificado ✅)
- [ ] Obter JWT token via login
- [ ] Enviar notificação de teste via API
- [ ] Verificar logs do backend (sucesso/erro)
- [ ] Verificar dispositivo móvel (notificação apareceu?)
- [ ] Tocar na notificação (app abre?)
- [ ] Verificar logs do app (notificação recebida?)

---

## 🎯 Próximos Passos

Após confirmar que funciona:

1. **Testar notificações automáticas:**
   - Publicar novo produto
   - Publicar novo cupom
   - Produto favorito com desconto

2. **Testar diferentes tipos:**
   - Cupom novo
   - Alerta de preço
   - Cupom expirando
   - Promoção

3. **Testar em múltiplos usuários:**
   - Criar mais contas
   - Registrar tokens
   - Enviar notificações em massa

---

## 📚 Comandos Úteis

```bash
# Verificar usuários com token
cd backend
node test-push.js

# Iniciar backend
cd backend
npm run dev

# Iniciar app (development build)
cd app
npx expo run:android

# Ver logs do app
cd app
npx expo start

# Fazer login e obter token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"robertosshbrasil@gmail.com","password":"SUA_SENHA"}'

# Enviar notificação de teste
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🎉 Conclusão

Tudo está configurado e pronto para testar! Basta:

1. Fazer login para obter o JWT token
2. Enviar a notificação de teste via API
3. Verificar no dispositivo móvel

**Push Token encontrado:** ✅  
**Endpoint de teste criado:** ✅  
**Backend configurado:** ✅  
**Pronto para testar:** ✅

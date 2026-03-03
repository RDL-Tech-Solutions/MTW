# Teste Rápido: Verificar Por Que Notificações Não Funcionam

## PASSO 1: Execute o Script de Debug (2 minutos)

```bash
cd backend
node scripts/debug-notifications.js
```

## PASSO 2: Analise o Resultado

### ❌ Se mostrar "0 tokens FCM registrados"

**PROBLEMA**: Usuários não têm tokens registrados

**SOLUÇÃO IMEDIATA**:
1. Abra o app no celular
2. Faça login com `robertosshbrasil@gmail.com`
3. Aceite permissão de notificações no onboarding
4. Execute o script novamente

**TESTE**:
```bash
node scripts/test-all-notifications-user.js
```

---

### ❌ Se mostrar "Service account NÃO encontrado"

**PROBLEMA**: Firebase não configurado

**SOLUÇÃO IMEDIATA**:
1. Acesse Firebase Console
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Salve como `backend/firebase-service-account.json`
5. Reinicie o backend

---

### ❌ Se mostrar "0 notificações no banco"

**PROBLEMA**: `publishService.notifyPush()` não está sendo chamado

**SOLUÇÃO IMEDIATA**:
1. Verifique logs do backend ao aprovar produto
2. Procure por erros antes de "📱 Produto já disponível"
3. Compartilhe os logs completos

---

### ⚠️ Se mostrar produtos com `should_send_push: false`

**PROBLEMA**: IA desabilitou push (normal para produtos de baixa qualidade)

**SOLUÇÃO**: Melhorar qualidade dos produtos ou testar com produto de alta qualidade

---

### ✅ Se tudo estiver OK mas notificações não chegam

**PROBLEMA**: Tokens FCM podem estar inválidos/expirados

**SOLUÇÃO**:
1. Desinstale o app
2. Reinstale
3. Faça login novamente
4. Aceite permissões
5. Teste novamente

## PASSO 3: Teste Manual

### Teste 1: Notificação Direta

```bash
cd backend
node scripts/test-all-notifications-user.js
```

**Resultado esperado**: 10/10 notificações enviadas

**Se falhar**: Token FCM inválido ou Firebase não configurado

---

### Teste 2: Aprovar Produto

1. Acesse painel admin
2. Vá em "Produtos Pendentes"
3. Aprove um produto
4. Verifique logs do backend

**Logs esperados**:
```
📢 Iniciando publicação multicanal
🔔 X usuários segmentados para notificar
📤 FCM: Enviando notificação
✅ FCM: Notificação enviada
```

**Se não aparecer**: Problema na segmentação ou FCM

---

### Teste 3: Criar Cupom

1. Acesse painel admin
2. Crie um novo cupom
3. Ative o cupom
4. Verifique logs

**Logs esperados**:
```
📢 ========== NOTIFICAÇÃO DE NOVO CUPOM ==========
📱 Criando notificações push...
✅ Notificações push FCM: X enviadas
```

## PASSO 4: Verificação no Banco

Execute estas queries no Supabase:

### Verificar Tokens FCM
```sql
SELECT 
  u.email,
  u.name,
  ft.platform,
  ft.device_id,
  ft.created_at,
  LEFT(ft.fcm_token, 30) as token_preview
FROM fcm_tokens ft
JOIN users u ON u.id = ft.user_id
ORDER BY ft.created_at DESC;
```

**Resultado esperado**: Pelo menos 1 token para seu usuário de teste

---

### Verificar Notificações Criadas
```sql
SELECT 
  n.type,
  n.title,
  n.message,
  n.sent_at,
  n.created_at,
  u.email
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 20;
```

**Resultado esperado**: Notificações sendo criadas quando produtos são aprovados

---

### Verificar Preferências de Notificação
```sql
SELECT 
  email,
  name,
  notification_preferences
FROM users
WHERE email = 'robertosshbrasil@gmail.com';
```

**Resultado esperado**: `notification_preferences` não deve bloquear tudo

## DIAGNÓSTICO RÁPIDO

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| 0 tokens FCM | App não registrou token | Abrir app e fazer login |
| Service account não encontrado | Firebase não configurado | Baixar JSON do Firebase |
| 0 notificações no banco | publishService não chamado | Verificar logs do backend |
| Tokens mas sem notificações | Tokens inválidos | Reinstalar app |
| should_send_push = false | IA bloqueou | Normal, melhorar produto |

## RESULTADO ESPERADO

Após executar o script de debug, você deve ver:

```
✅ Service account encontrado
📊 Total de tokens registrados: 1+
👥 Usuários com tokens: 1+
📬 Últimas 20 notificações: [lista de notificações]
```

Se você vê isso mas notificações não chegam no celular:
- Tokens podem estar expirados
- Reinstale o app
- Verifique permissões de notificação no Android/iOS

## COMANDOS ÚTEIS

```bash
# Debug completo
node scripts/debug-notifications.js

# Teste de notificação direta
node scripts/test-all-notifications-user.js

# Ver logs do backend em tempo real
# (se estiver rodando com PM2)
pm2 logs backend

# (se estiver rodando com npm)
npm run dev
```

## PRÓXIMO PASSO

Execute o script de debug e compartilhe a saída completa se precisar de ajuda:

```bash
cd backend
node scripts/debug-notifications.js > debug-output.txt 2>&1
```

Depois compartilhe o arquivo `debug-output.txt`.

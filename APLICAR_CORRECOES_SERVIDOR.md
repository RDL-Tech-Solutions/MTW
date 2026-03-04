# 🚀 APLICAR CORREÇÕES NO SERVIDOR

## 📋 Checklist de Arquivos Modificados

### Arquivos que precisam ser atualizados no servidor:

1. ✅ `backend/src/services/bots/notificationDispatcher.js`
2. ✅ `backend/src/models/User.js`
3. ✅ `backend/src/services/coupons/couponNotificationService.js`
4. ✅ `backend/scripts/audit-notifications-complete.js`

---

## 🔧 PASSO A PASSO

### 1. Fazer Backup
```bash
# No servidor
cd /caminho/do/projeto
git stash  # Salvar mudanças locais se houver
git pull origin main  # Atualizar código
```

### 2. Verificar Arquivos Modificados
```bash
git status
git diff HEAD~1
```

### 3. Reiniciar Serviço Backend
```bash
# Dependendo do seu setup:
pm2 restart backend
# ou
systemctl restart backend
# ou
docker-compose restart backend
```

### 4. Verificar Logs
```bash
# Verificar se iniciou sem erros
tail -f logs/combined.log

# Ou com PM2
pm2 logs backend
```

---

## 🧪 TESTES NO SERVIDOR

### Teste 1: Verificar FCM
```bash
node scripts/test-fcm-simple.js
```

**Resultado esperado:**
```
✅ FCM habilitado: SIM
✅ Usuário encontrado: [nome]
✅ Notificação enviada com sucesso!
```

### Teste 2: Verificar Segmentação
```bash
node scripts/test-segmentation-quick.js
```

**Resultado esperado:**
```
✅ 1+ usuários encontrados
✅ 1+ usuários segmentados
```

### Teste 3: Auditoria Completa (Opcional)
```bash
node scripts/audit-notifications-complete.js
```

**Resultado esperado:**
```
✅ AUDITORIA CONCLUÍDA COM SUCESSO!
```

---

## 📊 MONITORAMENTO

### Verificar Notificações em Tempo Real
```bash
# Filtrar apenas FCM
tail -f logs/combined.log | grep "FCM"

# Filtrar notificações
tail -f logs/combined.log | grep "notificação"

# Filtrar erros
tail -f logs/combined.log | grep "error"
```

### Verificar Tokens FCM no Banco
```sql
-- Verificar usuários com token na coluna antiga
SELECT id, name, email, 
       SUBSTRING(fcm_token, 1, 30) as token_preview
FROM users 
WHERE fcm_token IS NOT NULL;

-- Verificar tokens na nova tabela
SELECT ft.user_id, u.name, u.email,
       SUBSTRING(ft.fcm_token, 1, 30) as token_preview,
       ft.platform, ft.device_id
FROM fcm_tokens ft
JOIN users u ON u.id = ft.user_id;
```

---

## ⚠️ PROBLEMAS COMUNS

### Problema 1: Firebase Admin não inicializa
**Sintoma:** `FCM não está habilitado`

**Solução:**
```bash
# Verificar se arquivo existe
ls -la firebase-service-account.json

# Verificar permissões
chmod 600 firebase-service-account.json

# Verificar variável de ambiente
echo $FIREBASE_SERVICE_ACCOUNT_PATH
```

### Problema 2: Nenhum usuário com token
**Sintoma:** `0 usuários encontrados`

**Causa:** Usuários ainda não abriram o app

**Solução:** Aguardar usuários abrirem o app e permitirem notificações

### Problema 3: WhatsApp Client not ready
**Sintoma:** `WhatsApp Client is not ready`

**Solução:**
```bash
# Escanear QR code novamente
# Verificar se processo do WhatsApp está rodando
pm2 list | grep whatsapp
```

---

## 🔍 VALIDAÇÃO FINAL

### Checklist de Validação

- [ ] Backend reiniciado sem erros
- [ ] Logs não mostram erros de null/undefined
- [ ] Teste FCM passa com sucesso
- [ ] Teste de segmentação encontra usuários
- [ ] Notificações sendo enviadas (verificar logs)

### Comandos de Validação Rápida
```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/api/health

# 2. Verificar logs recentes
tail -n 100 logs/combined.log | grep -i error

# 3. Testar FCM
node scripts/test-fcm-simple.js

# 4. Verificar usuários com token
node -e "import('./src/models/User.js').then(async ({default: User}) => { const users = await User.findAllWithFCMToken(); console.log('Usuários:', users.length); process.exit(0); })"
```

---

## 📝 NOTAS IMPORTANTES

### Sobre Tokens FCM
- Tokens são registrados quando usuário abre o app
- Tokens ficam em `users.fcm_token` (coluna antiga)
- Sistema busca de ambas as fontes automaticamente
- Não precisa migrar tokens manualmente

### Sobre Segmentação
- WhatsApp: SEM segmentação (envia para todos)
- Telegram: COM segmentação (por categoria/plataforma)
- FCM Push: COM segmentação (por preferências do usuário)

### Sobre Bots
- WhatsApp e Telegram podem ter problemas de ambiente
- Problemas de bots NÃO afetam notificações push FCM
- FCM funciona independentemente dos bots

---

## ✅ CONCLUSÃO

Após aplicar as correções e validar:

1. ✅ Sistema de notificações push funcionando
2. ✅ Segmentação encontrando usuários
3. ✅ Notificações sendo enviadas
4. ✅ Logs sem erros de código

**Status: PRONTO PARA PRODUÇÃO** 🎉

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs: `tail -f logs/combined.log`
2. Executar testes: `node scripts/test-fcm-simple.js`
3. Verificar documentação: `RESULTADO_AUDITORIA_FINAL.md`
4. Revisar correções: `CORRECOES_ERROS_AUDITORIA.md`

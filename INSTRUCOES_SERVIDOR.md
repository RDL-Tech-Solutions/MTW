# 🚀 Instruções para Configurar FCM no Servidor

## ❌ Problema Atual

O servidor está apresentando o erro:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'firebase-admin'
```

## ✅ Solução Completa

### Passo 1: Conectar ao Servidor

```bash
ssh root@seu-servidor
cd /root/MTW/backend
```

### Passo 2: Instalar firebase-admin

```bash
npm install firebase-admin
```

**Saída esperada**:
```
added 1 package, and audited X packages in Xs
```

### Passo 3: Verificar Instalação

```bash
npm list firebase-admin
```

**Saída esperada**:
```
backend@1.0.0 /root/MTW/backend
└── firebase-admin@13.7.0
```

### Passo 4: Baixar Service Account do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto "PreçoCerto"
3. Vá em **⚙️ Project Settings** → **Service Accounts**
4. Clique em **"Generate New Private Key"**
5. Clique em **"Generate Key"**
6. Arquivo JSON será baixado

### Passo 5: Enviar Service Account para o Servidor

**No seu computador local**:
```bash
scp firebase-service-account.json root@seu-servidor:/root/MTW/backend/
```

**Ou** copie o conteúdo manualmente:

```bash
# No servidor
nano /root/MTW/backend/firebase-service-account.json
```

Cole o conteúdo do arquivo JSON e salve (Ctrl+X, Y, Enter).

### Passo 6: Configurar Permissões

```bash
chmod 600 /root/MTW/backend/firebase-service-account.json
```

### Passo 7: Verificar .env

```bash
nano /root/MTW/backend/.env
```

Certifique-se de que existe:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Salve (Ctrl+X, Y, Enter).

### Passo 8: Adicionar ao .gitignore

```bash
echo "firebase-service-account.json" >> /root/MTW/backend/.gitignore
```

### Passo 9: Reiniciar Servidor

```bash
pm2 restart backend
```

### Passo 10: Verificar Logs

```bash
pm2 logs backend --lines 50
```

**Saída esperada** (sem erros):
```
✅ Firebase Admin (FCM) inicializado com sucesso
🚀 Servidor rodando na porta 3000
```

## 🧪 Testar

### Teste 1: Verificar Inicialização

```bash
pm2 logs backend | grep FCM
```

Deve mostrar:
```
✅ Firebase Admin (FCM) inicializado com sucesso
```

### Teste 2: Enviar Notificação de Teste

```bash
cd /root/MTW/backend
npm run test:push
```

Siga as instruções do script para enviar uma notificação de teste.

## 🔐 Segurança

### ⚠️ IMPORTANTE

1. **NUNCA** commite `firebase-service-account.json` no Git
2. **SEMPRE** mantenha permissões restritas (600)
3. **ROTACIONE** a chave periodicamente (a cada 90 dias)

### Verificar Segurança

```bash
# Verificar permissões
ls -la /root/MTW/backend/firebase-service-account.json
# Deve mostrar: -rw------- (600)

# Verificar .gitignore
cat /root/MTW/backend/.gitignore | grep firebase
# Deve mostrar: firebase-service-account.json
```

## 📊 Checklist Completo

- [ ] Conectado ao servidor
- [ ] firebase-admin instalado
- [ ] Instalação verificada
- [ ] Service Account baixado do Firebase
- [ ] Service Account enviado para servidor
- [ ] Permissões configuradas (600)
- [ ] .env verificado
- [ ] .gitignore atualizado
- [ ] Servidor reiniciado
- [ ] Logs verificados (sem erros)
- [ ] Teste de notificação realizado

## 🐛 Troubleshooting

### Erro: "Cannot find module 'firebase-admin'"

**Solução**: Instalar novamente
```bash
cd /root/MTW/backend
npm install firebase-admin --save
```

### Erro: "ENOENT: no such file or directory, open './firebase-service-account.json'"

**Solução**: Verificar se o arquivo existe
```bash
ls -la /root/MTW/backend/firebase-service-account.json
```

Se não existir, enviar novamente do seu computador.

### Erro: "Permission denied"

**Solução**: Ajustar permissões
```bash
chmod 600 /root/MTW/backend/firebase-service-account.json
chown root:root /root/MTW/backend/firebase-service-account.json
```

### Servidor não reinicia

**Solução**: Verificar logs de erro
```bash
pm2 logs backend --err --lines 100
```

## 📝 Comandos Úteis

```bash
# Ver status do servidor
pm2 status

# Ver logs em tempo real
pm2 logs backend

# Reiniciar servidor
pm2 restart backend

# Parar servidor
pm2 stop backend

# Iniciar servidor
pm2 start backend

# Ver logs de erro
pm2 logs backend --err

# Limpar logs
pm2 flush
```

## 🎯 Resultado Esperado

Após seguir todos os passos, você deve ver nos logs:

```
✅ Firebase Admin (FCM) inicializado com sucesso
🚀 Servidor rodando na porta 3000
📝 Ambiente: production
🌐 API disponível em: http://localhost:3000/api
```

E ao executar `npm run test:push`, deve conseguir enviar notificações para usuários com FCM token registrado.

---

**Data**: 2026-03-03
**Status**: ⚠️ Ação Necessária no Servidor
**Tempo Estimado**: 10-15 minutos

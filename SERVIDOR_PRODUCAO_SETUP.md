# 🚀 Setup do Servidor de Produção - FCM

## ❌ Problema Identificado

O servidor de produção está apresentando o erro:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'firebase-admin'
```

Isso acontece porque o módulo `firebase-admin` não foi instalado no servidor após a migração do OneSignal para FCM.

## ✅ Solução - Passo a Passo

### 1. Conectar ao Servidor

```bash
ssh root@seu-servidor
cd /root/MTW/backend
```

### 2. Instalar Dependências

O `firebase-admin` já está no `package.json`, então basta rodar:

```bash
npm install
```

Isso vai instalar o `firebase-admin` e todas as outras dependências.

### 3. Verificar Instalação

```bash
npm list firebase-admin
```

Deve mostrar:
```
firebase-admin@13.7.0
```

### 4. Configurar Credenciais do Firebase

Certifique-se de que o arquivo `firebase-service-account.json` está no diretório correto:

```bash
ls -la /root/MTW/backend/firebase-service-account.json
```

Se não existir, você precisa:

1. Ir ao [Firebase Console](https://console.firebase.google.com/)
2. Selecionar seu projeto
3. Ir em **Project Settings** (ícone de engrenagem) → **Service Accounts**
4. Clicar em **Generate New Private Key**
5. Fazer upload do arquivo para o servidor:

```bash
# No seu computador local
scp firebase-service-account.json root@seu-servidor:/root/MTW/backend/
```

### 5. Verificar Variáveis de Ambiente

Editar o arquivo `.env` no servidor:

```bash
nano /root/MTW/backend/.env
```

Verificar se tem:
```env
# Firebase Cloud Messaging
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### 6. Reiniciar o Backend

```bash
pm2 restart backend
```

Ou se estiver usando o ecosystem:

```bash
pm2 reload ecosystem.config.cjs
```

### 7. Verificar Logs

```bash
pm2 logs backend --lines 50
```

Deve mostrar:
```
✅ Firebase Admin SDK inicializado com sucesso
```

### 8. Testar Notificações

```bash
npm run test:push
```

## 🔍 Verificação Final

Execute este comando para verificar se tudo está funcionando:

```bash
node -e "import('firebase-admin').then(() => console.log('✅ firebase-admin OK')).catch(e => console.log('❌ Erro:', e.message))"
```

## 📝 Checklist

- [ ] `npm install` executado
- [ ] `firebase-admin` instalado (verificar com `npm list firebase-admin`)
- [ ] `firebase-service-account.json` presente no servidor
- [ ] Variável `FIREBASE_SERVICE_ACCOUNT_PATH` configurada no `.env`
- [ ] Backend reiniciado com `pm2 restart backend`
- [ ] Logs mostram "Firebase Admin SDK inicializado"
- [ ] Teste de notificação executado com sucesso

## ⚠️ Problemas Comuns

### Erro: Cannot find module 'firebase-admin'
**Solução**: Execute `npm install` no diretório `/root/MTW/backend`

### Erro: ENOENT: no such file or directory 'firebase-service-account.json'
**Solução**: Faça upload do arquivo de credenciais do Firebase Console

### Erro: Failed to parse private key
**Solução**: Verifique se o arquivo `firebase-service-account.json` está correto e não foi corrompido

### Backend não reinicia
**Solução**: 
```bash
pm2 stop backend
pm2 start backend
# ou
pm2 delete backend
pm2 start ecosystem.config.cjs
```

## 📚 Documentos Relacionados

- `INSTRUCOES_SERVIDOR.md` - Instruções detalhadas de configuração
- `RESUMO_COMPLETO_MIGRACAO.md` - Resumo da migração OneSignal → FCM
- `RESULTADO_TESTE_FCM.md` - Resultado dos testes locais

## 🎯 Próximos Passos

Após configurar o servidor:

1. ✅ Fazer build nativo do app: `npx expo prebuild && npx expo run:android`
2. ✅ Instalar app no dispositivo físico
3. ✅ Fazer login no app
4. ✅ Ativar notificações nas configurações do app
5. ✅ Testar envio de notificação do backend

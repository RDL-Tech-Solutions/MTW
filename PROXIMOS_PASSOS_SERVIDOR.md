# 🎯 Próximos Passos - Configurar Servidor de Produção

## 📋 Situação Atual

✅ **Backend Local**: Funcionando perfeitamente com FCM  
❌ **Servidor de Produção**: Erro `Cannot find package 'firebase-admin'`  
✅ **Código**: 100% migrado do OneSignal para FCM  
✅ **App Mobile**: Implementação FCM completa  

## 🚨 Problema no Servidor

Os logs mostram que o servidor está tentando usar o FCM mas o módulo `firebase-admin` não está instalado:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'firebase-admin'
```

## ✅ Solução Rápida (5 minutos)

### Passo 1: Conectar ao Servidor

```bash
ssh root@seu-servidor
cd /root/MTW/backend
```

### Passo 2: Instalar Dependências

```bash
npm install
```

Isso vai instalar o `firebase-admin@13.7.0` que já está no `package.json`.

### Passo 3: Verificar Instalação

Execute o script de verificação:

```bash
npm run check:firebase
```

Este script vai verificar:
- ✅ Se `firebase-admin` está instalado
- ✅ Se `firebase-service-account.json` existe
- ✅ Se o arquivo de credenciais é válido
- ✅ Se o Firebase Admin inicializa corretamente
- ✅ Se o FCM está acessível

### Passo 4: Configurar Credenciais (se necessário)

Se o script mostrar que falta o arquivo `firebase-service-account.json`:

1. Baixe do [Firebase Console](https://console.firebase.google.com/)
   - Project Settings → Service Accounts → Generate New Private Key

2. Faça upload para o servidor:
   ```bash
   scp firebase-service-account.json root@seu-servidor:/root/MTW/backend/
   ```

### Passo 5: Reiniciar Backend

```bash
pm2 restart backend
```

### Passo 6: Verificar Logs

```bash
pm2 logs backend --lines 20
```

Deve mostrar:
```
✅ Firebase Admin SDK inicializado com sucesso
```

### Passo 7: Testar Notificações

```bash
npm run test:push
```

## 📱 Depois de Configurar o Servidor

### 1. Build Nativo do App

O app precisa de build nativo para FCM funcionar (não funciona no Expo Go):

```bash
cd /root/MTW/app
npx expo prebuild
npx expo run:android
```

### 2. Instalar no Dispositivo

O comando acima vai instalar automaticamente no dispositivo conectado via USB.

### 3. Ativar Notificações

1. Abrir o app
2. Fazer login
3. Ir em Configurações → Notificações
4. Ativar notificações

### 4. Testar do Backend

No servidor, execute:

```bash
npm run test:push
```

Deve mostrar:
```
✅ Notificação enviada com sucesso!
📱 1 usuário(s) com FCM token
```

## 🔧 Scripts Disponíveis

### No Servidor (Backend)

```bash
# Verificar instalação do Firebase Admin
npm run check:firebase

# Testar notificações push
npm run test:push

# Ver logs do backend
pm2 logs backend

# Reiniciar backend
pm2 restart backend
```

### No App (Local)

```bash
# Build nativo Android
npx expo prebuild
npx expo run:android

# Build nativo iOS
npx expo run:ios

# Limpar cache
npx expo start -c
```

## 📚 Documentação Completa

- `SERVIDOR_PRODUCAO_SETUP.md` - Setup detalhado do servidor
- `INSTRUCOES_SERVIDOR.md` - Instruções completas de configuração
- `RESUMO_COMPLETO_MIGRACAO.md` - Resumo da migração OneSignal → FCM
- `RESULTADO_TESTE_FCM.md` - Resultado dos testes locais
- `ANALISE_FCM_APP.md` - Análise da implementação no app

## ⚠️ Importante

1. **Não use Expo Go** - FCM precisa de build nativo
2. **Dispositivo físico** - Notificações não funcionam no emulador sem Google Play Services
3. **Internet** - App precisa estar conectado para registrar FCM token
4. **Permissões** - Usuário precisa aceitar permissão de notificações

## 🎉 Resultado Final

Após seguir todos os passos:

✅ Backend no servidor enviando notificações via FCM  
✅ App nativo instalado no dispositivo  
✅ Usuários recebendo notificações push  
✅ Sistema 100% funcional sem OneSignal  

## 🆘 Suporte

Se encontrar problemas:

1. Execute `npm run check:firebase` no servidor
2. Verifique os logs: `pm2 logs backend`
3. Consulte `SERVIDOR_PRODUCAO_SETUP.md` para troubleshooting

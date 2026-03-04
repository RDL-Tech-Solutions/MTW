# ✅ Correção Aplicada: Firebase Service Account Path

## STATUS: CORREÇÃO CONCLUÍDA

O arquivo `backend/.env` já está configurado corretamente com o caminho absoluto:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=C:/dev/MTW/backend/firebase-service-account.json
```

## ⚠️ AÇÃO NECESSÁRIA: REINICIAR BACKEND

O backend precisa ser reiniciado para carregar a nova configuração do `.env`.

### Como Reiniciar

**Se o backend está rodando em terminal:**
1. Pressione `Ctrl+C` para parar
2. Execute novamente:
```bash
cd backend
npm start
```

**Se o backend está rodando como serviço:**
```bash
# Parar
pm2 stop backend

# Iniciar
pm2 start backend

# Ou reiniciar
pm2 restart backend
```

## ✅ VERIFICAÇÃO

Após reiniciar, o log deve mostrar:

### ✅ SUCESSO (esperado):
```
✅ FCM: Service account carregado de C:/dev/MTW/backend/firebase-service-account.json
✅ Firebase Admin (FCM) inicializado com sucesso
```

### ❌ ANTES (problema):
```
⚠️ FCM: Service account não encontrado (./firebase-service-account.json)
   Tentando Application Default Credentials...
✅ Firebase Admin (FCM) inicializado com sucesso
```

## 🧪 TESTE APÓS REINICIAR

Execute o teste de notificações:

```bash
cd backend
node scripts/test-all-notifications-user.js
```

**Resultado esperado:**
```
✅ FCM: Service account carregado de C:/dev/MTW/backend/firebase-service-account.json
✅ Firebase Admin (FCM) inicializado com sucesso
📤 FCM: Enviando notificação para token...
✅ FCM: Notificação enviada. Message ID: projects/...
✅ 10/10 notificações enviadas com sucesso
```

## 📊 RESUMO DA CORREÇÃO

| Item | Status |
|------|--------|
| Arquivo `firebase-service-account.json` existe | ✅ Sim |
| Caminho no `.env` corrigido | ✅ Sim |
| Backend reiniciado | ⏳ Pendente |
| Teste de notificações | ⏳ Pendente |

## 🎯 PRÓXIMOS PASSOS

1. ✅ Caminho corrigido no `.env`
2. ⏳ **VOCÊ ESTÁ AQUI**: Reiniciar backend
3. ⏳ Verificar log de inicialização
4. ⏳ Executar teste de notificações
5. ⏳ Confirmar que notificações funcionam

## 💡 POR QUE ISSO ACONTECEU?

O `.env` estava configurado com caminho relativo:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Caminhos relativos dependem do diretório de execução, o que pode causar problemas. A solução foi usar o caminho absoluto:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=C:/dev/MTW/backend/firebase-service-account.json
```

## 🔧 ALTERNATIVA (Opcional)

Se preferir usar o caminho padrão do código, pode comentar a variável:

```env
# FIREBASE_SERVICE_ACCOUNT_PATH=C:/dev/MTW/backend/firebase-service-account.json
```

O código vai usar automaticamente:
```javascript
path.resolve(__dirname, '../../firebase-service-account.json')
```

Que resolve para: `backend/firebase-service-account.json`

---

**Data**: 2026-03-04  
**Status**: Correção aplicada, aguardando reinício do backend


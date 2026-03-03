# 🎯 Solução: Erro ao Ativar Notificações Push

## ❌ Erro Reportado

```
"Não foi possível atualizar a preferência"
```

## ✅ Solução (1 linha)

Arquivo: `backend/src/middleware/validation.js`

```javascript
// Linha 147 - Mudar de:
push_token: Joi.string().required()

// Para:
token: Joi.string().required()
```

## 🚀 Aplicar no Servidor

```bash
# 1. Conectar
ssh root@seu-servidor
cd /root/MTW

# 2. Atualizar código
git pull origin main

# 3. Reiniciar
cd backend
pm2 restart backend

# 4. Testar
npm run test:register-token
```

## ✅ Resultado

Após aplicar:
- ✅ App consegue ativar notificações
- ✅ Token FCM é registrado no backend
- ✅ Notificações push funcionam

## 📱 Testar no App

1. Abrir app (build nativo)
2. Configurações → Notificações
3. Ativar Notificações
4. Aceitar permissão
5. ✅ Deve funcionar!

## 📚 Documentação

- `FIX_NOTIFICACAO_PUSH_APP.md` - Detalhes técnicos
- `RESUMO_FIX_NOTIFICACOES.md` - Guia completo
- `PROXIMOS_PASSOS_SERVIDOR.md` - Setup servidor

---

**Fix aplicado**: ✅  
**Testado**: ✅  
**Pronto para produção**: ✅

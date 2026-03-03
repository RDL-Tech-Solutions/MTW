# 🚀 COMECE AQUI: Notificações Push

## ⚡ SOLUÇÃO RÁPIDA (2 minutos)

### Problema
Notificações push não funcionam porque a tabela `fcm_tokens` não existe no banco.

### Solução
Execute este comando:

```bash
cd backend
node scripts/apply-fcm-migration.js
```

Pronto! Agora siga os próximos passos.

---

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ Criar Tabela (OBRIGATÓRIO)

```bash
cd backend
node scripts/apply-fcm-migration.js
```

**Resultado esperado**:
```
✅ Tabela fcm_tokens criada com sucesso
```

**Se der erro**, veja `MIGRACAO_FCM_TOKENS.md` para solução manual.

---

### 2️⃣ Verificar Configuração

```bash
node scripts/debug-notifications.js
```

**Deve mostrar**:
- ✅ Tabela fcm_tokens existe
- ✅ Firebase service account encontrado
- ⚠️ 0 tokens registrados (normal, ainda não fez login no app)

---

### 3️⃣ Registrar Token FCM

**No celular**:
1. Abra o app
2. Faça login
3. Aceite permissão de notificações

**Verificar**:
```bash
node scripts/debug-notifications.js
```

Agora deve mostrar:
```
📊 Total de tokens registrados: 1
```

---

### 4️⃣ Testar Notificações

```bash
node scripts/test-all-notifications-user.js
```

**Resultado esperado**:
```
✅ 10/10 notificações enviadas
```

---

### 5️⃣ Testar com Produto Real

1. Acesse painel admin
2. Vá em "Produtos Pendentes"
3. Aprove um produto
4. Verifique se notificação chegou no celular

---

## ✅ CHECKLIST

- [ ] Aplicar migração
- [ ] Verificar tabela criada
- [ ] Abrir app e fazer login
- [ ] Verificar token registrado
- [ ] Testar notificações
- [ ] Aprovar produto
- [ ] Verificar notificação no celular

---

## 🆘 PROBLEMAS?

### Migração falhou
→ Veja `MIGRACAO_FCM_TOKENS.md` para solução manual

### Token não registra
→ Verifique `google-services.json` no app

### Notificação não chega
→ Execute `node scripts/debug-notifications.js` e compartilhe resultado

---

## 📚 DOCUMENTAÇÃO

| Arquivo | Quando usar |
|---------|-------------|
| `COMECE_AQUI_NOTIFICACOES.md` | **Comece por aqui!** |
| `MIGRACAO_FCM_TOKENS.md` | Se migração falhar |
| `README_NOTIFICACOES_PUSH.md` | Guia completo |
| `TESTE_RAPIDO_NOTIFICACOES.md` | Teste rápido |
| `SOLUCAO_FINAL_NOTIFICACOES.md` | Resumo técnico |

---

## 🎯 RESUMO

1. **Problema**: Tabela `fcm_tokens` não existe
2. **Solução**: `node scripts/apply-fcm-migration.js`
3. **Teste**: `node scripts/debug-notifications.js`
4. **Registrar**: Abrir app e fazer login
5. **Verificar**: Aprovar produto e ver notificação

**Tempo total**: ~5 minutos

---

**Última atualização**: 2026-03-03

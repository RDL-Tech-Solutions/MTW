# 🚀 Aplicar Fix no Servidor de Produção

## ✅ Testes Locais: SUCESSO

Todos os testes passaram localmente. Agora vamos aplicar no servidor.

## 📋 Checklist Pré-Deploy

- [x] Fix aplicado localmente
- [x] Testes executados com sucesso
- [x] Backend rodando sem erros
- [x] Notificação enviada e recebida
- [x] Documentação criada

## 🚀 Deploy no Servidor (5 minutos)

### Passo 1: Commit e Push

```bash
# No seu computador local
cd /c/dev/MTW

# Adicionar arquivos
git add .

# Commit
git commit -m "fix: corrigir schema validação FCM token (push_token → token)"

# Push
git push origin main
```

### Passo 2: Atualizar Servidor

```bash
# Conectar ao servidor
ssh root@seu-servidor

# Ir para o diretório
cd /root/MTW

# Fazer pull
git pull origin main

# Verificar mudanças
git log -1
```

### Passo 3: Instalar Dependências (se necessário)

```bash
cd /root/MTW/backend

# Instalar firebase-admin se ainda não estiver
npm install

# Verificar instalação
npm run check:firebase
```

Deve mostrar:
```
✅ firebase-admin está instalado
✅ firebase-service-account.json encontrado
✅ Firebase Admin inicializado com sucesso
```

### Passo 4: Reiniciar Backend

```bash
# Reiniciar com PM2
pm2 restart backend

# Verificar logs
pm2 logs backend --lines 30
```

Deve mostrar:
```
✅ Firebase Admin SDK inicializado com sucesso
✅ Servidor rodando na porta 3000
```

### Passo 5: Testar Endpoint

```bash
cd /root/MTW/backend

# Testar validação do endpoint
node scripts/test-fcm-endpoint.js
```

Deve mostrar:
```
✅ Schema aceita campo "token"
✅ Schema rejeita campo "push_token"
🎉 O fix foi aplicado com sucesso!
```

### Passo 6: Testar Notificação

```bash
# Testar envio de notificação
npm run test:push
```

Selecione um usuário com FCM token e confirme o recebimento no dispositivo.

## 🧪 Validação Final

### 1. Verificar Logs do Backend

```bash
pm2 logs backend --lines 50
```

Procurar por:
- ✅ "Firebase Admin SDK inicializado"
- ✅ "Servidor rodando na porta 3000"
- ❌ Nenhum erro relacionado a FCM

### 2. Testar no App Mobile

1. Abrir app (build nativo)
2. Fazer login
3. Ir em **Configurações → Notificações**
4. Clicar em **Ativar Notificações**
5. Aceitar permissão
6. Verificar se aparece: ✅ "Permissão concedida"

### 3. Verificar Token no Banco

```bash
# No servidor
cd /root/MTW/backend

# Verificar usuários com token
node -e "
import supabase from './src/config/database.js';
const { data } = await supabase
  .from('users')
  .select('id, email, fcm_token')
  .not('fcm_token', 'is', null);
console.log('Usuários com FCM token:', data?.length || 0);
data?.forEach(u => console.log('  -', u.email));
"
```

### 4. Enviar Notificação de Teste

```bash
npm run test:push
```

Confirmar recebimento no dispositivo móvel.

## ✅ Checklist Pós-Deploy

- [ ] Código atualizado no servidor (`git pull`)
- [ ] `firebase-admin` instalado (`npm install`)
- [ ] Backend reiniciado (`pm2 restart backend`)
- [ ] Logs sem erros (`pm2 logs backend`)
- [ ] Endpoint validado (`test-fcm-endpoint.js`)
- [ ] Notificação enviada (`npm run test:push`)
- [ ] App testado (ativar notificações)
- [ ] Token registrado no banco (verificar query)
- [ ] Notificação recebida no dispositivo

## 🎯 Resultado Esperado

Após completar todos os passos:

✅ Backend rodando com fix aplicado  
✅ Endpoint aceitando campo `token`  
✅ App consegue ativar notificações  
✅ Tokens sendo registrados no banco  
✅ Notificações sendo enviadas  
✅ Usuários recebendo notificações  

## 🆘 Troubleshooting

### Erro: Cannot find module 'firebase-admin'

```bash
cd /root/MTW/backend
npm install
pm2 restart backend
```

### Erro: ENOENT firebase-service-account.json

```bash
# Fazer upload do arquivo
scp firebase-service-account.json root@servidor:/root/MTW/backend/
```

### Backend não reinicia

```bash
pm2 stop backend
pm2 delete backend
pm2 start ecosystem.config.cjs
```

### App ainda mostra erro

1. Verificar se código foi atualizado: `git log -1`
2. Verificar se backend reiniciou: `pm2 logs backend`
3. Limpar cache do app e reinstalar
4. Fazer logout e login novamente

## 📚 Documentação de Referência

- `TESTE_COMPLETO_FCM_SUCESSO.md` - Resultados dos testes
- `RESUMO_EXECUTIVO_TESTES.md` - Resumo executivo
- `FIX_NOTIFICACAO_PUSH_APP.md` - Detalhes técnicos
- `SERVIDOR_PRODUCAO_SETUP.md` - Setup completo do servidor

## 🎉 Conclusão

O fix é simples e seguro:
- 1 linha modificada
- Testado localmente com sucesso
- Sem breaking changes
- Deploy rápido (5 minutos)

**Pronto para produção!** ✅

---

**Última atualização**: 03/03/2026  
**Status**: Testado e aprovado  
**Risco**: Baixo  
**Impacto**: Alto (desbloqueia notificações push)

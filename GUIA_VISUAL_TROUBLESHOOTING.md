# 🔍 GUIA VISUAL DE TROUBLESHOOTING - NOTIFICAÇÕES PUSH

## 🎯 FLUXO COMPLETO DE NOTIFICAÇÕES

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRIAR CUPOM/PRODUTO                          │
│                    (Admin Panel ou API)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROLLER                                    │
│  • couponController.create()                                    │
│  • couponController.approve()                                   │
│  • productController.create()                                   │
│  • productController.approve()                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SERVICE                          │
│  • couponNotificationService.notifyNewCoupon()                  │
│  • publishService.notifyPush()                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ├──────────────────┬──────────────────────┐
                         ▼                  ▼                      ▼
              ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
              │  BOTS (Telegram  │  │   BOTS       │  │  PUSH FCM        │
              │   & WhatsApp)    │  │  (WhatsApp)  │  │  (App Mobile)    │
              └──────────────────┘  └──────────────┘  └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                    ┌────────────────────────┐
                                                    │   SEGMENTAÇÃO          │
                                                    │   getUsersForCoupon()  │
                                                    └────────┬───────────────┘
                                                             │
                                                             ▼
                                                    ┌────────────────────────┐
                                                    │   FCM SERVICE          │
                                                    │   sendCustom...()      │
                                                    └────────┬───────────────┘
                                                             │
                                                             ▼
                                                    ┌────────────────────────┐
                                                    │   FIREBASE FCM         │
                                                    │   (Google)             │
                                                    └────────┬───────────────┘
                                                             │
                                                             ▼
                                                    ┌────────────────────────┐
                                                    │   APP MOBILE           │
                                                    │   (Usuário)            │
                                                    └────────────────────────┘
```

## 🚨 PONTOS DE FALHA COMUNS

### ❌ FALHA #1: FCM Não Habilitado
```
┌─────────────────────────────────────────┐
│  CONTROLLER                             │
│  ✅ Chama notifyNewCoupon()             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  NOTIFICATION SERVICE                   │
│  ✅ Envia para bots                     │
│  ✅ Chama createPushNotifications()     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  FCM SERVICE                            │
│  ❌ isEnabled() = false                 │
│  ❌ NOTIFICAÇÃO NÃO ENVIADA             │
└─────────────────────────────────────────┘

SINTOMA: Logs mostram "FCM não está habilitado"
CAUSA: Variáveis de ambiente não configuradas
SOLUÇÃO: Configurar FIREBASE_SERVICE_ACCOUNT e FIREBASE_PROJECT_ID
```

### ❌ FALHA #2: Nenhum Usuário Com Token
```
┌─────────────────────────────────────────┐
│  CONTROLLER                             │
│  ✅ Chama notifyNewCoupon()             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  NOTIFICATION SERVICE                   │
│  ✅ Envia para bots                     │
│  ✅ Chama createPushNotifications()     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  SEGMENTAÇÃO                            │
│  ❌ findAllWithFCMToken() = []          │
│  ❌ Retorna 0 usuários                  │
└─────────────────────────────────────────┘

SINTOMA: Logs mostram "0 usuários com FCM token"
CAUSA: Usuários não abriram o app ou não permitiram notificações
SOLUÇÃO: Usuários precisam abrir o app e permitir notificações
```

### ❌ FALHA #3: Segmentação Bloqueando
```
┌─────────────────────────────────────────┐
│  CONTROLLER                             │
│  ✅ Chama notifyNewCoupon()             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  NOTIFICATION SERVICE                   │
│  ✅ Envia para bots                     │
│  ✅ Chama createPushNotifications()     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  SEGMENTAÇÃO                            │
│  ✅ findAllWithFCMToken() = 10 users    │
│  ❌ Após filtros = 0 users              │
│  ❌ Retorna 0 usuários                  │
└─────────────────────────────────────────┘

SINTOMA: Logs mostram "10 usuários com token, 0 segmentados"
CAUSA: Filtros de preferências muito restritivos
SOLUÇÃO: Remover filtros ou ajustar preferências dos usuários
```

### ❌ FALHA #4: Tokens Expirados
```
┌─────────────────────────────────────────┐
│  CONTROLLER                             │
│  ✅ Chama notifyNewCoupon()             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  NOTIFICATION SERVICE                   │
│  ✅ Envia para bots                     │
│  ✅ Chama createPushNotifications()     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  SEGMENTAÇÃO                            │
│  ✅ Retorna 10 usuários                 │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  FCM SERVICE                            │
│  ✅ Tenta enviar para 10 tokens         │
│  ❌ 10 falhas (tokens inválidos)        │
└─────────────────────────────────────────┘

SINTOMA: Logs mostram "0 enviadas, 10 falhas"
CAUSA: Tokens FCM expirados ou inválidos
SOLUÇÃO: Limpar tokens antigos, usuários reabrem o app
```

## 🔍 ÁRVORE DE DECISÃO

```
                    ┌─────────────────────────┐
                    │  Notificação não chega? │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Executar auditoria     │
                    │  (script completo)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  FCM habilitado?        │
                    └────┬──────────────┬─────┘
                         │              │
                    NÃO  │              │  SIM
                         │              │
                         ▼              ▼
              ┌──────────────────┐  ┌──────────────────┐
              │  Configurar      │  │  Usuários têm    │
              │  variáveis de    │  │  token FCM?      │
              │  ambiente        │  └────┬────────┬────┘
              └──────────────────┘       │        │
                                    NÃO  │        │  SIM
                                         │        │
                                         ▼        ▼
                              ┌──────────────┐  ┌──────────────┐
                              │  Usuários    │  │  Segmentação │
                              │  precisam    │  │  retorna     │
                              │  abrir app   │  │  usuários?   │
                              └──────────────┘  └────┬────┬────┘
                                                     │    │
                                                NÃO  │    │  SIM
                                                     │    │
                                                     ▼    ▼
                                          ┌──────────────┐  ┌──────────────┐
                                          │  Verificar   │  │  FCM envia   │
                                          │  preferências│  │  com sucesso?│
                                          │  dos usuários│  └────┬────┬────┘
                                          └──────────────┘       │    │
                                                            NÃO  │    │  SIM
                                                                 │    │
                                                                 ▼    ▼
                                                      ┌──────────────┐  ┌──────────────┐
                                                      │  Tokens      │  │  ✅ SUCESSO! │
                                                      │  expirados   │  │  Notificação │
                                                      │  (limpar)    │  │  chegou      │
                                                      └──────────────┘  └──────────────┘
```

## 📊 MATRIZ DE DIAGNÓSTICO

| Sintoma | Causa Provável | Verificação | Solução |
|---------|---------------|-------------|---------|
| ❌ "FCM não habilitado" | Variáveis de ambiente | `check-firebase-admin.js` | Configurar `.env` |
| ❌ "0 usuários com token" | Usuários não abriram app | `SELECT COUNT(*) FROM users WHERE fcm_token IS NOT NULL` | Usuários abrirem app |
| ❌ "X com token, 0 segmentados" | Filtros restritivos | `SELECT * FROM notification_preferences` | Remover filtros |
| ❌ "0 enviadas, X falhas" | Tokens expirados | Logs do FCM | Limpar tokens antigos |
| ✅ "X enviadas" mas não chega | Problema no app | Verificar permissões | Reinstalar app |

## 🎯 CHECKLIST VISUAL

### ✅ Pré-requisitos
```
┌─────────────────────────────────────────┐
│  ☐ Backend rodando                      │
│  ☐ Variáveis de ambiente configuradas   │
│  ☐ Firebase configurado                 │
│  ☐ App mobile instalado                 │
│  ☐ Usuário fez login no app             │
│  ☐ Permissões de notificação aceitas    │
└─────────────────────────────────────────┘
```

### ✅ Verificações Backend
```
┌─────────────────────────────────────────┐
│  ☐ FCM está habilitado                  │
│  ☐ Service account válido               │
│  ☐ Logs não mostram erros               │
│  ☐ Banco de dados acessível             │
└─────────────────────────────────────────┘
```

### ✅ Verificações Usuários
```
┌─────────────────────────────────────────┐
│  ☐ Pelo menos 1 usuário com token       │
│  ☐ Push habilitado nas preferências     │
│  ☐ Sem filtros muito restritivos        │
│  ☐ Tokens não expirados                 │
└─────────────────────────────────────────┘
```

### ✅ Verificações App
```
┌─────────────────────────────────────────┐
│  ☐ google-services.json correto         │
│  ☐ Permissões de notificação aceitas    │
│  ☐ App em foreground ou background      │
│  ☐ Conexão com internet                 │
└─────────────────────────────────────────┘
```

## 🔧 COMANDOS RÁPIDOS

### Diagnóstico Rápido (1 minuto)
```bash
# 1. Verificar FCM
node backend/scripts/check-firebase-admin.js

# 2. Verificar usuários com token
psql -d seu_banco -c "SELECT COUNT(*) FROM users WHERE fcm_token IS NOT NULL;"

# 3. Verificar logs recentes
tail -n 50 backend/logs/combined.log | grep "notificação"
```

### Auditoria Completa (5 minutos)
```bash
# Executar script completo
node backend/scripts/audit-notifications-complete.js
```

### Correção Rápida (se segmentação bloqueando)
```sql
-- Habilitar push para todos
UPDATE notification_preferences SET push_enabled = true;

-- Remover filtros
UPDATE notification_preferences 
SET category_preferences = NULL, 
    keyword_preferences = NULL;
```

## 📈 MONITORAMENTO CONTÍNUO

### Dashboard de Métricas
```
┌─────────────────────────────────────────────────────────┐
│  NOTIFICAÇÕES (Últimas 24h)                             │
├─────────────────────────────────────────────────────────┤
│  Total Criadas:        150                              │
│  Total Enviadas:       142  (94.7%)                     │
│  Total Falhas:         8    (5.3%)                      │
├─────────────────────────────────────────────────────────┤
│  Por Tipo:                                              │
│    • new_coupon:       80 (78 enviadas, 2 falhas)      │
│    • new_product:      50 (48 enviadas, 2 falhas)      │
│    • out_of_stock:     20 (16 enviadas, 4 falhas)      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  USUÁRIOS                                               │
├─────────────────────────────────────────────────────────┤
│  Total Usuários:       100                              │
│  Com Token FCM:        85   (85%)                       │
│  Push Habilitado:      80   (94% dos com token)        │
│  Com Filtros:          20   (25% dos com token)        │
└─────────────────────────────────────────────────────────┘
```

### Queries de Monitoramento
```sql
-- Taxa de entrega em tempo real
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as enviadas,
  ROUND(
    COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END)::numeric / 
    COUNT(*)::numeric * 100, 
    2
  ) as taxa_pct
FROM notifications
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY type;
```

## 🎓 RESUMO EXECUTIVO

### ✅ O que funciona
- ✅ Código está correto
- ✅ Fluxo está implementado
- ✅ Bots funcionam (Telegram/WhatsApp)
- ✅ FCM está integrado

### ❌ Problemas comuns
- ❌ Usuários sem token FCM (não abriram app)
- ❌ Segmentação muito restritiva
- ❌ FCM não configurado
- ❌ Tokens expirados

### 🎯 Solução rápida
1. Executar auditoria
2. Identificar problema específico
3. Aplicar correção correspondente
4. Testar novamente

### 📞 Quando pedir ajuda
- Auditoria mostra tudo OK mas notificações não chegam
- Erro desconhecido nos logs
- Problema persiste após todas as correções
- Necessário suporte do Firebase/Google

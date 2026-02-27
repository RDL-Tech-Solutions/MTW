# Guia de Rollback - OneSignal Migration

## 🚨 Visão Geral

Este documento detalha os procedimentos de rollback em caso de problemas críticos durante ou após a migração para OneSignal.

## ⚠️ Quando Fazer Rollback

### Cenários Críticos (Rollback Imediato)

1. **Taxa de Entrega < 50%**
   - Notificações não estão chegando aos usuários
   - Impacto direto no negócio

2. **Erros Críticos no Backend**
   - Backend travando ou reiniciando constantemente
   - Timeout em todas as requisições
   - Perda de dados

3. **App Crashando**
   - App fechando ao receber notificação
   - App não abrindo após instalação
   - Crash rate > 5%

4. **Perda de Funcionalidade**
   - Deep linking não funciona
   - Navegação quebrada
   - Dados não carregam

### Cenários Moderados (Investigar Primeiro)

1. **Taxa de Entrega 50-90%**
   - Algumas notificações chegando
   - Pode ser problema de configuração

2. **Erros Intermitentes**
   - Alguns usuários afetados
   - Erros esporádicos nos logs

3. **Performance Degradada**
   - Latência aumentada
   - Uso de recursos elevado

## 🔄 Tipos de Rollback

### Rollback Tipo 1: Feature Flag (Rápido)

**Tempo**: 5-10 minutos  
**Impacto**: Mínimo  
**Quando usar**: Problemas moderados, sistema ainda funcional

#### Passos:

1. **Desabilitar OneSignal via Environment Variable**

```bash
# No servidor/VPS
cd backend
nano .env

# Alterar:
ONESIGNAL_ENABLED=false
EXPO_NOTIFICATIONS_FALLBACK=true

# Reiniciar backend
pm2 restart all
```

2. **Verificar Logs**

```bash
tail -f logs/app.log | grep "Expo\|OneSignal"
```

Deve aparecer:
```
📱 Push Notification Wrapper inicializado
   OneSignal: DESATIVADO
   Expo Fallback: ATIVADO
```

3. **Testar Envio**

```bash
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 123}'
```

4. **Monitorar**

- Verificar taxa de entrega
- Verificar logs de erro
- Verificar feedback de usuários

### Rollback Tipo 2: Código (Médio)

**Tempo**: 30-60 minutos  
**Impacto**: Moderado  
**Quando usar**: Feature flag não resolve, precisa reverter código

#### Passos:

1. **Identificar Commit Anterior**

```bash
cd backend
git log --oneline | head -20
```

Encontre o commit antes da migração OneSignal.

2. **Criar Branch de Rollback**

```bash
git checkout -b rollback-onesignal
git revert COMMIT_HASH_DA_MIGRACAO
```

3. **Testar Localmente**

```bash
npm install
npm start
```

4. **Deploy**

```bash
# Via Git
git push origin rollback-onesignal

# Via PM2
pm2 deploy production rollback-onesignal
```

5. **Verificar**

```bash
pm2 logs
```

### Rollback Tipo 3: Completo (Lento)

**Tempo**: 2-4 horas  
**Impacto**: Alto  
**Quando usar**: Problemas críticos, sistema inoperante

#### Passos:

1. **Backup Atual**

```bash
# Backup do banco de dados
pg_dump -h HOST -U USER -d DATABASE > backup_before_rollback.sql

# Backup do código
cd backend
tar -czf backup_code.tar.gz .
```

2. **Restaurar Banco de Dados**

```sql
-- Restaurar tokens Expo
UPDATE users 
SET push_token = backup.push_token
FROM push_tokens_backup backup
WHERE users.id = backup.user_id
  AND users.onesignal_migrated = TRUE
  AND backup.restored = FALSE;

-- Marcar como restaurado
UPDATE push_tokens_backup
SET restored = TRUE,
    restored_at = NOW()
WHERE restored = FALSE;

-- Limpar dados OneSignal
UPDATE users
SET onesignal_player_id = NULL,
    onesignal_migrated = FALSE,
    onesignal_migrated_at = NULL;
```

3. **Reverter Código Backend**

```bash
cd backend

# Checkout do commit anterior
git checkout COMMIT_HASH_ANTERIOR

# Reinstalar dependências
rm -rf node_modules
npm install

# Remover dependência OneSignal
npm uninstall onesignal-node
```

4. **Reverter Código App**

```bash
cd app

# Checkout do commit anterior
git checkout COMMIT_HASH_ANTERIOR

# Reinstalar dependências
rm -rf node_modules
npm install

# Remover dependência OneSignal
npm uninstall react-native-onesignal

# Reinstalar Expo Notifications
npm install expo-notifications
```

5. **Rebuild App**

```bash
# Android
cd app
npx expo run:android --no-build-cache

# iOS
npx expo run:ios --no-build-cache
```

6. **Deploy Backend**

```bash
cd backend
pm2 restart all
```

7. **Verificar Sistema**

```bash
# Testar envio
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Authorization: Bearer TOKEN" \
  -d '{"user_id": 123}'

# Verificar logs
tail -f logs/app.log

# Verificar métricas
curl http://localhost:3000/api/health
```

## 📊 Checklist de Rollback

### Antes do Rollback

- [ ] Identificar causa raiz do problema
- [ ] Documentar erros e logs
- [ ] Notificar stakeholders
- [ ] Fazer backup do banco de dados
- [ ] Fazer backup do código
- [ ] Preparar comunicação para usuários (se necessário)

### Durante o Rollback

- [ ] Executar passos do tipo de rollback escolhido
- [ ] Monitorar logs em tempo real
- [ ] Testar funcionalidades críticas
- [ ] Verificar taxa de entrega
- [ ] Verificar taxa de erro

### Após o Rollback

- [ ] Confirmar que sistema está estável
- [ ] Verificar métricas por 24h
- [ ] Analisar causa raiz
- [ ] Documentar lições aprendidas
- [ ] Planejar nova tentativa (se aplicável)
- [ ] Comunicar resolução

## 🔍 Validação Pós-Rollback

### 1. Verificar Tokens

```sql
-- Verificar se tokens Expo foram restaurados
SELECT COUNT(*) as total_tokens
FROM users
WHERE push_token IS NOT NULL
  AND (push_token LIKE 'ExponentPushToken%' OR push_token LIKE 'ExpoPushToken%');

-- Verificar se dados OneSignal foram limpos
SELECT COUNT(*) as total_onesignal
FROM users
WHERE onesignal_player_id IS NOT NULL;
```

Esperado:
- `total_tokens` > 0
- `total_onesignal` = 0

### 2. Testar Envio

```bash
# Enviar notificação de teste
curl -X POST http://localhost:3000/api/notifications/test-push \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "title": "Teste Pós-Rollback",
    "message": "Verificando se notificações funcionam"
  }'
```

### 3. Verificar Logs

```bash
tail -f logs/app.log | grep "notification\|push"
```

Deve aparecer:
```
✅ Push enviada com sucesso
```

### 4. Verificar App

1. Abrir app
2. Fazer login
3. Enviar notificação
4. Verificar recebimento
5. Clicar na notificação
6. Verificar navegação

## 📝 Template de Comunicação

### Para Equipe Técnica

```
🚨 ROLLBACK EXECUTADO - OneSignal Migration

Data/Hora: [DATA_HORA]
Tipo de Rollback: [TIPO]
Motivo: [MOTIVO]
Duração: [DURAÇÃO]

Status Atual:
- Backend: [STATUS]
- App: [STATUS]
- Notificações: [STATUS]

Próximos Passos:
1. [PASSO_1]
2. [PASSO_2]
3. [PASSO_3]

Responsável: [NOME]
```

### Para Stakeholders

```
Atualização: Sistema de Notificações

Identificamos um problema técnico com a atualização do sistema de notificações e executamos um rollback para garantir a estabilidade do serviço.

Status: Sistema operando normalmente
Impacto: Mínimo/Nenhum para usuários finais
Próximos Passos: Análise e planejamento de nova implementação

Qualquer dúvida, estamos à disposição.
```

## 🛠️ Scripts de Rollback

### Script 1: Rollback Rápido (Feature Flag)

```bash
#!/bin/bash
# rollback-quick.sh

echo "🔄 Executando rollback rápido..."

# Desabilitar OneSignal
sed -i 's/ONESIGNAL_ENABLED=true/ONESIGNAL_ENABLED=false/' backend/.env
sed -i 's/EXPO_NOTIFICATIONS_FALLBACK=false/EXPO_NOTIFICATIONS_FALLBACK=true/' backend/.env

# Reiniciar backend
pm2 restart all

echo "✅ Rollback rápido concluído"
echo "📊 Verificando status..."

sleep 5

pm2 logs --lines 50 | grep "OneSignal\|Expo"
```

### Script 2: Restaurar Tokens

```sql
-- restore-tokens.sql

BEGIN;

-- Restaurar tokens Expo
UPDATE users 
SET push_token = backup.push_token
FROM push_tokens_backup backup
WHERE users.id = backup.user_id
  AND users.onesignal_migrated = TRUE
  AND backup.restored = FALSE;

-- Marcar como restaurado
UPDATE push_tokens_backup
SET restored = TRUE,
    restored_at = NOW()
WHERE restored = FALSE;

-- Limpar dados OneSignal
UPDATE users
SET onesignal_player_id = NULL,
    onesignal_migrated = FALSE,
    onesignal_migrated_at = NULL;

-- Verificar
SELECT 
  COUNT(*) FILTER (WHERE push_token IS NOT NULL) as tokens_restored,
  COUNT(*) FILTER (WHERE onesignal_player_id IS NOT NULL) as onesignal_remaining
FROM users;

COMMIT;
```

## 📞 Contatos de Emergência

- **DevOps Lead**: [NOME] - [TELEFONE]
- **Backend Lead**: [NOME] - [TELEFONE]
- **Mobile Lead**: [NOME] - [TELEFONE]
- **Product Owner**: [NOME] - [TELEFONE]

## 📚 Referências

- [Plano de Migração](./ONESIGNAL_MIGRATION_PLAN.md)
- [Guia de Setup](./ONESIGNAL_SETUP_GUIDE.md)
- [Guia de Testes](./ONESIGNAL_TESTING_GUIDE.md)

---

**Última atualização**: 2026-02-27
**Versão**: 1.0
**Status**: 📋 Pronto para Uso

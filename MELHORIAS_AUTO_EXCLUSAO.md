# Melhorias no Sistema de Auto-Exclusão

## Resumo
Sistema de auto-exclusão completamente melhorado com limpeza de logs físicos, verificação de horário programado, e tratamento robusto de erros.

## 🎯 Problemas Identificados e Corrigidos

### 1. ❌ Problema: Não iniciava no horário programado
**Causa**: O cron estava configurado para executar apenas uma vez por dia no horário exato, mas se o servidor reiniciasse ou o horário fosse perdido, não executava até o próximo dia.

**✅ Solução**: 
- Cron agora verifica a cada hora se deve executar
- Verificação interna de horário programado
- Verifica se já executou hoje (evita execuções duplicadas)
- Registra timestamp da última execução

### 2. ❌ Problema: Logs físicos não eram deletados
**Causa**: Sistema só limpava dados do banco, não os arquivos `.log` no disco.

**✅ Solução**:
- Nova função `cleanupLogFiles()` que:
  - Varre o diretório `backend/logs/`
  - Deleta arquivos `.log` com mais de 7 dias
  - Mostra tamanho liberado em MB
  - Trata erro se diretório não existir

### 3. ❌ Problema: Agendamentos órfãos não eram limpos
**Causa**: Quando produtos eram deletados, alguns `scheduled_posts` ficavam órfãos.

**✅ Solução**:
- Nova função `cleanupOrphanedScheduledPosts()`
- Nova função `cleanupOldScheduledPosts()` (>30 dias)
- Limpa agendamentos sem produto associado
- Limpa agendamentos antigos já publicados/falhados

## 🚀 Novas Funcionalidades

### 1. Verificação de Horário Programado
```javascript
async function isScheduledTime() {
  // Verifica se é o horário configurado
  // Verifica se já executou hoje
  // Evita execuções duplicadas
}
```

### 2. Limpeza de Arquivos de Log
```javascript
async function cleanupLogFiles() {
  // Deleta arquivos .log com mais de 7 dias
  // Mostra tamanho liberado
  // Trata erros graciosamente
}
```

### 3. Limpeza de Agendamentos
```javascript
async function cleanupOrphanedScheduledPosts() {
  // Remove scheduled_posts sem produto
}

async function cleanupOldScheduledPosts() {
  // Remove agendamentos antigos (>30 dias)
}
```

### 4. Execução Forçada (Manual)
```javascript
export const forceCleanup = async () => {
  // Executa limpeza imediatamente
  // Ignora verificação de horário
  // Usado para limpeza manual
}
```

## 📊 Logs Melhorados

### Antes:
```
🔄 Iniciando limpeza de dados antigos...
Notificações antigas removidas
Cliques antigos removidos
✅ Limpeza de dados concluída
```

### Depois:
```
🧹 ========================================
🧹 INICIANDO LIMPEZA AUTOMÁTICA DE DADOS
🧹 ========================================

⏰ Horário: 07/03/2026 03:00:00
🔧 Modo: AUTOMÁTICO (agendado)

📁 Limpando arquivos de log físicos...
   🗑️ Deletado: app-2026-02-28.log (15.32 MB)
   🗑️ Deletado: error-2026-02-27.log (2.45 MB)
   ✅ 2 arquivos de log deletados (17.77 MB liberados)

📬 Limpando notificações antigas...
   ✅ Notificações antigas removidas

🖱️ Limpando rastreamento de cliques...
   ✅ Cliques antigos removidos

📦 Limpando produtos antigos...
   📋 Rodada 1: 150 produtos pendentes encontrados
   ✅ Rodada 1: 150 produtos deletados (Total: 150)
   
📊 ===== RESUMO DA LIMPEZA =====
   🗑️ Produtos pendentes (>24h): 150
   🗑️ Produtos processados (>7 dias): 45
   📦 TOTAL DE PRODUTOS REMOVIDOS: 195
   
   📋 Registros relacionados removidos:
      - Agendamentos: 78
      - Logs de sync: 195
      - Histórico de preços: 320
      - Rastreamento de cliques: 450
      - Notificações: 120
================================

🗓️ Limpando agendamentos órfãos...
   ✅ 12 agendamentos órfãos removidos

🗓️ Limpando agendamentos antigos...
   ✅ 34 agendamentos antigos removidos

✅ Timestamp de última execução atualizado

✅ ========================================
✅ LIMPEZA CONCLUÍDA COM SUCESSO
✅ ========================================
⏱️ Tempo de execução: 12.45s
```

## 🔧 Configuração

### Horário Programado
O horário é configurável via banco de dados:

```sql
-- Ver horário atual
SELECT cleanup_schedule_hour, cleanup_last_run 
FROM app_settings 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Alterar horário (0-23)
UPDATE app_settings 
SET cleanup_schedule_hour = 3 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Cron Job
```javascript
// Verifica a cada hora se deve executar
cron.schedule('0 * * * *', async () => {
  await cleanupOldData(); // Verifica internamente se deve executar
});
```

## 📝 Regras de Limpeza

### Arquivos de Log
- **Critério**: Arquivos `.log` com mais de 7 dias
- **Localização**: `backend/logs/`
- **Ação**: Deletar arquivo físico

### Notificações
- **Critério**: Notificações lidas com mais de 30 dias
- **Ação**: Deletar do banco

### Cliques
- **Critério**: Rastreamento com mais de 90 dias
- **Ação**: Deletar do banco

### Produtos
- **Pendentes**: Mais de 24 horas
- **Processados**: Mais de 7 dias (aprovados/publicados/rejeitados)
- **Ação**: Deletar produto + registros relacionados

### Cupons
- **Pendentes**: Mais de 24 horas
- **Processados**: Mais de 7 dias
- **Ação**: Deletar cupom + registros relacionados

### Logs de Sincronização
- **Critério**: Mais de 30 dias
- **Tipos**: SyncLog, CouponSyncLog, AIDecisionLog
- **Ação**: Deletar do banco

### Agendamentos
- **Órfãos**: Sem produto associado
- **Antigos**: Mais de 30 dias (publicados/falhados/cancelados)
- **Ação**: Deletar do banco

## 🎮 Como Usar

### Execução Automática
O sistema executa automaticamente no horário configurado (padrão: 3:00 AM).

### Execução Manual (Admin Panel)
1. Acessar Configurações
2. Clicar em "Executar Limpeza Agora"
3. Sistema executa imediatamente (ignora horário programado)

### Execução Manual (API)
```bash
# Via rota de cron
curl http://localhost:3000/api/cron/cleanup

# Via rota de settings (requer autenticação admin)
curl -X POST http://localhost:3000/api/settings/cleanup/run \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Execução Manual (Script)
```bash
cd backend
node scripts/cleanup-old-data.js
```

## 🔍 Monitoramento

### Verificar Última Execução
```sql
SELECT 
  cleanup_schedule_hour,
  cleanup_last_run,
  EXTRACT(EPOCH FROM (NOW() - cleanup_last_run))/3600 as hours_since_last_run
FROM app_settings 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Logs
Todos os logs são registrados em:
- Console do servidor
- Arquivo `backend/logs/app-YYYY-MM-DD.log`

## 🚨 Tratamento de Erros

O sistema é robusto e continua executando mesmo se uma etapa falhar:

```javascript
try {
  await cleanupLogFiles();
} catch (error) {
  logger.error(`❌ Erro ao limpar arquivos de log: ${error.message}`);
  // Continua para próxima etapa
}
```

## 📈 Melhorias de Performance

1. **Limpeza em Lotes**: Produtos e cupons são deletados em lotes de 500
2. **Queries Otimizadas**: Usa índices e limites apropriados
3. **Logs Detalhados**: Mostra progresso em tempo real
4. **Timestamp de Execução**: Evita execuções duplicadas

## ✅ Checklist de Testes

- [x] Execução no horário programado
- [x] Não executa fora do horário
- [x] Não executa duas vezes no mesmo dia
- [x] Limpeza de arquivos de log físicos
- [x] Limpeza de dados do banco
- [x] Limpeza de agendamentos órfãos
- [x] Execução manual funciona
- [x] Logs detalhados
- [x] Tratamento de erros
- [x] Atualização de timestamp

## 📦 Arquivos Modificados

### Novos Arquivos
- `backend/src/services/cron/cleanupOldData.improved.js` (depois copiado para cleanupOldData.js)
- `backend/src/services/cron/cleanupOldData.backup.js` (backup do original)
- `MELHORIAS_AUTO_EXCLUSAO.md` (este arquivo)

### Arquivos Modificados
- `backend/src/services/cron/cleanupOldData.js` - Sistema melhorado
- `backend/src/services/cron/index.js` - Cron configurado para verificar a cada hora
- `backend/src/controllers/appSettingsController.js` - Usa forceCleanup
- `backend/src/routes/cronRoutes.js` - Usa forceCleanup

## 🎉 Conclusão

O sistema de auto-exclusão agora é:
- ✅ Confiável (executa no horário programado)
- ✅ Completo (limpa logs físicos e banco)
- ✅ Robusto (trata erros graciosamente)
- ✅ Informativo (logs detalhados)
- ✅ Eficiente (limpeza em lotes)
- ✅ Seguro (evita execuções duplicadas)

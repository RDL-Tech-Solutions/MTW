# Plano de Migração: Expo Notifications → OneSignal

## 📋 Visão Geral

Este documento descreve o plano completo de migração do sistema de notificações push do Expo Go Notifications para o OneSignal, incluindo estratégia de implementação, rollback plan e testes.

## 🎯 Objetivos

1. Substituir completamente o Expo Go Notifications pelo OneSignal
2. Manter todas as funcionalidades existentes
3. Melhorar a confiabilidade e escalabilidade das notificações
4. Garantir compatibilidade com iOS e Android
5. Implementar segmentação avançada de usuários
6. Zero downtime durante a migração

## 📊 Análise do Sistema Atual

### Backend (Node.js/Express)
- **Serviço Principal**: `backend/src/services/pushNotification.js`
- **Cron Job**: `backend/src/services/cron/sendNotifications.js`
- **Integração**: `backend/src/services/coupons/couponNotificationService.js`
- **Rotas**: `backend/src/routes/notificationRoutes.js`
- **Controlador**: `backend/src/controllers/NotificationController.js`

### App Mobile (React Native/Expo)
- **Store**: `app/src/stores/notificationStore.js`
- **Dependência**: `expo-notifications@~0.32.16`
- **Configuração**: `app/app.json` (plugin expo-notifications)

### Funcionalidades Atuais
1. ✅ Registro de push tokens
2. ✅ Envio de notificações individuais
3. ✅ Envio em massa (batch)
4. ✅ Notificações de novos cupons
5. ✅ Notificações de queda de preço
6. ✅ Notificações de cupons expirando
7. ✅ Notificações de novas promoções
8. ✅ Notificações personalizadas
9. ✅ Canais de notificação (Android)
10. ✅ Listeners de interação

## 🏗️ Arquitetura da Nova Solução

### OneSignal Features
- ✅ SDK nativo para React Native
- ✅ API REST completa
- ✅ Segmentação avançada de usuários
- ✅ Templates de notificação
- ✅ Analytics e métricas
- ✅ Retry automático
- ✅ Suporte a deep linking
- ✅ Notificações silenciosas
- ✅ Rich media (imagens, botões)

### Componentes a Implementar

#### Backend
1. **OneSignalService** (`backend/src/services/oneSignalService.js`)
   - Wrapper da API do OneSignal
   - Gerenciamento de usuários
   - Envio de notificações
   - Segmentação
   - Templates

2. **Migration Service** (`backend/src/services/oneSignalMigration.js`)
   - Migração de tokens existentes
   - Sincronização de usuários
   - Validação de dados

3. **Atualização de Rotas**
   - Manter compatibilidade com endpoints existentes
   - Adicionar novos endpoints OneSignal

#### App Mobile
1. **OneSignal SDK Integration**
   - Instalação do `react-native-onesignal`
   - Configuração de inicialização
   - Handlers de eventos

2. **Store Refactoring**
   - Atualizar `notificationStore.js`
   - Manter interface compatível
   - Adicionar features OneSignal

## 📝 Etapas de Implementação

### Fase 1: Preparação (Dia 1)
- [x] Criar conta OneSignal
- [ ] Configurar app no OneSignal Dashboard
- [ ] Obter App ID e REST API Key
- [ ] Configurar certificados iOS (se aplicável)
- [ ] Configurar Firebase para Android
- [ ] Documentar credenciais

### Fase 2: Backend Implementation (Dia 1-2)
- [ ] Instalar dependência `onesignal-node`
- [ ] Criar `oneSignalService.js`
- [ ] Implementar métodos principais:
  - `createUser()`
  - `updateUser()`
  - `sendNotification()`
  - `sendBatch()`
  - `createSegment()`
  - `deleteUser()`
- [ ] Criar `oneSignalMigration.js`
- [ ] Atualizar variáveis de ambiente
- [ ] Criar testes unitários

### Fase 3: App Mobile Implementation (Dia 2-3)
- [ ] Instalar `react-native-onesignal`
- [ ] Configurar `app.json` / `app.config.js`
- [ ] Atualizar `notificationStore.js`
- [ ] Implementar inicialização
- [ ] Configurar event handlers
- [ ] Testar em desenvolvimento

### Fase 4: Migração de Dados (Dia 3)
- [ ] Script de migração de tokens
- [ ] Validação de dados migrados
- [ ] Backup de dados antigos
- [ ] Sincronização de preferências

### Fase 5: Integração e Testes (Dia 4)
- [ ] Testes de envio individual
- [ ] Testes de envio em massa
- [ ] Testes de segmentação
- [ ] Testes de deep linking
- [ ] Testes de notificações silenciosas
- [ ] Testes de interação
- [ ] Testes em iOS
- [ ] Testes em Android

### Fase 6: Remoção do Expo Notifications (Dia 5)
- [ ] Remover dependência `expo-notifications`
- [ ] Remover código legado
- [ ] Limpar configurações
- [ ] Atualizar documentação
- [ ] Code review final

### Fase 7: Deploy e Monitoramento (Dia 5-6)
- [ ] Deploy em staging
- [ ] Testes em staging
- [ ] Deploy em produção (gradual)
- [ ] Monitoramento de métricas
- [ ] Validação de funcionalidades

## 🔄 Estratégia de Rollback

### Cenários de Rollback

#### Rollback Completo (Crítico)
**Quando usar**: Falhas críticas que impedem o funcionamento

**Passos**:
1. Reverter deploy do backend
2. Reverter deploy do app mobile
3. Restaurar variáveis de ambiente antigas
4. Reativar serviço Expo Notifications
5. Validar funcionamento

**Tempo estimado**: 15-30 minutos

#### Rollback Parcial (Moderado)
**Quando usar**: Problemas em funcionalidades específicas

**Passos**:
1. Desabilitar OneSignal via feature flag
2. Reativar Expo Notifications temporariamente
3. Investigar e corrigir problema
4. Reativar OneSignal

**Tempo estimado**: 1-2 horas

### Feature Flags

```javascript
// backend/.env
ONESIGNAL_ENABLED=true
EXPO_NOTIFICATIONS_FALLBACK=false

// Código
if (process.env.ONESIGNAL_ENABLED === 'true') {
  await oneSignalService.send(notification);
} else {
  await pushNotificationService.send(notification);
}
```

### Backup de Dados

```sql
-- Backup de tokens antes da migração
CREATE TABLE push_tokens_backup AS 
SELECT id, user_id, push_token, created_at, updated_at 
FROM users 
WHERE push_token IS NOT NULL;

-- Backup de notificações
CREATE TABLE notifications_backup AS 
SELECT * FROM notifications 
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## 🧪 Plano de Testes

### Testes Unitários

#### Backend
```javascript
describe('OneSignalService', () => {
  test('deve criar usuário no OneSignal', async () => {
    const result = await oneSignalService.createUser({
      external_id: 'user123',
      email: 'test@example.com'
    });
    expect(result.success).toBe(true);
  });

  test('deve enviar notificação individual', async () => {
    const result = await oneSignalService.sendNotification({
      user_id: 'user123',
      title: 'Test',
      message: 'Test message'
    });
    expect(result.success).toBe(true);
  });

  test('deve enviar notificações em batch', async () => {
    const users = ['user1', 'user2', 'user3'];
    const result = await oneSignalService.sendBatch(users, {
      title: 'Batch Test',
      message: 'Batch message'
    });
    expect(result.success).toBeGreaterThan(0);
  });
});
```

#### App Mobile
```javascript
describe('NotificationStore', () => {
  test('deve inicializar OneSignal', async () => {
    const store = useNotificationStore.getState();
    await store.initialize();
    expect(store.isInitialized).toBe(true);
  });

  test('deve registrar device', async () => {
    const store = useNotificationStore.getState();
    const result = await store.registerDevice();
    expect(result.success).toBe(true);
  });
});
```

### Testes de Integração

1. **Fluxo Completo de Registro**
   - Usuário instala app
   - App solicita permissão
   - Device é registrado no OneSignal
   - Backend recebe external_id
   - Validar no OneSignal Dashboard

2. **Fluxo de Notificação de Cupom**
   - Novo cupom é criado
   - Sistema envia notificação
   - Usuário recebe notificação
   - Usuário clica na notificação
   - App abre tela correta

3. **Fluxo de Segmentação**
   - Criar segmento de usuários
   - Enviar notificação para segmento
   - Validar recebimento apenas por usuários do segmento

### Testes Manuais

- [ ] Notificação com app em foreground
- [ ] Notificação com app em background
- [ ] Notificação com app fechado
- [ ] Deep linking funciona corretamente
- [ ] Badges são atualizados
- [ ] Sons e vibrações funcionam
- [ ] Imagens são exibidas
- [ ] Botões de ação funcionam
- [ ] Notificações silenciosas
- [ ] Cancelamento de notificações

## 📊 Métricas de Sucesso

### KPIs Principais
- Taxa de entrega: > 95%
- Taxa de abertura: manter ou melhorar
- Latência de envio: < 5 segundos
- Taxa de erro: < 1%
- Uptime: > 99.9%

### Monitoramento
- Dashboard OneSignal
- Logs do backend
- Métricas de erro
- Feedback de usuários

## 🔐 Segurança

### Credenciais
- OneSignal App ID: variável de ambiente
- OneSignal REST API Key: variável de ambiente
- Nunca commitar credenciais
- Usar secrets management em produção

### Dados de Usuários
- Criptografar external_ids
- Não enviar PII desnecessária
- Compliance com LGPD
- Política de retenção de dados

## 📚 Documentação

### Documentos a Criar/Atualizar
- [x] Plano de migração (este documento)
- [ ] Guia de configuração OneSignal
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] README atualizado
- [ ] Changelog

### Treinamento
- Documentação para desenvolvedores
- Guia para suporte
- FAQ para usuários

## 🚀 Cronograma

| Fase | Duração | Responsável | Status |
|------|---------|-------------|--------|
| Preparação | 4h | DevOps | ⏳ Pendente |
| Backend Implementation | 8h | Backend Dev | ⏳ Pendente |
| App Implementation | 8h | Mobile Dev | ⏳ Pendente |
| Migração de Dados | 4h | Backend Dev | ⏳ Pendente |
| Testes | 8h | QA Team | ⏳ Pendente |
| Remoção Legado | 4h | Full Stack | ⏳ Pendente |
| Deploy | 4h | DevOps | ⏳ Pendente |

**Total estimado**: 5-6 dias úteis

## ✅ Checklist Final

### Pré-Deploy
- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Backup de dados realizado
- [ ] Feature flags configuradas
- [ ] Rollback plan testado
- [ ] Stakeholders notificados

### Pós-Deploy
- [ ] Monitoramento ativo
- [ ] Métricas sendo coletadas
- [ ] Sem erros críticos
- [ ] Funcionalidades validadas
- [ ] Usuários notificados (se necessário)
- [ ] Documentação publicada

## 📞 Contatos de Emergência

- **OneSignal Support**: support@onesignal.com
- **Documentação**: https://documentation.onesignal.com/
- **Status Page**: https://status.onesignal.com/

---

**Última atualização**: 2026-02-27
**Versão**: 1.0
**Status**: 📝 Em Planejamento

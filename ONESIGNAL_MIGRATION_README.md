# 🔔 Migração OneSignal - PreçoCerto

## 📋 Visão Geral

Este documento é o ponto de entrada para a migração completa dos sistemas de comunicação do PreçoCerto:

1. **Push Notifications**: Expo Go Notifications → OneSignal Push
2. **Email**: SMTP (Nodemailer) → OneSignal Email

## 🎯 Objetivos

### Push Notifications

- Substituir Expo Go Notifications por OneSignal Push
- Melhorar taxa de entrega (85% → 95%)
- Adicionar segmentação avançada e analytics

### Email

- Substituir SMTP por OneSignal Email
- Melhorar deliverability (85% → 95%)
- Adicionar tracking de abertura e cliques
- Simplificar configuração (sem SMTP)

## 📚 Documentação

### Documentos Principais

#### Push Notifications

1. **[Plano de Migração Push](./docs/ONESIGNAL_MIGRATION_PLAN.md)**
   - Análise do sistema atual
   - Arquitetura da nova solução
   - Etapas de implementação
   - Estratégia de rollback
   - Cronograma

2. **[Guia de Configuração Push](./docs/ONESIGNAL_SETUP_GUIDE.md)**
   - Configuração do OneSignal Dashboard
   - Configuração do Firebase (Android)
   - Configuração do Apple Developer (iOS)
   - Configuração do Backend
   - Configuração do App Mobile
   - Troubleshooting

3. **[Guia de Testes Push](./docs/ONESIGNAL_TESTING_GUIDE.md)**
   - Testes unitários
   - Testes de integração
   - Testes manuais
   - Testes de performance
   - Testes de segurança

4. **[Guia de Rollback Push](./docs/ONESIGNAL_ROLLBACK_GUIDE.md)**
   - Cenários de rollback
   - Procedimentos detalhados
   - Scripts de rollback
   - Validação pós-rollback

5. **[Resumo da Implementação Push](./docs/ONESIGNAL_IMPLEMENTATION_SUMMARY.md)**
   - O que foi implementado
   - Arquivos criados/modificados
   - Próximos passos
   - Checklist final

6. **[Exemplos de API Push](./docs/ONESIGNAL_API_EXAMPLES.md)**
   - Exemplos práticos de código
   - Casos de uso reais
   - Integração no app
   - Debug e troubleshooting

#### Email

7. **[Migração de Email](./docs/ONESIGNAL_EMAIL_MIGRATION.md)** ⭐
   - Comparação SMTP vs OneSignal
   - Configuração passo a passo
   - Testes e validação
   - Rollback plan
   - Benefícios e economia

#### Executivos

8. **[Resumo Executivo](./docs/ONESIGNAL_EXECUTIVE_SUMMARY.md)**
   - Visão geral do projeto
   - Justificativa de negócio
   - Impacto financeiro
   - Riscos e mitigações
   - Recomendações

#### Índice Central

9. **[Documentação Completa](./docs/ONESIGNAL_README.md)**
   - Índice de todos os documentos
   - Busca por tópico
   - Busca por pergunta
   - Quick start guides

## 🚀 Quick Start

### Push Notifications

#### 1. Configuração Inicial

```bash
# 1. Criar conta no OneSignal
# Acesse: https://onesignal.com

# 2. Configurar Firebase (Android)
# Acesse: https://console.firebase.google.com

# 3. Obter credenciais
# OneSignal Dashboard > Settings > Keys & IDs
```

#### 2. Backend

```bash
# Instalar dependências
cd backend
npm install

# Configurar variáveis de ambiente
cp .env.example .env
nano .env

# Adicionar:
# ONESIGNAL_ENABLED=true
# ONESIGNAL_APP_ID=seu-app-id
# ONESIGNAL_REST_API_KEY=sua-api-key

# Aplicar migração do banco
node scripts/apply-onesignal-migration.js

# Iniciar backend
npm start
```

#### 3. App Mobile

```bash
# Instalar dependências
cd app
npm install

# Configurar variáveis de ambiente
cp .env.example .env
nano .env

# Adicionar:
# ONESIGNAL_APP_ID=seu-app-id

# Build Android
npx expo run:android

# Build iOS (opcional)
npx expo run:ios
```

### Email

#### 1. Configuração OneSignal Email

```bash
# 1. Configurar domínio no OneSignal Dashboard
# Settings > Email > Add Domain

# 2. Configurar DNS
# SPF: v=spf1 include:onesignal.com ~all
# DKIM: (copiar do dashboard)
# DMARC: v=DMARC1; p=none; rua=mailto:dmarc@precocerto.app

# 3. Verificar domínio
```

#### 2. Backend

```bash
# Configurar variáveis de ambiente
nano backend/.env

# Adicionar:
# ONESIGNAL_EMAIL_ENABLED=true
# ONESIGNAL_FROM_EMAIL=noreply@precocerto.app
# ONESIGNAL_FROM_NAME=PreçoCerto

# Reiniciar backend
pm2 restart all
```

#### 3. Testar

```bash
# Testar envio de email
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@example.com"}'
```

### 4. Testar

```bash
# Testar envio de notificação
curl -X POST http://localhost:3000/api/onesignal/test \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123",
    "title": "Teste",
    "message": "Mensagem de teste"
  }'
```

### 5. Migrar Usuários

```bash
# Ver estatísticas
curl -X GET http://localhost:3000/api/onesignal/migration/stats \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"

# Executar migração (dry run)
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 10}'

# Executar migração (produção)
curl -X POST http://localhost:3000/api/onesignal/migration/start \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## 📊 Status da Implementação

### ✅ Completo

- [x] Serviços backend (OneSignal, Migration, Wrapper)
- [x] Rotas de API
- [x] Migração do banco de dados
- [x] Store do app mobile
- [x] Documentação completa
- [x] Scripts de automação

### ⏳ Pendente

- [ ] Configuração do OneSignal Dashboard
- [ ] Configuração do Firebase
- [ ] Obtenção de credenciais
- [ ] Aplicação da migração do banco
- [ ] Testes em desenvolvimento
- [ ] Migração de usuários
- [ ] Deploy em produção

## 🔧 Arquitetura

### Backend

```
backend/
├── src/
│   ├── services/
│   │   ├── oneSignalService.js          # Serviço principal OneSignal
│   │   ├── oneSignalMigration.js        # Serviço de migração
│   │   ├── pushNotificationWrapper.js   # Wrapper para transição
│   │   └── pushNotification.js          # Serviço Expo (legado)
│   └── routes/
│       └── oneSignalRoutes.js           # Rotas de gerenciamento
├── database/
│   └── migrations/
│       └── add_onesignal_columns.sql    # Migração do banco
└── scripts/
    └── apply-onesignal-migration.js     # Script de migração
```

### App Mobile

```
app/
├── src/
│   └── stores/
│       ├── oneSignalStore.js            # Store OneSignal (novo)
│       └── notificationStore.js         # Store Expo (legado)
└── package.json
```

## 🎯 Funcionalidades

### Mantidas do Expo

- ✅ Registro de push tokens
- ✅ Envio individual e em massa
- ✅ Notificações de cupons
- ✅ Notificações de preços
- ✅ Notificações personalizadas
- ✅ Deep linking
- ✅ Navegação automática

### Novas do OneSignal

- ✅ Segmentação avançada
- ✅ Tags personalizadas
- ✅ Notificações com imagens
- ✅ Notificações com botões
- ✅ Analytics detalhado
- ✅ Retry automático
- ✅ Melhor taxa de entrega
- ✅ A/B testing

## 📈 Métricas Esperadas

| Métrica | Expo | OneSignal | Melhoria |
|---------|------|-----------|----------|
| Taxa de Entrega | ~85% | >95% | +10% |
| Latência Média | ~5s | <3s | -40% |
| Taxa de Abertura | ~8% | >10% | +25% |
| Analytics | Básico | Avançado | ✅ |
| Segmentação | Limitada | Avançada | ✅ |

## 🔐 Segurança

- ✅ Credenciais em variáveis de ambiente
- ✅ Validação de dados
- ✅ Rate limiting
- ✅ Autenticação obrigatória
- ✅ Backup automático
- ✅ Logs de auditoria

## 🚨 Rollback

Em caso de problemas, existem 3 tipos de rollback:

1. **Rápido (5-10 min)**: Feature flag
2. **Médio (30-60 min)**: Reverter código
3. **Completo (2-4h)**: Restaurar banco + código

Veja [Guia de Rollback](./docs/ONESIGNAL_ROLLBACK_GUIDE.md) para detalhes.

## 📞 Suporte

### Documentação

- [OneSignal Docs](https://documentation.onesignal.com/)
- [React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [REST API](https://documentation.onesignal.com/reference/create-notification)

### Contatos

- OneSignal Support: support@onesignal.com
- OneSignal Status: https://status.onesignal.com/

## 🤝 Contribuindo

1. Leia a documentação completa
2. Teste em ambiente de desenvolvimento
3. Documente mudanças
4. Crie pull request

## 📝 Changelog

### v1.0.0 (2026-02-27)

- ✅ Implementação inicial completa
- ✅ Serviços backend
- ✅ Store app mobile
- ✅ Migração do banco
- ✅ Documentação completa

## 📄 Licença

Este projeto é parte do sistema PreçoCerto.

---

**Status**: ✅ Implementação Completa  
**Próximo Passo**: Configuração e Testes  
**Última Atualização**: 2026-02-27

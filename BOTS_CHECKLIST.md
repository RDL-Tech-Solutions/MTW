# ✅ Checklist de Implementação - Sistema de Bots

## 📋 Guia Passo a Passo

Use este checklist para garantir que tudo foi configurado corretamente.

---

## 🗄️ FASE 1: Banco de Dados

### 1.1 Executar Migration
- [ ] Abrir Supabase Dashboard
- [ ] Ir em SQL Editor
- [ ] Copiar conteúdo de `database/migrations/001_add_bot_tables.sql`
- [ ] Executar SQL
- [ ] Verificar se tabelas foram criadas:
  - [ ] `bot_channels`
  - [ ] `notification_logs`
- [ ] Verificar se não há erros

**Comando de verificação:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('bot_channels', 'notification_logs');
```

---

## 🤖 FASE 2: Configurar Bots

### 2.1 Telegram Bot
- [ ] Abrir Telegram
- [ ] Procurar por `@BotFather`
- [ ] Enviar `/newbot`
- [ ] Escolher nome do bot
- [ ] Escolher username (deve terminar com `_bot`)
- [ ] Copiar token fornecido
- [ ] Salvar token em local seguro

### 2.2 Obter Chat ID do Telegram
- [ ] Criar grupo no Telegram
- [ ] Adicionar seu bot ao grupo
- [ ] Adicionar `@getidsbot` ao grupo
- [ ] Copiar Chat ID fornecido (começa com `-`)
- [ ] Remover `@getidsbot` do grupo

**Comando de verificação:**
```bash
curl https://api.telegram.org/bot{SEU_TOKEN}/getMe
```

### 2.3 WhatsApp Bot (Opcional)
- [ ] Escolher provedor:
  - [ ] Meta WhatsApp Cloud API (gratuito até 1000 msgs/mês)
  - [ ] Z-API (mais simples)
  - [ ] UltraMsg
  - [ ] Evolution API
- [ ] Criar conta no provedor escolhido
- [ ] Obter credenciais (Token, Phone Number ID, etc)
- [ ] Salvar credenciais em local seguro

---

## ⚙️ FASE 3: Configurar Backend

### 3.1 Variáveis de Ambiente
- [ ] Abrir `backend/.env`
- [ ] Adicionar/Verificar variáveis:

```env
# Telegram
TELEGRAM_BOT_TOKEN=seu_token_aqui

# WhatsApp (se for usar)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui

# Cron Jobs
ENABLE_CRON_JOBS=true
```

- [ ] Salvar arquivo
- [ ] Verificar se não há espaços extras

### 3.2 Reiniciar Backend
- [ ] Parar servidor se estiver rodando
- [ ] Executar: `cd backend`
- [ ] Executar: `npm run dev`
- [ ] Verificar se iniciou sem erros
- [ ] Verificar se cron jobs foram iniciados (ver logs)

**Verificar logs:**
```bash
tail -f backend/logs/app.log | grep -i "cron\|bot"
```

---

## 🔐 FASE 4: Autenticação

### 4.1 Fazer Login como Admin
- [ ] Abrir terminal/Postman/Insomnia
- [ ] Fazer requisição de login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mtwpromo.com",
    "password": "sua_senha"
  }'
```

- [ ] Copiar token JWT retornado
- [ ] Salvar token para próximas requisições

---

## 📱 FASE 5: Cadastrar Canais

### 5.1 Cadastrar Canal do Telegram
- [ ] Fazer requisição POST:

```bash
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "identifier": "-1001234567890",
    "name": "Grupo Principal",
    "is_active": true
  }'
```

- [ ] Verificar resposta de sucesso
- [ ] Copiar ID do canal criado

### 5.2 Cadastrar Canal do WhatsApp (Opcional)
- [ ] Fazer requisição POST:

```bash
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "identifier": "120363123456789012@g.us",
    "name": "Grupo WhatsApp",
    "is_active": true
  }'
```

- [ ] Verificar resposta de sucesso

### 5.3 Listar Canais Cadastrados
- [ ] Fazer requisição GET:

```bash
curl http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer SEU_TOKEN"
```

- [ ] Verificar se canais aparecem na lista
- [ ] Verificar se `is_active` está `true`

---

## 🧪 FASE 6: Testes

### 6.1 Teste Básico
- [ ] Enviar mensagem de teste:

```bash
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer SEU_TOKEN"
```

- [ ] Verificar se mensagem chegou no grupo do Telegram
- [ ] Verificar se mensagem chegou no grupo do WhatsApp (se configurado)
- [ ] Verificar logs:

```bash
curl http://localhost:3000/api/bots/logs \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 6.2 Teste de Notificação Automática - Cupom
- [ ] Criar cupom de teste:

```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TESTE10",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 10,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z",
    "is_general": true
  }'
```

- [ ] Verificar se notificação foi enviada automaticamente
- [ ] Verificar se mensagem chegou nos grupos
- [ ] Verificar logs de notificação

### 6.3 Teste de Notificação Automática - Promoção
- [ ] Obter ID de uma categoria válida
- [ ] Criar produto com desconto:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produto Teste",
    "image_url": "https://exemplo.com/img.jpg",
    "platform": "shopee",
    "current_price": 99.90,
    "old_price": 199.90,
    "category_id": "UUID_CATEGORIA",
    "affiliate_link": "https://exemplo.com",
    "external_id": "TEST123"
  }'
```

- [ ] Verificar se notificação foi enviada automaticamente
- [ ] Verificar se mensagem chegou nos grupos
- [ ] Verificar logs de notificação

### 6.4 Teste de Cupom Expirado
- [ ] Criar cupom que expira em 2 minutos:

```bash
# Calcular data de expiração (agora + 2 minutos)
# Exemplo: 2024-12-11T18:02:00Z
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EXPIRA_RAPIDO",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 5,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-11T18:02:00Z",
    "is_general": true
  }'
```

- [ ] Aguardar 2-3 minutos
- [ ] Verificar se notificação de expiração foi enviada
- [ ] Verificar se cupom foi desativado automaticamente
- [ ] Verificar logs

---

## 📊 FASE 7: Monitoramento

### 7.1 Verificar Status dos Bots
- [ ] Fazer requisição:

```bash
curl http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

- [ ] Verificar se Telegram está configurado
- [ ] Verificar se WhatsApp está configurado (se aplicável)
- [ ] Verificar número de canais ativos

### 7.2 Verificar Estatísticas
- [ ] Fazer requisição:

```bash
curl http://localhost:3000/api/bots/stats \
  -H "Authorization: Bearer SEU_TOKEN"
```

- [ ] Verificar total de notificações
- [ ] Verificar taxa de sucesso
- [ ] Verificar distribuição por plataforma

### 7.3 Verificar Logs do Servidor
- [ ] Abrir logs em tempo real:

```bash
tail -f backend/logs/app.log | grep -i bot
```

- [ ] Verificar se não há erros
- [ ] Verificar se cron job está rodando
- [ ] Verificar se notificações estão sendo enviadas

---

## 🎨 FASE 8: Painel Admin (Opcional)

### 8.1 Implementar Página de Bots
- [ ] Copiar `admin-panel/BOTS_PAGE_EXAMPLE.jsx`
- [ ] Renomear para `admin-panel/src/pages/Bots.jsx`
- [ ] Adicionar rota no router
- [ ] Adicionar item no menu
- [ ] Testar interface

### 8.2 Funcionalidades da UI
- [ ] Listar canais
- [ ] Adicionar novo canal
- [ ] Editar canal
- [ ] Ativar/Desativar canal
- [ ] Deletar canal
- [ ] Enviar teste
- [ ] Ver logs
- [ ] Ver estatísticas
- [ ] Ver status dos bots

---

## 🚀 FASE 9: Produção

### 9.1 Preparar para Produção
- [ ] Criar bots oficiais (não usar bots de teste)
- [ ] Configurar grupos/canais oficiais
- [ ] Atualizar variáveis de ambiente de produção
- [ ] Testar em ambiente de staging primeiro
- [ ] Configurar monitoramento (logs, alertas)
- [ ] Documentar credenciais em local seguro

### 9.2 Deploy
- [ ] Fazer backup do banco de dados
- [ ] Executar migration em produção
- [ ] Atualizar código no servidor
- [ ] Reiniciar aplicação
- [ ] Verificar se cron jobs iniciaram
- [ ] Cadastrar canais de produção
- [ ] Fazer testes em produção

### 9.3 Monitoramento Pós-Deploy
- [ ] Verificar logs por 24h
- [ ] Monitorar taxa de sucesso
- [ ] Verificar se notificações estão chegando
- [ ] Coletar feedback dos usuários
- [ ] Ajustar conforme necessário

---

## 📚 FASE 10: Documentação

### 10.1 Documentar Configuração
- [ ] Documentar tokens e credenciais
- [ ] Documentar IDs dos grupos/canais
- [ ] Documentar procedimentos de manutenção
- [ ] Criar runbook para troubleshooting

### 10.2 Treinar Equipe
- [ ] Treinar admins para usar o painel
- [ ] Explicar como adicionar novos canais
- [ ] Mostrar como verificar logs
- [ ] Ensinar troubleshooting básico

---

## ✅ CHECKLIST FINAL

### Verificações Finais
- [ ] Banco de dados configurado
- [ ] Bots criados e funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Backend rodando sem erros
- [ ] Canais cadastrados e ativos
- [ ] Testes realizados com sucesso
- [ ] Notificações automáticas funcionando
- [ ] Logs sendo registrados
- [ ] Estatísticas disponíveis
- [ ] Documentação completa
- [ ] Equipe treinada

### Testes de Integração
- [ ] Criar cupom → Notificação enviada
- [ ] Criar promoção → Notificação enviada
- [ ] Cupom expira → Notificação enviada + cupom desativado
- [ ] Teste manual → Mensagem recebida
- [ ] Logs registrados corretamente
- [ ] Estatísticas atualizadas

---

## 🎉 CONCLUSÃO

Se todos os itens estão marcados, o sistema está **100% funcional**!

### Próximos Passos
1. Monitorar por alguns dias
2. Coletar feedback
3. Ajustar mensagens se necessário
4. Adicionar mais canais conforme demanda
5. Implementar melhorias futuras

---

## 📞 Suporte

Se algo não funcionar:

1. **Verificar logs**: `tail -f backend/logs/app.log`
2. **Verificar status**: `GET /api/bots/status`
3. **Verificar canais**: `GET /api/bots/channels`
4. **Testar manualmente**: `POST /api/bots/test`
5. **Consultar documentação**: `BOTS_DOCUMENTATION.md`

---

**✨ Sistema de Bots Implementado com Sucesso! ✨**

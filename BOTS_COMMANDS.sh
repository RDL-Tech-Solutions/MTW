#!/bin/bash
# ========================================
# Comandos Úteis - Sistema de Bots
# ========================================
# Copie e cole os comandos conforme necessário

# ========================================
# CONFIGURAÇÃO INICIAL
# ========================================

# 1. Navegar para o backend
cd backend

# 2. Verificar se .env está configurado
cat .env | grep -E "TELEGRAM_BOT_TOKEN|WHATSAPP|ENABLE_CRON"

# 3. Reiniciar servidor
npm run dev

# ========================================
# TELEGRAM - CONFIGURAÇÃO
# ========================================

# Verificar se bot está funcionando (substitua {TOKEN})
curl https://api.telegram.org/bot{SEU_TOKEN}/getMe

# Obter atualizações (para pegar Chat ID)
curl https://api.telegram.org/bot{SEU_TOKEN}/getUpdates

# Enviar mensagem de teste
curl -X POST https://api.telegram.org/bot{SEU_TOKEN}/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "-1001234567890",
    "text": "🤖 Teste do Bot"
  }'

# ========================================
# API - FAZER LOGIN
# ========================================

# Login como admin e salvar token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mtwpromo.com",
    "password": "sua_senha"
  }' | jq -r '.data.token'

# Salvar token em variável (Linux/Mac)
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtwpromo.com","password":"sua_senha"}' \
  | jq -r '.data.token')

# Verificar token
echo $TOKEN

# ========================================
# GERENCIAR CANAIS
# ========================================

# Listar todos os canais
curl http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" | jq

# Criar canal do Telegram
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "identifier": "-1001234567890",
    "name": "Grupo Principal",
    "is_active": true
  }' | jq

# Criar canal do WhatsApp
curl -X POST http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "identifier": "120363123456789012@g.us",
    "name": "Grupo WhatsApp",
    "is_active": true
  }' | jq

# Listar apenas canais ativos
curl "http://localhost:3000/api/bots/channels?is_active=true" \
  -H "Authorization: Bearer $TOKEN" | jq

# Atualizar canal (substitua UUID_DO_CANAL)
curl -X PUT http://localhost:3000/api/bots/channels/UUID_DO_CANAL \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Nome",
    "is_active": true
  }' | jq

# Desativar canal
curl -X PATCH http://localhost:3000/api/bots/channels/UUID_DO_CANAL/toggle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' | jq

# Deletar canal
curl -X DELETE http://localhost:3000/api/bots/channels/UUID_DO_CANAL \
  -H "Authorization: Bearer $TOKEN"

# ========================================
# TESTES
# ========================================

# Enviar teste para todos os canais
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer $TOKEN" | jq

# Enviar teste para canal específico
curl -X POST http://localhost:3000/api/bots/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channelId": "UUID_DO_CANAL"}' | jq

# ========================================
# LOGS E MONITORAMENTO
# ========================================

# Ver logs recentes
curl "http://localhost:3000/api/bots/logs?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# Ver logs com filtros
curl "http://localhost:3000/api/bots/logs?platform=telegram&status=sent&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq

# Ver estatísticas
curl http://localhost:3000/api/bots/stats \
  -H "Authorization: Bearer $TOKEN" | jq

# Ver status dos bots
curl http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer $TOKEN" | jq

# Ver logs do servidor em tempo real
tail -f logs/app.log | grep -i "bot\|notification"

# Ver apenas erros
tail -f logs/app.log | grep -i "error.*bot"

# ========================================
# TESTAR NOTIFICAÇÕES AUTOMÁTICAS
# ========================================

# Criar cupom de teste (dispara notificação)
curl -X POST http://localhost:3000/api/coupons \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TESTE10",
    "platform": "shopee",
    "discount_type": "percentage",
    "discount_value": 10,
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2024-12-31T23:59:59Z",
    "is_general": true
  }' | jq

# Criar produto com desconto (dispara notificação)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartphone Teste",
    "image_url": "https://exemplo.com/img.jpg",
    "platform": "shopee",
    "current_price": 999.90,
    "old_price": 1999.90,
    "category_id": "UUID_CATEGORIA",
    "affiliate_link": "https://exemplo.com",
    "external_id": "TEST123"
  }' | jq

# ========================================
# VERIFICAÇÕES DE SAÚDE
# ========================================

# Health check da API
curl http://localhost:3000/api/health | jq

# Verificar se servidor está rodando
curl http://localhost:3000/ | jq

# Verificar conexão com banco
curl http://localhost:3000/api/health | jq '.success'

# ========================================
# BANCO DE DADOS
# ========================================

# Contar canais ativos (via psql)
# psql -h SEU_HOST -U postgres -d MTW -c "SELECT COUNT(*) FROM bot_channels WHERE is_active = true;"

# Ver últimos logs (via psql)
# psql -h SEU_HOST -U postgres -d MTW -c "SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10;"

# Limpar logs antigos manualmente (via psql)
# psql -h SEU_HOST -U postgres -d MTW -c "DELETE FROM notification_logs WHERE created_at < NOW() - INTERVAL '30 days';"

# ========================================
# DOCKER (se estiver usando)
# ========================================

# Ver logs do container
# docker logs -f mtw-backend | grep -i bot

# Reiniciar container
# docker restart mtw-backend

# Entrar no container
# docker exec -it mtw-backend sh

# ========================================
# DESENVOLVIMENTO
# ========================================

# Rodar em modo desenvolvimento
npm run dev

# Ver logs em tempo real (outra janela)
tail -f logs/app.log

# Verificar processos Node rodando
ps aux | grep node

# Matar processo Node (se necessário)
# pkill -f node

# ========================================
# PRODUÇÃO
# ========================================

# Rodar em produção
npm start

# Usar PM2 (recomendado)
# pm2 start src/server.js --name mtw-backend
# pm2 logs mtw-backend
# pm2 restart mtw-backend
# pm2 stop mtw-backend

# ========================================
# TROUBLESHOOTING
# ========================================

# Verificar variáveis de ambiente
env | grep -E "TELEGRAM|WHATSAPP|CRON"

# Testar conexão com Telegram
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe

# Verificar se cron jobs estão habilitados
cat .env | grep ENABLE_CRON_JOBS

# Ver últimas 50 linhas do log
tail -n 50 logs/app.log

# Buscar erros específicos
grep -i "error" logs/app.log | tail -n 20

# Verificar se porta 3000 está em uso
lsof -i :3000
# ou
netstat -an | grep 3000

# ========================================
# BACKUP
# ========================================

# Backup dos canais (via API)
curl http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" > backup_channels.json

# Backup dos logs (últimos 1000)
curl "http://localhost:3000/api/bots/logs?limit=1000" \
  -H "Authorization: Bearer $TOKEN" > backup_logs.json

# ========================================
# UTILITÁRIOS
# ========================================

# Formatar JSON com jq
echo '{"test":"value"}' | jq

# Extrair apenas campo específico
curl http://localhost:3000/api/bots/status \
  -H "Authorization: Bearer $TOKEN" | jq '.data.telegram.channels'

# Contar canais ativos
curl http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Ver apenas nomes dos canais
curl http://localhost:3000/api/bots/channels \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].name'

# ========================================
# SCRIPTS ÚTEIS
# ========================================

# Script para monitorar logs em tempo real com cores
# tail -f logs/app.log | grep --color=always -E "ERROR|WARNING|SUCCESS|$"

# Script para enviar notificação de teste a cada 5 minutos
# while true; do
#   curl -X POST http://localhost:3000/api/bots/test \
#     -H "Authorization: Bearer $TOKEN"
#   sleep 300
# done

# ========================================
# WINDOWS (PowerShell)
# ========================================

# Fazer login e salvar token
# $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"email":"admin@mtwpromo.com","password":"senha"}' -ContentType "application/json"
# $token = $response.data.token

# Listar canais
# Invoke-RestMethod -Uri "http://localhost:3000/api/bots/channels" -Headers @{Authorization="Bearer $token"}

# Enviar teste
# Invoke-RestMethod -Uri "http://localhost:3000/api/bots/test" -Method Post -Headers @{Authorization="Bearer $token"}

# ========================================
# NOTAS
# ========================================

# - Substitua $TOKEN pelo seu token real
# - Substitua UUID_DO_CANAL pelos IDs reais
# - Substitua UUID_CATEGORIA por uma categoria válida
# - Para Windows, use PowerShell ou Git Bash
# - Instale jq para formatar JSON: apt-get install jq (Linux) ou brew install jq (Mac)
# - Todos os comandos assumem que a API está rodando em localhost:3000

# ========================================
# ATALHOS ÚTEIS
# ========================================

# Alias para facilitar (adicione ao ~/.bashrc ou ~/.zshrc)
# alias bot-logs='tail -f logs/app.log | grep -i bot'
# alias bot-test='curl -X POST http://localhost:3000/api/bots/test -H "Authorization: Bearer $TOKEN"'
# alias bot-status='curl http://localhost:3000/api/bots/status -H "Authorization: Bearer $TOKEN" | jq'
# alias bot-channels='curl http://localhost:3000/api/bots/channels -H "Authorization: Bearer $TOKEN" | jq'

echo "✅ Comandos carregados! Use conforme necessário."

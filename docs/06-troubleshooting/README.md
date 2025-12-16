# 🆘 Troubleshooting

Guia de solução de problemas comuns.

## 🔌 Problemas de Conexão

### Backend não inicia
- Verifique se a porta 3000 está livre
- Confirme as variáveis de ambiente
- Verifique os logs (`logs/app.log`)

### Erro de conexão com Supabase
- Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
- Confirme que o projeto está ativo
- Teste a conexão no Supabase dashboard

### Erro de conexão com Redis
- Redis é opcional para desenvolvimento
- Se não usar Redis, deixe as variáveis vazias
- Para produção, configure Redis corretamente

## 🔐 Problemas de Autenticação

### Login não funciona
- Verifique se o usuário existe no banco
- Confirme que `JWT_SECRET` está configurado
- Verifique os logs para erros

### Token expirado
- Use o endpoint `/api/auth/refresh`
- Faça login novamente
- Verifique `JWT_EXPIRES_IN` no .env

## 📦 Problemas de Produtos

### Produtos não aparecem
- Verifique se há produtos no banco
- Confirme filtros aplicados
- Verifique os logs

### Erro ao criar produto
- Confirme todos os campos obrigatórios
- Verifique permissões de admin
- Veja os logs para detalhes

## 🎟️ Problemas de Cupons

### Cupons não aparecem
- Verifique se há cupons ativos
- Confirme filtros de data
- Verifique status do cupom

### Cupom não funciona
- Confirme que o cupom está ativo
- Verifique data de expiração
- Teste o código diretamente na plataforma

## 🔌 Problemas de Integrações

### Mercado Livre não funciona
- Verifique tokens (Access Token e Refresh Token)
- Confirme Client ID e Secret
- Veja [Guia ML](../04-integrations/mercadolivre/README.md)

### Shopee não funciona
- Verifique Partner ID e Key
- Confirme credenciais no admin
- Veja [Guia Shopee](../04-integrations/shopee/README.md)

### Bots não enviam mensagens
- Verifique tokens configurados
- Confirme canais adicionados
- Veja logs em `/api/bots/logs`
- Veja [Guia Bots](../04-integrations/bots/README.md)

### Telegram Collector não funciona
- Verifique autenticação
- Confirme canais adicionados
- Verifique status do listener
- Veja [Guia Telegram Collector](../04-integrations/telegram-collector/README.md)

## 📱 Problemas do Mobile App

### App não conecta ao backend
- Verifique `EXPO_PUBLIC_API_URL`
- Confirme que o backend está rodando
- Teste a URL no navegador

### Login não funciona
- Verifique credenciais
- Confirme conexão com backend
- Veja logs do Expo

## 🆘 Ainda com Problemas?

1. Verifique os logs:
   - Backend: `logs/app.log`
   - Admin: Console do navegador (F12)
   - Mobile: Logs do Expo

2. Consulte a documentação específica:
   - [Backend](../03-modules/backend/README.md)
   - [Admin Panel](../03-modules/admin-panel/README.md)
   - [Mobile App](../03-modules/mobile-app/README.md)

3. Verifique as configurações:
   - Variáveis de ambiente
   - Banco de dados
   - Integrações

---

**Voltar**: [Índice](../README.md)




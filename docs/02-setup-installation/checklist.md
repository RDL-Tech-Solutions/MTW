# ✅ Checklist de Setup

Use este checklist para garantir que tudo está configurado corretamente.

## 📋 Pré-instalação

- [ ] Node.js 18+ instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Git instalado (`git --version`)
- [ ] Conta Supabase criada
- [ ] Projeto Supabase criado

## 🗄️ Banco de Dados

- [ ] Projeto Supabase criado
- [ ] Credenciais do Supabase anotadas
- [ ] Schema executado (`database/schema.sql`)
- [ ] Migrations executadas (001 a 019)
- [ ] Tabelas verificadas no Table Editor
- [ ] Usuário admin criado

## 🔧 Backend

- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` criado
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_KEY` configurado
- [ ] `JWT_SECRET` configurado
- [ ] `CORS_ORIGIN` configurado
- [ ] Backend inicia sem erros (`npm run dev`)
- [ ] Health check funciona (`GET /api/health`)

## 👨‍💼 Admin Panel

- [ ] Dependências instaladas (`npm install`)
- [ ] Admin panel inicia (`npm run dev`)
- [ ] Acessa `http://localhost:5173`
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Consegue criar produto
- [ ] Consegue criar cupom

## 📱 Mobile App

- [ ] Dependências instaladas (`npm install`)
- [ ] Expo CLI instalado (`npm install -g expo-cli`)
- [ ] `.env` configurado (se necessário)
- [ ] App inicia (`npm start`)
- [ ] Consegue fazer login
- [ ] Produtos aparecem na home

## 🔌 Integrações (Opcional)

### Mercado Livre
- [ ] App criado no portal ML
- [ ] Client ID e Secret obtidos
- [ ] Configurado no Admin Panel ou `.env`
- [ ] Tokens obtidos (Access Token e Refresh Token)
- [ ] Teste de busca funciona

### Shopee
- [ ] Conta de afiliado criada
- [ ] Partner ID e Key obtidos
- [ ] Configurado no Admin Panel ou `.env`
- [ ] Teste de busca funciona

### Bots
- [ ] Telegram Bot criado (@BotFather)
- [ ] Token do bot configurado
- [ ] WhatsApp Business configurado (se usar)
- [ ] Canais adicionados no admin
- [ ] Teste de envio funciona

### Telegram Collector
- [ ] API ID e Hash obtidos (my.telegram.org/apps)
- [ ] Configurado no Admin Panel
- [ ] Autenticação realizada
- [ ] Canais adicionados
- [ ] Listener iniciado

## 🧪 Testes

- [ ] Backend responde (`GET /api/health`)
- [ ] Login funciona (admin panel)
- [ ] Criar produto funciona
- [ ] Criar cupom funciona
- [ ] Mobile app conecta ao backend
- [ ] Notificações funcionam (se configurado)

## 📊 Verificações Finais

- [ ] Logs do backend sem erros críticos
- [ ] Admin panel sem erros no console
- [ ] Mobile app sem erros no console
- [ ] Banco de dados acessível
- [ ] Todas as rotas principais funcionando

## 🎉 Concluído!

Se todos os itens estão marcados, seu ambiente está pronto! 🚀

## 🆘 Problemas?

Se algum item não está funcionando:
1. Consulte [Troubleshooting](../06-troubleshooting/README.md)
2. Verifique os logs
3. Confirme as variáveis de ambiente

---

**Próximo**: [Teste Rápido](./quick-test.md)






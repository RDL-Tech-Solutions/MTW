# 📘 Guia Passo a Passo Completo - Configuração dos Bots

## 🎯 Objetivo

Este guia irá te ajudar a configurar completamente os bots do **Telegram** e **WhatsApp** no sistema MTW Promo, desde a criação dos bots até o envio de notificações automáticas.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Fase 1: Configurar Banco de Dados](#fase-1-configurar-banco-de-dados)
3. [Fase 2: Configurar Bot Telegram](#fase-2-configurar-bot-telegram)
4. [Fase 3: Configurar Bot WhatsApp](#fase-3-configurar-bot-whatsapp)
5. [Fase 4: Configurar Backend](#fase-4-configurar-backend)
6. [Fase 5: Configurar no Painel Admin](#fase-5-configurar-no-painel-admin)
7. [Fase 6: Testar Configuração](#fase-6-testar-configuração)
8. [Fase 7: Configurar APIs de Outras Plataformas (Opcional)](#fase-7-configurar-apis-de-outras-plataformas-opcional)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter:

- [x] Acesso ao **Supabase** (banco de dados)
- [x] Acesso ao **Painel Admin** do sistema
- [x] Acesso ao servidor/backend (para editar `.env`)
- [x] Conta no **Telegram** (para criar o bot)
- [x] Conta no **Facebook Business** (para WhatsApp - opcional)

**Tempo estimado**: 30-45 minutos

---

## 🗄️ Fase 1: Configurar Banco de Dados

### Passo 1.1: Acessar Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Faça login no seu projeto
3. Clique em **"SQL Editor"** no menu lateral

### Passo 1.2: Executar Migration

1. No SQL Editor, clique em **"New query"**
2. Abra o arquivo `database/migrations/001_add_bot_tables.sql` no seu projeto
3. Copie **todo o conteúdo** do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

### Passo 1.3: Verificar Tabelas Criadas

Execute esta query para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('bot_channels', 'notification_logs', 'bot_message_templates')
ORDER BY table_name;
```

**Resultado esperado**: Deve retornar 3 tabelas:
- `bot_channels`
- `notification_logs`
- `bot_message_templates`

✅ **Se aparecerem as 3 tabelas, você concluiu a Fase 1!**

---

## 🤖 Fase 2: Configurar Bot Telegram

### Passo 2.1: Criar Bot no Telegram

1. Abra o **Telegram** (app ou web)
2. No campo de busca, digite: `@BotFather`
3. Clique no bot oficial **@BotFather**
4. Clique em **"Start"** ou envie `/start`
5. Envie o comando: `/newbot`
6. O bot pedirá um **nome** para o bot:
   - Digite: `MTW Promo Bot` (ou o nome que preferir)
   - Pressione Enter
7. O bot pedirá um **username** (deve terminar com `_bot`):
   - Digite: `mtwpromo_bot` (ou outro disponível)
   - Pressione Enter
8. **IMPORTANTE**: O BotFather enviará uma mensagem com o **TOKEN**
   - Exemplo: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **COPIE E SALVE ESTE TOKEN** em um local seguro (você precisará dele depois)

### Passo 2.2: Obter Chat ID do Grupo

#### Opção A: Usando @getidsbot (Mais Fácil)

1. Crie um **grupo** no Telegram (ou use um existente)
2. Adicione seu bot ao grupo:
   - Clique no nome do grupo
   - Clique em **"Add Members"**
   - Procure pelo username do seu bot (ex: `@mtwpromo_bot`)
   - Adicione o bot
3. Adicione o bot **@getidsbot** ao grupo:
   - Procure por `@getidsbot`
   - Adicione ao grupo
4. O bot **@getidsbot** enviará automaticamente o **Chat ID**
   - Exemplo: `-1001234567890` (grupos sempre começam com `-`)
   - **COPIE E SALVE ESTE CHAT ID**
5. Remova o **@getidsbot** do grupo (não é mais necessário)

#### Opção B: Usando API do Telegram

1. Abra o navegador
2. Acesse (substitua `{SEU_TOKEN}` pelo token do seu bot):
   ```
   https://api.telegram.org/bot{SEU_TOKEN}/getUpdates
   ```
3. Envie uma mensagem no grupo do Telegram
4. Recarregue a página
5. Procure por `"chat":{"id":-1001234567890}`
6. O número após `"id":` é o **Chat ID**

### Passo 2.3: Testar Bot do Telegram

1. No grupo do Telegram, envie uma mensagem qualquer
2. Se o bot estiver funcionando, ele deve aparecer na lista de membros
3. Para testar se o token está correto, acesse:
   ```
   https://api.telegram.org/bot{SEU_TOKEN}/getMe
   ```
4. Deve retornar informações do bot (nome, username, etc.)

✅ **Anote:**
- Token do Bot: `________________________`
- Chat ID do Grupo: `________________________`

---

## 📱 Fase 3: Configurar Bot WhatsApp

> **Nota**: O WhatsApp é opcional. Você pode configurar apenas o Telegram e adicionar o WhatsApp depois.

### Passo 3.1: Criar App no Meta for Developers

1. Acesse [https://developers.facebook.com](https://developers.facebook.com)
2. Faça login com sua conta do Facebook
3. Clique em **"Meus Apps"** (My Apps) no canto superior direito
4. Clique em **"Criar App"** (Create App)
5. Selecione o tipo: **"Business"**
6. Preencha:
   - **Nome do App**: `MTW Promo Bot` (ou outro nome)
   - **Email de contato**: Seu email
   - **Finalidade do app**: Selecione **"Gerenciar negócios"**
7. Clique em **"Criar App"**
8. Complete o captcha se solicitado

### Passo 3.2: Adicionar WhatsApp Business API

1. No painel do app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Configurar"** (Set Up) no card do WhatsApp
3. Selecione **"API do WhatsApp"** (WhatsApp API)
4. Siga o assistente de configuração
5. Aceite os termos de uso

### Passo 3.3: Obter Access Token

1. No menu lateral, vá em **"WhatsApp"** > **"Configuração da API"** (API Setup)
2. Role até a seção **"Token de acesso temporário"** (Temporary Access Token)
3. Clique em **"Gerar token"** (Generate Token)
4. **COPIE O TOKEN** - ele começa com `EAA...`
   - ⚠️ **ATENÇÃO**: Este token expira em 24 horas (para produção, você precisará de um token permanente)
5. Salve o token em local seguro

### Passo 3.4: Obter Phone Number ID

1. Ainda na página **"Configuração da API"**
2. Procure pela seção **"Número de telefone"** (Phone Number)
3. Você verá um número de teste (ex: `+1 234 567 8901`)
4. Abaixo do número, há o **Phone Number ID**
   - Exemplo: `123456789012345`
5. **COPIE O PHONE NUMBER ID**

### Passo 3.5: Obter Business Account ID (Opcional)

1. No menu lateral, vá em **"Configurações"** > **"Básico"** (Basic)
2. Role até **"ID da Conta Comercial"** (Business Account ID)
3. **COPIE O ID** (se necessário)

### Passo 3.6: Obter Número do Grupo WhatsApp

1. Abra o **WhatsApp** no celular
2. Crie um **grupo** (ou use um existente)
3. No grupo, toque no **nome do grupo** (no topo)
4. Role até o final e procure por **"ID do grupo"** ou use um bot para obter
5. O formato do ID é: `120363XXXXXXXXXX@g.us`
6. **COPIE O ID DO GRUPO**

> **Dica**: Para obter o ID do grupo mais facilmente, você pode usar a API do WhatsApp ou ferramentas de terceiros.

✅ **Anote:**
- Access Token: `________________________`
- Phone Number ID: `________________________`
- ID do Grupo: `________________________`

---

## ⚙️ Fase 4: Configurar Backend

### Passo 4.1: Localizar Arquivo .env

1. Navegue até a pasta `backend/` do projeto
2. Abra o arquivo `.env` (se não existir, copie o `.env.example`)

### Passo 4.2: Adicionar Variáveis do Telegram

Adicione ou edite estas linhas no `.env`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Substitua** `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` pelo token que você copiou no Passo 2.1.

### Passo 4.3: Adicionar Variáveis do WhatsApp

Adicione ou edite estas linhas no `.env`:

```env
# WhatsApp Bot (Meta WhatsApp Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

**Substitua:**
- `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` pelo Access Token do Passo 3.3
- `123456789012345` pelo Phone Number ID do Passo 3.4

### Passo 4.4: Habilitar Cron Jobs

Adicione ou verifique esta linha no `.env`:

```env
# Habilitar Cron Jobs (para notificações automáticas)
ENABLE_CRON_JOBS=true
```

### Passo 4.5: Exemplo Completo do .env

Seu arquivo `.env` deve ter algo assim:

```env
# ... outras variáveis ...

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# WhatsApp Bot (Meta WhatsApp Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Habilitar Cron Jobs
ENABLE_CRON_JOBS=true
```

### Passo 4.6: Reiniciar Backend

1. Pare o servidor backend (se estiver rodando)
   - Pressione `Ctrl+C` no terminal
2. Inicie novamente:

```bash
cd backend
npm run dev
```

3. Verifique se não há erros no console
4. Se aparecer `✅ Servidor rodando na porta 3000`, está tudo certo!

✅ **Fase 4 concluída!**

---

## 🖥️ Fase 5: Configurar no Painel Admin

### Passo 5.1: Acessar Painel Admin

1. Abra o navegador
2. Acesse: `http://localhost:5173` (ou a URL do seu painel admin)
3. Faça login com suas credenciais de admin

### Passo 5.2: Configurar Bot Telegram

1. No menu lateral, clique em **"Bots"** (ou navegue para `/bots`)
2. Na seção **"Telegram"**, clique em **"Configurar"**
3. Preencha:
   - **Token**: Cole o token que você salvou (Passo 2.1)
   - Clique em **"Testar Conexão"**
   - Se aparecer ✅, clique em **"Salvar"**

### Passo 5.3: Adicionar Canal do Telegram

1. Ainda na página de Bots, role até **"Canais"**
2. Clique em **"Adicionar Canal"**
3. Preencha:
   - **Plataforma**: Selecione `Telegram`
   - **Nome**: `Grupo Principal` (ou outro nome)
   - **Identificador**: Cole o Chat ID que você salvou (Passo 2.2)
     - Exemplo: `-1001234567890`
   - **Ativo**: Marque como `Sim`
4. Clique em **"Salvar"**

### Passo 5.4: Configurar Bot WhatsApp

1. Na seção **"WhatsApp"**, clique em **"Configurar"**
2. Preencha:
   - **API URL**: `https://graph.facebook.com/v18.0`
   - **Access Token**: Cole o token que você salvou (Passo 3.3)
   - **Phone Number ID**: Cole o ID que você salvou (Passo 3.4)
   - Clique em **"Testar Conexão"**
   - Se aparecer ✅, clique em **"Salvar"**

### Passo 5.5: Adicionar Canal do WhatsApp

1. Na seção **"Canais"**, clique em **"Adicionar Canal"**
2. Preencha:
   - **Plataforma**: Selecione `WhatsApp`
   - **Nome**: `Grupo Principal WhatsApp` (ou outro nome)
   - **Identificador**: Cole o ID do grupo que você salvou (Passo 3.6)
     - Exemplo: `120363XXXXXXXXXX@g.us`
   - **Ativo**: Marque como `Sim`
3. Clique em **"Salvar"**

✅ **Fase 5 concluída!**

---

## 🧪 Fase 6: Testar Configuração

### Teste 1: Testar Conexão Telegram

1. No Painel Admin, vá em **"Bots"**
2. Na seção Telegram, clique em **"Testar Conexão"**
3. Deve aparecer: ✅ **"Conexão bem-sucedida"**

### Teste 2: Enviar Mensagem de Teste

1. No Painel Admin, vá em **"Bots"**
2. Clique em **"Enviar Teste"** (ou use a API)
3. Verifique se a mensagem chegou no grupo do Telegram/WhatsApp

### Teste 3: Criar Produto de Teste

1. No Painel Admin, vá em **"Produtos"**
2. Clique em **"Novo Produto"**
3. Preencha:
   - Nome: `Produto de Teste`
   - Preço: `100.00`
   - Preço com desconto: `50.00`
   - Imagem: URL de uma imagem
   - Link: URL de afiliado
4. Clique em **"Salvar"**
5. **Verifique** se uma notificação foi enviada para os grupos configurados

### Teste 4: Verificar Logs

1. No Painel Admin, vá em **"Bots"** > **"Logs"**
2. Você deve ver registros de envio de mensagens
3. Se houver erros, verifique a mensagem de erro

✅ **Se todos os testes passaram, sua configuração está completa!**

---

## 🔧 Troubleshooting

### Problema: Token do Telegram inválido

**Sintoma**: Erro ao testar conexão

**Solução**:
1. Verifique se copiou o token completo (sem espaços)
2. Verifique se o token está no formato: `1234567890:ABCdef...`
3. Teste o token diretamente: `https://api.telegram.org/bot{TOKEN}/getMe`
4. Se não funcionar, crie um novo bot no @BotFather

### Problema: Chat ID do Telegram não funciona

**Sintoma**: Mensagens não chegam no grupo

**Solução**:
1. Certifique-se de que o bot está no grupo
2. Verifique se o Chat ID começa com `-` (grupos sempre começam com `-`)
3. Certifique-se de que o bot tem permissão para enviar mensagens no grupo
4. Obtenha o Chat ID novamente usando @getidsbot

### Problema: WhatsApp token expirado

**Sintoma**: Erro 401 ou "Token inválido"

**Solução**:
1. Tokens temporários expiram em 24 horas
2. Gere um novo token no Meta for Developers
3. Para produção, configure um token permanente (requer verificação do app)

### Problema: Notificações não estão sendo enviadas

**Sintoma**: Produtos são criados mas não há notificações

**Solução**:
1. Verifique se `ENABLE_CRON_JOBS=true` no `.env`
2. Verifique se há canais ativos no Painel Admin
3. Verifique os logs do backend: `backend/logs/app.log`
4. Reinicie o backend após alterar `.env`

### Problema: Imagem não está sendo enviada

**Sintoma**: Mensagem chega mas sem imagem

**Solução**:
1. Verifique se a URL da imagem é válida (começa com `http://` ou `https://`)
2. Verifique se a imagem está acessível publicamente
3. Verifique os logs para ver o erro específico

---

## 🔌 Fase 7: Configurar APIs de Outras Plataformas (Opcional)

> **Nota**: Esta fase é opcional. Configure apenas se quiser usar as integrações com Shopee e Mercado Livre para captura automática de produtos e cupons.

### Passo 7.1: Configurar API Shopee

#### Obter Credenciais Shopee

1. Acesse [https://open.shopee.com](https://open.shopee.com)
2. Faça login com sua conta Shopee
3. Vá em **"Meus Apps"** > **"Criar App"**
4. Preencha os dados do app
5. Após criar, você receberá:
   - **Partner ID**
   - **Partner Key**
6. **COPIE E SALVE** essas credenciais

#### Configurar no Backend

1. Abra o arquivo `backend/.env`
2. Adicione ou edite estas linhas:

```env
# Shopee API
SHOPEE_PARTNER_ID=seu_partner_id_aqui
SHOPEE_PARTNER_KEY=sua_partner_key_aqui
SHOPEE_API_URL=https://partner.shopeemobile.com/api/v2
```

3. Substitua pelos valores que você copiou
4. Salve o arquivo
5. Reinicie o backend

### Passo 7.2: Configurar API Mercado Livre

#### Obter Credenciais Mercado Livre

1. Acesse [https://developers.mercadolivre.com.br](https://developers.mercadolivre.com.br)
2. Faça login com sua conta Mercado Livre
3. Vá em **"Meus Apps"** > **"Criar App"**
4. Preencha:
   - **Nome do App**: Ex: "MTW Promo"
   - **Tipo**: Selecione conforme sua necessidade
5. Após criar, você receberá:
   - **Client ID**
   - **Client Secret**
6. **COPIE E SALVE** essas credenciais

#### Gerar Access Token

1. No painel do app, vá em **"Credenciais"**
2. Clique em **"Gerar Token de Teste"** (para desenvolvimento)
3. Ou configure o fluxo OAuth para produção
4. **COPIE O ACCESS TOKEN** gerado

> **Dica**: Para produção, você precisará configurar OAuth completo. Veja o guia detalhado em [docs/04-integrations/mercadolivre/](../mercadolivre/)

#### Configurar no Backend

1. Abra o arquivo `backend/.env`
2. Adicione ou edite estas linhas:

```env
# Mercado Livre API
MELI_CLIENT_ID=seu_client_id_aqui
MELI_CLIENT_SECRET=seu_client_secret_aqui
MELI_ACCESS_TOKEN=seu_access_token_aqui
MELI_REFRESH_TOKEN=seu_refresh_token_aqui  # Se tiver
MELI_API_URL=https://api.mercadolibre.com
MELI_AFFILIATE_CODE=seu_codigo_afiliado  # Opcional
```

3. Substitua pelos valores que você copiou
4. Salve o arquivo
5. Reinicie o backend

### Passo 7.3: Habilitar Captura Automática (Opcional)

Se você configurou as APIs acima e quer habilitar a captura automática de cupons:

1. Abra o arquivo `backend/.env`
2. Adicione:

```env
# Captura Automática de Cupons
COUPON_CAPTURE_ENABLED=true
COUPON_CAPTURE_INTERVAL=10  # minutos entre capturas
```

3. Salve e reinicie o backend

> **Mais informações**: Consulte [docs/03-modules/coupons/SETUP_CAPTURA_CUPONS.md](../../../03-modules/coupons/SETUP_CAPTURA_CUPONS.md)

---

## 📚 Próximos Passos

Agora que os bots e APIs estão configurados, você pode:

1. **Personalizar Templates**: Edite os templates de mensagem no Painel Admin
2. **Adicionar Mais Canais**: Adicione mais grupos do Telegram/WhatsApp
3. **Configurar Categorias**: Configure quais categorias enviar para cada canal
4. **Monitorar Estatísticas**: Acompanhe os logs e estatísticas de envio
5. **Configurar Auto Sync**: Configure sincronização automática com Shopee e ML
6. **Configurar Auto Fill**: Configure auto-preenchimento de produtos

---

## ✅ Checklist Final

Use este checklist para garantir que tudo está configurado:

### Bots (Obrigatório)
- [ ] Banco de dados: Tabelas criadas
- [ ] Telegram: Bot criado e token obtido
- [ ] Telegram: Chat ID do grupo obtido
- [ ] Telegram: Token configurado no `.env`
- [ ] Telegram: Canal adicionado no Painel Admin
- [ ] WhatsApp: App criado no Meta for Developers (opcional)
- [ ] WhatsApp: Token e Phone Number ID obtidos (opcional)
- [ ] WhatsApp: Configurado no `.env` (opcional)
- [ ] WhatsApp: Canal adicionado no Painel Admin (opcional)
- [ ] Backend: `.env` configurado corretamente
- [ ] Backend: Servidor reiniciado
- [ ] Teste: Conexão Telegram testada com sucesso
- [ ] Teste: Conexão WhatsApp testada com sucesso (se configurado)
- [ ] Teste: Mensagem de teste enviada e recebida
- [ ] Teste: Produto criado e notificação enviada

### APIs de Plataformas (Opcional)
- [ ] Shopee: App criado e credenciais obtidas
- [ ] Shopee: Configurado no `.env`
- [ ] Mercado Livre: App criado e credenciais obtidas
- [ ] Mercado Livre: Access Token gerado
- [ ] Mercado Livre: Configurado no `.env`
- [ ] Captura Automática: Habilitada (se desejar)

---

## 🎉 Concluído!

Se você marcou todos os itens do checklist, **parabéns!** Os bots estão configurados e prontos para enviar notificações automáticas.

Para mais informações, consulte:
- [Documentação Completa dos Bots](./BOTS_DOCUMENTATION.md)
- [Guia Rápido](./BOTS_QUICK_START.md)
- [Configuração Shopee](../mercadolivre/) - Guias de Mercado Livre
- [Troubleshooting Avançado](../05-troubleshooting/)

---

**Última atualização**: 13/12/2024  
**Versão**: 1.0


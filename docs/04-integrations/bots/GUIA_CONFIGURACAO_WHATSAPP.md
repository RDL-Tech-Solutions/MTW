# 📱 Guia Completo: Configuração do Bot WhatsApp - MTW Promo

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Obter Credenciais da Meta](#obter-credenciais-da-meta)
3. [Configurar no Painel Admin](#configurar-no-painel-admin)
4. [Adicionar Canais (Grupos)](#adicionar-canais-grupos)
5. [Testar Configuração](#testar-configuração)
6. [Configuração via Variáveis de Ambiente (Opcional)](#configuração-via-variáveis-de-ambiente-opcional)
7. [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

- Acesso ao Painel Admin do sistema
- Conta no Facebook Business/Meta for Developers
- Número de telefone do WhatsApp Business (ou número de teste)
- Acesso ao backend (para variáveis de ambiente, se necessário)

---

## 🔑 Obter Credenciais da Meta

### Passo 1: Criar App no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Faça login com sua conta do Facebook
3. Clique em **"Meus Apps"** (My Apps) no canto superior direito
4. Clique em **"Criar App"** (Create App)
5. Selecione **"Business"** como tipo de app
6. Preencha:
   - **Nome do App**: Ex: "MTW Promo Bot"
   - **Email de contato**: Seu email
   - **Finalidade do app**: Selecione "Gerenciar negócios"
7. Clique em **"Criar App"**

### Passo 2: Adicionar WhatsApp Business API

1. No painel do app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Configurar"** (Set Up) no card do WhatsApp
3. Selecione **"API do WhatsApp"** (WhatsApp API)
4. Siga o assistente de configuração

### Passo 3: Obter Access Token

1. No menu lateral, vá em **"WhatsApp"** > **"Configuração da API"** (API Setup)
2. Role até a seção **"Token de acesso temporário"** (Temporary Access Token)
3. Clique em **"Gerar token"** (Generate Token)
4. **Copie o token** - ele começa com `EAA...`
   - ⚠️ **IMPORTANTE**: Tokens temporários expiram em 24 horas
   - Para produção, você precisará de um token permanente (ver seção avançada)

### Passo 4: Obter Phone Number ID

1. Ainda na página **"Configuração da API"**
2. Role até a seção **"Número de telefone"** (Phone Number)
3. Você verá o **"ID do número de telefone"** (Phone Number ID)
   - É um número longo, exemplo: `123456789012345`
4. **Copie este ID**

### Passo 5: Obter Business Account ID (Opcional)

1. No menu lateral, vá em **"WhatsApp"** > **"Números de telefone"** (Phone Numbers)
2. Clique no número que você está usando
3. O **Business Account ID** aparece na URL ou nas informações do número
   - Formato: `123456789012345`

### 📝 Resumo das Credenciais

Anote as seguintes informações:

- ✅ **Access Token**: `EAAxxxxxxx...` (Token temporário ou permanente)
- ✅ **Phone Number ID**: `123456789012345`
- ✅ **Business Account ID**: `123456789012345` (opcional)
- ✅ **API URL**: `https://graph.facebook.com/v18.0` (padrão)

---

## 🖥️ Configurar no Painel Admin

### Passo 1: Acessar Painel Admin

1. Acesse o painel admin do sistema
2. Faça login com suas credenciais de administrador
3. No menu lateral, clique em **"Bots"** ou acesse `/bots`

### Passo 2: Configurar WhatsApp

1. Na página de Bots, você verá a aba **"Configuração"**
2. Role até a seção **"Configuração do WhatsApp"**
3. Preencha os campos:

   **a) API Habilitada**
   - ✅ Marque a checkbox para habilitar o WhatsApp

   **b) URL da API**
   - Valor padrão: `https://graph.facebook.com/v18.0`
   - ⚠️ Normalmente não precisa alterar, a menos que use uma API alternativa

   **c) Access Token** ⭐ (OBRIGATÓRIO)
   - Cole o token que você copiou do Meta for Developers
   - Começa com `EAA...`
   - Clique no ícone de olho 👁️ para mostrar/ocultar o token

   **d) Phone Number ID** ⭐ (OBRIGATÓRIO)
   - Cole o Phone Number ID que você copiou
   - Formato: número longo (ex: `123456789012345`)

   **e) Business Account ID** (OPCIONAL)
   - Cole o Business Account ID se você tiver
   - Pode deixar vazio se não tiver

### Passo 3: Testar Conexão

1. Após preencher os campos obrigatórios, clique no botão **"Testar Conexão"**
2. Aguarde alguns segundos
3. Você verá uma mensagem de sucesso ou erro:
   - ✅ **Sucesso**: "Conexão com WhatsApp bem sucedida!"
   - ❌ **Erro**: Verifique se o token e Phone Number ID estão corretos

### Passo 4: Salvar Configuração

1. Após testar com sucesso, role até o final da página
2. Clique no botão **"Salvar Configurações"**
3. Aguarde a confirmação de salvamento

---

## 📢 Adicionar Canais (Grupos)

### Passo 1: Obter Número do Grupo WhatsApp

Para enviar mensagens para um grupo do WhatsApp, você precisa do **número do grupo**:

1. Abra o WhatsApp no seu celular
2. Entre no grupo onde deseja receber as notificações
3. Toque no nome do grupo no topo
4. Role até o final e procure por **"ID do grupo"** ou use uma das opções abaixo:

**Opção A: Usar número do administrador**
- O número do grupo geralmente é o número do WhatsApp do criador/administrador
- Formato: `5511999999999` (código do país + DDD + número, sem espaços ou caracteres especiais)

**Opção B: Usar API para descobrir**
- Algumas APIs de WhatsApp permitem listar grupos
- Consulte a documentação da sua API

### Passo 2: Adicionar Canal no Painel Admin

1. Na página de Bots, vá para a aba **"Canais"**
2. Clique no botão **"Novo Canal"**
3. Preencha o formulário:

   **a) Plataforma**
   - Selecione: **"WhatsApp"**

   **b) Número do WhatsApp** ⭐ (OBRIGATÓRIO)
   - Digite o número do grupo no formato: `5511999999999`
   - ⚠️ **IMPORTANTE**: Use o formato internacional completo
     - Código do país (55 para Brasil)
     - DDD (11, 21, etc.)
     - Número completo
   - Exemplo: `5511999999999` (Brasil, DDD 11, número 99999-9999)

   **c) Nome do Canal**
   - Dê um nome descritivo, ex: "Grupo Principal", "Grupo de Promoções"

   **d) Status**
   - ✅ Marque como **"Ativo"** para receber notificações

4. Clique em **"Salvar"**

### Passo 3: Testar Canal

1. Após criar o canal, você verá ele na lista
2. Clique no botão **"Testar"** ao lado do canal
3. Uma mensagem de teste será enviada para o grupo
4. Verifique se a mensagem chegou no grupo do WhatsApp

---

## 🧪 Testar Configuração

### Teste 1: Testar Conexão da API

1. No painel admin, vá em **"Bots"** > **"Configuração"**
2. Preencha os dados do WhatsApp
3. Clique em **"Testar Conexão"**
4. ✅ Se aparecer "Conexão com WhatsApp bem sucedida!", está funcionando

### Teste 2: Testar Envio para Canal

1. Vá em **"Bots"** > **"Canais"**
2. Clique em **"Testar"** no canal que você criou
3. Verifique se a mensagem chegou no grupo do WhatsApp

### Teste 3: Criar Produto de Teste

1. Vá em **"Produtos"** > **"Novo Produto"**
2. Crie um produto com:
   - Nome: "Produto Teste"
   - Preço: R$ 100,00
   - Preço com desconto: R$ 80,00
   - Imagem: URL de uma imagem válida
   - Plataforma: Mercado Livre
3. Salve o produto
4. ✅ Verifique se a notificação chegou no grupo do WhatsApp com a imagem e mensagem

---

## 🔧 Configuração via Variáveis de Ambiente (Opcional)

Se preferir configurar via variáveis de ambiente (útil para produção):

### Passo 1: Editar arquivo `.env`

No diretório `backend/`, edite o arquivo `.env`:

```env
# WhatsApp Bot (Meta WhatsApp Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_business_account_id (opcional)
```

### Passo 2: Reiniciar Backend

Após editar o `.env`, reinicie o servidor backend:

```bash
# Se estiver usando PM2
pm2 restart backend

# Se estiver usando npm
npm run dev
```

### ⚠️ Nota Importante

- As configurações do painel admin têm **prioridade** sobre as variáveis de ambiente
- Se você configurar no painel admin, as variáveis de ambiente serão ignoradas
- Para produção, recomenda-se usar variáveis de ambiente por segurança

---

## 🔍 Troubleshooting

### Erro: "Token inválido ou sem permissão"

**Causas possíveis:**
- Token expirado (tokens temporários expiram em 24h)
- Token incorreto
- Token sem permissões necessárias

**Solução:**
1. Gere um novo token no Meta for Developers
2. Cole o novo token no painel admin
3. Teste novamente

### Erro: "Phone Number ID não encontrado"

**Causas possíveis:**
- Phone Number ID incorreto
- Número não está associado ao app

**Solução:**
1. Verifique se o Phone Number ID está correto
2. No Meta for Developers, verifique se o número está associado ao app
3. Se necessário, adicione o número novamente

### Mensagens não estão chegando no grupo

**Causas possíveis:**
- Número do grupo incorreto
- Grupo não está ativo
- API não tem permissão para enviar

**Solução:**
1. Verifique o número do grupo (formato internacional completo)
2. Verifique se o canal está marcado como "Ativo"
3. Teste o canal individualmente
4. Verifique os logs em **"Bots"** > **"Logs"**

### Imagem não está sendo enviada

**Causas possíveis:**
- URL da imagem inválida
- Imagem não está acessível publicamente
- Produto não tem `image_url` válida

**Solução:**
1. Verifique se o produto tem uma `image_url` válida (começa com `http://` ou `https://`)
2. Teste se a URL da imagem abre no navegador
3. Verifique os logs do backend para mais detalhes

### Preview de link aparecendo

**Status:** ✅ **CORRIGIDO**
- O sistema agora remove links da mensagem automaticamente
- Links são substituídos por: "🔗 [Link disponível - consulte a descrição]"
- Se ainda aparecer, verifique se está usando a versão mais recente do código

---

## 📚 Recursos Adicionais

### Documentação Oficial da Meta

- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

### APIs Alternativas

Se não quiser usar a API oficial da Meta, você pode usar:

- **Z-API**: https://z-api.io/
- **UltraMsg**: https://ultramsg.com/
- **Evolution API**: https://evolution-api.com/

Para usar APIs alternativas, você precisará ajustar a `WHATSAPP_API_URL` no painel admin.

---

## ✅ Checklist de Configuração

Use este checklist para garantir que tudo está configurado:

- [ ] App criado no Meta for Developers
- [ ] WhatsApp Business API adicionado ao app
- [ ] Access Token obtido e copiado
- [ ] Phone Number ID obtido e copiado
- [ ] Business Account ID obtido (opcional)
- [ ] Configurações preenchidas no painel admin
- [ ] Conexão testada com sucesso
- [ ] Configurações salvas
- [ ] Pelo menos um canal (grupo) adicionado
- [ ] Canal testado com sucesso
- [ ] Produto de teste criado e notificação recebida

---

## 🎉 Pronto!

Após seguir todos os passos, seu bot do WhatsApp estará configurado e pronto para enviar notificações de produtos e cupons para os grupos configurados!

**Próximos passos:**
- Configure os templates de mensagem em **"Bots"** > **"Templates"**
- Ajuste as configurações de notificação conforme necessário
- Monitore os logs em **"Bots"** > **"Logs"** para acompanhar o funcionamento

---

**Última atualização:** 13/12/2024  
**Versão do sistema:** 1.0.0


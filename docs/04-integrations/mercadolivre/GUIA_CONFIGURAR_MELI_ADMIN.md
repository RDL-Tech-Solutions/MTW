# 📘 Guia Passo a Passo: Configurar Mercado Livre pelo Painel Admin

Este guia explica como obter as credenciais do Mercado Livre e configurá-las através do Painel Admin.

---

## 📋 Pré-requisitos

- ✅ Conta no Mercado Livre (pode ser pessoal ou de empresa)
- ✅ Acesso ao Painel Admin do MTW Promo
- ✅ Permissões de administrador

---

## 🔑 Passo 1: Criar Aplicação no Mercado Livre

### 1.1. Acessar o Portal de Desenvolvedores

1. Acesse: **https://developers.mercadolivre.com.br**
2. Faça login com sua conta do Mercado Livre
3. Clique em **"Criar nova aplicação"** ou **"Minhas aplicações"**

### 1.2. Criar Nova Aplicação

1. Clique em **"Criar nova aplicação"**
2. Preencha os dados:
   - **Nome da aplicação**: `MTW Promo` (ou outro nome de sua escolha)
   - **Tipo de aplicação**: Selecione **"Marketplace"** ou **"Aplicação própria"**
   - **URL de redirecionamento**: 
     - Para desenvolvimento: `http://localhost:3000/api/auth/meli/callback`
     - Para produção: `https://seu-dominio.com/api/auth/meli/callback`
3. Clique em **"Criar aplicação"**

### 1.3. Obter Credenciais

Após criar a aplicação, você verá:

- ✅ **Client ID** (App ID)
- ✅ **Client Secret** (Secret Key)

**⚠️ IMPORTANTE**: Anote essas credenciais! Você precisará delas no próximo passo.

---

## 🔐 Passo 2: Obter Access Token e Refresh Token

### Opção A: Via Portal do Mercado Livre (Recomendado)

1. No portal de desenvolvedores, vá para sua aplicação
2. Procure a seção **"Tokens"** ou **"Credenciais"**
3. Clique em **"Gerar token de teste"** ou **"Autorizar aplicação"**
4. Você será redirecionado para autorizar a aplicação
5. Após autorizar, você receberá:
   - **Access Token** (válido por algumas horas)
   - **Refresh Token** (usado para renovar o access token)

### Opção B: Via Script do Backend (Alternativa)

Se você já tem o backend rodando, pode usar o script de teste:

```bash
cd backend
node scripts/get-meli-token.js
```

**⚠️ IMPORTANTE**: 
- O script usa a porta **3001** por padrão (para evitar conflito com o backend na porta 3000)
- Configure o **Redirect URI** no portal do Mercado Livre como: `http://localhost:3001/auth/meli/callback`
- Se a porta 3001 estiver em uso, defina `MELI_TOKEN_PORT=3002` no `.env`

Siga as instruções do script para obter os tokens.

---

## 🌐 Passo 3: Obter Código de Afiliado (Opcional)

Se você tem um programa de afiliados do Mercado Livre:

1. Acesse o portal de afiliados: **https://programa.mercadolivre.com.br**
2. Faça login com sua conta
3. Vá em **"Meus Links"** ou **"Ferramentas"**
4. Copie seu **Código de Afiliado** ou **Tag de Afiliado**

**Nota**: Este passo é opcional. Se você não tem programa de afiliados, pode deixar em branco.

---

## 🖥️ Passo 4: Configurar no Painel Admin

### 4.1. Acessar o Painel Admin

1. Abra seu navegador
2. Acesse: **http://localhost:5173** (ou a URL do seu painel admin)
3. Faça login com suas credenciais de administrador

### 4.2. Navegar para Configurações

1. No menu lateral, clique em **"Configurações"** (ícone de engrenagem)
2. Ou acesse diretamente: **http://localhost:5173/settings**

### 4.3. Aba "Mercado Livre"

1. Clique na aba **"Mercado Livre"** (ícone de carrinho de compras)
2. Você verá os seguintes campos:

#### Campos Obrigatórios:

- **Client ID**: Cole o Client ID obtido no Passo 1.3
- **Client Secret**: Cole o Client Secret obtido no Passo 1.3
  - ⚠️ Clique no ícone de olho para mostrar/ocultar o valor

#### Campos Opcionais (mas recomendados):

- **Access Token**: Cole o Access Token obtido no Passo 2
  - ⚠️ Este token será atualizado automaticamente pelo sistema
  - ⚠️ Clique no ícone de olho para mostrar/ocultar o valor

- **Refresh Token**: Cole o Refresh Token obtido no Passo 2
  - ⚠️ Este token é usado para renovar o Access Token automaticamente
  - ⚠️ Clique no ícone de olho para mostrar/ocultar o valor

- **Redirect URI**: 
  - Para desenvolvimento: `http://localhost:3000/api/auth/meli/callback`
  - Para produção: `https://seu-dominio.com/api/auth/meli/callback`
  - ⚠️ Deve ser o mesmo configurado no Passo 1.2

#### Campos de Afiliado (Opcional):

- **Código de Afiliado**: Cole o código obtido no Passo 3 (se tiver)
- **Tag de Afiliado**: Cole a tag obtida no Passo 3 (se tiver)

### 4.4. Salvar Configurações

1. Após preencher todos os campos desejados
2. Clique no botão **"Salvar Todas"** (canto superior direito)
3. Aguarde a mensagem de sucesso: **"Configurações salvas com sucesso!"**

---

## ✅ Passo 5: Verificar Configuração

### 5.1. Verificar no Backend

1. Verifique os logs do backend
2. Você deve ver mensagens como:
   ```
   🔑 MeliAuth inicializado
      CLIENT_ID: CONFIGURADO
      REFRESH_TOKEN: CONFIGURADO
   ```

### 5.2. Testar Funcionalidades

1. No painel admin, vá para **"Automação"** ou **"Captura de Cupons"**
2. Tente sincronizar produtos do Mercado Livre
3. Verifique se os produtos aparecem corretamente

---

## 🔄 Passo 6: Renovação Automática de Tokens

O sistema renova automaticamente os tokens quando necessário:

- ✅ O **Access Token** é renovado automaticamente usando o **Refresh Token**
- ✅ Os tokens atualizados são salvos automaticamente no banco de dados
- ✅ Você não precisa fazer nada manualmente

**Nota**: Se o Refresh Token expirar, você precisará gerar um novo seguindo o Passo 2.

---

## 🆘 Troubleshooting

### Problema: "Client ID não configurado"

**Solução**: 
- Verifique se você preencheu o Client ID no painel admin
- Certifique-se de ter clicado em "Salvar Todas"

### Problema: "Token expirado"

**Solução**:
- Gere um novo Access Token e Refresh Token (Passo 2)
- Atualize no painel admin
- Salve as configurações

### Problema: "Erro 401 - Não autorizado"

**Solução**:
- Verifique se o Client ID e Client Secret estão corretos
- Verifique se o Access Token ainda é válido
- Gere novos tokens se necessário

### Problema: "Redirect URI não corresponde"

**Solução**:
- Verifique se o Redirect URI no painel admin é exatamente igual ao configurado no portal do Mercado Livre
- Certifique-se de que não há espaços ou caracteres extras

---

## 📝 Resumo dos Campos

| Campo | Obrigatório | Onde Obter |
|-------|-------------|------------|
| Client ID | ✅ Sim | Portal de Desenvolvedores ML |
| Client Secret | ✅ Sim | Portal de Desenvolvedores ML |
| Access Token | ⚠️ Recomendado | Portal ML ou Script |
| Refresh Token | ⚠️ Recomendado | Portal ML ou Script |
| Redirect URI | ⚠️ Recomendado | Configurar no Portal ML |
| Código de Afiliado | ❌ Opcional | Portal de Afiliados ML |
| Tag de Afiliado | ❌ Opcional | Portal de Afiliados ML |

---

## 🔗 Links Úteis

- **Portal de Desenvolvedores**: https://developers.mercadolivre.com.br
- **Documentação da API**: https://developers.mercadolivre.com.br/pt_br/api-docs
- **Portal de Afiliados**: https://programa.mercadolivre.com.br
- **Autenticação e Autorização**: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Client ID configurado no painel admin
- [ ] Client Secret configurado no painel admin
- [ ] Access Token configurado (se disponível)
- [ ] Refresh Token configurado (se disponível)
- [ ] Redirect URI configurado corretamente
- [ ] Configurações salvas no painel admin
- [ ] Backend mostra "CONFIGURADO" nos logs
- [ ] Teste de sincronização funcionando

---

**🎉 Pronto!** Sua integração com o Mercado Livre está configurada e pronta para uso!


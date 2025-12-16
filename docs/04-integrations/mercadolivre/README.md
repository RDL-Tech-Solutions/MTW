# 🛒 Mercado Livre

Guia completo para configurar a integração com Mercado Livre.

## 📋 Visão Geral

A integração com Mercado Livre permite:
- Buscar produtos
- Capturar cupons
- Gerar links de afiliados
- Sincronização automática

## ✅ Status: 100% Funcional

## 🚀 Configuração

### 1. Criar App no Mercado Livre

1. Acesse [my.mercadolivre.com.br](https://my.mercadolivre.com.br)
2. Vá em **Desenvolvedor** > **Suas aplicações**
3. Clique em **Criar nova aplicação**
4. Preencha os dados
5. Copie **App ID** e **Secret Key**

### 2. Obter Tokens

Use o script `backend/scripts/get-meli-token.js`:

```bash
cd backend
node scripts/get-meli-token.js
```

O script irá:
1. Pedir Client ID e Secret
2. Pedir Redirect URI
3. Abrir navegador para autorização
4. Capturar tokens automaticamente

### 3. Configurar no Admin Panel

1. Acesse `/settings`
2. Aba **Mercado Livre**
3. Configure:
   - Client ID
   - Client Secret
   - Access Token
   - Refresh Token
   - Redirect URI
   - Código de Afiliado
4. Salve

## 🔗 Links de Afiliados

Configure seu código de afiliado no admin panel. Os links serão gerados automaticamente.

## 📚 Mais Informações

- [Guia Completo de Configuração](../../backend/GUIA_CONFIGURAR_MELI_ADMIN.md)
- [Script de Tokens](../../backend/scripts/get-meli-token.js)
- [Guia ngrok](../../backend/scripts/GUIA_NGROK_MELI.md)

---

**Próximo**: [Shopee](../shopee/README.md)




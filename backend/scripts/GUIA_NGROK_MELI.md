# 🚀 Guia Rápido: Usar ngrok com Script do Mercado Livre

## ⚠️ Problema Comum

Se você ver o erro `ERR_NGROK_8012`, significa que:
- ✅ O ngrok está funcionando
- ❌ Mas não há servidor rodando em `localhost:3001`

## ✅ Solução: Ordem Correta de Execução

### Opção 1: Usar Backend Existente (Porta 3000)

Se o backend estiver rodando na porta 3000:

1. **Configure o Redirect URI no portal do Mercado Livre como**: `http://localhost:3000/api/auth/meli/callback`
2. **Execute o script**:
   ```bash
   cd backend
   node scripts/get-meli-token.js
   ```
3. **Quando perguntar o Redirect URI**, cole: `http://localhost:3000/api/auth/meli/callback`
4. O script detectará o backend e usará a rota existente

### Opção 2: Servidor Temporário (Porta 3001)

Se preferir usar um servidor temporário:

**Passo 1: Execute o Script PRIMEIRO**

```bash
cd backend
node scripts/get-meli-token.js
```

O script vai:
1. Perguntar Client ID, Client Secret e Redirect URI
2. Iniciar um servidor HTTP na porta 3001 (ou outra que você configurar)
3. Mostrar: "🌐 Servidor temporário iniciado na porta 3001"

**⚠️ MANTENHA ESTE TERMINAL ABERTO!**

### Passo 2: Em OUTRO Terminal, Inicie o ngrok

Abra um **NOVO terminal** (não feche o primeiro) e execute:

```bash
ngrok http 3001
```

Você verá algo como:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3001
```

### Passo 3: Configure o Redirect URI

1. **Copie a URL HTTPS do ngrok**: `https://abc123.ngrok.io`
2. **Adicione o path**: `https://abc123.ngrok.io/auth/meli/callback`
3. **Configure no portal do Mercado Livre**:
   - Acesse: https://developers.mercadolivre.com.br
   - Vá em sua aplicação
   - Configure Redirect URI como: `https://abc123.ngrok.io/auth/meli/callback`
   - Salve

### Passo 4: Use no Script

Quando o script perguntar o Redirect URI, cole:
```
https://abc123.ngrok.io/auth/meli/callback
```

## 📋 Checklist

- [ ] Script rodando (Terminal 1)
- [ ] Servidor iniciado na porta 3001
- [ ] ngrok rodando (Terminal 2)
- [ ] ngrok apontando para porta 3001
- [ ] Redirect URI configurado no portal ML
- [ ] Redirect URI informado no script

## ⚠️ Importante

1. **Mantenha AMBOS rodando**: script + ngrok
2. **A porta do ngrok deve ser a mesma do script** (3001 por padrão)
3. **O path do callback deve ser o mesmo** (`/auth/meli/callback`)

## 🔍 Verificar se Está Funcionando

Teste se o servidor está respondendo:

```bash
curl http://localhost:3001/auth/meli/callback
```

Se retornar algo (mesmo que erro), o servidor está funcionando!

## ⚠️ Página de Aviso do ngrok (Normal!)

Se você ver uma página de aviso do ngrok ao acessar a URL, isso é **NORMAL** com conta gratuita.

### O que fazer:

1. **Clique no botão "Visit Site"** na página de aviso
2. Você será redirecionado para o callback
3. O script receberá o código de autorização normalmente

### Por que aparece?

- O ngrok gratuito mostra essa página para prevenir abuso
- É uma medida de segurança
- Aparece apenas na **primeira vez** que alguém acessa a URL

### Como evitar (opcional):

1. **Conta paga do ngrok**: Remove o aviso completamente
2. **Usar HTTP localhost**: Se o portal aceitar, não precisa de ngrok
3. **Aceitar o aviso**: Simplesmente clique em "Visit Site" quando aparecer

### ⚠️ IMPORTANTE:

Quando o Mercado Livre redirecionar para o ngrok:
- Você verá a página de aviso
- **Clique em "Visit Site"**
- O callback funcionará normalmente
- O script receberá o código

## 🆘 Se Ainda Não Funcionar

1. Verifique se a porta está correta
2. Verifique se não há firewall bloqueando
3. Tente outra porta (ex: 3002, 3003)
4. Reinicie ambos (script e ngrok)


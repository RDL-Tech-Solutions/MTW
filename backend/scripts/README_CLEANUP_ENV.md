# 🧹 Limpeza de Variáveis Migradas para Admin Panel

Este diretório contém scripts para remover automaticamente as variáveis de ambiente que foram migradas para o Painel Admin.

## 📋 Variáveis Removidas

As seguintes variáveis foram migradas para o Admin Panel (`/settings`) e devem ser removidas do `.env`:

### Mercado Livre
- `MELI_CLIENT_ID`
- `MELI_CLIENT_SECRET`
- `MELI_ACCESS_TOKEN`
- `MELI_REFRESH_TOKEN`
- `MELI_REDIRECT_URI`
- `MELI_AFFILIATE_CODE`
- `MELI_AFFILIATE_TAG`

### Shopee
- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`

### Amazon
- `AMAZON_ACCESS_KEY`
- `AMAZON_SECRET_KEY`
- `AMAZON_PARTNER_TAG`
- `AMAZON_MARKETPLACE`

### Expo
- `EXPO_ACCESS_TOKEN`

### Telegram Collector
- `TELEGRAM_RATE_LIMIT_DELAY`
- `TELEGRAM_MAX_RETRIES`
- `TELEGRAM_RECONNECT_DELAY`

### Backend
- `BACKEND_URL`
- `BACKEND_API_KEY`
- `PYTHON_PATH`

### AliExpress
- `ALIEXPRESS_API_URL`

## 🚀 Como Usar

### Windows (PowerShell)

```powershell
cd backend
.\scripts\cleanup-env.ps1
```

### Linux/Mac (Bash)

```bash
cd backend
bash scripts/cleanup-env.sh
```

## ⚠️ Importante

1. **Backup Automático**: O script cria um backup automático antes de modificar os arquivos
2. **Fallback**: As variáveis removidas ainda funcionam como fallback se não estiverem configuradas no Admin Panel
3. **Configuração**: Após remover, configure as APIs através do Painel Admin em `/settings`

## 📝 Atualizar .env.example Manualmente

Se preferir fazer manualmente:

1. Abra `backend/.env.example`
2. Remova todas as linhas que começam com as variáveis listadas acima
3. Consulte `backend/ENV_EXAMPLE_CONTENT.md` para ver o conteúdo atualizado

## ✅ Verificação

Após executar o script:

1. Verifique se o backup foi criado
2. Confirme que as variáveis foram removidas
3. Configure as APIs no Painel Admin (`/settings`)
4. Teste o sistema para garantir que tudo funciona




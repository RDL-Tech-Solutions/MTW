# 🚀 Guia Completo de Atualização da VPS para Captura de Produtos e Cupons

Este guia fornece instruções detalhadas para configurar e otimizar sua VPS para suportar completamente o sistema de captura automática de produtos e cupons do **PreçoCerto (MTW)**.

---

## 📋 Índice

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Preparação Inicial da VPS](#preparação-inicial-da-vps)
3. [Instalação de Dependências](#instalação-de-dependências)
4. [Configuração do Puppeteer e Chromium](#configuração-do-puppeteer-e-chromium)
5. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
6. [Otimizações de Memória e Performance](#otimizações-de-memória-e-performance)
7. [Configuração do PM2](#configuração-do-pm2)
8. [Migrações do Banco de Dados](#migrações-do-banco-de-dados)
9. [Configuração de Cron Jobs](#configuração-de-cron-jobs)
10. [Testes de Captura](#testes-de-captura)
11. [Monitoramento e Logs](#monitoramento-e-logs)
12. [Troubleshooting](#troubleshooting)

---

## 🖥️ Requisitos do Sistema

### Especificações Mínimas da VPS

- **Sistema Operacional**: Ubuntu 20.04 LTS ou superior (Debian também suportado)
- **RAM**: Mínimo 1GB (Recomendado: 2GB+)
- **CPU**: 1 vCore (Recomendado: 2+ vCores)
- **Armazenamento**: 20GB SSD
- **Largura de Banda**: Ilimitada ou mínimo 1TB/mês
- **Node.js**: v18.0.0 ou superior

### Portas Necessárias

- **3000**: Backend API (ou porta configurada)
- **80/443**: HTTP/HTTPS (se usar Nginx/Apache como proxy reverso)

---

## 🔧 Preparação Inicial da VPS

### 1. Atualizar Sistema Operacional

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Instalar utilitários essenciais
sudo apt install -y curl wget git build-essential
```

### 2. Configurar Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir porta do backend (se necessário)
sudo ufw allow 3000/tcp

# Verificar status
sudo ufw status
```

### 3. Configurar Timezone

```bash
# Configurar timezone para Brasil
sudo timedatectl set-timezone America/Sao_Paulo

# Verificar
timedatectl
```

---

## 📦 Instalação de Dependências

### 1. Instalar Node.js 18+

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve ser v18.x.x ou superior
npm --version
```

### 2. Instalar PM2 (Process Manager)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 --version
```

### 3. Instalar Git (se ainda não instalado)

```bash
sudo apt install -y git
git --version
```

---

## 🌐 Configuração do Puppeteer e Chromium

O Puppeteer é essencial para captura de produtos via web scraping. Em VPS, precisamos configurá-lo corretamente.

### 1. Instalar Chromium e Dependências

```bash
# Instalar Chromium
sudo apt install -y chromium-browser

# Verificar instalação
which chromium-browser  # Deve retornar: /usr/bin/chromium-browser

# Instalar dependências do Chromium
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

### 2. Configurar Sandbox do Chromium

```bash
# Criar diretório para configuração
sudo mkdir -p /etc/chromium-browser

# Configurar para rodar sem sandbox (necessário em VPS)
echo 'CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"' | sudo tee /etc/chromium-browser/default
```

### 3. Testar Chromium

```bash
# Testar se Chromium está funcionando
chromium-browser --version
```

---

## ⚙️ Configuração de Variáveis de Ambiente

### 1. Clonar Repositório (se ainda não fez)

```bash
# Navegar para diretório de projetos
cd ~
mkdir -p projetos
cd projetos

# Clonar repositório
git clone <URL_DO_SEU_REPOSITORIO> MTW
cd MTW/backend
```

### 2. Criar Arquivo .env para Produção

```bash
# Copiar arquivo de exemplo
cp .env.example .env.production

# Editar arquivo
nano .env.production
```

### 3. Configuração Completa do .env.production

```bash
# ============================================
# AMBIENTE
# ============================================
NODE_ENV=production

# ============================================
# CORS
# ============================================
CORS_ORIGIN=https://seu-dominio.com,https://admin.seu-dominio.com

# ============================================
# DATABASE (Supabase)
# ============================================
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key
SUPABASE_ANON_KEY=sua-anon-key

# ============================================
# AUTHENTICATION (JWT)
# ============================================
JWT_SECRET=sua-chave-secreta-muito-forte-aqui
JWT_REFRESH_SECRET=sua-refresh-secret-muito-forte-aqui
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# URL SHORTENER
# ============================================
ENCURTADOR_API_URL=https://api.encurtador.dev/encurtamentos

# ============================================
# AI / OpenRouter
# ============================================
OPENROUTER_API_KEY=sua-openrouter-api-key
OPENROUTER_MODEL=mistralai/mixtral-8x7b-instruct
OPENROUTER_ENABLED=true

# OpenRouter - Rate Limiting & Retry
OPENROUTER_MAX_REQUESTS_PER_MINUTE=60
OPENROUTER_RATE_LIMIT_WINDOW=60000
OPENROUTER_RETRY_MAX_ATTEMPTS=3
OPENROUTER_RETRY_BASE_DELAY=2000
OPENROUTER_QUEUE_MAX_SIZE=100
OPENROUTER_QUEUE_DELAY=500
OPENROUTER_QUEUE_TIMEOUT=300000

# ============================================
# CIRCUIT BREAKER (Production Stability)
# ============================================
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000

# ============================================
# GRACEFUL SHUTDOWN
# ============================================
SHUTDOWN_TIMEOUT=30000

# ============================================
# MEMORY MONITORING
# ============================================
MEMORY_CHECK_INTERVAL=60000
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=90

# ============================================
# VPS CONFIGURATION (IMPORTANTE!)
# ============================================
# Ativar modo VPS (otimizações de memória e recursos)
VPS_MODE=true

# ============================================
# PUPPETEER CONFIGURATION (CRÍTICO PARA CAPTURA)
# ============================================
# Caminho para o executável do Chromium na VPS
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Pular download do Chromium (usar o do sistema)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ============================================
# BROWSER POOL CONFIGURATION
# ============================================
# Número máximo de instâncias de browser simultâneas (VPS: 2)
MAX_BROWSER_INSTANCES=2

# Timeout para operações do browser (ms)
BROWSER_TIMEOUT=30000

# ============================================
# TELEGRAM MESSAGE QUEUE
# ============================================
# Número máximo de mensagens processadas simultaneamente (VPS: 5)
TELEGRAM_QUEUE_CONCURRENCY=5

# ============================================
# MEMORY MANAGEMENT
# ============================================
# Limite máximo de memória em MB (VPS: 512MB)
MAX_MEMORY_MB=512

# Habilitar monitoramento de memória
ENABLE_MEMORY_MONITORING=true

# ============================================
# CRON JOBS
# ============================================
# Habilitar cron jobs em produção
ENABLE_CRON_JOBS=true
```

> **⚠️ IMPORTANTE**: Substitua todos os valores de exemplo (`sua-chave-secreta`, `seu-projeto`, etc.) pelos valores reais do seu projeto.

### 4. Proteger Arquivo .env

```bash
# Definir permissões corretas
chmod 600 .env.production

# Verificar permissões
ls -la .env.production
```

---

## 🚀 Otimizações de Memória e Performance

### 1. Configurar Swap (Memória Virtual)

Se sua VPS tem pouca RAM (1GB ou menos), configure swap:

```bash
# Verificar swap atual
sudo swapon --show

# Criar arquivo de swap de 2GB
sudo fallocate -l 2G /swapfile

# Definir permissões
sudo chmod 600 /swapfile

# Configurar como swap
sudo mkswap /swapfile

# Ativar swap
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

### 2. Otimizar Configurações do Sistema

```bash
# Editar sysctl
sudo nano /etc/sysctl.conf

# Adicionar no final do arquivo:
# Reduzir uso de swap (usar apenas quando necessário)
vm.swappiness=10

# Aumentar limite de arquivos abertos
fs.file-max=65536

# Aplicar mudanças
sudo sysctl -p
```

### 3. Aumentar Limites de Processos

```bash
# Editar limits
sudo nano /etc/security/limits.conf

# Adicionar no final:
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
```

---

## 🔄 Configuração do PM2

### 1. Instalar Dependências do Projeto

```bash
# Navegar para diretório do backend
cd ~/projetos/MTW/backend

# Instalar dependências
npm install --production

# Verificar se Puppeteer foi instalado corretamente
ls -la node_modules/puppeteer
```

### 2. Configurar PM2 com Ecosystem

O arquivo `ecosystem.config.cjs` já está configurado. Vamos usá-lo:

```bash
# Verificar conteúdo do ecosystem.config.cjs
cat ecosystem.config.cjs
```

### 3. Iniciar Aplicação com PM2

```bash
# Iniciar aplicação em modo produção
pm2 start ecosystem.config.cjs --env production

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs mtw-backend

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup

# Executar o comando que o PM2 mostrar (algo como):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u seu-usuario --hp /home/seu-usuario
```

### 4. Comandos Úteis do PM2

```bash
# Parar aplicação
pm2 stop mtw-backend

# Reiniciar aplicação
pm2 restart mtw-backend

# Recarregar (zero-downtime)
pm2 reload mtw-backend

# Ver logs
pm2 logs mtw-backend

# Ver logs de erro apenas
pm2 logs mtw-backend --err

# Monitorar recursos
pm2 monit

# Ver informações detalhadas
pm2 show mtw-backend

# Limpar logs
pm2 flush
```

---

## 🗄️ Migrações do Banco de Dados

### 1. Verificar Migrações Disponíveis

```bash
# Listar migrações
ls -la database/migrations/
```

### 2. Executar Migrações Necessárias

As migrações críticas para captura de produtos e cupons:

#### Migration: AliExpress Product Origin

```bash
# Esta migração adiciona suporte para filtro de origem (Brasil/Internacional)
# Arquivo: database/migrations/07_add_aliexpress_product_origin.sql
```

Execute via Supabase SQL Editor:

```sql
-- Migration: Add AliExpress Product Origin Configuration
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS aliexpress_product_origin VARCHAR(20) DEFAULT 'both';

COMMENT ON COLUMN app_settings.aliexpress_product_origin IS 'Origem dos produtos AliExpress: brazil (apenas Brasil), international (apenas Internacional), both (ambos)';

ALTER TABLE app_settings
ADD CONSTRAINT check_aliexpress_product_origin 
CHECK (aliexpress_product_origin IN ('brazil', 'international', 'both'));
```

#### Migration: Auto Sync Enhancements

```bash
# Arquivo: database/migrations/05_autosync_enhancements.sql
```

Execute via Supabase SQL Editor para garantir que as tabelas de auto-sync estão atualizadas.

#### Migration: AI Keywords

```bash
# Arquivo: database/migrations/06_ai_keywords.sql
```

Execute para suporte a keywords de IA.

### 3. Verificar Estrutura do Banco

Conecte-se ao Supabase e verifique se as seguintes tabelas existem:

- ✅ `products`
- ✅ `coupons`
- ✅ `app_settings`
- ✅ `sync_configs`
- ✅ `sync_logs`
- ✅ `telegram_channels`
- ✅ `bot_channels`
- ✅ `bot_message_templates`

---

## ⏰ Configuração de Cron Jobs

O sistema usa `node-cron` internamente, então não precisa configurar cron do sistema. Mas é importante verificar:

### 1. Verificar Cron Jobs Ativos

Os cron jobs estão em:
- `backend/src/cron/couponCaptureCron.js` - Captura de cupons
- `backend/src/cron/autoSyncCron.js` - Sincronização automática de produtos

### 2. Configurar Frequência (Opcional)

Se quiser ajustar a frequência, edite os arquivos de cron:

```bash
# Editar cron de captura de cupons
nano src/cron/couponCaptureCron.js

# Editar cron de auto-sync
nano src/cron/autoSyncCron.js
```

### 3. Verificar Logs de Cron

```bash
# Ver logs do PM2
pm2 logs mtw-backend | grep -i cron

# Ver logs da aplicação
tail -f logs/app.log | grep -i cron
```

---

## 🧪 Testes de Captura

### 1. Testar Captura de Produtos

#### Teste AliExpress

```bash
# Executar script de teste
npm run test:aliexpress
```

#### Teste Shopee

```bash
# Teste de produto específico
npm run test:shopee-product-offer

# Teste de busca por keyword
npm run test:shopee-keyword

# Teste de ofertas gerais
npm run test:shopee-offers
```

### 2. Testar Captura de Cupons

#### Via API

```bash
# Testar endpoint de captura manual
curl -X POST http://localhost:3000/api/coupon-capture/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "platform": "aliexpress",
    "keyword": "smartphone"
  }'
```

#### Via Telegram Collector

```bash
# Verificar status do coletor
curl http://localhost:3000/api/telegram-collector/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Testar Auto-Sync

```bash
# Executar auto-sync manualmente via API
curl -X POST http://localhost:3000/api/auto-sync/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "platform": "aliexpress"
  }'
```

### 4. Verificar Puppeteer

Crie um script de teste simples:

```bash
# Criar arquivo de teste
nano test-puppeteer.js
```

Conteúdo:

```javascript
import puppeteer from 'puppeteer';

(async () => {
  console.log('Iniciando teste do Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  await page.goto('https://www.google.com');
  
  const title = await page.title();
  console.log('Título da página:', title);
  
  await browser.close();
  console.log('Teste concluído com sucesso!');
})();
```

Executar:

```bash
node test-puppeteer.js
```

---

## 📊 Monitoramento e Logs

### 1. Configurar Rotação de Logs

```bash
# Instalar logrotate (geralmente já vem instalado)
sudo apt install -y logrotate

# Criar configuração para logs do MTW
sudo nano /etc/logrotate.d/mtw-backend
```

Conteúdo:

```
/home/seu-usuario/projetos/MTW/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 seu-usuario seu-usuario
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Monitorar Recursos do Sistema

```bash
# Instalar htop
sudo apt install -y htop

# Monitorar em tempo real
htop

# Ver uso de memória
free -h

# Ver uso de disco
df -h

# Ver processos do Node
ps aux | grep node
```

### 3. Configurar Alertas (Opcional)

Instalar Netdata para monitoramento visual:

```bash
# Instalar Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Acessar via navegador
# http://seu-ip-vps:19999
```

### 4. Logs Importantes

```bash
# Logs do PM2
pm2 logs mtw-backend

# Logs da aplicação
tail -f ~/projetos/MTW/backend/logs/app.log

# Logs de erro
tail -f ~/projetos/MTW/backend/logs/pm2-error.log

# Logs de saída
tail -f ~/projetos/MTW/backend/logs/pm2-out.log

# Logs do sistema
sudo tail -f /var/log/syslog
```

---

## 🔍 Troubleshooting

### Problema 1: Puppeteer não inicia

**Sintomas:**
- Erro: `Failed to launch the browser process`
- Erro: `Could not find Chromium`

**Solução:**

```bash
# 1. Verificar se Chromium está instalado
which chromium-browser

# 2. Verificar dependências
sudo apt install -y $(cat <<EOF
ca-certificates
fonts-liberation
libappindicator3-1
libasound2
libatk-bridge2.0-0
libatk1.0-0
libgbm1
libgtk-3-0
libnss3
libxss1
EOF
)

# 3. Testar Chromium manualmente
chromium-browser --version

# 4. Verificar variável de ambiente
echo $PUPPETEER_EXECUTABLE_PATH

# 5. Reiniciar aplicação
pm2 restart mtw-backend
```

### Problema 2: Memória Insuficiente

**Sintomas:**
- Aplicação reinicia constantemente
- Erro: `JavaScript heap out of memory`

**Solução:**

```bash
# 1. Verificar uso de memória
free -h
pm2 monit

# 2. Aumentar swap (se não tiver)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Reduzir MAX_BROWSER_INSTANCES no .env
# MAX_BROWSER_INSTANCES=1

# 4. Reduzir TELEGRAM_QUEUE_CONCURRENCY
# TELEGRAM_QUEUE_CONCURRENCY=3

# 5. Reiniciar aplicação
pm2 restart mtw-backend
```

### Problema 3: Captura de Produtos Falha

**Sintomas:**
- Produtos não são capturados
- Erro 500 em endpoints de auto-sync

**Solução:**

```bash
# 1. Verificar logs
pm2 logs mtw-backend --lines 100

# 2. Testar APIs manualmente
npm run test:aliexpress
npm run test:shopee-keyword

# 3. Verificar configurações no banco
# Conectar ao Supabase e verificar tabela app_settings

# 4. Verificar credenciais de API
# Verificar se as keys estão corretas no .env

# 5. Testar Puppeteer
node test-puppeteer.js

# 6. Verificar firewall
sudo ufw status
# Certifique-se de que não está bloqueando conexões de saída
```

### Problema 4: Telegram Collector não funciona

**Sintomas:**
- Cupons não são capturados do Telegram
- Erro de autenticação

**Solução:**

```bash
# 1. Verificar configuração do Telegram
# Acessar painel admin > Configurações > Telegram Collector

# 2. Verificar canais configurados
# Acessar painel admin > Canais do Telegram

# 3. Verificar logs específicos
pm2 logs mtw-backend | grep -i telegram

# 4. Testar autenticação
# Via painel admin, testar conexão com Telegram

# 5. Verificar se o processo está rodando
ps aux | grep telegram
```

### Problema 5: Cron Jobs não executam

**Sintomas:**
- Auto-sync não roda automaticamente
- Captura de cupons não acontece

**Solução:**

```bash
# 1. Verificar se ENABLE_CRON_JOBS está true
cat .env.production | grep ENABLE_CRON_JOBS

# 2. Verificar logs de cron
pm2 logs mtw-backend | grep -i cron

# 3. Verificar se aplicação está rodando
pm2 status

# 4. Reiniciar aplicação
pm2 restart mtw-backend

# 5. Verificar horário do sistema
date
timedatectl
```

### Problema 6: CORS Errors

**Sintomas:**
- Frontend não consegue acessar API
- Erro: `Access-Control-Allow-Origin`

**Solução:**

```bash
# 1. Verificar CORS_ORIGIN no .env
cat .env.production | grep CORS_ORIGIN

# 2. Adicionar domínios corretos
# CORS_ORIGIN=https://seu-frontend.com,https://admin.seu-frontend.com

# 3. Reiniciar aplicação
pm2 restart mtw-backend

# 4. Testar com curl
curl -H "Origin: https://seu-frontend.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3000/api/health
```

---

## ✅ Checklist Final de Verificação

Após seguir todos os passos, verifique:

- [ ] Node.js 18+ instalado
- [ ] PM2 instalado e configurado
- [ ] Chromium instalado e funcionando
- [ ] Dependências do Chromium instaladas
- [ ] Arquivo `.env.production` configurado corretamente
- [ ] `VPS_MODE=true` no .env
- [ ] `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` no .env
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` no .env
- [ ] Swap configurado (se RAM < 2GB)
- [ ] Aplicação rodando via PM2
- [ ] PM2 configurado para iniciar no boot
- [ ] Migrações do banco executadas
- [ ] Firewall configurado corretamente
- [ ] Logs sendo gerados corretamente
- [ ] Teste de Puppeteer passou
- [ ] Teste de captura de produtos passou
- [ ] Teste de captura de cupons passou
- [ ] Cron jobs executando automaticamente
- [ ] Monitoramento configurado

---

## 🎯 Comandos Rápidos de Referência

### Iniciar/Parar Aplicação

```bash
# Iniciar
pm2 start ecosystem.config.cjs --env production

# Parar
pm2 stop mtw-backend

# Reiniciar
pm2 restart mtw-backend

# Recarregar (zero-downtime)
pm2 reload mtw-backend
```

### Ver Logs

```bash
# Todos os logs
pm2 logs mtw-backend

# Apenas erros
pm2 logs mtw-backend --err

# Últimas 100 linhas
pm2 logs mtw-backend --lines 100

# Logs da aplicação
tail -f logs/app.log
```

### Monitorar

```bash
# Dashboard do PM2
pm2 monit

# Status
pm2 status

# Informações detalhadas
pm2 show mtw-backend

# Recursos do sistema
htop
```

### Testar Capturas

```bash
# AliExpress
npm run test:aliexpress

# Shopee
npm run test:shopee-keyword

# Puppeteer
node test-puppeteer.js
```

### Atualizar Código

```bash
# Navegar para diretório
cd ~/projetos/MTW/backend

# Puxar atualizações
git pull origin main

# Instalar novas dependências (se houver)
npm install --production

# Recarregar aplicação
pm2 reload mtw-backend
```

---

## 📞 Suporte

Se encontrar problemas não cobertos neste guia:

1. **Verificar logs**: `pm2 logs mtw-backend`
2. **Consultar documentação**: `docs/06-troubleshooting/`
3. **Verificar issues conhecidos**: GitHub Issues
4. **Contatar suporte**: RDL Tech Solutions

---

## 📝 Notas Importantes

> **⚠️ SEGURANÇA**: Nunca commite o arquivo `.env.production` no Git. Mantenha suas credenciais seguras.

> **💡 PERFORMANCE**: Em VPS com pouca RAM (1GB), considere usar `MAX_BROWSER_INSTANCES=1` para evitar problemas de memória.

> **🔄 ATUALIZAÇÕES**: Sempre faça backup do banco de dados antes de executar migrações.

> **📊 MONITORAMENTO**: Configure alertas para ser notificado se a aplicação cair ou usar muita memória.

---

**Última atualização**: Janeiro 2026  
**Versão do Guia**: 1.0.0  
**Compatível com**: PreçoCerto (MTW) v1.0.0+

---

## 🚀 Próximos Passos

Após configurar a VPS:

1. **Configurar Nginx como Proxy Reverso** (opcional, mas recomendado)
2. **Configurar SSL/HTTPS com Let's Encrypt**
3. **Configurar Backup Automático do Banco de Dados**
4. **Configurar Monitoramento com Alertas**
5. **Otimizar Performance com Redis** (cache)

Consulte os guias específicos em `docs/` para cada um desses tópicos.

---

**Desenvolvido por**: RDL Tech Solutions  
**Projeto**: PreçoCerto (MTW)  
**Licença**: MIT

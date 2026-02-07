# 🔧 Correção Completa: Puppeteer não funciona na VPS

Este guia resolve o problema de web scraping com Puppeteer na VPS, incluindo diagnóstico, correções e validação.

---

## 📋 Índice

1. [Diagnóstico do Problema](#diagnóstico-do-problema)
2. [Causas Comuns](#causas-comuns)
3. [Solução Passo a Passo](#solução-passo-a-passo)
4. [Script de Diagnóstico Automático](#script-de-diagnóstico-automático)
5. [Testes de Validação](#testes-de-validação)
6. [Otimizações Adicionais](#otimizações-adicionais)
7. [Monitoramento](#monitoramento)

---

## 🔍 Diagnóstico do Problema

### Sintomas Comuns

- ❌ Erro: `Failed to launch the browser process`
- ❌ Erro: `Could not find Chromium`
- ❌ Erro: `Protocol error (Target.setAutoAttach): Target closed`
- ❌ Erro: `Navigation timeout of 30000 ms exceeded`
- ❌ Captura retorna array vazio `[]`
- ❌ Timeout ao aguardar seletores
- ❌ Cloudflare bloqueia requisições

### Verificação Rápida

Execute na VPS:

```bash
# 1. Verificar se Chromium está instalado
which chromium-browser
# Deve retornar: /usr/bin/chromium-browser

# 2. Verificar versão do Chromium
chromium-browser --version

# 3. Verificar Node.js
node --version
# Deve ser v18.0.0 ou superior

# 4. Verificar se aplicação está rodando
pm2 status

# 5. Ver logs recentes
pm2 logs mtw-backend --lines 50 | grep -i puppeteer
```

---

## 🎯 Causas Comuns

### 1. Chromium não instalado ou caminho incorreto
### 2. Dependências do Chromium faltando
### 3. Permissões incorretas
### 4. Memória insuficiente
### 5. Variáveis de ambiente incorretas
### 6. Sandbox não desabilitado
### 7. Shared memory (/dev/shm) muito pequeno
### 8. Timeout muito curto para VPS

---

## 🛠️ Solução Passo a Passo

### PASSO 1: Instalar Chromium e Dependências

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Chromium
sudo apt install -y chromium-browser

# Verificar instalação
which chromium-browser
chromium-browser --version

# Instalar TODAS as dependências necessárias
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  fonts-noto-color-emoji \
  fonts-noto-cjk \
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
  xdg-utils \
  xvfb

# Instalar dependências adicionais para VPS
sudo apt install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libfontconfig1 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libxss1 \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils
```

### PASSO 2: Configurar Shared Memory

```bash
# Verificar tamanho atual do /dev/shm
df -h /dev/shm

# Se for menor que 512MB, aumentar
# Editar fstab
sudo nano /etc/fstab

# Adicionar ou modificar linha:
tmpfs /dev/shm tmpfs defaults,size=512M 0 0

# Remontar
sudo mount -o remount /dev/shm

# Verificar
df -h /dev/shm
```

### PASSO 3: Configurar Variáveis de Ambiente

Edite o arquivo `.env.production`:

```bash
cd ~/projetos/MTW/backend
nano .env.production
```

**Configuração CRÍTICA para VPS:**

```bash
# ============================================
# VPS MODE (OBRIGATÓRIO)
# ============================================
VPS_MODE=true
NODE_ENV=production

# ============================================
# PUPPETEER CONFIGURATION (CRÍTICO!)
# ============================================
# Caminho EXATO do Chromium (verificar com: which chromium-browser)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Pular download do Chromium (usar o do sistema)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ============================================
# BROWSER POOL (OTIMIZADO PARA VPS)
# ============================================
# Reduzir para 1 se tiver pouca RAM (<1GB)
MAX_BROWSER_INSTANCES=2

# Aumentar timeout para VPS (Cloudflare pode demorar)
BROWSER_TIMEOUT=60000

# ============================================
# MEMORY MANAGEMENT
# ============================================
# Ajustar conforme RAM disponível
MAX_MEMORY_MB=512

# Habilitar monitoramento
ENABLE_MEMORY_MONITORING=true
```

### PASSO 4: Criar Script de Teste

Crie um arquivo de teste para validar Puppeteer:

```bash
cd ~/projetos/MTW/backend
nano test-puppeteer-vps.js
```

Conteúdo do arquivo:

```javascript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

console.log('🔍 Iniciando teste do Puppeteer na VPS...\n');

const isVPS = process.env.VPS_MODE === 'true' || process.env.NODE_ENV === 'production';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

console.log(`📊 Configurações:`);
console.log(`   VPS Mode: ${isVPS}`);
console.log(`   Executable Path: ${executablePath}`);
console.log(`   Max Instances: ${process.env.MAX_BROWSER_INSTANCES || 2}`);
console.log(`   Timeout: ${process.env.BROWSER_TIMEOUT || 60000}ms\n`);

(async () => {
  let browser;
  
  try {
    console.log('🚀 Lançando browser...');
    
    const config = {
      headless: 'new',
      executablePath: executablePath,
      ignoreDefaultArgs: ['--enable-automation'],
      ignoreHTTPSErrors: true,
      timeout: 60000,
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--disable-web-security',
        '--single-process',
        '--memory-pressure-off',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ]
    };
    
    console.log('   Args:', config.args.join(' '));
    
    browser = await puppeteer.launch(config);
    console.log('✅ Browser lançado com sucesso!\n');
    
    console.log('📄 Criando nova página...');
    const page = await browser.newPage();
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('✅ Página criada!\n');
    
    // Teste 1: Google
    console.log('🧪 Teste 1: Navegando para Google...');
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const googleTitle = await page.title();
    console.log(`✅ Título: ${googleTitle}\n`);
    
    // Teste 2: Site com JavaScript
    console.log('🧪 Teste 2: Navegando para site com JavaScript...');
    await page.goto('https://www.kabum.com.br/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const kabumTitle = await page.title();
    console.log(`✅ Título: ${kabumTitle}\n`);
    
    // Teste 3: Extrair elementos
    console.log('🧪 Teste 3: Extraindo elementos da página...');
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.length;
    });
    console.log(`✅ Links encontrados: ${links}\n`);
    
    // Teste 4: Screenshot
    console.log('🧪 Teste 4: Tirando screenshot...');
    await page.screenshot({ path: '/tmp/test-screenshot.png' });
    console.log('✅ Screenshot salvo em /tmp/test-screenshot.png\n');
    
    await page.close();
    await browser.close();
    
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Puppeteer está funcionando corretamente na VPS!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error('\n📋 Stack trace:', error.stack);
    
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    console.log('\n💡 Dicas de troubleshooting:');
    console.log('1. Verifique se Chromium está instalado: which chromium-browser');
    console.log('2. Verifique dependências: sudo apt install -y chromium-browser');
    console.log('3. Verifique permissões: ls -la /usr/bin/chromium-browser');
    console.log('4. Verifique memória: free -h');
    console.log('5. Verifique logs: pm2 logs mtw-backend');
    
    process.exit(1);
  }
})();
```

Salve e execute:

```bash
node test-puppeteer-vps.js
```

### PASSO 5: Corrigir Permissões

```bash
# Dar permissão de execução ao Chromium
sudo chmod +x /usr/bin/chromium-browser

# Verificar permissões
ls -la /usr/bin/chromium-browser

# Se necessário, adicionar usuário ao grupo de vídeo
sudo usermod -a -G video $USER

# Relogar para aplicar mudanças de grupo
# (ou executar: newgrp video)
```

### PASSO 6: Aumentar Limites do Sistema

```bash
# Editar limits.conf
sudo nano /etc/security/limits.conf

# Adicionar no final:
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536

# Editar sysctl.conf
sudo nano /etc/sysctl.conf

# Adicionar:
fs.file-max=65536
vm.max_map_count=262144

# Aplicar mudanças
sudo sysctl -p

# Verificar
ulimit -n
```

### PASSO 7: Reiniciar Aplicação

```bash
# Parar aplicação
pm2 stop mtw-backend

# Limpar logs antigos
pm2 flush

# Recarregar variáveis de ambiente e iniciar
pm2 delete mtw-backend
pm2 start ecosystem.config.cjs --env production

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs mtw-backend
```

---

## 🤖 Script de Diagnóstico Automático

Crie um script para diagnosticar problemas automaticamente:

```bash
cd ~/projetos/MTW/backend
nano diagnose-puppeteer.sh
```

Conteúdo:

```bash
#!/bin/bash

echo "🔍 DIAGNÓSTICO PUPPETEER VPS"
echo "=============================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Verificar Chromium
echo "1️⃣ Verificando Chromium..."
which chromium-browser > /dev/null 2>&1
check "Chromium instalado"

if [ $? -eq 0 ]; then
    VERSION=$(chromium-browser --version 2>/dev/null)
    echo "   Versão: $VERSION"
fi
echo ""

# 2. Verificar Node.js
echo "2️⃣ Verificando Node.js..."
NODE_VERSION=$(node --version 2>/dev/null)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v19* ]] || [[ $NODE_VERSION == v20* ]]; then
    check "Node.js versão adequada ($NODE_VERSION)"
else
    echo -e "${RED}❌ Node.js versão inadequada ($NODE_VERSION)${NC}"
fi
echo ""

# 3. Verificar dependências
echo "3️⃣ Verificando dependências críticas..."
DEPS=(
    "libgbm1"
    "libnss3"
    "libxss1"
    "libatk-bridge2.0-0"
    "libgtk-3-0"
)

for dep in "${DEPS[@]}"; do
    dpkg -l | grep -q "^ii  $dep"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $dep${NC}"
    else
        echo -e "${YELLOW}⚠️  $dep (não instalado)${NC}"
    fi
done
echo ""

# 4. Verificar /dev/shm
echo "4️⃣ Verificando /dev/shm..."
SHM_SIZE=$(df -h /dev/shm | tail -1 | awk '{print $2}')
echo "   Tamanho: $SHM_SIZE"
if [[ $SHM_SIZE == *G ]] || [[ ${SHM_SIZE%M} -ge 256 ]]; then
    check "/dev/shm adequado"
else
    echo -e "${YELLOW}⚠️  /dev/shm pode ser pequeno (recomendado: 512M+)${NC}"
fi
echo ""

# 5. Verificar memória
echo "5️⃣ Verificando memória..."
FREE_MEM=$(free -m | grep Mem | awk '{print $7}')
echo "   Memória livre: ${FREE_MEM}MB"
if [ $FREE_MEM -gt 200 ]; then
    check "Memória suficiente"
else
    echo -e "${YELLOW}⚠️  Memória baixa (${FREE_MEM}MB livre)${NC}"
fi
echo ""

# 6. Verificar variáveis de ambiente
echo "6️⃣ Verificando variáveis de ambiente..."
if [ -f ".env.production" ]; then
    check ".env.production existe"
    
    if grep -q "VPS_MODE=true" .env.production; then
        check "VPS_MODE=true"
    else
        echo -e "${RED}❌ VPS_MODE não está true${NC}"
    fi
    
    if grep -q "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" .env.production; then
        check "PUPPETEER_EXECUTABLE_PATH correto"
    else
        echo -e "${YELLOW}⚠️  PUPPETEER_EXECUTABLE_PATH pode estar incorreto${NC}"
    fi
else
    echo -e "${RED}❌ .env.production não encontrado${NC}"
fi
echo ""

# 7. Verificar PM2
echo "7️⃣ Verificando PM2..."
pm2 list | grep -q "mtw-backend"
if [ $? -eq 0 ]; then
    check "Aplicação rodando no PM2"
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="mtw-backend") | .pm2_env.status')
    echo "   Status: $STATUS"
else
    echo -e "${RED}❌ Aplicação não está rodando no PM2${NC}"
fi
echo ""

# 8. Verificar logs recentes
echo "8️⃣ Verificando logs recentes..."
if pm2 logs mtw-backend --nostream --lines 50 | grep -i "error.*puppeteer" > /dev/null; then
    echo -e "${YELLOW}⚠️  Erros de Puppeteer encontrados nos logs${NC}"
    echo "   Execute: pm2 logs mtw-backend | grep -i puppeteer"
else
    check "Sem erros recentes de Puppeteer"
fi
echo ""

# Resumo
echo "=============================="
echo "📊 RESUMO"
echo "=============================="
echo ""
echo "Execute o teste completo:"
echo "  node test-puppeteer-vps.js"
echo ""
echo "Se houver problemas, consulte:"
echo "  docs/FIX_PUPPETEER_VPS.md"
echo ""
```

Tornar executável e rodar:

```bash
chmod +x diagnose-puppeteer.sh
./diagnose-puppeteer.sh
```

---

## ✅ Testes de Validação

### Teste 1: Script de Teste Básico

```bash
node test-puppeteer-vps.js
```

**Resultado esperado:** Todos os 4 testes devem passar.

### Teste 2: Teste de Captura Real

Crie arquivo `test-capture-real.js`:

```javascript
import browserScraper from './src/services/browserScraper.js';
import logger from './src/config/logger.js';

(async () => {
  try {
    console.log('🧪 Testando captura real de produtos...\n');
    
    // Teste Kabum
    console.log('📦 Teste 1: Kabum');
    const kabumLinks = await browserScraper.extractProductLinksWithRetry(
      'https://www.kabum.com.br/ofertas/ofertasdodia',
      [
        'a.productLink',
        'a[href*="/produto/"]',
        '.sc-fFeiMQ a'
      ],
      '.pbox',
      2,
      30000
    );
    
    console.log(`✅ Kabum: ${kabumLinks.length} produtos encontrados\n`);
    
    // Teste Terabyte
    console.log('📦 Teste 2: Terabyte');
    const terabyteLinks = await browserScraper.extractProductLinksWithRetry(
      'https://www.terabyteshop.com.br/promocoes',
      [
        'a.product-link',
        'a[href*="/produto/"]'
      ],
      '.product-item',
      2,
      30000
    );
    
    console.log(`✅ Terabyte: ${terabyteLinks.length} produtos encontrados\n`);
    
    console.log('🎉 Testes de captura concluídos!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
})();
```

Execute:

```bash
node test-capture-real.js
```

### Teste 3: Teste via API

```bash
# Obter token de autenticação primeiro
TOKEN="seu-token-aqui"

# Testar endpoint de auto-sync
curl -X POST http://localhost:3000/api/auto-sync/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "platform": "kabum",
    "limit": 5
  }'
```

### Teste 4: Verificar Métricas do Pool

Adicione endpoint de debug (temporário):

```javascript
// Em src/routes/debugRoutes.js (criar se não existir)
import express from 'express';
import browserPool from '../utils/browserPool.js';

const router = express.Router();

router.get('/browser-pool-metrics', (req, res) => {
  const metrics = browserPool.getMetrics();
  res.json(metrics);
});

export default router;
```

Testar:

```bash
curl http://localhost:3000/api/debug/browser-pool-metrics
```

---

## 🚀 Otimizações Adicionais

### 1. Ajustar Timeout Baseado em Latência

Se sua VPS tem latência alta, aumente os timeouts:

```bash
# .env.production
BROWSER_TIMEOUT=90000  # 90 segundos
```

### 2. Usar Xvfb (Virtual Display)

Para VPS sem interface gráfica:

```bash
# Instalar Xvfb
sudo apt install -y xvfb

# Criar wrapper script
sudo nano /usr/local/bin/chromium-xvfb
```

Conteúdo:

```bash
#!/bin/bash
xvfb-run -a --server-args="-screen 0 1920x1080x24" /usr/bin/chromium-browser "$@"
```

Tornar executável:

```bash
sudo chmod +x /usr/local/bin/chromium-xvfb
```

Atualizar `.env.production`:

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium-xvfb
```

### 3. Limitar Uso de Recursos

No `browserPool.js`, já está otimizado, mas você pode ajustar:

```javascript
// Se tiver RAM < 1GB, usar apenas 1 instância
MAX_BROWSER_INSTANCES=1

// Se tiver RAM >= 2GB, pode usar 3
MAX_BROWSER_INSTANCES=3
```

### 4. Implementar Cache de Páginas

Para evitar requisições repetidas, implemente cache:

```javascript
// Em browserScraper.js, adicionar cache simples
const pageCache = new Map();
const CACHE_TTL = 300000; // 5 minutos

async extractWithCache(url, extractor) {
  const cached = pageCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug(`📦 Usando cache para ${url}`);
    return cached.data;
  }
  
  const data = await extractor(url);
  pageCache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

---

## 📊 Monitoramento

### 1. Criar Endpoint de Health Check

```javascript
// src/routes/healthRoutes.js
router.get('/puppeteer', async (req, res) => {
  try {
    const metrics = browserPool.getMetrics();
    
    // Teste rápido
    const testResult = await browserPool.withPage(async (page) => {
      await page.goto('https://www.google.com', { timeout: 10000 });
      return { success: true };
    });
    
    res.json({
      status: 'healthy',
      puppeteer: testResult,
      metrics: metrics
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 2. Monitorar Logs

```bash
# Ver logs de Puppeteer em tempo real
pm2 logs mtw-backend | grep -i "puppeteer\|browser"

# Ver apenas erros
pm2 logs mtw-backend --err | grep -i puppeteer

# Salvar logs para análise
pm2 logs mtw-backend --lines 1000 > puppeteer-logs.txt
```

### 3. Alertas Automáticos

Configure alertas se Puppeteer falhar:

```javascript
// src/utils/alerting.js
import logger from '../config/logger.js';

let failureCount = 0;
const MAX_FAILURES = 5;

export function reportPuppeteerFailure(error) {
  failureCount++;
  
  if (failureCount >= MAX_FAILURES) {
    logger.error(`🚨 ALERTA: Puppeteer falhou ${failureCount} vezes!`);
    // Enviar notificação (Telegram, email, etc.)
    // sendTelegramAlert(`Puppeteer crítico: ${failureCount} falhas`);
  }
}

export function resetFailureCount() {
  failureCount = 0;
}
```

---

## 🎯 Checklist Final

Após aplicar todas as correções, verifique:

- [ ] Chromium instalado: `which chromium-browser`
- [ ] Todas as dependências instaladas
- [ ] `/dev/shm` >= 256MB
- [ ] Memória livre > 200MB
- [ ] `.env.production` com `VPS_MODE=true`
- [ ] `.env.production` com `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- [ ] `.env.production` com `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- [ ] Limites do sistema aumentados
- [ ] Aplicação reiniciada: `pm2 restart mtw-backend`
- [ ] Teste básico passou: `node test-puppeteer-vps.js`
- [ ] Teste de captura passou: `node test-capture-real.js`
- [ ] Logs sem erros: `pm2 logs mtw-backend`
- [ ] Métricas do pool OK: `/api/debug/browser-pool-metrics`

---

## 🆘 Problemas Persistentes?

Se após seguir todos os passos o problema persistir:

### 1. Coletar Informações de Debug

```bash
# Criar arquivo de debug
cat > debug-info.txt << EOF
=== SISTEMA ===
$(uname -a)
$(lsb_release -a 2>/dev/null)

=== MEMÓRIA ===
$(free -h)

=== CHROMIUM ===
$(which chromium-browser)
$(chromium-browser --version 2>&1)

=== NODE.JS ===
$(node --version)
$(npm --version)

=== VARIÁVEIS DE AMBIENTE ===
$(cat .env.production | grep -E "VPS_MODE|PUPPETEER|BROWSER")

=== PM2 STATUS ===
$(pm2 status)

=== LOGS RECENTES ===
$(pm2 logs mtw-backend --nostream --lines 100 | grep -i "error\|puppeteer")

=== DEPENDÊNCIAS ===
$(dpkg -l | grep -E "chromium|libgbm|libnss|libxss")
EOF

cat debug-info.txt
```

### 2. Testar Chromium Manualmente

```bash
# Testar Chromium diretamente
chromium-browser \
  --no-sandbox \
  --disable-setuid-sandbox \
  --headless \
  --disable-gpu \
  --dump-dom \
  https://www.google.com
```

Se isso funcionar, o problema está na configuração do Puppeteer.

### 3. Usar Puppeteer com Docker (Alternativa)

Se nada funcionar, considere usar Docker:

```bash
# Criar Dockerfile
cat > Dockerfile << EOF
FROM node:18-slim

# Instalar Chromium e dependências
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV VPS_MODE=true

CMD ["node", "src/server.js"]
EOF

# Build e run
docker build -t mtw-backend .
docker run -p 3000:3000 --env-file .env.production mtw-backend
```

---

## 📞 Suporte

Se precisar de ajuda adicional:

1. **Logs completos**: `pm2 logs mtw-backend --lines 500 > logs.txt`
2. **Debug info**: Execute script de diagnóstico
3. **Screenshot**: Se possível, tire screenshot do erro
4. **Contato**: RDL Tech Solutions

---

**Última atualização**: Janeiro 2026  
**Versão**: 1.0.0  
**Testado em**: Ubuntu 20.04, 22.04, Debian 11

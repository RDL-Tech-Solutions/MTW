#!/bin/bash

echo "🔍 DIAGNÓSTICO PUPPETEER VPS"
echo "=============================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. Verificar Chromium
echo "1️⃣ Verificando Chromium..."
which chromium-browser > /dev/null 2>&1
check "Chromium instalado"

if [ $? -eq 0 ]; then
    VERSION=$(chromium-browser --version 2>/dev/null)
    info "Versão: $VERSION"
    CHROMIUM_PATH=$(which chromium-browser)
    info "Caminho: $CHROMIUM_PATH"
else
    warn "Execute: sudo apt install -y chromium-browser"
fi
echo ""

# 2. Verificar Node.js
echo "2️⃣ Verificando Node.js..."
NODE_VERSION=$(node --version 2>/dev/null)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v19* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v21* ]]; then
    check "Node.js versão adequada ($NODE_VERSION)"
else
    echo -e "${RED}❌ Node.js versão inadequada ($NODE_VERSION)${NC}"
    warn "Requerido: Node.js v18.0.0 ou superior"
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
    "fonts-liberation"
    "libappindicator3-1"
)

MISSING_DEPS=()
for dep in "${DEPS[@]}"; do
    dpkg -l | grep -q "^ii  $dep" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $dep${NC}"
    else
        echo -e "${YELLOW}⚠️  $dep (não instalado)${NC}"
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo ""
    warn "Instale dependências faltando:"
    echo "sudo apt install -y ${MISSING_DEPS[*]}"
fi
echo ""

# 4. Verificar /dev/shm
echo "4️⃣ Verificando /dev/shm..."
SHM_SIZE=$(df -h /dev/shm 2>/dev/null | tail -1 | awk '{print $2}')
SHM_AVAIL=$(df -h /dev/shm 2>/dev/null | tail -1 | awk '{print $4}')
info "Tamanho total: $SHM_SIZE"
info "Disponível: $SHM_AVAIL"

# Converter para MB para comparação
SHM_SIZE_MB=$(df -m /dev/shm 2>/dev/null | tail -1 | awk '{print $2}')
if [ "$SHM_SIZE_MB" -ge 256 ]; then
    check "/dev/shm adequado (${SHM_SIZE})"
else
    warn "/dev/shm pequeno (${SHM_SIZE}). Recomendado: 512MB+"
    info "Para aumentar, edite /etc/fstab e adicione:"
    info "tmpfs /dev/shm tmpfs defaults,size=512M 0 0"
fi
echo ""

# 5. Verificar memória
echo "5️⃣ Verificando memória..."
TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
USED_MEM=$(free -m | grep Mem | awk '{print $3}')
FREE_MEM=$(free -m | grep Mem | awk '{print $7}')
info "Total: ${TOTAL_MEM}MB"
info "Usada: ${USED_MEM}MB"
info "Livre: ${FREE_MEM}MB"

if [ $FREE_MEM -gt 200 ]; then
    check "Memória suficiente"
else
    warn "Memória baixa (${FREE_MEM}MB livre)"
    info "Considere adicionar swap ou fechar processos"
fi
echo ""

# 6. Verificar swap
echo "6️⃣ Verificando swap..."
SWAP_TOTAL=$(free -m | grep Swap | awk '{print $2}')
SWAP_USED=$(free -m | grep Swap | awk '{print $3}')
SWAP_FREE=$(free -m | grep Swap | awk '{print $4}')

if [ "$SWAP_TOTAL" -gt 0 ]; then
    info "Total: ${SWAP_TOTAL}MB"
    info "Usada: ${SWAP_USED}MB"
    info "Livre: ${SWAP_FREE}MB"
    check "Swap configurado"
else
    warn "Swap não configurado"
    info "Para criar swap de 2GB:"
    info "sudo fallocate -l 2G /swapfile"
    info "sudo chmod 600 /swapfile"
    info "sudo mkswap /swapfile"
    info "sudo swapon /swapfile"
fi
echo ""

# 7. Verificar variáveis de ambiente
echo "7️⃣ Verificando variáveis de ambiente..."
if [ -f ".env.production" ]; then
    check ".env.production existe"
    
    if grep -q "VPS_MODE=true" .env.production 2>/dev/null; then
        check "VPS_MODE=true"
    else
        echo -e "${RED}❌ VPS_MODE não está true${NC}"
        warn "Adicione: VPS_MODE=true"
    fi
    
    EXEC_PATH=$(grep "PUPPETEER_EXECUTABLE_PATH" .env.production 2>/dev/null | cut -d'=' -f2)
    if [ -n "$EXEC_PATH" ]; then
        info "PUPPETEER_EXECUTABLE_PATH=$EXEC_PATH"
        if [ -f "$EXEC_PATH" ]; then
            check "Executável existe"
        else
            warn "Executável não encontrado em $EXEC_PATH"
        fi
    else
        warn "PUPPETEER_EXECUTABLE_PATH não configurado"
        info "Adicione: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser"
    fi
    
    if grep -q "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" .env.production 2>/dev/null; then
        check "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true"
    else
        warn "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD não está true"
    fi
else
    echo -e "${RED}❌ .env.production não encontrado${NC}"
    warn "Copie .env.example para .env.production e configure"
fi
echo ""

# 8. Verificar PM2
echo "8️⃣ Verificando PM2..."
if command -v pm2 &> /dev/null; then
    check "PM2 instalado"
    
    if pm2 list 2>/dev/null | grep -q "mtw-backend"; then
        check "Aplicação rodando no PM2"
        
        # Verificar status
        STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"mtw-backend".*"status":"[^"]*"' | grep -o 'status":"[^"]*"' | cut -d'"' -f3)
        if [ "$STATUS" == "online" ]; then
            info "Status: online ✓"
        else
            warn "Status: $STATUS"
        fi
        
        # Verificar uptime
        UPTIME=$(pm2 jlist 2>/dev/null | grep -o '"name":"mtw-backend".*"pm_uptime":[0-9]*' | grep -o 'pm_uptime":[0-9]*' | cut -d':' -f2)
        if [ -n "$UPTIME" ]; then
            UPTIME_HOURS=$((($UPTIME / 1000 / 3600)))
            info "Uptime: ${UPTIME_HOURS}h"
        fi
    else
        warn "Aplicação não está rodando no PM2"
        info "Inicie com: pm2 start ecosystem.config.cjs --env production"
    fi
else
    warn "PM2 não instalado"
    info "Instale com: sudo npm install -g pm2"
fi
echo ""

# 9. Verificar logs recentes
echo "9️⃣ Verificando logs recentes..."
if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "mtw-backend"; then
    ERROR_COUNT=$(pm2 logs mtw-backend --nostream --lines 100 2>/dev/null | grep -i "error.*puppeteer" | wc -l)
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        warn "Encontrados $ERROR_COUNT erros de Puppeteer nos logs"
        info "Execute: pm2 logs mtw-backend | grep -i puppeteer"
    else
        check "Sem erros recentes de Puppeteer"
    fi
else
    info "Aplicação não está rodando, não há logs para verificar"
fi
echo ""

# 10. Verificar permissões
echo "🔟 Verificando permissões..."
if [ -f "/usr/bin/chromium-browser" ]; then
    PERMS=$(ls -l /usr/bin/chromium-browser | awk '{print $1}')
    info "Permissões: $PERMS"
    
    if [ -x "/usr/bin/chromium-browser" ]; then
        check "Chromium é executável"
    else
        warn "Chromium não tem permissão de execução"
        info "Execute: sudo chmod +x /usr/bin/chromium-browser"
    fi
fi
echo ""

# Resumo
echo "=============================="
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "=============================="
echo ""

# Contar problemas
PROBLEMS=0

if ! which chromium-browser > /dev/null 2>&1; then
    ((PROBLEMS++))
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    ((PROBLEMS++))
fi

if [ "$FREE_MEM" -lt 200 ]; then
    ((PROBLEMS++))
fi

if ! grep -q "VPS_MODE=true" .env.production 2>/dev/null; then
    ((PROBLEMS++))
fi

if [ $PROBLEMS -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhum problema crítico encontrado!${NC}"
    echo ""
    echo "Execute o teste completo:"
    echo "  node test-puppeteer-vps.js"
else
    echo -e "${YELLOW}⚠️  Encontrados $PROBLEMS problema(s)${NC}"
    echo ""
    echo "Siga as recomendações acima para corrigir."
    echo "Consulte o guia completo:"
    echo "  docs/FIX_PUPPETEER_VPS.md"
fi
echo ""

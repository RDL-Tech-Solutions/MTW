#!/bin/bash

###############################################################################
# Script de Instalação do Backend MTW em VPS Ubuntu/Debian
# Instala todas as dependências necessárias para rodar Puppeteer e Node.js
###############################################################################

set -e  # Parar em caso de erro

echo "🚀 ========== Instalação do Backend MTW em VPS =========="
echo ""

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script precisa ser executado como root ou com sudo"
    echo "   Execute: sudo bash vps-setup.sh"
    exit 1
fi

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo "❌ Não foi possível detectar o sistema operacional"
    exit 1
fi

echo "📋 Sistema detectado: $OS $VER"
echo ""

# 1. Atualizar sistema
echo "📦 [1/7] Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq

# 2. Instalar dependências básicas
echo "🔧 [2/7] Instalando dependências básicas..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg

# 3. Instalar Node.js 18.x
echo "📦 [3/7] Instalando Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "   ✅ Node.js já instalado: $(node --version)"
fi

# 4. Instalar dependências do Chromium/Puppeteer
echo "🌐 [4/7] Instalando dependências do Chromium..."
apt-get install -y -qq \
    chromium-browser \
    chromium-codecs-ffmpeg \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    ca-certificates

# Fallback para Debian/Ubuntu mais antigos
if [ "$OS" = "debian" ] || [ "$OS" = "ubuntu" ]; then
    apt-get install -y -qq \
        gconf-service \
        libgconf-2-4 \
        libxshmfence1 || true
fi

# 5. Instalar PM2 globalmente
echo "⚙️  [5/7] Instalando PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
else
    echo "   ✅ PM2 já instalado: $(pm2 --version)"
fi

# 6. Configurar limites do sistema
echo "🔧 [6/7] Configurando limites do sistema..."

# Aumentar limites de arquivos abertos
if ! grep -q "fs.file-max" /etc/sysctl.conf; then
    echo "fs.file-max = 65536" >> /etc/sysctl.conf
fi

if ! grep -q "fs.inotify.max_user_watches" /etc/sysctl.conf; then
    echo "fs.inotify.max_user_watches = 524288" >> /etc/sysctl.conf
fi

sysctl -p

# Configurar ulimit
if ! grep -q "* soft nofile 65536" /etc/security/limits.conf; then
    echo "* soft nofile 65536" >> /etc/security/limits.conf
    echo "* hard nofile 65536" >> /etc/security/limits.conf
fi

# 7. Criar swap se necessário (útil para VPS com pouca RAM)
echo "💾 [7/7] Verificando swap..."
SWAP_SIZE=$(free -m | awk '/^Swap:/ {print $2}')

if [ "$SWAP_SIZE" -lt 1024 ]; then
    echo "   ⚠️  Swap insuficiente ($SWAP_SIZE MB). Criando swap de 2GB..."
    
    # Criar arquivo de swap
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Tornar permanente
    if ! grep -q "/swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    
    # Configurar swappiness
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    sysctl -p
    
    echo "   ✅ Swap de 2GB criado e ativado"
else
    echo "   ✅ Swap já configurado: $SWAP_SIZE MB"
fi

echo ""
echo "✅ ========== Instalação Concluída! =========="
echo ""
echo "📋 Próximos passos:"
echo "   1. Clone o repositório do projeto"
echo "   2. Entre na pasta do backend: cd backend"
echo "   3. Instale as dependências: npm install"
echo "   4. Configure o arquivo .env (copie de .env.example)"
echo "   5. Inicie com PM2: npm run start:prod"
echo ""
echo "🔍 Informações do sistema:"
echo "   Node.js: $(node --version)"
echo "   NPM: $(npm --version)"
echo "   PM2: $(pm2 --version)"
echo "   Chromium: $(chromium-browser --version 2>/dev/null || echo 'Instalado')"
echo "   Swap: $(free -h | awk '/^Swap:/ {print $2}')"
echo ""
echo "📚 Consulte VPS_SETUP_GUIDE.md para mais informações"
echo ""

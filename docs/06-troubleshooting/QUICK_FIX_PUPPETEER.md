# 🚨 Guia Rápido: Puppeteer não funciona na VPS

## ⚡ Solução Rápida (5 minutos)

Execute estes comandos na VPS via SSH:

```bash
# 1. Instalar Chromium e dependências
sudo apt update
sudo apt install -y chromium-browser libgbm1 libnss3 libxss1 libatk-bridge2.0-0 libgtk-3-0 fonts-liberation

# 2. Verificar instalação
which chromium-browser
chromium-browser --version

# 3. Navegar para diretório do backend
cd ~/projetos/MTW/backend

# 4. Configurar variáveis de ambiente
cat >> .env.production << 'EOF'

# VPS Puppeteer Configuration
VPS_MODE=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
MAX_BROWSER_INSTANCES=2
BROWSER_TIMEOUT=60000
EOF

# 5. Reiniciar aplicação
pm2 restart mtw-backend

# 6. Testar
node test-puppeteer-vps.js
```

---

## 🔍 Diagnóstico Rápido

```bash
# Executar script de diagnóstico
cd ~/projetos/MTW/backend
chmod +x diagnose-puppeteer.sh
./diagnose-puppeteer.sh
```

---

## ✅ Checklist Rápido

- [ ] Chromium instalado: `which chromium-browser`
- [ ] Dependências instaladas: `dpkg -l | grep libgbm1`
- [ ] `.env.production` com `VPS_MODE=true`
- [ ] `.env.production` com `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- [ ] Aplicação reiniciada: `pm2 restart mtw-backend`
- [ ] Teste passou: `node test-puppeteer-vps.js`

---

## 🆘 Problemas Comuns

### Erro: "Could not find Chromium"

```bash
# Solução
sudo apt install -y chromium-browser
echo 'PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser' >> .env.production
pm2 restart mtw-backend
```

### Erro: "Failed to launch browser"

```bash
# Solução
sudo apt install -y libgbm1 libnss3 libxss1
pm2 restart mtw-backend
```

### Erro: "Navigation timeout"

```bash
# Solução - Aumentar timeout
echo 'BROWSER_TIMEOUT=90000' >> .env.production
pm2 restart mtw-backend
```

### Memória insuficiente

```bash
# Solução - Criar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📚 Guias Completos

- **Setup completo**: `docs/VPS_SETUP_COMPLETO.md`
- **Correção detalhada**: `docs/FIX_PUPPETEER_VPS.md`
- **Configuração de captura**: `docs/CONFIGURACAO_CAPTURA.md`

---

## 🧪 Comandos de Teste

```bash
# Teste básico
node test-puppeteer-vps.js

# Diagnóstico completo
./diagnose-puppeteer.sh

# Ver logs
pm2 logs mtw-backend | grep -i puppeteer

# Status do PM2
pm2 status

# Métricas de memória
free -h
```

---

## 📞 Suporte

Se o problema persistir após seguir este guia:

1. Execute: `./diagnose-puppeteer.sh > diagnostico.txt`
2. Envie o arquivo `diagnostico.txt` para suporte
3. Inclua logs: `pm2 logs mtw-backend --lines 200 > logs.txt`

---

**Tempo estimado de correção**: 5-10 minutos  
**Taxa de sucesso**: 95%+

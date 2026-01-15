# Guia de Instalação e Configuração em VPS

Este guia fornece instruções detalhadas para instalar e configurar o backend MTW em um servidor VPS (Ubuntu/Debian).

## 📋 Requisitos Mínimos

- **Sistema Operacional**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Mínimo 1GB (recomendado 2GB+)
- **CPU**: 1 vCPU (recomendado 2+)
- **Disco**: 10GB livres
- **Swap**: 2GB (criado automaticamente pelo script)

## 🚀 Instalação Rápida

### 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Clonar o repositório
git clone https://github.com/seu-usuario/mtw.git
cd mtw/backend
```

### 2. Executar Script de Instalação

```bash
# Tornar o script executável
chmod +x scripts/vps-setup.sh

# Executar instalação (requer sudo)
sudo bash scripts/vps-setup.sh
```

O script irá instalar automaticamente:
- ✅ Node.js 18.x
- ✅ Chromium e dependências
- ✅ PM2 (gerenciador de processos)
- ✅ Configurar swap (se necessário)
- ✅ Ajustar limites do sistema

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas configurações
nano .env
```

**Configurações importantes para VPS:**

```bash
# Ativar modo VPS
VPS_MODE=true
NODE_ENV=production

# Puppeteer (usar Chromium do sistema)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

# Limitar recursos
MAX_BROWSER_INSTANCES=2
TELEGRAM_QUEUE_CONCURRENCY=5
MAX_MEMORY_MB=512

# Habilitar cron jobs
ENABLE_CRON_JOBS=true
```

### 4. Instalar Dependências

```bash
# Instalar pacotes npm
npm install --production
```

### 5. Iniciar com PM2

```bash
# Iniciar em modo produção
npm run start:prod

# Ou diretamente com PM2
pm2 start ecosystem.config.cjs --env production

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
```

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
# Logs do PM2
pm2 logs mtw-backend

# Apenas erros
pm2 logs mtw-backend --err

# Logs do aplicativo
tail -f logs/app.log
```

### Monitorar Recursos

```bash
# Dashboard do PM2
pm2 monit

# Status dos processos
pm2 status

# Informações detalhadas
pm2 info mtw-backend
```

### Métricas do Sistema

```bash
# Uso de memória
free -h

# Uso de CPU e processos
htop

# Uso de disco
df -h
```

## 🔧 Manutenção

### Restart do Aplicativo

```bash
# Restart gracioso
pm2 reload mtw-backend

# Restart forçado
pm2 restart mtw-backend

# Parar aplicação
pm2 stop mtw-backend

# Remover do PM2
pm2 delete mtw-backend
```

### Atualizar Código

```bash
# Parar aplicação
pm2 stop mtw-backend

# Atualizar código
git pull origin main

# Instalar novas dependências
npm install --production

# Reiniciar
pm2 reload mtw-backend
```

### Limpar Logs

```bash
# Limpar logs do PM2
pm2 flush

# Limpar logs da aplicação
rm -f logs/*.log
```

## 🐛 Troubleshooting

### Problema: Chromium não encontrado

**Erro**: `Error: Failed to launch the browser process`

**Solução**:
```bash
# Verificar se Chromium está instalado
which chromium-browser

# Se não estiver, instalar
sudo apt install -y chromium-browser

# Verificar caminho no .env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Problema: Memória insuficiente

**Erro**: `JavaScript heap out of memory`

**Solução**:
```bash
# Verificar uso de memória
free -h

# Aumentar swap
sudo fallocate -l 4G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2

# Reduzir limites no .env
MAX_BROWSER_INSTANCES=1
TELEGRAM_QUEUE_CONCURRENCY=3
```

### Problema: PM2 não inicia no boot

**Solução**:
```bash
# Reconfigurar startup
pm2 unstartup
pm2 startup

# Salvar configuração
pm2 save
```

### Problema: Erro de permissões

**Erro**: `EACCES: permission denied`

**Solução**:
```bash
# Ajustar permissões da pasta
sudo chown -R $USER:$USER /caminho/para/mtw

# Ajustar permissões de logs
chmod -R 755 logs/
```

### Problema: Telegram não conecta

**Solução**:
```bash
# Verificar logs
pm2 logs mtw-backend | grep Telegram

# Verificar sessão do Telegram
ls -la telegram_sessions/

# Remover sessão antiga e reconectar
rm -rf telegram_sessions/*
pm2 restart mtw-backend
```

## ⚙️ Otimizações Avançadas

### Nginx como Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall (UFW)

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar status
sudo ufw status
```

### Backup Automático

```bash
# Criar script de backup
cat > /home/$USER/backup-mtw.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/mtw-$DATE.tar.gz \
    /caminho/para/mtw/backend/.env \
    /caminho/para/mtw/backend/telegram_sessions \
    /caminho/para/mtw/backend/logs
# Manter apenas últimos 7 backups
ls -t $BACKUP_DIR/mtw-*.tar.gz | tail -n +8 | xargs rm -f
EOF

# Tornar executável
chmod +x /home/$USER/backup-mtw.sh

# Adicionar ao crontab (backup diário às 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /home/$USER/backup-mtw.sh") | crontab -
```

## 📈 Performance

### Configurações Recomendadas por Tamanho de VPS

#### VPS Pequena (1GB RAM, 1 vCPU)
```bash
MAX_BROWSER_INSTANCES=1
TELEGRAM_QUEUE_CONCURRENCY=3
MAX_MEMORY_MB=384
```

#### VPS Média (2GB RAM, 2 vCPU)
```bash
MAX_BROWSER_INSTANCES=2
TELEGRAM_QUEUE_CONCURRENCY=5
MAX_MEMORY_MB=512
```

#### VPS Grande (4GB+ RAM, 4+ vCPU)
```bash
MAX_BROWSER_INSTANCES=3
TELEGRAM_QUEUE_CONCURRENCY=10
MAX_MEMORY_MB=1024
```

## 🔒 Segurança

### Recomendações

1. **Usar HTTPS**: Configure SSL/TLS com Let's Encrypt
2. **Firewall**: Habilitar UFW e permitir apenas portas necessárias
3. **Atualizações**: Manter sistema e dependências atualizados
4. **Secrets**: Nunca commitar .env no git
5. **SSH**: Desabilitar login root, usar chaves SSH

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. Verificar logs: `pm2 logs mtw-backend`
2. Verificar métricas: `pm2 monit`
3. Verificar recursos: `htop` e `free -h`
4. Consultar documentação do projeto

## 📚 Recursos Adicionais

- [Documentação do PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

# 🧪 Scripts de Teste e Diagnóstico

Este diretório contém scripts para testar e diagnosticar o funcionamento do Puppeteer na VPS.

---

## 📋 Scripts Disponíveis

### 1. **test-puppeteer-vps.js**
Script de teste completo do Puppeteer.

**Uso**:
```bash
node test-puppeteer-vps.js
```

**O que testa**:
- ✅ Lançamento do browser
- ✅ Navegação para Google
- ✅ Navegação para site com JavaScript (Kabum)
- ✅ Extração de elementos DOM
- ✅ Captura de screenshot

**Resultado esperado**: Todos os 4 testes devem passar.

---

### 2. **diagnose-puppeteer.sh**
Script de diagnóstico automático do ambiente VPS.

**Uso**:
```bash
chmod +x diagnose-puppeteer.sh
./diagnose-puppeteer.sh
```

**O que verifica**:
- ✅ Chromium instalado e versão
- ✅ Node.js versão adequada
- ✅ Dependências críticas
- ✅ Tamanho do /dev/shm
- ✅ Memória disponível
- ✅ Swap configurado
- ✅ Variáveis de ambiente (.env.production)
- ✅ Status do PM2
- ✅ Logs recentes
- ✅ Permissões de arquivos

**Resultado**: Relatório detalhado com problemas encontrados e soluções.

---

## 🚀 Uso Rápido

### Primeiro Uso (Nova VPS)

```bash
# 1. Instalar Chromium e dependências
sudo apt update
sudo apt install -y chromium-browser libgbm1 libnss3 libxss1

# 2. Configurar .env.production
echo "VPS_MODE=true" >> .env.production
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env.production
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> .env.production

# 3. Executar diagnóstico
./diagnose-puppeteer.sh

# 4. Executar teste
node test-puppeteer-vps.js
```

### Troubleshooting

Se o teste falhar:

```bash
# 1. Executar diagnóstico
./diagnose-puppeteer.sh > diagnostico.txt

# 2. Ver logs
pm2 logs mtw-backend | grep -i puppeteer

# 3. Consultar guia de correção
# docs/FIX_PUPPETEER_VPS.md
```

---

## 📚 Documentação Relacionada

- **Setup Completo VPS**: `docs/VPS_SETUP_COMPLETO.md`
- **Correção Puppeteer**: `docs/FIX_PUPPETEER_VPS.md`
- **Solução Rápida**: `docs/QUICK_FIX_PUPPETEER.md`
- **Configuração de Captura**: `docs/CONFIGURACAO_CAPTURA.md`
- **Pacote Completo**: `docs/PACOTE_VPS_COMPLETO.md`

---

## 🔧 Outros Scripts Úteis

### Teste de Captura Real

Criar arquivo `test-capture-real.js`:

```javascript
import browserScraper from './src/services/browserScraper.js';

(async () => {
  try {
    console.log('🧪 Testando captura real...\n');
    
    const links = await browserScraper.extractProductLinksWithRetry(
      'https://www.kabum.com.br/ofertas/ofertasdodia',
      ['a.productLink', 'a[href*="/produto/"]'],
      '.pbox',
      2,
      30000
    );
    
    console.log(`✅ ${links.length} produtos encontrados`);
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

---

## 🆘 Problemas Comuns

### Erro: "Could not find Chromium"

```bash
sudo apt install -y chromium-browser
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env.production
pm2 restart mtw-backend
```

### Erro: "Failed to launch browser"

```bash
sudo apt install -y libgbm1 libnss3 libxss1 libatk-bridge2.0-0
pm2 restart mtw-backend
```

### Erro: "Navigation timeout"

```bash
echo "BROWSER_TIMEOUT=90000" >> .env.production
pm2 restart mtw-backend
```

---

**Desenvolvido por**: RDL Tech Solutions  
**Projeto**: PreçoCerto (MTW)  
**Versão**: 1.0.0

# Alternativas para Captura de Produtos da Shopee

## Problema Atual
A Shopee está bloqueando requisições de scraping e redirecionando para `unsupported.html`.

## Soluções Disponíveis

### 1. **API Oficial da Shopee (RECOMENDADO)** ✅
**Status:** Já implementado, precisa de configuração

**Como configurar:**
1. Acesse: https://open.shopee.com/
2. Crie uma conta de desenvolvedor
3. Registre sua aplicação
4. Obtenha:
   - Partner ID
   - Partner Key
5. Configure no painel admin em `/settings` > Shopee

**Vantagens:**
- ✅ Dados confiáveis e completos
- ✅ Sem bloqueios
- ✅ Informações de comissão de afiliado
- ✅ Já implementado no código

**Código atual:** `extractShopeeFromAPI()` em `linkAnalyzer.js`

---

### 2. **Puppeteer com Stealth Mode** 🚀
**Status:** Não implementado

**Implementação:**
```javascript
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function scrapeShopeeWithPuppeteer(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Simular navegador real
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Extrair dados
  const data = await page.evaluate(() => {
    return {
      name: document.querySelector('.product-name')?.textContent,
      price: document.querySelector('.price')?.textContent,
      // ... outros campos
    };
  });
  
  await browser.close();
  return data;
}
```

**Vantagens:**
- ✅ Contorna bloqueios de bot
- ✅ Executa JavaScript da página
- ✅ Simula comportamento humano

**Desvantagens:**
- ❌ Mais lento
- ❌ Consome mais recursos
- ❌ Requer Chrome/Chromium instalado

---

### 3. **Melhorar Headers HTTP** 🔧
**Status:** Parcialmente implementado

**Melhorias sugeridas:**
```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://shopee.com.br/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
  // ADICIONAR COOKIES
  'Cookie': 'SPC_F=...; SPC_R_T_ID=...; SPC_T_ID=...'
};
```

**Vantagens:**
- ✅ Rápido
- ✅ Leve
- ✅ Fácil de implementar

**Desvantagens:**
- ❌ Pode não funcionar sempre
- ❌ Shopee pode detectar

---

### 4. **Proxy Rotativo** 🌐
**Status:** Não implementado

**Implementação:**
```javascript
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxies = [
  'http://proxy1.com:8080',
  'http://proxy2.com:8080',
  // ...
];

const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
const agent = new HttpsProxyAgent(randomProxy);

await axios.get(url, { httpsAgent: agent });
```

**Vantagens:**
- ✅ Dificulta bloqueio por IP
- ✅ Permite múltiplas requisições

**Desvantagens:**
- ❌ Requer serviço de proxy pago
- ❌ Mais lento
- ❌ Complexo de manter

---

### 5. **API Não Oficial / Engenharia Reversa** ⚠️
**Status:** Não recomendado

A Shopee tem APIs internas que podem ser acessadas, mas:
- ❌ Viola termos de serviço
- ❌ Pode mudar a qualquer momento
- ❌ Risco de bloqueio permanente

---

## Recomendação Final

### Curto Prazo (IMEDIATO):
1. **Configure a API Oficial da Shopee** 
   - É a solução mais confiável
   - Já está implementada
   - Apenas precisa de credenciais

### Médio Prazo:
2. **Implementar Puppeteer com Stealth** como fallback
   - Para quando a API não estiver disponível
   - Para produtos sem oferta de afiliado

### Longo Prazo:
3. **Melhorar headers e adicionar cookies**
   - Como última opção de fallback
   - Manter atualizado conforme Shopee muda

---

## Próximos Passos

1. ✅ Obter credenciais da API Shopee
2. ✅ Configurar no painel admin
3. ⏳ Testar extração com API
4. ⏳ (Opcional) Implementar Puppeteer como fallback

---

## Links Úteis

- **Shopee Open Platform:** https://open.shopee.com/
- **Documentação API:** https://open.shopee.com/documents
- **Puppeteer Stealth:** https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth

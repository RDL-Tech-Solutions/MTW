import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../../config/logger.js';
import meliAuth from './meliAuth.js';
import linkAnalyzer from '../linkAnalyzer.js'; // Reaproveitar helper de parsePrice
import Coupon from '../../models/Coupon.js';
import categoryDetector from '../categoryDetector.js';
import AppSettings from '../../models/AppSettings.js';
import CouponValidator from '../../utils/couponValidator.js';
import SyncConfig from '../../models/SyncConfig.js';
import browserPool from '../../utils/browserPool.js';
import browserScraper from '../browserScraper.js';

class MeliSync {
  /**
   * Buscar produtos do Mercado Livre baseado em palavras-chave
   */
  async fetchMeliProducts(keywords, limit = 50, options = {}) {
    try {
      const searchTerms = keywords.split(',').map(k => k.trim()).filter(k => k);
      const allProducts = [];

      const { forceScraping = false } = options;

      // Verificar se autenticação está configurada
      if (!meliAuth.isConfigured()) {
        logger.warn('⚠️ Credenciais do Mercado Livre não configuradas, usando API pública limitada');
      }

      for (const term of searchTerms) {
        logger.info(`🔍 Buscando no Mercado Livre: "${term}"`);
        let products = [];

        try {
          // Configurar headers (com ou sem token)
          const headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Referer': 'https://www.google.com/',
            'Connection': 'keep-alive'
          };


          // Se tiver credenciais, tentar usar token para aumentar limites/evitar 403
          if (meliAuth.isConfigured()) {
            try {
              const token = await meliAuth.getAccessToken();
              headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
              logger.warn('⚠️ Falha ao obter token para busca, seguindo sem auth');
            }
          }

          // Tentar API (se não for forçado scraping)
          // IMPORTANTE: Enviar access token em TODAS as chamadas (mesmo públicas) conforme recomendação de segurança

          let usedApi = false;

          if (!forceScraping) {
            try {
              // Sempre tentar obter token se disponível (recomendação de segurança)
              if (meliAuth.isConfigured() && !headers['Authorization']) {
                try {
                  const token = await meliAuth.getAccessToken();
                  headers['Authorization'] = `Bearer ${token}`;
                } catch (e) {
                  logger.debug('⚠️ Token não disponível para busca pública, continuando sem auth');
                }
              }

              const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
                params: {
                  q: term,
                  limit: Math.min(limit, 50),
                  offset: 0
                },
                headers,
                timeout: 10000
              });

              // Validação robusta da resposta da API
              if (response.data && Array.isArray(response.data.results) && response.data.results.length > 0) {
                products = response.data.results;
                logger.info(`   ✅ (API) ${products.length} resultados para "${term}"`);
                usedApi = true;
              } else if (response.data && !response.data.results) {
                logger.warn(`   ⚠️ Resposta da API em formato inesperado - sem campo 'results'`);
              }
            } catch (apiError) {
              const status = apiError.response?.status;
              const errorData = apiError.response?.data;

              // Tratamento detalhado de erro 403 conforme documentação
              if (status === 403) {
                const errorCode = errorData?.code || errorData?.error;
                const errorMessage = errorData?.message || apiError.message;

                // Se não temos credenciais configuradas, 403 é esperado
                if (!meliAuth.isConfigured()) {
                  logger.info(`   ℹ️ API retornou 403 (esperado sem credenciais). Usando scraping como alternativa...`);
                } else {
                  logger.warn(`   ⚠️ Erro 403 na busca: ${errorMessage}`);
                  logger.warn(`   💡 Verifique: scopes, IPs permitidos, aplicação ativa, usuário validado`);
                }
              } else if (status === 401) {
                logger.warn(`   ⚠️ Token expirado/inválido. Tentando renovar...`);
                // Tentar renovar token e continuar
                try {
                  const token = await meliAuth.getAccessToken();
                  headers['Authorization'] = `Bearer ${token}`;
                  // Não retentar automaticamente aqui para evitar loop
                } catch (e) {
                  logger.info(`   ℹ️ Não foi possível renovar token. Usando scraping como alternativa...`);
                }
              } else {
                logger.info(`   ℹ️ API não disponível (${status || 'erro'}). Usando scraping como alternativa...`);
              }
            }
          }

          if (!usedApi) {
            // Se API retornar vazio, falhar, ou scraping for forçado
            if (forceScraping) logger.info('   🕷️ Modo Scraping forçado para capturar cupons.');
            products = await this.scrapeSearchPage(term);

            // Se cheerio scraping retornou vazio (comum em VPS - JS rendering), tentar Puppeteer
            if (products.length === 0) {
              logger.info(`   🔄 Cheerio retornou 0 resultados. Tentando Puppeteer (JS rendering)...`);
              products = await this.scrapeSearchPagePuppeteer(term);
            }
          }
        } catch (error) {
          // Catch geral do loop
        }

        if (products.length > 0) {
          allProducts.push(...products);
        }

        // Aguardar 1s entre requisições
        if (searchTerms.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`✅ ${allProducts.length} produtos encontrados no Mercado Livre`);
      return allProducts;
    } catch (error) {
      logger.error(`❌ Erro geral ao buscar produtos no Mercado Livre: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scraping da página de busca (Fallback quando API falha)
   */
  async scrapeSearchPage(term) {
    try {
      // Formatar termo para URL (ex: "iphone 13" -> "iphone-13")
      const formattedTerm = term.replace(/\s+/g, '-');
      const url = `https://lista.mercadolivre.com.br/${formattedTerm}`;

      logger.info(`   🕷️ Scraping URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Tentar layout Clássico
      $('.ui-search-layout__item').each((i, el) => {
        if (results.length >= 50) return false;
        try {
          const container = $(el);
          const link = container.find('a.ui-search-link').attr('href');
          if (!link) return;

          let id = '';
          const matchId = link.match(/MLB-?(\d+)/i);
          if (matchId) id = 'MLB' + matchId[1];
          else return;

          const title = container.find('.ui-search-item__title').text().trim();

          // Imagem (Tentar múltiplos seletores e atributos lazy load)
          let thumbnail = null;
          const imgElement = container.find('img.ui-search-result-image__element').first();

          // Tentar atributos em ordem de preferência
          const imgAttrs = ['data-src', 'data-lazy', 'data-original', 'src'];
          for (const attr of imgAttrs) {
            const val = imgElement.attr(attr);
            if (val && !val.includes('data:image') && val.startsWith('http')) {
              thumbnail = val;
              break;
            }
          }

          // Fallback: tentar outros seletores de imagem
          if (!thumbnail) {
            const altImgSelectors = [
              'img[decoding="async"]',
              '.ui-search-result-image img',
              'img'
            ];
            for (const sel of altImgSelectors) {
              const img = container.find(sel).first();
              for (const attr of imgAttrs) {
                const val = img.attr(attr);
                if (val && !val.includes('data:image') && val.startsWith('http')) {
                  thumbnail = val;
                  break;
                }
              }
              if (thumbnail) break;
            }
          }

          // Último fallback: converter thumbnail pequeno para tamanho maior
          if (thumbnail && thumbnail.includes('-I.jpg')) {
            thumbnail = thumbnail.replace('-I.jpg', '-O.jpg');
          }

          // Preço Atual - Múltiplos seletores para maior precisão
          let price = 0;
          const currentPriceSelectors = [
            '.ui-search-price__second-line .andes-money-amount__fraction',
            '.ui-search-price__part--medium .andes-money-amount__fraction',
            '.andes-money-amount--cents-superscript .andes-money-amount__fraction',
            '.price-tag-fraction',
            '.andes-money-amount__fraction'
          ];

          for (const sel of currentPriceSelectors) {
            const priceText = container.find(sel).first().text();
            if (priceText) {
              price = linkAnalyzer.parsePrice(priceText);
              if (price > 0) break;
            }
          }

          // Preço Original - Seletores expandidos e melhorados
          let originalPrice = 0;
          const originalSelectors = [
            // Seletores específicos para preço riscado
            '.ui-search-price__original-value .andes-money-amount__fraction',
            '.ui-search-price__second-line--strikethrough .andes-money-amount__fraction',
            's .andes-money-amount__fraction',  // Tag <s> indica preço riscado
            'del .andes-money-amount__fraction', // Tag <del> também indica preço riscado
            '.andes-money-amount--previous .andes-money-amount__fraction',
            '.ui-search-price__part--original .andes-money-amount__fraction',
            '.ui-search-price__original .andes-money-amount__fraction',
            // Fallback: procurar qualquer preço riscado
            's.andes-money-amount',
            'del.andes-money-amount'
          ];

          for (const sel of originalSelectors) {
            const element = container.find(sel).first();
            if (element.length > 0) {
              // Se for tag s ou del, pegar o texto completo
              const val = sel.startsWith('s') || sel.startsWith('del')
                ? element.text()
                : element.text();

              if (val) {
                const parsed = linkAnalyzer.parsePrice(val);
                if (parsed > 0 && parsed > price) { // Validar que original > atual
                  originalPrice = parsed;
                  break;
                }
              }
            }
          }

          // Validação adicional: se original_price <= price, ignorar
          if (originalPrice > 0 && originalPrice <= price) {
            originalPrice = 0;
          }

          // Verificar Cupom na Busca (Classico)
          let coupon = null;
          const couponElement = container.find('.ui-search-item__coupon').first();

          if (couponElement.length > 0) {
            const couponText = couponElement.text().trim();
            const couponValue = linkAnalyzer.parsePrice(couponText);

            // Tentar extrair código (mínimo 4 caracteres, alfanumérico)
            const codeMatch = couponText.match(/CUPOM\s*:?\s*([A-Z0-9\-_]{4,20})/i);

            if (couponValue > 0 && codeMatch) {
              const code = codeMatch[1].toUpperCase();
              // Validar se é um código válido
              if (this.isValidCouponCode(code)) {
                coupon = {
                  discount_value: couponValue,
                  discount_type: 'fixed',
                  code: code,
                  platform: 'mercadolivre'
                };
              }
            }
          } else {
            // Tentar texto solto de 'CUPOM' 
            const allText = container.text();
            // Regex mais estrita para pegar código: CUPOM [CODE]
            const codeMatch = allText.match(/CUPOM\s+([A-Z0-9\-_]{4,15})\s+R\$/i) ||
              allText.match(/CUPOM\s*:?\s*([A-Z0-9\-_]{4,15})/i);

            if (codeMatch) {
              const potentialCode = codeMatch[1];
              if (this.isValidCouponCode(potentialCode)) {
                const couponMatch = allText.match(/R\$\s*([\d.,]+)/);
                const val = couponMatch ? linkAnalyzer.parsePrice(couponMatch[1]) : 0;

                if (val > 0) {
                  coupon = {
                    discount_value: val,
                    discount_type: 'fixed',
                    code: potentialCode.toUpperCase(),
                    platform: 'mercadolivre'
                  };
                }
              }
            }
          }

          if (price > 0) {
            results.push({
              id,
              title,
              permalink: link,
              thumbnail,
              price,
              original_price: originalPrice > price ? originalPrice : null,
              available_quantity: 1,
              coupon: coupon
            });
          }
        } catch (e) { }
      });

      // Se não achou nada, tentar layout Novo (Poly)
      if (results.length === 0) {
        $('.poly-card').each((i, el) => {
          if (results.length >= 50) return false;
          try {
            const container = $(el);
            const link = container.find('a.poly-component__title').attr('href') || container.find('a').attr('href');
            if (!link) return;

            let id = '';
            const matchId = link.match(/MLB-?(\d+)/i);
            if (matchId) id = 'MLB' + matchId[1];

            const title = container.find('.poly-component__title').text().trim();

            // Imagem (Tentar múltiplos seletores e atributos lazy load para layout Poly)
            let thumbnail = null;
            const imgSelectors = [
              'img.poly-component__image',
              'img.poly-card__img',
              'img[data-src]',
              'img'
            ];
            const imgAttrs = ['data-src', 'data-lazy', 'data-original', 'src'];

            for (const sel of imgSelectors) {
              const img = container.find(sel).first();
              for (const attr of imgAttrs) {
                const val = img.attr(attr);
                if (val && !val.includes('data:image') && val.startsWith('http')) {
                  thumbnail = val;
                  break;
                }
              }
              if (thumbnail) break;
            }

            // Converter thumbnail pequeno para tamanho maior se possível
            if (thumbnail && thumbnail.includes('-I.jpg')) {
              thumbnail = thumbnail.replace('-I.jpg', '-O.jpg');
            }

            // Preço Atual - Layout Poly com múltiplos seletores
            let price = 0;
            const currentPriceSelectors = [
              '.poly-price__current .andes-money-amount__fraction',
              '.poly-component__price .andes-money-amount__fraction',
              '.andes-money-amount--cents-superscript .andes-money-amount__fraction',
              '.andes-money-amount__fraction'
            ];

            for (const sel of currentPriceSelectors) {
              const priceText = container.find(sel).first().text();
              if (priceText) {
                price = linkAnalyzer.parsePrice(priceText);
                if (price > 0) break;
              }
            }

            // Preço Original - Layout Poly com seletores expandidos
            let originalPrice = 0;
            const originalSelectors = [
              '.poly-price__original-value .andes-money-amount__fraction',
              '.poly-price__original .andes-money-amount__fraction',
              '.andes-money-amount--previous .andes-money-amount__fraction',
              's .andes-money-amount__fraction',
              'del .andes-money-amount__fraction',
              's.andes-money-amount',
              'del.andes-money-amount'
            ];

            for (const sel of originalSelectors) {
              const element = container.find(sel).first();
              if (element.length > 0) {
                const val = sel.startsWith('s') || sel.startsWith('del')
                  ? element.text()
                  : element.text();

                if (val) {
                  const parsed = linkAnalyzer.parsePrice(val);
                  if (parsed > 0 && parsed > price) {
                    originalPrice = parsed;
                    break;
                  }
                }
              }
            }

            // Validação: se original_price <= price, ignorar
            if (originalPrice > 0 && originalPrice <= price) {
              originalPrice = 0;
            }

            // Verificar Cupom na Busca (Poly)
            let coupon = null;
            const polyCoupon = container.find('.poly-component__coupon').first();

            if (polyCoupon.length > 0) {
              const couponText = polyCoupon.text().trim();
              const couponValue = linkAnalyzer.parsePrice(couponText);

              // Tentar extrair código (mínimo 4 caracteres)
              const codeMatch = couponText.match(/CUPOM\s*:?\s*([A-Z0-9\-_]{4,20})/i);

              if (couponValue > 0 && codeMatch) {
                const code = codeMatch[1].toUpperCase();
                // Validar se é um código válido
                if (this.isValidCouponCode(code)) {
                  coupon = {
                    discount_value: couponValue,
                    discount_type: 'fixed',
                    code: code,
                    platform: 'mercadolivre'
                  };
                }
              }
            } else {
              // Tentar texto solto de 'CUPOM' no container
              const allText = container.text();
              // Regex mais estrita para pegar código: CUPOM [CODE]
              // Regex mais estrita para pegar código: CUPOM [CODE]
              const codeMatch = allText.match(/CUPOM\s+([A-Z0-9\-_]{4,15})\s+R\$/i) ||
                allText.match(/CUPOM\s*:?\s*([A-Z0-9\-_]{4,15})/i);

              if (codeMatch) {
                const potentialCode = codeMatch[1];
                // Validar código antes de usar
                if (this.isValidCouponCode(potentialCode)) {
                  const couponMatch = allText.match(/R\$\s*([\d.,]+)/);
                  const val = couponMatch ? linkAnalyzer.parsePrice(couponMatch[1]) : 0;

                  if (val > 0) {
                    coupon = {
                      discount_value: val,
                      discount_type: 'fixed',
                      code: potentialCode.toUpperCase(),
                      platform: 'mercadolivre'
                    };
                  }
                }
              }
            }

            if (price > 0 && id) {
              results.push({
                id,
                title,
                permalink: link,
                thumbnail,
                price,
                original_price: originalPrice > price ? originalPrice : null,
                available_quantity: 1,
                coupon: coupon
              });
            }
          } catch (e) { }
        });
      }

      logger.info(`   ✅ (Scraping) ${results.length} resultados encontrados.`);
      return results;

    } catch (error) {
      logger.error(`   ❌ Falha no scraping: ${error.message}`);
      return [];
    }
  }

  /**
   * Scraping via Puppeteer (Fallback de 3º nível - para VPS com JS rendering)
   * Usa browserScraper com stealth plugin (mesmo padrão do kabumSync que funciona na VPS)
   */
  async scrapeSearchPagePuppeteer(term) {
    const MAX_RETRIES = 3;
    const formattedTerm = term.replace(/\s+/g, '-');
    const url = `https://lista.mercadolivre.com.br/${formattedTerm}`;

    logger.info(`   🎭 Puppeteer Scraping ML: ${url}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`   🔄 Tentativa ${attempt}/${MAX_RETRIES}`);

        const results = await browserScraper.pool.withPage(async (page) => {
          // 1. Navegar (networkidle2 = mesmo padrão do Kabum)
          logger.info(`   🌐 Navegando para: ${url}`);
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 45000
          });

          // 2. Detectar Cloudflare / challenge (mesmo padrão do Kabum)
          const isChallenge = await page.evaluate(() => {
            return document.title.includes('Just a moment') ||
              document.body.textContent.includes('Checking your browser') ||
              document.body.textContent.includes('Cloudflare') ||
              document.body.textContent.includes('Verificando') ||
              document.body.textContent.includes('captcha');
          });

          if (isChallenge) {
            logger.warn(`   ☁️ Challenge/Cloudflare detectado! Aguardando bypass automático...`);
            await page.waitForSelector('.ui-search-layout__item, .poly-card', { timeout: 30000 }).catch(() => {
              logger.warn(`   ⚠️ Timeout aguardando bypass de challenge`);
            });
          }

          // 3. Aguardar seletor de produtos (com fallback)
          const waitSelectors = [
            '.ui-search-layout__item',
            '.poly-card',
            '.ui-search-result__wrapper',
            'section.ui-search-results'
          ];

          let selectorFound = false;
          for (const sel of waitSelectors) {
            try {
              logger.info(`   ⏳ Aguardando elementos carregar (${sel})...`);
              await page.waitForSelector(sel, { timeout: 15000 });
              logger.info(`   ✅ Elementos carregados com seletor: ${sel}`);
              selectorFound = true;
              break;
            } catch (e) {
              logger.debug(`   ⚠️ Seletor '${sel}' não encontrado, tentando próximo...`);
            }
          }

          if (!selectorFound) {
            // Debug info para diagnóstico
            const debugInfo = await page.evaluate(() => ({
              title: document.title,
              url: location.href,
              bodyLen: document.body.innerHTML.length,
              text: document.body.innerText.substring(0, 200)
            }));
            logger.warn(`   ⚠️ Nenhum seletor de produto encontrado`);
            logger.warn(`   📌 Título: ${debugInfo.title} | URL: ${debugInfo.url} | HTML: ${debugInfo.bodyLen} bytes`);
            logger.warn(`   📌 Texto: ${debugInfo.text.substring(0, 120)}`);
            throw new Error('Nenhum produto encontrado - DOM pode não ter carregado');
          }

          // 4. Verificar DOM ready (mesmo padrão do Kabum)
          const domReady = await page.evaluate(() => document.readyState === 'complete');
          if (!domReady) {
            logger.warn(`   ⚠️ DOM não está completo, aguardando mais...`);
            await new Promise(r => setTimeout(r, 3000));
          }

          // 5. Scroll para carregar lazy loading (mesmo padrão do Kabum)
          logger.debug(`   📜 Fazendo scroll para carregar lazy loading...`);
          await page.evaluate(() => { window.scrollBy(0, window.innerHeight * 2); });
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.evaluate(() => { window.scrollBy(0, window.innerHeight); });
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 6. Extrair dados dos produtos
          const items = await page.evaluate(() => {
            const products = [];
            const parsePrice = (text) => {
              if (!text) return 0;
              const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
              return parseFloat(cleaned) || 0;
            };

            const containers = document.querySelectorAll(
              '.ui-search-layout__item, .poly-card, .ui-search-result__wrapper'
            );

            containers.forEach((container) => {
              if (products.length >= 50) return;
              try {
                const linkEl = container.querySelector(
                  'a.ui-search-link, a.poly-component__title, a.ui-search-item__group__element, a[href*="MLB"]'
                );
                const link = linkEl?.href;
                if (!link) return;

                const matchId = link.match(/MLB-?(\d+)/i);
                if (!matchId) return;
                const id = 'MLB' + matchId[1];

                const titleEl = container.querySelector(
                  '.ui-search-item__title, .poly-component__title, h2'
                );
                const title = titleEl?.textContent?.trim();
                if (!title) return;

                let thumbnail = null;
                const imgs = container.querySelectorAll('img');
                for (const img of imgs) {
                  const src = img.getAttribute('src') || img.getAttribute('data-src')
                    || img.getAttribute('data-lazy') || img.getAttribute('data-original');
                  if (src && src.startsWith('http') && !src.includes('data:image')) {
                    thumbnail = src;
                    break;
                  }
                }
                if (thumbnail && thumbnail.includes('-I.jpg')) {
                  thumbnail = thumbnail.replace('-I.jpg', '-O.jpg');
                }

                const priceSelectors = [
                  '.ui-search-price__second-line .andes-money-amount__fraction',
                  '.poly-price__current .andes-money-amount__fraction',
                  '.andes-money-amount--cents-superscript .andes-money-amount__fraction',
                  '.andes-money-amount__fraction'
                ];
                let price = 0;
                for (const sel of priceSelectors) {
                  const el = container.querySelector(sel);
                  if (el) { price = parsePrice(el.textContent); if (price > 0) break; }
                }

                const origSelectors = [
                  '.ui-search-price__original-value .andes-money-amount__fraction',
                  '.poly-price__original-value .andes-money-amount__fraction',
                  's .andes-money-amount__fraction',
                  'del .andes-money-amount__fraction'
                ];
                let originalPrice = 0;
                for (const sel of origSelectors) {
                  const el = container.querySelector(sel);
                  if (el) {
                    const parsed = parsePrice(el.textContent);
                    if (parsed > 0 && parsed > price) { originalPrice = parsed; break; }
                  }
                }

                let coupon = null;
                const couponEl = container.querySelector('.ui-search-item__coupon, .poly-component__coupon');
                if (couponEl) {
                  const couponText = couponEl.textContent.trim();
                  const codeMatch = couponText.match(/CUPOM\s*:?\s*([A-Z0-9\-_]{4,20})/i);
                  const valMatch = couponText.match(/R\$\s*([\d.,]+)/);
                  if (codeMatch && valMatch) {
                    coupon = {
                      code: codeMatch[1].toUpperCase(),
                      discount_value: parsePrice(valMatch[1]),
                      discount_type: 'fixed',
                      platform: 'mercadolivre'
                    };
                  }
                }

                if (price > 0) {
                  products.push({
                    id, title, permalink: link, thumbnail, price,
                    original_price: originalPrice > price ? originalPrice : null,
                    available_quantity: 1, coupon
                  });
                }
              } catch (e) { /* ignorar item com erro */ }
            });

            return products;
          });

          logger.info(`   📊 Puppeteer extraiu ${items.length} produtos da página`);
          return items;
        });

        // Se capturou produtos, retornar
        if (results && results.length > 0) {
          logger.info(`   ✅ (Puppeteer) ${results.length} resultados encontrados na tentativa ${attempt}.`);
          return results;
        }

        throw new Error('Nenhum produto capturado - DOM pode não ter carregado');

      } catch (error) {
        logger.warn(`   ⚠️ Tentativa ${attempt}/${MAX_RETRIES} falhou: ${error.message}`);
        if (attempt < MAX_RETRIES) {
          const waitTime = attempt * 3000;
          logger.info(`   ⏳ Aguardando ${waitTime / 1000}s antes da próxima tentativa...`);
          await new Promise(r => setTimeout(r, waitTime));
        }
      }
    }

    logger.error(`   ❌ Puppeteer ML: Todas as ${MAX_RETRIES} tentativas falharam.`);
    return [];
  }

  /**
   * Validar se um código de cupom é válido
   * @param {string} code - Código do cupom a ser validado
   * @returns {boolean} - true se o código for válido
   */
  isValidCouponCode(code) {
    if (!code || typeof code !== 'string') return false;

    // Usar validador centralizado para consistência
    const validation = CouponValidator.validateCode(code);

    if (!validation.valid) return false;

    // Verificação adicional de "letras e números" para evitar specs técnicas que passaram pelo validador
    const hasLetter = /[A-Z]/i.test(code);
    const hasNumber = /[0-9]/.test(code);

    // Se tiver só letras ou só números, geralmente éspec técnica ou genérico (exceto se for fallback)
    if (!validation.isFallback && !(hasLetter && hasNumber)) {
      return false;
    }

    return true;
  }

  /**
   * Validar e melhorar URL da imagem
   */
  improveImageUrl(imageUrl) {
    if (!imageUrl) return null;

    // Se for placeholder (data:image), retornar null
    if (imageUrl.includes('data:image')) {
      return null;
    }

    // Se não começar com http, retornar null
    if (!imageUrl.startsWith('http')) {
      return null;
    }

    // Converter thumbnail do ML para tamanho maior
    // Padrão ML: -I.jpg (pequeno) -> -O.jpg (original/grande)
    let improvedUrl = imageUrl;
    if (improvedUrl.includes('-I.jpg')) {
      improvedUrl = improvedUrl.replace('-I.jpg', '-O.jpg');
    }

    // Garantir HTTPS
    if (improvedUrl.startsWith('http://')) {
      improvedUrl = improvedUrl.replace('http://', 'https://');
    }

    return improvedUrl;
  }

  /**
   * Filtrar produtos que realmente são promoções
   */
  async filterMeliPromotions(products, minDiscountPercentage = 10) {
    const promotions = [];

    for (const product of products) {
      // Verificar se tem preço original e desconto
      const currentPrice = product.price;
      const originalPrice = product.original_price;

      // Se tiver cupom, consideramos promoção mesmo se não tiver "original price" (riscado)
      const hasCoupon = !!product.coupon;

      if (!hasCoupon && (!originalPrice || originalPrice <= currentPrice)) {
        continue; // Não é uma promoção real (sem desconto nem cupom)
      }

      // Calcular desconto
      let discount = 0;
      if (originalPrice > currentPrice) {
        discount = ((originalPrice - currentPrice) / originalPrice) * 100;
      }

      // Melhorar URL da imagem
      let imageUrl = this.improveImageUrl(product.thumbnail);

      // Se não conseguiu imagem válida, tentar buscar via API do item
      if (!imageUrl && product.id) {
        logger.warn(`⚠️ Produto ${product.id} sem imagem válida, será necessário buscar via API`);
        // Usamos um placeholder temporário - será substituído quando buscar detalhes
        imageUrl = `https://http2.mlstatic.com/D_NQ_NP_${product.id}-O.jpg`;
      }

      if (discount >= minDiscountPercentage || hasCoupon) {
        // Usar link original do produto (não transformar)
        const originalLink = product.permalink || '';

        promotions.push({
          external_id: `mercadolivre-${product.id}`,
          name: product.title,
          image_url: imageUrl || 'https://via.placeholder.com/300x300?text=Sem+Imagem',
          platform: 'mercadolivre',
          current_price: currentPrice,
          old_price: originalPrice || 0, // Garantir 0 se null
          discount_percentage: Math.round(discount),
          affiliate_link: originalLink, // Usar link original do produto
          stock_available: product.available_quantity > 0,
          coupon: product.coupon,
          raw_data: product
        });
      }
    }

    logger.info(`🎯 ${promotions.length} promoções válidas encontradas (desconto ≥ ${minDiscountPercentage}%)`);
    return promotions;
  }

  /**
   * Extrair ID MLB- de um link do Mercado Livre
   * Ignora links com parâmetros de rastreamento proibidos
   * @param {string} link - Link do Mercado Livre
   * @returns {string|null} - ID no formato MLB-XXXXXXXXXX ou null se não encontrar
   */
  extractMeliProductId(link) {
    if (!link || typeof link !== 'string') return null;

    // Ignorar links com parâmetros proibidos
    const forbiddenPatterns = [
      /\/jm\/mlb/i,
      /meuid=/i,
      /redirect=/i,
      /tracking_id=/i,
      /reco_/i,
      /[?&]c_id/i,
      /[?&]c_uid/i,
      /[?&]sid/i,
      /[?&]wid/i
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(link)) {
        logger.debug(`⚠️ Link ignorado por conter parâmetro proibido: ${link.substring(0, 100)}`);
        return null;
      }
    }

    // Extrair ID MLB- do link
    // Padrões aceitos:
    // - MLB-1234567890
    // - /MLB-1234567890
    // - produto.mercadolivre.com.br/MLB-1234567890
    // - /MLB1234567890 (sem hífen)
    const idPatterns = [
      /MLB-(\d+)/i,           // MLB-1234567890
      /\/MLB-(\d+)/i,         // /MLB-1234567890
      /MLB(\d{8,})/i          // MLB1234567890 (sem hífen, mínimo 8 dígitos)
    ];

    for (const pattern of idPatterns) {
      const match = link.match(pattern);
      if (match) {
        const id = match[1] || match[0].replace(/MLB-?/i, '');
        if (id && id.length >= 8) {
          return `MLB-${id}`;
        }
      }
    }

    return null;
  }

  /**
   * Gerar link de afiliado limpo do Mercado Livre
   * Formato: https://produto.mercadolivre.com.br/MLB-XXXXXXXXXX?matt_word=IDAFILIADO
   * 
   * Regras:
   * - Ignora links com parâmetros de rastreamento (/jm/mlb, meuid=, redirect=, etc)
   * - Extrai apenas o ID MLB- do produto
   * - Gera sempre um link limpo com matt_word
   * - Se não encontrar ID MLB-, descarta o link
   */
  async generateMeliAffiliateLink(product) {
    try {
      // Buscar affiliate code do banco de dados primeiro
      let affiliateCode = '';
      try {
        const AppSettings = (await import('../../models/AppSettings.js')).default;
        const config = await AppSettings.getMeliConfig();
        affiliateCode = config.affiliateCode || '';
      } catch (error) {
        logger.warn(`⚠️ Erro ao buscar affiliate code do banco: ${error.message}`);
        affiliateCode = process.env.MELI_AFFILIATE_CODE || '';
      }

      let productId = null;

      // Tentar extrair ID do link original
      const originalLink = product.affiliate_link || product.link || '';

      // Se já tiver um link meli.la (novo formato de afiliado), retorná-lo diretamente
      if (originalLink && originalLink.includes('meli.la')) {
        logger.info(`✅ Link meli.la já existente preservado: ${originalLink}`);
        return originalLink;
      }

      if (originalLink) {
        productId = this.extractMeliProductId(originalLink);
        if (productId) {
          logger.debug(`✅ ID extraído do link: ${productId}`);
        }
      }

      // Se não encontrou no link, tentar do external_id
      if (!productId && product.external_id) {
        const externalId = product.external_id.toString();
        // Formato: mercadolivre-MLB1234567890 ou MLB1234567890
        const match = externalId.match(/MLB-?(\d+)/i) || externalId.match(/(\d{8,})/);
        if (match) {
          const id = match[1] || match[0];
          if (id && id.length >= 8) {
            productId = `MLB-${id}`;
            logger.debug(`✅ ID extraído do external_id: ${productId}`);
          }
        }
      }

      // Se ainda não encontrou, descartar
      if (!productId) {
        logger.warn(`⚠️ Não foi possível extrair ID MLB- do produto: ${product.name || 'desconhecido'}`);
        return '';
      }

      // Gerar link limpo no formato oficial
      // Sempre usar o formato: https://produto.mercadolivre.com.br/MLB-XXXXXXXXXX?matt_word=IDAFILIADO
      const cleanLink = `https://produto.mercadolivre.com.br/${productId}`;

      // Se tiver código de afiliado, adicionar matt_word
      if (affiliateCode && affiliateCode.trim()) {
        const affiliateLink = `${cleanLink}?matt_word=${encodeURIComponent(affiliateCode.trim())}`;
        logger.info(`✅ Link de afiliado limpo gerado: ${affiliateLink} para ${product.name || 'produto'}`);
        return affiliateLink;
      }

      // Sem código de afiliado, retornar link limpo sem parâmetros
      // Mas ainda no formato correto: https://produto.mercadolivre.com.br/MLB-XXXXXXXXXX
      logger.info(`ℹ️ Link limpo gerado (sem código de afiliado): ${cleanLink}`);
      return cleanLink;
    } catch (error) {
      logger.error(`❌ Erro ao gerar link afiliado ML: ${error.message}`);
      return '';
    }
  }

  /**
   * Buscar imagem de alta qualidade via API do ML
   */
  async fetchHighQualityImage(productId) {
    try {
      const meliId = productId.replace('mercadolivre-', '');
      const response = await axios.get(`https://api.mercadolibre.com/items/${meliId}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const item = response.data;

      // Prioridade: pictures[0].secure_url > pictures[0].url > thumbnail
      if (item.pictures && item.pictures.length > 0) {
        const pic = item.pictures[0];
        return pic.secure_url || pic.url || item.thumbnail;
      }

      return item.thumbnail;
    } catch (error) {
      logger.warn(`⚠️ Não foi possível buscar imagem de alta qualidade para ${productId}`);
      return null;
    }
  }

  /**
   * Salvar produto no banco de dados
   */
  async saveMeliToDatabase(product, Product) {
    try {
      // Verificar se já existe pelo external_id
      const existing = await Product.findByExternalId(product.external_id);

      if (existing) {
        // Preservar link original se já existir e for válido
        // Aceitar links mercadolivre.com E os novos links curtos meli.la
        const hasValidLink = existing.affiliate_link &&
          (existing.affiliate_link.includes('mercadolivre') || existing.affiliate_link.includes('meli.la'));
        if (!hasValidLink) {
          const newAffiliateLink = await this.generateMeliAffiliateLink(product);
          if (newAffiliateLink && newAffiliateLink !== existing.affiliate_link) {
            await Product.update(existing.id, { affiliate_link: newAffiliateLink });
            logger.info(`🔄 Link atualizado: ${product.name}`);
          }
        } else {
          // Se já tem link válido (mercadolivre.com ou meli.la), preservar o original
          logger.debug(`✅ Link original preservado para: ${product.name}`);
        }

        // Se o preço mudou, atualizar
        if (existing.current_price !== product.current_price) {
          await Product.updatePrice(existing.id, product.current_price);
          logger.info(`🔄 Produto atualizado (Preço): ${product.name}`);
          return { product: existing, isNew: true }; // Considerar como "novo" evento para logs
        }

        // Se agora tem cupom e antes não tinha (ou mudou), atualizar/adicionar
        if (product.coupon) {
          try {
            const couponData = {
              ...product.coupon,
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            // Criar novo cupom
            const newCoupon = await Coupon.create(couponData);

            // Atualizar produto vinculando o cupom (mesmo se o preço não mudou, o cupom é novidade)
            // Nota: Se já tinha cupom, vai sobrescrever com o novo (o que é bom, pois é uma nova captura/atualização)
            await Product.update(existing.id, { coupon_id: newCoupon.id });
            logger.info(`   🎟️ Cupom atualizado/adicionado a produto existente: ${product.name}`);
          } catch (couponError) {
            logger.error(`   ❌ Erro ao atualizar cupom em produto existente: ${couponError.message}`);
          }
        }

        logger.info(`📦 Produto já existe: ${product.name}`);
        return { product: existing, isNew: false };
      }

      // Verificar se a imagem é válida, se não, buscar via API
      if (!product.image_url ||
        product.image_url.includes('data:image') ||
        product.image_url.includes('placeholder') ||
        !product.image_url.startsWith('http')) {
        logger.info(`🖼️ Buscando imagem de alta qualidade para: ${product.name}`);
        const highQualityImage = await this.fetchHighQualityImage(product.external_id);
        if (highQualityImage) {
          product.image_url = highQualityImage;
          logger.info(`✅ Imagem de alta qualidade obtida`);
        }
      }

      // Processar Cupom antes de criar
      if (product.coupon) {
        try {
          const couponData = {
            ...product.coupon,
            valid_from: new Date(),
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Validade 7 dias default
          };

          // Criar cupom
          const newCoupon = await Coupon.create(couponData);
          product.coupon_id = newCoupon.id;
          logger.info(`   🎟️ Cupom criado para produto: ${product.coupon.discount_value}`);
        } catch (couponError) {
          logger.error(`   ❌ Erro ao criar cupom: ${couponError.message}`);
          // Segue sem cupom
        }
      }

      // Detectar categoria automaticamente se não tiver
      if (!product.category_id) {
        try {
          const detectedCategory = await categoryDetector.detectWithAI(product.name);
          if (detectedCategory) {
            product.category_id = detectedCategory.id;
            logger.info(`📂 Categoria detectada: ${detectedCategory.name} para ${product.name}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao detectar categoria: ${error.message}`);
        }
      }

      // Preservar link original do produto
      // Prioridade: product.affiliate_link > product.link > product.permalink
      let originalLink = null;
      if (!product.affiliate_link) {
        if (product.link && product.link.includes('mercadolivre')) {
          product.affiliate_link = product.link;
          originalLink = product.link;
        } else if (product.permalink && product.permalink.includes('mercadolivre')) {
          product.affiliate_link = product.permalink;
          originalLink = product.permalink;
        } else {
          // Fallback: tentar gerar um link limpo apenas se não tiver nenhum link válido
          const generatedLink = await this.generateMeliAffiliateLink(product);
          if (generatedLink) {
            product.affiliate_link = generatedLink;
            originalLink = generatedLink;
          }
        }
      } else {
        // Se já tem affiliate_link, usar como original também
        originalLink = product.affiliate_link;
      }

      // Salvar produto com status 'pending' e original_link
      const newProduct = await Product.create({
        ...product,
        status: 'pending',
        original_link: originalLink
      });
      logger.info(`✅ Novo produto salvo (pendente): ${product.name}`);

      return { product: newProduct, isNew: true };
    } catch (error) {
      logger.error(`❌ Erro ao salvar produto: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executar ciclo completo de sincronização (Sync Interface)
   */
  async sync() {
    try {
      logger.info('🔄 Iniciando Sync Automático: Mercado Livre');
      const config = await SyncConfig.get();

      let keywords = [];
      if (config.keywords) {
        keywords = config.keywords.split(',').map(k => k.trim()).filter(k => k);
      }

      if (keywords.length === 0) keywords = ['smartphone', 'notebook', 'iphone', 'tv 4k', 'playstation 5'];

      const allProducts = await this.fetchMeliProducts(keywords.join(','), 50, { forceScraping: false });
      const promotions = await this.filterMeliPromotions(allProducts, config.min_discount_percentage);

      let newCount = 0;
      const SchedulerService = (await import('./schedulerService.js')).default;

      for (const promo of promotions) {
        try {
          const { product, isNew } = await this.saveMeliToDatabase(promo, Product);
          if (isNew) {
            newCount++;
            if (config.mercadolivre_auto_publish) {
              await SchedulerService.scheduleProduct(product);
              // Marcar como 'approved' para aparecer no app
              try { await Product.update(product.id, { status: 'approved' }); } catch (e) { }
            }
          }
        } catch (err) { }
      }
      logger.info(`✅ Sync ML Finalizado: ${newCount} novos.`);
      return { success: true, newProducts: newCount };
    } catch (error) {
      logger.error(`❌ Erro Sync ML: ${error.message}`);
      throw error;
    }
  }
}

export default new MeliSync();

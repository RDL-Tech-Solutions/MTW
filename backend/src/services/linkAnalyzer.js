import axios from 'axios';
import * as cheerio from 'cheerio';

class LinkAnalyzer {
  // Detectar plataforma pelo link
  detectPlatform(url) {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('shopee.com.br') || urlLower.includes('shp.ee')) {
      return 'shopee';
    }
    if (urlLower.includes('mercadolivre.com') ||
      urlLower.includes('mercadolibre.com') ||
      urlLower.includes('mercadol') ||
      urlLower.includes('mlb') ||
      urlLower.includes('produto.mercadolivre')) {
      return 'mercadolivre';
    }
    if (urlLower.includes('amazon.com.br') || urlLower.includes('amzn.to')) {
      return 'amazon';
    }
    return 'unknown';
  }

  // Seguir redirecionamentos para obter URL final
  async followRedirects(url) {
    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.request.res.responseUrl || url;
    } catch (error) {
      return url;
    }
  }

  // Extrair informações de produto Shopee
  async extractShopeeInfo(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Extrair informações do HTML
      const name = $('meta[property="og:title"]').attr('content') ||
        $('._3g6Hq1').text() ||
        $('title').text();

      const description = $('meta[property="og:description"]').attr('content') ||
        $('._2u0jt9').text();

      const imageUrl = $('meta[property="og:image"]').attr('content') ||
        $('._3-N-Xx img').first().attr('src');

      // Tentar extrair preços
      const priceText = $('._3n5NQx').first().text() ||
        $('._1w9jLI').first().text();
      const currentPrice = this.parsePrice(priceText);

      const oldPriceText = $('._3_FVSo').first().text();
      const oldPrice = this.parsePrice(oldPriceText) || currentPrice;

      return {
        name: this.cleanText(name),
        description: this.cleanText(description),
        imageUrl: imageUrl,
        currentPrice: currentPrice,
        oldPrice: oldPrice,
        platform: 'shopee',
        affiliateLink: url
      };
    } catch (error) {
      console.error('Erro ao extrair info Shopee:', error.message);
      return this.extractBasicInfo(url, 'shopee');
    }
  }

  // Scraping apenas dos preços do Mercado Livre
  async scrapeMeliPrices(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      let currentPrice = 0;
      let oldPrice = 0;

      // Helper para extrair preço completo (inteiro + centavos)
      const extractFullPrice = (container) => {
        const fraction = $(container).find('.andes-money-amount__fraction').text().trim();
        const cents = $(container).find('.andes-money-amount__cents').text().trim();
        if (fraction) {
          return this.parsePrice(`${fraction},${cents || '00'}`);
        }
        return 0;
      };

      '.andes-money-amount--previous' // Classe de preço anterior
      // ESTRATÉGIA: SCAN COMPLETO E FILTRAGEM
      // Em vez de confiar em um único seletor, vamos pegar TODOS os preços da página,
      // classificar o contexto de cada um e decidir qual é o preço real.

      const allPrices = [];

      // Helper para limpar texto
      const hasRestrictedTerms = (text) => /cupom|off|desconto|economize/i.test(text);

      $('.andes-money-amount').each((i, el) => {
        const container = $(el);
        const price = extractFullPrice(container);
        if (price <= 0) return;

        // Contexto
        const parent = container.parent();
        const grandParent = parent.parent();
        const parentText = parent.text();
        const grandParentText = grandParent.text();

        let type = 'candidate'; // default

        // 1. É preço antigo (riscado)?
        if (container.closest('.ui-pdp-price__original-value').length ||
          container.closest('s').length ||
          parent.is('s')) {
          type = 'oldPrice';
        }
        // 2. É parcela?
        else if (container.closest('.ui-pdp-installments__price').length ||
          /\d+x/i.test(parentText) ||
          container.closest('.ui-pdp-price__sub-titles').length) {
          type = 'installment';
        }
        // 3. É Cupom ou Desconto?
        else if (hasRestrictedTerms(parentText) ||
          hasRestrictedTerms(grandParentText) ||
          container.closest('.ui-pdp-coupon').length ||
          container.closest('.andes-money-amount--discount').length) {
          type = 'coupon';
          // Tentar extrair código do cupom se existir no texto
          const codeMatch = parentText.match(/CUPOM\s+([A-Z0-9]+)/i) ||
            grandParentText.match(/CUPOM\s+([A-Z0-9]+)/i);
          if (codeMatch) {
            container.data('couponCode', codeMatch[1]);
          }
        }
        // 4. É um valor muito baixo isolado (provavel erro ou centavos soltos)?
        // (Opcional, mas ajuda a filtrar lixo)

        allPrices.push({
          price,
          type,
          context: parentText.substring(0, 50),
          couponCode: container.data('couponCode')
        });
      });

      console.log('📊 Todos os preços encontrados:', allPrices);

      // Decidir Old Price
      // Pegar o MAIOR valor classificado como 'oldPrice'
      const oldPriceCandidates = allPrices.filter(p => p.type === 'oldPrice').map(p => p.price);
      if (oldPriceCandidates.length > 0) {
        oldPrice = Math.max(...oldPriceCandidates);
      }

      // Decidir Current Price
      // Pegar candidatos válidos
      const validCandidates = allPrices.filter(p => p.type === 'candidate').map(p => p.price);

      if (validCandidates.length > 0) {
        // A lógica aqui é: O preço do produto geralmente é o MAIOR valor encontrado que NÃO é oldPrice.
        // Valores menores costumam ser: valor de parcela mal classificado, valor de desconto (ex: "40 off"), etc.
        // Exceção: Se houver ranges, mas no ML geralmente é um preço único.

        // Filtrar candidatos que sejam iguais ao oldPrice ( redundância )
        const nonOldCandidates = validCandidates.filter(p => p !== oldPrice);

        if (nonOldCandidates.length > 0) {
          currentPrice = Math.max(...nonOldCandidates);
        } else if (validCandidates.length > 0) {
          // Se só sobrou igual ao oldPrice, então current = old (sem desconto)
          currentPrice = Math.max(...validCandidates);
        }
      }

      // Decidir Fallback: JSON-LD e Meta se nada visual for encontrado
      if (!currentPrice) {
        const metaPrice = $('meta[itemprop="price"]').attr('content');
        if (metaPrice) currentPrice = parseFloat(metaPrice);
      }

      // Detecção de Cupom
      let coupon = null;
      const couponCandidate = allPrices.find(p => p.type === 'coupon' && p.price > 0);

      if (couponCandidate) {
        coupon = {
          discount_value: couponCandidate.price,
          discount_type: 'fixed', // Assumindo R$ fixo por enquanto
          code: couponCandidate.couponCode || `MELI-${Math.floor(Math.random() * 10000)}`, // Fallback de código
          platform: 'mercadolivre'
        };
        console.log('   🎟️ Cupom detectado:', coupon);
      }

      console.log('   ✅ Decisão Final - Current:', currentPrice, 'Old:', oldPrice);

      return {
        currentPrice: currentPrice,
        oldPrice: oldPrice > currentPrice ? oldPrice : 0,
        coupon: coupon
      };
    } catch (error) {
      console.error('Erro no scraping de preços:', error.message);
      return { currentPrice: 0, oldPrice: 0, coupon: null };
    }
  }

  // ... (outros métodos) ...

  // Converter texto de preço para número
  parsePrice(priceText) {
    if (!priceText) return 0;

    // Converter para string e limpar espaços
    let text = String(priceText).trim();

    // Se já for numérico mascarado de string ("123.45"), tentar parse direto se não tiver vírgula
    if (!text.includes(',') && !isNaN(parseFloat(text)) && text.includes('.')) {
      // Pode ser formato US, mas no contexto BR é arriscado. 
      // Vamos assumir formato BR (1.000 é mil).
    }

    // Remover "R$" ou outros prefixos
    text = text.replace(/[^\d.,]/g, '');

    // Caso especial: apenas números (ex: "1200") -> 1200
    if (/^\d+$/.test(text)) {
      return parseFloat(text);
    }

    // Caso BRL: "1.200,50" -> remover ponto, trocar virgula por ponto
    // ou "1200,50"
    if (text.includes(',')) {
      // Remove pontos de milhar
      text = text.replace(/\./g, '');
      // Troca vírgula decimal por ponto
      text = text.replace(',', '.');
    } else {
      // Se não tem vírgula, mas tem ponto: "1.200" (mil e duzentos) ou "10.90" (dez e noventa - raro em scraping pt-br puro, mas possível em meta tag)
      // Se tiver apenas 1 ponto e for no final (ex 12.90), pode ser US.
      // Mas no padrão BR, ponto é milhar. Então "1.200" vira 1200.
      // "50.00" vira 5000? Sim, em pt-br. Se for 50 reais, seria 50,00.
      text = text.replace(/\./g, '');
    }

    const price = parseFloat(text);
    return isNaN(price) ? 0 : price;
  }

  // Extrair ID do produto do Mercado Livre da URL
  extractMeliProductId(url) {
    // Padrões: MLB-123456789, MLB123456789, /p/MLB123456789, /item/MLB123456789
    const patterns = [
      /\/p\/MLB-?(\d+)/i,           // /p/MLB123 (catalog)
      /\/item\/MLB-?(\d+)/i,        // /item/MLB123
      /MLB-?(\d+)/i                 // MLB123 em qualquer lugar
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const productId = 'MLB' + match[1];
        console.log(`   🔍 ID extraído da URL (${pattern}):`, productId);
        return productId;
      }
    }
    console.log('   ❌ Nenhum ID encontrado na URL');
    return null;
  }

  // Obter dados do produto via API do Mercado Livre
  async getMeliProductFromAPI(productId) {
    try {
      console.log('🔍 Buscando produto na API do ML:', productId);

      // Tentar como item primeiro
      let response;
      let product;

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      };

      try {
        response = await axios.get(`https://api.mercadolibre.com/items/${productId}`, {
          timeout: 10000,
          headers
        });
        product = response.data;
        console.log('   ✅ Produto encontrado como ITEM');
      } catch (itemError) {
        // Se falhar, tentar como produto de catálogo
        console.log('   ⚠️ Não é um item, tentando como produto de catálogo...');
        response = await axios.get(`https://api.mercadolibre.com/products/${productId}`, {
          timeout: 10000,
          headers
        });
        product = response.data;
        console.log('   ✅ Produto encontrado como CATÁLOGO');

        // Produtos de catálogo têm estrutura diferente
        // Precisamos buscar o buy_box_winner para pegar o preço
        if (product.buy_box_winner) {
          const itemId = product.buy_box_winner.item_id;
          console.log('   🔍 Buscando item vencedor:', itemId);
          const itemResponse = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
            timeout: 10000,
            headers
          });
          product = itemResponse.data;
        }
      }

      // Verificar se há desconto real
      let currentPrice = product.price;
      let oldPrice = 0;

      // original_price só existe se houver desconto
      if (product.original_price && product.original_price > product.price) {
        oldPrice = product.original_price;
      }

      // Se não encontrou desconto, tentar extrair do título
      // Exemplo: "Produto X - R$ 755" ou "Cupom R$ 100 - Produto - R$ 508,43"
      // Se não encontrou desconto, tentar extrair do título
      // Exemplo: "Produto X - R$ 755" ou "Cupom R$ 100 - Produto - R$ 508,43"
      let coupon = null;

      if (oldPrice === 0 && product.title) {
        // Tentar detectar Cupom explícito no título
        const couponMatch = product.title.match(/Cupom\s+(?:de\s+)?R\$\s*([\d.,]+)/i) ||
          product.title.match(/R\$\s*([\d.,]+)\s+OFF/i);

        if (couponMatch) {
          const couponValue = this.parsePrice(couponMatch[1]);
          if (couponValue > 0) {
            coupon = {
              discount_value: couponValue,
              discount_type: 'fixed',
              code: `MELI-${Math.floor(Math.random() * 10000)}`, // Tentar extrair código se possível no futuro
              platform: 'mercadolivre'
            };
            console.log('   🎟️ Cupom detectado no título:', coupon);

            // Se temos cupom, talvez o preço atual já esteja com desconto?
            // Mas vamos manter a lógica de preço original vs atual
          }
        }

        // Buscar todos os preços no título
        const allPrices = product.title.match(/R\$\s*([\d.,]+)/g);
        if (allPrices && allPrices.length > 0) {
          console.log('   💡 Preços encontrados no título:', allPrices);

          // Parsear todos os preços e pegar o MAIOR (que é o preço do produto, não o cupom)
          const parsedPrices = allPrices.map(p => {
            const match = p.match(/R\$\s*([\d.,]+)/);
            return match ? this.parsePrice(match[1]) : 0;
          }).filter(p => p > 0);

          console.log('   💰 Preços parseados:', parsedPrices);

          if (parsedPrices.length > 0) {
            // Pegar o MAIOR preço (produto) ao invés do menor (cupom)
            const extractedPrice = Math.max(...parsedPrices);
            console.log('   🎯 Maior preço (produto):', extractedPrice);

            // Se o preço no título for menor que o price da API, é um desconto
            if (extractedPrice > 0 && extractedPrice < currentPrice) {
              oldPrice = currentPrice;
              currentPrice = extractedPrice;
              console.log('   ✅ Desconto detectado no título!');
              console.log('   📊 Preço Original:', oldPrice, '| Preço com Desconto:', currentPrice);
            } else {
              console.log('   ⚠️ Preço no título não é menor que o da API:', extractedPrice, 'vs', currentPrice);
            }
          }
        }
      }

      // Limpar o preço do título se foi extraído
      let cleanTitle = product.title;
      if ((oldPrice > 0 || coupon) && product.title.includes('R$')) {
        // Regex melhorada para remover qualquer formato de preço ou cupom
        cleanTitle = product.title
          .replace(/Cupom\s+(?:de\s+)?R\$\s*[\d.,]+/gi, '')
          .replace(/R\$\s*[\d.,]+\s+OFF/gi, '')
          .replace(/\s*-?\s*R\$\s*[\d.,]+/g, '')
          .trim();
        console.log('   🧹 Título limpo:', cleanTitle.substring(0, 50) + '...');
      }

      console.log('📦 Dados da API do ML:');
      console.log('   Nome:', cleanTitle.substring(0, 50) + '...');
      console.log('   Preço Atual (final):', currentPrice);
      console.log('   Preço Original (API):', product.original_price);
      console.log('   Preço Antigo (final):', oldPrice);
      console.log('   Tem Desconto:', oldPrice > 0);
      console.log('   Tem Cupom:', !!coupon);

      return {
        name: cleanTitle,
        description: product.subtitle || cleanTitle,
        imageUrl: product.thumbnail || product.pictures?.[0]?.url || '',
        currentPrice: currentPrice,
        oldPrice: oldPrice,
        coupon: coupon,
        platform: 'mercadolivre',
        affiliateLink: product.permalink
      };
    } catch (error) {
      console.error('Erro ao buscar na API do ML:', error.message);
      return null;
    }
  }

  // Extrair informações de produto Mercado Livre
  async extractMeliInfo(url) {
    try {
      // PRIMEIRO: Tentar usar a API oficial (mais rápido e preciso)
      const productId = this.extractMeliProductId(url);
      if (productId) {
        console.log('✅ ID do produto encontrado:', productId);
        const apiData = await this.getMeliProductFromAPI(productId);
        if (apiData) {
          console.log('✅ Dados obtidos via API do Mercado Livre!');

          // Se a API não retornou desconto, tentar scraping para pegar
          if (apiData.oldPrice === 0) {
            console.log('⚠️ API não retornou desconto, tentando scraping...');
            const scrapedData = await this.scrapeMeliPrices(url);
            if (scrapedData.oldPrice > 0) {
              console.log('✅ Desconto encontrado via scraping!');
              apiData.oldPrice = scrapedData.oldPrice;
              apiData.currentPrice = scrapedData.currentPrice;
            }
            if (scrapedData.coupon) {
              console.log('✅ Cupom encontrado via scraping!');
              apiData.coupon = scrapedData.coupon;
            }
          }

          return apiData;
        }
      }

      // FALLBACK: Se a API falhar, usar scraping
      console.log('⚠️ API falhou, tentando scraping...');

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Tentar múltiplos seletores para nome
      const name = $('meta[property="og:title"]').attr('content') ||
        $('.ui-pdp-title').text() ||
        $('h1.ui-pdp-title').text() ||
        $('h1').first().text() ||
        $('title').text().split('|')[0];

      // Tentar múltiplos seletores para descrição
      const description = $('meta[property="og:description"]').attr('content') ||
        $('.ui-pdp-description__content').text() ||
        $('meta[name="description"]').attr('content');

      // Tentar múltiplos seletores para imagem
      const imageUrl = $('meta[property="og:image"]').attr('content') ||
        $('.ui-pdp-image').first().attr('src') ||
        $('img.ui-pdp-image').first().attr('src') ||
        $('figure img').first().attr('src');

      // Extrair preços - múltiplos seletores
      let currentPrice = 0;
      let oldPrice = 0;

      // Tentar extrair preço atual
      const priceSelectors = [
        '.andes-money-amount__fraction',
        '.price-tag-fraction',
        '[class*="price"] [class*="fraction"]',
        '.ui-pdp-price__second-line .andes-money-amount__fraction'
      ];

      for (const selector of priceSelectors) {
        const priceText = $(selector).first().text();
        if (priceText) {
          currentPrice = this.parsePrice(priceText);
          if (currentPrice > 0) break;
        }
      }

      // Tentar extrair preço antigo
      const oldPriceSelectors = [
        '.andes-money-amount--previous .andes-money-amount__fraction',
        '.ui-pdp-price__original-value .andes-money-amount__fraction',
        '[class*="original"] [class*="fraction"]'
      ];

      for (const selector of oldPriceSelectors) {
        const oldPriceText = $(selector).first().text();
        if (oldPriceText) {
          oldPrice = this.parsePrice(oldPriceText);
          if (oldPrice > 0) break;
        }
      }

      // Se não encontrou preço antigo, deixar vazio (não há desconto)
      // Se os preços são iguais, significa que não há desconto real
      if (oldPrice === 0 || oldPrice === currentPrice) {
        oldPrice = 0; // Deixar vazio se não houver desconto
      }

      const result = {
        name: this.cleanText(name),
        description: this.cleanText(description),
        imageUrl: imageUrl || '',
        currentPrice: currentPrice,
        oldPrice: oldPrice > currentPrice ? oldPrice : 0, // Só usar se for maior que o atual
        coupon: null, // LinkAnalyzer (extractMeliInfo) básico sem scraping profundo de cupons ainda, mas scrapeMeliPrices cobre. 
        // Na verdade, scrapeMeliPrices é chamado dentro de getMeliProductFromAPI, mas aqui é o fallback puro scraping.
        // Vamos precisar re-implementar a logica de detecção de cupom aqui se quisermos consistencia, ou confiar que scrapeMeliPrices é usado
        // quando a API não resolve. Mas este metodo extractMeliInfo é o fallback GERAL.
        // Vamos adicionar detecção básica aqui?
        // Sim, a logica de scrapeMeliPrices é mais robusta. Mas vamos adicionar null por enquanto.
        platform: 'mercadolivre',
        affiliateLink: url
      };

      // Tentar re-scan usando scrapeMeliPrices se suspeitarmos que perdemos algo?
      // Ou melhor, unificar a logica de scraping. O metodo scrapeMeliPrices é só PREÇO. 
      // Este metodo extractMeliInfo faz tudo.
      // Vou adicionar a chamada ao scrapeMeliPrices aqui para garantir captura de cupons.
      const priceData = await this.scrapeMeliPrices(url);
      if (priceData.coupon) {
        result.coupon = priceData.coupon;
      }
      // Sobrescrever preços se scrapeMeliPrices achou algo melhor
      if (priceData.currentPrice > 0) result.currentPrice = priceData.currentPrice;
      if (priceData.oldPrice > 0) result.oldPrice = priceData.oldPrice;

      console.log('📦 Dados extraídos do Mercado Livre:');
      console.log('   Nome:', result.name.substring(0, 50) + '...');
      console.log('   Preço Atual (currentPrice):', result.currentPrice);
      console.log('   Preço Antigo (oldPrice):', result.oldPrice);
      console.log('   Tem Imagem:', !!result.imageUrl);
      console.log('   Tem Desconto:', result.oldPrice > result.currentPrice);

      return result;
    } catch (error) {
      console.error('Erro ao extrair info Mercado Livre:', error.message);
      return this.extractBasicInfo(url, 'mercadolivre');
    }
  }

  // Extrair informações básicas (fallback)
  extractBasicInfo(url, platform) {
    return {
      name: '',
      description: '',
      imageUrl: '',
      currentPrice: 0,
      oldPrice: 0,
      platform: platform,
      affiliateLink: url
    };
  }

  // Analisar link e extrair informações
  async analyzeLink(url) {
    try {
      // Seguir redirecionamentos primeiro (para links encurtados)
      console.log('🔗 URL original:', url);
      const finalUrl = await this.followRedirects(url);
      console.log('🔗 URL final:', finalUrl);

      const platform = this.detectPlatform(finalUrl);
      console.log('🏷️ Plataforma detectada:', platform);

      if (platform === 'shopee') {
        return await this.extractShopeeInfo(finalUrl);
      } else if (platform === 'mercadolivre') {
        return await this.extractMeliInfo(finalUrl);
      } else {
        return {
          platform: 'unknown',
          affiliateLink: url,
          error: 'Plataforma não suportada. Use links da Shopee ou Mercado Livre.'
        };
      }
    } catch (error) {
      console.error('Erro ao analisar link:', error);
      return {
        error: 'Erro ao analisar o link. Verifique se o link está correto.',
        affiliateLink: url
      };
    }
  }

  // Limpar texto
  cleanText(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .substring(0, 500); // Limitar tamanho
  }

  // Converter texto de preço para número
  parsePrice(priceText) {
    if (!priceText) return 0;

    // Converter para string
    const text = String(priceText);

    // No Brasil: 1.299,90 ou 1299,90 ou 1299
    // Remover pontos (separador de milhar) e substituir vírgula por ponto
    const cleaned = text
      .replace(/[^\d,]/g, '')   // Remove tudo exceto números e vírgula
      .replace(/\./g, '')       // Remove pontos (milhar)
      .replace(',', '.');        // Vírgula vira ponto decimal

    const price = parseFloat(cleaned);
    return isNaN(price) ? 0 : price;
  }
}

export default new LinkAnalyzer();

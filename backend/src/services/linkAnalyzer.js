import axios from 'axios';
import * as cheerio from 'cheerio';

class LinkAnalyzer {
  // Detectar plataforma pelo link
  detectPlatform(url) {
    const urlLower = url.toLowerCase();

    // Shopee: múltiplos padrões de links
    if (urlLower.includes('shopee.com.br') || 
        urlLower.includes('shopee.com') ||
        urlLower.includes('shp.ee') ||
        urlLower.includes('s.shopee.com.br') ||
        urlLower.includes('s.shopee.com')) {
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
    if (urlLower.includes('aliexpress.com') || 
        urlLower.includes('s.click.aliexpress.com') ||
        urlLower.includes('alixpress.com')) {
      return 'aliexpress';
    }
    return 'unknown';
  }

  // Seguir redirecionamentos para obter URL final (com suporte para múltiplos redirecionamentos e JavaScript)
  async followRedirects(url, maxAttempts = 5) {
    try {
      console.log(`   🔄 Seguindo redirecionamentos de: ${url}`);

      let currentUrl = url;
      let finalUrl = url;
      let productUrl = null; // Guardar URL de produto se detectada
      let attempts = 0;

      // Seguir redirecionamentos HTTP até encontrar a URL final
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`   🔄 Tentativa ${attempts}/${maxAttempts}: ${currentUrl.substring(0, 80)}...`);

        try {
          const response = await axios.get(currentUrl, {
            maxRedirects: 10, // Seguir até 10 redirecionamentos HTTP
            validateStatus: (status) => status >= 200 && status < 400,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
              'Referer': 'https://www.google.com/',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive'
            },
            timeout: 15000
          });

          // Pegar URL final após redirecionamentos HTTP
          const responseUrl = response.request?.res?.responseUrl || 
                             response.request?.responseURL ||
                             response.config?.url || 
                             currentUrl;

          // Para AliExpress: se chegou em uma URL de produto válida, salvar e parar aqui
          if (responseUrl.includes('aliexpress.com/item/') || responseUrl.includes('aliexpress.com/i/')) {
            console.log(`   ✅ URL de produto AliExpress detectada: ${responseUrl.substring(0, 80)}...`);
            productUrl = responseUrl; // Salvar URL do produto
            finalUrl = responseUrl;
            break; // Parar aqui, não seguir mais redirecionamentos
          }

          // Para Shopee: se ainda está em link encurtado, continuar
          if (responseUrl !== currentUrl && !responseUrl.includes('s.shopee.com.br') && !responseUrl.includes('shp.ee')) {
            // Verificar se não é uma página de login/erro
            if (responseUrl.includes('/login') || responseUrl.includes('/error/') || responseUrl.includes('/404')) {
              console.log(`   ⚠️ Redirecionamento para página de login/erro detectado`);
              // Se temos uma URL de produto salva, usar ela
              if (productUrl) {
                console.log(`   💡 Usando URL de produto salva anteriormente`);
                finalUrl = productUrl;
                break;
              }
              console.log(`   ⚠️ Usando URL anterior`);
              break; // Parar e usar a URL anterior
            }
            console.log(`   ✅ Redirecionamento HTTP detectado: ${responseUrl.substring(0, 80)}...`);
            currentUrl = responseUrl;
            finalUrl = responseUrl;
            continue; // Continuar loop para seguir mais redirecionamentos
          }

          // Verificar se há redirecionamento JavaScript na página
          // Links de afiliado da Shopee podem usar JavaScript para redirecionar
          if (response.data && typeof response.data === 'string') {
            // Buscar por meta refresh ou JavaScript redirect
            const metaRefresh = response.data.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i);
            const jsRedirect = response.data.match(/window\.location\s*=\s*["']([^"']+)["']/i) ||
                              response.data.match(/location\.href\s*=\s*["']([^"']+)["']/i) ||
                              response.data.match(/location\.replace\s*\(["']([^"']+)["']\)/i);

            if (metaRefresh && metaRefresh[1]) {
              let redirectUrl = metaRefresh[1];
              if (!redirectUrl.startsWith('http')) {
                redirectUrl = new URL(redirectUrl, currentUrl).toString();
              }
              
              // Para AliExpress: se o redirect é para uma página de produto, usar e parar
              if (redirectUrl.includes('aliexpress.com/item/') || redirectUrl.includes('aliexpress.com/i/')) {
                console.log(`   ✅ URL de produto AliExpress detectada via meta refresh: ${redirectUrl.substring(0, 80)}...`);
                finalUrl = redirectUrl;
                break;
              }
              
              // Evitar seguir para páginas de login/erro
              if (redirectUrl.includes('/login') || redirectUrl.includes('/error/') || redirectUrl.includes('/404')) {
                console.log(`   ⚠️ Meta refresh para página de login/erro, ignorando`);
                break;
              }
              
              console.log(`   🔄 Meta refresh detectado: ${redirectUrl.substring(0, 80)}...`);
              currentUrl = redirectUrl;
              finalUrl = redirectUrl;
              continue;
            }

            if (jsRedirect && jsRedirect[1]) {
              let redirectUrl = jsRedirect[1];
              if (!redirectUrl.startsWith('http')) {
                redirectUrl = new URL(redirectUrl, currentUrl).toString();
              }
              
              // Para AliExpress: se o redirect é para uma página de produto, usar e parar
              if (redirectUrl.includes('aliexpress.com/item/') || redirectUrl.includes('aliexpress.com/i/')) {
                console.log(`   ✅ URL de produto AliExpress detectada via JS redirect: ${redirectUrl.substring(0, 80)}...`);
                finalUrl = redirectUrl;
                break;
              }
              
              // Evitar seguir para páginas de login/erro
              if (redirectUrl.includes('/login') || redirectUrl.includes('/error/') || redirectUrl.includes('/404')) {
                console.log(`   ⚠️ JavaScript redirect para página de login/erro, ignorando`);
                // Tentar extrair URL de produto da URL atual se possível
                if (currentUrl.includes('aliexpress.com/item/') || currentUrl.includes('aliexpress.com/i/')) {
                  console.log(`   💡 Usando URL atual que parece ser de produto`);
                  finalUrl = currentUrl;
                }
                break;
              }
              
              console.log(`   🔄 JavaScript redirect detectado: ${redirectUrl.substring(0, 80)}...`);
              currentUrl = redirectUrl;
              finalUrl = redirectUrl;
              continue;
            }

            // Se ainda está em link encurtado, verificar se há redirecionamento no HTML
            // Links de afiliado da Shopee podem ter redirecionamento em script ou iframe
            if ((currentUrl.includes('s.shopee.com.br') || currentUrl.includes('shp.ee')) && attempts < maxAttempts) {
              // Buscar por mais padrões de redirecionamento no HTML
              const redirectPatterns = [
                /href\s*=\s*["']([^"']*shopee[^"']*product[^"']*)["']/i,
                /url\s*=\s*["']([^"']*shopee[^"']*product[^"']*)["']/i,
                /redirect\s*:\s*["']([^"']*shopee[^"']*product[^"']*)["']/i,
                /<a[^>]*href=["']([^"']*shopee[^"']*product[^"']*)["']/i
              ];
              
              for (const pattern of redirectPatterns) {
                const match = response.data.match(pattern);
                if (match && match[1]) {
                  let redirectUrl = match[1];
                  if (!redirectUrl.startsWith('http')) {
                    redirectUrl = new URL(redirectUrl, currentUrl).toString();
                  }
                  if (redirectUrl.includes('shopee.com.br') && redirectUrl.includes('product') && !redirectUrl.includes('s.shopee.com.br')) {
                    console.log(`   🔄 URL de produto encontrada no HTML: ${redirectUrl.substring(0, 80)}...`);
                    currentUrl = redirectUrl;
                    finalUrl = redirectUrl;
                    continue;
                  }
                }
              }
              
              // Se não encontrou no HTML, aguardar e tentar novamente (pode ser redirecionamento JavaScript assíncrono)
              if (currentUrl.includes('s.shopee.com.br') || currentUrl.includes('shp.ee')) {
                console.log(`   ⏳ Aguardando 3 segundos para redirecionamento JavaScript (tentativa ${attempts})...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Tentar fazer uma nova requisição após o delay
                try {
                  const delayedResponse = await axios.get(currentUrl, {
                    maxRedirects: 10,
                    validateStatus: (status) => status >= 200 && status < 400,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                      'Referer': currentUrl,
                      'Accept-Encoding': 'gzip, deflate, br'
                    },
                    timeout: 15000
                  });
                  
                  const delayedUrl = delayedResponse.request?.res?.responseUrl || 
                                    delayedResponse.request?.responseURL ||
                                    delayedResponse.config?.url || 
                                    currentUrl;
                  
                  if (delayedUrl !== currentUrl && !delayedUrl.includes('s.shopee.com.br') && !delayedUrl.includes('shp.ee')) {
                    console.log(`   ✅ URL após delay: ${delayedUrl.substring(0, 80)}...`);
                    currentUrl = delayedUrl;
                    finalUrl = delayedUrl;
                    continue;
                  }
                } catch (e) {
                  console.log(`   ⚠️ Erro ao verificar após delay: ${e.message}`);
                }
              }
            }
          }

          // Se chegou aqui, não há mais redirecionamentos
          finalUrl = responseUrl;
          break;

        } catch (error) {
          console.log(`   ⚠️ Erro na tentativa ${attempts}: ${error.message}`);
          if (attempts >= maxAttempts) {
            console.log(`   ⚠️ Máximo de tentativas atingido, usando última URL conhecida`);
            break;
          }
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Se temos uma URL de produto salva e a URL final é de erro/login, usar a URL do produto
      if (productUrl && (finalUrl.includes('/error/') || finalUrl.includes('/404') || finalUrl.includes('/login'))) {
        console.log(`   💡 URL final é erro/login, usando URL de produto detectada anteriormente`);
        finalUrl = productUrl;
      }
      
      console.log(`   ✅ URL final após ${attempts} tentativa(s): ${finalUrl.substring(0, 100)}...`);
      return finalUrl;

    } catch (error) {
      console.error(`   ❌ Erro ao seguir redirecionamentos: ${error.message}`);
      return url; // Retornar URL original em caso de erro
    }
  }

  // Extrair IDs da URL da Shopee
  extractShopeeIds(url) {
    // Múltiplos padrões de URL da Shopee:
    // 1. https://shopee.com.br/{shop_name}/{shop_id}/{item_id}
    // 2. https://shopee.com.br/product/{shop_name}/{shop_id}/{item_id}
    // 3. https://www.shopee.com.br/{shop_name}/{shop_id}/{item_id}
    // 4. https://s.shopee.com.br/{code} (link encurtado - precisa seguir redirecionamento)
    
    // Padrão 1: URL padrão com shop_name
    let match = url.match(/shopee\.com(?:\.br)?\/[^/]+\/(\d+)\/(\d+)/);
    if (match) {
      return {
        shopId: match[1],
        itemId: match[2]
      };
    }
    
    // Padrão 2: URL com /product/
    match = url.match(/shopee\.com(?:\.br)?\/product\/[^/]+\/(\d+)\/(\d+)/);
    if (match) {
      return {
        shopId: match[1],
        itemId: match[2]
      };
    }
    
    // Padrão 3: Tentar extrair apenas item_id (menos confiável, mas pode funcionar)
    match = url.match(/[?&]item[_-]?id=(\d+)/i);
    if (match) {
      // Tentar encontrar shop_id também
      const shopMatch = url.match(/[?&]shop[_-]?id=(\d+)/i);
      return {
        shopId: shopMatch ? shopMatch[1] : '0', // Shop ID pode ser 0 para alguns casos
        itemId: match[1]
      };
    }
    
    return null;
  }

  // Usar API interna da Shopee ou API oficial
  async extractShopeeFromAPI(url) {
    try {
      const ids = this.extractShopeeIds(url);
      if (!ids) {
        console.log('⚠️ Não foi possível extrair IDs da URL da Shopee');
        return null;
      }

      console.log(`🔍 IDs extraídos - Shop: ${ids.shopId}, Item: ${ids.itemId}`);

      // TENTAR API OFICIAL DA SHOPEE PRIMEIRO (se configurada)
      try {
        const shopeeService = (await import('./shopee/shopeeService.js')).default;
        const AppSettings = (await import('../models/AppSettings.js')).default;

        // Buscar configurações do banco de dados
        const config = await AppSettings.getShopeeConfig();
        console.log(`   🔍 Configurações Shopee do banco: Partner ID ${config.partnerId ? '✅ configurado' : '❌ não configurado'}, Partner Key ${config.partnerKey ? '✅ configurado' : '❌ não configurado'}`);
        
        if (config.partnerId && config.partnerKey) {
          console.log('   🔄 Tentando API oficial da Shopee...');
          // Forçar recarregamento das configurações no shopeeService
          await shopeeService.loadSettings();
          const productDetails = await shopeeService.getProductDetails(parseInt(ids.itemId));
          
          // A API pode retornar em diferentes formatos
          let item = null;
          if (productDetails && productDetails.item) {
            item = productDetails.item;
          } else if (productDetails && productDetails.data && productDetails.data.item) {
            item = productDetails.data.item;
          } else if (productDetails && Array.isArray(productDetails) && productDetails[0]) {
            item = productDetails[0];
          }
          
          if (item) {
            const name = item.name || '';
            const description = item.description || '';
            // Preços podem vir em diferentes formatos
            const currentPrice = item.price ? (typeof item.price === 'number' ? item.price / 100000 : parseFloat(item.price) / 100000) : 0;
            const oldPrice = item.price_before_discount 
              ? (typeof item.price_before_discount === 'number' ? item.price_before_discount / 100000 : parseFloat(item.price_before_discount) / 100000)
              : 0;
            const imageUrl = item.images && item.images.length > 0 
              ? `https://cf.shopee.com.br/file/${item.images[0]}` 
              : (item.image ? `https://cf.shopee.com.br/file/${item.image}` : '');

            console.log('✅ Dados obtidos via API oficial da Shopee!');
            console.log('   Nome:', name?.substring(0, 50));
            console.log('   Preço Atual:', currentPrice);
            console.log('   Preço Original:', oldPrice);
            console.log('   Imagem:', imageUrl ? 'Sim' : 'Não');

            return {
              name: name,
              description: description,
              imageUrl: imageUrl,
              currentPrice: currentPrice,
              oldPrice: oldPrice > currentPrice ? oldPrice : 0,
              platform: 'shopee',
              affiliateLink: url
            };
          }
        }
      } catch (officialApiError) {
        console.log('   ⚠️ API oficial não disponível ou falhou, tentando API pública:', officialApiError.message);
      }

      // FALLBACK: API pública da Shopee (pode retornar 403)
      const apiUrl = `https://shopee.com.br/api/v4/item/get?shopid=${ids.shopId}&itemid=${ids.itemId}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': url,
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Origin': 'https://shopee.com.br'
        },
        timeout: 10000,
        validateStatus: (status) => status < 500 // Aceitar 403 mas não 500+
      });

      // Se retornar 403, a API pública não está disponível
      if (response.status === 403) {
        console.log('⚠️ API pública da Shopee retornou 403 (Forbidden) - API pode ter mudado');
        return null;
      }

      if (!response.data || !response.data.data || response.data.error) {
        console.log('⚠️ API da Shopee retornou erro ou dados vazios');
        return null;
      }

      const item = response.data.data;
      
      // Extrair informações
      const name = item.name || '';
      const description = item.description || '';
      
      // Preços (Shopee usa valores em centavos de milhão - dividir por 100000)
      const currentPrice = item.price ? item.price / 100000 : 0;
      const oldPrice = item.price_before_discount ? item.price_before_discount / 100000 : 0;
      
      // Imagem
      const imageUrl = item.image ? `https://cf.shopee.com.br/file/${item.image}` : '';

      console.log('📦 Dados extraídos da API pública da Shopee:');
      console.log('   Nome:', name?.substring(0, 50));
      console.log('   Preço Atual:', currentPrice);
      console.log('   Preço Original:', oldPrice);
      console.log('   Imagem:', imageUrl ? 'Sim' : 'Não');

      return {
        name: name,
        description: description,
        imageUrl: imageUrl,
        currentPrice: currentPrice,
        oldPrice: oldPrice > currentPrice ? oldPrice : 0,
        platform: 'shopee',
        affiliateLink: url
      };
    } catch (error) {
      // Se for erro 403, não logar como erro crítico
      if (error.response && error.response.status === 403) {
        console.log('⚠️ API da Shopee retornou 403 - tentando scraping como fallback');
      } else {
        console.error('❌ Erro ao usar API da Shopee:', error.message);
      }
      return null;
    }
  }

  // Extrair informações de produto Shopee
  async extractShopeeInfo(url) {
    // Timeout geral para evitar travamento (30 segundos)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Extração demorou mais de 30 segundos')), 30000);
    });
    
    const extractionPromise = (async () => {
    try {
      // Seguir redirecionamentos primeiro (importante para links encurtados como s.shopee.com.br)
      // A Shopee pode ter múltiplos redirecionamentos, então sempre seguir redirecionamentos
      console.log('🔗 URL Shopee original:', url);
      let finalUrl = url;

      // Sempre seguir redirecionamentos para garantir que chegamos na URL final
      // Links encurtados (s.shopee.com.br, shp.ee) e links normais podem ter redirecionamentos
      // Links de afiliado podem ter múltiplos redirecionamentos e JavaScript
      console.log('   🔄 Seguindo redirecionamentos para obter URL final...');
      finalUrl = await this.followRedirects(url, 5); // Até 5 tentativas
      console.log('   ✅ URL final após redirecionamento(s):', finalUrl);
      
      // IMPORTANTE: Para links de afiliado da Shopee, aguardar 10 segundos
      // para permitir que redirecionamentos JavaScript aconteçam antes de extrair dados
      if (url.includes('s.shopee.com.br') || url.includes('shp.ee') || finalUrl.includes('s.shopee.com.br') || finalUrl.includes('shp.ee')) {
        console.log('   ⏳ Aguardando 10 segundos para redirecionamentos JavaScript completarem...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Tentar seguir redirecionamentos novamente após o delay de 10 segundos
        console.log('   🔄 Verificando URL final após delay de 10 segundos...');
        const delayedUrl = await this.followRedirects(finalUrl, 3);
        if (delayedUrl !== finalUrl && !delayedUrl.includes('s.shopee.com.br') && !delayedUrl.includes('shp.ee')) {
          console.log('   ✅ URL final após delay de 10 segundos:', delayedUrl);
          finalUrl = delayedUrl;
        } else if (delayedUrl !== finalUrl) {
          console.log('   ⚠️ URL mudou mas ainda parece encurtada:', delayedUrl);
          finalUrl = delayedUrl;
        } else {
          console.log('   ℹ️ URL não mudou após delay, usando:', finalUrl);
        }
      }

      // TENTAR API DA SHOPEE PRIMEIRO (mais confiável)
      try {
        const shopeeApiData = await this.extractShopeeFromAPI(finalUrl);
        if (shopeeApiData && shopeeApiData.name && shopeeApiData.currentPrice > 0) {
          console.log('✅ Dados obtidos via API da Shopee!');
          return shopeeApiData;
        }
      } catch (apiError) {
        console.log('⚠️ API da Shopee falhou, tentando scraping:', apiError.message);
      }

      // Validar que a URL final é realmente da Shopee
      if (!finalUrl.includes('shopee.com.br') && !finalUrl.includes('shopee.com')) {
        console.warn(`   ⚠️ URL final não parece ser da Shopee: ${finalUrl}`);
        // Continuar mesmo assim, pode ser um link de afiliado válido
      }

      // IMPORTANTE: Remover parâmetros mobile e outros que podem limitar o conteúdo
      // A versão desktop tem mais dados disponíveis
      let cleanUrl = finalUrl;
      try {
        const urlObj = new URL(finalUrl);
        // Remover parâmetros que podem causar versão mobile ou limitada
        urlObj.searchParams.delete('__mobile__');
        urlObj.searchParams.delete('mobile');
        urlObj.searchParams.delete('m');
        // Manter apenas parâmetros essenciais de tracking (se necessário)
        cleanUrl = urlObj.toString();
        if (cleanUrl !== finalUrl) {
          console.log(`   🔄 URL limpa (removidos parâmetros mobile): ${cleanUrl.substring(0, 100)}...`);
        }
      } catch (e) {
        console.log(`   ⚠️ Não foi possível limpar URL: ${e.message}`);
        cleanUrl = finalUrl;
      }

      // Fazer requisição com headers completos para simular navegador real
      const response = await axios.get(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://shopee.com.br/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive'
        },
        timeout: 20000, // Aumentar timeout para páginas mais pesadas
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      // Verificar se a resposta contém HTML válido
      if (!response.data || typeof response.data !== 'string') {
        console.error('   ❌ Resposta não contém HTML válido');
        return {
          error: 'A página da Shopee não retornou HTML válido. O produto pode estar indisponível ou a página pode estar bloqueando o acesso.',
          platform: 'shopee',
          affiliateLink: cleanUrl
        };
      }

      // Verificar se a página está bloqueando (captcha, erro, etc)
      if (response.data.includes('captcha') || 
          response.data.includes('Access Denied') ||
          response.data.includes('blocked') ||
          response.data.length < 1000) {
        console.warn('   ⚠️ Página pode estar bloqueada ou com erro (tamanho:', response.data.length, 'chars)');
        // Continuar mesmo assim, pode ser que ainda tenha dados
      }

      console.log(`   📄 Tamanho do HTML recebido: ${(response.data.length / 1024).toFixed(2)} KB`);
      
      const $ = cheerio.load(response.data);
      
      // Extrair todos os scripts de uma vez para usar em múltiplos lugares
      const scriptMatches = response.data.match(/<script[^>]*>(.*?)<\/script>/gs);
      console.log(`   📜 Scripts encontrados: ${scriptMatches ? scriptMatches.length : 0}`);

      // PRIORIDADE 0: Buscar diretamente no HTML bruto (antes do cheerio processar)
      // A Shopee pode ter dados em atributos data-* ou em estruturas específicas
      let name = '';
      
      // Tentar extrair do HTML bruto primeiro (mais rápido)
      const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        name = titleMatch[1]
          .replace(/\s*[|-\u2013\u2014]\s*Shopee.*$/i, '')
          .replace(/\s*-\s*Shopee.*$/i, '')
          .trim();
        if (name.length > 10) {
          console.log(`   ✅ Nome encontrado no título HTML bruto: ${name.substring(0, 50)}`);
        }
      }
      
      // PRIORIDADE 1: Meta tags Open Graph (mais confiável)
      if (!name || name.length < 5) {
        name = $('meta[property="og:title"]').attr('content') ||
          $('meta[name="og:title"]').attr('content') ||
          $('meta[property="twitter:title"]').attr('content') ||
          $('meta[name="title"]').attr('content') ||
          $('title').text().split('|')[0].split('-')[0].trim();

        // Limpar nome de caracteres especiais da Shopee
        if (name) {
          name = name.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
        }
      }

      let description = $('meta[property="og:description"]').attr('content') ||
        $('meta[name="og:description"]').attr('content') ||
        $('meta[property="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      let imageUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[name="og:image"]').attr('content') ||
        $('meta[property="twitter:image"]').attr('content') ||
        $('meta[name="image"]').attr('content') ||
        '';

      // PRIORIDADE 2: Tentar extrair do JSON-LD (dados estruturados)
      const jsonLdScripts = $('script[type="application/ld+json"]');
      jsonLdScripts.each((i, el) => {
        try {
          const jsonData = JSON.parse($(el).html());
          if (jsonData['@type'] === 'Product' || jsonData['@type'] === 'Offer') {
            if (!name && jsonData.name) name = jsonData.name;
            if (!description && jsonData.description) description = jsonData.description;
            if (!imageUrl && jsonData.image) {
              imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
            }

            // Extrair preços do JSON-LD
            if (jsonData.offers && jsonData.offers.price) {
              const price = parseFloat(jsonData.offers.price);
              if (!isNaN(price) && price > 0) {
                // Se encontrou preço no JSON-LD, vamos usar (será processado depois)
                $(el).data('jsonldPrice', price);
              }
            }
          }
        } catch (e) {
          // Ignorar erros de parse do JSON-LD
        }
      });

      // PRIORIDADE 3: Seletores CSS da Shopee (atualizados)
      // Seletores modernos da Shopee 2024
      const shopeeSelectors = {
        name: [
          '[data-testid="productTitle"]',
          '.product-title',
          '.pdp-product-name',
          'h1[class*="product"]',
          '.shopee-product-title',
          'h1'
        ],
        price: [
          '[data-testid="productPrice"]',
          '.product-price',
          '.pdp-price',
          '[class*="price"] [class*="current"]',
          '.shopee-product-price',
          '[class*="price-value"]'
        ],
        oldPrice: [
          '[data-testid="productOriginalPrice"]',
          '.product-original-price',
          '.pdp-price-original',
          '[class*="price"] [class*="original"]',
          '.shopee-product-original-price',
          '[class*="strike-through"]'
        ],
        image: [
          '[data-testid="productImage"]',
          '.product-image img',
          '.pdp-product-image img',
          '.shopee-product-image img',
          '[class*="gallery"] img',
          '.product-gallery img'
        ]
      };

      // Tentar extrair nome com múltiplos seletores
      if (!name || name.length < 5) {
        for (const selector of shopeeSelectors.name) {
          const found = $(selector).first().text().trim();
          if (found && found.length > 5 && !found.toLowerCase().includes('shopee') && found.includes(' ')) {
            name = found.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
            if (name.length > 5) {
              console.log(`   ✅ Nome encontrado via seletor: ${selector}`);
              break;
            }
          }
        }
        
        // Última tentativa: buscar em qualquer h1 ou h2
        if (!name || name.length < 5) {
          const h1Text = $('h1').first().text().trim();
          const h2Text = $('h2').first().text().trim();
          const candidate = h1Text || h2Text;
          if (candidate && candidate.length > 10 && candidate.includes(' ') && !candidate.toLowerCase().includes('shopee')) {
            name = candidate.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
            if (name.length > 5) {
              console.log(`   ✅ Nome encontrado via H1/H2: ${name.substring(0, 50)}`);
            }
          }
        }
      }

      // Tentar extrair imagem com múltiplos seletores
      if (!imageUrl) {
        for (const selector of shopeeSelectors.image) {
          const found = $(selector).first().attr('src') || $(selector).first().attr('data-src') || $(selector).first().attr('data-lazy-src');
          if (found && found.startsWith('http')) {
            imageUrl = found;
            console.log(`   ✅ Imagem encontrada via seletor: ${selector}`);
            break;
          }
        }
      }
      
      // Buscar imagem em scripts JSON também
      if (!imageUrl && scriptMatches) {
        for (const scriptContent of scriptMatches) {
          try {
            // Buscar por padrões de URL de imagem
            const imagePatterns = [
              /"image":\s*"([^"]+\.(jpg|jpeg|png|webp))"/i,
              /"imageUrl":\s*"([^"]+\.(jpg|jpeg|png|webp))"/i,
              /"thumbnail":\s*"([^"]+\.(jpg|jpeg|png|webp))"/i,
              /og:image["\s:]*["']([^"']+\.(jpg|jpeg|png|webp))["']/i
            ];
            
            for (const pattern of imagePatterns) {
              const match = scriptContent.match(pattern);
              if (match && match[1] && match[1].startsWith('http')) {
                imageUrl = match[1];
                console.log(`   ✅ Imagem encontrada em script JSON: ${imageUrl.substring(0, 50)}`);
                break;
              }
            }
            if (imageUrl) break;
          } catch (e) {
            // Continuar
          }
        }
      }

      // Extrair preços - método robusto
      let currentPrice = 0;
      let oldPrice = 0;

      // PRIORIDADE 0: Buscar dados em scripts JSON da Shopee (mais confiável)
      // A Shopee usa window.__INITIAL_STATE__, window.__NEXT_DATA__, ou window._shopee para hidratação
      // ESTRATÉGIA AVANÇADA: Buscar em scripts grandes também, mas com limites de iteração
      if (scriptMatches) {
        const MAX_SCRIPT_SIZE = 2000000; // Aumentar limite para 2MB (Shopee tem scripts grandes)
        let processedScripts = 0;
        const MAX_SCRIPTS = 30; // Aumentar número de scripts processados
        
        // PRIORIDADE: Processar scripts menores primeiro (mais rápidos)
        const sortedScripts = [...scriptMatches].sort((a, b) => a.length - b.length);
        
        for (const scriptContent of sortedScripts) {
          if (processedScripts >= MAX_SCRIPTS) break;
          if (scriptContent.length > MAX_SCRIPT_SIZE) {
            // Para scripts muito grandes, tentar apenas padrões específicos
            console.log(`   ⚠️ Script muito grande (${(scriptContent.length / 1024).toFixed(0)}KB), usando busca limitada`);
            
            // Buscar apenas padrões específicos da Shopee em scripts grandes
            const shopeePatterns = [
              /"item_name"\s*:\s*"([^"]{15,200})"/,
              /"name"\s*:\s*"([^"]{15,200})"[\s\S]{0,2000}"price"\s*:\s*(\d+)/,
              /"price"\s*:\s*(\d+)[\s\S]{0,2000}"item_name"\s*:\s*"([^"]{15,200})"/,
              /"current_price"\s*:\s*(\d+)/,
              /"sale_price"\s*:\s*(\d+)/
            ];
            
            for (const pattern of shopeePatterns) {
              const match = scriptContent.match(pattern);
              if (match) {
                if (match[1] && !name) {
                  const candidate = match[1].trim();
                  if (candidate.length > 10 && candidate.length < 200 && !candidate.includes('__') && candidate.includes(' ')) {
                    name = candidate;
                    console.log(`   ✅ Nome encontrado em script grande via padrão: ${name.substring(0, 50)}`);
                  }
                }
                if (match[2] || match[1] && !isNaN(parseFloat(match[1]))) {
                  const priceValue = parseFloat(match[2] || match[1]);
                  if (priceValue > 0 && priceValue < 10000000) {
                    let candidatePrice = priceValue;
                    if (candidatePrice > 1000000) candidatePrice = candidatePrice / 100000;
                    else if (candidatePrice > 1000 && candidatePrice < 100000) candidatePrice = candidatePrice / 100;
                    if (candidatePrice > 0 && candidatePrice < 100000 && currentPrice === 0) {
                      currentPrice = candidatePrice;
                      console.log(`   ✅ Preço encontrado em script grande via padrão: ${currentPrice}`);
                    }
                  }
                }
                if (name && name.length > 10 && currentPrice > 0) break;
              }
            }
            
            processedScripts++;
            continue; // Pular processamento completo de scripts muito grandes
          }
          
          processedScripts++;
          
          try {
            // Buscar por padrões mais específicos primeiro (mais rápido)
            // Padrão 1: Buscar diretamente por campos de produto em JSON (múltiplas variações)
            const productPatterns = [
              /"name"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"price"\s*:\s*(\d+(?:\.\d+)?)/,
              /"item_name"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"price"\s*:\s*(\d+(?:\.\d+)?)/,
              /"product_name"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"price"\s*:\s*(\d+(?:\.\d+)?)/,
              /"title"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"price"\s*:\s*(\d+(?:\.\d+)?)/,
              /"name"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"amount"\s*:\s*(\d+(?:\.\d+)?)/,
              /"name"\s*:\s*"([^"]{10,200})"[\s\S]{0,5000}"current_price"\s*:\s*(\d+(?:\.\d+)?)/
            ];

            for (const pattern of productPatterns) {
              const productDataMatch = scriptContent.match(pattern);
              if (productDataMatch) {
                if (!name || name.length < 5) {
                  const candidateName = productDataMatch[1];
                  if (candidateName && candidateName.length > 10 && candidateName.includes(' ') && !candidateName.includes('__') && !candidateName.includes('shopee')) {
                    name = candidateName.trim();
                    console.log(`   ✅ Nome encontrado via padrão direto: ${name.substring(0, 50)}`);
                  }
                }
                
                if (currentPrice === 0) {
                  const candidatePrice = parseFloat(productDataMatch[2]);
                  // Shopee pode usar valores grandes (centavos de milhão)
                  if (candidatePrice > 0) {
                    if (candidatePrice > 1000000) {
                      currentPrice = candidatePrice / 100000;
                    } else if (candidatePrice > 1000 && candidatePrice < 100000) {
                      currentPrice = candidatePrice / 100;
                    } else if (candidatePrice < 100000) {
                      currentPrice = candidatePrice;
                    }
                    if (currentPrice > 0 && currentPrice < 100000) {
                      console.log(`   ✅ Preço encontrado via padrão direto: ${currentPrice}`);
                    }
                  }
                }
                
                // Se encontrou ambos, pode pular o resto
                if (name && name.length > 5 && currentPrice > 0) {
                  break;
                }
              }
            }
            
            // Padrão 2: Buscar window.__INITIAL_STATE__, __NEXT_DATA__, ou _shopee (mais lento, fazer por último)
            // ESTRATÉGIA AVANÇADA: Buscar com múltiplos padrões e tamanhos maiores
            const initialStateMatch = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]{0,1000000}});/);
            const nextDataMatch = scriptContent.match(/window\.__NEXT_DATA__\s*=\s*({[\s\S]{0,1000000}});/);
            const shopeeDataMatch = scriptContent.match(/window\._shopee\s*=\s*({[\s\S]{0,1000000}});/);
            const shopeeAppMatch = scriptContent.match(/window\.__SHOPEE_APP__\s*=\s*({[\s\S]{0,1000000}});/);
            const jsonMatch = initialStateMatch || nextDataMatch || shopeeDataMatch || shopeeAppMatch;
            
            if (jsonMatch && jsonMatch[1].length < 1000000) { // Aumentar limite para 1MB
              try {
                const jsonData = JSON.parse(jsonMatch[1]);
                
                // ESTRATÉGIA AVANÇADA: Buscar em estruturas específicas da Shopee primeiro
                // Shopee geralmente tem estruturas como: product.item, item, productInfo, etc.
                const shopeePaths = [
                  jsonData.product?.item,
                  jsonData.item,
                  jsonData.productInfo,
                  jsonData.product?.item_basic,
                  jsonData.item_basic,
                  jsonData.product?.item_detail,
                  jsonData.item_detail,
                  jsonData.data?.item,
                  jsonData.data?.product,
                  jsonData.pageProps?.product?.item,
                  jsonData.pageProps?.item,
                  jsonData.initialState?.product?.item,
                  jsonData.initialState?.item
                ];
                
                for (const item of shopeePaths) {
                  if (item && typeof item === 'object') {
                    // Buscar nome
                    if (!name && item.name && typeof item.name === 'string' && item.name.length > 10) {
                      name = item.name.trim();
                      console.log(`   ✅ Nome encontrado em estrutura Shopee: ${name.substring(0, 50)}`);
                    }
                    
                    // Buscar preço
                    if (currentPrice === 0) {
                      const priceFields = ['price', 'current_price', 'sale_price', 'price_min', 'price_max'];
                      for (const field of priceFields) {
                        if (item[field] && typeof item[field] === 'number' && item[field] > 0) {
                          let price = item[field];
                          if (price > 1000000) price = price / 100000;
                          else if (price > 100000 && price < 10000000) price = price / 100000;
                          else if (price > 1000 && price < 100000) price = price / 100;
                          if (price > 0 && price < 100000) {
                            currentPrice = price;
                            console.log(`   ✅ Preço encontrado em estrutura Shopee: ${currentPrice}`);
                            break;
                          }
                        }
                      }
                    }
                    
                    // Buscar preço original
                    if (oldPrice === 0 && currentPrice > 0) {
                      const oldPriceFields = ['price_before_discount', 'original_price', 'list_price', 'price_max'];
                      for (const field of oldPriceFields) {
                        if (item[field] && typeof item[field] === 'number' && item[field] > currentPrice) {
                          let price = item[field];
                          if (price > 1000000) price = price / 100000;
                          else if (price > 100000 && price < 10000000) price = price / 100000;
                          else if (price > 1000 && price < 100000) price = price / 100;
                          if (price > currentPrice) {
                            oldPrice = price;
                            console.log(`   ✅ Preço original encontrado em estrutura Shopee: ${oldPrice}`);
                            break;
                          }
                        }
                      }
                    }
                    
                    // Buscar imagem
                    if (!imageUrl && item.image) {
                      const img = Array.isArray(item.image) ? item.image[0] : item.image;
                      if (typeof img === 'string' && img.startsWith('http')) {
                        imageUrl = img;
                      } else if (typeof img === 'string') {
                        imageUrl = `https://cf.shopee.com.br/file/${img}`;
                      }
                    }
                    
                    if (name && name.length > 10 && currentPrice > 0) {
                      break; // Encontrou dados suficientes
                    }
                  }
                }
                
                // Se ainda não encontrou, fazer busca recursiva genérica
                let foundInShopeePaths = false;
                if (name && name.length > 10 && currentPrice > 0) {
                  foundInShopeePaths = true;
                }
                
                if (!foundInShopeePaths && ((!name || name.length < 5) || currentPrice === 0)) {
                  let iterations = 0;
                  const MAX_ITERATIONS = 5000; // Aumentar limite de iterações para scripts grandes
                  
                  const findPriceInData = (obj, depth = 0) => {
                    if (depth > 8 || iterations++ > MAX_ITERATIONS) return null; // Aumentar profundidade
                    if (typeof obj !== 'object' || obj === null) return null;
                    
                    // Priorizar chaves comuns primeiro
                    const priorityKeys = ['price', 'currentPrice', 'salePrice', 'amount', 'value', 'price_min', 'price_max', 'min_price', 'max_price', 'price_before_discount'];
                    for (const priorityKey of priorityKeys) {
                      if (obj[priorityKey] && typeof obj[priorityKey] === 'number' && obj[priorityKey] > 0) {
                        const value = obj[priorityKey];
                        // Shopee pode usar valores em centavos de milhão (100000)
                        if (value > 1000000) return value / 100000;
                        if (value > 100000 && value < 10000000) return value / 100000; // Valores entre 100k e 10M
                        if (value > 1000 && value < 100000) return value / 100; // Centavos
                        if (value < 100000 && value > 1) return value; // Valores diretos
                      }
                    }
                    
                    // Buscar em até 50 chaves (aumentar)
                    const entries = Object.entries(obj).slice(0, 50);
                    for (const [key, value] of entries) {
                      const keyLower = key.toLowerCase();
                      if ((keyLower.includes('price') || keyLower.includes('amount') || keyLower.includes('value')) && typeof value === 'number' && value > 0) {
                        // Shopee pode usar valores em centavos de milhão
                        if (value > 1000000) return value / 100000;
                        if (value > 100000 && value < 10000000) return value / 100000;
                        if (value > 1000 && value < 100000) return value / 100;
                        if (value < 100000 && value > 1) return value;
                      }
                      if (typeof value === 'object' && depth < 6) {
                        const found = findPriceInData(value, depth + 1);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const findNameInData = (obj, depth = 0) => {
                    if (depth > 6 || iterations++ > MAX_ITERATIONS) return null;
                    if (typeof obj !== 'object' || obj === null) return null;
                    
                    // Priorizar chaves comuns
                    const priorityKeys = ['name', 'title', 'productName', 'itemName', 'item_name', 'product_name', 'displayName', 'display_name'];
                    for (const priorityKey of priorityKeys) {
                      if (obj[priorityKey] && typeof obj[priorityKey] === 'string') {
                        const value = obj[priorityKey];
                        // Validação mais flexível: aceitar nomes de 5+ caracteres
                        if (value.length > 5 && value.length < 300 && !value.includes('__') && !value.includes('shopee__') && value !== 'Produto Shopee') {
                          // Verificar se tem pelo menos uma palavra com mais de 3 caracteres
                          const words = value.trim().split(/\s+/);
                          if (words.some(w => w.length > 3)) {
                            return value.trim();
                          }
                        }
                      }
                    }
                    
                    const entries = Object.entries(obj).slice(0, 30);
                    for (const [key, value] of entries) {
                      if (key.includes('__') || key.includes('setting') || key.includes('config')) continue;
                      const keyLower = key.toLowerCase();
                      if ((keyLower.includes('name') || keyLower.includes('title') || keyLower.includes('product')) && typeof value === 'string') {
                        if (value.length > 5 && value.length < 300 && !value.includes('__') && !value.includes('shopee__') && value !== 'Produto Shopee') {
                          const words = value.trim().split(/\s+/);
                          if (words.some(w => w.length > 3)) {
                            return value.trim();
                          }
                        }
                      }
                      if (typeof value === 'object' && depth < 4) {
                        const found = findNameInData(value, depth + 1);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  // Buscar preço
                  if (currentPrice === 0) {
                    iterations = 0;
                    const foundPrice = findPriceInData(jsonData);
                    if (foundPrice && foundPrice > 0 && foundPrice < 100000) {
                      currentPrice = foundPrice;
                      console.log(`   ✅ Preço encontrado em busca recursiva: ${currentPrice}`);
                    }
                  }
                  
                  // Buscar nome se ainda não encontrou
                  if (!name || name.length < 5) {
                    iterations = 0;
                    const foundName = findNameInData(jsonData);
                    if (foundName) {
                      name = foundName;
                      console.log(`   ✅ Nome encontrado em busca recursiva: ${name.substring(0, 50)}`);
                    }
                  }
                }
                
                // Se encontrou ambos, pode parar
                if (name && name.length > 5 && currentPrice > 0) {
                  break;
                }
              } catch (e) {
                // Continuar tentando
              }
            }
          } catch (e) {
            // Continuar com próximo script
          }
        }
      }

      // Tentar extrair do JSON-LD primeiro
      jsonLdScripts.each((i, el) => {
        const jsonLdPrice = $(el).data('jsonldPrice');
        if (jsonLdPrice && jsonLdPrice > 0) {
          currentPrice = currentPrice || jsonLdPrice;
          console.log(`   ✅ Preço encontrado no JSON-LD: ${currentPrice}`);
        }
      });

      // Tentar extrair preço atual com múltiplos seletores
      if (currentPrice === 0) {
        for (const selector of shopeeSelectors.price) {
          const priceText = $(selector).first().text();
          if (priceText) {
            currentPrice = this.parsePrice(priceText);
            if (currentPrice > 0) {
              console.log(`   ✅ Preço atual encontrado via seletor: ${selector} = ${currentPrice}`);
              break;
            }
          }
        }
        
        // Tentar buscar preço em qualquer elemento com classe contendo "price"
        if (currentPrice === 0) {
          $('[class*="price"], [class*="Price"], [data-testid*="price"], [data-testid*="Price"]').each((i, el) => {
            if (currentPrice > 0) return false; // Parar se já encontrou
            const text = $(el).text();
            const parsedPrice = this.parsePrice(text);
            if (parsedPrice > 0 && parsedPrice < 100000 && parsedPrice > 1) {
              currentPrice = parsedPrice;
              console.log(`   ✅ Preço encontrado via classe genérica: ${currentPrice}`);
              return false; // Parar iteração
            }
          });
        }
        
        // Última tentativa: buscar qualquer número que pareça preço no HTML
        if (currentPrice === 0) {
          // Primeiro tentar no HTML bruto (mais completo)
          const pricePatternsRaw = [
            /"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/gi,
            /"current_price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/gi,
            /"sale_price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/gi,
            /price["\s:]*["']?(\d+(?:[.,]\d+)?)["']?/gi
          ];
          
          for (const pattern of pricePatternsRaw) {
            const matches = response.data.match(pattern);
            if (matches) {
              for (const match of matches.slice(0, 10)) { // Limitar a 10 matches
                const priceMatch = match.match(/(\d+(?:[.,]\d+)?)/);
                if (priceMatch) {
                  let priceValue = parseFloat(priceMatch[1].replace(',', '.'));
                  // Shopee pode usar valores grandes (centavos de milhão)
                  if (priceValue > 1000000) priceValue = priceValue / 100000;
                  else if (priceValue > 100000 && priceValue < 10000000) priceValue = priceValue / 100000;
                  else if (priceValue > 1000 && priceValue < 100000) priceValue = priceValue / 100;
                  
                  if (priceValue > 1 && priceValue < 100000) {
                    currentPrice = priceValue;
                    console.log(`   ✅ Preço encontrado via padrão no HTML bruto: ${currentPrice}`);
                    break;
                  }
                }
              }
              if (currentPrice > 0) break;
            }
          }
          
          // Se ainda não encontrou, tentar no texto processado
          if (currentPrice === 0) {
            const allText = $('body').text();
            // Buscar padrões como R$ 99,90 ou 99.90
            const pricePatterns = [
              /R\$\s*(\d{1,3}(?:[.,]\d{2})?)/,
              /(\d{1,3}(?:[.,]\d{2})?)\s*reais?/i
            ];
            
            for (const pattern of pricePatterns) {
              const matches = allText.match(pattern);
              if (matches && matches[1]) {
                const priceValue = parseFloat(matches[1].replace(',', '.'));
                if (priceValue > 1 && priceValue < 100000) {
                  currentPrice = priceValue;
                  console.log(`   ✅ Preço encontrado via padrão de texto: ${currentPrice}`);
                  break;
                }
              }
            }
          }
        }
      }

      // Tentar extrair preço original com múltiplos seletores
      for (const selector of shopeeSelectors.oldPrice) {
        const oldPriceText = $(selector).first().text();
        if (oldPriceText) {
          const parsedOldPrice = this.parsePrice(oldPriceText);
          if (parsedOldPrice > 0 && parsedOldPrice > currentPrice) {
            oldPrice = parsedOldPrice;
            console.log(`   ✅ Preço original encontrado via seletor: ${selector} = ${oldPrice}`);
            break;
          }
        }
      }

      // Fallback: Buscar qualquer texto que pareça preço na página (mais agressivo)
      // LIMITAR: Processar apenas alguns scripts para evitar travamento
      if (currentPrice === 0 && scriptMatches) {
        // Tentar encontrar preço em script tags com JSON (Shopee usa isso)
        // Já buscamos em __INITIAL_STATE__, agora vamos buscar em outros padrões
        let fallbackScriptsProcessed = 0;
        const MAX_FALLBACK_SCRIPTS = 10; // Limitar número de scripts
        
          for (const scriptContent of scriptMatches) {
          if (fallbackScriptsProcessed >= MAX_FALLBACK_SCRIPTS) break;
          if (scriptContent.length > 100000) continue; // Pular scripts muito grandes
          
          fallbackScriptsProcessed++;
          
          try {
            // Buscar por padrões específicos de preço da Shopee (apenas primeiros matches)
            const pricePatterns = [
              /"price":\s*(\d+(?:\.\d+)?)/,
              /"currentPrice":\s*(\d+(?:\.\d+)?)/,
              /"salePrice":\s*(\d+(?:\.\d+)?)/
            ];
            
            for (const pattern of pricePatterns) {
              const match = scriptContent.match(pattern);
              if (match && match[1]) {
                let candidatePrice = parseFloat(match[1]);
                
                // Se o valor for muito grande, pode estar em centavos ou micros
                if (candidatePrice > 1000000) {
                  candidatePrice = candidatePrice / 100000; // Micros
                } else if (candidatePrice > 1000 && candidatePrice < 100000) {
                  candidatePrice = candidatePrice / 100; // Centavos
                }
                
                if (candidatePrice > 0 && candidatePrice < 100000) {
                  currentPrice = candidatePrice;
                  console.log(`   💡 Preço encontrado via padrão regex: ${currentPrice}`);
                  break;
                }
              }
            }
            
            if (currentPrice > 0) break;
            
            // Tentar encontrar JSON com preço (método mais genérico, mas limitado)
            // Limitar tamanho do JSON para evitar travamento
              const jsonMatch = scriptContent.match(/\{[\s\S]{100,5000}\}/);
            if (jsonMatch && jsonMatch[0].length < 5000) { // Limitar tamanho
                try {
                  const jsonData = JSON.parse(jsonMatch[0]);
                // Procurar recursivamente por campos que podem conter preço (com limite)
                let priceIterations = 0;
                  const findPrice = (obj, depth = 0) => {
                  if (depth > 3 || priceIterations++ > 100) return null; // Limites mais rígidos
                    if (typeof obj !== 'object' || obj === null) return null;

                  // Limitar número de chaves processadas
                  const entries = Object.entries(obj).slice(0, 15);
                  for (const [key, value] of entries) {
                      if (key.toLowerCase().includes('price') && typeof value === 'number' && value > 0) {
                      if (value > 1000000) return value / 100000;
                      if (value < 100000) return value;
                      }
                      if (key.toLowerCase().includes('price') && typeof value === 'string') {
                        const parsed = this.parsePrice(value);
                        if (parsed > 0 && parsed < 100000) return parsed;
                      }
                    if (typeof value === 'object' && depth < 2) {
                        const found = findPrice(value, depth + 1);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                priceIterations = 0;
                  const foundPrice = findPrice(jsonData);
                  if (foundPrice) {
                    currentPrice = foundPrice;
                    console.log(`   💡 Preço encontrado em JSON de script: ${currentPrice}`);
                    break;
                  }
                } catch (e) {
                  // Continuar tentando
                }
              }
            } catch (e) {
            // Continuar com próximo script
          }
        }

        // Tentar múltiplos padrões de preço no HTML
        const pricePatterns = [
          /R\$\s*([\d.,]+)/g,
          /price["\s:]*([\d.,]+)/gi,
          /valor["\s:]*R\$\s*([\d.,]+)/gi,
          /preço["\s:]*R\$\s*([\d.,]+)/gi,
          /"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/gi,
          /"price"\s*:\s*(\d+(?:\.\d+)?)/gi
        ];

        const allPrices = [];
        for (const pattern of pricePatterns) {
          const matches = response.data.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const price = this.parsePrice(match);
              if (price > 0 && price < 100000) {
                allPrices.push(price);
              }
            });
          }
        }

        if (allPrices.length > 0) {
          // Pegar o menor preço razoável (provavelmente é o preço atual)
          currentPrice = Math.min(...allPrices);
          console.log(`   💡 Preço encontrado via regex (fallback): ${currentPrice}`);
        }
      }

      // Fallback adicional: Tentar extrair do texto HTML bruto usando padrões específicos da Shopee
      // A Shopee usa renderização client-side, então precisamos procurar em script tags com dados JSON
      if ((!name || name.length < 5) && scriptMatches) {
        // Tentar encontrar dados em script tags com dados JSON (Shopee usa isso para hidratação)
        // LIMITAR: Processar apenas alguns scripts
        let nameScriptsProcessed = 0;
        const MAX_NAME_SCRIPTS = 10;
        
          for (const scriptContent of scriptMatches) {
          if (nameScriptsProcessed >= MAX_NAME_SCRIPTS) break;
          if (scriptContent.length > 100000) continue;
          
          nameScriptsProcessed++;
          
            try {
              // Tentar encontrar JSON estruturado
              const jsonMatch = scriptContent.match(/\{[\s\S]{100,5000}\}/);
              if (jsonMatch) {
                try {
                  const jsonData = JSON.parse(jsonMatch[0]);
                  // Procurar recursivamente por campos que podem conter o nome do produto
                  const findName = (obj, depth = 0) => {
                    if (depth > 5) return null; // Limitar profundidade
                    if (typeof obj !== 'object' || obj === null) return null;

                    for (const [key, value] of Object.entries(obj)) {
                      // Ignorar chaves que parecem settings ou configs
                      if (key.includes('setting') || key.includes('config') || key.includes('pref')) continue;

                      if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title')) {
                        if (typeof value === 'string' && value.length > 10 && value.length < 200) {
                          // Validação extra: nomes de produtos geralmente têm espaços
                          // Ignorar nomes com __ (geralmente IDs ou chaves internas como shopee__settings)
                          if (value.includes('__')) continue;
                          if (!value.includes(' ')) continue;

                          return value;
                        }
                      }
                      if (typeof value === 'object') {
                        const found = findName(value, depth + 1);
                        if (found) return found;
                      }
                    }
                    return null;
                  };

                  const foundName = findName(jsonData);
                  if (foundName) {
                    name = foundName.trim();
                    console.log(`   💡 Nome encontrado em JSON de script: ${name.substring(0, 50)}`);
                    break;
                  }
                } catch (e) {
                  // Continuar tentando outros scripts
                }
              }

              // Fallback: Procurar por padrões como "name": "..." ou productName: "..."
              const namePatterns = [
                /"name"\s*:\s*"([^"]{10,200})"/i,
                /productName["\s:]*["']([^"']{10,200})["']/i,
                /title["\s:]*["']([^"']{10,200})["']/i,
                /"product_name"\s*:\s*"([^"]{10,200})"/i,
                /item_name["\s:]*["']([^"']{10,200})["']/i
              ];

              for (const pattern of namePatterns) {
                const match = scriptContent.match(pattern);
                if (match && match[1] && match[1].length > 10) {
                  const candidate = match[1].trim();
                  // Validação: ignorar nomes com __ ou sem espaços
                  if (candidate.includes('__') || !candidate.includes(' ')) continue;

                  name = candidate;
                  console.log(`   💡 Nome encontrado via regex em script: ${name.substring(0, 50)}`);
                  break;
                }
              }
              if (name && name.length > 5) break;
            } catch (e) {
              // Continuar com próximo script
          }
        }

        // Se ainda não encontrou, tentar extrair do título da página mais agressivamente
        if (!name || name.length < 5) {
          // Buscar em qualquer elemento com classe que contenha "product", "item", "title"
          $('[class*="product"], [class*="item"], [class*="title"], [data-testid*="product"], [data-testid*="title"]').each((i, el) => {
            if (name && name.length > 10) return false;
            const text = $(el).text().trim();
            if (text.length > 10 && text.length < 200 && !text.toLowerCase().includes('shopee') && text.includes(' ')) {
              name = text.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
              if (name.length > 10) {
                console.log(`   💡 Nome encontrado em elemento com classe de produto: ${name.substring(0, 50)}`);
                return false;
              }
            }
          });
        }
        
        if (!name || name.length < 5) {
          const titleMatch = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            let title = titleMatch[1]
              .replace(/\s*[|-\u2013\u2014]\s*Shopee.*$/i, '') // Remover "| Shopee" ou similar
              .replace(/\s*-\s*Shopee.*$/i, '')
              .trim();
            if (title.length > 10) {
              name = title;
              console.log(`   💡 Nome extraído do título da página: ${name.substring(0, 50)}`);
            }
          }
        }
      }

      // Limpar e validar resultados
      name = this.cleanText(name);

      // Se ainda não temos nome, tentar do título da página de forma mais agressiva
      if (!name || name.length < 5) {
        const pageTitle = $('title').text();
        if (pageTitle) {
          // Limpar título mais agressivamente
          let title = pageTitle
            .split('|')[0]
            .split('-')[0]
            .replace(/\s*Shopee.*$/i, '')
            .replace(/\s*-\s*.*$/i, '')
            .trim();
          
          if (title.length > 5 && title.length < 200) {
            name = this.cleanText(title);
            if (name.length > 5) {
              console.log(`   💡 Nome extraído do título da página: ${name.substring(0, 50)}`);
            }
          }
        }
      }
      
      // Se ainda não temos nome, buscar em qualquer elemento com texto grande
      if (!name || name.length < 5) {
        // Buscar em elementos com classes específicas da Shopee
        const shopeeNameSelectors = [
          '[class*="product-name"]',
          '[class*="product_title"]',
          '[class*="item-name"]',
          '[data-testid*="product-name"]',
          '[data-testid*="product-title"]',
          '.pdp-product-name',
          '.product-title',
          '[class*="pdp"] [class*="name"]'
        ];
        
        for (const selector of shopeeNameSelectors) {
          const found = $(selector).first().text().trim();
          if (found && found.length > 10 && found.length < 200 && !found.toLowerCase().includes('shopee')) {
            name = found.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
            if (name.length > 10) {
              console.log(`   💡 Nome encontrado via seletor Shopee: ${name.substring(0, 50)}`);
              break;
            }
          }
        }
      }

      // Validar preços
      if (oldPrice > 0 && oldPrice <= currentPrice) {
        oldPrice = 0; // Desconto inválido
      }

      console.log('📦 Dados extraídos da Shopee:');
      console.log('   Nome:', name?.substring(0, 50) || 'N/A');
      console.log('   Preço Atual:', currentPrice || 'N/A');
      console.log('   Preço Original:', oldPrice || 'N/A');
      console.log('   Imagem:', imageUrl ? 'Sim' : 'Não');

      // Validar se extraímos pelo menos algum dado útil
      if (!name || name.trim().length === 0) {
        console.warn('⚠️ Nome do produto não foi extraído');
        console.warn('   📋 Debug: Verificando HTML...');
        // Debug: verificar se há algum texto na página
        const bodyText = $('body').text();
        console.warn(`   📋 Tamanho do texto do body: ${bodyText.length} caracteres`);
        if (bodyText.length < 100) {
          console.error('   ❌ Body muito pequeno, página pode estar vazia ou bloqueada');
        }
      }
      if (currentPrice === 0) {
        console.warn('⚠️ Preço do produto não foi extraído');
        // Debug: verificar se há números que parecem preços
        const allText = $('body').text();
        const priceMatches = allText.match(/R\$\s*[\d.,]+/g);
        if (priceMatches) {
          console.warn(`   📋 Preços encontrados no texto (mas não extraídos): ${priceMatches.slice(0, 5).join(', ')}`);
        }
      }

      const result = {
        name: name || '',
        description: this.cleanText(description),
        imageUrl: imageUrl || '',
        currentPrice: currentPrice || 0,
        oldPrice: oldPrice || 0,
        platform: 'shopee',
        affiliateLink: finalUrl
      };

      // Se não extraímos dados essenciais, fazer uma última tentativa agressiva
      if ((!name || name.trim().length === 0) && currentPrice === 0) {
        // Última tentativa: buscar em qualquer texto visível na página
        const bodyText = $('body').text();
        
        // Buscar nome em qualquer h1, h2, h3 que tenha mais de 10 caracteres
        $('h1, h2, h3, [role="heading"]').each((i, el) => {
          if (name && name.length > 10) return false;
          const headingText = $(el).text().trim();
          if (headingText.length > 10 && headingText.length < 200 && !headingText.toLowerCase().includes('shopee')) {
            name = headingText.replace(/\s*-\s*Shopee\s*$/i, '').replace(/\s*\|.*$/i, '').trim();
            if (name.length > 10) {
              console.log(`   💡 Nome encontrado em heading: ${name.substring(0, 50)}`);
              return false;
            }
          }
        });
        
        // Buscar preço em qualquer texto que contenha R$ seguido de número
        if (currentPrice === 0) {
          const priceMatches = bodyText.match(/R\$\s*(\d{1,4}(?:[.,]\d{2})?)/g);
          if (priceMatches && priceMatches.length > 0) {
            const prices = priceMatches.map(m => {
              const match = m.match(/R\$\s*(\d{1,4}(?:[.,]\d{2})?)/);
              return match ? this.parsePrice(match[1]) : 0;
            }).filter(p => p > 1 && p < 100000);
            
            if (prices.length > 0) {
              // Pegar o menor preço (provavelmente é o preço atual)
              currentPrice = Math.min(...prices);
              console.log(`   💡 Preço encontrado em texto da página: ${currentPrice}`);
            }
          }
        }
        
        // Se ainda não tiver nome, tentar extrair da URL
        if (!name || name.trim().length < 5) {
          const urlParts = finalUrl.split('/');
          if (urlParts.length > 0) {
            const lastPart = urlParts[urlParts.length - 1].split('?')[0];
            if (lastPart && lastPart.length > 3 && !lastPart.match(/^\d+$/)) {
              const candidate = decodeURIComponent(lastPart).replace(/-/g, ' ').trim();
              if (candidate.length > 5 && candidate.length < 100) {
                name = candidate;
                console.log(`   ⚠️ Usando nome extraído da URL: ${name.substring(0, 50)}`);
              }
            }
          }
        }
        
        // Se ainda não tiver nome válido, tentar uma última busca agressiva no HTML bruto
        if (!name || name.trim().length < 5 || name === 'Produto Shopee' || name === 'opaanlp') {
          console.warn('   ⚠️ Última tentativa: busca agressiva no HTML bruto...');
          
          // Buscar qualquer padrão que pareça nome de produto no HTML
          const namePatterns = [
            /"name"\s*:\s*"([^"]{15,200})"/i,
            /"item_name"\s*:\s*"([^"]{15,200})"/i,
            /"product_name"\s*:\s*"([^"]{15,200})"/i,
            /"title"\s*:\s*"([^"]{15,200})"/i,
            /<h1[^>]*>([^<]{15,200})<\/h1>/i,
            /data-name=["']([^"']{15,200})["']/i
          ];
          
          for (const pattern of namePatterns) {
            const matches = response.data.match(pattern);
            if (matches && matches[1]) {
              const candidate = matches[1].trim();
              if (candidate.length > 10 && candidate.length < 200 && 
                  !candidate.includes('__') && 
                  !candidate.includes('shopee__') &&
                  candidate !== 'Produto Shopee' &&
                  candidate !== 'opaanlp' &&
                  candidate.includes(' ')) {
                name = candidate;
                console.log(`   💡 Nome encontrado em busca agressiva: ${name.substring(0, 50)}`);
                break;
              }
            }
          }
          
          // Se ainda não encontrou, retornar erro
          if (!name || name.trim().length < 5 || name === 'Produto Shopee' || name === 'opaanlp') {
            console.error('❌ Falha na extração: Nome e preço não foram encontrados');
            console.error(`   📋 Debug: Tamanho do HTML: ${response.data.length} chars`);
            console.error(`   📋 Debug: Scripts encontrados: ${scriptMatches ? scriptMatches.length : 0}`);
            console.error(`   📋 Debug: URL final: ${cleanUrl}`);
            
            return {
              error: 'Não foi possível extrair informações do produto. O link pode estar inválido, o produto pode não estar mais disponível, ou a página pode estar bloqueando o acesso.',
              platform: 'shopee',
              affiliateLink: finalUrl,
              warning: 'A página da Shopee pode estar bloqueando o acesso ou retornando HTML diferente do esperado. Verifique se o link está correto e se o produto ainda está disponível.'
            };
          }
        }
        
        // Atualizar resultado com nome encontrado
        result.name = name;
        
        // Se ainda não temos preço, retornar com dados parciais mas com warning claro
        if (currentPrice === 0) {
          console.warn('⚠️ Preço não foi extraído, mas retornando dados parciais');
          return {
            ...result,
            currentPrice: 0,
            warning: 'Preço não pôde ser extraído. O produto pode estar indisponível ou o link pode estar inválido. Verifique se as credenciais da API Shopee estão corretas. O Partner ID atual está sendo rejeitado pela API.'
          };
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Erro ao extrair info Shopee:', error.message);
      console.error('   Stack:', error.stack);

      // Retornar erro ao invés de dados vazios
        return {
          error: `Erro ao extrair informações da Shopee: ${error.message}`,
          platform: 'shopee',
          affiliateLink: url
        };
      }
    })(); // Fechar extractionPromise
    
    // Usar Promise.race para aplicar timeout
    try {
      return await Promise.race([extractionPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Erro no timeout ou extração:', error.message);
      return {
        error: `Erro ao extrair informações da Shopee: ${error.message}`,
        platform: 'shopee',
        affiliateLink: url
      };
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

      // ============================================
      // ESTRATÉGIA: FOCAR NO PRODUTO PRINCIPAL
      // ============================================
      // Primeiro, identificar o container do produto principal
      // O produto principal geralmente está em .ui-pdp-main ou similar
      const mainProductContainer = $('.ui-pdp-main, .ui-pdp-container, [data-testid="product-detail"]').first();
      const isMainProduct = mainProductContainer.length > 0;

      console.log('   🔍 Container do produto principal encontrado:', isMainProduct);

      // ESTRATÉGIA: SCAN COMPLETO E FILTRAGEM
      // Em vez de confiar em um único seletor, vamos pegar TODOS os preços da página,
      // MAS priorizar os que estão no container do produto principal

      const allPrices = [];

      // Helper para limpar texto
      const hasRestrictedTerms = (text) => /cupom|off|desconto|economize/i.test(text);

      $('.andes-money-amount').each((i, el) => {
        const container = $(el);
        const price = extractFullPrice(container);
        if (price <= 0) return;

        // Verificar se está no container do produto principal
        const isInMainProduct = isMainProduct && container.closest('.ui-pdp-main, .ui-pdp-container, [data-testid="product-detail"]').length > 0;

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
        // 3. Detectar padrão de dois preços juntos: "R$78,08R$39,9849% OFF"
        // Se está na seção de preço e tem %OFF, verificar se há dois preços
        const isInPriceSection = container.closest('.ui-pdp-price').length;
        const hasPercentOff = /\d+%\s*OFF/i.test(parentText) || /\d+%\s*OFF/i.test(grandParentText);
        const fullContext = (parentText + ' ' + grandParentText);

        if (isInPriceSection && hasPercentOff) {
          // Extrair todos os preços do contexto
          const priceMatches = fullContext.match(/R\$\s*([\d.,]+)/g);
          if (priceMatches && priceMatches.length >= 2) {
            const prices = priceMatches.map(m => {
              const match = m.match(/R\$\s*([\d.,]+)/);
              return match ? this.parsePrice(match[1]) : 0;
            }).filter(p => p > 0);

            if (prices.length >= 2) {
              const maxPrice = Math.max(...prices);
              const minPrice = Math.min(...prices);

              // Se este preço é o menor e há um maior no contexto, é o preço atual com desconto
              if (price === minPrice && price < maxPrice && maxPrice - price > 1) {
                type = 'currentPrice';
                console.log('   💡 Padrão detectado: preço com desconto (menor):', price, 'vs original:', maxPrice);
              }
              // Se este preço é o maior, é o preço original
              else if (price === maxPrice && maxPrice > minPrice) {
                type = 'oldPrice';
                console.log('   💡 Padrão detectado: preço original (maior):', price);
              }
            }
          }
        }
        // 4. É preço atual principal? (detectar por seletores específicos - ANTES de classificar como cupom)
        else if (container.closest('.ui-pdp-price__second-line').length ||
          container.closest('.ui-pdp-price__part--medium').length ||
          container.closest('.ui-pdp-price__second-line .andes-money-amount').length) {
          // Se está na linha de preço principal e não é riscado, é o preço atual
          if (!container.closest('s').length && !container.closest('.ui-pdp-price__original-value').length) {
            type = 'currentPrice';
            console.log('   💡 Preço atual detectado via seletor específico:', price);
          }
        }
        // 5. Verificar se está na seção de preço principal com %OFF (ANTES de classificar como cupom)
        else if (type === 'candidate' && isInPriceSection && hasPercentOff) {
          // Se tem "% OFF no Pix" ou "% OFF" seguido de método de pagamento, é o preço atual
          const hasPaymentMethod = /no\s+pix|no\s+cartão|à\s+vista|em\s+\d+x/i.test(fullContext);

          // Se está na seção de preço principal e tem %OFF, é MUITO provável que seja o preço atual
          // NÃO um cupom separado, mas o preço com desconto do produto
          // Só classificar como cupom se estiver explicitamente em uma seção de cupom
          if (container.closest('.ui-pdp-coupon').length ||
            (/cupom|código|code/i.test(fullContext) && !hasPaymentMethod) ||
            container.closest('[class*="coupon"]').length) {
            // Está em seção de cupom explícita, pode ser cupom
            type = 'coupon';
            console.log('   ⚠️ Classificado como cupom (está em seção de cupom):', price);
          } else {
            // Está na seção de preço principal com %OFF, é o preço atual
            type = 'currentPrice';
            console.log('   💡 Preço atual detectado (na seção de preço com %OFF):', price);
          }
        }
        // 6. É Cupom ou Desconto? (só se não foi classificado como preço e NÃO está na seção de preço principal)
        else if (type === 'candidate') {
          // Verificar se tem termos restritivos ou está em seção de cupom
          if (hasRestrictedTerms(parentText) ||
            hasRestrictedTerms(grandParentText) ||
            container.closest('.ui-pdp-coupon').length ||
            container.closest('.andes-money-amount--discount').length ||
            /cupom|código|code|promoção/i.test(fullContext)) {
            type = 'coupon';
            // Tentar extrair código do cupom se existir no texto
            const codeMatch = parentText.match(/CUPOM\s+([A-Z0-9]+)/i) ||
              grandParentText.match(/CUPOM\s+([A-Z0-9]+)/i);
            if (codeMatch) {
              container.data('couponCode', codeMatch[1]);
            }
            console.log('   ⚠️ Classificado como cupom (termos restritivos):', price);
          }
        }

        allPrices.push({
          price,
          type,
          context: parentText.substring(0, 50),
          couponCode: container.data('couponCode'),
          priority: isInMainProduct ? 10 : (isMainProduct ? 1 : 5),
          isMainProduct: isInMainProduct
        });
      });

      console.log('📊 Todos os preços encontrados:', allPrices);

      // ETAPA DE RECLASSIFICAÇÃO: Corrigir preços mal classificados
      // Se um preço foi classificado como 'coupon' mas está na seção de preço principal
      // e é menor que qualquer oldPrice encontrado, provavelmente é o preço atual
      const oldPriceCandidatesForReclass = allPrices.filter(p => p.type === 'oldPrice');
      if (oldPriceCandidatesForReclass.length > 0) {
        // Agrupar oldPrice e currentPrice por contexto (produto)
        const priceGroups = {};
        allPrices.forEach(p => {
          if (p.type === 'oldPrice') {
            // Criar um grupo baseado no contexto próximo
            const contextKey = p.context.substring(0, 30);
            if (!priceGroups[contextKey]) {
              priceGroups[contextKey] = { oldPrice: p.price, coupons: [], candidates: [] };
            } else if (p.price > priceGroups[contextKey].oldPrice) {
              priceGroups[contextKey].oldPrice = p.price; // Pegar o maior oldPrice do grupo
            }
          }
        });

        // Agora reclassificar cupons que são na verdade preços atuais
        allPrices.forEach((priceObj, index) => {
          if (priceObj.type === 'coupon') {
            // Encontrar o oldPrice correspondente (mesmo contexto)
            const contextKey = priceObj.context.substring(0, 30);
            const group = priceGroups[contextKey];

            // Se não encontrou grupo, usar o maior oldPrice geral
            const relevantOldPrice = group ? group.oldPrice : Math.max(...oldPriceCandidatesForReclass.map(p => p.price));

            // Verificar se é um preço atual mal classificado
            if (priceObj.price < relevantOldPrice &&
              priceObj.price > (relevantOldPrice * 0.3) && // Pelo menos 30% do original
              !priceObj.couponCode && // Não tem código de cupom explícito
              (priceObj.context.includes('% OFF') || priceObj.context.includes('OFF'))) {
              console.log(`   🔄 Reclassificando preço de 'coupon' para 'currentPrice': ${priceObj.price} (oldPrice: ${relevantOldPrice})`);
              allPrices[index].type = 'currentPrice';
            }
          }
        });
      }

      // Decidir Old Price - PRIORIDADE: Seletores específicos primeiro
      const oldPriceSelectors = [
        '.ui-pdp-price__original-value .andes-money-amount__fraction',
        's .andes-money-amount__fraction',
        '.andes-money-amount--previous .andes-money-amount__fraction',
        '[class*="original"] .andes-money-amount__fraction'
      ];

      let oldPriceFound = false;
      for (const selector of oldPriceSelectors) {
        const oldPriceEl = $(selector).first();
        if (oldPriceEl.length) {
          const extractedOldPrice = extractFullPrice(oldPriceEl.closest('.andes-money-amount'));
          if (extractedOldPrice > 0) {
            oldPrice = extractedOldPrice;
            oldPriceFound = true;
            console.log('   ✅ Preço original encontrado via seletor:', selector, '=', oldPrice);
            break;
          }
        }
      }

      // Se não encontrou via seletor, usar candidatos classificados (priorizar produto principal)
      if (!oldPriceFound) {
        const oldPriceCandidates = allPrices
          .filter(p => p.type === 'oldPrice')
          .sort((a, b) => b.priority - a.priority); // Priorizar produto principal

        if (oldPriceCandidates.length > 0) {
          // Pegar o maior preço do produto principal, ou o maior geral se não houver
          const mainProductOldPrices = oldPriceCandidates.filter(p => p.isMainProduct);
          if (mainProductOldPrices.length > 0) {
            oldPrice = Math.max(...mainProductOldPrices.map(p => p.price));
            console.log('   ✅ Preço original encontrado no produto principal:', oldPrice);
          } else {
            oldPrice = Math.max(...oldPriceCandidates.map(p => p.price));
            console.log('   ✅ Preço original encontrado via classificação:', oldPrice);
          }
        }
      }

      // Decidir Current Price
      // ESTRATÉGIA MELHORADA: Buscar o preço principal da página
      // O preço atual geralmente está em uma seção específica de destaque

      // Tentar seletores específicos para preço atual (principal)
      const mainPriceSelectors = [
        '.ui-pdp-price__second-line .andes-money-amount__fraction',
        '.ui-pdp-price__part--medium .andes-money-amount__fraction',
        '.ui-pdp-price .andes-money-amount__fraction',
        '[data-testid="price"] .andes-money-amount__fraction'
      ];

      let mainPriceFound = false;
      for (const selector of mainPriceSelectors) {
        const mainPriceEl = $(selector).first();
        if (mainPriceEl.length) {
          const mainPrice = extractFullPrice(mainPriceEl.closest('.andes-money-amount'));
          if (mainPrice > 0) {
            currentPrice = mainPrice;
            mainPriceFound = true;
            console.log('   ✅ Preço principal encontrado via seletor:', selector, '=', currentPrice);
            break;
          }
        }
      }

      // Se não encontrou via seletor específico, usar lógica de candidatos
      if (!mainPriceFound) {
        // PRIORIDADE 1: Preços classificados como currentPrice (do produto principal)
        const currentPriceCandidates = allPrices
          .filter(p => p.type === 'currentPrice')
          .sort((a, b) => {
            // Priorizar produto principal
            if (a.isMainProduct && !b.isMainProduct) return -1;
            if (!a.isMainProduct && b.isMainProduct) return 1;
            // Se ambos ou nenhum são produto principal, priorizar o menor preço
            // (preço no Pix geralmente é menor que preço parcelado)
            return a.price - b.price;
          });

        if (currentPriceCandidates.length > 0) {
          // Pegar do produto principal primeiro, ou o menor preço se não houver produto principal
          const mainProductCurrent = currentPriceCandidates.find(p => p.isMainProduct);
          if (mainProductCurrent) {
            currentPrice = mainProductCurrent.price;
            console.log('   ✅ Preço atual encontrado no produto principal:', currentPrice);
            mainPriceFound = true;
          } else {
            // Se não há produto principal detectado, pegar o menor preço válido
            // (isso captura o preço no Pix que geralmente é o menor)
            currentPrice = currentPriceCandidates[0].price;
            console.log('   ✅ Preço atual encontrado (menor preço válido):', currentPrice);
            mainPriceFound = true;
          }
        }

        // PRIORIDADE 2: Se não encontrou, verificar se há preços classificados como 'coupon' 
        // que na verdade são preços atuais (estão na seção de preço principal)
        if (!mainPriceFound && oldPrice > 0) {
          // Verificar se há preços classificados como 'coupon' mas que estão na seção de preço
          // Se não há produto principal detectado, considerar todos os cupons que podem ser preços
          const couponPricesInPriceSection = allPrices
            .filter(p => {
              if (p.type !== 'coupon' || p.price >= oldPrice) return false;
              // Se há produto principal, priorizar ele; caso contrário, considerar todos
              return !isMainProduct || p.isMainProduct;
            })
            .sort((a, b) => {
              // Priorizar produto principal, depois o menor preço
              if (a.isMainProduct && !b.isMainProduct) return -1;
              if (!a.isMainProduct && b.isMainProduct) return 1;
              return a.price - b.price;
            });

          if (couponPricesInPriceSection.length > 0) {
            // Pegar o MENOR preço que seja válido (menor que oldPrice e pelo menos 30% do original)
            const possibleCurrentPrice = couponPricesInPriceSection.find(p =>
              p.price < oldPrice && p.price > (oldPrice * 0.3) // Pelo menos 30% do original
            );

            if (possibleCurrentPrice) {
              currentPrice = possibleCurrentPrice.price;
              mainPriceFound = true;
              console.log('   💡 Preço atual detectado (era classificado como cupom):', currentPrice);
            }
          }
        }

        // PRIORIDADE 3: Se ainda não encontrou, usar candidatos gerais (priorizar produto principal)
        if (!mainPriceFound) {
          const validCandidates = allPrices
            .filter(p =>
              p.type === 'candidate' &&
              p.price !== oldPrice &&
              p.price > 0
            )
            .sort((a, b) => b.priority - a.priority);

          if (validCandidates.length > 0) {
            // Filtrar valores muito baixos (provavelmente parcelas ou erros)
            const reasonableCandidates = validCandidates.filter(p => {
              // Se temos oldPrice, o currentPrice deve ser menor
              if (oldPrice > 0) {
                return p.price < oldPrice && p.price > (oldPrice * 0.3); // Pelo menos 30% do original
              }
              // Se não temos oldPrice, pegar o maior valor razoável
              return p.price > 10; // Mínimo R$ 10
            });

            if (reasonableCandidates.length > 0) {
              // Priorizar produto principal
              const mainProductCandidate = reasonableCandidates.find(p => p.isMainProduct);
              if (mainProductCandidate && oldPrice > 0 && mainProductCandidate.price < oldPrice) {
                currentPrice = mainProductCandidate.price;
                console.log('   ✅ Preço atual do produto principal:', currentPrice);
              } else if (oldPrice > 0) {
                // Se temos oldPrice, pegar o maior candidato que seja menor que oldPrice
                // MAS priorizar valores que estão próximos de uma porcentagem de desconto razoável
                const candidatesWithDiscount = reasonableCandidates
                  .filter(p => p.price < oldPrice)
                  .map(p => ({
                    ...p,
                    discount: ((oldPrice - p.price) / oldPrice) * 100
                  }))
                  .filter(p => p.discount >= 5 && p.discount <= 90); // Desconto entre 5% e 90%

                if (candidatesWithDiscount.length > 0) {
                  // Priorizar produto principal, mas pegar o MENOR preço válido (não o maior)
                  // O preço atual deve ser o menor preço válido que seja menor que o original
                  const mainProductWithDiscount = candidatesWithDiscount
                    .filter(p => p.isMainProduct)
                    .sort((a, b) => a.price - b.price); // Ordenar do menor para o maior

                  if (mainProductWithDiscount.length > 0) {
                    currentPrice = mainProductWithDiscount[0].price; // Pegar o menor
                    console.log('   ✅ Preço atual do produto principal (menor com desconto válido):', currentPrice);
                  } else {
                    // Se não tem do produto principal, pegar o menor geral
                    currentPrice = Math.min(...candidatesWithDiscount.map(p => p.price));
                    console.log('   ✅ Preço atual determinado (menor com desconto válido):', currentPrice);
                  }
                } else {
                  // Fallback: pegar o MENOR que seja menor que oldPrice (não o maior)
                  const validPrices = reasonableCandidates.filter(p => p.price < oldPrice);
                  if (validPrices.length > 0) {
                    currentPrice = Math.min(...validPrices.map(p => p.price));
                    console.log('   ✅ Preço atual determinado via candidatos (menor válido):', currentPrice);
                  }
                }
              } else {
                // Se não temos oldPrice, pegar o maior candidato
                currentPrice = Math.max(...reasonableCandidates.map(p => p.price));
                console.log('   ✅ Preço atual determinado via candidatos:', currentPrice);
              }
            } else if (validCandidates.length > 0) {
              // Fallback: usar o maior candidato mesmo que não passe no filtro
              const mainProductFallback = validCandidates.find(p => p.isMainProduct);
              if (mainProductFallback) {
                currentPrice = mainProductFallback.price;
              } else {
                currentPrice = Math.max(...validCandidates.map(p => p.price));
              }
              console.log('   ⚠️ Usando maior candidato (sem filtro):', currentPrice);
            }
          }
        }
      }

      // Decidir Fallback: JSON-LD e Meta se nada visual for encontrado
      if (!currentPrice) {
        const metaPrice = $('meta[itemprop="price"]').attr('content');
        if (metaPrice) currentPrice = parseFloat(metaPrice);
      }

      // Validação final antes de retornar
      let finalCurrentPrice = currentPrice;
      let finalOldPrice = 0;

      // Validar relação entre preços
      if (currentPrice > 0 && oldPrice > 0) {
        if (oldPrice > currentPrice) {
          // Relação válida: original > atual
          finalOldPrice = oldPrice;
          finalCurrentPrice = currentPrice;
          console.log('   ✅ Validação: oldPrice > currentPrice ✓');
          console.log('   📊 Preço Original:', finalOldPrice);
          console.log('   📊 Preço com Desconto:', finalCurrentPrice);
          console.log('   📊 Desconto:', (((finalOldPrice - finalCurrentPrice) / finalOldPrice) * 100).toFixed(2) + '%');
        } else {
          // Relação inválida
          console.log('   ⚠️ Validação falhou: oldPrice (' + oldPrice + ') não é maior que currentPrice (' + currentPrice + ')');
          console.log('   ⚠️ Descartando oldPrice inválido');
          finalOldPrice = 0;
        }
      } else if (currentPrice > 0) {
        finalCurrentPrice = currentPrice;
        console.log('   ℹ️ Apenas preço atual encontrado, sem desconto');
      }

      // Detecção de Cupom (DEPOIS da validação final)
      // IMPORTANTE: Não detectar como cupom se o valor for igual ou muito próximo do preço atual
      // (isso indica que foi mal classificado)
      let coupon = null;
      const couponCandidates = allPrices.filter(p =>
        p.type === 'coupon' &&
        p.price > 0 &&
        // Garantir que não é o preço atual mal classificado
        (finalCurrentPrice === 0 || Math.abs(p.price - finalCurrentPrice) > 1) &&
        // Garantir que tem código de cupom ou está em seção de cupom explícita
        (p.couponCode || p.context.toLowerCase().includes('cupom') || p.context.toLowerCase().includes('código'))
      );

      if (couponCandidates.length > 0) {
        // Priorizar cupom com código explícito
        const couponWithCode = couponCandidates.find(p => p.couponCode);
        const couponCandidate = couponWithCode || couponCandidates[0];

        const couponCode = couponCandidate.couponCode || `MELI-${Math.floor(Math.random() * 10000)}`;

        // Validar código do cupom antes de criar objeto
        const CouponValidator = (await import('../../utils/couponValidator.js')).default;
        const codeValidation = CouponValidator.validateCode(couponCode);

        if (codeValidation.valid) {
          coupon = {
            discount_value: couponCandidate.price,
            discount_type: 'fixed', // Assumindo R$ fixo por enquanto
            code: couponCode,
            platform: 'mercadolivre'
          };
          console.log('   🎟️ Cupom detectado:', coupon);
        } else {
          console.log(`   ⚠️ Cupom rejeitado (código inválido): ${couponCode} - ${codeValidation.reason}`);
        }
      }

      console.log('\n   ✅ === DECISÃO FINAL DO SCRAPING ===');
      console.log('   Preço Atual (final):', finalCurrentPrice);
      console.log('   Preço Original (final):', finalOldPrice || 'N/A');

      return {
        currentPrice: finalCurrentPrice,
        oldPrice: finalOldPrice,
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
    const originalText = text; // Guardar para debug

    // Remover "R$" ou outros prefixos, mas manter números, pontos e vírgulas
    text = text.replace(/[^\d.,]/g, '');

    // Se não sobrou nada, retornar 0
    if (!text || text.length === 0) return 0;

    // Caso especial: apenas números inteiros (ex: "1200", "18465", "3183")
    if (/^\d+$/.test(text)) {
      const numValue = parseFloat(text);
      
      // Se for um número entre 100 e 100000, pode estar em centavos
      // Exemplos: 18465 centavos = R$ 184,65 | 3183 centavos = R$ 31,83
      if (numValue >= 100 && numValue < 100000) {
        const priceInReais = numValue / 100;
        // Validar se faz sentido (entre R$ 1 e R$ 10000)
        if (priceInReais >= 1 && priceInReais <= 10000) {
          console.log(`   💡 parsePrice: Convertendo centavos "${originalText}" (${numValue}) -> R$ ${priceInReais.toFixed(2)}`);
          return priceInReais;
        }
      }
      
      // Se for muito grande (> 100000), definitivamente está em centavos
      if (numValue >= 100000 && numValue < 10000000) {
        const priceInReais = numValue / 100;
        if (priceInReais >= 1 && priceInReais <= 10000) {
          console.log(`   💡 parsePrice: Convertendo centavos (grande) "${originalText}" (${numValue}) -> R$ ${priceInReais.toFixed(2)}`);
          return priceInReais;
        }
      }
      
      // Se não, retornar o valor direto (pode ser um preço pequeno já em reais)
      return numValue;
    }

    // Caso BRL: "1.200,50" ou "1200,50" ou "184,65" ou "184.65"
    if (text.includes(',')) {
      // Remove pontos de milhar (ex: "1.200,50" -> "1200,50")
      text = text.replace(/\./g, '');
      // Troca vírgula decimal por ponto (ex: "1200,50" -> "1200.50")
      text = text.replace(',', '.');
    } else if (text.includes('.')) {
      // Se tem ponto mas não vírgula, pode ser:
      // - Formato US: "184.65" (184 dólares e 65 centavos) -> 184.65
      // - Formato BR: "1.200" (mil e duzentos) -> 1200
      
      // Contar quantos pontos existem
      const dotCount = (text.match(/\./g) || []).length;
      
      if (dotCount === 1) {
        // Um ponto: pode ser decimal US ou número BR pequeno
        // Se o que vem depois do ponto tem 2 dígitos, provavelmente é decimal
        const parts = text.split('.');
        if (parts[1] && parts[1].length === 2 && parseInt(parts[1]) < 100) {
          // Provavelmente formato decimal (ex: "184.65")
          const price = parseFloat(text);
          // Se o preço parseado for muito grande, pode estar em centavos
          if (price > 100 && price < 100000) {
            const priceInReais = price / 100;
            if (priceInReais >= 1 && priceInReais <= 10000) {
              console.log(`   💡 parsePrice: Convertendo centavos (ponto) "${originalText}" (${price}) -> R$ ${priceInReais.toFixed(2)}`);
              return priceInReais;
            }
          }
          return price;
        } else {
          // Provavelmente número BR sem vírgula (ex: "1200")
          return parseFloat(text.replace('.', ''));
        }
      } else {
        // Múltiplos pontos: formato BR de milhar (ex: "1.200.50")
        // Remover todos os pontos
        text = text.replace(/\./g, '');
      }
    }

    const price = parseFloat(text);
    
    // Validação final: se o preço parseado for muito grande (> 100), pode estar em centavos
    if (!isNaN(price) && price >= 100 && price < 100000) {
      const priceInReais = price / 100;
      if (priceInReais >= 1 && priceInReais <= 10000) {
        console.log(`   💡 parsePrice: Convertendo centavos (final) "${originalText}" (${price}) -> R$ ${priceInReais.toFixed(2)}`);
        return priceInReais;
      }
    }
    
    return isNaN(price) ? 0 : price;
  }

  // Extrair ID do produto do Mercado Livre da URL
  extractMeliProductId(url) {
    // Padrões: MLB-123456789, MLB123456789, /p/MLB123456789, /item/MLB123456789
    const patterns = [
      /\/p\/MLB-?(\d+)/i,           // /p/MLB123 (catalog)
      /\/item\/MLB-?(\d+)/i,        // /item/MLB123
      /\/MLB-?(\d+)/i,              // /MLB123 em qualquer lugar
      /MLB-?(\d+)/i                 // MLB123 em qualquer lugar (mais genérico)
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const productId = 'MLB' + match[1];
        console.log(`   🔍 ID extraído da URL (${pattern}):`, productId);
        return productId;
      }
    }
    
    // Se não encontrou, pode ser que precise seguir redirecionamento
    console.log('   ⚠️ Nenhum ID encontrado na URL, pode precisar seguir redirecionamento');
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

      // ============================================
      // EXTRAÇÃO ROBUSTA DE PREÇOS
      // ============================================
      console.log('\n💰 === ANÁLISE PROFUNDA DE PREÇOS ===');
      console.log('📋 Dados brutos da API do produto:');
      console.log('   - product.price:', product.price);
      console.log('   - product.original_price:', product.original_price);
      console.log('   - product.base_price:', product.base_price);
      console.log('   - product.currency_id:', product.currency_id);

      // Fonte 1: API oficial (mais confiável)
      const apiCurrentPrice = product.price || 0;
      const apiOriginalPrice = product.original_price || 0;
      const apiBasePrice = product.base_price || 0;

      console.log('\n📊 Dados processados da API:');
      console.log('   - Preço atual (price): R$', apiCurrentPrice);
      console.log('   - Preço original (original_price): R$', apiOriginalPrice || 'N/A');
      console.log('   - Preço base (base_price): R$', apiBasePrice || 'N/A');

      // Inicializar variáveis finais
      let currentPrice = apiCurrentPrice;
      let oldPrice = 0;

      // REGRA 1: Se a API tem original_price, usar diretamente
      if (apiOriginalPrice > 0 && apiOriginalPrice > apiCurrentPrice) {
        oldPrice = apiOriginalPrice;
        currentPrice = apiCurrentPrice;
        console.log('   ✅ Desconto confirmado pela API:');
        console.log('      Preço Original: R$', oldPrice);
        console.log('      Preço com Desconto: R$', currentPrice);
        console.log('      Desconto: ' + (((oldPrice - currentPrice) / oldPrice) * 100).toFixed(2) + '%');
      } else if (apiBasePrice > 0 && apiBasePrice > apiCurrentPrice) {
        // Tentar base_price como fallback
        oldPrice = apiBasePrice;
        currentPrice = apiCurrentPrice;
        console.log('   ✅ Desconto detectado via base_price:');
        console.log('      Preço Original (base_price): R$', oldPrice);
        console.log('      Preço com Desconto: R$', currentPrice);
      } else {
        console.log('   ⚠️ API não retornou desconto válido');
        console.log('   ⚠️ Verificando se price já está com desconto aplicado...');
      }

      // REGRA 2: Analisar título para encontrar preços adicionais
      let coupon = null;
      const titlePrices = [];

      if (product.title) {
        console.log('\n📝 Analisando título:', product.title.substring(0, 100) + '...');

        // Detectar cupom explícito
        const couponMatch = product.title.match(/Cupom\s+(?:de\s+)?R\$\s*([\d.,]+)/i) ||
          product.title.match(/R\$\s*([\d.,]+)\s+OFF/i);

        if (couponMatch) {
          const couponValue = this.parsePrice(couponMatch[1]);
          if (couponValue > 0) {
            const couponCode = `MELI-${Math.floor(Math.random() * 10000)}`;

            // Validar código do cupom (usar import dinâmico para evitar dependência circular)
            try {
              const CouponValidator = (await import('../../utils/couponValidator.js')).default;
              const codeValidation = CouponValidator.validateCode(couponCode);

              if (codeValidation.valid) {
                coupon = {
                  discount_value: couponValue,
                  discount_type: 'fixed',
                  code: couponCode,
                  platform: 'mercadolivre'
                };
                console.log('   🎟️ Cupom detectado no título:', coupon);
              } else {
                console.log(`   ⚠️ Cupom do título rejeitado (código inválido): ${couponCode} - ${codeValidation.reason}`);
              }
            } catch (error) {
              // Se não conseguir validar, criar cupom mesmo assim (fallback)
              coupon = {
                discount_value: couponValue,
                discount_type: 'fixed',
                code: couponCode,
                platform: 'mercadolivre'
              };
              console.log('   🎟️ Cupom detectado no título (sem validação):', coupon);
            }
          }
        }

        // Extrair TODOS os preços do título
        const allPriceMatches = product.title.match(/R\$\s*([\d.,]+)/g);
        if (allPriceMatches && allPriceMatches.length > 0) {
          console.log('   💡 Preços encontrados no título:', allPriceMatches);

          allPriceMatches.forEach(match => {
            const priceMatch = match.match(/R\$\s*([\d.,]+)/);
            if (priceMatch) {
              const parsedPrice = this.parsePrice(priceMatch[1]);
              if (parsedPrice > 0) {
                titlePrices.push(parsedPrice);
              }
            }
          });

          console.log('   💰 Preços parseados do título:', titlePrices);

          if (titlePrices.length > 0) {
            // Ordenar preços do maior para o menor
            titlePrices.sort((a, b) => b - a);
            const maxTitlePrice = titlePrices[0];
            const minTitlePrice = titlePrices[titlePrices.length - 1];

            console.log('   📊 Maior preço no título:', maxTitlePrice);
            console.log('   📊 Menor preço no título:', minTitlePrice);
            console.log('   📊 Preço atual da API:', currentPrice);

            // REGRA 3: Se o maior preço do título for MAIOR que o da API
            // e a diferença for significativa (>5%), então o título tem o preço original
            if (oldPrice === 0 && maxTitlePrice > currentPrice) {
              const priceDiff = maxTitlePrice - currentPrice;
              const priceDiffPercent = (priceDiff / currentPrice) * 100;

              if (priceDiffPercent > 5) {
                // O título tem o preço original, a API tem o preço com desconto
                oldPrice = maxTitlePrice;
                console.log('   ✅ Desconto detectado comparando título com API!');
                console.log('   📊 Preço Original (título):', oldPrice);
                console.log('   📊 Preço com Desconto (API):', currentPrice);
                console.log('   📊 Diferença:', priceDiffPercent.toFixed(2) + '%');
              } else {
                console.log('   ⚠️ Diferença muito pequena (<5%), ignorando:', priceDiffPercent.toFixed(2) + '%');
              }
            } else if (oldPrice > 0) {
              // Já temos desconto da API, validar se o título confirma
              if (Math.abs(maxTitlePrice - oldPrice) < (oldPrice * 0.1)) {
                console.log('   ✅ Título confirma o preço original da API');
              } else if (maxTitlePrice > oldPrice) {
                // Título tem preço ainda maior, usar ele
                console.log('   🔄 Título tem preço original maior, atualizando:', oldPrice, '→', maxTitlePrice);
                oldPrice = maxTitlePrice;
              }
            }
          }
        }
      }

      // REGRA 4: Validação final
      // Garantir que oldPrice > currentPrice para haver desconto válido
      if (oldPrice > 0 && oldPrice <= currentPrice) {
        console.log('   ⚠️ oldPrice não é maior que currentPrice, removendo desconto inválido');
        oldPrice = 0;
      }

      // REGRA 5: Se ainda não temos desconto mas temos cupom, 
      // o cupom pode indicar que há desconto não capturado
      if (oldPrice === 0 && coupon && coupon.discount_value > 0) {
        // Se temos cupom, pode haver desconto não capturado
        // Mas não vamos inventar preços, apenas logar
        console.log('   ℹ️ Cupom encontrado mas sem preço original detectado');
      }

      console.log('\n✅ === RESULTADO FINAL ===');
      console.log('   Preço Atual (com desconto):', currentPrice);
      console.log('   Preço Original (sem desconto):', oldPrice || 'N/A');
      console.log('   Tem Desconto:', oldPrice > 0);
      console.log('   Tem Cupom:', !!coupon);

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

      // Validação final antes de retornar
      // Garantir que oldPrice só existe se for maior que currentPrice
      const finalOldPrice = (oldPrice > 0 && oldPrice > currentPrice) ? oldPrice : 0;
      const finalCurrentPrice = currentPrice > 0 ? currentPrice : 0;

      console.log('\n📦 === DADOS FINAIS PARA RETORNO ===');
      console.log('   Nome:', cleanTitle.substring(0, 50) + '...');
      console.log('   Preço Atual (final):', finalCurrentPrice);
      console.log('   Preço Original (final):', finalOldPrice || 'N/A');
      console.log('   Tem Desconto:', finalOldPrice > 0);
      console.log('   Tem Cupom:', !!coupon);
      console.log('   Percentual de Desconto:', finalOldPrice > 0
        ? (((finalOldPrice - finalCurrentPrice) / finalOldPrice) * 100).toFixed(2) + '%'
        : '0%');

      return {
        name: cleanTitle,
        description: product.subtitle || cleanTitle,
        imageUrl: product.thumbnail || product.pictures?.[0]?.url || '',
        currentPrice: finalCurrentPrice,
        oldPrice: finalOldPrice,
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
      // Se for link encurtado (/sec/), tentar seguir redirecionamento primeiro
      if (url.includes('/sec/')) {
        console.log('🔗 Link encurtado do ML detectado, seguindo redirecionamento...');
        try {
          const finalUrl = await this.followRedirects(url);
          if (finalUrl !== url) {
            console.log('✅ URL final obtida:', finalUrl);
            url = finalUrl;
          }
        } catch (e) {
          console.warn('⚠️ Falha ao seguir redirecionamento, tentando com URL original');
        }
      }
      
      // PRIMEIRO: Tentar usar a API oficial (mais rápido e preciso)
      let productId = this.extractMeliProductId(url);
      
      // Se não encontrou ID e é link encurtado, não conseguiu seguir redirecionamento
      if (!productId && url.includes('/sec/')) {
        console.log('⚠️ Não foi possível extrair ID de link encurtado');
        return {
          error: 'Não foi possível processar este link. Tente copiar o link direto do produto.',
          platform: 'mercadolivre',
          affiliateLink: url
        };
      }
      
      if (productId) {
        console.log('✅ ID do produto encontrado:', productId);
        const apiData = await this.getMeliProductFromAPI(productId);
        if (apiData) {
          console.log('✅ Dados obtidos via API do Mercado Livre!');

          // Se a API não retornou desconto, tentar scraping para pegar
          if (apiData.oldPrice === 0) {
            console.log('\n⚠️ API não retornou desconto, tentando scraping...');
            const scrapedData = await this.scrapeMeliPrices(url);

            console.log('📊 Dados do scraping:');
            console.log('   - currentPrice:', scrapedData.currentPrice);
            console.log('   - oldPrice:', scrapedData.oldPrice);
            console.log('   - apiData.currentPrice:', apiData.currentPrice);

            // Validar dados do scraping antes de usar
            if (scrapedData.oldPrice > 0 && scrapedData.currentPrice > 0) {
              // Se scraping tem ambos os preços e relação válida
              if (scrapedData.oldPrice > scrapedData.currentPrice) {
                console.log('✅ Desconto válido encontrado via scraping!');
                apiData.oldPrice = scrapedData.oldPrice;
                // Usar currentPrice do scraping se for diferente e válido
                if (Math.abs(scrapedData.currentPrice - apiData.currentPrice) > 1) {
                  console.log('   🔄 Atualizando currentPrice do scraping:', apiData.currentPrice, '→', scrapedData.currentPrice);
                  apiData.currentPrice = scrapedData.currentPrice;
                }
              } else {
                console.log('   ⚠️ Scraping retornou relação inválida, ignorando oldPrice');
              }
            } else if (scrapedData.oldPrice > 0 && scrapedData.oldPrice > apiData.currentPrice) {
              // Só temos oldPrice do scraping, mas é válido
              console.log('✅ Preço original encontrado via scraping!');
              apiData.oldPrice = scrapedData.oldPrice;
            }

            if (scrapedData.coupon) {
              console.log('✅ Cupom encontrado via scraping!');
              apiData.coupon = scrapedData.coupon;
            }
          } else {
            // API já retornou desconto, mas vamos validar com scraping
            console.log('\n🔍 Validando dados da API com scraping...');
            const scrapedData = await this.scrapeMeliPrices(url);

            // Se scraping encontrou valores diferentes, verificar qual é mais confiável
            if (scrapedData.oldPrice > 0 && scrapedData.currentPrice > 0) {
              const apiDiff = apiData.oldPrice - apiData.currentPrice;
              const scrapedDiff = scrapedData.oldPrice - scrapedData.currentPrice;

              console.log('   📊 Diferença API:', apiDiff);
              console.log('   📊 Diferença Scraping:', scrapedDiff);

              // Se scraping tem diferença maior (mais desconto), pode ser mais atualizado
              if (scrapedDiff > apiDiff * 1.1) {
                console.log('   🔄 Scraping tem desconto maior, atualizando valores...');
                apiData.oldPrice = scrapedData.oldPrice;
                apiData.currentPrice = scrapedData.currentPrice;
              }
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
      // Só usar oldPrice do scraping se for maior que o currentPrice
      if (priceData.oldPrice > 0 && priceData.oldPrice > result.currentPrice) {
        result.oldPrice = priceData.oldPrice;
      }
      // Só usar currentPrice do scraping se for válido e diferente do atual
      if (priceData.currentPrice > 0 && priceData.currentPrice !== result.currentPrice) {
        // Se o scraping encontrou um preço menor, pode ser mais atualizado
        if (priceData.currentPrice < result.currentPrice || result.currentPrice === 0) {
          result.currentPrice = priceData.currentPrice;
        }
      }

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

  // Extrair informações da Amazon via web scraping
  async extractAmazonInfo(url) {
    try {
      console.log('🔍 Iniciando extração de informações da Amazon:', url);

      // Se for link encurtado (amzn.to) ou qualquer link da Amazon, SEMPRE seguir redirecionamentos primeiro
      // Links encurtados da Amazon não contêm o ASIN diretamente
      if (url.includes('amzn.to') || url.includes('amazon.com.br/gp/') || !url.match(/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i)) {
        console.log('   🔄 Link encurtado ou sem ASIN detectado, seguindo redirecionamentos...');
        try {
          const finalUrl = await this.followRedirects(url);
          if (finalUrl !== url) {
            console.log(`   ✅ URL final obtida: ${finalUrl}`);
            url = finalUrl;
          } else {
            console.log('   ⚠️ URL não mudou após seguir redirecionamentos');
          }
        } catch (e) {
          console.warn(`   ⚠️ Falha ao seguir redirecionamento: ${e.message}`);
          // Continuar tentando extrair ASIN da URL original
        }
      }

      // Extrair ASIN da URL (após redirecionamentos)
      const asinMatch = url.match(/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
      const asin = asinMatch ? asinMatch[1] : null;

      if (!asin) {
        console.log('⚠️ ASIN não encontrado na URL');
        return {
          error: 'Não foi possível identificar o produto (ASIN não encontrado na URL). Certifique-se de que o link é válido e aponta para um produto da Amazon.',
          platform: 'amazon',
          affiliateLink: url
        };
      }

      console.log(`   ✅ ASIN identificado: ${asin}`);

      // Fazer requisição à página do produto
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.amazon.com.br/',
          'Connection': 'keep-alive'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Extrair nome do produto
      let name = '';
      const nameSelectors = [
        '#productTitle',
        'h1.a-size-large',
        'h1[data-automation-id="title"]',
        '#title',
        'span#productTitle'
      ];

      for (const selector of nameSelectors) {
        const nameElement = $(selector).first();
        if (nameElement.length) {
          name = nameElement.text().trim();
          if (name && name.length > 5) {
            console.log(`   ✅ Nome encontrado: ${name.substring(0, 50)}...`);
            break;
          }
        }
      }

      // Fallback: buscar em JSON-LD ou scripts
      if (!name || name.length < 5) {
        const scripts = $('script[type="application/ld+json"]');
        scripts.each((i, script) => {
          try {
            const jsonData = JSON.parse($(script).html());
            if (jsonData.name && jsonData.name.length > 5) {
              name = jsonData.name.trim();
              console.log(`   💡 Nome encontrado em JSON-LD: ${name.substring(0, 50)}...`);
              return false; // break
            }
          } catch (e) {
            // Continuar tentando
          }
        });
      }

      // Extrair preços
      let currentPrice = 0;
      let oldPrice = 0;

      // Seletor para preço atual
      const priceSelectors = [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-whole',
        'span.a-price[data-a-color="base"] .a-offscreen',
        '[data-a-color="price"] .a-offscreen'
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length) {
          const priceText = priceElement.text().trim();
          const price = this.parsePrice(priceText);
          if (price > 0) {
            currentPrice = price;
            console.log(`   ✅ Preço atual encontrado: R$ ${currentPrice.toFixed(2)}`);
            break;
          }
        }
      }

      // Preço original (riscado)
      const oldPriceSelectors = [
        '.a-price.a-text-price .a-offscreen',
        '#priceblock_saleprice',
        '.basisPrice .a-offscreen',
        'span.a-price.a-text-price[data-a-strike="true"] .a-offscreen'
      ];

      for (const selector of oldPriceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length) {
          const priceText = priceElement.text().trim();
          const price = this.parsePrice(priceText);
          if (price > 0 && price > currentPrice) {
            oldPrice = price;
            console.log(`   ✅ Preço original encontrado: R$ ${oldPrice.toFixed(2)}`);
            break;
          }
        }
      }

      // Extrair imagem
      let imageUrl = '';
      const imageSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '#main-image',
        '#imageBlock_feature_div img',
        '#product-image img',
        'img[data-old-hires]'
      ];

      for (const selector of imageSelectors) {
        const imgElement = $(selector).first();
        if (imgElement.length) {
          imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-old-hires');
          if (imageUrl && imageUrl.startsWith('http')) {
            console.log(`   ✅ Imagem encontrada`);
            break;
          }
        }
      }

      // Gerar link de afiliado (se tiver partner tag configurado)
      let affiliateLink = url;
      try {
        const AppSettings = (await import('../models/AppSettings.js')).default;
        const config = await AppSettings.getAmazonConfig();
        if (config.partnerTag) {
          const urlObj = new URL(url);
          urlObj.searchParams.set('tag', config.partnerTag);
          affiliateLink = urlObj.toString();
          console.log(`   ✅ Link de afiliado gerado`);
        }
      } catch (e) {
        console.log(`   ⚠️ Não foi possível gerar link de afiliado: ${e.message}`);
      }

      // Validar dados mínimos
      if (!name || name.length < 5) {
        return {
          error: 'Não foi possível extrair o nome do produto',
          platform: 'amazon',
          affiliateLink: affiliateLink
        };
      }

      if (currentPrice <= 0) {
        return {
          error: 'Não foi possível extrair o preço do produto',
          platform: 'amazon',
          name: name,
          affiliateLink: affiliateLink,
          imageUrl: imageUrl
        };
      }

      console.log(`✅ Extração Amazon concluída: ${name.substring(0, 30)}... - R$ ${currentPrice.toFixed(2)}`);

      return {
        platform: 'amazon',
        name: name,
        currentPrice: currentPrice,
        oldPrice: oldPrice > currentPrice ? oldPrice : null,
        imageUrl: imageUrl,
        affiliateLink: affiliateLink,
        asin: asin
      };
    } catch (error) {
      console.error('❌ Erro ao extrair informações da Amazon:', error.message);
      throw error;
    }
  }

  // Extrair informações do AliExpress via web scraping
  async extractAliExpressInfo(url) {
    try {
      console.log('🔍 Iniciando extração de informações do AliExpress:', url);

      // Se for link encurtado, seguir redirecionamentos primeiro
      if (url.includes('s.click.aliexpress.com') || url.includes('aliexpress.com/e/_')) {
        console.log('   🔄 Link encurtado detectado, seguindo redirecionamentos...');
        try {
          const finalUrl = await this.followRedirects(url, 3); // Limitar a 3 tentativas para AliExpress
          
          // Verificar se a URL final é válida (não é página de erro/login)
          if (finalUrl.includes('/error/') || finalUrl.includes('/404') || finalUrl.includes('/login')) {
            console.warn(`   ⚠️ URL final é página de erro/login, tentando extrair URL de produto da URL original`);
            
            // Tentar extrair ID do produto da URL original ou de algum redirecionamento anterior
            // Se a URL original tinha parâmetros que indicam produto, tentar construir URL direta
            const productIdMatch = url.match(/[?&]item[_-]?id=(\d+)/i) || 
                                  finalUrl.match(/item\/(\d+)/) ||
                                  url.match(/\/e\/_([a-zA-Z0-9]+)/);
            
            if (productIdMatch && productIdMatch[1]) {
              // Se encontrou ID, construir URL direta do produto
              const productId = productIdMatch[1];
              url = `https://pt.aliexpress.com/item/${productId}.html`;
              console.log(`   💡 Construída URL direta do produto: ${url}`);
            } else {
              // Se não conseguiu, usar a URL original e tentar extrair mesmo assim
              console.warn(`   ⚠️ Não foi possível extrair ID do produto, usando URL original`);
              url = url; // Manter URL original
            }
          } else if (finalUrl !== url) {
            console.log(`   ✅ URL final obtida: ${finalUrl}`);
            url = finalUrl;
          }
        } catch (e) {
          console.warn(`   ⚠️ Falha ao seguir redirecionamento: ${e.message}`);
          // Tentar extrair ID do produto da URL original
          const productIdMatch = url.match(/[?&]item[_-]?id=(\d+)/i);
          if (productIdMatch && productIdMatch[1]) {
            url = `https://pt.aliexpress.com/item/${productIdMatch[1]}.html`;
            console.log(`   💡 Construída URL direta do produto após erro: ${url}`);
          }
        }
      }
      
      // Garantir que a URL é uma URL de produto válida
      if (!url.includes('aliexpress.com/item/') && !url.includes('aliexpress.com/i/')) {
        // Tentar extrair ID do produto de parâmetros da URL
        const productIdMatch = url.match(/[?&]item[_-]?id=(\d+)/i) || url.match(/\/(\d{10,})\.html/);
        if (productIdMatch && productIdMatch[1]) {
          url = `https://pt.aliexpress.com/item/${productIdMatch[1]}.html`;
          console.log(`   💡 URL reconstruída para produto: ${url}`);
        } else {
          throw new Error('URL não parece ser de um produto AliExpress válido');
        }
      }
      
      // Tentar extrair preço dos parâmetros da URL (pdp_npi pode conter preços codificados)
      // NOTA: O pdp_npi pode conter valores em diferentes formatos, então vamos usar apenas como fallback
      // e priorizar a extração do HTML da página
      let priceFromUrl = null;
      let oldPriceFromUrl = null;
      try {
        const urlObj = new URL(url);
        const pdpNpi = urlObj.searchParams.get('pdp_npi');
        if (pdpNpi) {
          // pdp_npi parece ser: 4@dis!BRL!535.07!190.65!!89.32!31.83
          // Decodificar e extrair preços
          const decoded = decodeURIComponent(pdpNpi);
          console.log(`   🔍 Parâmetro pdp_npi encontrado: ${decoded.substring(0, 100)}...`);
          
          // O formato parece ser: 4@dis!BRL!preco1!preco2!!preco3!preco4
          // Separar por ! e buscar valores numéricos que parecem preços (com decimais)
          const parts = decoded.split('!');
          const prices = [];
          
          for (const part of parts) {
            // Ignorar partes que não são números ou que são muito pequenas
            if (part.length < 3) continue;
            
            // Buscar padrões de preço: números com ponto ou vírgula (ex: "535.07", "190.65")
            const priceMatch = part.match(/(\d+[.,]\d{2})/);
            if (priceMatch) {
              const price = this.parsePrice(priceMatch[1]);
              // Validar: preços devem estar entre R$ 1 e R$ 10000
              if (price > 0 && price >= 1 && price <= 10000) {
                prices.push(price);
              }
            }
          }
          
          if (prices.length > 0) {
            // Remover duplicatas
            const uniquePrices = [...new Set(prices)];
            // Ordenar preços
            uniquePrices.sort((a, b) => a - b);
            
            // O menor preço é provavelmente o preço atual
            priceFromUrl = uniquePrices[0];
            // Se houver mais de um preço e o segundo for maior, é o preço original
            if (uniquePrices.length > 1 && uniquePrices[1] > priceFromUrl) {
              oldPriceFromUrl = uniquePrices[1];
            }
            console.log(`   💡 Preços extraídos da URL (pdp_npi): Atual R$ ${priceFromUrl.toFixed(2)}${oldPriceFromUrl ? `, Original R$ ${oldPriceFromUrl.toFixed(2)}` : ''} (de ${uniquePrices.length} preços únicos: ${uniquePrices.map(p => p.toFixed(2)).join(', ')})`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️ Erro ao extrair preço da URL: ${e.message}`);
      }

      // Fazer requisição à página do produto
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.aliexpress.com/',
          'Connection': 'keep-alive'
        },
        timeout: 20000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      // Extrair nome do produto
      let name = '';
      const nameSelectors = [
        'h1[data-pl="product-title"]',
        'h1.product-title-text',
        'span.product-title-text',
        'h1[class*="product-title"]',
        '[data-pl="product-title"]',
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title'
      ];

      for (const selector of nameSelectors) {
        const nameElement = $(selector).first();
        if (nameElement.length) {
          if (selector.startsWith('meta') || selector === 'title') {
            name = nameElement.attr('content') || nameElement.text() || '';
          } else {
            name = nameElement.text().trim();
          }
          
          // Limpar nome - remover "AliExpress" e outros termos comuns
          if (name) {
            name = name
              .replace(/^AliExpress\s*[-|]\s*/i, '')
              .replace(/\s*[-|]\s*AliExpress.*$/i, '')
              .replace(/\s*[-|]\s*Buy.*$/i, '')
              .trim();
          }
          
          if (name && name.length > 5 && !name.toLowerCase().includes('aliexpress')) {
            console.log(`   ✅ Nome encontrado: ${name.substring(0, 50)}...`);
            break;
          }
        }
      }
      
      // Buscar nome em scripts JavaScript (window.runParams, __NEXT_DATA__, etc)
      if (!name || name.length < 5 || name.toLowerCase().includes('aliexpress')) {
        const scripts = $('script').toArray();
        for (const script of scripts) {
          const scriptText = $(script).html() || '';
          if (scriptText.length > 100 && scriptText.length < 500000) {
            // Buscar padrões comuns de nome de produto em scripts
            const namePatterns = [
              /"subject"\s*:\s*"([^"]+)"/i,
              /"productTitle"\s*:\s*"([^"]+)"/i,
              /"title"\s*:\s*"([^"]+)"/i,
              /productTitle["\s]*[:=]\s*["']([^"']+)["']/i,
              /subject["\s]*[:=]\s*["']([^"']+)["']/i
            ];
            
            for (const pattern of namePatterns) {
              const match = scriptText.match(pattern);
              if (match && match[1] && match[1].length > 10) {
                name = match[1].trim();
                // Limpar nome
                name = name
                  .replace(/^AliExpress\s*[-|]\s*/i, '')
                  .replace(/\s*[-|]\s*AliExpress.*$/i, '')
                  .trim();
                if (name.length > 5 && !name.toLowerCase().includes('aliexpress')) {
                  console.log(`   💡 Nome encontrado em script: ${name.substring(0, 50)}...`);
                  break;
                }
              }
            }
            if (name && name.length > 5 && !name.toLowerCase().includes('aliexpress')) {
              break;
            }
          }
        }
      }

      // Fallback: buscar em JSON-LD
      if (!name || name.length < 5) {
        const scripts = $('script[type="application/ld+json"]');
        scripts.each((i, script) => {
          try {
            const jsonData = JSON.parse($(script).html());
            if (jsonData.name && jsonData.name.length > 5) {
              name = jsonData.name.trim();
              console.log(`   💡 Nome encontrado em JSON-LD: ${name.substring(0, 50)}...`);
              return false; // break
            }
          } catch (e) {
            // Continuar tentando
          }
        });
      }

      // Extrair preços
      let currentPrice = priceFromUrl || 0; // Usar preço da URL se encontrado
      let oldPrice = oldPriceFromUrl || 0;
      
      if (currentPrice > 0) {
        console.log(`   ✅ Usando preço extraído da URL: R$ ${currentPrice.toFixed(2)}${oldPrice > 0 ? ` (Original: R$ ${oldPrice.toFixed(2)})` : ''}`);
      } else {
        console.log(`   🔍 Preço não encontrado na URL, buscando no HTML...`);
      }

      // Seletores específicos do AliExpress para preço atual
      const priceSelectors = [
        // Seletores principais do AliExpress
        '[data-pl="product-price"] .notranslate',
        '.product-price-value.notranslate',
        '.product-price-value',
        '[class*="price-current"] .notranslate',
        '[class*="price-current"]',
        '[class*="price-value"]',
        '[data-pl="product-price"]',
        // Seletores genéricos
        '[class*="product-price"]',
        'meta[property="product:price:amount"]',
        'meta[property="product:price:currency"]',
        // Seletores adicionais do AliExpress
        '.price-current',
        '.price-value',
        '[data-spm*="price"]',
        '.notranslate[data-pl="product-price"]'
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length) {
          let priceText = '';
          if (selector.startsWith('meta')) {
            priceText = priceElement.attr('content') || '';
          } else {
            // Pegar texto direto do elemento e também de elementos filhos
            priceText = priceElement.text().trim();
            // Se não encontrou, tentar pegar do atributo data-value ou similar
            if (!priceText || priceText.length === 0) {
              priceText = priceElement.attr('data-value') || 
                         priceElement.attr('data-price') ||
                         priceElement.attr('data-amount') ||
                         '';
            }
          }
          
          if (priceText) {
            // Limpar texto de preço (remover espaços extras, quebras de linha, etc)
            priceText = priceText.replace(/\s+/g, ' ').trim();
            console.log(`   🔍 Tentando parsear preço do seletor "${selector}": "${priceText}"`);
            
            const price = this.parsePrice(priceText);
            
            // Validar preço: deve estar entre R$ 1 e R$ 10000
            if (price > 0 && price >= 1 && price <= 10000) {
              currentPrice = price;
              console.log(`   ✅ Preço atual encontrado via seletor "${selector}": R$ ${currentPrice.toFixed(2)} (texto original: "${priceText}")`);
              break;
            } else if (price > 0) {
              console.log(`   ⚠️ Preço fora do range válido: R$ ${price.toFixed(2)} (texto: "${priceText}") - será ignorado`);
            } else {
              console.log(`   ⚠️ Não foi possível parsear preço do texto: "${priceText}"`);
            }
          }
        }
      }
      
      // Buscar preço em scripts JavaScript se não encontrou (ou se preço da URL é 0)
      if (currentPrice === 0) {
        console.log(`   🔍 Buscando preço em scripts JavaScript...`);
        const scripts = $('script').toArray();
        for (const script of scripts) {
          const scriptText = $(script).html() || '';
          if (scriptText.length > 100 && scriptText.length < 500000) {
            // Buscar padrões de preço em scripts (mais agressivo)
            const pricePatterns = [
              /"actSkuCalPrice"\s*:\s*"([^"]+)"/i,
              /"skuCalPrice"\s*:\s*"([^"]+)"/i,
              /"price"\s*:\s*"([^"]+)"/i,
              /"salePrice"\s*:\s*"([^"]+)"/i,
              /"currentPrice"\s*:\s*"([^"]+)"/i,
              /"skuPrice"\s*:\s*"([^"]+)"/i,
              /"actSkuPrice"\s*:\s*"([^"]+)"/i,
              /"priceAmount"\s*:\s*"([^"]+)"/i,
              /actSkuCalPrice["\s]*[:=]\s*["']([^"']+)["']/i,
              /skuCalPrice["\s]*[:=]\s*["']([^"']+)["']/i,
              /skuPrice["\s]*[:=]\s*["']([^"']+)["']/i,
              // Buscar valores numéricos que parecem preços (formato BRL)
              /"price"\s*:\s*\{[^}]*"value"\s*:\s*"([^"]+)"/i,
              /"price"\s*:\s*\{[^}]*"amount"\s*:\s*"([^"]+)"/i
            ];
            
            for (const pattern of pricePatterns) {
              const match = scriptText.match(pattern);
              if (match && match[1]) {
                const rawValue = match[1];
                console.log(`   🔍 Tentando parsear preço de script: "${rawValue}" (padrão: ${pattern.source.substring(0, 30)}...)`);
                const price = this.parsePrice(rawValue);
                if (price > 0 && price >= 1 && price <= 10000) {
                  currentPrice = price;
                  console.log(`   💡 Preço encontrado em script: R$ ${currentPrice.toFixed(2)} (valor original: "${rawValue}")`);
                  break;
                } else if (price > 0) {
                  console.log(`   ⚠️ Preço de script fora do range: R$ ${price.toFixed(2)} (valor original: "${rawValue}")`);
                }
              }
            }
            
            // Se ainda não encontrou, tentar buscar valores numéricos próximos a "price" ou "BRL"
            if (currentPrice === 0) {
              const priceContextMatches = scriptText.match(/(?:price|BRL|R\$)[^"']*["']([\d.,]+)["']/gi);
              if (priceContextMatches) {
                for (const match of priceContextMatches) {
                  const priceMatch = match.match(/([\d.,]+)/);
                  if (priceMatch && priceMatch[1]) {
                    const price = this.parsePrice(priceMatch[1]);
                    if (price > 0 && price >= 1 && price <= 10000) {
                      currentPrice = price;
                      console.log(`   💡 Preço encontrado em contexto de script: R$ ${currentPrice.toFixed(2)}`);
                      break;
                    }
                  }
                }
              }
            }
            
            if (currentPrice > 0) {
              break;
            }
          }
        }
      }
      
      // Buscar preço em elementos com atributos data-* relacionados a preço
      if (currentPrice === 0) {
        const priceDataElements = $('[data-price], [data-amount], [data-value], [data-pl*="price"]');
        priceDataElements.each((i, el) => {
          if (currentPrice > 0) return false; // break
          const priceAttr = $(el).attr('data-price') || 
                           $(el).attr('data-amount') || 
                           $(el).attr('data-value') ||
                           $(el).text().trim();
          const price = this.parsePrice(priceAttr);
          if (price > 0 && price >= 1 && price <= 10000) {
            currentPrice = price;
            console.log(`   💡 Preço encontrado em atributo data-*: R$ ${currentPrice.toFixed(2)}`);
            return false; // break
          }
        });
      }
      
      // Buscar preço em todos os elementos que contenham números (último recurso agressivo)
      if (currentPrice === 0) {
        console.log(`   🔍 Buscando preço em elementos com classes relacionadas...`);
        // Buscar em elementos com classes que contenham "price", "amount", "value"
        const priceLikeElements = $('[class*="price"], [class*="Price"], [class*="amount"], [class*="Amount"], [class*="value"], [class*="Value"]');
        const foundPrices = [];
        
        priceLikeElements.each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length < 50) { // Ignorar textos muito longos
            const price = this.parsePrice(text);
            if (price > 0 && price >= 1 && price <= 10000) {
              foundPrices.push(price);
            }
          }
        });
        
        if (foundPrices.length > 0) {
          // Pegar o menor preço (provavelmente é o preço atual)
          currentPrice = Math.min(...foundPrices);
          console.log(`   💡 Preço encontrado em elementos com classe relacionada: R$ ${currentPrice.toFixed(2)}`);
        }
      }
      
      // Buscar preço em texto da página (último recurso)
      // Focar em padrões específicos do AliExpress: "R$ 184,65" ou "184,65"
      if (currentPrice === 0) {
        console.log(`   🔍 Buscando preço em texto da página...`);
        
        // Buscar em elementos específicos primeiro (mais confiável)
        const priceElements = $('[class*="price"], [data-pl*="price"], [class*="Price"]');
        const foundPrices = [];
        
        priceElements.each((i, el) => {
          if (foundPrices.length >= 10) return false; // Limitar busca
          const text = $(el).text().trim();
          if (text && text.length < 100) { // Ignorar textos muito longos
            // Buscar padrões de preço no texto
            const priceMatches = text.match(/(?:R\$\s*)?([\d.,]+)/g);
            if (priceMatches) {
              for (const match of priceMatches) {
                const price = this.parsePrice(match);
                if (price > 0 && price >= 1 && price <= 10000) {
                  foundPrices.push(price);
                }
              }
            }
          }
        });
        
        // Se não encontrou em elementos específicos, buscar no body
        if (foundPrices.length === 0) {
          const bodyText = $('body').text();
          // Buscar padrões mais específicos do AliExpress
          const pricePatterns = [
            /R\$\s*(\d{1,3}(?:[.,]\d{2})?)/g,  // R$ 184,65 ou R$ 184.65
            /(\d{1,3}[.,]\d{2})\s*R\$/g,        // 184,65 R$
            /price[:\s]+([\d.,]+)/gi
          ];
          
          for (const pattern of pricePatterns) {
            const matches = [...bodyText.matchAll(pattern)];
            for (const match of matches) {
              const price = this.parsePrice(match[1] || match[0]);
              if (price > 0 && price >= 1 && price <= 10000) {
                foundPrices.push(price);
              }
            }
          }
        }
        
        if (foundPrices.length > 0) {
          // Remover duplicatas e ordenar
          const uniquePrices = [...new Set(foundPrices)].sort((a, b) => a - b);
          // Pegar o menor preço (provavelmente é o preço atual)
          currentPrice = uniquePrices[0];
          console.log(`   💡 Preço encontrado em texto da página: R$ ${currentPrice.toFixed(2)} (de ${uniquePrices.length} preços encontrados: ${uniquePrices.slice(0, 5).map(p => p.toFixed(2)).join(', ')})`);
        }
      }

      // Preço original (se houver desconto) - Seletores específicos do AliExpress
      const oldPriceSelectors = [
        // Seletores principais do AliExpress para preço original
        '[class*="price-original"] .notranslate',
        '[class*="price-before"] .notranslate',
        '[data-pl="product-price-original"]',
        '[class*="original-price"]',
        '[class*="list-price"]',
        // Seletores genéricos
        '[class*="price-original"]',
        '[class*="price-before"]',
        // Seletores adicionais do AliExpress
        '.price-original',
        '.price-before',
        's[class*="price"]', // Elementos com <s> (strikethrough) geralmente são preços antigos
        '[style*="text-decoration: line-through"]',
        '[style*="text-decoration:line-through"]'
      ];

      for (const selector of oldPriceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length) {
          let priceText = priceElement.text().trim();
          // Se não encontrou, tentar pegar do atributo
          if (!priceText || priceText.length === 0) {
            priceText = priceElement.attr('data-value') || 
                       priceElement.attr('data-price') ||
                       priceElement.attr('data-amount') ||
                       '';
          }
          
          if (priceText) {
            priceText = priceText.replace(/\s+/g, ' ').trim();
            const price = this.parsePrice(priceText);
            
            // Validar: preço original deve ser maior que o atual
            if (price > 0 && price > currentPrice && price <= 10000) {
              oldPrice = price;
              console.log(`   ✅ Preço original encontrado via seletor "${selector}": R$ ${oldPrice.toFixed(2)} (texto: "${priceText}")`);
              break;
            }
          }
        }
      }
      
      // Buscar preço original em scripts também
      if (oldPrice === 0 && currentPrice > 0) {
        const scripts = $('script').toArray();
        for (const script of scripts) {
          const scriptText = $(script).html() || '';
          if (scriptText.length > 100 && scriptText.length < 500000) {
            const oldPricePatterns = [
              /"originalPrice"\s*:\s*"([^"]+)"/i,
              /"listPrice"\s*:\s*"([^"]+)"/i,
              /"priceBefore"\s*:\s*"([^"]+)"/i,
              /originalPrice["\s]*[:=]\s*["']([^"']+)["']/i
            ];
            
            for (const pattern of oldPricePatterns) {
              const match = scriptText.match(pattern);
              if (match && match[1]) {
                const price = this.parsePrice(match[1]);
                if (price > 0 && price > currentPrice) {
                  oldPrice = price;
                  console.log(`   💡 Preço original encontrado em script: R$ ${oldPrice.toFixed(2)}`);
                  break;
                }
              }
            }
            if (oldPrice > 0) {
              break;
            }
          }
        }
      }

      // Extrair imagem
      let imageUrl = '';
      const imageSelectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        '[class*="product-image"] img',
        '[data-pl="product-image"] img',
        '.images-view-item img'
      ];

      for (const selector of imageSelectors) {
        const imgElement = $(selector).first();
        if (imgElement.length) {
          if (selector.startsWith('meta')) {
            imageUrl = imgElement.attr('content') || '';
          } else {
            imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
          }
          if (imageUrl && imageUrl.startsWith('http')) {
            console.log(`   ✅ Imagem encontrada`);
            break;
          }
        }
      }

      // Validar dados mínimos
      if (!name || name.length < 5) {
        return {
          error: 'Não foi possível extrair o nome do produto',
          platform: 'aliexpress',
          affiliateLink: url
        };
      }

      // Se ainda não encontrou preço, tentar uma última vez com busca mais agressiva em todo o HTML
      if (currentPrice <= 0) {
        console.log(`   ⚠️ Preço não encontrado, tentando busca agressiva em todo o HTML...`);
        
        // ESTRATÉGIA 1: Buscar em todos os elementos que contenham números e estejam próximos a palavras-chave de preço
        const priceKeywords = ['price', 'preço', 'valor', 'amount', 'custo', 'R$', 'BRL'];
        const allElements = $('*');
        const candidatePrices = [];
        
        allElements.each((i, el) => {
          if (candidatePrices.length > 50) return false; // Limitar para performance
          
          const $el = $(el);
          const text = $el.text().trim();
          const html = $el.html() || '';
          
          // Verificar se o elemento ou seus pais/irmãos contêm palavras-chave de preço
          const parentText = $el.parent().text().toLowerCase();
          const siblingText = $el.siblings().text().toLowerCase();
          const hasPriceKeyword = priceKeywords.some(keyword => 
            text.toLowerCase().includes(keyword) || 
            parentText.includes(keyword) || 
            siblingText.includes(keyword) ||
            html.toLowerCase().includes(keyword)
          );
          
          // Se tem palavra-chave de preço ou está em contexto de preço
          if (hasPriceKeyword || $el.closest('[class*="price"], [class*="Price"], [class*="amount"]').length > 0) {
            // Tentar extrair preço do texto
            const priceMatch = text.match(/(?:R\$\s*)?([\d.,]+)/);
            if (priceMatch) {
              const price = this.parsePrice(priceMatch[1] || priceMatch[0]);
              if (price > 0 && price >= 1 && price <= 10000) {
                candidatePrices.push({ price, hasPriceKeyword, text: text.substring(0, 50) });
              }
            }
          }
        });
        
        if (candidatePrices.length > 0) {
          // Priorizar preços que estão em contexto de palavra-chave
          const contextualPrices = candidatePrices.filter(p => p.hasPriceKeyword);
          if (contextualPrices.length > 0) {
            currentPrice = Math.min(...contextualPrices.map(p => p.price));
            console.log(`   💡 Preço encontrado em contexto de palavra-chave: R$ ${currentPrice.toFixed(2)}`);
          } else {
            // Se não há contexto, pegar o menor preço
            currentPrice = Math.min(...candidatePrices.map(p => p.price));
            console.log(`   💡 Preço encontrado (sem contexto específico): R$ ${currentPrice.toFixed(2)}`);
          }
        }
        
        // ESTRATÉGIA 2: Se ainda não encontrou, buscar todos os números no HTML e pegar os mais prováveis
        if (currentPrice <= 0) {
          console.log(`   🔍 Tentando extrair todos os números do HTML...`);
          const bodyText = $('body').text();
          const allNumbers = bodyText.match(/(?:R\$\s*)?([\d]{1,3}(?:[.,][\d]{2})?)/g);
          
          if (allNumbers && allNumbers.length > 0) {
            const parsedPrices = allNumbers
              .map(match => {
                const numMatch = match.match(/([\d.,]+)/);
                return numMatch ? this.parsePrice(numMatch[1]) : 0;
              })
              .filter(p => p > 0 && p >= 1 && p <= 10000)
              .sort((a, b) => a - b); // Ordenar do menor para o maior
            
            if (parsedPrices.length > 0) {
              // Pegar o menor preço que seja razoável (entre R$ 10 e R$ 5000)
              const reasonablePrices = parsedPrices.filter(p => p >= 10 && p <= 5000);
              if (reasonablePrices.length > 0) {
                currentPrice = reasonablePrices[0]; // Menor preço razoável
                console.log(`   💡 Preço encontrado em números do HTML: R$ ${currentPrice.toFixed(2)}`);
              } else if (parsedPrices.length > 0) {
                // Se não há preços razoáveis, pegar o menor mesmo assim
                currentPrice = parsedPrices[0];
                console.log(`   💡 Preço encontrado (fora do range ideal): R$ ${currentPrice.toFixed(2)}`);
              }
            }
          }
        }
      }

      if (currentPrice <= 0) {
        // Log detalhado para debug
        console.log(`   ❌ Preço não encontrado após todas as tentativas`);
        console.log(`   📋 Debug: Verificando HTML...`);
        const bodyText = $('body').text();
        console.log(`   📋 Tamanho do texto do body: ${bodyText.length} caracteres`);
        
        // Tentar encontrar qualquer número que pareça preço
        const allNumbers = bodyText.match(/[\d.,]{3,}/g);
        if (allNumbers) {
          console.log(`   📋 Números encontrados no texto (primeiros 10): ${allNumbers.slice(0, 10).join(', ')}`);
        }
        
        return {
          error: 'Não foi possível extrair o preço do produto. O produto pode estar indisponível ou a estrutura da página mudou.',
          platform: 'aliexpress',
          name: name,
          affiliateLink: url,
          imageUrl: imageUrl
        };
      }

      // Validação final dos preços antes de retornar
      // Se os preços parecem estar em centavos (muito grandes), converter
      if (currentPrice > 100 && currentPrice < 100000) {
        // Pode estar em centavos, tentar dividir por 100
        const priceInReais = currentPrice / 100;
        if (priceInReais >= 1 && priceInReais <= 10000) {
          console.log(`   🔄 Convertendo preço de centavos: R$ ${currentPrice.toFixed(2)} -> R$ ${priceInReais.toFixed(2)}`);
          currentPrice = priceInReais;
        }
      }
      
      if (oldPrice > 100 && oldPrice < 100000) {
        const oldPriceInReais = oldPrice / 100;
        if (oldPriceInReais >= 1 && oldPriceInReais <= 10000 && oldPriceInReais > currentPrice) {
          console.log(`   🔄 Convertendo preço original de centavos: R$ ${oldPrice.toFixed(2)} -> R$ ${oldPriceInReais.toFixed(2)}`);
          oldPrice = oldPriceInReais;
        }
      }

      console.log(`✅ Extração AliExpress concluída: ${name.substring(0, 30)}... - R$ ${currentPrice.toFixed(2)}${oldPrice > currentPrice ? ` (Original: R$ ${oldPrice.toFixed(2)})` : ''}`);

      return {
        platform: 'aliexpress',
        name: name,
        currentPrice: currentPrice,
        oldPrice: oldPrice > currentPrice ? oldPrice : null,
        imageUrl: imageUrl,
        affiliateLink: url
      };
    } catch (error) {
      console.error('❌ Erro ao extrair informações do AliExpress:', error.message);
      throw error;
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
      // Validar URL
      if (!url || typeof url !== 'string') {
        return {
          error: 'URL inválida ou não fornecida.',
          affiliateLink: url || ''
        };
      }

      console.log('🔗 URL original:', url);
      
      // Detectar plataforma ANTES de seguir redirecionamentos
      const platform = this.detectPlatform(url);
      console.log('🏷️ Plataforma detectada:', platform);

      // Seguir redirecionamentos apenas se necessário
      let finalUrl = url;
      const isShortLink = url.includes('shp.ee') || 
                          url.includes('s.shopee') || 
                          url.includes('/sec/') || 
                          url.includes('amzn.to') ||
                          url.includes('s.shopee.com.br') ||
                          url.includes('s.shopee.com') ||
                          url.includes('s.click.aliexpress.com') ||
                          url.includes('aliexpress.com/e/_');
      
      if (isShortLink) {
        try {
          console.log('🔗 Link encurtado detectado, seguindo redirecionamentos...');
        finalUrl = await this.followRedirects(url);
        console.log('🔗 URL final:', finalUrl);
      } catch (redirectError) {
        console.warn('⚠️ Erro ao seguir redirecionamentos:', redirectError.message);
        finalUrl = url; // Usar URL original se falhar
        }
      } else {
        console.log('🔗 Link direto, pulando redirecionamentos');
      }

      if (platform === 'shopee') {
        try {
          return await this.extractShopeeInfo(finalUrl);
        } catch (shopeeError) {
          console.error('❌ Erro ao extrair info Shopee:', shopeeError.message);
          return {
            error: `Erro ao extrair informações da Shopee: ${shopeeError.message}`,
            platform: 'shopee',
            affiliateLink: finalUrl
          };
        }
      } else if (platform === 'mercadolivre') {
        try {
          return await this.extractMeliInfo(finalUrl);
        } catch (meliError) {
          console.error('❌ Erro ao extrair info Mercado Livre:', meliError.message);
          return {
            error: `Erro ao extrair informações do Mercado Livre: ${meliError.message}`,
            platform: 'mercadolivre',
            affiliateLink: finalUrl
          };
        }
      } else if (platform === 'amazon') {
        try {
          return await this.extractAmazonInfo(finalUrl);
        } catch (amazonError) {
          console.error('❌ Erro ao extrair info Amazon:', amazonError.message);
          return {
            error: `Erro ao extrair informações da Amazon: ${amazonError.message}`,
            platform: 'amazon',
            affiliateLink: finalUrl
          };
        }
      } else if (platform === 'aliexpress') {
        try {
          // Tentar usar API primeiro se tivermos o ID do produto
          const productIdMatch = finalUrl.match(/\/item\/(\d+)/);
          if (productIdMatch && productIdMatch[1]) {
            const productId = productIdMatch[1];
            console.log(`   🔍 Tentando obter detalhes via API AliExpress para produto ID: ${productId}`);
            
            try {
              const aliExpressSync = (await import('./autoSync/aliExpressSync.js')).default;
              const productDetails = await aliExpressSync.getProductDetails(productId);
              
              if (productDetails && productDetails.price > 0) {
                console.log(`   ✅ Dados obtidos via API AliExpress!`);
                return {
                  platform: 'aliexpress',
                  name: productDetails.title,
                  currentPrice: productDetails.price,
                  oldPrice: productDetails.original_price || null,
                  imageUrl: productDetails.thumbnail,
                  affiliateLink: productDetails.permalink || finalUrl
                };
              } else {
                console.log(`   ⚠️ API não retornou dados completos, tentando web scraping...`);
              }
            } catch (apiError) {
              console.log(`   ⚠️ Erro ao usar API AliExpress: ${apiError.message}, tentando web scraping...`);
            }
          }
          
          // Fallback para web scraping
          return await this.extractAliExpressInfo(finalUrl);
        } catch (aliexpressError) {
          console.error('❌ Erro ao extrair info AliExpress:', aliexpressError.message);
          return {
            error: `Erro ao extrair informações do AliExpress: ${aliexpressError.message}`,
            platform: 'aliexpress',
            affiliateLink: finalUrl
          };
        }
      } else {
        return {
          platform: 'unknown',
          affiliateLink: finalUrl,
          error: 'Plataforma não suportada. Use links da Shopee, Mercado Livre, Amazon ou AliExpress.'
        };
      }
    } catch (error) {
      console.error('❌ Erro geral ao analisar link:', error);
      return {
        error: `Erro ao analisar o link: ${error.message || 'Erro desconhecido'}. Verifique se o link está correto e tente novamente.`,
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

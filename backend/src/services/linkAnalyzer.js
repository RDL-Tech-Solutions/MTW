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
      // PRIMEIRO: Tentar usar a API oficial (mais rápido e preciso)
      const productId = this.extractMeliProductId(url);
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

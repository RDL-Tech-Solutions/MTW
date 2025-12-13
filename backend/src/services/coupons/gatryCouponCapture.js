import axios from 'axios';
import logger from '../../config/logger.js';
import * as cheerio from 'cheerio';

class GatryCouponCapture {
  constructor() {
    this.baseUrl = 'https://gatry.com';
    this.cuponsUrl = 'https://gatry.com/cupons';
  }

  /**
   * Capturar cupons do Gatry
   */
  async captureCoupons() {
    try {
      logger.info('🎟️ Iniciando captura de cupons do Gatry...');

      const coupons = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 5; // Limitar a 5 páginas para não sobrecarregar

      while (hasMore && page <= maxPages) {
        try {
          const pageCoupons = await this.scrapePage(page);
          
          if (pageCoupons.length === 0) {
            hasMore = false;
          } else {
            coupons.push(...pageCoupons);
            logger.info(`📄 Página ${page}: ${pageCoupons.length} cupons encontrados`);
            page++;
            
            // Delay entre requisições para não sobrecarregar o servidor
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          logger.error(`Erro ao capturar página ${page} do Gatry: ${error.message}`);
          hasMore = false;
        }
      }

      logger.info(`✅ Gatry: ${coupons.length} cupons capturados no total`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro na captura Gatry: ${error.message}`);
      return [];
    }
  }

  /**
   * Fazer scraping de uma página do Gatry
   * Baseado na estrutura real do site: https://gatry.com/cupons
   */
  async scrapePage(page = 1) {
    try {
      const url = page === 1 ? this.cuponsUrl : `${this.cuponsUrl}?page=${page}`;
      
      logger.info(`🔍 Fazendo scraping da página ${page} do Gatry: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://gatry.com/'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const coupons = [];
      const seenCodes = new Set(); // Evitar duplicatas

      // Estratégia 1: Buscar por padrão de texto que contém código de cupom
      // O Gatry exibe cupons no formato: "CÓDIGO" seguido de descrição
      // Exemplo: "LIVROS15" seguido de "Amazon – 15% De Desconto Em Livros Selecionados No App"
      
      // Buscar todos os elementos que podem conter códigos de cupom
      $('body').find('*').each((index, element) => {
        try {
          const $el = $(element);
          const text = $el.text().trim();
          
          // Padrão: código alfanumérico em maiúsculas (4-20 caracteres) seguido de descrição
          // Exemplo: "LIVROS15" ou "MELINATAL"
          const codeMatch = text.match(/^([A-Z0-9]{4,20})\b/);
          
          if (codeMatch) {
            const code = codeMatch[1];
            
            // Verificar se já processamos este código
            if (seenCodes.has(code)) return;
            
            // Buscar contexto ao redor (pai ou irmãos) para obter mais informações
            const $parent = $el.parent();
            const parentText = $parent.text() || $el.closest('div, article, section').text();
            
            // Extrair informações do contexto
            const discountMatch = parentText.match(/(\d+)%\s*(?:off|desconto|de desconto|OFF)/i) ||
                                 parentText.match(/R\$\s*(\d+)\s*(?:off|desconto)/i);
            
            const platform = this.extractPlatformFromContext(parentText, $parent);
            const title = this.extractTitleFromContext(parentText, code);
            const link = this.extractLinkFromContext($parent);
            
            // Validar se temos informações suficientes
            // Aceitar códigos mesmo sem plataforma específica (será 'general')
            if (code && code.length >= 4 && code.length <= 20 && /^[A-Z0-9]+$/.test(code)) {
              seenCodes.add(code);
              
              const normalizedPlatform = this.normalizePlatform(platform);
              const discountValue = this.extractDiscountValue(parentText);
              
              coupons.push({
                code: code.trim(),
                platform: normalizedPlatform !== 'general' ? normalizedPlatform : 'mercadolivre', // Default para mercadolivre se não detectar
                title: title || `${discountMatch ? discountMatch[1] + '%' : 'Desconto'} - ${normalizedPlatform}`,
                description: parentText.substring(0, 500) || '',
                discount_type: this.detectDiscountType(parentText),
                discount_value: discountValue || 10, // Default 10% se não encontrar
                min_purchase: this.extractMinPurchase(parentText) || 0,
                valid_until: this.calculateDefaultExpiry(),
                affiliate_link: link || null,
                source: 'gatry',
                source_url: url,
                is_pending_approval: true,
                capture_source: 'gatry'
              });
            }
          }
        } catch (error) {
          // Ignorar erros em elementos individuais
        }
      });

      // Estratégia 2: Buscar por padrões específicos de texto com código e desconto
      // Exemplo: "Amazon – 15% De Desconto" seguido de "LIVROS15"
      if (coupons.length === 0) {
        const bodyText = $('body').text();
        const couponPatterns = [
          // Padrão: "Plataforma – X% De Desconto" seguido de código
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[–-]\s*(\d+)%\s*De\s*Desconto[^]*?([A-Z0-9]{4,20})/gi,
          // Padrão: "Plataforma | X% OFF" seguido de código
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\|\s*(\d+)%\s*OFF[^]*?([A-Z0-9]{4,20})/gi,
          // Padrão: código seguido de "X% OFF" e plataforma
          /([A-Z0-9]{4,20})[^]*?(\d+)%\s*OFF[^]*?(?:Ir para|Amazon|Mercado Livre|Shopee)/gi
        ];

        for (const pattern of couponPatterns) {
          let match;
          while ((match = pattern.exec(bodyText)) !== null && coupons.length < 50) {
            const code = match[3] || match[1];
            const discount = parseFloat(match[2] || match[1]);
            const platformText = match[1] || bodyText.substring(Math.max(0, match.index - 100), match.index);
            
            if (code && code.length >= 4 && code.length <= 20 && /^[A-Z0-9]+$/.test(code) && !seenCodes.has(code)) {
              seenCodes.add(code);
              const platform = this.detectPlatformFromText(platformText);
              
              coupons.push({
                code: code.trim(),
                platform: this.normalizePlatform(platform),
                title: `${discount}% OFF - ${platform}`,
                description: bodyText.substring(Math.max(0, match.index - 50), match.index + 200).trim(),
                discount_type: 'percentage',
                discount_value: discount,
                min_purchase: 0,
                valid_until: this.calculateDefaultExpiry(),
                affiliate_link: null,
                source: 'gatry',
                source_url: url,
                is_pending_approval: true,
                capture_source: 'gatry'
              });
            }
          }
        }
      }

      logger.info(`✅ Página ${page}: ${coupons.length} cupons únicos encontrados`);
      return coupons;

    } catch (error) {
      logger.error(`❌ Erro ao fazer scraping da página ${page}: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      return [];
    }
  }

  /**
   * Extrair código do cupom
   */
  extractCouponCode($el) {
    // Tentar diferentes seletores
    const selectors = [
      '.coupon-code',
      '.code',
      '[data-code]',
      'code',
      'strong',
      '.discount-code'
    ];

    for (const selector of selectors) {
      const code = $el.find(selector).first().text().trim();
      if (code && code.length >= 4 && code.length <= 20 && /^[A-Z0-9]+$/.test(code)) {
        return code;
      }
    }

    // Buscar no texto do elemento
    const text = $el.text();
    const codeMatch = text.match(/\b([A-Z0-9]{4,20})\b/);
    return codeMatch ? codeMatch[1] : null;
  }

  /**
   * Extrair título do contexto
   */
  extractTitleFromContext(text, code) {
    if (!text) return `Cupom ${code}`;
    
    // Remover o código do início do texto
    const withoutCode = text.replace(new RegExp(`^${code}\\s*`, 'i'), '').trim();
    
    // Buscar título (geralmente a primeira linha ou até o primeiro ponto)
    const lines = withoutCode.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Remover informações de tempo (ex: "20 horas atrás")
      const cleanTitle = firstLine.replace(/\d+\s*(?:horas|dias|semanas)\s*atrás/i, '').trim();
      if (cleanTitle && cleanTitle.length > 10) {
        return cleanTitle.substring(0, 200);
      }
    }
    
    // Se não encontrou, usar parte do texto
    const title = withoutCode.substring(0, 200).trim();
    return title || `Cupom ${code}`;
  }

  /**
   * Extrair descrição
   */
  extractDescription($el) {
    const selectors = ['.description', '.details', 'p', '.text'];
    for (const selector of selectors) {
      const desc = $el.find(selector).first().text().trim();
      if (desc && desc.length > 20) return desc;
    }
    return null;
  }

  /**
   * Extrair desconto
   */
  extractDiscount($el) {
    const text = $el.text();
    const matches = [
      text.match(/(\d+)%\s*(?:off|desconto|de desconto)/i),
      text.match(/R\$\s*(\d+)\s*(?:off|desconto)/i),
      text.match(/(\d+)%\s*OFF/i)
    ];

    for (const match of matches) {
      if (match) return match[0];
    }
    return null;
  }

  /**
   * Extrair valor do desconto do texto
   */
  extractDiscountValue(text) {
    if (!text) return null;
    
    // Buscar padrões de desconto em porcentagem
    const percentageMatch = text.match(/(\d+)%\s*(?:off|desconto|de desconto|OFF)/i);
    if (percentageMatch) {
      return parseFloat(percentageMatch[1]);
    }

    // Buscar padrões de desconto fixo
    const fixedMatch = text.match(/R\$\s*(\d+(?:[.,]\d+)?)\s*(?:off|desconto)/i);
    if (fixedMatch) {
      return parseFloat(fixedMatch[1].replace(',', '.'));
    }

    // Buscar apenas porcentagem
    const simplePercentage = text.match(/(\d+)%/);
    if (simplePercentage) {
      return parseFloat(simplePercentage[1]);
    }

    return null;
  }

  /**
   * Detectar tipo de desconto
   */
  detectDiscountType(discountText) {
    if (!discountText) return 'percentage';
    return discountText.includes('%') || discountText.toLowerCase().includes('percent') ? 'percentage' : 'fixed';
  }

  /**
   * Extrair plataforma do contexto
   */
  extractPlatformFromContext(text, $el) {
    const lowerText = (text || '').toLowerCase();
    const platforms = {
      'mercadolivre': ['mercado livre', 'meli', 'mercadolivre', 'mercadolibre'],
      'amazon': ['amazon'],
      'shopee': ['shopee'],
      'aliexpress': ['aliexpress', 'ali express'],
      'cea': ['c&a', 'cea', 'c e a'],
      'magazineluiza': ['magazine luiza', 'magalu', 'magazine'],
      'americanas': ['americanas'],
      'submarino': ['submarino'],
      'casasbahia': ['casas bahia', 'casasbahia']
    };

    for (const [platform, keywords] of Object.entries(platforms)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return platform;
      }
    }

    // Tentar extrair do link
    if ($el) {
      const link = $el.find('a').attr('href') || $el.attr('href') || '';
      const lowerLink = link.toLowerCase();
      for (const [platform, keywords] of Object.entries(platforms)) {
        if (keywords.some(keyword => lowerLink.includes(keyword))) {
          return platform;
        }
      }
    }

    return 'general';
  }

  /**
   * Normalizar nome da plataforma
   */
  normalizePlatform(platform) {
    const mapping = {
      'mercado livre': 'mercadolivre',
      'meli': 'mercadolivre',
      'magazine luiza': 'magazineluiza',
      'magalu': 'magazineluiza',
      'casas bahia': 'casasbahia'
    };

    return mapping[platform.toLowerCase()] || platform.toLowerCase();
  }

  /**
   * Detectar plataforma do texto
   */
  detectPlatformFromText(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('mercado livre') || lowerText.includes('meli')) return 'mercadolivre';
    if (lowerText.includes('amazon')) return 'amazon';
    if (lowerText.includes('shopee')) return 'shopee';
    if (lowerText.includes('aliexpress')) return 'aliexpress';
    return 'general';
  }

  /**
   * Extrair link do contexto
   */
  extractLinkFromContext($el) {
    if (!$el) return null;
    
    // Buscar link em "Ir para [Plataforma]"
    const linkText = $el.find('a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('ir para') || text.includes('amazon') || text.includes('mercado livre') || text.includes('shopee');
    }).first();
    
    if (linkText.length > 0) {
      const href = linkText.attr('href');
      if (href) {
        return href.startsWith('http') ? href : `${this.baseUrl}${href}`;
      }
    }
    
    // Buscar qualquer link no elemento
    const anyLink = $el.find('a').first().attr('href');
    if (anyLink) {
      return anyLink.startsWith('http') ? anyLink : `${this.baseUrl}${anyLink}`;
    }
    
    return null;
  }

  /**
   * Extrair data de validade
   */
  extractValidUntil($el) {
    const text = $el.text();
    const datePatterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
      /válido até\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i,
      /expira em\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`);
      }
    }

    return null;
  }

  /**
   * Calcular data de expiração padrão (7 dias a partir de hoje)
   */
  calculateDefaultExpiry() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }

  /**
   * Extrair compra mínima
   */
  extractMinPurchase(description) {
    if (!description) return 0;
    const match = description.match(/compra mínima\s*:?\s*R\$\s*(\d+(?:[.,]\d+)?)/i);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return 0;
  }
}

export default new GatryCouponCapture();


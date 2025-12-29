import sharp from 'sharp';
import logger from '../../config/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageGenerator {
  constructor() {
    // Detectar ambiente serverless
    const isServerless = __dirname.includes('/var/task') || process.env.VERCEL;

    // Em ambiente serverless, usar /tmp
    this.tempDir = isServerless
      ? path.join('/tmp', 'temp_images')
      : path.join(__dirname, '../../../temp');

    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Apenas logar aviso, pois em serverless pode ser efêmero ou já existir
      // Em read-only FS, isso vai falhar se não usar /tmp, mas já tratamos acima
      logger.warn(`Aviso ao acessar/criar diretório temp (${this.tempDir}): ${error.message}`);
    }
  }

  /**
   * Gerar imagem de cupom baseada na plataforma usando SVG
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<string>} - Caminho da imagem gerada
   */
  async generateCouponImage(coupon) {
    try {
      const width = 1200;
      const height = 630; // Proporção ideal para redes sociais

      // Cores e estilos baseados na plataforma
      const styles = this.getPlatformStyles(coupon.platform);

      // Criar SVG
      const svg = this.generateCouponSVG(coupon, styles, width, height);

      // Converter SVG para PNG usando sharp com alta qualidade
      const buffer = await sharp(Buffer.from(svg))
        .png({
          quality: 100,
          compressionLevel: 9, // Máxima compressão sem perda de qualidade
          palette: true // Usar paleta de cores para melhor qualidade
        })
        .resize(width, height, {
          fit: 'fill',
          kernel: 'lanczos3' // Melhor algoritmo de redimensionamento
        })
        .sharpen() // Aplicar nitidez para melhorar qualidade
        .toBuffer();

      // Salvar temporariamente
      const filename = `coupon_${coupon.id || Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);
      await fs.writeFile(filepath, buffer);

      return filepath;
    } catch (error) {
      logger.error(`Erro ao gerar imagem de cupom: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gerar SVG do cupom com design moderno
   */
  generateCouponSVG(coupon, styles, width, height) {
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : `R$ ${coupon.discount_value.toFixed(2)}`;

    const discountLabel = 'OFF';

    // Para cupons capturados do Telegram, não usar título/descrição
    const isTelegramCaptured = coupon.capture_source === 'telegram' || coupon.auto_captured === true;
    const title = isTelegramCaptured
      ? 'Cupom de Desconto'
      : this.truncateText(coupon.title || 'Cupom de Desconto', 60);
    const description = isTelegramCaptured
      ? ''
      : this.truncateText(coupon.description || '', 80);

    const expiryDate = (isTelegramCaptured || !coupon.valid_until)
      ? ''
      : new Date(coupon.valid_until).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

    // Calcular posições (ajustado para melhor layout)
    const padding = 60;
    const headerHeight = 140;
    const discountSectionHeight = 220;
    const titleY = headerHeight + discountSectionHeight + 30;
    const codeSectionY = description ? titleY + 80 : titleY + 40;
    const codeSectionHeight = 100;
    const footerY = codeSectionY + codeSectionHeight + 30;

    // Gradiente para o fundo do desconto
    const gradientId = `gradient-${coupon.platform || 'general'}`;
    const gradientColor1 = styles.primaryColor;
    const gradientColor2 = this.lightenColor(styles.primaryColor, 20);

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente para seção de desconto -->
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradientColor1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${gradientColor2};stop-opacity:1" />
    </linearGradient>
    
    <!-- Sombra para elementos -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Sombra suave -->
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.2"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Fundo principal com gradiente sutil -->
  <rect width="${width}" height="${height}" fill="${styles.backgroundColor}"/>
  
  <!-- Padrão de fundo decorativo -->
  <circle cx="${width - 100}" cy="100" r="150" fill="${this.hexToRgba(styles.primaryColor, 0.05)}"/>
  <circle cx="100" cy="${height - 100}" r="120" fill="${this.hexToRgba(styles.primaryColor, 0.05)}"/>

  <!-- Header com gradiente -->
  <rect width="${width}" height="${headerHeight}" fill="url(#${gradientId})"/>
  
  <!-- Badge "NOVO" no canto superior direito -->
  <rect x="${width - 180}" y="30" width="120" height="35" fill="#FFFFFF" rx="18" filter="url(#shadow)"/>
  <text x="${width - 120}" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${styles.primaryColor}" text-anchor="middle">✨ NOVO</text>
  
  <!-- Ícone e nome da plataforma no header -->
  <text x="${padding}" y="75" font-family="Arial, sans-serif" font-size="56" fill="#FFFFFF">${styles.icon}</text>
  <text x="${padding + 70}" y="80" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#FFFFFF">${styles.platformName}</text>
  
  <!-- Seção de desconto destacada -->
  <rect x="${padding}" y="${headerHeight + 20}" width="${width - padding * 2}" height="${discountSectionHeight}" 
        fill="url(#${gradientId})" rx="24" filter="url(#softShadow)"/>
  
  <!-- Valor do desconto grande -->
  <text x="${width / 2}" y="${headerHeight + 130}" font-family="Arial, sans-serif" font-size="140" 
        font-weight="bold" fill="#FFFFFF" text-anchor="middle" filter="url(#shadow)" letter-spacing="2">${discountText}</text>
  
  <!-- Label "OFF" -->
  <text x="${width / 2}" y="${headerHeight + 190}" font-family="Arial, sans-serif" font-size="52" 
        font-weight="bold" fill="#FFFFFF" text-anchor="middle" opacity="0.95" letter-spacing="3">${discountLabel}</text>
  
  <!-- Título do cupom (apenas se não for Telegram) -->
  ${!isTelegramCaptured ? `
  <text x="${width / 2}" y="${titleY}" font-family="Arial, sans-serif" 
        font-size="38" font-weight="bold" fill="#1F2937" text-anchor="middle">${this.escapeXml(title)}</text>
  ` : ''}
  
  <!-- Descrição (se houver e não for Telegram) -->
  ${description && !isTelegramCaptured ? `
  <text x="${width / 2}" y="${titleY + 50}" font-family="Arial, sans-serif" 
        font-size="22" fill="#6B7280" text-anchor="middle">${this.escapeXml(description)}</text>
  ` : ''}
  
  <!-- Seção do código do cupom destacada -->
  <rect x="${padding}" y="${codeSectionY}" width="${width - padding * 2}" height="${codeSectionHeight}" 
        fill="#F9FAFB" rx="20" stroke="${styles.primaryColor}" stroke-width="4" filter="url(#shadow)"/>
  
  <!-- Label "CÓDIGO DO CUPOM" -->
  <text x="${padding + 30}" y="${codeSectionY + 35}" font-family="Arial, sans-serif" font-size="20" 
        font-weight="600" fill="#6B7280" letter-spacing="2">CÓDIGO DO CUPOM</text>
  
  <!-- Código destacado -->
  <rect x="${padding + 30}" y="${codeSectionY + 50}" width="${width - padding * 2 - 60}" height="45" 
        fill="#FFFFFF" rx="12" stroke="${styles.primaryColor}" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="${width / 2}" y="${codeSectionY + 82}" font-family="'Courier New', monospace" font-size="48" 
        font-weight="bold" fill="${styles.primaryColor}" text-anchor="middle" letter-spacing="5">${this.escapeXml(coupon.code || 'N/A')}</text>
  
  <!-- Footer com informações -->
  <g transform="translate(${padding}, ${footerY})">
    <!-- Informações em grid -->
    ${coupon.min_purchase > 0 ? `
    <g>
      <circle cx="18" cy="18" r="14" fill="${this.hexToRgba(styles.primaryColor, 0.15)}"/>
      <text x="18" y="23" font-family="Arial, sans-serif" font-size="18" fill="${styles.primaryColor}" text-anchor="middle">💳</text>
      <text x="45" y="23" font-family="Arial, sans-serif" font-size="18" fill="#374151">Compra mínima: <tspan font-weight="bold">R$ ${coupon.min_purchase.toFixed(2)}</tspan></text>
    </g>
    ` : ''}
    
    ${coupon.max_discount_value > 0 ? `
    <g transform="translate(0, ${coupon.min_purchase > 0 ? 40 : 0})">
      <circle cx="18" cy="18" r="14" fill="${this.hexToRgba(styles.primaryColor, 0.15)}"/>
      <text x="18" y="23" font-family="Arial, sans-serif" font-size="18" fill="${styles.primaryColor}" text-anchor="middle">💰</text>
      <text x="45" y="23" font-family="Arial, sans-serif" font-size="18" fill="#374151">Limite: <tspan font-weight="bold">R$ ${coupon.max_discount_value.toFixed(2)}</tspan></text>
    </g>
    ` : ''}
    
    ${expiryDate && !isTelegramCaptured ? `
    <g transform="translate(0, ${(coupon.min_purchase > 0 ? 40 : 0) + (coupon.max_discount_value > 0 ? 40 : 0)})">
      <circle cx="18" cy="18" r="14" fill="${this.hexToRgba(styles.primaryColor, 0.15)}"/>
      <text x="18" y="23" font-family="Arial, sans-serif" font-size="18" fill="${styles.primaryColor}" text-anchor="middle">📅</text>
      <text x="45" y="23" font-family="Arial, sans-serif" font-size="18" fill="#374151">Válido até: <tspan font-weight="bold">${expiryDate}</tspan></text>
    </g>
    ` : ''}
    
    ${coupon.is_exclusive ? `
    <g transform="translate(${width - padding * 2 - 200}, 0)">
      <rect x="0" y="0" width="180" height="35" fill="${styles.primaryColor}" rx="18" filter="url(#shadow)"/>
      <text x="90" y="25" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#FFFFFF" text-anchor="middle">⭐ EXCLUSIVO</text>
    </g>
    ` : ''}
  </g>
  
  <!-- Decoração inferior -->
  <rect x="0" y="${height - 8}" width="${width}" height="8" fill="url(#${gradientId})"/>
</svg>`;
  }

  /**
   * Obter estilos baseados na plataforma
   */
  getPlatformStyles(platform) {
    const styles = {
      mercadolivre: {
        backgroundColor: '#FFFFFF',
        primaryColor: '#FFE600',
        textColor: '#3483FA',
        platformName: 'MERCADO LIVRE',
        icon: '🛒'
      },
      shopee: {
        backgroundColor: '#FFFFFF',
        primaryColor: '#EE4D2D',
        textColor: '#EE4D2D',
        platformName: 'SHOPEE',
        icon: '🛍️'
      },
      amazon: {
        backgroundColor: '#FFFFFF',
        primaryColor: '#FF9900',
        textColor: '#232F3E',
        platformName: 'AMAZON',
        icon: '📦'
      },
      aliexpress: {
        backgroundColor: '#FFFFFF',
        primaryColor: '#FF6A00',
        textColor: '#FF6A00',
        platformName: 'ALIEXPRESS',
        icon: '🌐'
      },
      general: {
        backgroundColor: '#FFFFFF',
        primaryColor: '#6366F1',
        textColor: '#6366F1',
        platformName: 'CUPOM',
        icon: '🎁'
      }
    };

    return styles[platform] || styles.general;
  }

  /**
   * Truncar texto
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Escapar XML para SVG
   */
  escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Converter hex para rgba
   */
  hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    if (cleanHex.length !== 6) return `rgba(0, 0, 0, ${alpha})`;

    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Clarear cor (aumentar brilho)
   */
  lightenColor(hex, percent) {
    if (!hex) return '#FFFFFF';
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    if (cleanHex.length !== 6) return hex;

    const num = parseInt(cleanHex, 16);
    const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent / 100));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * percent / 100));
    const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * percent / 100));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
  }

  /**
   * Limpar arquivos temporários antigos
   */
  async cleanupOldFiles(maxAge = 3600000) { // 1 hora
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filepath);
          logger.debug(`Arquivo temporário removido: ${file}`);
        }
      }
    } catch (error) {
      logger.warn(`Erro ao limpar arquivos temporários: ${error.message}`);
    }
  }

  /**
   * Combinar imagem do produto com logo da plataforma
   * @param {string} productImageUrl - URL da imagem do produto
   * @param {string} platform - Plataforma (mercadolivre, shopee, etc)
   * @returns {Promise<string>} - Caminho da imagem combinada
   */
  async combineProductWithPlatformLogo(productImageUrl, platform) {
    try {
      logger.info(`🖼️ Combinando imagem do produto com logo da plataforma: ${platform}`);

      // Mapear plataforma para nome do arquivo da logo
      const platformLogos = {
        mercadolivre: 'mercadolivre-logo.png',
        shopee: 'shopee-logo.png',
        aliexpress: 'aliexpress-logo.png',
        amazon: 'amazon-logo.png'
      };

      const logoFileName = platformLogos[platform];
      if (!logoFileName) {
        logger.warn(`⚠️ Plataforma ${platform} não tem logo padrão, retornando apenas imagem do produto`);
        return productImageUrl; // Retornar URL original se não tiver logo
      }

      // Buscar logo da plataforma
      const logoPath = path.join(__dirname, '../../assets/logos', logoFileName);
      let absoluteLogoPath = path.resolve(logoPath);

      logger.info(`   Logo path: ${absoluteLogoPath}`);

      // Verificar se logo existe
      let logoFound = false;
      try {
        await fs.access(absoluteLogoPath);
        const stats = await fs.stat(absoluteLogoPath);
        if (!stats.isFile() || stats.size === 0) {
          throw new Error('Logo não é um arquivo válido');
        }
        logger.info(`   ✅ Logo encontrado: ${stats.size} bytes`);
        logoFound = true;
      } catch (logoError) {
        logger.warn(`⚠️ Logo não encontrado em ${absoluteLogoPath}, tentando caminhos alternativos...`);

        // Tentar caminhos alternativos
        const alternativePaths = [
          path.resolve(process.cwd(), 'assets/logos', logoFileName),
          path.resolve(process.cwd(), 'backend/assets/logos', logoFileName),
          path.resolve(__dirname, '../../../assets/logos', logoFileName),
          path.resolve(__dirname, '../../../../assets/logos', logoFileName)
        ];

        for (const altPath of alternativePaths) {
          const resolvedAltPath = path.resolve(altPath);
          try {
            await fs.access(resolvedAltPath);
            const altStats = await fs.stat(resolvedAltPath);
            if (altStats.isFile() && altStats.size > 0) {
              logger.info(`   ✅ Logo encontrado em caminho alternativo: ${resolvedAltPath}`);
              absoluteLogoPath = resolvedAltPath;
              logoFound = true;
              break;
            }
          } catch (altError) {
            logger.debug(`   Caminho alternativo não encontrado: ${resolvedAltPath}`);
          }
        }

        if (!logoFound) {
          logger.warn(`⚠️ Logo não encontrado em nenhum caminho, retornando apenas imagem do produto`);
          return productImageUrl; // Retornar URL original se logo não for encontrado
        }
      }

      // Baixar imagem do produto
      logger.info(`   Baixando imagem do produto: ${productImageUrl.substring(0, 100)}...`);
      const productImageResponse = await axios.get(productImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      const productImageBuffer = Buffer.from(productImageResponse.data);

      // Carregar imagens com sharp
      const productImage = sharp(productImageBuffer);
      const logoImage = sharp(absoluteLogoPath);

      // Obter metadados
      const productMetadata = await productImage.metadata();
      const logoMetadata = await logoImage.metadata();

      logger.info(`   Produto: ${productMetadata.width}x${productMetadata.height}`);
      logger.info(`   Logo: ${logoMetadata.width}x${logoMetadata.height}`);

      // Redimensionar logo para 15% da largura do produto (máximo 200px)
      const logoMaxWidth = Math.min(productMetadata.width * 0.15, 200);
      const logoAspectRatio = logoMetadata.width / logoMetadata.height;
      const logoNewHeight = logoMaxWidth / logoAspectRatio;

      const resizedLogo = await logoImage
        .resize(Math.round(logoMaxWidth), Math.round(logoNewHeight), {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      logger.info(`   Logo redimensionado: ${Math.round(logoMaxWidth)}x${Math.round(logoNewHeight)}`);

      // Combinar imagens: logo no canto superior direito
      const padding = 20; // Padding do logo em relação às bordas
      const logoX = productMetadata.width - Math.round(logoMaxWidth) - padding;
      const logoY = padding;

      const combinedImage = await productImage
        .composite([{
          input: resizedLogo,
          top: logoY,
          left: logoX
        }])
        .png({ quality: 90 })
        .toBuffer();

      // Salvar imagem combinada temporariamente
      const filename = `product_${Date.now()}_${platform}.png`;
      const filepath = path.join(this.tempDir, filename);
      await fs.writeFile(filepath, combinedImage);

      logger.info(`   ✅ Imagem combinada salva: ${filepath}`);
      logger.info(`   ✅ Tamanho final: ${combinedImage.length} bytes`);

      return filepath;

    } catch (error) {
      logger.error(`❌ Erro ao combinar imagem com logo: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      // Em caso de erro, retornar URL original do produto
      logger.warn(`⚠️ Retornando apenas imagem do produto (sem logo)`);
      return productImageUrl;
    }
  }
}

export default new ImageGenerator();

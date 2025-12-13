import sharp from 'sharp';
import logger from '../../config/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageGenerator {
  constructor() {
    this.tempDir = path.join(__dirname, '../../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.warn(`Erro ao criar diretório temp: ${error.message}`);
    }
  }

  /**
   * Gerar imagem de cupom baseada na plataforma usando SVG
   * @param {Object} coupon - Dados do cupom
   * @returns {Promise<string>} - Caminho da imagem gerada
   */
  async generateCouponImage(coupon) {
    try {
      const width = 800;
      const height = 400;

      // Cores e estilos baseados na plataforma
      const styles = this.getPlatformStyles(coupon.platform);

      // Criar SVG
      const svg = this.generateCouponSVG(coupon, styles, width, height);

      // Converter SVG para PNG usando sharp
      const buffer = await sharp(Buffer.from(svg))
        .png()
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
   * Gerar SVG do cupom
   */
  generateCouponSVG(coupon, styles, width, height) {
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% OFF`
      : `R$ ${coupon.discount_value.toFixed(2)} OFF`;

    const title = this.truncateText(coupon.title || 'Cupom de Desconto', 50);
    const applicability = coupon.is_general
      ? 'Válido para todos os produtos'
      : `Em produtos selecionados${coupon.applicable_products?.length ? ` (${coupon.applicable_products.length})` : ''}`;

    let details = '';
    if (coupon.min_purchase > 0) {
      details += `<text x="30" y="280" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">Compra mínima: R$ ${coupon.min_purchase.toFixed(2)}</text>`;
    }
    if (coupon.max_discount_value > 0) {
      details += `<text x="30" y="310" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">Limite máximo: R$ ${coupon.max_discount_value.toFixed(2)}</text>`;
    }

    const expiryDate = coupon.valid_until
      ? new Date(coupon.valid_until).toLocaleDateString('pt-BR')
      : '';

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo -->
  <rect width="${width}" height="${height}" fill="${styles.backgroundColor}"/>
  
  <!-- Borda superior -->
  <rect width="${width}" height="8" fill="${styles.primaryColor}"/>
  
  <!-- Ícone da plataforma -->
  <text x="30" y="60" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${styles.primaryColor}">${styles.icon}</text>
  
  <!-- Nome da plataforma -->
  <text x="90" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${styles.textColor}">${styles.platformName}</text>
  
  <!-- Título do cupom -->
  <text x="30" y="100" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#111827">${title}</text>
  
  <!-- Valor do desconto -->
  <text x="30" y="180" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="${styles.primaryColor}">${discountText}</text>
  
  <!-- Código do cupom -->
  <text x="30" y="240" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#111827">Código:</text>
  <text x="180" y="240" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${styles.primaryColor}">${coupon.code}</text>
  
  <!-- Informações adicionais -->
  ${details}
  
  <!-- Aplicabilidade -->
  <text x="30" y="340" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">${applicability}</text>
  
  <!-- Data de expiração -->
  ${expiryDate ? `<text x="30" y="370" font-family="Arial, sans-serif" font-size="18" fill="#6B7280">Válido até: ${expiryDate}</text>` : ''}
  
  <!-- Botão de ação -->
  <rect x="${width - 200}" y="${height - 60}" width="170" height="40" fill="${styles.primaryColor}" rx="5"/>
  <text x="${width - 115}" y="${height - 30}" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Aplicar Cupom</text>
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
}

export default new ImageGenerator();

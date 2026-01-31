import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serviço para converter e otimizar imagens para WhatsApp
 * Converte WebP e outros formatos para JPEG otimizado
 */
class ImageConverterService {
    constructor() {
        // Diretório temporário para armazenar imagens convertidas
        this.tempDir = path.join(__dirname, '../../../temp/images');
        this.ensureTempDir();
    }

    /**
     * Garantir que o diretório temporário existe
     */
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
            logger.info(`📁 Diretório temporário criado: ${this.tempDir}`);
        }
    }

    /**
     * Baixar imagem da URL
     * @param {string} imageUrl - URL da imagem
     * @returns {Promise<Buffer>} Buffer da imagem
     */
    async downloadImage(imageUrl) {
        try {
            logger.info(`📥 Baixando imagem: ${imageUrl.substring(0, 80)}...`);

            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            logger.info(`✅ Imagem baixada: ${(response.data.length / 1024).toFixed(2)} KB`);
            return Buffer.from(response.data);
        } catch (error) {
            logger.error(`❌ Erro ao baixar imagem: ${error.message}`);
            throw error;
        }
    }

    /**
     * Converter imagem para JPEG otimizado para WhatsApp
     * @param {Buffer} imageBuffer - Buffer da imagem original
     * @param {string} outputPath - Caminho de saída
     * @returns {Promise<string>} Caminho do arquivo convertido
     */
    async convertToWhatsAppFormat(imageBuffer, outputPath) {
        try {
            logger.info(`🔄 Convertendo imagem para formato WhatsApp...`);

            // Converter para JPEG com otimização
            await sharp(imageBuffer)
                .jpeg({
                    quality: 85, // Qualidade boa mas otimizada
                    progressive: true, // JPEG progressivo
                    mozjpeg: true // Usar mozjpeg para melhor compressão
                })
                .resize(1200, 1200, {
                    fit: 'inside', // Manter proporção
                    withoutEnlargement: true // Não aumentar imagens pequenas
                })
                .toFile(outputPath);

            const stats = fs.statSync(outputPath);
            logger.info(`✅ Imagem convertida: ${(stats.size / 1024).toFixed(2)} KB`);
            logger.info(`   Formato: JPEG otimizado para WhatsApp`);
            logger.info(`   Caminho: ${outputPath}`);

            return outputPath;
        } catch (error) {
            logger.error(`❌ Erro ao converter imagem: ${error.message}`);
            throw error;
        }
    }

    /**
     * Processar imagem para WhatsApp
     * Baixa, converte e retorna o caminho local
     * @param {string} imageUrl - URL da imagem original
     * @returns {Promise<string>} Caminho local da imagem convertida
     */
    async processImageForWhatsApp(imageUrl) {
        try {
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const outputFilename = `whatsapp_${timestamp}_${randomId}.jpg`;
            const outputPath = path.join(this.tempDir, outputFilename);

            // Baixar imagem
            const imageBuffer = await this.downloadImage(imageUrl);

            // Converter para JPEG otimizado
            await this.convertToWhatsAppFormat(imageBuffer, outputPath);

            return outputPath;
        } catch (error) {
            logger.error(`❌ Erro ao processar imagem para WhatsApp: ${error.message}`);
            throw error;
        }
    }

    /**
     * Limpar arquivos temporários antigos (mais de 1 hora)
     */
    cleanupOldFiles() {
        try {
            const files = fs.readdirSync(this.tempDir);
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;

            let deletedCount = 0;
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtimeMs > oneHour) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                logger.info(`🧹 Limpeza: ${deletedCount} arquivo(s) temporário(s) removido(s)`);
            }
        } catch (error) {
            logger.error(`❌ Erro ao limpar arquivos temporários: ${error.message}`);
        }
    }

    /**
     * Verificar se a URL é uma imagem WebP
     * @param {string} imageUrl - URL da imagem
     * @returns {boolean}
     */
    isWebPImage(imageUrl) {
        return imageUrl.toLowerCase().includes('.webp') ||
            imageUrl.toLowerCase().includes('webp');
    }

    /**
     * Verificar se precisa converter a imagem
     * @param {string} imageUrl - URL da imagem
     * @returns {boolean}
     */
    needsConversion(imageUrl) {
        // Converter WebP e imagens do Mercado Livre/Shopee
        return this.isWebPImage(imageUrl) ||
            imageUrl.includes('mlstatic.com') ||
            imageUrl.includes('shopee.com');
    }
}

// Exportar instância única
const imageConverterService = new ImageConverterService();

// Limpar arquivos antigos a cada 30 minutos
setInterval(() => {
    imageConverterService.cleanupOldFiles();
}, 30 * 60 * 1000);

export default imageConverterService;

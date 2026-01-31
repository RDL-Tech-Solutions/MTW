import express from 'express';
import imageConverterService from '../services/bots/imageConverterService.js';
import logger from '../config/logger.js';
import fs from 'fs';

const router = express.Router();

/**
 * GET /api/images/convert
 * Converte e serve uma imagem otimizada para WhatsApp
 * Query params:
 *   - url: URL da imagem original
 */
router.get('/convert', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL da imagem é obrigatória'
            });
        }

        logger.info(`🔄 Requisição de conversão de imagem: ${url.substring(0, 80)}...`);

        // Processar e converter imagem
        const convertedPath = await imageConverterService.processImageForWhatsApp(url);

        // Servir imagem convertida
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache de 24h

        const imageStream = fs.createReadStream(convertedPath);
        imageStream.pipe(res);

        // Limpar arquivo após envio
        imageStream.on('end', () => {
            try {
                fs.unlinkSync(convertedPath);
                logger.info(`🧹 Arquivo temporário removido após envio: ${convertedPath}`);
            } catch (error) {
                logger.error(`⚠️  Erro ao remover arquivo: ${error.message}`);
            }
        });

    } catch (error) {
        logger.error(`❌ Erro ao converter imagem: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;

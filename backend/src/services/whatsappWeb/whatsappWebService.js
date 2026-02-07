import client from './client.js';
import logger from '../../config/logger.js';
import { formatPhoneNumber } from '../../utils/helpers.js';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg.default || pkg;

class WhatsAppWebService {

    /**
     * Envia mensagem de texto simples
     * @param {string} to - Número ou ID do grupo (ex: 551199999999 ou 12036302342@g.us)
     * @param {string} message - Conteúdo da mensagem
     */
    async sendMessage(to, message) {
        try {
            const chatId = this._formatChatId(to);
            await client.sendMessage(chatId, message);
            return { success: true, messageId: 'wwebjs-' + Date.now() };
        } catch (error) {
            logger.error(`[WhatsAppWeb] Erro ao enviar texto para ${to}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Envia mensagem com imagem (URL ou Path)
     * @param {string} to - Destinatário
     * @param {string} imagePathOrUrl - Caminho local ou URL da imagem
     * @param {string} caption - Legenda
     */
    async sendImage(to, imagePathOrUrl, caption) {
        try {
            const chatId = this._formatChatId(to);
            let media;

            if (imagePathOrUrl.startsWith('http')) {
                // De URL publicamente acessível
                try {
                    media = await MessageMedia.fromUrl(imagePathOrUrl, { unsafeMime: true });
                } catch (urlErr) {
                    logger.error(`❌ [SafeMode] Erro ao baixar URL ${imagePathOrUrl}: ${urlErr.message}`);
                    media = null;
                }
            } else {
                // De arquivo local - Leitura Manual com Safe Mode
                try {
                    const fs = await import('fs');
                    const path = await import('path');

                    if (fs.existsSync(imagePathOrUrl)) {
                        const b64 = fs.readFileSync(imagePathOrUrl, { encoding: 'base64' });

                        // Detecção simples de mime type baseada na extensão
                        const ext = path.extname(imagePathOrUrl).toLowerCase();
                        let mimetype = 'image/jpeg';
                        if (ext === '.png') mimetype = 'image/png';
                        else if (ext === '.webp') mimetype = 'image/webp';

                        const filename = path.basename(imagePathOrUrl);

                        media = new MessageMedia(mimetype, b64, filename);
                    } else {
                        logger.warn(`⚠️ [SafeMode] Arquivo local não encontrado: ${imagePathOrUrl}`);
                        media = null;
                    }
                } catch (readErr) {
                    logger.error(`❌ [SafeMode] Falha crítica ao ler imagem local: ${readErr.message}`);
                    media = null;
                }
            }

            if (media) {
                await client.sendMessage(chatId, media, { caption });
                return { success: true, messageId: 'wwebjs-media-' + Date.now() };
            } else {
                // Fallback de segurança: Enviar Texto
                logger.warn(`⚠️ [SafeMode] Enviando APENAS TEXTO pois a mídia falhou/indisponível.`);
                const textFallback = caption || 'Imagem indisponível';
                await client.sendMessage(chatId, textFallback);
                return { success: true, messageId: 'wwebjs-fallback-' + Date.now(), fallback: true };
            }
        } catch (error) {
            logger.error(`[WhatsAppWeb] Erro ao enviar imagem para ${to}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Helper para formatar ID do chat (adiciona @c.us ou usa @g.us se for grupo)
     */
    _formatChatId(to) {
        // Se já tem @c.us ou @g.us, retorna
        if (to.includes('@')) return to;

        // Limpar caracteres não numéricos (exceto hífen se houver, usado em grupos antigos)
        const digits = to.replace(/[^\d-]/g, '');

        // Heurística para detectar grupos
        // 1. Grupos modernos (Community/Newsletter) começam com 1203... e tem ~18-19 dígitos
        // 2. Grupos antigos tinham formato (numero)-(timestamp)
        // 3. Números pessoais Brasil: 55 + DDD + 9 + 8 digitos = 12 a 13 digitos

        if (digits.length > 15 || digits.includes('-') || digits.startsWith('1203')) {
            return `${digits}@g.us`;
        }

        // Caso contrário, assume número pessoal
        return `${digits}@c.us`;
    }
}

export default new WhatsAppWebService();

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
                    logger.info(`📥 [WhatsApp] Baixando imagem de URL: ${imagePathOrUrl.substring(0, 100)}...`);
                    
                    // CORREÇÃO: Usar axios para download manual com headers apropriados
                    // MessageMedia.fromUrl pode falhar com URLs do AliExpress
                    const axios = (await import('axios')).default;
                    const response = await axios.get(imagePathOrUrl, {
                        responseType: 'arraybuffer',
                        timeout: 20000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            'Referer': imagePathOrUrl.includes('aliexpress') || imagePathOrUrl.includes('alicdn') 
                                ? 'https://www.aliexpress.com/' 
                                : imagePathOrUrl.includes('shopee') 
                                ? 'https://shopee.com.br/' 
                                : undefined
                        }
                    });

                    const buffer = Buffer.from(response.data);
                    logger.info(`   ✅ Imagem baixada. Tamanho: ${buffer.length} bytes`);

                    // Detectar mimetype do response ou usar padrão
                    const mimetype = response.headers['content-type'] || 'image/jpeg';
                    const base64 = buffer.toString('base64');
                    
                    // Gerar filename baseado na URL
                    const urlParts = imagePathOrUrl.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';

                    media = new MessageMedia(mimetype, base64, filename);
                    logger.info(`   ✅ MessageMedia criado: ${mimetype}, ${filename}`);
                    
                } catch (urlErr) {
                    logger.error(`❌ [WhatsApp] Erro ao baixar URL ${imagePathOrUrl.substring(0, 100)}: ${urlErr.message}`);
                    logger.error(`   Stack: ${urlErr.stack}`);
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
                logger.info(`✅ [WhatsApp] Imagem enviada com sucesso para ${chatId}`);
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

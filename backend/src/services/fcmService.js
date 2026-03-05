import admin from 'firebase-admin';
import { createRequire } from 'module';
import logger from '../config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serviço de integração com Firebase Cloud Messaging (FCM)
 * 
 * Features:
 * - Envio de notificações individuais e em massa
 * - Armazenamento de FCM tokens por dispositivo
 * - Retry automático
 * - Templates de notificação
 */
class FCMService {
    constructor() {
        this.app = null;
        this.messaging = null;
        this.initialized = false;
        this.initializeApp();
    }

    /**
     * Inicializar Firebase Admin SDK
     */
    async initializeApp() {
        try {
            // Evitar re-inicialização
            if (admin.apps.length > 0) {
                this.app = admin.apps[0];
                this.messaging = admin.messaging(this.app);
                this.initialized = true;
                logger.info('✅ FCM: Usando instância Firebase Admin existente');
                return;
            }

            // Tentar carregar service account JSON
            // Caminho padrão: backend/firebase-service-account.json
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                path.resolve(__dirname, '../../firebase-service-account.json');

            let credential;

            try {
                // Verificar se arquivo existe antes de tentar carregar
                const fs = await import('fs');
                if (!fs.existsSync(serviceAccountPath)) {
                    throw new Error(`Arquivo não encontrado: ${serviceAccountPath}`);
                }

                const require = createRequire(import.meta.url);
                const serviceAccount = require(serviceAccountPath);
                credential = admin.credential.cert(serviceAccount);
                logger.info(`✅ FCM: Service account carregado de ${serviceAccountPath}`);
            } catch (fileError) {
                // Fallback: usar Application Default Credentials (para Cloud Run / GCP)
                logger.warn(`⚠️ FCM: Service account não encontrado (${serviceAccountPath})`);
                logger.warn(`   Erro: ${fileError.message}`);
                logger.warn(`   Tentando Application Default Credentials...`);
                credential = admin.credential.applicationDefault();
            }

            this.app = admin.initializeApp({ credential });
            this.messaging = admin.messaging(this.app);
            this.initialized = true;

            logger.info('✅ Firebase Admin (FCM) inicializado com sucesso');
        } catch (error) {
            logger.error(`❌ Erro ao inicializar Firebase Admin: ${error.message}`);
            this.initialized = false;
        }
    }

    /**
     * Verificar se o serviço está disponível
     */
    isEnabled() {
        return this.initialized && !!this.messaging;
    }

    /**
     * Enviar notificação para um dispositivo via token FCM
     * 
     * @param {Object} notification
     * @param {string} notification.fcm_token - Token FCM do dispositivo
     * @param {string} notification.title - Título
     * @param {string} notification.message - Corpo da mensagem
     * @param {Object} notification.data - Dados adicionais (opcional)
     * @param {string} notification.image - URL da imagem (opcional)
     * @param {string} notification.priority - 'high' | 'normal' (opcional)
     * @returns {Promise<Object>}
     */
    async sendToUser(notification) {
        try {
            if (!this.isEnabled()) {
                throw new Error('FCM não está habilitado');
            }

            const {
                fcm_token,
                // Suporte legacy: external_id é ignorado (não usado no FCM)
                title,
                message,
                data = {},
                image,
                priority = 'normal'
            } = notification;

            if (!fcm_token) {
                logger.warn(`⚠️ FCM: fcm_token ausente, notificação ignorada`);
                return { success: false, error: 'fcm_token ausente' };
            }

            if (!title || !message) {
                throw new Error('title e message são obrigatórios');
            }

            const payload = {
                token: fcm_token,
                notification: {
                    title,
                    body: message,
                    ...(image && { imageUrl: image })
                },
                data: {
                    ...Object.fromEntries(
                        Object.entries({ ...data, sent_at: new Date().toISOString() })
                            .map(([k, v]) => [k, String(v)])
                    )
                },
                android: {
                    priority: priority === 'high' ? 'high' : 'normal',
                    notification: {
                        ...(image && { imageUrl: image }),
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    },
                    ttl: 3600 * 1000 // 1 hora em ms
                },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true,
                            ...(priority === 'high' && { badge: 1 })
                        }
                    }
                }
            };

            const response = await this.messaging.send(payload);

            logger.info(`✅ FCM: Notificação enviada. Message ID: ${response}`);

            return {
                success: true,
                message_id: response,
                recipients: 1
            };
        } catch (error) {
            // Tokens inválidos/expirados não são erros críticos
            if (error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-registration-token') {
                logger.warn(`⚠️ FCM: Token inválido/expirado. Considere remover do banco.`);
                return { success: false, error: 'token_invalid', code: error.code };
            }

            logger.error(`❌ FCM: Erro ao enviar notificação: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar notificação para múltiplos dispositivos
     * FCM suporta até 500 tokens por requisição via sendEachForMulticast
     * 
     * @param {Array<string>} fcmTokens - Array de tokens FCM
     * @param {Object} notification - Dados da notificação
     * @returns {Promise<Object>}
     */
    async sendToMultiple(fcmTokens, notification) {
        try {
            if (!this.isEnabled()) {
                throw new Error('FCM não está habilitado');
            }

            if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
                logger.warn('⚠️ FCM: Array de tokens vazio, nenhuma notificação enviada');
                return { success: false, total_sent: 0, total_failed: 0, error: 'Nenhum token fornecido' };
            }

            const {
                title,
                message,
                data = {},
                image,
                priority = 'normal'
            } = notification;

            if (!title || !message) {
                throw new Error('title e message são obrigatórios');
            }

            // Filtrar tokens nulos/vazios
            const validTokens = fcmTokens.filter(t => t && typeof t === 'string' && t.trim().length > 0);
            if (validTokens.length === 0) {
                return { success: false, total_sent: 0, total_failed: 0, error: 'Nenhum token válido' };
            }

            // FCM suporta até 500 tokens por requisição
            const batchSize = 500;
            const batches = [];
            for (let i = 0; i < validTokens.length; i += batchSize) {
                batches.push(validTokens.slice(i, i + batchSize));
            }

            let totalSuccess = 0;
            let totalFailed = 0;
            const invalidTokens = [];

            for (const batch of batches) {
                try {
                    const multicastMessage = {
                        tokens: batch,
                        notification: {
                            title,
                            body: message,
                            ...(image && { imageUrl: image })
                        },
                        data: Object.fromEntries(
                            Object.entries({ ...data, sent_at: new Date().toISOString() })
                                .map(([k, v]) => [k, String(v)])
                        ),
                        android: {
                            priority: priority === 'high' ? 'high' : 'normal',
                            ttl: 3600 * 1000
                        },
                        apns: {
                            payload: {
                                aps: { contentAvailable: true }
                            }
                        }
                    };

                    logger.info(`📤 FCM: Enviando para ${batch.length} dispositivos...`);

                    const response = await this.messaging.sendEachForMulticast(multicastMessage);

                    totalSuccess += response.successCount;
                    totalFailed += response.failureCount;

                    // Coletar tokens inválidos para possível limpeza e logar erros detalhados
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const code = resp.error?.code;
                            const errorMsg = resp.error?.message;
                            
                            // Log detalhado do erro
                            logger.error(`❌ FCM: Falha ao enviar para token ${batch[idx].substring(0, 20)}...`);
                            logger.error(`   Código: ${code || 'UNKNOWN'}`);
                            logger.error(`   Mensagem: ${errorMsg || 'Sem mensagem'}`);
                            
                            if (code === 'messaging/registration-token-not-registered' ||
                                code === 'messaging/invalid-registration-token') {
                                invalidTokens.push(batch[idx]);
                                logger.warn(`   ⚠️ Token inválido/expirado - deve ser removido do banco`);
                            }
                        }
                    });

                    } catch (batchError) {
                    logger.error(`❌ FCM: Erro no batch: ${batchError.message}`);
                    totalFailed += batch.length;
                }
            }

            logger.info(`📊 FCM batch total: ${totalSuccess} enviados, ${totalFailed} falhas`);

            if (invalidTokens.length > 0) {
                logger.warn(`⚠️ FCM: ${invalidTokens.length} tokens inválidos detectados. Considere limpar do banco.`);
            }

            return {
                success: totalSuccess > 0,
                total_sent: totalSuccess,
                total_failed: totalFailed,
                invalid_tokens: invalidTokens
            };
        } catch (error) {
            logger.error(`❌ FCM: Erro ao enviar em massa: ${error.message}`);
            return {
                success: false,
                error: error.message,
                total_sent: 0,
                total_failed: fcmTokens.length
            };
        }
    }

    // ========== MÉTODOS DE COMPATIBILIDADE ==========

    /**
     * Notificação de nova promoção
     */
    async notifyNewPromo(users, product) {
        const tokens = users.map(u => u.fcm_token).filter(Boolean);
        if (tokens.length === 0) {
            logger.warn('⚠️ FCM: Nenhum token FCM disponível para notifyNewPromo');
            return { success: false, total_sent: 0, total_failed: users.length };
        }

        return await this.sendToMultiple(tokens, {
            title: '🔥 Nova Promoção!',
            message: `${product.name}${product.discount_percentage ? ` - ${product.discount_percentage}% OFF` : ''} - R$ ${parseFloat(product.current_price).toFixed(2)}`,
            data: {
                type: 'new_product',
                productId: String(product.id),
                screen: 'ProductDetails',
                discount: String(product.discount_percentage || 0)
            },
            priority: 'high'
        });
    }

    /**
     * Notificação de queda de preço
     */
    async notifyPriceDrop(users, product, oldPrice, newPrice) {
        const tokens = users.map(u => u.fcm_token).filter(Boolean);
        const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

        return await this.sendToMultiple(tokens, {
            title: '💰 Preço Caiu!',
            message: `${product.name} - De R$ ${parseFloat(oldPrice).toFixed(2)} por R$ ${parseFloat(newPrice).toFixed(2)} (-${discount}%)`,
            data: {
                type: 'price_drop',
                productId: String(product.id),
                screen: 'ProductDetails',
                oldPrice: String(oldPrice),
                newPrice: String(newPrice),
                discount: String(discount)
            },
            priority: 'high'
        });
    }

    /**
     * Notificação de novo cupom
     */
    async notifyNewCoupon(users, coupon) {
        const tokens = users.map(u => u.fcm_token).filter(Boolean);

        return await this.sendToMultiple(tokens, {
            title: '🎉 Novo Cupom Disponível!',
            message: `${coupon.code} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'} OFF`,
            data: {
                type: 'new_coupon',
                couponId: String(coupon.id),
                screen: 'CouponDetails',
                code: coupon.code
            },
            priority: 'high'
        });
    }

    /**
     * Notificação de cupom expirando
     */
    async notifyExpiringCoupon(users, coupon, daysLeft) {
        const tokens = users.map(u => u.fcm_token).filter(Boolean);
        const urgency = daysLeft === 1 ? '⚠️' : '⏰';
        const dayText = daysLeft === 1 ? 'amanhã' : `em ${daysLeft} dias`;

        return await this.sendToMultiple(tokens, {
            title: `${urgency} Cupom Expirando!`,
            message: `${coupon.code} expira ${dayText}. Use agora!`,
            data: {
                type: 'expiring_coupon',
                couponId: String(coupon.id),
                screen: 'CouponDetails',
                daysLeft: String(daysLeft)
            },
            priority: daysLeft === 1 ? 'high' : 'normal'
        });
    }

    /**
     * Notificação personalizada — interface compatível com o código existente
     * @param {Array<Object>} users - Array de usuários com fcm_token
     * @param {string} title
     * @param {string} body
     * @param {Object} data
     * @param {Object} options
     */
    async sendCustomNotification(users, title, body, data = {}, options = {}) {
        const tokens = users.map(u => u.fcm_token).filter(Boolean);

        if (tokens.length === 0) {
            logger.warn(`⚠️ FCM: sendCustomNotification - nenhum token válido nos usuários`);
            return { success: false, total_sent: 0, total_failed: users.length };
        }

        return await this.sendToMultiple(tokens, {
            title,
            message: body,
            data,
            ...options
        });
    }
}

export default new FCMService();

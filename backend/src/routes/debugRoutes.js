import express from 'express';
import BotChannel from '../models/BotChannel.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/debug/whatsapp-channels
 * Diagnosticar canais WhatsApp duplicados
 */
router.get('/whatsapp-channels', async (req, res) => {
    try {
        // Buscar todos os canais WhatsApp
        const channels = await BotChannel.findAll({
            where: { platform: 'whatsapp' },
            order: [['identifier', 'ASC'], ['created_at', 'ASC']]
        });

        // Agrupar por identifier
        const groupedByIdentifier = {};
        for (const channel of channels) {
            if (!groupedByIdentifier[channel.identifier]) {
                groupedByIdentifier[channel.identifier] = [];
            }
            groupedByIdentifier[channel.identifier].push({
                id: channel.id,
                name: channel.name,
                identifier: channel.identifier,
                active: channel.active,
                created_at: channel.created_at
            });
        }

        // Identificar duplicados
        const duplicates = [];
        const uniqueChannels = [];

        for (const [identifier, channelGroup] of Object.entries(groupedByIdentifier)) {
            if (channelGroup.length > 1) {
                duplicates.push({
                    identifier,
                    count: channelGroup.length,
                    channels: channelGroup
                });
            } else {
                uniqueChannels.push(channelGroup[0]);
            }
        }

        res.json({
            success: true,
            total: channels.length,
            unique: uniqueChannels.length,
            duplicates: duplicates.length,
            duplicateDetails: duplicates,
            uniqueChannels
        });

    } catch (error) {
        logger.error('Erro ao diagnosticar canais WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/debug/whatsapp-channels/fix
 * Corrigir canais WhatsApp duplicados (manter apenas o mais antigo)
 */
router.post('/whatsapp-channels/fix', async (req, res) => {
    try {
        // Buscar todos os canais WhatsApp
        const channels = await BotChannel.findAll({
            where: { platform: 'whatsapp' },
            order: [['identifier', 'ASC'], ['created_at', 'ASC']]
        });

        // Agrupar por identifier
        const groupedByIdentifier = {};
        for (const channel of channels) {
            if (!groupedByIdentifier[channel.identifier]) {
                groupedByIdentifier[channel.identifier] = [];
            }
            groupedByIdentifier[channel.identifier].push(channel);
        }

        const removed = [];
        const kept = [];

        // Para cada grupo de duplicados, manter apenas o mais antigo
        for (const [identifier, channelGroup] of Object.entries(groupedByIdentifier)) {
            if (channelGroup.length > 1) {
                // Ordenar por data de criação (mais antigo primeiro)
                channelGroup.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                // Manter o primeiro (mais antigo)
                const keepChannel = channelGroup[0];
                kept.push({
                    id: keepChannel.id,
                    name: keepChannel.name,
                    identifier: keepChannel.identifier,
                    created_at: keepChannel.created_at
                });

                // Remover os outros
                for (let i = 1; i < channelGroup.length; i++) {
                    const removeChannel = channelGroup[i];
                    removed.push({
                        id: removeChannel.id,
                        name: removeChannel.name,
                        identifier: removeChannel.identifier,
                        created_at: removeChannel.created_at
                    });

                    await removeChannel.destroy();
                }
            }
        }

        logger.info(`✅ Canais duplicados corrigidos. Removidos: ${removed.length}, Mantidos: ${kept.length}`);

        res.json({
            success: true,
            removed: removed.length,
            removedChannels: removed,
            kept: kept.length,
            keptChannels: kept
        });

    } catch (error) {
        logger.error('Erro ao corrigir canais WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;

import AppCard from '../models/AppCard.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../config/logger.js';
import { supabase } from '../config/database.js';

class AppCardController {
    // Listar cards ativos (público — para o app)
    static async listActive(req, res, next) {
        try {
            const cards = await AppCard.findActive();
            res.json(successResponse(cards));
        } catch (error) {
            logger.error(`Erro ao listar cards ativos: ${error.message}`);
            next(error);
        }
    }

    // Listar todos os cards (admin)
    static async listAll(req, res, next) {
        try {
            const cards = await AppCard.findAll();
            res.json(successResponse(cards));
        } catch (error) {
            logger.error(`Erro ao listar todos os cards: ${error.message}`);
            next(error);
        }
    }

    // Buscar card por ID
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const card = await AppCard.findById(id);

            if (!card) {
                return res.status(404).json(errorResponse('Card não encontrado', 'NOT_FOUND'));
            }

            res.json(successResponse(card));
        } catch (error) {
            next(error);
        }
    }

    // Criar card (admin)
    static async create(req, res, next) {
        try {
            const { title, subtitle, image_url, background_color, text_color, action_type, action_value, product_ids, position } = req.body;

            if (!title) {
                return res.status(400).json(errorResponse('Título é obrigatório', 'VALIDATION_ERROR'));
            }

            const card = await AppCard.create({
                title,
                subtitle: subtitle || null,
                image_url: image_url || null,
                background_color: background_color || '#DC2626',
                text_color: text_color || '#FFFFFF',
                action_type: action_type || 'link',
                action_value: action_value || null,
                product_ids: product_ids || [],
                position: position || 0,
            });

            logger.info(`Card criado: ${card.title} (${card.id})`);
            res.status(201).json(successResponse(card, 'Card criado com sucesso'));
        } catch (error) {
            logger.error(`Erro ao criar card: ${error.message}`);
            next(error);
        }
    }

    // Atualizar card (admin)
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            const existing = await AppCard.findById(id);

            if (!existing) {
                return res.status(404).json(errorResponse('Card não encontrado', 'NOT_FOUND'));
            }

            const card = await AppCard.update(id, req.body);
            logger.info(`Card atualizado: ${card.title} (${id})`);
            res.json(successResponse(card, 'Card atualizado com sucesso'));
        } catch (error) {
            logger.error(`Erro ao atualizar card: ${error.message}`);
            next(error);
        }
    }

    // Deletar card (admin)
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            await AppCard.delete(id);
            logger.info(`Card deletado: ${id}`);
            res.json(successResponse(null, 'Card deletado com sucesso'));
        } catch (error) {
            logger.error(`Erro ao deletar card: ${error.message}`);
            next(error);
        }
    }

    // Toggle ativo/inativo (admin)
    static async toggleActive(req, res, next) {
        try {
            const { id } = req.params;
            const card = await AppCard.toggleActive(id);
            logger.info(`Card ${card.is_active ? 'ativado' : 'desativado'}: ${card.title} (${id})`);
            res.json(successResponse(card, `Card ${card.is_active ? 'ativado' : 'desativado'} com sucesso`));
        } catch (error) {
            logger.error(`Erro ao alternar status do card: ${error.message}`);
            next(error);
        }
    }

    // Reordenar cards (admin)
    static async reorder(req, res, next) {
        try {
            const { orderedIds } = req.body;

            if (!orderedIds || !Array.isArray(orderedIds)) {
                return res.status(400).json(errorResponse('orderedIds deve ser um array de IDs', 'VALIDATION_ERROR'));
            }

            const cards = await AppCard.reorder(orderedIds);
            logger.info(`Cards reordenados: ${orderedIds.length} cards`);
            res.json(successResponse(cards, 'Cards reordenados com sucesso'));
        } catch (error) {
            logger.error(`Erro ao reordenar cards: ${error.message}`);
            next(error);
        }
    }

    // Upload de imagem (admin)
    static async uploadImage(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json(errorResponse('Nenhuma imagem enviada', 'VALIDATION_ERROR'));
            }

            const file = req.file;
            const ext = file.originalname.split('.').pop() || 'jpg';
            const fileName = `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const filePath = `cards/${fileName}`;

            // Ensure bucket exists
            const { data: buckets } = await supabase.storage.listBuckets();
            const bucketExists = buckets?.some(b => b.name === 'app-cards');
            if (!bucketExists) {
                await supabase.storage.createBucket('app-cards', {
                    public: true,
                    fileSizeLimit: 5 * 1024 * 1024,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                });
                logger.info('Bucket "app-cards" criado no Supabase Storage');
            }

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('app-cards')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true,
                });

            if (error) {
                logger.error(`Erro ao fazer upload no Supabase: ${error.message}`);
                return res.status(500).json(errorResponse('Erro ao fazer upload da imagem', 'UPLOAD_ERROR'));
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('app-cards')
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;
            logger.info(`Imagem de card enviada: ${publicUrl}`);

            res.json(successResponse({ url: publicUrl }, 'Imagem enviada com sucesso'));
        } catch (error) {
            logger.error(`Erro ao fazer upload de imagem: ${error.message}`);
            next(error);
        }
    }
}

export default AppCardController;

import express from 'express';
import multer from 'multer';
import AppCardController from '../controllers/appCardController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Multer config — store in memory for Supabase upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de imagem não permitido. Use JPEG, PNG, WebP ou GIF.'));
        }
    },
});

// Rotas públicas (para o app mobile)
router.get('/', AppCardController.listActive);
router.get('/:id', AppCardController.getById);

// Rotas admin
router.get('/admin/all', authenticateToken, requireAdmin, AppCardController.listAll);
router.post('/', authenticateToken, requireAdmin, AppCardController.create);
router.post('/upload-image', authenticateToken, requireAdmin, upload.single('image'), AppCardController.uploadImage);
router.put('/reorder', authenticateToken, requireAdmin, AppCardController.reorder);
router.put('/:id', authenticateToken, requireAdmin, AppCardController.update);
router.delete('/:id', authenticateToken, requireAdmin, AppCardController.delete);
router.patch('/:id/toggle', authenticateToken, requireAdmin, AppCardController.toggleActive);

export default router;

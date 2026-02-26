import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Obter o diretório raiz do projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

export const config = {
    enabled: process.env.WHATSAPP_WEB_ENABLED === 'true',
    // Usar caminho absoluto para garantir persistência
    sessionPath: process.env.WHATSAPP_SESSION_PATH 
        ? path.resolve(projectRoot, process.env.WHATSAPP_SESSION_PATH)
        : path.resolve(projectRoot, '.wwebjs_auth'),
    pairingNumber: process.env.WHATSAPP_PAIRING_NUMBER, // Número para gerar código (apenas dígitos)
    adminNumbers: (process.env.WHATSAPP_ADMIN_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean),

    // Métodos para atualizar config dinamicamente (vindo do DB)
    update(newConfig) {
        if (newConfig.enabled !== undefined) this.enabled = newConfig.enabled;
        if (newConfig.pairingNumber !== undefined) this.pairingNumber = newConfig.pairingNumber;
        if (newConfig.adminNumbers !== undefined) {
            this.adminNumbers = newConfig.adminNumbers.split(',').map(n => n.trim()).filter(Boolean);
        }
    },

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
};

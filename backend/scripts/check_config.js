
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BotConfig = (await import('../src/models/BotConfig.js')).default;

async function check() {
    console.log('--- CHECKING CONFIG ---');
    const config = await BotConfig.get();
    console.log('whatsapp_enabled:', config.whatsapp_enabled);
    console.log('whatsapp_web_enabled:', config.whatsapp_web_enabled);
    console.log('telegram_enabled:', config.telegram_enabled);
    console.log('--- END CHECK ---');
    process.exit(0);
}

check();

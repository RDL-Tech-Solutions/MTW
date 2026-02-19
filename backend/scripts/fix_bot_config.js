
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function fixConfig() {
    try {
        const BotConfig = (await import('../src/models/BotConfig.js')).default;

        console.log('--- FIXING CONFIG ---');

        // Update whatsapp_web_enabled
        console.log('Setting whatsapp_web_enabled = true...');
        await BotConfig.updateField('whatsapp_web_enabled', true);

        // Verify
        const config = await BotConfig.get();
        console.log('VERIFICATION:');
        console.log('whatsapp_web_enabled:', config.whatsapp_web_enabled);

        console.log('--- DONE ---');
    } catch (error) {
        console.error('Error updating config:', error);
    }
    process.exit(0);
}

fixConfig();

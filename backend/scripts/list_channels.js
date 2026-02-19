
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import BotChannel from '../src/models/BotChannel.js';

async function list() {
    console.log('--- CHANNELS ---');
    const channels = await BotChannel.findActive();

    channels.forEach(c => {
        if (c.platform.includes('whatsapp')) {
            console.log(`[${c.platform}] ${c.name}`);
            console.log(`  ID: ${c.id}`);
            console.log(`  Identifier: ${c.identifier}`);
            console.log(`  no_coupons: ${c.no_coupons}`);
            console.log(`  only_coupons: ${c.only_coupons}`);
            console.log(`  platform_filter: ${JSON.stringify(c.platform_filter)}`);
            console.log(`  content_filter: ${JSON.stringify(c.content_filter)}`);
            console.log(`  category_filter: ${JSON.stringify(c.category_filter)}`);
            console.log('---');
        }
    });
    process.exit(0);
}

list();


import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Category from '../src/models/Category.js';

async function listCategories() {
    console.log('--- CATEGORIES ---');
    try {
        const categories = await Category.findAll();
        if (!categories || categories.length === 0) {
            console.log('No categories found.');
        } else {
            const fs = await import('fs');
            const path = await import('path');
            const data = categories.map(c => ({ name: c.name, slug: c.slug, id: c.id }));
            fs.writeFileSync('categories_dump.json', JSON.stringify(data, null, 2));
            console.log('Dumped to categories_dump.json');
        }
    } catch (e) {
        console.error('Error listing categories:', e);
    }
    setTimeout(() => process.exit(0), 1000);
}

listCategories();

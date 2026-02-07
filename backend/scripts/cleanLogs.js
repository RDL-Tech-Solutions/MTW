import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../logs');
const filesToClean = ['app.log', 'error.log'];

console.log('🧹 Starting log cleanup...');

filesToClean.forEach(file => {
    const filePath = path.join(logsDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`📄 Cleaning ${file} (${sizeMB} MB)...`);

        try {
            // Truncate file to 0 bytes
            fs.truncateSync(filePath, 0);
            console.log(`✅ ${file} truncated successfully.`);
        } catch (err) {
            console.error(`❌ Failed to truncate ${file}:`, err.message);
        }
    } else {
        console.log(`ℹ️ ${file} does not exist, skipping.`);
    }
});

console.log('✨ Cleanup finished.');

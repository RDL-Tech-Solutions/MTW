import { config } from '../src/services/whatsappWeb/config.js';
import BotConfig from '../src/models/BotConfig.js';
import fs from 'fs';
import path from 'path';

async function diagnose() {
    console.log('--- WhatsApp Configuration Diagnostic ---');
    console.log('Environment Variables:');
    console.log('WHATSAPP_ADMIN_NUMBERS:', process.env.WHATSAPP_ADMIN_NUMBERS);

    console.log('\n--- Internal Config State (Initial) ---');
    console.log('config.adminNumbers:', config.adminNumbers);

    console.log('\n--- Database Configuration ---');
    try {
        const dbConfig = await BotConfig.get();
        console.log('DB Config:', JSON.stringify(dbConfig, null, 2));

        // Simulate what client.js does
        const effectiveAdminNumbers = dbConfig.whatsapp_web_admin_numbers || (config.adminNumbers || []).join(',');
        console.log('\nEffective Admin Numbers String:', effectiveAdminNumbers);

        const parsedAdminNumbers = effectiveAdminNumbers.split(',').map(n => n.trim()).filter(Boolean);
        console.log('Parsed Admin Numbers List:', parsedAdminNumbers);

    } catch (err) {
        console.error('Error fetching BotConfig:', err);
    }

    console.log('\n--- Recent Logs (Last 50 lines) ---');
    const logPath = path.resolve('logs/app.log');
    if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n');
        const lastLines = lines.slice(-50);

        // Filter for relevant logs
        const relevantLogs = lastLines.filter(line =>
            line.includes('[MsgHandler]') ||
            line.includes('WhatsApp') ||
            line.includes('Auth Check')
        );

        if (relevantLogs.length > 0) {
            console.log(relevantLogs.join('\n'));
        } else {
            console.log('No recent relevant logs found in the last 50 lines.');
            console.log('Printing last 10 lines strictly:');
            console.log(lastLines.slice(-10).join('\n'));
        }
    } else {
        console.log('Log file not found at:', logPath);
    }
}

diagnose().then(() => process.exit());

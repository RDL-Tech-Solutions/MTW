import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

console.log('Node version:', process.version);
console.log('Event defined?', typeof Event !== 'undefined');

try {
    const client = new Client({
        puppeteer: {
            headless: true,
            args: ['--no-sandbox']
        }
    });

    console.log('Client created successfully.');

    client.initialize().then(() => {
        console.log('Initialized!');
        process.exit(0);
    }).catch(err => {
        console.error('Initialization failed:', err);
        process.exit(1);
    });

} catch (e) {
    console.error('Crash during creation:', e);
}

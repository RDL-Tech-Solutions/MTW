import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth_test' // Use separate session to avoid lock
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', (qr) => {
    console.log('QR Received. Ignoring, asking for pairing code...');
});

const phoneNumber = process.argv[2];

if (!phoneNumber) {
    console.error('Usage: node test_pair.js <number>');
    process.exit(1);
}

console.log('Initializing...');

client.initialize().then(async () => {
    console.log('Initialized. Waiting for browser...');
    // Await browser readiness
    await new Promise(r => setTimeout(r, 10000));

    console.log(`Requesting pairing code for ${phoneNumber}...`);
    try {
        const code = await client.requestPairingCode(phoneNumber);
        console.log('SUCCESS! Code:', code);
        process.exit(0);
    } catch (e) {
        console.error('FAILURE ERROR:', e);
        console.error('ERROR MESSAGE:', e.message);
        if (e.message === 't: t') {
            console.error('HINT: This is a generic WhatsApp error (t:t). Usually caused by Rate Limit (429) or if the number is already connected.');
        }
        process.exit(1);
    }
}).catch(e => {
    console.error('Init failure:', e);
    process.exit(1);
});

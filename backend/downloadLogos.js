
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGOS_DIR = path.join(__dirname, 'src', 'assets', 'logos');
if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

// URLs das imagens (usando Google Favicon API - Altíssima confiabilidade)
const LOGOS = {
    'shopee.png': 'https://logodownload.org/wp-content/uploads/2021/03/shopee-logo.png',
    'mercadolivre.png': 'https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=256',
    'amazon.png': 'https://www.google.com/s2/favicons?domain=amazon.com.br&sz=256',
    'magazineluiza.png': 'https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=256',
    'aliexpress.png': 'https://www.google.com/s2/favicons?domain=aliexpress.com&sz=256',
    'kabum.png': 'https://www.google.com/s2/favicons?domain=kabum.com.br&sz=256',
    'pichau.png': 'https://www.google.com/s2/favicons?domain=pichau.com.br&sz=256',
    'terabyte.png': 'https://www.google.com/s2/favicons?domain=terabyteshop.com.br&sz=256',
    'general.png': 'https://cdn-icons-png.flaticon.com/512/2038/2038767.png'
};

const downloadImage = (url, filename) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(LOGOS_DIR, filename);

        // Se arquivo já existe e tem tamanho > 0, pular (exceto general, que sempre garantimos)
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
            console.log(`✅ ${filename} já existe.`);
            return resolve();
        }

        console.log(`⬇️ Baixando ${filename} de ${url}...`);

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const request = https.get(url, options, (res) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                console.log(`🔀 Redirecionando ${filename} para ${res.headers.location}`);
                return downloadImage(res.headers.location, filename).then(resolve);
            }

            if (res.statusCode !== 200) {
                console.error(`❌ Falha ao baixar ${filename}: Status ${res.statusCode}`);
                return resolve();
            }

            const fileStream = fs.createWriteStream(filePath);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`✅ ${filename} salvo com sucesso.`);
                resolve();
            });
        }).on('error', (err) => {
            console.error(`❌ Erro ao baixar ${filename}: ${err.message}`);
            resolve();
        });
    });
};

async function main() {
    console.log('🚀 Iniciando download de logos (Google Favicons ISO)...');

    for (const [filename, url] of Object.entries(LOGOS)) {
        await downloadImage(url, filename);
    }
    console.log('🏁 Concluído!');
}

main();

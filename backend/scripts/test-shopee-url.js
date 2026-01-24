import axios from 'axios';

const url = 'https://s.shopee.com.br/2B8secvRH2';

console.log('🧪 Testando expansão de link Shopee\n');

const response = await axios.head(url, {
    maxRedirects: 5,
    validateStatus: () => true,
    timeout: 10000
});

const expandedUrl = response.request.res.responseUrl;
console.log('URL expandida:', expandedUrl);
console.log('');

// Testar padrões
const patterns = [
    { name: 'Padrão 1', regex: /shopee\.com(?:\.br)?\/([^/]+)\/(\d+)\/(\d+)/ },
    { name: 'Padrão i.X.Y', regex: /i\.(\d+)\.(\d+)/ },
    { name: 'Padrão -i.X.Y', regex: /-i\.(\d+)\.(\d+)/ },
    { name: 'Padrão item.X.Y', regex: /item\.(\d+)\.(\d+)/ }
];

patterns.forEach(p => {
    const match = expandedUrl.match(p.regex);
    console.log(`${p.name}:`, match ? `✅ Shop: ${match[1]}, Item: ${match[2]}` : '❌ Não encontrado');
});

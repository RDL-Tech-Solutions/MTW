
export const PLATFORM_CATEGORY_MAP = {
    'steam': { keywords: ['game', 'jogo', 'pc', 'steam'], slug: 'games-pc-gamer' },
    'nuuvem': { keywords: ['game', 'jogo', 'pc'], slug: 'games-pc-gamer' },
    'playstation': { keywords: ['ps4', 'ps5', 'console'], slug: 'games-pc-gamer' },
    'xbox': { keywords: ['xbox', 'console'], slug: 'games-pc-gamer' },
    'nintendo': { keywords: ['switch', 'nintendo'], slug: 'games-pc-gamer' },
    'pichau': { keywords: ['hardware', 'periferico'], slug: 'hardware' },
    'terabyte': { keywords: ['hardware', 'periferico'], slug: 'hardware' },
    'kabum': { keywords: ['hardware', 'eletronico'], slug: 'hardware' },
    'amazon': { keywords: [], slug: 'geral' }, // Amazon é genérico, precisa de análise de titulo
    'mercadolivre': { keywords: [], slug: 'geral' },
    'shopee': { keywords: [], slug: 'geral' },
    'aliexpress': { keywords: [], slug: 'importados' }
};

// IDs fixos baseados nos logs anteriores (pode variar por ambiente, ideal seria buscar pelo slug)
export const CATEGORY_IDS = {
    'games-pc-gamer': 'b478b692-84df-4281-b20f-2722d8f1d356',
    'hardware': 'd577278a-3c1a-4eff-b486-effcad04c7ff',
    'eletronicos': 'df5861f9-e361-433f-983a-36bb87248c56',
    'smartphones': '3bc68bd2-9e4d-4fec-b7cc-34bd29125277',
    'perifericos': '99c63c32-1527-4401-8b6c-f5931bf7-759f', // Exemplo
};

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais Supabase ausentes no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listChannels() {
    console.log('📋 Buscando canais direto do Supabase...');
    const { data, error } = await supabase.from('bot_channels').select('*');

    if (error) {
        console.error('❌ Erro:', error);
    } else {
        const fs = await import('fs');
        const path = await import('path');
        fs.writeFileSync('channels.json', JSON.stringify(data.map(c => ({
            id: c.id,
            name: c.name,
            platform: c.platform,
            identifier: c.identifier,
            is_active: c.is_active
        })), null, 2));
        console.log('✅ Dados salvos em channels.json');
    }
}

listChannels();

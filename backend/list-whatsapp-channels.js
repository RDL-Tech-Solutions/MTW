import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listChannels() {
    try {
        const { data: channels, error } = await supabase
            .from('bot_channels')
            .select('*')
            .eq('platform', 'whatsapp');

        if (error) throw error;

        console.log('--- CANAIS WHATSAPP NO BANCO (TABLE: bot_channels) ---');
        if (channels.length === 0) {
            console.log('Nenhum canal WhatsApp encontrado.');
        } else {
            channels.forEach(ch => {
                console.log(`ID: ${ch.id} | Nome: ${ch.name} | Identifier: ${ch.identifier} | Ativo: ${ch.is_active}`);
            });
        }
        console.log('------------------------------------------------------');
    } catch (error) {
        console.error('Erro ao buscar canais:', error.message);
    }
}

listChannels();

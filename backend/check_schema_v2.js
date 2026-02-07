import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    try {
        console.log('Checking bot_config schema...');
        const { data, error } = await supabase
            .from('bot_config')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching bot_config:', error);
            return;
        }

        if (data && data.length > 0) {
            const keys = Object.keys(data[0]);

            const required = ['whatsapp_web_enabled', 'whatsapp_web_pairing_number', 'whatsapp_web_admin_numbers'];
            const missing = required.filter(k => !keys.includes(k));

            if (missing.length > 0) {
                console.log('MISSING_COLUMNS');
                console.log(JSON.stringify(missing));
            } else {
                console.log('SCHEMA_OK');
                console.log('Current Config:', JSON.stringify({
                    whatsapp_web_enabled: data[0].whatsapp_web_enabled,
                    whatsapp_web_pairing_number: data[0].whatsapp_web_pairing_number
                }, null, 2));
            }
        } else {
            console.log('NO_DATA_FOUND');
            // If no data, we can't check columns easily with just select * on empty table in supabase-js sometimes, 
            // but usually it returns empty array. API response might contain structure or not.
            // Let's assume if it returns success, the query was valid, but checking keys on empty data is hard.
            // We'll try to insert a dummy to check if it accepts the columns? No, that's invasive.
            // We'll rely on the user having at least one row (BotConfig usually creates defaults).
        }
    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

checkSchema();

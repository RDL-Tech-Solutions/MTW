import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const payload = {
        user_id: '1204ca6c-31a7-44c1-8451-2ccad49ab465', // fake valid-looking uuid
        title: '🔥 Nova Promoção!',
        message: 'Test message',
        type: 'new_product',
        related_product_id: '1204ca6c-31a7-44c1-8451-2ccad49ab465'
    };
    const { data, error } = await supabase.from('notifications').insert([payload]);
    console.log('Error:', error);
}
checkSchema();

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

async function checkConstraints() {
    console.log('Checking constraints on bot_channels...');

    // Query to get check constraints
    const { data: constraints, error } = await supabase
        .rpc('get_check_constraints', { table_name: 'bot_channels' })
    // Fallback if RPC doesn't exist (likely doesn't), use raw query via postgrest if possible?
    // No, standard supabase client can't run raw SQL unless exposed via RPC.
    // But we can try to insert a bad value and see the specific error message, 
    // OR rely on the fact that if we can't see schema, we can just try to DROP the constraint if we know its name?
    // But we don't know the name.

    // Let's try to fetch from information_schema via a trick? 
    // Usually Supabase exposes an API for definitions? No.

    // Let's try to insert a dummy row with 'whatsapp_web' and see the FULL error.

    const identifier = 'test_check_' + Date.now();

    const { data, error: insertError } = await supabase
        .from('bot_channels')
        .insert([{
            platform: 'whatsapp_web',
            identifier: identifier,
            name: 'Test Check Constraint',
            is_active: false
        }]);

    if (insertError) {
        console.error('❌ Insert failed, likely due to constraint:');
        console.error(JSON.stringify(insertError, null, 2));

        if (insertError.message && insertError.message.includes('check constraint')) {
            console.log('⚠️ CONFIRMED: There is a CHECK constraint preventing this value.');
            // Try to find the name in the message
        }
    } else {
        console.log('✅ Insert SUCCESS! No constraint preventing whatsapp_web.');
        // Cleanup
        await supabase.from('bot_channels').delete().eq('identifier', identifier);
    }
}

checkConstraints();

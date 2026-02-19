import { supabase } from '../src/config/database.js';
import BotConfig from '../src/models/BotConfig.js';
import ScheduledPost from '../src/models/ScheduledPost.js';
import fs from 'fs';

const LOG_FILE = 'schedule_diag_utf8.txt';

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
    console.log(msg);
}

async function diagnose() {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

    log('--- Diagnóstico de Agendamento ---');

    // 1. Verificar Configuração do Bot
    log('\n1. Configuração do Bot:');
    const config = await BotConfig.get();
    log(`   whatsapp_enabled: ${config.whatsapp_enabled}`);
    log(`   whatsapp_web_enabled: ${config.whatsapp_web_enabled}`);
    log(`   telegram_enabled: ${config.telegram_enabled}`);

    // 2. Verificar Posts Agendados (Recentes)
    log('\n2. Posts Agendados (Últimos 10):');
    const { data: posts, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        log(`   Erro ao buscar posts: ${error.message}`);
    } else {
        if (posts.length === 0) {
            log('   Nenhum post agendado encontrado.');
        }
        posts.forEach(p => {
            log(`   [${p.status.toUpperCase()}] ID: ${p.id.substring(0, 8)} | Plat: ${p.platform} | Sched: ${new Date(p.scheduled_at).toLocaleString()} | Att: ${p.attempts} | Err: ${p.error_message || 'N/A'}`);
        });
    }

    // 3. Verificar Posts Travados
    log('\n3. Posts Travados (Processing):');
    const stuck = await ScheduledPost.getStuckPosts(0); // 0 min timeout to see all processing
    if (stuck.length === 0) log('   Nenhum post travado.');
    stuck.forEach(p => {
        log(`   [PROCESSING] ID: ${p.id.substring(0, 8)} | Started: ${new Date(p.processing_started_at).toLocaleString()}`);
    });

    // 4. Verificar Canais Ativos
    log('\n4. Canais Ativos:');
    const { data: channels, error: chanError } = await supabase
        .from('bot_channels')
        .select('*')
        .eq('is_active', true);

    if (chanError) {
        log(`   Erro ao buscar canais: ${chanError.message}`);
    } else {
        if (channels.length === 0) log('   ACERTA AÍ: Nenhum canal ativo!');
        channels.forEach(c => {
            log(`   [${c.platform}] ${c.name} (ID: ${c.id}) | Recipient: ${c.identifier}`);
        });
    }

    process.exit(0);
}

diagnose();

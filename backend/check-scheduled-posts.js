import ScheduledPost from './src/models/ScheduledPost.js';

async function checkScheduled() {
    try {
        const { data: posts, error } = await ScheduledPost.findAll({
            platform: 'whatsapp',
            limit: 20
        });

        if (error) throw error;

        console.log('--- ÚLTIMOS AGENDAMENTOS WHATSAPP ---');
        if (!posts || posts.length === 0) {
            console.log('Nenhum agendamento de WhatsApp encontrado.');
        } else {
            posts.forEach(p => {
                console.log(`[${p.scheduled_at}] ID: ${p.id}`);
                console.log(`  Status: ${p.status}`);
                console.log(`  Tentativas: ${p.attempts}`);
                console.log(`  Erro: ${p.error_message || 'Nenhum'}`);
                if (p.products) {
                    console.log(`  Produto: ${p.products.name}`);
                }
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error.message);
    }
}

checkScheduled();

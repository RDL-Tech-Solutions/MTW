import NotificationLog from './src/models/NotificationLog.js';

async function checkLogs() {
    try {
        const result = await NotificationLog.findAll({
            platform: 'whatsapp',
            limit: 30
        });

        const logs = result.logs;

        console.log('--- ÚLTIMOS LOGS WHATSAPP ---');
        if (!logs || logs.length === 0) {
            console.log('Nenhum log de WhatsApp encontrado.');
        } else {
            logs.forEach(l => {
                console.log(`[${l.created_at}] ID: ${l.id}`);
                console.log(`  Status: ${l.status}`);
                console.log(`  Evento: ${l.event_type}`);
                console.log(`  Erro: ${l.error_message || 'Nenhum'}`);
                if (l.payload) {
                    console.log(`  Item: ${l.payload.name || l.payload.title || l.payload.code || 'Sem nome'}`);
                }
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Erro ao buscar logs:', error.message);
    }
}

checkLogs();

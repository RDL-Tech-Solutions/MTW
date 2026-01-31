import NotificationLog from './src/models/NotificationLog.js';

async function checkLogs() {
    try {
        const logs = await NotificationLog.findAll({
            limit: 10
        });

        console.log('--- ÚLTIMOS LOGS DE NOTIFICAÇÃO ---');
        if (!logs || logs.length === 0) {
            console.log('Nenhum log encontrado.');
        } else {
            logs.forEach(l => {
                console.log(`[${l.created_at}] ID: ${l.id}`);
                console.log(`  Plataforma: ${l.platform}`);
                console.log(`  Evento: ${l.event_type}`);
                console.log(`  Sucesso: ${l.success}`);
                console.log(`  Msg ID: ${l.message_id || 'N/A'}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Erro ao buscar logs:', error.message);
    }
}

checkLogs();

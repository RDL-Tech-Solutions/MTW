import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function testPush() {
    const { default: oneSignalService } = await import('../src/services/oneSignalService.js');
    console.log('Aguardando inicialização do serviço OneSignal...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Iniciando teste de push notification com OneSignal...');
    try {
        const result = await oneSignalService.sendToSegment('Subscribed Users', {
            title: '🧪 Teste OneSignal',
            message: 'Esta é uma notificação de teste do OneSignal (Preço Certo).',
            data: { type: 'default' }
        });
        fs.writeFileSync('test-push-result.json', JSON.stringify({
            enviado: result.success,
            resultadoCompleto: result
        }, null, 2));

        if (result.success) {
            console.log('✅ Push enviado com sucesso! Ver test-push-result.json');
        } else {
            console.log('❌ Falha ao enviar push:', result.error || result.errors);
        }
    } catch (error) {
        console.error('Erro no teste de push:', error);
    }
    process.exit(0);
}

testPush();

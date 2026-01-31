import fetch from 'node-fetch';

async function detailedDiagnostic() {
    try {
        console.log('🔍 Diagnóstico detalhado de canais WhatsApp...\n');

        const response = await fetch('http://localhost:3000/api/debug/whatsapp-channels');
        const data = await response.json();

        console.log(`📊 Total de canais: ${data.total}`);
        console.log(`✅ Canais únicos: ${data.unique}`);
        console.log(`⚠️  Grupos duplicados: ${data.duplicates}\n`);

        if (data.duplicateDetails && data.duplicateDetails.length > 0) {
            console.log('📋 Detalhes dos duplicados:\n');
            for (const dup of data.duplicateDetails) {
                console.log(`📱 Identifier: ${dup.identifier}`);
                console.log(`   Total: ${dup.count} canais`);
                for (const channel of dup.channels) {
                    console.log(`   - ID: ${channel.id} | Nome: ${channel.name} | Ativo: ${channel.active} | Criado: ${channel.created_at}`);
                }
                console.log('');
            }
        }

        if (data.uniqueChannels && data.uniqueChannels.length > 0) {
            console.log('✅ Canais únicos:\n');
            for (const channel of data.uniqueChannels) {
                console.log(`   - ID: ${channel.id} | Nome: ${channel.name} | Identifier: ${channel.identifier} | Ativo: ${channel.active}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
    }
}

detailedDiagnostic();

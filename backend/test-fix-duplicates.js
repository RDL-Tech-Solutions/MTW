import fetch from 'node-fetch';

async function testDiagnostic() {
    try {
        console.log('🔍 Testando endpoint de diagnóstico...\n');

        const response = await fetch('http://localhost:3000/api/debug/whatsapp-channels');
        const data = await response.json();

        console.log('📊 Resultado:');
        console.log(JSON.stringify(data, null, 2));

        if (data.duplicates > 0) {
            console.log(`\n⚠️ Encontrados ${data.duplicates} grupo(s) de canais duplicados!`);
            console.log('\n🔧 Para corrigir, execute: node test-fix-duplicates.js --fix');
        } else {
            console.log('\n✅ Nenhum canal duplicado encontrado!');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

async function fixDuplicates() {
    try {
        console.log('🔧 Corrigindo canais duplicados...\n');

        const response = await fetch('http://localhost:3000/api/debug/whatsapp-channels/fix', {
            method: 'POST'
        });
        const data = await response.json();

        console.log('📊 Resultado:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log(`\n✅ Correção concluída!`);
            console.log(`   Canais removidos: ${data.removed}`);
            console.log(`   Canais mantidos: ${data.kept}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

// Executar
const args = process.argv.slice(2);
if (args.includes('--fix')) {
    fixDuplicates();
} else {
    testDiagnostic();
}

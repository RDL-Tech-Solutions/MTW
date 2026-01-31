/**
 * Script para diagnosticar e corrigir canais WhatsApp duplicados
 * 
 * Problema: Mensagens sendo enviadas 3x porque há 3 canais com o mesmo identifier
 * Solução: Identificar e remover canais duplicados
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');


// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env') });

// Conectar ao banco de dados
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function diagnoseDuplicateChannels() {
    try {
        console.log('🔍 Diagnosticando canais WhatsApp duplicados...\n');

        // Buscar todos os canais WhatsApp ativos
        const [channels] = await sequelize.query(`
      SELECT id, name, identifier, platform, active, created_at
      FROM bot_channels
      WHERE platform = 'whatsapp'
      ORDER BY identifier, created_at
    `);

        console.log(`📊 Total de canais WhatsApp: ${channels.length}\n`);

        // Agrupar por identifier
        const groupedByIdentifier = {};
        for (const channel of channels) {
            if (!groupedByIdentifier[channel.identifier]) {
                groupedByIdentifier[channel.identifier] = [];
            }
            groupedByIdentifier[channel.identifier].push(channel);
        }

        // Identificar duplicados
        const duplicates = [];
        for (const [identifier, channelGroup] of Object.entries(groupedByIdentifier)) {
            if (channelGroup.length > 1) {
                duplicates.push({ identifier, channels: channelGroup });
            }
        }

        if (duplicates.length === 0) {
            console.log('✅ Nenhum canal duplicado encontrado!');
            return;
        }

        console.log(`⚠️ Encontrados ${duplicates.length} identifier(s) com canais duplicados:\n`);

        for (const dup of duplicates) {
            console.log(`📱 Identifier: ${dup.identifier}`);
            console.log(`   Total de canais: ${dup.channels.length}`);
            console.log(`   Canais:`);

            for (const channel of dup.channels) {
                console.log(`     - ID: ${channel.id}`);
                console.log(`       Nome: ${channel.name}`);
                console.log(`       Ativo: ${channel.active}`);
                console.log(`       Criado em: ${channel.created_at}`);
                console.log('');
            }
        }

        // Perguntar se deseja corrigir
        console.log('\n🔧 Para corrigir, execute: node fix-duplicate-whatsapp-channels.js --fix');

    } catch (error) {
        console.error('❌ Erro ao diagnosticar:', error.message);
    } finally {
        await sequelize.close();
    }
}

async function fixDuplicateChannels() {
    try {
        console.log('🔧 Corrigindo canais WhatsApp duplicados...\n');

        // Buscar todos os canais WhatsApp
        const [channels] = await sequelize.query(`
      SELECT id, name, identifier, platform, active, created_at
      FROM bot_channels
      WHERE platform = 'whatsapp'
      ORDER BY identifier, created_at
    `);

        // Agrupar por identifier
        const groupedByIdentifier = {};
        for (const channel of channels) {
            if (!groupedByIdentifier[channel.identifier]) {
                groupedByIdentifier[channel.identifier] = [];
            }
            groupedByIdentifier[channel.identifier].push(channel);
        }

        let totalRemoved = 0;

        // Para cada grupo de duplicados, manter apenas o mais antigo
        for (const [identifier, channelGroup] of Object.entries(groupedByIdentifier)) {
            if (channelGroup.length > 1) {
                console.log(`\n📱 Processando identifier: ${identifier}`);
                console.log(`   Total de canais: ${channelGroup.length}`);

                // Ordenar por data de criação (mais antigo primeiro)
                channelGroup.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                // Manter o primeiro (mais antigo)
                const keepChannel = channelGroup[0];
                console.log(`   ✅ Mantendo: ID ${keepChannel.id} - ${keepChannel.name} (criado em ${keepChannel.created_at})`);

                // Remover os outros
                for (let i = 1; i < channelGroup.length; i++) {
                    const removeChannel = channelGroup[i];
                    console.log(`   ❌ Removendo: ID ${removeChannel.id} - ${removeChannel.name} (criado em ${removeChannel.created_at})`);

                    await sequelize.query(`
            DELETE FROM bot_channels
            WHERE id = :id
          `, {
                        replacements: { id: removeChannel.id }
                    });

                    totalRemoved++;
                }
            }
        }

        console.log(`\n✅ Correção concluída!`);
        console.log(`   Total de canais removidos: ${totalRemoved}`);

    } catch (error) {
        console.error('❌ Erro ao corrigir:', error.message);
    } finally {
        await sequelize.close();
    }
}

// Executar
const args = process.argv.slice(2);
if (args.includes('--fix')) {
    fixDuplicateChannels();
} else {
    diagnoseDuplicateChannels();
}

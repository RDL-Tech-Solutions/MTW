/**
 * Script para verificar e remover canais WhatsApp duplicados
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

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

async function checkAndFixDuplicates() {
    try {
        console.log('🔍 Verificando canais WhatsApp duplicados...\n');

        // Buscar canais duplicados
        const [duplicates] = await sequelize.query(`
      SELECT identifier, platform, COUNT(*) as count
      FROM bot_channels
      WHERE platform = 'whatsapp' AND active = true
      GROUP BY identifier, platform
      HAVING COUNT(*) > 1
    `);

        if (duplicates.length === 0) {
            console.log('✅ Nenhum canal duplicado encontrado!\n');
            return;
        }

        console.log(`⚠️ Encontrados ${duplicates.length} números com canais duplicados:\n`);
        duplicates.forEach(dup => {
            console.log(`   📱 ${dup.identifier}: ${dup.count} canais`);
        });

        console.log('\n🔧 Removendo duplicatas (mantendo apenas o mais recente)...\n');

        for (const dup of duplicates) {
            // Para cada número duplicado, manter apenas o mais recente
            const [result] = await sequelize.query(`
        DELETE FROM bot_channels
        WHERE id IN (
          SELECT id FROM bot_channels
          WHERE identifier = :identifier AND platform = 'whatsapp'
          ORDER BY created_at DESC
          OFFSET 1
        )
        RETURNING id, identifier
      `, {
                replacements: { identifier: dup.identifier }
            });

            console.log(`   ✅ Removidos ${result.length} canais duplicados para ${dup.identifier}`);
        }

        console.log('\n✅ Limpeza concluída!\n');

        // Verificar resultado final
        const [final] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM bot_channels
      WHERE platform = 'whatsapp' AND active = true
    `);

        console.log(`📊 Total de canais WhatsApp ativos: ${final[0].total}\n`);

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkAndFixDuplicates();

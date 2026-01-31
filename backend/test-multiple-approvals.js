/**
 * Script para testar envio de imagens do WhatsApp
 * Realiza múltiplas aprovações de produtos para verificar se as imagens estão sendo enviadas
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

async function testMultipleApprovals() {
    try {
        console.log('🧪 Iniciando teste de múltiplas aprovações...\n');

        // Buscar produtos pendentes com imagem
        const [products] = await sequelize.query(`
      SELECT id, name, image_url, price, original_price, url
      FROM products
      WHERE status = 'pending'
        AND image_url IS NOT NULL
        AND image_url != ''
        AND image_url NOT LIKE '%placeholder%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

        if (products.length === 0) {
            console.log('❌ Nenhum produto pendente com imagem encontrado');
            console.log('   Crie alguns produtos pendentes primeiro');
            return;
        }

        console.log(`📦 Encontrados ${products.length} produtos pendentes com imagem\n`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📝 Teste ${i + 1}/${products.length}`);
            console.log(`   Produto: ${product.name}`);
            console.log(`   Imagem: ${product.image_url.substring(0, 60)}...`);
            console.log(`   Preço: R$ ${product.price}`);

            try {
                // Aprovar produto
                await sequelize.query(`
          UPDATE products
          SET status = 'approved'
          WHERE id = :id
        `, {
                    replacements: { id: product.id }
                });

                console.log(`   ✅ Produto aprovado com sucesso`);

                // Aguardar um pouco para o sistema processar
                console.log(`   ⏳ Aguardando 3 segundos para processamento...`);
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Verificar logs de notificação
                const [logs] = await sequelize.query(`
          SELECT success, error_message, created_at
          FROM notification_logs
          WHERE payload::text LIKE :productId
            AND platform = 'whatsapp'
          ORDER BY created_at DESC
          LIMIT 1
        `, {
                    replacements: { productId: `%${product.id}%` }
                });

                if (logs.length > 0 && logs[0].success) {
                    console.log(`   ✅ Notificação WhatsApp enviada com sucesso!`);
                    successCount++;
                } else if (logs.length > 0) {
                    console.log(`   ⚠️  Notificação falhou: ${logs[0].error_message}`);
                    failCount++;
                } else {
                    console.log(`   ⚠️  Nenhum log de notificação encontrado`);
                    failCount++;
                }

            } catch (error) {
                console.log(`   ❌ Erro ao aprovar: ${error.message}`);
                failCount++;
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`\n📊 RESULTADO FINAL:`);
        console.log(`   ✅ Sucessos: ${successCount}/${products.length}`);
        console.log(`   ❌ Falhas: ${failCount}/${products.length}`);
        console.log(`   📈 Taxa de sucesso: ${((successCount / products.length) * 100).toFixed(1)}%`);

        if (successCount === products.length) {
            console.log(`\n🎉 PERFEITO! Todas as imagens foram enviadas com sucesso!`);
        } else if (successCount > 0) {
            console.log(`\n⚠️  Algumas imagens falharam. Verifique os logs do backend.`);
        } else {
            console.log(`\n❌ Nenhuma imagem foi enviada. Há um problema no sistema.`);
        }

        console.log(`\n💡 Dica: Verifique seu WhatsApp para confirmar o recebimento das imagens`);

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

// Executar
testMultipleApprovals();

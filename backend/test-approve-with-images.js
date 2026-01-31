import fetch from 'node-fetch';

/**
 * Script simplificado para testar aprovação de produtos com imagem
 */

const API_URL = 'http://localhost:3000/api';

async function approveProductsWithImages() {
    try {
        console.log('🧪 Testando aprovação de produtos com imagem...\n');

        // 1. Buscar produtos pendentes
        console.log('📦 Buscando produtos pendentes...');
        const productsResponse = await fetch(`${API_URL}/products?status=pending&limit=5`);
        const productsData = await productsResponse.json();

        if (!productsData.success || !productsData.data || productsData.data.length === 0) {
            console.log('❌ Nenhum produto pendente encontrado');
            console.log('   Crie alguns produtos pendentes primeiro no painel admin');
            return;
        }

        const products = productsData.data.filter(p => p.image_url && !p.image_url.includes('placeholder'));

        if (products.length === 0) {
            console.log('❌ Nenhum produto pendente COM IMAGEM encontrado');
            return;
        }

        console.log(`✅ Encontrados ${products.length} produtos com imagem\n`);

        let successCount = 0;
        let failCount = 0;

        // 2. Aprovar cada produto
        for (let i = 0; i < Math.min(products.length, 3); i++) {
            const product = products[i];

            console.log(`\n${'='.repeat(70)}`);
            console.log(`📝 TESTE ${i + 1}/${Math.min(products.length, 3)}`);
            console.log(`   ID: ${product.id}`);
            console.log(`   Nome: ${product.name}`);
            console.log(`   Preço: R$ ${product.price}`);
            console.log(`   Imagem: ${product.image_url.substring(0, 60)}...`);

            try {
                // Aprovar produto
                console.log(`\n   ⏳ Aprovando produto...`);
                const approveResponse = await fetch(`${API_URL}/products/${product.id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const approveData = await approveResponse.json();

                if (approveData.success) {
                    console.log(`   ✅ Produto aprovado com sucesso!`);

                    // Aguardar processamento
                    console.log(`   ⏳ Aguardando 4 segundos para processamento...`);
                    await new Promise(resolve => setTimeout(resolve, 4000));

                    // Verificar se foi publicado
                    const checkResponse = await fetch(`${API_URL}/products/${product.id}`);
                    const checkData = await checkResponse.json();

                    if (checkData.success && checkData.data.status === 'approved') {
                        console.log(`   ✅ Status atualizado para 'approved'`);
                        console.log(`   📱 Verifique seu WhatsApp para confirmar o recebimento da IMAGEM + MENSAGEM`);
                        successCount++;
                    } else {
                        console.log(`   ⚠️  Status não foi atualizado corretamente`);
                        failCount++;
                    }
                } else {
                    console.log(`   ❌ Falha ao aprovar: ${approveData.message || 'Erro desconhecido'}`);
                    failCount++;
                }

            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
                failCount++;
            }
        }

        // 3. Resultado final
        console.log(`\n${'='.repeat(70)}`);
        console.log(`\n📊 RESULTADO FINAL:`);
        console.log(`   ✅ Aprovações bem-sucedidas: ${successCount}`);
        console.log(`   ❌ Falhas: ${failCount}`);
        console.log(`   📈 Taxa de sucesso: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);

        console.log(`\n💡 IMPORTANTE:`);
        console.log(`   1. Verifique seu WhatsApp para confirmar se as IMAGENS foram recebidas`);
        console.log(`   2. Cada produto deve ter enviado: IMAGEM + MENSAGEM DE TEXTO`);
        console.log(`   3. Se a imagem não aparecer, verifique os logs do backend`);

        if (successCount > 0) {
            console.log(`\n🎉 ${successCount} produto(s) aprovado(s)! Verifique seu WhatsApp agora!`);
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error(error.stack);
    }
}

// Executar
approveProductsWithImages();

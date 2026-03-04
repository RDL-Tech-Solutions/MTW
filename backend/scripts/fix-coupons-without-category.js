import dotenv from 'dotenv';
dotenv.config();

import Coupon from '../src/models/Coupon.js';
import Category from '../src/models/Category.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function fixCouponsWithoutCategory() {
    console.log('🔧 CORREÇÃO: Cupons sem Categoria\n');
    console.log('='.repeat(80));

    try {
        // 1. Buscar cupons sem categoria
        console.log('\n📋 1. BUSCANDO CUPONS SEM CATEGORIA');
        console.log('-'.repeat(80));
        
        const allCoupons = await Coupon.findAll();
        const couponsWithoutCategory = allCoupons.filter(c => !c.category_id);

        if (couponsWithoutCategory.length === 0) {
            console.log('✅ Todos os cupons têm categoria definida!');
            rl.close();
            return;
        }

        console.log(`\n   Encontrados ${couponsWithoutCategory.length} cupons SEM categoria:\n`);
        
        couponsWithoutCategory.forEach((coupon, index) => {
            console.log(`   ${index + 1}. ${coupon.code} (${coupon.platform || 'general'})`);
            console.log(`      Desconto: ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}`);
            console.log(`      Criado em: ${new Date(coupon.created_at).toLocaleString('pt-BR')}`);
            console.log(`      Ativo: ${coupon.is_active ? 'Sim' : 'Não'}`);
            console.log('');
        });

        // 2. Listar categorias disponíveis
        console.log('\n📂 2. CATEGORIAS DISPONÍVEIS');
        console.log('-'.repeat(80));
        
        const categories = await Category.findAll();
        
        if (categories.length === 0) {
            console.log('❌ Nenhuma categoria encontrada no banco de dados!');
            rl.close();
            return;
        }

        console.log('');
        categories.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
        });

        // 3. Opções de correção
        console.log('\n\n🛠️ 3. OPÇÕES DE CORREÇÃO');
        console.log('-'.repeat(80));
        console.log('\n   Escolha uma opção:');
        console.log('   1. Atribuir uma categoria padrão para TODOS os cupons sem categoria');
        console.log('   2. Atribuir categoria manualmente para cada cupom');
        console.log('   3. Cancelar (não fazer nada)');
        
        const option = await question('\n   Digite o número da opção: ');

        if (option === '1') {
            // Opção 1: Categoria padrão para todos
            console.log('\n   Qual categoria deseja usar como padrão?');
            const categoryIndex = await question('   Digite o número da categoria: ');
            const selectedCategory = categories[parseInt(categoryIndex) - 1];

            if (!selectedCategory) {
                console.log('   ❌ Categoria inválida!');
                rl.close();
                return;
            }

            console.log(`\n   ⚠️ Você vai atribuir a categoria "${selectedCategory.name}" para ${couponsWithoutCategory.length} cupons.`);
            const confirm = await question('   Confirma? (s/n): ');

            if (confirm.toLowerCase() === 's') {
                console.log('\n   Atualizando cupons...');
                
                for (const coupon of couponsWithoutCategory) {
                    await Coupon.update(coupon.id, { category_id: selectedCategory.id });
                    console.log(`   ✅ ${coupon.code} atualizado`);
                }

                console.log(`\n   ✅ ${couponsWithoutCategory.length} cupons atualizados com sucesso!`);
            } else {
                console.log('   ❌ Operação cancelada.');
            }

        } else if (option === '2') {
            // Opção 2: Manual para cada cupom
            console.log('\n   Atribuindo categoria manualmente...\n');

            for (const coupon of couponsWithoutCategory) {
                console.log(`\n   Cupom: ${coupon.code} (${coupon.platform || 'general'})`);
                console.log(`   Desconto: ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}`);
                
                console.log('\n   Categorias disponíveis:');
                categories.forEach((cat, index) => {
                    console.log(`   ${index + 1}. ${cat.name}`);
                });

                const categoryIndex = await question('\n   Digite o número da categoria (ou 0 para pular): ');
                
                if (categoryIndex === '0') {
                    console.log('   ⏭️ Pulando...');
                    continue;
                }

                const selectedCategory = categories[parseInt(categoryIndex) - 1];

                if (!selectedCategory) {
                    console.log('   ❌ Categoria inválida! Pulando...');
                    continue;
                }

                await Coupon.update(coupon.id, { category_id: selectedCategory.id });
                console.log(`   ✅ Categoria "${selectedCategory.name}" atribuída!`);
            }

            console.log('\n   ✅ Processo concluído!');

        } else {
            console.log('\n   ❌ Operação cancelada.');
        }

        // 4. Resumo final
        console.log('\n\n📊 4. RESUMO FINAL');
        console.log('='.repeat(80));
        
        const updatedCoupons = await Coupon.findAll();
        const stillWithoutCategory = updatedCoupons.filter(c => !c.category_id);

        console.log(`\n   Total de cupons: ${updatedCoupons.length}`);
        console.log(`   Cupons com categoria: ${updatedCoupons.length - stillWithoutCategory.length}`);
        console.log(`   Cupons sem categoria: ${stillWithoutCategory.length}`);

        if (stillWithoutCategory.length === 0) {
            console.log('\n   ✅ Todos os cupons agora têm categoria!');
            console.log('   ✅ Os cupons serão publicados nos canais WhatsApp Web.');
        } else {
            console.log('\n   ⚠️ Ainda existem cupons sem categoria.');
            console.log('   ⚠️ Estes cupons NÃO serão publicados nos canais com filtro de categoria.');
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('\n❌ Erro:', error);
    } finally {
        rl.close();
    }
}

// Executar
fixCouponsWithoutCategory()
    .then(() => {
        console.log('\n✅ Script concluído!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });

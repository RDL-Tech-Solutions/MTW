#!/usr/bin/env node

/**
 * Script para verificar preços dos produtos agendados
 * Uso: node backend/scripts/check-scheduled-posts-prices.js
 */

import { supabase } from '../src/config/database.js';

async function checkPrices() {
    try {
        console.log('🔍 Verificando preços dos produtos agendados...\n');

        // Buscar posts pendentes com produtos
        const { data: posts, error } = await supabase
            .from('scheduled_posts')
            .select('*, products!product_id(*)')
            .eq('status', 'pending')
            .limit(10);

        if (error) throw error;

        if (!posts || posts.length === 0) {
            console.log('⚠️ Nenhum post pendente encontrado');
            return;
        }

        console.log(`📊 Encontrados ${posts.length} posts pendentes\n`);

        posts.forEach((post, index) => {
            console.log(`\n${index + 1}. Post ${post.id.substring(0, 8)}...`);
            console.log(`   Plataforma: ${post.platform}`);
            console.log(`   Agendado para: ${post.scheduled_at}`);
            
            if (post.products) {
                console.log(`   Produto: ${post.products.name?.substring(0, 50) || 'N/A'}...`);
                console.log(`   Preço atual: R$ ${post.products.current_price || 0}`);
                console.log(`   Preço antigo: R$ ${post.products.old_price || 0}`);
                console.log(`   Status do produto: ${post.products.status}`);
                
                if (!post.products.current_price || post.products.current_price === 0) {
                    console.log(`   ❌ PROBLEMA: Preço está zerado!`);
                }
            } else {
                console.log(`   ❌ PROBLEMA: Produto não encontrado!`);
            }
        });

        // Verificar produtos pendentes recentes
        console.log('\n\n🔍 Verificando produtos pendentes recentes...\n');

        const { data: pendingProducts, error: pendingError } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);

        if (pendingError) throw pendingError;

        if (!pendingProducts || pendingProducts.length === 0) {
            console.log('⚠️ Nenhum produto pendente encontrado');
            return;
        }

        console.log(`📊 Encontrados ${pendingProducts.length} produtos pendentes\n`);

        pendingProducts.forEach((product, index) => {
            console.log(`\n${index + 1}. Produto ${product.id.substring(0, 8)}...`);
            console.log(`   Nome: ${product.name?.substring(0, 50) || 'N/A'}...`);
            console.log(`   Plataforma: ${product.platform}`);
            console.log(`   Preço atual: R$ ${product.current_price || 0}`);
            console.log(`   Preço antigo: R$ ${product.old_price || 0}`);
            console.log(`   Criado em: ${product.created_at}`);
            
            if (!product.current_price || product.current_price === 0) {
                console.log(`   ❌ PROBLEMA: Preço está zerado!`);
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

checkPrices();
